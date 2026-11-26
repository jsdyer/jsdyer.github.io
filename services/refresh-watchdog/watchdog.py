#!/usr/bin/env python3
"""GitHub schedule recovery; read-only unless --apply. Never logs response bodies."""
from __future__ import annotations
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import stat
import struct
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from croniter import croniter

UTC = dt.timezone.utc
API = 'https://api.github.com'
ACTIVE = {'queued', 'in_progress', 'requested', 'waiting', 'pending'}
REFRESH_EVENTS = {'schedule', 'workflow_dispatch'}
RUNTIME_VERSION = '2026-11-26-service-health-v2'
REQUEST_BUDGET_SECONDS = 600  # Leave time to persist/report before systemd's 15-minute limit.


def stamp(value):
    return value.astimezone(UTC).isoformat().replace('+00:00', 'Z')


def log_progress(event, **fields):
    # Callers supply only stage names, public target IDs and status codes, never
    # credentials, request URLs, workflow inputs or response bodies.
    print(json.dumps({'at':stamp(dt.datetime.now(UTC)), 'event':event, **fields}), flush=True)


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('Timestamp must be an ISO 8601 string')
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp must include its UTC offset')
    return parsed.astimezone(UTC)


def due_at(target, now, grace):
    eligible = now - dt.timedelta(minutes=grace)
    # croniter's previous is exclusive; a microsecond includes an exact boundary.
    return max(croniter(c, eligible + dt.timedelta(microseconds=1)).get_prev(dt.datetime)
               for c in target['crons']).astimezone(UTC)


def cadence_minutes(target, now):
    gaps = []
    for expression in target['crons']:
        it = croniter(expression, now)
        a, b = it.get_prev(dt.datetime), it.get_prev(dt.datetime)
        gaps.append((a-b).total_seconds()/60)
    return max(1, min(gaps))


def validate_config(config):
    if not isinstance(config, dict) or config.get('version', 1) != 1:
        raise ValueError('Config must be a version 1 object')
    targets = config.get('targets')
    if not isinstance(targets, list) or not targets:
        raise ValueError('Config requires a nonempty targets list')
    limit = config.get('max_dispatches_per_pass', 10)
    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 100:
        raise ValueError('max_dispatches_per_pass must be 1..100')
    if 'github_api_url' in config:
        raise ValueError('github_api_url is not configurable; credentials only go to api.github.com')
    seen = set()
    for t in targets:
        if not isinstance(t, dict):
            raise ValueError('Every target must be an object')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', str(t.get('repo', ''))):
            raise ValueError('Invalid target repository')
        if not isinstance(t.get('branch'), str) or not t['branch'].strip():
            raise ValueError('Every target needs an explicit branch')
        if not isinstance(t.get('workflow'), (str, int)) or not str(t['workflow']).strip():
            raise ValueError('Every target needs a workflow filename or numeric ID')
        workflow = str(t['workflow'])
        if not (workflow.isdigit() or re.fullmatch(r'(?:\.github/workflows/)?[\w.-]+\.ya?ml', workflow)):
            raise ValueError('Workflow must be a YAML filename or numeric ID')
        key = target_key(t)
        if key in seen:
            raise ValueError('Duplicate repository/branch/workflow target')
        seen.add(key)
        if not isinstance(t.get('crons'), list) or not t['crons']:
            raise ValueError('Every target needs explicit UTC cron expressions')
        for c in t['crons']:
            if not isinstance(c, str) or len(c.split()) != 5 or not croniter.is_valid(c):
                raise ValueError('Cron expressions must contain five valid UTC fields')
        for owner in (config, t):
            for key in ('grace_minutes', 'cooldown_minutes'):
                if key in owner and (not isinstance(owner[key], (int, float)) or isinstance(owner[key], bool)
                                     or not 0 <= owner[key] <= 10080):
                    raise ValueError(key + ' must be between 0 and 10080')
        for owner in (config,t):
            if 'max_run_minutes' in owner and (not isinstance(owner['max_run_minutes'],(int,float)) or isinstance(owner['max_run_minutes'],bool) or not 1 <= owner['max_run_minutes'] <= 10080):
                raise ValueError('max_run_minutes must be between 1 and 10080')
        inputs = t.get('inputs', {})
        if not isinstance(inputs, dict) or any(not isinstance(k, str) or not isinstance(v, (str, bool, int, float)) for k,v in inputs.items()):
            raise ValueError('Workflow inputs must be a primitive JSON object')
        freshness = t.get('freshness', [])
        if not isinstance(freshness, list):
            raise ValueError('freshness must be a list')
        for check in freshness:
            if not isinstance(check, dict):
                raise ValueError('Freshness checks must be objects')
            url = urllib.parse.urlsplit(str(check.get('url', '')))
            if url.scheme != 'https' or not url.hostname or url.username or url.password or url.fragment:
                raise ValueError('Freshness URLs must be HTTPS without credentials or fragments')
            path = check.get('json_path')
            if not ((isinstance(path, str) and path) or
                    (isinstance(path, list) and path and all(isinstance(x, (str,int)) for x in path))):
                raise ValueError('Freshness json_path must be a dotted string or path list')
            age = check.get('max_age_seconds')
            if age is not None and (not isinstance(age, (int,float)) or isinstance(age,bool) or age <= 0):
                raise ValueError('max_age_seconds must be positive')
    return config


