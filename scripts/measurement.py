"""Register measured, unlisted tools independently of public discovery."""
import json
import re


def unlisted_tools(root, tools):
    path = root / 'data/unlisted-tools.json'
    entries = json.loads(path.read_text()) if path.exists() else []
    if not isinstance(entries, list):
        raise ValueError('Unlisted tools must be an array')
    known = {t['id'] for t in tools}
    for entry in entries:
        if (not isinstance(entry, dict) or set(entry) != {'id', 'title', 'source'}
                or not isinstance(entry['id'], str)
                or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', entry['id'])
                or entry['id'] in known or entry['id'] == 'site'
                or not isinstance(entry['title'], str) or not entry['title'].strip()
                or entry['source'] != 'https://github.com/jsdyer/' + entry['id']):
            raise ValueError('Invalid, duplicate or publicly listed unlisted tool')
        known.add(entry['id'])
    return entries


def measurement_ids(root, tools):
    return sorted([t['id'] for t in tools] + [t['id'] for t in unlisted_tools(root, tools)])
