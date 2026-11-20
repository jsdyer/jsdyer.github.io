#!/usr/bin/env python3
"""Refresh catalogue dates from published app metadata. Requires only the standard library."""

import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone
from email.utils import parsedate_to_datetime
from http.client import HTTPException
from html import escape
import json
import os
from pathlib import Path
import re
import sys
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.parse import unquote, urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request
from xml.etree import ElementTree


CATALOGUE = Path(__file__).resolve().parents[1] / 'data' / 'tools.json'
MAX_BYTES = 24 * 1024 * 1024
MAX_WORKERS = 4
TIMEOUT = 25


def check_url(url):
    """Only fetch the public CoolCode site and public jsdyer raw repository files."""
    parts = urlsplit(url)
    path = unquote(parts.path)
    if (parts.scheme != 'https' or parts.netloc not in ('coolcode.ca', 'raw.githubusercontent.com')
            or parts.query or parts.fragment or not path.startswith('/')
            or any(segment in ('.', '..') for segment in path.split('/'))
            or '\\' in path or any(ord(c) < 32 for c in url + path)):
        raise ValueError(f'Unsupported data source: {url!r}')
    if parts.netloc == 'raw.githubusercontent.com' and not re.fullmatch(
            r'/jsdyer/[A-Za-z0-9_.-]+/[^/]+/.+', path):
        raise ValueError(f'Expected a raw file in a jsdyer repository: {url!r}')


class AllowedRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def badge_metadata(payload):
    """Read only the accessible retrieval title from a first-party date image."""
    try:
        svg = ElementTree.fromstring(payload)
    except ElementTree.ParseError as exc:
        raise ValueError('Invalid date badge XML') from exc
    namespace = '{http://www.w3.org/2000/svg}'
    titles = svg.findall(namespace + 'title')
    if svg.tag != namespace + 'svg' or len(titles) != 1:
        raise ValueError('Expected one SVG retrieval title')
    match = re.fullmatch(r'Data retrieved\s+(?:·\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})',
                         (titles[0].text or '').strip())
    if not match:
        raise ValueError('Unrecognized date badge title')
    return {'retrieved': date.fromisoformat(match[1]).isoformat()}


def fetch_metadata(url):
    check_url(url)
    is_badge = urlsplit(url).path.endswith('/data-date.svg')
    limit = 8192 if is_badge else MAX_BYTES
    media_type = 'image/svg+xml' if is_badge else 'application/json'
    request = Request(url, headers={'Accept': media_type, 'User-Agent': 'CoolCode catalogue dates/1.0'})
    with build_opener(AllowedRedirects()).open(request, timeout=TIMEOUT) as response:
        payload = response.read(limit + 1)
    if len(payload) > limit:
        raise ValueError(f'Metadata exceeds the {limit:,}-byte limit')
    return badge_metadata(payload) if is_badge else json.loads(payload)


def select(document, path):
    if not isinstance(path, list) or not path:
        raise ValueError('Expected a nonempty JSON path')
    value = document
    for part in path:
        if isinstance(part, str) and isinstance(value, dict) and part in value:
            value = value[part]
        elif type(part) is int and isinstance(value, list) and -len(value) <= part < len(value):
            value = value[part]
        elif isinstance(part, dict) and len(part) == 1 and isinstance(value, list):
            field, wanted = next(iter(part.items()))
            matches = [row for row in value if isinstance(row, dict)
                       and field in row and row[field] == wanted]
            if len(matches) != 1:
                raise ValueError(f'Selector {part!r} matched {len(matches)} records')
            value = matches[0]
        else:
            raise ValueError(f'Missing or invalid component {part!r} in path {path!r}')
    return value


