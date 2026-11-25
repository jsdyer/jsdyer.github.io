#!/usr/bin/env python3
"""Read-only workflow/output observations for the admin; never dispatch or ping alerts."""
from concurrent.futures import ThreadPoolExecutor
import argparse
import copy
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlencode

import watchdog as wd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from refresh_dates import record_count

ACTIVE = wd.ACTIVE
FAILED = {'failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'}


def run_record(run, repo):
    if not isinstance(run, dict) or not isinstance(run.get('id'), int):
        return None
    created = wd.timestamp(run.get('run_started_at') or run['created_at'])
    return {'id': run['id'], 'attempt': run.get('run_attempt', 1), 'at': wd.stamp(created), 'event': str(run.get('event', 'unknown')),
            'status': str(run.get('status', 'unknown')), 'conclusion': run.get('conclusion'),
            'url': f"https://github.com/{repo}/actions/runs/{run['id']}"}


class PublicDocuments:
    """One target's public responses, reused for timestamp and count reads."""
    def __init__(self, http):
        self.http, self.documents = http, {}

    def request(self, method, url, *, public=False):
        assert method == 'GET' and public
        if url not in self.documents:
            self.documents[url] = self.http.request('GET', url, public=True)
        return self.documents[url]


def collection_check(http, repo, run, names):
    """Only reviewed source steps can prove that a push performed collection."""
    if not run or run['status'] != 'completed':
        return {'status': 'pending'}
    try:
        jobs = http.request('GET', f"/repos/{repo}/actions/runs/{run['id']}/jobs?filter=latest&per_page=100")
        steps = [step for job in jobs.get('jobs', []) for step in (job.get('steps') or [])
                 if step.get('name') in names]
        if len(steps) != len(names) or {step['name'] for step in steps} != set(names):
            return {'status': 'unavailable'}
        results = {step.get('conclusion') for step in steps}
        status = ('success' if results == {'success'} else 'failure' if results & FAILED
                  else 'skipped' if results == {'skipped'} else 'unavailable')
        result = {'status': status, 'steps': [{'name': s['name'], 'conclusion': s.get('conclusion')} for s in steps]}
        if status in ('success', 'failure') and all(s.get('started_at') for s in steps):
            result['started_at'] = wd.stamp(min(wd.timestamp(s['started_at']) for s in steps))
        return result
    except (wd.SafeError, KeyError, TypeError, ValueError):
        return {'status': 'unavailable'}


def classify(row):
    execution, output = row['execution'], row['output']
    issues = []
    if execution.get('state') not in (None, 'active'):
        issues.append('Workflow is ' + execution['state'].replace('_', ' '))
    if execution.get('error'):
        issues.append('Workflow results could not be read')
    if execution.get('due_unobserved'):
        issues.append('No ' + ('scheduled/manual ' if row['output']['status'] != 'not_configured' else '') + 'run observed for the latest due time')
    latest = execution.get('latest')
    refresh = execution.get('latest_collection', execution.get('latest_refresh'))
    if latest and latest.get('conclusion') in FAILED:
        issues.append('Latest workflow run ' + latest['conclusion'].replace('_', ' '))
    if output['status'] in ('stale', 'unavailable', 'invalid'):
        issues.append('Published check ' + output['status'])
    if any(x.get('error') for x in row.get('counts', [])):
        issues.append('A published record count could not be verified')
    failed_sources = [s['name'] for s in output.get('sources', []) if s['status'] != 'ok']
    if failed_sources:
        issues.append('Published capture reports source problems: ' + ', '.join(failed_sources))
    if output.get('source_status_error'):
        issues.append('Published source results could not be verified')
    if execution.get('collection_result') == 'failure' and refresh == latest and latest and latest.get('conclusion') not in FAILED:
        issues.append('Reviewed source collection steps failed, despite the workflow result')
    if refresh and refresh.get('conclusion') in FAILED and refresh != latest:
        if execution.get('latest_step_check', {}).get('status') == 'skipped':
            issues.append('Latest download attempt failed. Website successfully published using previously saved data; collection was skipped in that build')
        else:
            issues.append('Latest source refresh attempt failed; the later successful build does not confirm recovery')
    if issues:
        return 'attention', issues
    if latest and latest['status'] in ACTIVE:
        return 'running', ['Workflow is queued or running; output result is independent']
    if not latest or latest.get('conclusion') != 'success':
        return 'limited', ['A successful latest execution was not observed']
    if output['status'] == 'not_configured':
        return 'workflow_only', ['This registered check does not publish a dataset; inspect its run for check details']
    if execution.get('collection_unconfirmed') or execution.get('latest_step_check', {}).get('status') == 'unavailable':
        return 'limited', ['Source collection was skipped or its steps could not be verified; build success alone does not confirm a refresh']
    if output.get('run_alignment') == 'predates_success':
        return 'limited', ['Published evidence predates the successful scheduled/manual run']
    if not refresh:
        return 'limited', ['No scheduled/manual execution found in the latest 20 runs']
    return 'checked', ['Workflow and configured published checks are available']


