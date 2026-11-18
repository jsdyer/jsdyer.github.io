#!/usr/bin/env python3
"""Import the README-only catalogue note from each tool's published guide."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPException
import json
from pathlib import Path
import re
import sys
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from build import ROOT

BEGIN = "<!-- coolcode:guide -->"
END = "<!-- /coolcode:guide -->"


def plain_sentences(source):
    """Find plain sentences in the original guides that predate excerpt markers."""
    body = re.sub(r"(?ms)^(?:```|~~~).*?^(?:```|~~~)[^\n]*", "", source)
    paragraphs = re.split(r"\n\s*\n|\n(?=\s*[-*] )", body)
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if paragraph.startswith(("#", "|", "!", "<")):
            continue
        paragraph = re.sub(r"^\s*(?:[-*]|[0-9]+\.)\s+", "", paragraph)
        paragraph = re.sub(r"\[([^]\n]+)\]\(<?[^\s)]+>?\)", r"\1", paragraph)
        paragraph = " ".join(paragraph.replace("**", "").replace("`", "").split())
        for sentence in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9“‘])", paragraph):
            if sentence:
                yield sentence


def read_note(source, lead=None):
    if BEGIN in source or END in source:
        if source.count(BEGIN) != 1 or source.count(END) != 1:
            raise ValueError("Expected one complete guide excerpt")
        before, _, after = source.partition(BEGIN)
        excerpt, closing, _ = after.partition(END)
        if not closing or END in before or not excerpt.strip():
            raise ValueError("Empty or reversed guide excerpt")
        note = " ".join(excerpt.split())
        if re.search(r"<[^>]+>|\]\(|```", note):
            raise ValueError("Use plain text in the guide excerpt")
        return note
    if not lead:
        raise ValueError("Add a coolcode:guide excerpt to the tool README")
    matches = [sentence for sentence in plain_sentences(source) if sentence.startswith(lead)]
    if len(matches) != 1:
        raise ValueError(f"Guide excerpt matched {len(matches)} sentences; mark the intended note in the README")
    return matches[0]


def guide_source(tool, root=ROOT):
    url = urlsplit(tool["source"])
    parts = url.path.strip("/").split("/")
    if (url.scheme != "https" or url.netloc != "github.com" or url.query or url.fragment
            or len(parts) < 2 or not all(re.fullmatch(r"[\w.-]+", part) and part not in (".", "..") for part in parts)):
        raise ValueError("Expected a GitHub tool repository or directory")
    owner, repo, *tail = parts
    ref, folder = "HEAD", []
    if tail:
        if len(tail) < 3 or tail[0] != "tree":
            raise ValueError("Expected a GitHub tree path for the guide")
        ref, folder = tail[1], tail[2:]
    if (owner, repo) == ("jsdyer", "jsdyer.github.io") and ref in ("HEAD", "main"):
        return (root.joinpath(*folder) / "README.md").read_text(encoding="utf-8")
    target = "/".join([owner, repo, ref, *folder, "README.md"])
    req = Request("https://raw.githubusercontent.com/" + target, headers={"User-Agent": "CoolCode tool guides"})
    with urlopen(req, timeout=20) as response:
        payload = response.read(1_000_001)
    if len(payload) > 1_000_000:
        raise ValueError("Guide exceeds 1 MB")
    return payload.decode("utf-8")


def import_notes(tools, read=guide_source):
    def import_one(tool):
        try:
            guide = tool.get("readme", {})
            note = read_note(read(tool), guide.get("lead"))
            return tool, note, None
        except (HTTPException, OSError, ValueError) as exc:
            return tool, None, str(exc)
    errors = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for tool, note, error in pool.map(import_one, tools):
            if error:
                errors.append(f"{tool['id']}: {error}")
            else:
                tool.setdefault("readme", {})["note"] = note
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tool", action="append", help="Import only this catalogue ID (repeatable)")
    parser.add_argument("--check", action="store_true", help="Verify the saved notes without changing them")
    parser.add_argument("--local", action="store_true", help="Check only guides in this checkout")
    args = parser.parse_args()
    path = ROOT / "data/tools.json"
    original = path.read_bytes()
    tools = json.loads(original)
    wanted = set(args.tool or ())
    if wanted - {tool["id"] for tool in tools}:
        parser.error("Unknown tool ID")
    selected = [tool for tool in tools if (not wanted or tool["id"] in wanted) and
                (not args.local or tool["source"].startswith("https://github.com/jsdyer/jsdyer.github.io/tree/main/"))]
    errors = import_notes(selected)
    revised = (json.dumps(tools, ensure_ascii=False, indent=2) + "\n").encode()
    if revised != original:
        if args.check:
            errors.append("Saved README notes differ; run scripts/sync_guides.py and scripts/sync_readme.py")
        else:
            with TemporaryDirectory(dir=path.parent) as tmp:
                output = Path(tmp) / path.name
                output.write_bytes(revised)
                output.chmod(path.stat().st_mode & 0o777)
                if original != path.read_bytes():
                    parser.error("Catalogue changed during import; retry with the current file")
                output.replace(path)
    for error in errors:
        print(error, file=sys.stderr)
    print(f"Checked {len(selected)} tool guides; {len(errors)} require attention.")
    return bool(errors)


if __name__ == "__main__":
    sys.exit(main())
