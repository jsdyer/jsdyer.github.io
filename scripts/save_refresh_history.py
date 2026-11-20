#!/usr/bin/env python3
"""Append a completed probe observation to the dedicated refresh-history branch's JSON file."""

import argparse
import json
from pathlib import Path


LIMIT = 120


def save(history_path, entry):
    history = json.loads(history_path.read_text(encoding='utf-8')) if history_path.exists() else {'version': 1, 'runs': []}
    if history['version'] != 1 or not isinstance(history['runs'], list):
        raise ValueError('Unsupported refresh history format')
    # One entry per attempt, including explicit reruns of the same GitHub workflow.
    runs = [run for run in history['runs'] if (run['run_id'], run['attempt']) != (entry['run_id'], entry['attempt'])]
    runs.append(entry)
    runs.sort(key=lambda run: (run['checked_at'], int(run['run_id']), run['attempt']), reverse=True)
    history['runs'] = runs[:LIMIT]
    history_path.write_text(json.dumps(history, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('history', type=Path)
    parser.add_argument('entry', type=Path)
    args = parser.parse_args()
    save(args.history, json.loads(args.entry.read_text(encoding='utf-8')))