def target_key(t):
    return '|'.join((t['repo'], t['branch'], str(t['workflow']).split('/')[-1]))


class SafeError(Exception):
    def __init__(self, kind, status=None, retry_at=None):
        self.kind, self.status, self.retry_at = kind, status, retry_at
        super().__init__(kind + (f' (HTTP {status})' if status else ''))


def validate_state(state):
    """Reject broken local state before target-response errors can hide it."""
    try:
        if not isinstance(state,dict) or state.get('version',1)!=1 or not isinstance(state.get('targets',{}),dict):
            raise ValueError()
        if state.get('blocked_until'):timestamp(state['blocked_until'])
        for key,record in state.get('targets',{}).items():
            if not isinstance(key,str) or not isinstance(record,dict):raise ValueError()
            for field in ('last_checked','attempt_due','retry_after','last_dispatch_attempt'):
                if record.get(field):timestamp(record[field])
            if 'attempts' in record and (not isinstance(record['attempts'],int) or isinstance(record['attempts'],bool) or record['attempts']<0):
                raise ValueError()
            workflow=record.get('workflow_cache',{})
            if not isinstance(workflow,dict):raise ValueError()
            if workflow:
                timestamp(workflow['at'])
                if workflow.get('state') is not None and not isinstance(workflow['state'],str):raise ValueError()
            probes=record.get('probe_cache',{})
            if not isinstance(probes,dict) or any(not isinstance(value,dict) for value in probes.values()):raise ValueError()
    except (ValueError,TypeError,KeyError,OverflowError):
        raise SafeError('invalid_state_file') from None
    return state


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward credentials across a redirect, even to a guessed API URL.
        return None


