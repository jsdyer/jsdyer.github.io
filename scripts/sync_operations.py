#!/usr/bin/env python3
"""Keep catalogue-dependent operations in sync. Offline by default; --refresh audits GitHub."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from measurement import measurement_ids

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = 'data/operations/repositories.json'
OVERRIDES = 'data/operations/freshness.json'
GUARD = '.github/workflows/schedule-guard.yml'
HUB = 'jsdyer/jsdyer.github.io'
WORKER = 'services/cloudflare-visitor/worker.js'
TARGETS = 'services/refresh-watchdog/targets.json'


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def source_repositories(tools):
    repos = set()
    for tool in tools:
        source = urlsplit(tool['source'])
        parts = source.path.strip('/').split('/')
        if source.netloc == 'github.com' and len(parts) >= 2 and parts[0] == 'jsdyer':
            repos.add('/'.join(parts[:2]))
    return repos


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_api(path):
    if not path.startswith('/repos/jsdyer/'):
        raise ValueError('Only owned catalogue repositories may be inspected')
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'CoolCode operations audit'}
    if os.environ.get('GH_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GH_TOKEN']
    request = Request('https://api.github.com' + path, headers=headers)
    with build_opener(NoRedirect()).open(request, timeout=30) as response:
        body = response.read(8_000_001)
    if len(body) > 8_000_000:
        raise ValueError('Workflow API response too large')
    return json.loads(body)


def parse_repository(repo, branch, files):
    # YAML is needed only for the network/checkout refresh, never the homepage build.
    import yaml
    workflows, guarded = [], []
    for path, content in sorted(files.items()):
        document = yaml.load(content, Loader=yaml.BaseLoader) or {}
        if path == GUARD:
            for job in document.get('jobs', {}).values():
                raw = job.get('env', {}).get('GUARDED_PATHS')
                if raw:
                    guarded = json.loads(raw)
            continue
        triggers = document.get('on', {})
        if not isinstance(triggers, dict) or not triggers.get('schedule'):
            continue
        if 'workflow_dispatch' not in triggers:
            raise ValueError(f'{repo}/{path}: scheduled workflow lacks workflow_dispatch')
        inputs = {}
        for name, spec in (triggers.get('workflow_dispatch') or {}).get('inputs', {}).items():
            if name in {'refresh', 'refresh_data'} and spec.get('type') == 'boolean':
                inputs[name] = 'true'
            elif 'default' in spec:
                inputs[name] = str(spec['default'])
            elif spec.get('required') == 'true':
                raise ValueError(f'{repo}/{path}: required input {name} needs a reviewed default')
        for job in document.get('jobs', {}).values():
            conditions = [job.get('if', '')] + [s.get('if', '') for s in job.get('steps', [])]
            for condition in conditions:
                if ('schedule' in condition and 'workflow_dispatch' not in condition
                        and 'inputs.' not in condition and 'event_name !=' not in condition):
                    raise ValueError(f'{repo}/{path}: review schedule-only condition before dispatching')
        crons = [s['cron'] for s in triggers['schedule']]
        if not crons or any(len(c.split()) != 5 for c in crons):
            raise ValueError(f'{repo}/{path}: invalid UTC schedule')
        workflows.append({'workflow': Path(path).name, 'crons': crons, 'inputs': inputs})
    return {'repo': repo, 'branch': branch, 'workflows': workflows, 'guarded_paths': sorted(guarded)}


def refresh_registry(tools, previous, fetch=read_api, root=ROOT):
    """All-or-nothing source refresh; explicit empty schedules account for static tools."""
    from concurrent.futures import ThreadPoolExecutor
    def inspect(repo):
        if repo == HUB:
            files = {p.relative_to(root).as_posix(): p.read_text()
                     for p in (root / '.github/workflows').glob('*') if p.suffix in {'.yml', '.yaml'}}
            return parse_repository(repo, 'main', files)
        metadata = fetch('/repos/' + repo)
        if metadata.get('full_name') != repo:
            raise ValueError(f'{repo}: source repository was renamed; reconcile catalogue identity first')
        if metadata.get('private'):
            raise ValueError(f'{repo}: public catalogue source unexpectedly private')
        branch = metadata['default_branch']
        try:
            listing = fetch('/repos/' + repo + '/contents/.github/workflows?ref=' + quote(branch, safe=''))
        except HTTPError as error:
            if error.code == 404:
                return parse_repository(repo, branch, {})
            raise
        if not isinstance(listing, list):
            raise ValueError(f'{repo}: incomplete workflow directory')
        files = {}
        for item in listing:
            if item.get('type') != 'file' or Path(item['path']).suffix not in {'.yml', '.yaml'}:
                continue
            blob = fetch('/repos/' + repo + '/git/blobs/' + item['sha'])
            if blob.get('encoding') != 'base64':
                raise ValueError(f'{repo}: unexpected workflow encoding')
            content = base64.b64decode(blob['content'], validate=False)
            actual = hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()
            if actual != item['sha']:
                raise ValueError(f'{repo}: workflow blob did not match the listed revision')
            files[item['path']] = content.decode()
        return parse_repository(repo, branch, files)
    with ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(inspect, sorted(source_repositories(tools))))


def outputs(root, tools, registry, overrides):
    wanted = source_repositories(tools)
    recorded = [r['repo'] for r in registry]
    if len(recorded) != len(set(recorded)) or set(recorded) != wanted:
        raise ValueError('Repository coverage differs from catalogue; run sync_operations.py --refresh. '
                         f'Missing: {sorted(wanted-set(recorded))}; extra: {sorted(set(recorded)-wanted)}')
    targets, workflow_keys = [], set()
    for repo in sorted(registry, key=lambda r: r['repo']):
        expected_guard = {GUARD} | {'.github/workflows/' + w['workflow'] for w in repo['workflows']}
        if (repo['workflows'] or repo['guarded_paths']) and set(repo['guarded_paths']) != expected_guard:
            raise ValueError(f"{repo['repo']}: schedule guard allowlist differs from scheduled workflows")
        for workflow in sorted(repo['workflows'], key=lambda w: w['workflow']):
            key = repo['repo'] + '/' + workflow['workflow']
            if key in workflow_keys:
                raise ValueError('Duplicate workflow: ' + key)
            workflow_keys.add(key)
            target = {'repo': repo['repo'], 'branch': repo['branch'], **workflow}
            if key in overrides:
                if set(overrides[key]) - {'freshness', 'grace_minutes', 'cooldown_minutes', 'max_run_minutes', 'collection_steps'}:
                    raise ValueError('Unsupported operations override: ' + key)
                steps = overrides[key].get('collection_steps', [])
                if not isinstance(steps, list) or len(steps) > 10 or not all(isinstance(n, str) and 0 < len(n) <= 200 for n in steps) or len(set(steps)) != len(steps):
                    raise ValueError('Invalid reviewed collection step names: ' + key)
                target.update(overrides[key])
            targets.append(target)
    stale = set(overrides) - workflow_keys
    if stale:
        raise ValueError('Orphaned freshness/dispatch overrides: ' + ', '.join(sorted(stale)))
    ids = measurement_ids(root, tools)
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate catalogue tool ID')
    template = (root / 'services/cloudflare-visitor/worker.template.js').read_text()
    if template.count('/* CATALOGUE_TOOL_IDS */') != 1:
        raise ValueError('Worker template must have exactly one tool-list marker')
    if template.count('/* PUBLIC_API_GATEWAY */') != 1:
        raise ValueError('Worker template must have exactly one public API marker')
    gateway_modules = ('gateway.js', 'halifax-gateway.js', 'inspection-gateway.js', 'parcel-corporate-gateway.js', 'screenplaces-gateway.js', 'planehere-gateway.js', 'second-batch-gateway.js')
    gateway_source = '\n\n'.join((root / 'services/cloudflare-visitor' / name).read_text() for name in gateway_modules)
    template = template.replace('/* PUBLIC_API_GATEWAY */', gateway_source)
    worker = '// Generated by scripts/sync_operations.py; edit worker.template.js, data/tools.json and data/unlisted-tools.json.\n' + template.replace('/* CATALOGUE_TOOL_IDS */', json.dumps(ids, indent=2))
    return {
        WORKER: worker,
        TARGETS: encoded({'version': 1, 'description': 'Generated from the CoolCode catalogue and audited workflow registry; do not edit.',
                          'max_dispatches_per_pass': 10, 'targets': targets}),
        'services/refresh-watchdog/repositories.txt': '\n'.join(sorted({t['repo'] for t in targets})) + '\n',
    }


def sync(root=ROOT, check=False, refresh=False):
    tools = json.loads((root / 'data/tools.json').read_text())
    registry = json.loads((root / REGISTRY).read_text())
    if refresh:
        registry = refresh_registry(tools, registry, root=root)
    overrides = json.loads((root / OVERRIDES).read_text())
    generated = outputs(root, tools, registry, overrides)
    generated[REGISTRY] = encoded(registry)
    differences = [name for name, content in generated.items()
                   if not (root / name).exists() or (root / name).read_text() != content]
    if check:
        if differences:
            raise ValueError('Out-of-date operations files: ' + ', '.join(differences))
    else:
        for name, content in generated.items():
            (root / name).parent.mkdir(parents=True, exist_ok=True)
            (root / name).write_text(content)
    return len(registry), len(json.loads(generated[TARGETS])['targets'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--refresh', action='store_true', help='Inspect all current catalogue workflow files; requires maintenance requirements')
    args = parser.parse_args()
    try:
        repos, workflows = sync(check=args.check, refresh=args.refresh)
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f'Operations incomplete: {exc}\n')
    print(f'{repos} source repositories accounted for; {workflows} scheduled workflows registered.')


if __name__ == '__main__':
    main()
