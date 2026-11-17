"""Exercise the built catalogue in Chromium; run after scripts/build.py."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    tools = json.loads((ROOT / "data/tools.json").read_text())
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT / "dist")))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}"
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url)
            assert page.locator("[data-tool]:visible").count() == len(tools)
            page.locator("#tool-search").fill("DNS")
            assert page.get_by_role("link", name="DNS Lens", exact=True).is_visible()
            page.locator("#tool-search").fill("zzzz-no-such-tool")
            assert page.locator("#tool-empty").is_visible()
            assert page.locator("[data-tool]:visible").count() == 0
            page.locator("#clear-tools").click()
            assert page.locator("[data-tool]:visible").count() == len(tools)
            page.locator("#theme").click()
            assert page.locator("html").get_attribute("data-theme") == "dark"
            page.locator("#theme").click()
            page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            page.locator("#workbench").scroll_into_view_if_needed()
            page.screenshot(path=str(screenshots / "mobile.png"))
            for tool in tools:
                if tool["hosting"] == "local":
                    assert page.goto(url + tool["url"]).status == 200
            assert page.goto(url + "/field-notes/").status == 200
            context = browser.new_context(java_script_enabled=False)
            nojs = context.new_page()
            nojs.goto(url)
            assert nojs.locator("[data-tool]:visible").count() == len(tools)
            context.close()
            assert not errors, errors
            browser.close()
        print("Browser checks passed: search, clear, theme, mobile, local pages and no-JS catalogue")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
