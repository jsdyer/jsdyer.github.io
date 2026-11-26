#!/usr/bin/env python3
"""Offline release checks for catalogue, repository audit, Worker, watchdog and sitemap."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from xml.etree import ElementTree
from audit_repositories import audit
from sync_operations import sync
from measurement import unlisted_tools

ROOT = Path(__file__).resolve().parents[1]


def check_built(root, tools):
    ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
    index = ElementTree.parse(root / 'dist/sitemap.xml').getroot()
    children = [node.text for node in index.findall(f'{ns}sitemap/{ns}loc')]
    expected_children = {'https://coolcode.ca/sitemap-pages.xml'} | {
        'https://coolcode.ca' + t['url'] + 'sitemap.xml' for t in tools if t.get('result_directory')}
    if index.tag != ns + 'sitemapindex' or sorted(children) != sorted(expected_children):
        raise ValueError('Built sitemap index differs from the registered result publishers')
    locations = {node.text for node in ElementTree.parse(root / 'dist/sitemap-pages.xml').findall(f'{ns}url/{ns}loc')}
    required = {'https://coolcode.ca' + t['url'] for t in tools
                if t['access'] == 'browser' and t['hosting'] in {'local', 'project'}}
    required.update('https://coolcode.ca' + t['url'] + case['path'] for t in tools for case in t.get('use_cases', []))
    if not required <= locations:
        raise ValueError('Built sitemap is missing public tool routes: ' + ', '.join(sorted(required-locations)))
    published = json.loads((root / 'dist/assets/tool-catalog.json').read_text())
    fields = ('id', 'title', 'access', 'source')
    expected = [{k: t[k] for k in fields} for t in tools]
    if [{k: t.get(k) for k in fields} for t in published] != expected:
        raise ValueError('Built search/report catalogue differs from data/tools.json')
    unlisted = unlisted_tools(root, tools)
    if unlisted:
        hidden_routes = {'https://coolcode.ca/' + t['id'] + '/' for t in unlisted}
        if any(url.startswith(prefix) for prefix in hidden_routes for url in locations):
            raise ValueError('Unlisted measurement tools leaked into the public sitemap')
        admin_tools = json.loads((root / 'dist/admin/measurement-tools.json').read_text())
        if admin_tools != unlisted:
            raise ValueError('Admin measurement names differ from the unlisted registry')


def tool_list_ids(literal):
    """Parse only quoted catalogue IDs, ASCII whitespace and // comments; never JS."""
    if not isinstance(literal, str) or len(literal) > 65_536 or not literal.isascii():
        raise ValueError('Worker tool list must be a bounded ASCII array literal')
    position, ids = 0, []

    def skip():
        nonlocal position
        while position < len(literal):
            if literal[position] in ' \t\r\n':
                position += 1
            elif literal.startswith('//', position):
                end = re.search(r'[\r\n]', literal[position:])
                position = position + end.start() if end else len(literal)
            else:
                break

    if not literal.startswith('['):
        raise ValueError('Worker tool list must be an array literal')
    position = 1
    skip()
    while position < len(literal) and literal[position] != ']':
        match = re.match(r'"([a-z0-9][a-z0-9_-]*)"', literal[position:])
        if not match:
            raise ValueError('Worker tool list contains unsupported tokens')
        ids.append(match.group(1))
        position += match.end()
        skip()
        if position < len(literal) and literal[position] == ',':
            position += 1
            skip()
        elif position >= len(literal) or literal[position] != ']':
            raise ValueError('Worker tool list needs comma-separated IDs')
    if position != len(literal) - 1 or literal[position:] != ']':
        raise ValueError('Worker tool list contains trailing or incomplete tokens')
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('Worker tool list must contain unique, nonempty IDs')
    return set(ids)


def tool_list_span(source):
    matches = list(re.finditer(rb'(?m)^const toolList = (\[[\s\S]*?\]);', source))
    if len(matches) != 1:
        raise ValueError('Expected exactly one Worker toolList declaration')
    match = matches[0]
    literal = match.group(1).decode('ascii')
    tool_list_ids(literal)
    return match.span(1), literal


def receipt_source(source, receipt):
    """Reconstruct audited deployed bytes without relaxing checks outside toolList."""
    transform = receipt.get('source_transform')
    if transform == 'remove-final-newline':
        source = source.removesuffix(b'\n')
    elif transform == 'recorded-tool-list':
        (start, end), canonical = tool_list_span(source)
        deployed = receipt.get('tool_list_literal')
        if tool_list_ids(canonical) != tool_list_ids(deployed):
            raise ValueError('Recorded Worker tool IDs differ from the catalogue')
        remove_lf = receipt.get('remove_final_newline')
        if not isinstance(remove_lf, bool):
            raise ValueError('Recorded Worker final-newline handling must be explicit')
        source = source[:start] + deployed.encode('ascii') + source[end:]
        if remove_lf:
            if not source.endswith(b'\n'):
                raise ValueError('Generated Worker has no final newline to remove')
            source = source[:-1]
    elif transform is not None:
        raise ValueError('Unknown Worker receipt source transformation')
    return source


def verify_source_receipt(source, receipt):
    source = receipt_source(source, receipt)
    if receipt.get('source_sha256') != hashlib.sha256(source).hexdigest():
        raise ValueError('Visitor Worker changed without a matching verified deployment receipt')


def manual_source_receipt(source, downloaded):
    """Create receipt fields only after checking the actual downloaded module."""
    receipt = {'source_sha256': hashlib.sha256(downloaded).hexdigest()}
    if source == downloaded:
        return receipt
    if source.endswith(b'\n') and source[:-1] == downloaded:
        receipt['source_transform'] = 'remove-final-newline'
        return receipt
    _, literal = tool_list_span(downloaded)
    receipt.update(source_transform='recorded-tool-list', tool_list_literal=literal,
                   remove_final_newline=source.endswith(b'\n') and not downloaded.endswith(b'\n'))
    verify_source_receipt(source, receipt)
    return receipt


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