def source_date(value):
    """Keep the source calendar date and its precision; never synthesize a missing date."""
    if type(value) is int:
        value = str(value)
    if not isinstance(value, str) or len(value) > 80:
        raise ValueError('Expected a publisher date or timestamp')
    value = value.strip()
    if re.fullmatch(r'[0-9]{4}(-[0-9]{2})?', value):
        parts = value.split('-')
        date(int(parts[0]), int(parts[1]) if len(parts) > 1 else 1, 1)
        return value
    if re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', value):
        return date.fromisoformat(value).isoformat()
    if re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt ][0-9].+', value):
        return datetime.fromisoformat(value.replace('Z', '+00:00')).date().isoformat()
    if re.fullmatch(r'[A-Za-z]{3}, [0-9]{1,2} [A-Za-z]{3} [0-9]{4} [0-9:]{8} (GMT|UTC|[+-][0-9]{4})', value):
        return parsedate_to_datetime(value).date().isoformat()
    for pattern in ('%B %d, %Y', '%b %d, %Y', '%d %B %Y', '%d %b %Y', '%B %Y', '%b %Y'):
        try:
            result = datetime.strptime(value, pattern)
        except ValueError:
            continue
        return result.date().isoformat() if '%d' in pattern else result.strftime('%Y-%m')
    raise ValueError(f'Unrecognized publisher date {value!r}')


def probe_date(probe, document):
    raw = select(document, probe['path'])
    if raw is None and probe.get('allow_unknown'):
        return None
    start = source_date(raw)
    if 'end_path' in probe:
        end = source_date(select(document, probe['end_path']))
        if len(start) != len(end) or end < start:
            raise ValueError(f'Inconsistent coverage dates: {start} to {end}')
        return start if start == end else f'{start}–{end}'
    if probe.get('precision') == 'minute' and isinstance(raw, str) and len(raw) > 10:
        timestamp = datetime.fromisoformat(raw.replace('Z', '+00:00'))
        if timestamp.tzinfo is None:
            raise ValueError('Minute precision requires a timezone in the source')
        return timestamp.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    return start


def record_count(document, spec):
    values = select(document, spec['path']) if spec['path'] else document
    measure = spec.get('measure')
    if measure == 'length' and isinstance(values, (list, dict)):
        return len(values)
    if measure == 'sum' and isinstance(values, (list, dict)):
        rows = values.values() if isinstance(values, dict) else values
        counts = [row.get(spec['field']) if isinstance(row, dict) else None for row in rows]
        if all(type(n) is int and n >= 0 for n in counts):
            return sum(counts)
    if measure is None and type(values) is int and values >= 0:
        return values
    return None


def update_probe(probe, document):
    value = probe_date(probe, document)
    condition = probe.get('notice_if')
    notice = None
    if condition:
        try:
            flag = select(document, condition['path'])
        except ValueError:
            # Some tools only add a fallback flag when a bundled snapshot is used.
            flag = None
        if flag == condition['equals']:
            notice = condition['text']
    probe['value'] = value
    probe.pop('unavailable', None)
    probe.pop('count', None)
    if 'count_at' in probe:
        try:
            count = record_count(document, probe['count_at'])
        except (KeyError, TypeError, ValueError):
            count = None
        if count is not None:
            probe['count'] = count
    if notice:
        probe['notice'] = notice
    else:
        probe.pop('notice', None)


def refresh(tools, fetch=fetch_metadata, problems=None):
    """Fetch each distinct URL once. Return per-probe warnings; failures retain prior dates."""
    grouped = defaultdict(list)
    for tool in tools:
        for index, probe in enumerate(tool.get('data_info', {}).get('probes', [])):
            grouped[probe['url']].append((tool['id'], index, probe))

    warnings = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        jobs = {pool.submit(fetch, url): url for url in grouped}
        for job in as_completed(jobs):
            url = jobs.pop(job)
            problem = None
            try:
                document = job.result()
            except (HTTPException, OSError, ValueError, RecursionError) as exc:
                problem = str(exc)
                if isinstance(exc, HTTPError):
                    reason = f'Source returned HTTP {exc.code}'
                elif isinstance(exc, (OSError, HTTPException)):
                    reason = 'Source request failed'
                else:
                    reason = 'Invalid source response'
            for tool_id, index, probe in grouped[url]:
                error = problem
                if error is None:
                    try:
                        update_probe(probe, document)
                    except (KeyError, TypeError, ValueError, OverflowError) as exc:
                        error = str(exc)
                if error is not None:
                    probe['unavailable'] = True
                    if problems is not None:
                        problems[tool_id, index] = reason if problem is not None else 'Published field could not be read'
                    warnings.append(f"{tool_id} — {probe['label']} ({url}): {error}")
    return sorted(warnings)


