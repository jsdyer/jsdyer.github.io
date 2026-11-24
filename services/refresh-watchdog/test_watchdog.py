import contextlib
import copy
import datetime as dt
import fcntl
import io
import json
import os
import stat
import struct
import tempfile
from types import SimpleNamespace
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
import watchdog as w

NOW=dt.datetime(2026,11,23,12,0,tzinfo=w.UTC)

def config(**changes):
    t={'repo':'owner/tool','branch':'main','workflow':'refresh.yml','crons':['0 8 * * *'],'inputs':{}}
    t.update(changes)
    return {'version':1,'targets':[t]}

def completed(event='schedule',created='2026-11-23T08:10:00Z',branch='main'):
    return {'event':event,'created_at':created,'head_branch':branch,'status':'completed','conclusion':'success'}

class Fake:
    def __init__(self,state='active',runs=None,public=None,fail=None):
        self.state=state;self.runs=runs or [];self.public=public;self.calls=[];self.fail=fail
    def request(self,method,path,payload=None,public=False):
        self.calls.append((method,path,payload,public))
        if self.fail:raise self.fail
        if public:return self.public
        if method=='GET' and '/runs?' in path:return {'workflow_runs':self.runs}
        if method=='GET':return {'state':self.state}
        return None
    @property
    def writes(self):return [c for c in self.calls if c[0]!='GET']