class HTTP:
    def __init__(self, token=None, timeout=20, opener=None, sleep=time.sleep, now=None, budget_seconds=None, monotonic=time.monotonic):
        self.token, self.timeout = token, timeout
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.sleep, self.now = sleep, now or (lambda: dt.datetime.now(UTC))
        self.monotonic=monotonic
        self.deadline=None if budget_seconds is None else monotonic()+budget_seconds

    def remaining(self):
        remaining=float('inf') if self.deadline is None else self.deadline-self.monotonic()
        if remaining<=0:raise SafeError('pass_time_budget')
        return remaining

    def retry_delay(self, attempt):
        delay=2**attempt
        if self.remaining()<=delay:raise SafeError('pass_time_budget')
        self.sleep(delay)

    def request(self, method, path, payload=None, *, public=False):
        if public:
            url = path
            if urllib.parse.urlsplit(url).scheme != 'https':
                raise SafeError('invalid_public_url')
        else:
            if not path.startswith('/') or path.startswith('//') or '\n' in path:
                raise SafeError('invalid_api_path')
            url = API + path
        headers = {'Accept':'application/json', 'User-Agent':'coolcode-watchdog/1.0'}
        if not public:
            headers.update({'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10'})
            if self.token:
                headers['Authorization'] = 'Bearer ' + self.token
        data = None if payload is None else json.dumps(payload).encode()
        if data is not None:
            headers['Content-Type'] = 'application/json'
        # Dispatch POST is never retried: a timeout can occur after GitHub accepted it.
        tries = 3 if method == 'GET' else 1
        for attempt in range(tries):
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with self.opener.open(request, timeout=min(self.timeout,self.remaining())) as response:
                    limit = (24 if public else 4)*1024*1024
                    if self.deadline is None:
                        body = response.read(limit+1)
                    else:
                        # read1 returns available socket data, so a slow trickle
                        # cannot keep a single metadata response alive forever.
                        reader=getattr(response,'read1',response.read)
                        body=bytearray()
                        while len(body)<=limit:
                            self.remaining()
                            chunk=reader(min(65536,limit+1-len(body)))
                            if not chunk:break
                            body.extend(chunk)
                        self.remaining()
                    if len(body)>limit:
                        raise SafeError('response_too_large')
                    return json.loads(body) if body else None
            except urllib.error.HTTPError as error:
                status = error.code
                if status == 401:
                    raise SafeError('authentication_failed', status) from None
                secondary=False
                if status==403:
                    try:
                        message=error.read(4096).decode('utf-8','replace').lower()
                        secondary=any(word in message for word in ('secondary rate limit','api rate limit exceeded','abuse detection'))
                    except OSError:pass
                if status == 429 or (status == 403 and
                    (secondary or error.headers.get('X-RateLimit-Remaining') == '0' or error.headers.get('Retry-After'))):
                    until = self.now() + dt.timedelta(minutes=5)
                    try:
                        retry = error.headers.get('Retry-After')
                        if retry:
                            try: until=self.now()+dt.timedelta(seconds=max(1,int(retry)))
                            except ValueError:
                                from email.utils import parsedate_to_datetime
                                until=parsedate_to_datetime(retry).astimezone(UTC)
                        elif error.headers.get('X-RateLimit-Reset'):
                            until=dt.datetime.fromtimestamp(int(error.headers['X-RateLimit-Reset']),UTC)
                    except (ValueError,TypeError,OverflowError):
                        pass
                    raise SafeError('rate_limited', status, max(until,self.now()+dt.timedelta(seconds=60))) from None
                if status == 403:
                    raise SafeError('permission_denied', status) from None
                if status >= 500 and attempt+1 < tries:
                    self.retry_delay(attempt)
                    continue
                raise SafeError('http_error', status) from None
            except (urllib.error.URLError, TimeoutError, OSError):
                if attempt+1 < tries:
                    self.retry_delay(attempt)
                    continue
                raise SafeError('network_error') from None
            except (json.JSONDecodeError, UnicodeDecodeError):
                raise SafeError('invalid_json') from None


def private_systemd_credential(filename, fd, info):
    """Recognize systemd's root-owned, read-only credential with a service-user ACL.

    Since systemd 254 the ACL mask can make this appear group-readable (0440).
    Accept only the exact ACL granting read access to this service user and root,
    inside CREDENTIALS_DIRECTORY on a read-only filesystem. Ordinary files still
    require owner-only permissions; the environment variable alone grants nothing.
    """
    directory = os.environ.get('CREDENTIALS_DIRECTORY')
    if not directory or not os.path.isabs(directory):
        return False
    directory = Path(os.path.abspath(directory))
    if Path(os.path.abspath(filename)).parent != directory:
        return False
    if stat.S_IMODE(info.st_mode) != 0o440 or info.st_uid != 0 or info.st_nlink != 1:
        return False
    try:
        parent = directory.stat(follow_symlinks=False)
        if (not stat.S_ISDIR(parent.st_mode) or parent.st_uid != 0 or
                parent.st_mode & 0o027 or parent.st_dev != info.st_dev):
            return False
        if not os.fstatvfs(fd).f_flag & os.ST_RDONLY:
            return False
        # Linux POSIX ACL xattr version 2, followed by (tag, permissions, ID).
        undefined = 0xffffffff
        entries = ((0x01, 4, undefined), (0x02, 4, os.geteuid()),
                   (0x04, 0, undefined), (0x10, 4, undefined), (0x20, 0, undefined))
        expected = struct.pack('<I', 2) + b''.join(struct.pack('<HHI', *e) for e in entries)
        return os.getxattr(fd, 'system.posix_acl_access') == expected
    except (OSError, AttributeError):
        return False


def secure_read(filename):
    flags = os.O_RDONLY | getattr(os,'O_NOFOLLOW',0)
    try:
        fd = os.open(filename, flags)
        with os.fdopen(fd, 'r') as source:
            info = os.fstat(source.fileno())
            if not stat.S_ISREG(info.st_mode) or (info.st_mode & 0o077 and
                    not private_systemd_credential(filename, source.fileno(), info)):
                raise SafeError('credential_file_must_be_private_0600_or_0400')
            value = source.read(65537)
            if len(value)>65536:
                raise SafeError('credential_file_too_large')
            return value.strip()
    except SafeError:
        raise
    except OSError:
        raise SafeError('credential_file_unreadable') from None