def observe(target, tools, now, http, previous=None, fresh=False):
    repo, workflow = target['repo'], str(target['workflow'])
    row = {'repo': repo, 'workflow': workflow, 'titles': [t['title'] for t in tools],
           'tool_ids': [t['id'] for t in tools], 'observed_at': wd.stamp(now), 'execution': {}, 'counts': [],
           'workflow_url': f'https://github.com/{repo}/actions/workflows/{workflow}'}
    cadence = wd.cadence_minutes(target, now)
    due = wd.due_at(target, now, target.get('grace_minutes', min(cadence / 2, 120)))
    row['execution']['due_at'] = wd.stamp(due)
    prefix = f'/repos/{repo}/actions/workflows/{quote(workflow, safe="")}'
    try:
        metadata = http.request('GET', prefix)
        if not isinstance(metadata, dict) or not isinstance(metadata.get('state'), str):
            raise wd.SafeError('invalid_workflow_response')
        row['execution']['state'] = metadata['state']
        payload = http.request('GET', prefix + '/runs?' + urlencode({'branch': target['branch'], 'per_page': 20}))
        runs = payload.get('workflow_runs') if isinstance(payload, dict) else None
        if not isinstance(runs, list):
            raise wd.SafeError('invalid_workflow_runs_response')
        runs = sorted((r for r in runs if r.get('head_branch') == target['branch']),
                      key=lambda r: wd.timestamp(r['created_at']), reverse=True)
        row['execution']['latest'] = run_record(runs[0], repo) if runs else None
        refreshes = [r for r in runs if r.get('event') in wd.REFRESH_EVENTS]
        row['execution']['latest_refresh'] = run_record(refreshes[0], repo) if refreshes else None
        row['execution']['history_limit'] = 20
        # A data publisher may only build retained data on push. The six reviewed
        # workflow-only targets perform their checks on push too, so a recent
        # push execution is valid evidence that those checks actually ran.
        due_runs = refreshes if target.get('freshness') else runs
        row['execution']['due_unobserved'] = not any(wd.timestamp(r['created_at']) >= due for r in due_runs)
        latest = row['execution']['latest']
        names = target.get('collection_steps', [])
        if names:
            collection, collection_result = None, None
            latest_evidence = {'status': 'unavailable'}
            # A README/build push can follow a failed collector push. Inspect the
            # bounded run history, not just the latest run and latest dispatch.
            for index, source_run in enumerate(runs):
                candidate = run_record(source_run, repo)
                evidence = collection_check(http, repo, candidate, names)
                if index == 0:
                    latest_evidence = evidence
                if evidence['status'] in ('success', 'failure'):
                    collection, collection_result = candidate, evidence['status']
                    if evidence.get('started_at'):
                        row['execution']['collection_started_at'] = evidence['started_at']
                    break
            row['execution']['latest_step_check'] = latest_evidence
            row['execution']['latest_collection'] = collection
            row['execution']['collection_result'] = collection_result
            row['execution']['collection_unconfirmed'] = collection is None
            # A deployment-only retry reuses the earlier successful build. Its
            # new run start is neither a new collection nor a new due occurrence.
            observed_attempt = collection and wd.timestamp(row['execution'].get('collection_started_at') or collection['at']) >= due
            pending_refresh = any(r.get('event') in wd.REFRESH_EVENTS and r.get('status') in ACTIVE
                                  and wd.timestamp(r['created_at']) >= due for r in runs)
            row['execution']['due_unobserved'] = not (observed_attempt or pending_refresh)
        if latest and latest.get('conclusion') in FAILED:
            try:
                jobs = http.request('GET', f"/repos/{repo}/actions/runs/{latest['id']}/jobs?filter=latest&per_page=100")
                row['execution']['failed_steps'] = [str(step['name'])[:200] for job in jobs.get('jobs', [])
                    for step in (job.get('steps') or []) if step.get('conclusion')=='failure'][:10]
            except (wd.SafeError, KeyError, TypeError, ValueError):
                row['execution']['step_details_unavailable'] = True
    except wd.SafeError as error:
        row['execution']['error'] = error.kind
    except (ValueError, KeyError, TypeError):
        row['execution']['error'] = 'invalid_workflow_response'

    documents = PublicDocuments(http)
    probes = target.get('freshness', [])
    count_specs = [p for t in tools for p in t.get('data_info', {}).get('probes', []) if p.get('count_at')]
    marker = hashlib.sha256(json.dumps({'run': row['execution'].get('latest'),
        'counts': [{k: p.get(k) for k in ('url', 'label', 'count_at')} for p in count_specs]}, sort_keys=True).encode()).hexdigest()
    # Unresolved evidence must be re-read: a separate publication workflow or
    # a verified local import can repair it without changing this workflow's ID.
    reread = fresh or (previous or {}).get('status') in ('attention', 'limited')
    row['probe_cache'] = {} if reread else copy.deepcopy((previous or {}).get('probe_cache', {}))
    checks = wd.freshness_checks(target, documents, now, cadence, cache=row['probe_cache'], refresh_marker=marker, due=wd.stamp(due))
    for result, probe in zip(checks, probes):
        result.update(label=probe['label'], url=probe['url'], precision=probe.get('precision', 'timestamp'))
    states = {x['status'] for x in checks}
    status = ('not_configured' if not checks else 'invalid' if 'future_timestamp' in states
              else 'unavailable' if 'error' in states else 'stale' if 'stale' in states else 'recent')
    row['output'] = {'status': status, 'checks': checks}
    refresh = row['execution'].get('latest_collection', row['execution'].get('latest_refresh'))
    if refresh and refresh.get('conclusion') == 'success' and checks:
        collection_start = wd.timestamp(row['execution'].get('collection_started_at') or refresh['at'])
        precise = [c for c in checks if c['precision'] != 'date' and c.get('timestamp')]
        early = [(c, p) for c, p in zip(checks, probes) if c in precise and
                 wd.timestamp(c['timestamp']) < collection_start - dt.timedelta(minutes=5)]
        if early:
            permitted = all(isinstance(p.get('cache_max_age_seconds'), (int, float)) and
                            0 <= (collection_start - wd.timestamp(c['timestamp'])).total_seconds()
                            <= p['cache_max_age_seconds'] for c, p in early)
            row['output']['run_alignment'] = 'permitted_cache' if permitted else 'predates_success'
            if permitted:
                row['output']['cache_max_age_seconds'] = min(p['cache_max_age_seconds'] for c, p in early)
        elif any(c['precision'] == 'date' for c in checks):
            row['output']['run_alignment'] = 'date_only'
        else:
            row['output']['run_alignment'] = 'at_or_after_start'
    for probe in probes:
        if 'source_status_path' not in probe:
            continue
        try:
            document = documents.request('GET', probe['url'], public=True)
            statuses = wd.json_value(document, probe['source_status_path'])
            if not isinstance(statuses, dict) or not statuses or not all(isinstance(k, str) and isinstance(v, str) for k, v in statuses.items()):
                raise ValueError('Invalid source status map')
            row['output'].setdefault('sources', []).extend(
                {'name': name[:100], 'status': 'ok' if result == 'ok' else 'failed',
                 'detail': result[:300]} for name, result in sorted(statuses.items()))
        except (wd.SafeError, KeyError, IndexError, TypeError, ValueError):
            row['output']['source_status_error'] = True
    # Use only reviewed catalogue count definitions on the documents already read.
    # Do not download every dataset again, guess a minimum count, or infer freshness
    # from an observation year or a changed count.
    seen = set()
    for tool in tools:
        for probe in tool.get('data_info', {}).get('probes', []):
            url, spec = probe['url'], probe.get('count_at')
            if not spec:
                continue
            key = json.dumps([url, spec], sort_keys=True)
            if key in seen:
                continue
            seen.add(key)
            if url not in documents.documents:
                if any(c['url']==url and c.get('cached') for c in checks):
                    row['counts'].extend(copy.deepcopy(c) for c in (previous or {}).get('counts', [])
                        if c.get('definition')==key and not c.get('error'))
                continue
            count = {'label': probe['label'], 'unit': spec.get('unit', 'records'), 'url': url,
                     'definition': key, 'read_at': wd.stamp(now)}
            try:
                value = record_count(documents.documents[url], spec)
                if value is None:
                    raise ValueError('Invalid count')
                count['value'] = value
            except (ValueError, KeyError, TypeError):
                count['error'] = 'count_missing_or_invalid'
            row['counts'].append(count)
    for url, document in documents.documents.items():
        if isinstance(document, dict) and document.get('status') == 'awaiting_publication':
            row['output']['note'] = 'Official catalogue checked; next archive is awaiting publication'
    if checks and all(c.get('cached') for c in checks) and (previous or {}).get('output', {}).get('note'):
        row['output']['note'] = previous['output']['note']
    row['status'], row['reasons'] = classify(row)
    return row