class Decisions(unittest.TestCase):
    def test_progress_precedes_request_and_checkpoint_survives_later_interruption(self):
        c=config();c['targets'].append(dict(c['targets'][0],repo='owner/second'))
        events=[];checkpoints=[]
        class Interrupted(Fake):
            def request(self,method,path,payload=None,public=False):
                self_outer.assertEqual(events[-1]['event'],'target_started')
                if '/owner/second/' in path:raise KeyboardInterrupt()
                return super().request(method,path,payload,public)
        self_outer=self
        def progress(event,**fields):events.append({'event':event,**fields})
        with self.assertRaises(KeyboardInterrupt):
            w.run(c,{},Interrupted(runs=[completed()]),NOW,True,
                  persist=lambda state:checkpoints.append(copy.deepcopy(state)),progress=progress)
        self.assertEqual(events[0]['index'],1)
        self.assertEqual(events[1]['status'],'current')
        self.assertEqual(events[2]['repo'],'owner/second')
        key=w.target_key(c['targets'][0])
        self.assertEqual(checkpoints[0]['targets'][key]['last_checked'],w.stamp(NOW))
    def test_progress_reports_skipped_targets_without_disclosing_inputs(self):
        c=config(inputs={'private':'DO_NOT_LOG'});c['targets'].append(dict(c['targets'][0],repo='owner/second'))
        events=[]
        w.run(c,{},Fake(fail=w.SafeError('authentication_failed',401)),NOW,
              progress=lambda event,**fields:events.append({'event':event,**fields}))
        self.assertEqual([e['event'] for e in events],['target_started','target_finished','target_finished'])
        self.assertEqual(events[1]['http_status'],401)
        self.assertEqual(events[2]['status'],'not_checked')
        self.assertNotIn('DO_NOT_LOG',json.dumps(events))
    def test_monthly_not_dispatched_early(self):
        c=config(crons=['0 0 1 * *']);f=Fake(runs=[completed(created='2026-11-01T00:05:00Z')])
        r=w.run(c,{},f,NOW,True)
        self.assertEqual(r['targets'][0]['status'],'current');self.assertFalse(f.writes)
        self.assertEqual(r['targets'][0]['due_at'],'2026-11-01T00:00:00Z')
    def test_exact_due_boundary_and_grace(self):
        t=config(crons=['*/30 * * * *'])['targets'][0]
        self.assertEqual(w.stamp(w.due_at(t,NOW+dt.timedelta(minutes=5),10)),'2026-11-23T11:30:00Z')
        self.assertEqual(w.stamp(w.due_at(t,NOW+dt.timedelta(minutes=10),10)),'2026-11-23T12:00:00Z')
    def test_multiple_crons_latest_eligible(self):
        t=config(crons=['0 8 * * *','0 11 * * *'])['targets'][0]
        self.assertEqual(w.due_at(t,NOW,30).hour,11)
    def test_dry_run_never_mutates_remote_or_claims_healthy(self):
        f=Fake();s={};r=w.run(config(),s,f,NOW)
        self.assertEqual(r['health'],'unhealthy');self.assertEqual(r['targets'][0]['status'],'would_dispatch')
        self.assertFalse(f.writes);self.assertNotIn('retry_after',s['targets'][w.target_key(config()['targets'][0])])
    def test_successful_dispatch_is_only_pending_evidence(self):
        f=Fake();s={};checkpoints=[];r=w.run(config(),s,f,NOW,True,persist=lambda d:checkpoints.append(copy.deepcopy(d)))
        self.assertEqual(r['dispatches'],1);self.assertEqual(r['health'],'attention')
        self.assertFalse(r['targets'][0]['verified_refresh']);self.assertEqual(r['targets'][0]['status'],'dispatch_requested')
        self.assertGreaterEqual(len(checkpoints),2)
        self.assertIn('retry_after',next(iter(checkpoints[0]['targets'].values())))
        r2=w.run(config(),s,f,NOW+dt.timedelta(minutes=5),True)
        self.assertEqual(r2['targets'][0]['status'],'cooldown');self.assertEqual(len(f.writes),1)
    def test_push_success_does_not_prove_refresh_but_active_push_dedupes(self):
        f=Fake(runs=[completed(event='push')]);self.assertEqual(w.run(config(),{},f,NOW)['targets'][0]['status'],'would_dispatch')
        f=Fake(runs=[dict(completed(event='push',created='2026-11-23T11:50:00Z'),status='in_progress',conclusion=None)])
        self.assertEqual(w.run(config(),{},f,NOW,True)['targets'][0]['status'],'pending');self.assertFalse(f.writes)
    def test_other_branch_is_not_success_or_active_dedupe(self):
        f=Fake(runs=[dict(completed(branch='feature'),status='in_progress')])
        self.assertEqual(w.run(config(),{},f,NOW)['targets'][0]['status'],'would_dispatch')
    def test_manually_disabled_preserved(self):
        f=Fake(state='disabled_manually');r=w.run(config(),{},f,NOW,True)
        self.assertEqual(r['targets'][0]['status'],'disabled_manually');self.assertEqual(len(f.calls),1)
    def test_inactivity_only_enabled_in_apply(self):
        f=Fake(state='disabled_inactivity');r=w.run(config(),{},f,NOW)
        self.assertTrue(r['targets'][0]['would_enable']);self.assertFalse(f.writes)
        f=Fake(state='disabled_inactivity');w.run(config(),{},f,NOW,True)
        self.assertEqual([x[0] for x in f.writes],['PUT','POST'])
        self.assertEqual(len([x for x in f.calls if x[0]=='GET' and '/runs?' not in x[1]]),2)
    def test_stale_cached_inactivity_refetched_before_enable(self):
        c=config();key=w.target_key(c['targets'][0]);state={'targets':{key:{'workflow_cache':{'at':w.stamp(NOW),'state':'disabled_inactivity'}}}}
        f=Fake(state='disabled_manually');r=w.run(c,state,f,NOW,True)
        self.assertEqual(r['targets'][0]['status'],'disabled_manually');self.assertFalse(f.writes)
    def test_freshness_is_checked_and_stale_success_does_not_loop(self):
        c=config(freshness=[{'url':'https://tool.example/data.json','json_path':['items',-1,'checked_at'],'max_age_seconds':3600}])
        f=Fake(runs=[completed()],public={'items':[{'checked_at':'2026-11-20T00:00:00Z'}]})
        r=w.run(c,{},f,NOW,True);self.assertEqual(r['targets'][0]['status'],'published_stale');self.assertFalse(f.writes)
        f.public={'items':[{'checked_at':'2026-11-23T11:30:00Z'}]}
        r=w.run(c,{},f,NOW,True);self.assertTrue(r['targets'][0]['verified_refresh'])
        self.assertEqual(r['targets'][0]['freshness'][0]['status'],'fresh')
    def test_date_precision_is_explicit(self):
        c=config(freshness=[{'url':'https://tool.example/data.json','json_path':'checked','precision':'date'}]);f=Fake(runs=[completed()],public={'checked':'2026-11-23'})
        self.assertEqual(w.run(c,{},f,NOW)['targets'][0]['freshness'][0]['status'],'fresh')
        c['targets'][0]['freshness'][0].pop('precision')
        self.assertEqual(w.run(c,{},f,NOW)['targets'][0]['freshness'][0]['error'],'timestamp_missing_or_invalid')
    def test_future_timestamp_never_claims_fresh(self):
        c=config(freshness=[{'url':'https://tool.example/a.json','json_path':'t'}]);f=Fake(runs=[completed()],public={'t':'2027-01-01T00:00:00Z'})
        self.assertEqual(w.run(c,{},f,NOW)['targets'][0]['freshness'][0]['status'],'future_timestamp')
    def test_dispatch_budget_and_retry_cap(self):
        c=config();c['targets'] += [dict(c['targets'][0],repo='owner/second')];c['max_dispatches_per_pass']=1
        f=Fake();r=w.run(c,{},f,NOW,True);self.assertEqual(r['dispatches'],1)
        self.assertEqual(r['targets'][1]['status'],'dispatch_budget')
        c=config();due=w.stamp(w.due_at(c['targets'][0],NOW,120));key=w.target_key(c['targets'][0]);state={'targets':{key:{'attempts':3,'attempt_due':due}}}
        f=Fake();r=w.run(c,state,f,NOW,True);self.assertEqual(r['targets'][0]['status'],'retry_exhausted');self.assertFalse(f.writes)
    def test_auth_failure_stops_remaining_targets(self):
        c=config();c['targets'] += [dict(c['targets'][0],repo='owner/second')];f=Fake(fail=w.SafeError('authentication_failed',401))
        r=w.run(c,{},f,NOW);self.assertEqual(len(f.calls),1);self.assertEqual(r['errors'],2)
    def test_rate_limit_backoff_persists(self):
        state={};f=Fake(fail=w.SafeError('rate_limited',429,NOW+dt.timedelta(minutes=10)))
        r=w.run(config(),state,f,NOW);self.assertIn('blocked_until',state)
        f=Fake();r=w.run(config(),state,f,NOW+dt.timedelta(minutes=5));self.assertFalse(f.calls)
        self.assertEqual(r['targets'][0]['reason'],'rate_limit_backoff')
    def test_history_paginates_and_refuses_uncertain_duplicate(self):
        runs=[completed(created='2026-11-23T11:00:00Z',event='push')]*100
        f=Fake(runs=runs);r=w.run(config(),{},f,NOW,True)
        self.assertEqual(len([x for x in f.calls if '/runs?' in x[1]]),5)
        self.assertEqual(r['targets'][0]['status'],'history_incomplete');self.assertFalse(f.writes)
    def test_failed_dispatch_counts_toward_budget_and_keeps_checkpoint(self):
        class DispatchFail(Fake):
            def request(self,method,path,payload=None,public=False):
                if method=='POST':
                    self.calls.append((method,path,payload,public));raise w.SafeError('network_error')
                return super().request(method,path,payload,public)
        c=config();c['targets'].append(dict(c['targets'][0],repo='owner/second'));c['max_dispatches_per_pass']=1
        state={};f=DispatchFail();snapshots=[]
        r=w.run(c,state,f,NOW,True,persist=lambda d:snapshots.append(copy.deepcopy(d)))
        self.assertEqual(r['dispatch_attempts'],1);self.assertEqual(r['dispatches'],0)
        self.assertEqual(r['targets'][1]['status'],'dispatch_budget');self.assertTrue(snapshots)
        self.assertIn('retry_after',next(iter(snapshots[0]['targets'].values())))
    def test_stalled_run_is_error_without_duplicate(self):
        f=Fake(runs=[dict(completed(created='2026-11-20T08:00:00Z',event='push'),status='in_progress')])
        r=w.run(config(),{},f,NOW,True);self.assertEqual(r['targets'][0]['status'],'stalled_run');self.assertFalse(f.writes)
    def test_cached_active_is_rechecked_before_dispatch(self):
        c=config();key=w.target_key(c['targets'][0]);state={'targets':{key:{'workflow_cache':{'at':w.stamp(NOW),'state':'active'}}}}
        f=Fake(state='disabled_manually');r=w.run(c,state,f,NOW,True)
        self.assertEqual(r['targets'][0]['status'],'disabled_manually');self.assertFalse(f.writes)
        self.assertEqual(r['targets'][0]['workflow_state'],'disabled_manually')
    def test_pending_with_failed_freshness_is_unhealthy_without_duplicate(self):
        c=config(freshness=[{'url':'https://tool.example/data.json','json_path':'checked','max_age_seconds':3600}])
        active=dict(completed(created='2026-11-23T11:50:00Z'),status='queued',conclusion=None)
        for public in ({'checked':'2026-11-20T00:00:00Z'},{}):
            f=Fake(runs=[active],public=public);r=w.run(c,{},f,NOW,True)
            self.assertEqual(r['targets'][0]['status'],'pending');self.assertEqual(r['targets'][0]['severity'],'error')
            self.assertEqual(r['health'],'unhealthy');self.assertTrue(r['targets'][0]['published_data_stale']);self.assertFalse(f.writes)
    def test_max_run_minutes_global_target_override_and_validation(self):
        active=dict(completed(created='2026-11-23T09:30:00Z'),status='in_progress',conclusion=None)
        c=config();c['max_run_minutes']=180
        self.assertEqual(w.run(c,{},Fake(runs=[active]),NOW)['targets'][0]['status'],'pending')
        c['targets'][0]['max_run_minutes']=120
        self.assertEqual(w.run(c,{},Fake(runs=[active]),NOW)['targets'][0]['status'],'stalled_run')
        for invalid in (0,10081,True,'180',float('nan')):
            c['targets'][0]['max_run_minutes']=invalid
            with self.assertRaises(ValueError):w.validate_config(c)
    def test_weekly_freshness_cache_reuse_and_new_success_invalidation(self):
        c=config(crons=['0 8 * * 1'],freshness=[{'url':'https://tool.example/data.json','json_path':'checked'}])
        f=Fake(runs=[dict(completed(),id=10)],public={'checked':'2026-11-23T11:50:00Z'});state={}
        w.run(c,state,f,NOW);f.calls=[]
        r=w.run(c,state,f,NOW+dt.timedelta(minutes=5))
        self.assertEqual(sum(call[3] for call in f.calls),0)
        self.assertTrue(r['targets'][0]['freshness'][0]['cached'])
        f.runs=[dict(completed(created='2026-11-23T12:10:00Z'),id=11)];f.calls=[]
        r=w.run(c,state,f,NOW+dt.timedelta(minutes=15))
        self.assertEqual(sum(call[3] for call in f.calls),1)
        self.assertFalse(r['targets'][0]['freshness'][0]['cached'])
    def test_cached_timestamp_ages_into_stale_without_download(self):
        c=config(crons=['0 8 * * 1'],freshness=[{'url':'https://tool.example/data.json','json_path':'checked','max_age_seconds':3600}])
        f=Fake(runs=[completed()],public={'checked':'2026-11-23T11:50:00Z'});state={}
        self.assertEqual(w.run(c,state,f,NOW)['targets'][0]['freshness'][0]['status'],'fresh');f.calls=[]
        r=w.run(c,state,f,NOW+dt.timedelta(hours=2))
        self.assertEqual(sum(call[3] for call in f.calls),0)
        self.assertEqual(r['targets'][0]['freshness'][0]['status'],'stale');self.assertEqual(r['health'],'unhealthy')
    def test_freshness_cache_expires_and_config_or_due_change_invalidates(self):
        t=config(crons=['0 8 * * 1'],freshness=[{'url':'https://tool.example/data.json','json_path':'checked'}])['targets'][0]
        f=Fake(public={'checked':'2026-11-23T11:50:00Z'});cache={}
        w.freshness_checks(t,f,NOW,10080,cache,1,'due-one');f.calls=[]
        w.freshness_checks(t,f,NOW+dt.timedelta(hours=6),10080,cache,1,'due-one');self.assertEqual(len(f.calls),1);f.calls=[]
        w.freshness_checks(t,f,NOW+dt.timedelta(hours=6,minutes=1),10080,cache,1,'due-two');self.assertEqual(len(f.calls),1);f.calls=[]
        t['freshness'][0]['max_age_seconds']=7200
        w.freshness_checks(t,f,NOW+dt.timedelta(hours=6,minutes=2),10080,cache,1,'due-two');self.assertEqual(len(f.calls),1)
    def test_probe_errors_are_never_reused_as_healthy_cache(self):
        t=config(freshness=[{'url':'https://tool.example/data.json','json_path':'checked'}])['targets'][0]
        f=Fake(public={});cache={}
        a=w.freshness_checks(t,f,NOW,1440,cache);self.assertEqual(a[0]['status'],'error');self.assertEqual(cache,{})
        f.public={'checked':'2026-11-23T11:50:00Z'};f.calls=[]
        b=w.freshness_checks(t,f,NOW+dt.timedelta(minutes=5),1440,cache)
        self.assertEqual(len(f.calls),1);self.assertEqual(b[0]['status'],'fresh');self.assertFalse(b[0]['cached'])
    def test_workflow_state_cached_within_hour(self):
        c=config();f=Fake(runs=[completed()]);state={};w.run(c,state,f,NOW);f.calls=[]
        w.run(c,state,f,NOW+dt.timedelta(minutes=5));self.assertEqual(len(f.calls),1)
        self.assertIn('/runs?',f.calls[0][1])