def installation_token(app_id, installation_id, keyfile, now, http_factory=HTTP):
    if not str(installation_id).isdigit():
        raise SafeError('invalid_installation_id')
    import jwt
    try:
        signed=jwt.encode({'iat':int(now.timestamp())-60,'exp':int(now.timestamp())+540,'iss':str(app_id)},
                          secure_read(keyfile),algorithm='RS256')
    except SafeError:
        raise
    except Exception:
        raise SafeError('app_private_key_invalid') from None
    response=http_factory(signed).request('POST',f'/app/installations/{installation_id}/access_tokens',
                                         {'permissions':{'actions':'write','metadata':'read'}})
    if not isinstance(response,dict) or not isinstance(response.get('token'),str):
        raise SafeError('installation_token_missing')
    return response['token']


def json_value(document, path):
    parts=path if isinstance(path,list) else path.split('.')
    node=document
    for part in parts:
        node=node[int(part)] if isinstance(node,list) else node[part]
    return node


def freshness_checks(target, http, now, cadence, cache=None, refresh_marker=None, due=None):
    results=[]
    ttl_seconds=max(60,min(cadence/2,360)*60)
    for index, check in enumerate(target.get('freshness',[])):
        # Cache only validated timestamps, never response bodies, URLs, credentials or errors.
        cache_slot=str(index)
        cache_key=hashlib.sha256(json.dumps({'probe':check,'refresh':refresh_marker,'due':due},sort_keys=True).encode()).hexdigest()
        result={'check':index,'status':'error'}
        try:
            entry=cache.get(cache_slot,{}) if cache is not None else {}
            cached=False
            if entry.get('key')==cache_key:
                try:
                    read_at=timestamp(entry['read_at'])
                    checked=timestamp(entry['timestamp'])
                    cached=0<=(now-read_at).total_seconds()<ttl_seconds
                except (ValueError,TypeError,KeyError):
                    cached=False
            if not cached:
                document=http.request('GET',check['url'],public=True)
                value=json_value(document,check['json_path'])
                if check.get('precision')=='date' and isinstance(value,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}',value):
                    value += 'T00:00:00Z'
                checked=timestamp(value)
                read_at=now
            age=(now-checked).total_seconds()
            max_age=check.get('max_age_seconds',max(3600,cadence*120)+(86400 if check.get('precision')=='date' else 0))
            status='future_timestamp' if age < -300 else 'fresh' if age <= max_age else 'stale'
            result.update(timestamp=stamp(checked),age_seconds=round(age),max_age_seconds=max_age,
                          status=status,cached=cached,read_at=stamp(read_at))
            if cache is not None:
                if status=='future_timestamp':cache.pop(cache_slot,None)
                else:cache[cache_slot]={'key':cache_key,'read_at':stamp(read_at),'timestamp':stamp(checked)}
        except SafeError as exc:
            if exc.kind=='pass_time_budget':raise
            result['error']=exc.kind
            if cache is not None:cache.pop(cache_slot,None)
        except (KeyError,IndexError,TypeError,ValueError,OverflowError):
            result['error']='timestamp_missing_or_invalid'
            if cache is not None:cache.pop(cache_slot,None)
        results.append(result)
    if cache is not None:
        for key in list(cache):
            if key not in {str(i) for i in range(len(target.get('freshness',[])))}:cache.pop(key,None)
    return results


def get_runs(http, prefix, branch, due):
    collected=[]
    for page in range(1,6):
        query=urllib.parse.urlencode({'branch':branch,'per_page':100,'page':page})
        body=http.request('GET',prefix+'/runs?'+query)
        runs=body.get('workflow_runs') if isinstance(body,dict) else None
        if not isinstance(runs,list) or any(not isinstance(r,dict) for r in runs):
            raise SafeError('invalid_workflow_runs_response')
        collected.extend(r for r in runs if r.get('head_branch')==branch)
        dates=[]
        for r in runs:
            try: dates.append(timestamp(r['created_at']))
            except (ValueError,KeyError,TypeError): pass
        if len(runs)<100 or (dates and min(dates)<due):
            return collected,False
    return collected,True


