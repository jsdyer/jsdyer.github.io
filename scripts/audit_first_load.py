"""Observe public CoolCode tool opening screens in Chromium without interacting."""
import argparse
import asyncio
from collections import Counter
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.parse import urljoin, urlsplit

from playwright.async_api import Error, async_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://coolcode.ca"
VIEWPORTS = {"desktop": (1365, 850), "phone": (390, 844)}
STATIC = re.compile(r"\.(css|m?js|cjs|wasm|json|geojson|csv|tsv|xml|txt|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|webmanifest|topojson|pbf|pmtiles|gz|bin|sqlite3?|parquet)$", re.I)
CDNS = {"cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "fonts.gstatic.com", "fonts.googleapis.com"}
RESOURCE_TYPES = {"stylesheet", "script", "image", "font"}
MAP_TILE = re.compile(r"^/\d{1,2}/\d+/\d+\.png$")

OBSERVE = r"""() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  function isToolLink(e) {
    if (!e.matches('a[href]')) return false;
    const target = new URL(e.href, location.href);
    return target.origin === location.origin && target.pathname.startsWith(location.pathname) &&
      (target.hash.length > 1 || target.pathname !== location.pathname || target.search);
  }
  const inChrome = (e) => e.closest('footer, .leaflet-control-container')
    || (e.closest('nav, [role=navigation]') && !isToolLink(e))
    || /^(skip to|back to coolcode|coolcode(\.ca)?$)/i.test(clean(e.textContent));
  function box(e) {
    if (!e || e.closest('[aria-hidden=true], [inert]') || !e.checkVisibility({opacityProperty: true, visibilityProperty: true})) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) return null;
    const x = (Math.max(0, r.left) + Math.min(innerWidth - 1, r.right)) / 2;
    const y = Math.min(innerHeight - 1, Math.max(0, r.top) + Math.min(8, r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return hit && (e.contains(hit) || hit.contains(e)) ? Math.round(r.top) : null;
  }
  function first(selector, describe) {
    const candidates = [];
    for (const e of Array.from(document.querySelectorAll(selector)).slice(0, 180)) {
      if (inChrome(e)) continue;
      const y = box(e);
      if (y === null) continue;
      const text = clean(describe(e));
      if (text) {
        const r = e.getBoundingClientRect();
        candidates.push({y, left: Math.round(r.left), right: Math.round(r.right), text});
      }
    }
    return candidates.sort((a,b) => a.y-b.y)[0] || null;
  }
  function controlName(e) {
    if (e.matches('a') && !isToolLink(e) && !e.matches('main a, [role=main] a, form a')) return '';
    if (e.matches('a') && /^(about|github|source|data (and|&) method|how .*works?$|privacy|methodology)/i.test(clean(e.innerText))) return '';
    const label = e.labels?.[0]?.cloneNode(true);
    label?.querySelectorAll('select,textarea,input,button').forEach(child => child.remove());
    const name = e.getAttribute('aria-label') || label?.textContent.trim() ||
      (e.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.innerText || '').join(' ').trim() ||
      e.getAttribute('title') || e.getAttribute('placeholder') || (e.matches('select') ? e.selectedOptions[0]?.text : '') ||
      e.innerText || (e.matches('[type=submit], [type=button]') && e.value) || '[' + e.tagName.toLowerCase() + ']';
    if (/^(dark mode|light mode|theme|toggle (dark|light|theme|menu)|switch to (dark|light)|toggle navigation|report a problem|report an issue|menu$)/i.test(clean(name))) return '';
    return name;
  }
  const heading = first('h1, [role=heading][aria-level="1"]', e => e.innerText);
  const intro = first('p, [class*=subtitle], [class*=lede], [class*=intro], [class*=tagline], [class*=description], [class*=dek]', e => {
    if (e.matches('.eyebrow, .kicker, .overline, .eyeline') || e.childElementCount > 8 || e.matches('div,section') && e.querySelector('p,button,h1,h2,form')) return '';
    const t = clean(e.innerText);
    return t.length >= 34 && t.split(/\s+/).length >= 6 && !/^(skip to|loading|last (updated|checked)|source:|©|copyright)/i.test(t) ? t : '';
  });
  const control = first('button:not(:disabled), input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]', controlName);
  const map = first('.leaflet-container, .maplibregl-map, .mapboxgl-map, [id=map i], [role=application][aria-label*=map i], canvas[aria-label*=map i]', e => {
    const r = e.getBoundingClientRect();
    return r.width >= 150 && r.height >= 120 ? 'Map' : '';
  });
  return {heading, intro, control, map, width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth, layout_width: innerWidth, mobile_viewport: !!document.querySelector('meta[name="viewport"]')};
}"""


def permitted(target, resource_type, is_navigation, path):
    url = urlsplit(target)
    if url.scheme != "https":
        return False
    if url.hostname == "coolcode.ca":
        if is_navigation:
            return url.path == path and not url.query
        return (url.path.startswith(path) or url.path.startswith("/assets/") or url.path == "/favicon.svg") and bool(STATIC.search(url.path))
    if url.hostname in CDNS:
        return resource_type in RESOURCE_TYPES
    tile_host = url.hostname == "tile.openstreetmap.org" or (url.hostname or "").endswith(".tile.openstreetmap.org")
    return bool(tile_host and resource_type == "image" and MAP_TILE.fullmatch(url.path) and not url.query)


class KeepRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # The audit checks the destination before requesting any redirected asset.
        return None


class Captures:
    """Reuse a successful public response at both viewport sizes."""
    def __init__(self, directory):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)
        self.running = {}
        self.next_request = 0
        self.cooldown = 0
        self.queue = asyncio.Lock()

    def download(self, url):
        request = Request(url, headers={"User-Agent": "CoolCode opening-screen review (+https://coolcode.ca/)"})
        try:
            response = build_opener(KeepRedirect()).open(request, timeout=25)
        except HTTPError as error:
            response = error
        with response:
            headers = {key.lower(): value for key, value in response.headers.items()
                       if key.lower() in {"content-type", "content-security-policy", "location", "access-control-allow-origin", "content-encoding", "retry-after"}}
            return {"status": response.status, "headers": headers}, response.read()

    async def capture(self, url, meta_path, body_path):
        for attempt in range(3):
            async with self.queue:
                while (wait := max(self.next_request, self.cooldown) - time.monotonic()) > 0:
                    await asyncio.sleep(wait)
                self.next_request = time.monotonic() + 0.38
            meta, data = await asyncio.to_thread(self.download, url)
            if meta["status"] != 429:
                if meta["status"] == 200:
                    body_path.write_bytes(data)
                    meta_path.write_text(json.dumps(meta))
                return {**meta, "body": data}
            if attempt < 2:
                value = meta["headers"].get("retry-after", "")
                delay = int(value) if value.isdigit() else 15 * (attempt + 1)
                if value and not value.isdigit():
                    try:
                        delay = max(0, parsedate_to_datetime(value).timestamp() - time.time())
                    except (ValueError, TypeError):
                        pass
                self.cooldown = max(self.cooldown, time.monotonic() + delay)
        return {**meta, "body": data}

    async def response(self, url):
        key = hashlib.sha256(url.encode()).hexdigest()
        meta_path = self.directory / (key + ".json")
        body_path = self.directory / (key + ".body")
        if meta_path.exists():
            return {**json.loads(meta_path.read_text()), "body": body_path.read_bytes()}
        if url not in self.running:
            self.running[url] = asyncio.create_task(self.capture(url, meta_path, body_path))
        job = self.running[url]
        try:
            return await job
        finally:
            if job.done():
                self.running.pop(url, None)


