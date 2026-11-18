#!/usr/bin/env python3
"""Flag published programme listings that have changed since editorial review."""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from http.client import HTTPException
import json
from pathlib import Path
import re
import unicodedata
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DAYS = ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.fragments = []
        self.hidden_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'template', 'noscript'):
            self.hidden_depth += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'template', 'noscript'):
            self.hidden_depth = max(0, self.hidden_depth - 1)

    def handle_data(self, text):
        if not self.hidden_depth:
            self.fragments.append(text)


def normalize(text):
    unaccented = unicodedata.normalize("NFKD", text.casefold())
    return re.sub(r"[^a-z0-9]+", " ", ''.join(c for c in unaccented if not unicodedata.combining(c))).strip()


def matches(text, slot):
    needles = [normalize(fragment) for fragment in slot['sourceText']]
    if slot.get('daySection'):
        chunks = re.split(r'\b(' + '|'.join(DAYS) + r')\b', text)
        return all(any(heading == DAYS[day] and all(n in body for n in needles)
                       for heading, body in zip(chunks[1::2], chunks[2::2])) for day in slot['days'])
    return all(needle in text for needle in needles)


def download(url):
    request = Request(url, headers={'User-Agent': 'CoolCode Atlantic Dial schedule check/1.0'})
    with urlopen(request, timeout=25) as response:
        payload = response.read(4_000_001)
        if len(payload) > 4_000_000:
            raise ValueError('Page exceeded 4 MB')
        return payload.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')


def check(data, fetch=download):
    def station_result(item):
        key, station = item
        try:
            html = VisibleText()
            html.feed(fetch(station['source']))
            text = normalize(' '.join(html.fragments))
            changed = [show['title'] for show in data['shows'] if show['station'] == key
                       and not all(matches(text, slot) for slot in show['slots'])]
            return (f"{station['name']}: review {', '.join(changed)} — {station['source']}" if changed else None)
        except (HTTPException, OSError, ValueError) as exc:
            return f"{station['name']}: source unavailable ({exc}) — {station['source']}"
    with ThreadPoolExecutor(max_workers=4) as pool:
        return [r for r in pool.map(station_result, data['stations'].items()) if r]


if __name__ == '__main__':
    data = json.loads((ROOT / 'atlanticdial/schedule.json').read_text())
    problems = check(data)
    for message in problems:
        print(message)
    print(f"Checked published listings for {len(data['shows'])} shows on {len(data['stations'])} stations.")
    raise SystemExit(bool(problems))