def run(config, state, http, now, apply=False, persist=None, progress=None):
    report={'version':1,'runtime_version':RUNTIME_VERSION,'checked_at':stamp(now),'mode':'apply' if apply else 'dry-run',
            'health':'unknown','dispatches':0,'dispatch_attempts':0,'targets':[]}
    state.setdefault('version',1)
    records=state.setdefault('targets',{})
    blocked=state.get('blocked_until')
    stop_reason=None
    if blocked:
        try:
            if timestamp(blocked)>now: stop_reason='rate_limit_backoff'
        except ValueError: pass
    ordered=sorted(config['targets'],key=lambda t: records.get(target_key(t),{}).get('last_checked',''))
    for index, target in enumerate(ordered, 1):
        started = time.monotonic()
        key=target_key(target)
        row={'repo':target['repo'],'branch':target['branch'],'workflow':str(target['workflow']).split('/')[-1],
             'status':'unknown','severity':'info','verified_refresh':False}
        report['targets'].append(row)
        def notify(event):
            if progress:
                fields={'index':index,'total':len(ordered),'repo':row['repo'],'workflow':row['workflow']}
                if event=='target_finished':
                    fields.update(status=row['status'],severity=row['severity'],elapsed_seconds=round(time.monotonic()-started,1))
                    if row.get('error_scope'):fields['error_scope']=row['error_scope']
                    if 'http_status' in row:fields['http_status']=row['http_status']
                progress(event,**fields)
        if stop_reason:
            # Backing off an external rate limit is a completed, safe decision.
            # A rejected shared credential is an actual service configuration failure.
            row.update(status='not_checked',severity='error' if stop_reason=='authentication_failed' else 'warning',
                       reason=stop_reason)
            if stop_reason=='authentication_failed':row['error_scope']='watchdog'
            notify('target_finished')
            continue
        notify('target_started')
        record=records.setdefault(key,{})
        cadence=cadence_minutes(target,now)
        grace=target.get('grace_minutes',config.get('grace_minutes',min(cadence/2,120)))
        cooldown=target.get('cooldown_minutes',config.get('cooldown_minutes',360))
        due=due_at(target,now,grace)
        row['due_at']=stamp(due)
        prefix='/repos/'+target['repo']+'/actions/workflows/'+urllib.parse.quote(row['workflow'],safe='')
        try:
            cached=record.get('workflow_cache',{})
            if cached and timestamp(cached['at'])>now-dt.timedelta(hours=1):
                workflow={'state':cached['state']}
            else:
                workflow=http.request('GET',prefix)
                if not isinstance(workflow,dict) or not isinstance(workflow.get('state'),str):
                    raise SafeError('invalid_workflow_response')
                record['workflow_cache']={'at':stamp(now),'state':workflow['state']}
            workflow_state=workflow['state'];row['workflow_state']=workflow_state
            if workflow_state=='disabled_manually':
                row.update(status='disabled_manually',severity='warning',reason='Preserved intentional disable; no enable or dispatch')
                continue
            if workflow_state not in ('active','disabled_inactivity'):
                row.update(status='disabled_other',severity='error',reason='Workflow is not active; requires owner review')
                continue
            runs,truncated=get_runs(http,prefix,target['branch'],due)
            if truncated:
                row['history_limited']=True
            active=[r for r in runs if r.get('status') in ACTIVE]
            successful=[]
            for r in runs:
                if r.get('event') in REFRESH_EVENTS and r.get('status')=='completed' and r.get('conclusion')=='success':
                    try:
                        created=timestamp(r['created_at'])
                        if created>=due: successful.append((created,r))
                    except (KeyError,TypeError,ValueError): pass
            latest_refresh=max(successful,key=lambda item:item[0])[1] if successful else None
            refresh_marker=None if latest_refresh is None else [latest_refresh.get('id',latest_refresh.get('created_at')),latest_refresh.get('run_attempt',1),latest_refresh.get('updated_at')]
            fresh=freshness_checks(target,http,now,cadence,cache=record.setdefault('probe_cache',{}),refresh_marker=refresh_marker,due=stamp(due))
            if fresh: row['freshness']=fresh
            stale=any(c['status']!='fresh' for c in fresh)
            if successful:
                created,latest=max(successful,key=lambda item:item[0])
                row.update(status='published_stale' if stale else 'current',
                           severity='error' if stale else 'info',last_successful_refresh_run=stamp(created),
                           verified_refresh=bool(fresh) and not stale,
                           assurance='published_timestamp' if fresh else 'workflow_only')
                # A completed refresh with stale source data needs review, not an infinite redispatch loop.
                if stale: row['reason']='Refresh run succeeded, but published timestamp did not pass; no redundant dispatch'
                if workflow_state=='disabled_inactivity':
                    if apply:
                        fresh_workflow=http.request('GET',prefix)
                        if not isinstance(fresh_workflow,dict) or not isinstance(fresh_workflow.get('state'),str):
                            raise SafeError('invalid_workflow_response')
                        if fresh_workflow.get('state')=='disabled_inactivity':
                            http.request('PUT',prefix+'/enable');record.pop('workflow_cache',None);row['re_enabled']=True
                            if persist:persist(state)
                        elif fresh_workflow.get('state')!='active':
                            record.pop('workflow_cache',None);row.update(status='disabled_manually',severity='warning');continue
                    else: row.update(status='would_enable',severity='warning')
                for field in ('attempts','attempt_due','retry_after'):
                    record.pop(field,None)
                continue
            if active:
                row.update(status='pending',severity='warning',reason='A workflow run is already queued or active; no duplicate dispatch')
                row['active_runs']=len(active)
                max_run=target.get('max_run_minutes',config.get('max_run_minutes',180))
                for active_run in active:
                    try:
                        if timestamp(active_run['created_at']) < now-dt.timedelta(minutes=max_run):
                            row.update(status='stalled_run',severity='error',max_run_minutes=max_run,reason='An active run exceeds the configured duration; investigate rather than dispatch a duplicate')
                    except (ValueError,TypeError,KeyError):pass
                if stale:
                    row['published_data_stale']=True
                    row['severity']='error'
                    if row['status']=='pending':
                        row['reason']='A run is active, but published freshness checks still fail; no duplicate dispatch'
                continue
            if workflow_state=='disabled_inactivity' and not apply:
                row['would_enable']=True
            if truncated:
                row.update(status='history_incomplete',severity='error',error_scope='target',reason='History cap reached; refusing uncertain duplicate dispatch')
                continue
            retry=record.get('retry_after')
            if record.get('attempts') and record.get('last_dispatch_attempt'):
                # Also migrate the old exponential cooldown without deleting state.
                # A new cron occurrence does not shorten an unresolved retry window.
                retry=stamp(timestamp(record['last_dispatch_attempt'])+dt.timedelta(minutes=cooldown))
                if apply:record['retry_after']=retry
            if retry and timestamp(retry)>now:
                row.update(status='cooldown',severity='warning',retry_after=retry,
                           recovery_attempts=record.get('attempts',0),
                           reason='Previous recovery attempt awaits its retry window; no successful refresh confirmed')
                continue
            if report['dispatch_attempts']>=config.get('max_dispatches_per_pass',10):
                row.update(status='dispatch_budget',severity='warning',reason='Overdue target deferred to a later pass')
                continue
            if not apply:
                row.update(status='would_dispatch',severity='error',reason='No successful scheduled/dispatched run covers the due occurrence')
                continue
            # Fresh owner intent wins over a cached active state, immediately before dispatch.
            latest_workflow=http.request('GET',prefix)
            if not isinstance(latest_workflow,dict) or not isinstance(latest_workflow.get('state'),str):
                raise SafeError('invalid_workflow_response')
            latest_state=latest_workflow['state']
            row['workflow_state']=latest_state
            record['workflow_cache']={'at':stamp(now),'state':latest_state}
            if latest_state=='disabled_inactivity':
                http.request('PUT',prefix+'/enable');record.pop('workflow_cache',None);row['re_enabled']=True
                if persist:persist(state)
            elif latest_state!='active':
                row.update(status='disabled_manually' if latest_state=='disabled_manually' else 'disabled_other',severity='warning' if latest_state=='disabled_manually' else 'error',reason='Fresh workflow state prevents dispatch')
                continue
            attempts=record.get('attempts',0)+1
            record.update(attempt_due=stamp(due),attempts=attempts,last_dispatch_attempt=stamp(now),
                          retry_after=stamp(now+dt.timedelta(minutes=cooldown)))
            # Persist before dispatch: even a killed process must retain the attempt cooldown.
            report['dispatch_attempts']+=1
            if persist:persist(state)
            try:
                http.request('POST',prefix+'/dispatches',{'ref':target['branch'],'inputs':target.get('inputs',{})})
            except SafeError:
                record['dispatch_outcome']='unknown_or_failed'
                raise
            record['dispatch_outcome']='accepted';report['dispatches']+=1
            if persist:persist(state)
            row.update(status='dispatch_requested',severity='warning',retry_after=record['retry_after'],recovery_attempts=attempts,
                       reason='GitHub accepted dispatch; a later pass must verify completion and published timestamps')
        except SafeError as error:
            # A handled remote failure is a target finding, not a crashed scheduler.
            # HTTP 401 rejects the service's shared credential and is the exception.
            if error.kind=='pass_time_budget':
                row.update(status='not_checked',severity='warning',reason='pass_time_budget')
                stop_reason='pass_time_budget'
            else:
                row.update(status=error.kind,severity='error',
                           error_scope='watchdog' if error.kind=='authentication_failed' else 'target')
            if error.status: row['http_status']=error.status
            if error.retry_at:
                state['blocked_until']=stamp(error.retry_at);row['retry_after']=state['blocked_until'];stop_reason='rate_limited'
            elif error.kind=='authentication_failed':stop_reason='authentication_failed'
        except (ValueError,KeyError,TypeError,OverflowError):
            row.update(status='invalid_api_data',severity='error',error_scope='target')
        finally:
            if (row['status'] in ('cooldown','dispatch_budget','dispatch_requested')
                    and any(check['status']!='fresh' for check in row.get('freshness',[]))):
                row.update(severity='error',published_data_stale=True)
                row['reason']+='; published freshness checks also fail'
            if row['severity']=='error':row.setdefault('error_scope','collector')
            if row['status']!='not_checked':record['last_checked']=stamp(now)
            # Preserve completed checks even if a later request stalls and
            # systemd ends the pass. The next pass resumes with older targets.
            if persist:persist(state)
            notify('target_finished')
    report['errors']=sum(r['severity']=='error' for r in report['targets'])
    if config.get('_registry'):
        report['registry']=config['_registry']
    if config.get('_registry_warning'):
        report['registry_warning']=config['_registry_warning']
        report['errors']+=1
    report['attention']=sum(r['severity']=='warning' for r in report['targets'])
    report['health']='unhealthy' if report['errors'] else 'attention' if report['attention'] else 'healthy'
    # Keep the overall findings intact; the execution heartbeat has a narrower scope.
    # Handled target API failures, rate limits and safe recovery deferrals belong
    # in admin findings. Shared authentication rejection remains a service failure;
    # local configuration/state/I/O failures are handled by main().
    report['watchdog_errors']=sum(r.get('error_scope')=='watchdog' for r in report['targets'])
    report['collector_errors']=sum(r.get('error_scope')=='collector' for r in report['targets'])
    report['target_errors']=sum(r.get('error_scope')=='target' for r in report['targets'])
    report['completed']=True
    report['watchdog_health']='unhealthy' if report['watchdog_errors'] else 'healthy' if apply else 'dry_run'
    report['heartbeat_scope']='watchdog_execution'
    report['assurance']='Published timestamp checks are reported separately; workflow success alone does not prove new source data'
    return report