def flags(row):
    if "issue" in row:
        return ["navigation"]
    out = []
    if not row["heading"]:
        out.append("heading outside view")
    if not row["intro"]:
        out.append("no opening sentence detected")

    def above_sentence(item):
        intro = row["intro"]
        return (item["y"] + 16 < intro["y"] and
                min(item["right"], intro["right"]) > max(item["left"], intro["left"]))

    if row["map"] and (not row["intro"] or above_sentence(row["map"])):
        out.append("map before sentence")
    if row["control"] and row["intro"] and above_sentence(row["control"]):
        out.append("control before sentence")
    if not row["control"]:
        out.append("no control in view")
    if not row["mobile_viewport"]:
        out.append("missing viewport declaration")
    if row["width"] > row["viewport"] + 4:
        out.append("horizontal overflow")
    if row.get("capture_failures"):
        out.append("asset unavailable")
    if row["errors"]:
        out.append("uncaught JavaScript")
    return out


async def inspect(browser, record, view, out, screenshots, captures, documents, settle_ms):
    width, height = VIEWPORTS[view]
    path = urlsplit(record["url"]).path
    url = ORIGIN + path
    context = await browser.new_context(viewport={"width": width, "height": height}, is_mobile=view == "phone",
                                        has_touch=view == "phone", service_workers="block", accept_downloads=False)
    blocked = Counter()
    capture_failures = set()

    async def route_request(route):
        request = route.request
        target = request.url
        resource_type = request.resource_type
        is_navigation = request.is_navigation_request()
        if request.method != "GET" or not permitted(target, resource_type, is_navigation, path):
            blocked[resource_type] += 1
            await route.abort()
            return
        try:
            if documents and is_navigation:
                markup = (documents / (record["id"] + ".html")).read_bytes()
                await route.fulfill(status=200, content_type="text/html; charset=utf-8", body=markup)
                return
            # Browser redirect handling can bypass an interception callback. Resolve
            # only approved static destinations here before returning any bytes.
            for _ in range(5):
                response = await captures.response(target)
                location = response["headers"].get("location")
                if not (300 <= response["status"] < 400 and location):
                    await route.fulfill(**response)
                    return
                target = urljoin(target, location)
                if not permitted(target, resource_type, is_navigation, path):
                    break
            capture_failures.add("redirected " + resource_type)
            await route.abort()
        except (OSError, TimeoutError):
            capture_failures.add(route.request.resource_type)
            await route.abort()

    await context.route("**/*", route_request)
    await context.route_web_socket("**/*", lambda socket: socket.close())
    page = await context.new_page()
    errors, http_errors = set(), set()
    # Keep paths, URL parameters and visitor input out of the report.
    page.on("pageerror", lambda ex: errors.add(re.sub(r"https?://\S+", "[URL]", (str(ex).splitlines() or ["Error"])[0])[:160]))
    page.on("response", lambda res: http_errors.add(f"{res.status} {res.request.resource_type}") if res.status >= 400 else None)
    row = {"id": record["id"], "url": url}
    try:
        response = await page.goto(url, wait_until="domcontentloaded", timeout=120000)
        if response is None or response.status >= 400:
            row["issue"] = f"document HTTP {response.status if response else 'unavailable'}"
        else:
            # Allow early layout and local data rendering without waiting indefinitely on live feeds.
            await page.wait_for_timeout(settle_ms)
            row.update(await page.evaluate(OBSERVE))
        row.update(errors=sorted(errors), http_errors=sorted(http_errors), capture_failures=sorted(capture_failures), blocked=dict(blocked))
        row["flags"] = flags(row)
        if screenshots and row["flags"]:
            try:
                await page.screenshot(path=out / f"{record['id']}-{view}.png", timeout=3500, animations="disabled")
            except Error:
                pass
    except Error as exc:
        row.update(issue=re.sub(r"https?://\S+", "[URL]", str(exc).splitlines()[0])[:200], errors=sorted(errors), blocked=dict(blocked), flags=["navigation"])
    finally:
        await context.close()
    return row


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--viewport", default="all", choices=["all", *VIEWPORTS])
    parser.add_argument("--tool", action="append", help="Exact catalogue ID; repeat for a subset")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--settle-ms", type=int, default=1400, help="Observe this long after DOMContentLoaded")
    parser.add_argument("--out", type=Path, default=Path("first-load-output"))
    parser.add_argument("--chromium", help="Use a locally installed Chromium executable")
    parser.add_argument("--documents", type=Path, help="Reuse production HTML previously fetched at the tool IDs as ID.html")
    parser.add_argument("--cache", type=Path, help="Directory for this capture's successful asset responses (shared across viewports)")
    parser.add_argument("--screenshots", action="store_true", help="Save the first viewport for flagged pages")
    args = parser.parse_args()
    records = [row for row in json.loads((ROOT / "data/tools.json").read_text()) if row["access"] == "browser"]
    if any(not row["url"].startswith("/") or urlsplit(row["url"]).netloc for row in records):
        parser.error("Catalogue contains a browser entry outside coolcode.ca; review its scope before auditing")
    if args.tool:
        records = [r for r in records if r["id"] in args.tool]
        if set(args.tool) - {r["id"] for r in records}:
            parser.error("Unknown browser tool ID")
    if not 0 <= args.settle_ms <= 30000:
        parser.error("Observation delay must be 0 to 30000 ms")
    if not 1 <= args.workers <= 6:
        parser.error("Use 1 to 6 workers")
    args.out.mkdir(parents=True, exist_ok=True)
    limit = asyncio.Semaphore(args.workers)
    captures = Captures(args.cache or args.out / "responses")
    views = list(VIEWPORTS) if args.viewport == "all" else [args.viewport]
    results = {view: [] for view in views}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=args.chromium, args=[
            "--disable-gpu", "--disable-dev-shm-usage", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"])

        async def inspect_one(row):
            async with limit:
                for view in views:
                    result = await inspect(browser, row, view, args.out, args.screenshots, captures, args.documents, args.settle_ms)
                    results[view].append(result)
                    if result["flags"] or result.get("http_errors"):
                        print(view, row["id"], "|", ", ".join(result["flags"]), "|", result.get("http_errors"), flush=True)

        await asyncio.gather(*(inspect_one(row) for row in records))
        version = browser.version
        await browser.close()
    for view, rows in results.items():
        rows.sort(key=lambda row: row["id"])
        totals = Counter(flag for row in rows for flag in row["flags"])
        report = {"finished_utc": datetime.now(timezone.utc).isoformat(), "chromium": version,
                  "viewport": VIEWPORTS[view], "settle_ms": args.settle_ms, "total": len(rows), "counts": dict(totals), "rows": rows}
        (args.out / f"{view}.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        print(f"{view}: {len(rows)} tools, flags {json.dumps(totals, sort_keys=True)}")


if __name__ == "__main__":
    asyncio.run(main())
