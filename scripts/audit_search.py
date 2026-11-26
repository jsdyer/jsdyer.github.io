#!/usr/bin/env python3
"""Inventory the initial HTML of public CoolCode tool pages and review linked presets."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
from threading import Lock
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.robotparser import RobotFileParser

from audit_links import PageHead, ROOT

ORIGIN = "https://coolcode.ca"
AGENT = "CoolCodeSearchAudit"
BYTE_LIMIT = 384 * 1024
EXCLUDED = {"admin", "report", "reports", "account", "private", "saved", "share", "export",
            "exports", "data", "api", "downloads", "settings", "assets", "login", "index.html"}
SAFE_PATH = re.compile(r"(?:[a-z0-9]+(?:-[a-z0-9]+)*/)*(?:[a-z0-9]+(?:-[a-z0-9]+)*\.html)?")


class SearchPage(PageHead):
    def __init__(self):
        super().__init__()
        self.titles, self.h1s, self.descriptions, self.robots, self.links = [], [], [], [], []
        self.captures = {}
        self.href = ""
        self.in_head = self.head_complete = self.body_complete = False

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        values = dict(attrs)
        if self.in_head:
            super().handle_starttag(tag, attrs)
            if tag == "meta":
                name = (values.get("name") or "").casefold()
                content = (values.get("content") or "").strip()
                if name == "description":
                    self.descriptions.append(content)
                if name in {"robots", "googlebot", "bingbot"}:
                    self.robots.append(f"{name}: {content}")
        if (tag == "title" and self.in_head) or (tag in {"h1", "a"} and not self.in_head):
            self.captures[tag] = []
        if tag == "a":
            self.href = values.get("href") or ""

    def handle_data(self, data):
        for words in self.captures.values():
            words.append(data)

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
            self.head_complete = True
        if tag == "body":
            self.body_complete = True
        if tag in self.captures:
            value = " ".join("".join(self.captures.pop(tag)).split())
            if tag == "title":
                self.titles.append(value)
            elif tag == "h1":
                self.h1s.append(value)
            elif tag == "a" and self.href and value:
                self.links.append(self.href)


def candidate_url(root, href):
    if not href or any(char in href for char in ("?", "#", "\\", "%")):
        return None
    resolved = urlsplit(urljoin(root, href))
    if resolved.scheme != "https" or resolved.netloc != "coolcode.ca":
        return None
    base_path = urlsplit(root).path
    if not resolved.path.startswith(base_path):
        return None
    relative = resolved.path[len(base_path):]
    if not relative or not SAFE_PATH.fullmatch(relative):
        return None
    parts = relative.strip("/").split("/")
    if len(parts) > 3 or any(p in EXCLUDED or (p.endswith(".html") and p[:-5] in EXCLUDED) for p in parts):
        return None
    return ORIGIN + resolved.path


def naming_finding(text, tool, field):
    def normalize(value):
        return re.sub(r"[^a-z0-9]", "", re.sub(r"\bcoolcode(?:\.ca)?\b", "", value.casefold()))
    label = normalize(text)
    if not label:
        return None
    if label in {normalize(tool["id"]), normalize(tool.get("brand_name", ""))}:
        return f"review_brand_only_{field}"
    catalogue = normalize(tool.get("title", ""))
    task = normalize(tool.get("task_label", ""))
    if label == catalogue and ((task and task != catalogue) or tool.get("brand_name")):
        return f"review_legacy_catalogue_{field}"
    return None


def inspect_page(url, tool, data, limited):
    doc = SearchPage()
    doc.feed(data["body"])
    robots = doc.robots + data["robots"]
    flags = []
    if not doc.head_complete:
        flags.append("incomplete_head")
    else:
        if not any(doc.titles):
            flags.append("missing_title")
        elif len(doc.titles) > 1:
            flags.append("multiple_titles")
        elif finding := naming_finding(doc.titles[0], tool, "title"):
            flags.append(finding)
        if not any(doc.descriptions):
            flags.append("missing_description")
        if not doc.canonicals:
            flags.append("missing_canonical")
        elif len(doc.canonicals) != 1 or urljoin(url, doc.canonicals[0] or "") != url or not doc.canonicals[0]:
            flags.append("review_canonical")
    if not any(doc.h1s):
        flags.append("h1_unverified" if limited and not doc.body_complete else "missing_h1")
    elif len(doc.h1s) > 1:
        flags.append("review_multiple_h1")
    elif finding := naming_finding(doc.h1s[0], tool, "h1"):
        flags.append(finding)
    noindex = any(re.search(r"\b(?:noindex|none)\b", s, re.I) for s in robots)
    if noindex:
        flags.append("review_index_restriction")
    # Preserve the target path for diagnosis without retaining query parameters or credentials.
    canonicals = []
    for target in doc.canonicals:
        target = (target or "").split("?", 1)[0].split("#", 1)[0]
        canonicals.append(re.sub(r"^(https?://)[^/@]+@", r"\1", target, flags=re.I))
    return ({"url": url, "status": "observed", "http": data["http"], "titles": doc.titles,
             "descriptions": doc.descriptions, "h1": doc.h1s, "canonicals": canonicals,
             "robots": robots, "body_limited": limited, "findings": flags},
            doc.links)


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


class Reader:
    def __init__(self):
        self.lock = Lock()
        self.next_request = 0
        self.stopped = None
        self.rules = None

    def read(self, url, *, robots=False):
        if self.rules is not None and not self.rules.can_fetch(AGENT, url):
            return {"status": "unknown", "reason": "robots_disallowed"}
        with self.lock:
            if self.stopped:
                return {"status": "unknown", "reason": self.stopped}
            start = max(time.monotonic(), self.next_request)
            self.next_request = start + 0.4
        time.sleep(max(0, start - time.monotonic()))
        with self.lock:
            if self.stopped:
                return {"status": "unknown", "reason": self.stopped}
        req = Request(url, headers={"User-Agent": f"{AGENT}/1.0 (+https://coolcode.ca/)",
                                    "Accept": "text/plain" if robots else "text/html"})
        try:
            with build_opener(NoRedirects()).open(req, timeout=12) as response:
                mime = response.headers.get_content_type()
                if not robots and mime not in {"text/html", "application/xhtml+xml"}:
                    return {"status": "unknown", "reason": "non_html", "http": response.status}
                body = response.read(BYTE_LIMIT + 1)
                if robots and (len(body) > BYTE_LIMIT or mime != "text/plain"):
                    return {"status": "unknown", "reason": "unusable_robots_txt"}
                return {"status": "ok", "http": response.status, "limited": len(body) > BYTE_LIMIT,
                        "body": body[:BYTE_LIMIT].decode("utf-8", errors="replace"),
                        "robots": response.headers.get_all("X-Robots-Tag") or []}
        except HTTPError as exc:
            with exc:
                if exc.code == 429 or exc.code == 503 and exc.headers.get("Retry-After"):
                    with self.lock:
                        self.stopped = "origin_requested_backoff"
                return {"status": "unknown", "http": exc.code, "reason": "http_response"}
        except (OSError, URLError, TimeoutError) as exc:
            return {"status": "unknown", "reason": type(exc).__name__}

    def initialize(self):
        result = self.read(ORIGIN + "/robots.txt", robots=True)
        if result["status"] != "ok" and result.get("http") != 404:
            self.stopped = "robots_txt_unavailable"
            return
        self.rules = RobotFileParser()
        self.rules.parse(result.get("body", "").splitlines())


def inventory(tools, read, candidate_budget):
    def visit(args):
        tool, url = args
        data = read(url)
        if data["status"] != "ok":
            return dict(data, url=url, tool=tool["id"]), []
        page, links = inspect_page(url, tool, data, data["limited"])
        return dict(page, tool=tool["id"]), links

    roots = [(t, ORIGIN + t["url"]) for t in tools if t.get("access") == "browser"
             and re.fullmatch(r"/[a-z0-9]+(?:-[a-z0-9]+)*/", t["url"])
             and t["url"].strip("/") not in EXCLUDED]
    known = {u + case["path"] for t,u in roots for case in t.get("use_cases", [])}
    candidates = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(visit, roots))
        for (tool, root), (page, links) in zip(roots, results):
            if "review_index_restriction" in page.get("findings", []):
                continue
            for link in links:
                url = candidate_url(root, link)
                if url and url not in known:
                    candidates[url] = tool
        selected = sorted(candidates)[:candidate_budget]
        children = list(executor.map(visit, ((candidates[url], url) for url in selected)))
    pages = [page for page, _ in results]
    subpages = [page for page, _ in children]
    for page in subpages:
        disqualifying = {"incomplete_head", "missing_title", "multiple_titles", "missing_canonical",
                         "review_canonical", "review_index_restriction"}
        page["review_for_sitemap"] = (page["status"] == "observed" and any(page["h1"])
                                      and disqualifying.isdisjoint(page["findings"]))
    return {"observed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "root_count": len(pages), "unknown_roots": sum(p["status"] != "observed" for p in pages),
            "root_findings": dict(Counter(f for p in pages for f in p.get("findings", []))),
            "candidate_count": len(candidates), "candidate_budget": candidate_budget,
            "roots": pages, "linked_pages": subpages}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tool", action="append", default=[], help="Inspect only these listed IDs (repeatable)")
    parser.add_argument("--candidate-budget", type=int, default=32, choices=range(0, 65), metavar="0..64")
    parser.add_argument("--output", type=Path, default=ROOT / "search-audit.json")
    args = parser.parse_args()
    manifest = (ROOT / "data/tools.json").read_bytes()
    tools = json.loads(manifest)
    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    unknown = set(args.tool) - {t['id'] for t in tools}
    if unknown:
        parser.error(f"Unknown catalogue IDs: {', '.join(sorted(unknown))}")
    reader = Reader()
    reader.initialize()
    result = inventory([t for t in tools if not args.tool or t["id"] in args.tool], reader.read, args.candidate_budget)
    try:
        result["catalogue_commit"] = subprocess.check_output(
            ["git", "log", "-1", "--format=%H", "--", "data/tools.json"],
            cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip() or None
    except (OSError, subprocess.CalledProcessError):
        result["catalogue_commit"] = None
    result["catalogue_sha256"] = hashlib.sha256(manifest).hexdigest()
    result["started_at"] = started
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"{result['root_count']} roots, {result['unknown_roots']} unverified; {len(result['linked_pages'])} linked candidates checked.")
    for finding, count in sorted(result["root_findings"].items()):
        print(f"{finding}: {count}")
    print(f"Report: {args.output}")


if __name__ == "__main__":
    main()