def heartbeat_url(filename):
    if not filename:return None
    value=secure_read(filename)
    if not value:return None
    parsed=urllib.parse.urlsplit(value)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise SafeError('heartbeat_url_must_be_https_without_credentials')
    return value


def ping_heartbeat(url, healthy, opener=None):
    if not url:return None
    parsed=urllib.parse.urlsplit(url)
    destination=url if healthy else urllib.parse.urlunsplit(parsed._replace(path=parsed.path.rstrip('/')+'/fail'))
    request=urllib.request.Request(destination,headers={'User-Agent':'coolcode-watchdog/1.0','Accept':'text/plain'},method='GET')
    try:
        with (opener or urllib.request.build_opener(NoRedirect())).open(request,timeout=10) as response:
            response.read(1024)
        return True
    except (OSError,urllib.error.URLError,ValueError):
        return False


def atomic_json(path, document):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='.'+path.name+'.',dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as output:
            json.dump(document,output,indent=2,sort_keys=True);output.write('\n');output.flush();os.fsync(output.fileno())
        os.replace(name,path)
        directory=os.open(path.parent,os.O_RDONLY)
        try:os.fsync(directory)
        finally:os.close(directory)
    finally:
        if os.path.exists(name):os.unlink(name)


def fail_service(args, now, heartbeat, status, http_status=None):
    """Record only sanitized local/service failures; never echo exception bodies."""
    report={'version':1,'runtime_version':RUNTIME_VERSION,'checked_at':stamp(now),
            'health':'unhealthy','status':status,'completed':False,'errors':1,'attention':0,
            'watchdog_health':'unhealthy','watchdog_errors':1,'collector_errors':0,'target_errors':0,
            'heartbeat_scope':'watchdog_execution','http_status':http_status,
            'mode':'apply' if args.apply else 'dry-run','targets':[]}
    try:atomic_json(args.report,report)
    except OSError:pass  # The failure ping must still happen when the disk is full.
    delivered=ping_heartbeat(heartbeat,False)
    if delivered is not None:
        report['heartbeat']='delivered' if delivered else 'delivery_failed'
        try:atomic_json(args.report,report)
        except OSError:pass
    print(json.dumps({'watchdog_health':'unhealthy','status':status,'runtime_version':RUNTIME_VERSION}),file=sys.stderr)
    return 2


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',required=True);parser.add_argument('--state',default='state.json')
    parser.add_argument('--report',default='health.json');parser.add_argument('--apply',action='store_true')
    parser.add_argument('--check-config',action='store_true');parser.add_argument('--token-file')
    parser.add_argument('--app-id');parser.add_argument('--installation-id');parser.add_argument('--private-key-file')
    parser.add_argument('--heartbeat-url-file')
    args=parser.parse_args(argv)
    now=dt.datetime.now(UTC)
    if not args.check_config:log_progress('watchdog_started',mode='apply' if args.apply else 'dry-run',runtime_version=RUNTIME_VERSION)
    try:
        heartbeat=None if args.check_config or not args.apply else heartbeat_url(args.heartbeat_url_file)
    except SafeError as error:
        return fail_service(args,now,None,error.kind,error.status)
    try:
        with open(args.config) as source:config=validate_config(json.load(source))
        if args.check_config:
            print(json.dumps({'status':'config_valid','targets':len(config['targets'])}));return 0
    except (OSError,ValueError,TypeError,KeyError):
        return fail_service(args,now,heartbeat,'invalid_configuration')
    try:
        lockpath=Path(args.state+'.lock');lockpath.parent.mkdir(parents=True,exist_ok=True)
        lock=open(lockpath,'a+');os.chmod(lockpath,0o600)
    except OSError:
        return fail_service(args,now,heartbeat,'state_lock_io_failed')
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close()
        print(json.dumps({'status':'already_running','health':'not_checked'}));return 0
    report=None
    try:
        state=json.loads(Path(args.state).read_text()) if Path(args.state).exists() else {'version':1,'targets':{}}
        validate_state(state)
        app=(args.app_id,args.installation_id,args.private_key_file)
        if any(app):
            if not all(app):raise SafeError('app_auth_requires_all_three_options')
            log_progress('authenticating',method='app')
            token=installation_token(*app,now)
        else:
            log_progress('authenticating',method='token')
            token=os.environ.get('GH_TOKEN','').strip()
            filename=args.token_file or os.environ.get('GH_TOKEN_FILE')
            if not token and filename:token=secure_read(filename)
            if not token:raise SafeError('github_credentials_missing')
        log_progress('checking_targets',targets=len(config['targets']))
        report=run(config,state,HTTP(token,budget_seconds=REQUEST_BUDGET_SECONDS),now,args.apply,persist=lambda value:atomic_json(args.state,value),progress=log_progress)
        # Dry runs may cache reads but never write dispatch attempt or enable state.
        atomic_json(args.state,state)
        log_progress('saving_report',watchdog_errors=report['watchdog_errors'],collector_errors=report['collector_errors'],target_errors=report['target_errors'],dispatches=report['dispatches'])
        # A successful heartbeat also means the completed findings reached disk.
        if heartbeat:report['heartbeat']='pending'
        atomic_json(args.report,report)
        if heartbeat:log_progress('sending_heartbeat',watchdog_health=report['watchdog_health'])
        delivered=ping_heartbeat(heartbeat,report['watchdog_errors']==0)
        if delivered is not None:
            report['heartbeat']='delivered' if delivered else 'delivery_failed'
            if not delivered:
                report['errors']+=1;report['health']='unhealthy'
                report['watchdog_errors']+=1;report['watchdog_health']='unhealthy'
            atomic_json(args.report,report)
        print(json.dumps({'watchdog_health':report['watchdog_health'],'mode':report['mode'],'targets':len(report['targets']),
                          'watchdog_errors':report['watchdog_errors'],'collector_errors':report['collector_errors'],'target_errors':report['target_errors'],
                          'attention':report['attention'],'dispatches':report['dispatches']}))
        return 1 if (report['watchdog_errors'] if args.apply else report['errors']) else 0
    except SafeError as error:
        return fail_service(args,now,heartbeat,error.kind,error.status)
    except (OSError,ValueError,TypeError):
        return fail_service(args,now,heartbeat,'state_or_report_io_failed')
    except Exception:
        # A programming/runtime failure is a service failure, not a target finding.
        return fail_service(args,now,heartbeat,'internal_error')
    finally:
        fcntl.flock(lock,fcntl.LOCK_UN);lock.close()


if __name__=='__main__':
    sys.exit(main())