def observation_signature(row):
    return {'status': row['status'], 'output': row['output']['status'],
            'latest_id': (row['execution'].get('latest') or {}).get('id'),
            'latest_attempt': (row['execution'].get('latest') or {}).get('attempt'),
            'latest_result': (row['execution'].get('latest') or {}).get('conclusion'),
            'refresh_id': (row['execution'].get('latest_refresh') or {}).get('id'),
            'refresh_attempt': (row['execution'].get('latest_refresh') or {}).get('attempt'),
            'refresh_result': (row['execution'].get('latest_refresh') or {}).get('conclusion'),
            'state': row['execution'].get('state'), 'error': row['execution'].get('error'),
            'due_unobserved': row['execution'].get('due_unobserved'),
            'run_alignment': row['output'].get('run_alignment'),
            'sources': row['output'].get('sources', []),
            'source_status_error': row['output'].get('source_status_error'),
            'collection_result': row['execution'].get('collection_result'),
            'counts': [{k: c[k] for k in ('label', 'value', 'error') if k in c} for c in row.get('counts', [])]}


def assemble(rows, now, previous=None, run_id=None):
    report = {'version': 1, 'checked_at': wd.stamp(now), 'expected_interval_seconds': 3600,
              'stale_after_seconds': 10800, 'rows': rows, 'changes': []}
    if run_id and re.fullmatch(r'[1-9][0-9]*', run_id):
        report['run_url'] = f'https://github.com/jsdyer/jsdyer.github.io/actions/runs/{run_id}'
    report['summary'] = {s: sum(r['status'] == s for r in rows) for s in ('attention', 'running', 'limited', 'workflow_only', 'checked')}
    old = {(r['repo'], r['workflow']): r for r in (previous or {}).get('rows', [])}
    for row in rows:
        before = old.get((row['repo'], row['workflow']))
        if before and observation_signature(before) != observation_signature(row):
            report['changes'].append({'repo': row['repo'], 'workflow': row['workflow'],
                                      'before': observation_signature(before), 'after': observation_signature(row)})
    entry = {k: report[k] for k in ('checked_at', 'summary', 'changes')}
    if 'run_url' in report:
        entry['run_url'] = report['run_url']
    report['history'] = [entry, *[h for h in (previous or {}).get('history', []) if h.get('checked_at') != entry['checked_at']]][:24]
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--previous', type=Path)
    parser.add_argument('--fresh', action='store_true', help='Read published metadata again instead of using the saved probe cache')
    args = parser.parse_args()
    config = json.loads((ROOT / 'services/refresh-watchdog/targets.json').read_text())
    wd.validate_config(config)
    tools = json.loads((ROOT / 'data/tools.json').read_text())
    previous = json.loads(args.previous.read_text()) if args.previous and args.previous.exists() else None
    old = {(r['repo'], r['workflow']): r for r in (previous or {}).get('rows', [])}
    def check(target):
        matched = [t for t in tools if t['source'].rstrip('/') == 'https://github.com/' + target['repo']]
        result = observe(target, matched, dt.datetime.now(wd.UTC), wd.HTTP(os.environ.get('GH_TOKEN'), timeout=15), old.get((target['repo'], str(target['workflow']))), fresh=args.fresh)
        print(target['repo'], target['workflow'], result['status'], flush=True)
        return result
    with ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(check, config['targets']))
    report = assemble(rows, dt.datetime.now(wd.UTC), previous, os.environ.get('GITHUB_RUN_ID'))
    report['read_mode'] = 'fresh' if args.fresh else 'cached_where_unchanged'
    wd.atomic_json(args.output, report)
    print(json.dumps(report['summary']))
    # Observed failures belong in the report; failure to produce/save the report
    # fails this monitoring job. The existing watchdog owns recovery and alerts.


if __name__ == '__main__':
    main()
