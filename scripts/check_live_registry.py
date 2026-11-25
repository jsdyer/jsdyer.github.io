#!/usr/bin/env python3
"""Read-only verification of the deployed visitor Worker's accepted catalogue IDs."""
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def verify_registry(result, wanted):
    """Manual dashboard edits can reorder IDs; membership and uniqueness must agree."""
    actual = result.get('tool_ids') if isinstance(result, dict) else None
    if (not isinstance(result, dict) or result.get('schema') != 'coolcode.tool-registry.v1'
            or not isinstance(actual, list) or not all(isinstance(item, str) for item in actual)
            or len(actual) != len(set(actual)) or sorted(actual) != sorted(wanted)):
        raise ValueError('Deployed Worker registry differs from data/tools.json; regenerate, deploy, and verify.')


def main():
    wanted = sorted(t['id'] for t in json.loads((ROOT / 'data/tools.json').read_text()))
    request = Request('https://coolcode-visitor-api.jeffdyer.workers.dev/registry',
                      headers={'User-Agent': 'CoolCode registry audit'})
    with urlopen(request, timeout=20) as response:
        result = json.load(response)
    try:
        verify_registry(result, wanted)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print(f'Deployed Worker accepts all {len(wanted)} catalogue IDs; no events or reports were submitted.')


if __name__ == '__main__':
    main()