class Response:
    def __init__(self,body=b'{}'):self.body=body
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,limit):return self.body

class Opener:
    def __init__(self,replies):self.replies=list(replies);self.requests=[]
    def open(self,req,timeout):
        self.requests.append(req);response=self.replies.pop(0)
        if isinstance(response,Exception):raise response
        return response

def http_error(status,headers=None,body=b'GH_SUPER_SECRET'):
    return urllib.error.HTTPError(w.API+'/test',status,'secret-response',headers or {},io.BytesIO(body))

class Transport(unittest.TestCase):
    def test_no_credentials_on_freshness_url(self):
        op=Opener([Response()]);h=w.HTTP('GH_SUPER_SECRET',opener=op)
        h.request('GET','https://data.example/check.json?secret=ignored',public=True)
        self.assertIsNone(op.requests[0].get_header('Authorization'))
    def test_github_token_only_on_fixed_api_origin(self):
        op=Opener([Response()]);h=w.HTTP('TOKEN',opener=op);h.request('GET','/repos/owner/tool')
        self.assertEqual(op.requests[0].full_url,w.API+'/repos/owner/tool')
        self.assertEqual(op.requests[0].get_header('Authorization'),'Bearer TOKEN')
        with self.assertRaises(w.SafeError):h.request('GET','https://evil.example')
    def test_error_body_never_appears_in_exception(self):
        for code in (401,403,404,422,500):
            op=Opener([http_error(code)]*3);h=w.HTTP('TOKEN',opener=op,sleep=lambda _:None)
            with self.assertRaises(w.SafeError) as caught:h.request('GET','/test')
            self.assertNotIn('SECRET',str(caught.exception));self.assertNotIn('secret-response',str(caught.exception))
    def test_get_retries_but_dispatch_never_retries(self):
        op=Opener([http_error(503),Response()]);h=w.HTTP(opener=op,sleep=lambda _:None);h.request('GET','/test');self.assertEqual(len(op.requests),2)
        op=Opener([TimeoutError(),Response()]);h=w.HTTP(opener=op,sleep=lambda _:None)
        with self.assertRaises(w.SafeError):h.request('POST','/dispatches',{})
        self.assertEqual(len(op.requests),1)
    def test_rate_limits_respect_retry_after(self):
        for code in (403,429):
            op=Opener([http_error(code,{'Retry-After':'600'})]);h=w.HTTP(opener=op,now=lambda:NOW)
            with self.assertRaises(w.SafeError) as caught:h.request('GET','/test')
            self.assertEqual(caught.exception.kind,'rate_limited');self.assertEqual(caught.exception.retry_at,NOW+dt.timedelta(minutes=10))
    def test_secondary_limit_without_retry_header_is_respected(self):
        op=Opener([http_error(403,body=b'{"message":"You have exceeded a secondary rate limit. SECRET"}')])
        with self.assertRaises(w.SafeError) as caught:w.HTTP(opener=op,now=lambda:NOW).request('GET','/test')
        self.assertEqual(caught.exception.kind,'rate_limited');self.assertNotIn('SECRET',str(caught.exception))
    def test_heartbeat_plaintext_no_credentials_and_fail_suffix(self):
        op=Opener([Response(b'OK'),Response(b'OK')])
        url='https://monitor.example/private-token?key=SECRET'
        self.assertTrue(w.ping_heartbeat(url,True,opener=op));self.assertTrue(w.ping_heartbeat(url,False,opener=op))
        self.assertEqual(op.requests[1].full_url,'https://monitor.example/private-token/fail?key=SECRET')
        self.assertIsNone(op.requests[0].get_header('Authorization'))
        self.assertIsNone(w.ping_heartbeat(None,True,opener=op))
    def test_heartbeat_errors_return_no_url_or_secret(self):
        op=Opener([http_error(503,body=b'SECRET')]);self.assertFalse(w.ping_heartbeat('https://example.test/SECRET',False,opener=op))
    def test_public_json_has_24_mib_limit_but_api_keeps_4_mib(self):
        data=b'"'+b'x'*(4*1024*1024)+b'"'
        op=Opener([Response(data)])
        self.assertEqual(len(w.HTTP(opener=op).request('GET','https://example.test/data.json',public=True)),4*1024*1024)
        op=Opener([Response(data)])
        with self.assertRaises(w.SafeError) as caught:w.HTTP(opener=op).request('GET','/test')
        self.assertEqual(caught.exception.kind,'response_too_large')
        class BoundedResponse(Response):
            def read(self,limit):
                self.limit=limit
                return b'{}'
        response=BoundedResponse();op=Opener([response]);w.HTTP(opener=op).request('GET','https://example.test/data.json',public=True)
        self.assertEqual(response.limit,24*1024*1024+1)
        op=Opener([Response(b'x'*(24*1024*1024+1))])
        with self.assertRaises(w.SafeError) as caught:w.HTTP(opener=op).request('GET','https://example.test/data.json',public=True)
        self.assertEqual(caught.exception.kind,'response_too_large')
    def test_auth_and_secret_redaction_in_report(self):
        f=Fake(fail=w.SafeError('authentication_failed',401));r=w.run(config(inputs={'private':'GH_SUPER_SECRET'}),{},f,NOW)
        self.assertNotIn('GH_SUPER_SECRET',json.dumps(r))

