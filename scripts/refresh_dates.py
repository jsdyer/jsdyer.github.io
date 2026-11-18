#!/usr/bin/env python3
"""Refresh catalogue dates from published app metadata. Requires only the standard library."""

import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime
from email.utils import parsedate_to_datetime
from http.client import HTTPException
import json
from pathlib import Path
import re
import sys
from tempfile import TemporaryDirectory
from urllib.parse import unquote, urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request


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


def fetch_json(url):
    check_url(url)
    request = Request(url, headers={'Accept': 'application/json', 'User-Agent': 'CoolCode catalogue dates/1.0'})
    with build_opener(AllowedRedirects()).open(request, timeout=TIMEOUT) as response:
        payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError(f'JSON exceeds the {MAX_BYTES // 1024**2} MiB limit')
    return json.loads(payload)


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


def update_probe(probe, document):
    value = source_date(select(document, probe['path']))
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
            count = select(document, probe['count_at']['path'])
        except (KeyError, TypeError, ValueError):
            count = None
        if type(count) is int and count >= 0:
            probe['count'] = count
    if notice:
        probe['notice'] = notice
    else:
        probe.pop('notice', None)


def refresh(tools, fetch=fetch_json):
    """Fetch each distinct URL once. Return per-probe warnings; failures retain prior dates."""
    grouped = defaultdict(list)
    for tool in tools:
        for probe in tool.get('data_info', {}).get('probes', []):
            grouped[probe['url']].append((tool['id'], probe))

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
            for tool_id, probe in grouped[url]:
                error = problem
                if error is None:
                    try:
                        update_probe(probe, document)
                    except (KeyError, TypeError, ValueError, OverflowError) as exc:
                        error = str(exc)
                if error is not None:
                    probe['unavailable'] = True
                    warnings.append(f"{tool_id} — {probe['label']} ({url}): {error}")
    return sorted(warnings)


def update_catalogue(path):
    original = path.read_bytes()
    tools = json.loads(original)
    warnings = refresh(tools)
    revised = (json.dumps(tools, ensure_ascii=False, indent=2) + '\n').encode()
    if path.read_bytes() != original:
        raise ValueError('The catalogue changed during retrieval. Retry using the new version.')
    if original != revised:
        with TemporaryDirectory(dir=path.parent, prefix='.catalogue-dates-') as folder:
            temporary = Path(folder) / path.name
            temporary.write_bytes(revised)
            temporary.chmod(path.stat().st_mode & 0o777)
            temporary.replace(path)
    return warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', type=Path, default=CATALOGUE)
    parser.add_argument('--strict', action='store_true', help='Exit nonzero after writing partial results if a probe failed')
    args = parser.parse_args()
    try:
        warnings = update_catalogue(args.catalogue)
    except (OSError, KeyError, TypeError, ValueError) as exc:
        parser.exit(1, f'Could not update catalogue: {exc}\n')
    for warning in warnings:
        print(f'Warning: {warning}', file=sys.stderr)
    print(f'Catalogue dates checked; {len(warnings)} unavailable.')
    return int(args.strict and bool(warnings))


if __name__ == '__main__':
    sys.exit(main())
