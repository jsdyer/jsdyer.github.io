#!/usr/bin/env python3
"""Rebuild the public page index and the HTML issue list from the archived PDFs."""
from argparse import ArgumentParser
from datetime import date
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import re

from archive_shelf import extract

SHELF = Path(__file__).resolve().parents[2] / "archive-shelf"
BEGIN = "<!-- issue list -->"
END = "<!-- /issue list -->"


def generate():
    records = json.loads((SHELF / "issues.json").read_text(encoding="utf-8"))
    index = []
    lines = []
    for record in records:
        pdf = SHELF / record["file"]
        if sha256(pdf.read_bytes()).hexdigest() != record["sha256"]:
            raise ValueError(f"Source PDF checksum changed: {pdf.name}")
        with pdf.open("rb") as source:
            pages = [" ".join(page.split()) for page in extract(source, ".pdf")]
        if not pages or not all(pages):
            raise ValueError(f"Missing page text in {pdf.name}")
        day = date.fromisoformat(record["date"])
        label = f"{day.day} {day:%B %Y}"
        index.append({**record, "label": label, "pages": pages})
        lines.append(
            f'<li><div><strong>{escape(label)}</strong><span>{escape(record["topic"])}</span></div>'
            f'<div><a href="{escape(record["file"])}">PDF · {len(pages)} pages</a> '
            f'<a href="{escape(record["original"])}">Government archive</a></div></li>'
        )
    index_text = "const archiveIssues = " + json.dumps(index, ensure_ascii=False, indent=1) + ";\n"
    path = SHELF / "index.html"
    html = path.read_text(encoding="utf-8")
    replacement = BEGIN + "\n" + "\n".join(lines) + "\n" + END
    html, count = re.subn(re.escape(BEGIN) + ".*?" + re.escape(END), lambda _: replacement,
                          html, flags=re.DOTALL)
    if count != 1:
        raise ValueError("Expected one issue directory in index.html")
    return {SHELF / "archive-pages.js": index_text, path: html}


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for target, content in generate().items():
        if args.check:
            if target.read_text(encoding="utf-8") != content:
                parser.exit(1, f"Stale generated content: {target.name}\n")
        else:
            target.write_text(content, encoding="utf-8")
