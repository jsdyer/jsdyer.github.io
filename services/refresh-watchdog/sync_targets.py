"""Refresh data-only configuration from the owned GitHub repository; retain last good data."""
import datetime as dt
import json
from pathlib import Path
import urllib.request
from watchdog import NoRedirect, atomic_json, stamp, timestamp, validate_config

SOURCE = 'https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/main/services/refresh-watchdog/targets.json'


def fetch_config():
    request = urllib.request.Request(SOURCE, headers={'User-Agent': 'CoolCode watchdog registry/1.0'})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=20) as response:
        data = response.read(1_000_001)
    if len(data) > 1_000_000:
        raise ValueError('Registry exceeds 1 MB')
    return json.loads(data)


def checked(config):
    validate_config(config)
    if any(not t['repo'].startswith('jsdyer/') for t in config['targets']):
        raise ValueError('Registry contains a repository outside the configured owner')
    return config


def update(destination, fallback, fetch=fetch_config, now=None):
    destination, fallback = Path(destination), Path(fallback)
    now = now or dt.datetime.now(dt.timezone.utc)
    try:
        config = checked(fetch())
        config.pop('_registry_warning', None)
        config['_registry'] = {'source': SOURCE, 'last_success': stamp(now), 'status': 'current'}
    except (OSError, ValueError, KeyError, TypeError):
        # A broken registry fetch must not disable the already configured collectors.
        config = checked(json.loads((destination if destination.exists() else fallback).read_text()))
        previous = config.get('_registry', {}).get('last_success')
        try:
            recent = previous and timestamp(previous) >= now - dt.timedelta(days=1)
        except (ValueError, TypeError):
            recent = False
        config['_registry'] = {'source': SOURCE, 'last_success': previous, 'status': 'cached'}
        if not recent:
            config['_registry_warning'] = 'GitHub registry could not be refreshed for over a day, or has never been fetched.'
        print('Registry fetch failed; retaining validated last-good targets.')
    atomic_json(destination, config)
    return destination