def probe_states(tools):
    return {(tool['id'], index): (probe['label'], probe.get('value'), probe.get('count'),
                                  probe.get('notice'), bool(probe.get('unavailable')))
            for tool in tools for index, probe in enumerate(tool.get('data_info', {}).get('probes', []))}


def observation(before, after, problems):
    counts = dict.fromkeys(('changed', 'recovered', 'unchanged', 'unavailable'), 0)
    details = []
    checked_by_tool = defaultdict(int)
    for key, current in sorted(after.items()):
        checked_by_tool[key[0]] += 1
        previous = before[key]
        if current[4]:
            status = 'unavailable'
        elif previous[4]:
            status = 'recovered'
        elif previous != current:
            status = 'changed'
        else:
            status = 'unchanged'
        counts[status] += 1
        if status == 'unchanged':
            continue
        fields = {name: [old, new]
                  for name, old, new in zip(('date', 'count', 'notice'), previous[1:4], current[1:4])
                  if old != new}
        detail = {'tool': key[0], 'label': current[0], 'status': status, 'fields': fields}
        if key in problems:
            detail['reason'] = problems[key]
        details.append(detail)
    return {'counts': counts, 'details': details, 'checked_by_tool': dict(checked_by_tool)}


def check_summary(before, after, warnings):
    report = observation(before, after, {})
    counts = report['counts']
    changed = []
    for detail in report['details']:
        if detail['status'] == 'unavailable':
            continue
        fields = [f"{name} {old if old is not None else '—'} → {new if new is not None else '—'}"
                  for name, (old, new) in detail['fields'].items()]
        if detail['status'] == 'recovered':
            fields.append('check recovered')
        changed.append(f"{detail['tool']} · {detail['label']} · {', '.join(fields)}")
    lines = ['## Published metadata checks', '',
             f"{len(changed)} changed or recovered · {counts['unchanged']} unchanged · {counts['unavailable']} unavailable", '']
    for title, rows in [('Changes', changed), ('Unavailable checks', warnings)]:
        if rows:
            lines.extend([f'### {title}', '<pre>', *(escape(row[:800]) for row in rows), '</pre>', ''])
    return '\n'.join(lines) + '\n'


def update_catalogue(path, journal_entry=None):
    original = path.read_bytes()
    tools = json.loads(original)
    before = probe_states(tools)
    problems = {}
    warnings = refresh(tools, problems=problems)
    after = probe_states(tools)
    revised = (json.dumps(tools, ensure_ascii=False, indent=2) + '\n').encode()
    if path.read_bytes() != original:
        raise ValueError('The catalogue changed during retrieval. Retry using the new version.')
    if original != revised:
        with TemporaryDirectory(dir=path.parent, prefix='.catalogue-dates-') as folder:
            temporary = Path(folder) / path.name
            temporary.write_bytes(revised)
            temporary.chmod(path.stat().st_mode & 0o777)
            temporary.replace(path)
    if summary := os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(summary, 'a', encoding='utf-8') as output:
            output.write(check_summary(before, after, warnings))
    if journal_entry is not None:
        entry = observation(before, after, problems)
        entry.update(run_id=str(int(os.environ['GITHUB_RUN_ID'])), attempt=int(os.environ['GITHUB_RUN_ATTEMPT']),
                     checked_at=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'))
        journal_entry.write_text(json.dumps(entry, ensure_ascii=False) + '\n', encoding='utf-8')
    return warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', type=Path, default=CATALOGUE)
    parser.add_argument('--journal-entry', type=Path, help='Write metadata observations for the current GitHub run attempt')
    parser.add_argument('--strict', action='store_true', help='Exit nonzero after writing partial results if a probe failed')
    args = parser.parse_args()
    try:
        warnings = update_catalogue(args.catalogue, args.journal_entry)
    except (OSError, KeyError, TypeError, ValueError) as exc:
        parser.exit(1, f'Could not update catalogue: {exc}\n')
    for warning in warnings:
        print(f'Warning: {warning}', file=sys.stderr)
    print(f'Catalogue dates checked; {len(warnings)} unavailable.')
    return int(args.strict and bool(warnings))


if __name__ == '__main__':
    sys.exit(main())
