#!/usr/bin/env python3
"""Report catalogue destination/source availability separately from publication."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def check(url):
    for attempt in range(2):
        try:
            request = Request(url, headers={"User-Agent": "CoolCode catalogue link audit/1.0"})
            with urlopen(request, timeout=20) as response:
                response.read(256)
                return {"url": url, "ok": True, "status": response.status, "final_url": response.url}
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            error = str(exc)
            if attempt == 0:
                time.sleep(1)
    return {"url": url, "ok": False, "error": error}


def main():
    tools = json.loads((ROOT / "data/tools.json").read_text())
    urls = sorted({("https://coolcode.ca" + value if value.startswith("/") else value)
                   for tool in tools for value in (tool["url"], tool["source"], *([tool["install_url"]] if "install_url" in tool else []))})
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, urls))
    report = ROOT / "link-audit.json"
    report.write_text(json.dumps(results, indent=2) + "\n")
    failed = [result for result in results if not result["ok"]]
    print(f"Checked {len(results)} URLs; {len(failed)} need review. See {report.name}.")
    for result in failed:
        print(f"{result['url']}: {result['error']}")
    print("403/429/timeouts can be blocking or transient failures; inspect before removing a tool.")
    return bool(failed)


if __name__ == "__main__":
    sys.exit(main())
