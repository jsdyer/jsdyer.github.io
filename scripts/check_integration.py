#!/usr/bin/env python3
"""Offline release checks for catalogue, repository audit, Worker, watchdog and sitemap."""
import argparse
import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree
from audit_repositories import audit
from sync_operations import sync

ROOT = Path(__file__).resolve().parents[1]


def check_built(root, tools):
    locations = {node.text for node in ElementTree.parse(root / 'dist/sitemap.xml').iter()
                 if node.tag.endswith('}loc')}
    required = {'https://coolcode.ca' + t['url'] for t in tools
                if t['access'] == 'browser' and t['hosting'] in {'local', 'project'}}
    if not required <= locations:
        raise ValueError('Built sitemap is missing public tool routes: ' + ', '.join(sorted(required-locations)))
    published = json.loads((root / 'dist/assets/tool-catalog.json').read_text())
    fields = ('id', 'title', 'access', 'source')
    expected = [{k: t[k] for k in fields} for t in tools]
    if [{k: t.get(k) for k in fields} for t in published] != expected:
        raise ValueError('Built search/report catalogue differs from data/tools.json')


def verify_source_receipt(source, receipt):
    # The dashboard editor can omit the final LF when code is pasted manually.
    # Permit only this explicitly verified byte transformation, never other drift.
    transform = receipt.get('source_transform')
    if transform == 'remove-final-newline':
        source = source.removesuffix(b'\n')
    elif transform is not None:
        raise ValueError('Unknown Worker receipt source transformation')
    if receipt.get('source_sha256') != hashlib.sha256(source).hexdigest():
        raise ValueError('Visitor Worker changed without a matching verified deployment receipt')


def check(root=ROOT, built=False, deployment=False):
    tools = json.loads((root / 'data/tools.json').read_text())
    snapshot = json.loads((root / 'data/repository-audit.json').read_text())
    exclusions = json.loads((root / 'data/repository-audit-exclusions.json').read_text())
    expected = audit([{'name': n} for n in snapshot['public_repository_names']], tools, exclusions,
                     checked_at=snapshot['checked_at'])
    fields = ['catalogue_tools', 'public_repositories', 'listed_source_repositories', 'needs_review',
              'excluded', 'stale_exclusions', 'catalogue_sources_missing_from_inventory']
    if any(snapshot.get(k) != expected[k] for k in fields):
        raise ValueError('Repository audit is out of date; rerun scripts/audit_repositories.py with a complete inventory')
    if any(expected[k] for k in ('needs_review', 'stale_exclusions', 'catalogue_sources_missing_from_inventory')):
        raise ValueError('Repository audit has unaccounted repositories or stale exclusions')
    sync(root, check=True)
    if deployment:
        receipt = json.loads((root / 'data/operations/cloudflare-deployment.json').read_text())
        verify_source_receipt((root / 'services/cloudflare-visitor/worker.js').read_bytes(), receipt)
    if built:
        check_built(root, tools)
    return len(tools)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--built', action='store_true')
    parser.add_argument('--deployment', action='store_true', help='Require a matching verified Cloudflare deployment receipt')
    args = parser.parse_args()
    try:
        print(f'{check(built=args.built, deployment=args.deployment)} catalogue entries pass integration checks.')
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f'Integration incomplete: {exc}\n')