class FilesAndCLI(unittest.TestCase):
    def test_progress_is_flushed_immediately(self):
        with patch('builtins.print') as output:w.log_progress('checking_targets',targets=168)
        self.assertTrue(output.call_args.kwargs['flush'])
        self.assertEqual(json.loads(output.call_args.args[0])['event'],'checking_targets')
    def test_atomic_state_is_private_and_valid(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'state.json';w.atomic_json(p,{'ok':True});self.assertEqual(p.stat().st_mode&0o777,0o600)
            self.assertEqual(json.loads(p.read_text()),{'ok':True})
            w.atomic_json(p,{'next':1});self.assertEqual(json.loads(p.read_text()),{'next':1})
    def test_credential_permissions_and_symlinks(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'token';p.write_text('SECRET');p.chmod(0o644)
            with self.assertRaises(w.SafeError):w.secure_read(p)
            p.chmod(0o600);self.assertEqual(w.secure_read(p),'SECRET')
            link=Path(d)/'link';link.symlink_to(p)
            with self.assertRaises(w.SafeError):w.secure_read(link)
    def test_systemd_acl_credential_and_rejected_lookalikes(self):
        undefined=0xffffffff;uid=61234
        entries=[(1,4,undefined),(2,4,uid),(4,0,undefined),(16,4,undefined),(32,0,undefined)]
        def acl(rows):
            return struct.pack('<I',2)+b''.join(struct.pack('<HHI',*row) for row in rows)
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'heartbeat';p.write_text('https://monitor.example/test');p.chmod(0o440)
            info=SimpleNamespace(st_mode=stat.S_IFREG|0o440,st_uid=0,st_nlink=1,st_dev=1)
            parent=SimpleNamespace(st_mode=stat.S_IFDIR|0o550,st_uid=0,st_dev=1)
            with patch.dict(os.environ,{'CREDENTIALS_DIRECTORY':d}), \
                    patch('watchdog.os.fstat',return_value=info), \
                    patch('watchdog.Path.stat',return_value=parent), \
                    patch('watchdog.os.geteuid',return_value=uid), \
                    patch('watchdog.os.fstatvfs',return_value=SimpleNamespace(f_flag=os.ST_RDONLY)) as fs, \
                    patch('watchdog.os.getxattr',return_value=acl(entries)) as xattr:
                self.assertEqual(w.heartbeat_url(p),'https://monitor.example/test')
                for bad_acl in (b'',acl(entries).replace(struct.pack('<I',2),struct.pack('<I',3),1),
                        acl(entries[:2]+[(4,4,undefined)]+entries[3:]),
                        acl(entries[:1]+[(2,4,uid+1)]+entries[2:]),
                        acl(entries+[(8,4,1234)])):
                    with self.subTest(acl=bad_acl):
                        xattr.return_value=bad_acl
                        with self.assertRaises(w.SafeError):w.secure_read(p)
                xattr.return_value=acl(entries)
                xattr.side_effect=OSError('ACL unavailable')
                with self.assertRaises(w.SafeError):w.secure_read(p)
                xattr.side_effect=None
                fs.return_value=SimpleNamespace(f_flag=0)
                with self.assertRaises(w.SafeError):w.secure_read(p)
                fs.return_value=SimpleNamespace(f_flag=os.ST_RDONLY)
                for attr,bad in (('st_uid',uid),('st_nlink',2),('st_mode',stat.S_IFREG|0o644)):
                    good=getattr(info,attr);setattr(info,attr,bad)
                    with self.assertRaises(w.SafeError):w.secure_read(p)
                    setattr(info,attr,good)
                for attr,bad in (('st_uid',uid),('st_mode',stat.S_IFDIR|0o570),('st_dev',2)):
                    good=getattr(parent,attr);setattr(parent,attr,bad)
                    with self.assertRaises(w.SafeError):w.secure_read(p)
                    setattr(parent,attr,good)
                for location in ('',str(Path(d)/'elsewhere'),'.'):
                    with patch.dict(os.environ,{'CREDENTIALS_DIRECTORY':location}):
                        with self.assertRaises(w.SafeError):w.secure_read(p)
            # A plain group-readable file remains rejected outside systemd.
            with patch.dict(os.environ,{},clear=True):
                with self.assertRaises(w.SafeError):w.secure_read(p)
    def test_heartbeat_file_validation_and_disabled_empty_file(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'heartbeat';p.write_text('');p.chmod(0o600);self.assertIsNone(w.heartbeat_url(p))
            p.write_text('https://monitor.example/secret');self.assertEqual(w.heartbeat_url(p),'https://monitor.example/secret')
            p.write_text('https://user:SECRET@monitor.example/')
            with self.assertRaises(w.SafeError):w.heartbeat_url(p)
    def test_offline_config_check_needs_no_credentials(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'config.json';p.write_text(json.dumps(config()))
            with patch.dict(os.environ,{},clear=True),contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(w.main(['--config',str(p),'--check-config']),0)
    def test_dry_run_never_reads_or_sends_production_heartbeat(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'config.json';p.write_text(json.dumps(config()))
            f=Fake(runs=[completed(created=w.stamp(dt.datetime.now(w.UTC)))])
            with patch.dict(os.environ,{'GH_TOKEN':'test-token'}),patch('watchdog.HTTP',return_value=f),patch('watchdog.heartbeat_url') as load,patch('watchdog.urllib.request.build_opener') as opener,contextlib.redirect_stdout(io.StringIO()):
                code=w.main(['--config',str(p),'--state',str(Path(d)/'state.json'),'--report',str(Path(d)/'report.json'),'--heartbeat-url-file',str(Path(d)/'production-heartbeat')])
            self.assertEqual(code,0);load.assert_not_called();opener.assert_not_called()
    def test_overlap_exits_without_claiming_health(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'config.json';p.write_text(json.dumps(config()));state=Path(d)/'state.json'
            with open(str(state)+'.lock','w') as lock:
                fcntl.flock(lock,fcntl.LOCK_EX)
                output=io.StringIO()
                with contextlib.redirect_stdout(output):code=w.main(['--config',str(p),'--state',str(state)])
                self.assertEqual(code,0);self.assertIn('not_checked',output.getvalue())
    def test_invalid_config_cannot_redirect_credentials(self):
        c=config();c['github_api_url']='https://evil.example'
        with self.assertRaises(ValueError):w.validate_config(c)
        for cron in ('* * * * * *','bad','@monthly'):
            with self.assertRaises(ValueError):w.validate_config(config(crons=[cron]))
    def test_app_auth_uses_short_lived_rs256_claims(self):
        import jwt
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
        pem=key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
        seen={}
        class AuthHTTP:
            def __init__(self,token):seen['jwt']=token
            def request(self,method,path,payload):seen.update(method=method,path=path,payload=payload);return {'token':'SHORT_TOKEN'}
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'key';p.write_bytes(pem);p.chmod(0o600)
            token=w.installation_token('123','456',p,NOW,http_factory=AuthHTTP)
        self.assertEqual(token,'SHORT_TOKEN');claims=jwt.decode(seen['jwt'],options={'verify_signature':False})
        self.assertEqual(claims['iat'],int(NOW.timestamp())-60);self.assertEqual(claims['exp'],int(NOW.timestamp())+540)
        self.assertEqual(seen['payload']['permissions'],{'actions':'write','metadata':'read'})
        self.assertEqual(jwt.get_unverified_header(seen['jwt'])['alg'],'RS256')

if __name__=='__main__':unittest.main()
