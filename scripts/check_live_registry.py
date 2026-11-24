#!/usr/bin/env python3
"""Read-only verification of the deployed visitor Worker's accepted catalogue IDs."""
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def main():
    wanted = sorted(t['id'] for t in json.loads((ROOT / 'data/tools.json').read_text()))
    request = Request('https://coolcode-visitor-api.jeffdyer.workers.dev/registry',
                      headers={'User-Agent': 'CoolCode registry audit'})
    with urlopen(request, timeout=20) as response:
        result = json.load(response)
    actual = result.get('tool_ids')
    if not isinstance(actual, list) or actual != wanted:
        raise SystemExit('Deployed Worker registry differs from data/tools.json; regenerate, deploy, and verify.')
    print(f'Deployed Worker accepts all {len(wanted)} catalogue IDs; no events or reports were submitted.')


if __name__ == '__main__':
    main()
