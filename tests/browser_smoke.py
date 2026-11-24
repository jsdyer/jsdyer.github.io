"""Exercise the built catalogue in Chromium; run after scripts/build.py."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright
from archive_shelf_browser import check_archive_shelf
from featured_browser import check_featured
from report_browser import check_report
from protocol_captures_browser import check_protocols
from rack_recipes_browser import check_rack_recipes
from admin_outcomes_browser import check_outcomes

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    tools = json.loads((ROOT / "data/tools.json").read_text())
    entries = len(tools) + sum("install_url" in tool for tool in tools)
    browser_count = sum(tool["access"] == "browser" for tool in tools)
    install_count = sum(tool["access"] == "install" or "install_url" in tool for tool in tools)
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
            assert page.locator("[data-tool]:visible").count() == entries
            assert page.locator('#tool-count').inner_text() == f'{len(tools)} tools available'
            assert page.locator('#browser-tools [data-access="install"]').count() == 0
            assert page.locator('#install [data-access="browser"]').count() == 0
            storm = page.locator('[data-tool-id="stormtracks"]')
            summary = storm.locator("summary")
            assert storm.locator(".tool-source").is_visible()
            assert "storm tracks" in storm.locator(".tool-dates").inner_text()
            assert storm.locator(".tool-dates time").is_visible()
            assert not storm.locator("dl").is_visible()
            storm.screenshot(path=str(screenshots / "storm-tracks.png"))
            summary.focus()
            summary.press("Enter")
            assert storm.get_by_text("Seasons", exact=True).is_visible()
            assert storm.get_by_text("Scheduled checks", exact=True).is_visible()
            summary.press("Space")
            assert not storm.locator("dl").is_visible()
            assert not page.locator('[data-tool-id="datasetdiff"] .tool-dates').count()
            page.get_by_role('button', name='Install yourself', exact=True).click()
            assert page.locator('[data-tool]:visible').count() == install_count
            assert not page.locator('#browser-tools').is_visible()
            assert page.get_by_role('link', name='Waystation', exact=True).is_visible()
            page.locator('#tool-search').fill('Waystation')
            assert page.locator('[data-tool]:visible').count() == 1
            page.locator('#clear-tools').click()
            page.get_by_role('button', name='Use in browser', exact=True).click()
            assert page.locator('[data-tool]:visible').count() == browser_count
            assert not page.locator('#install').is_visible()
            page.get_by_role('button', name='All tools', exact=True).click()
            for query in ('wordweave', 'Word Weave'):
                page.locator('#tool-search').fill(query)
                assert page.locator('[data-tool]:visible').count() == 1
                assert page.get_by_role('link', name='Word Weave', exact=True).is_visible()
            page.locator('#clear-tools').click()
            page.locator('#tool-search').fill('Archive Shelf')
            assert page.locator('[data-tool]:visible').count() == 2
            assert page.locator('#tool-count').inner_text() == '1 tool found'
            page.locator('#clear-tools').click()
            page.locator("#tool-search").fill("DNS")
            assert page.get_by_role("link", name="DNS Lens", exact=True).is_visible()
            page.locator("#tool-search").fill("zzzz-no-such-tool")
            assert page.locator("#tool-empty").is_visible()
            assert page.locator("[data-tool]:visible").count() == 0
            page.locator("#clear-tools").click()
            assert page.locator("[data-tool]:visible").count() == entries
            page.locator("#theme").click()
            assert page.locator("html").get_attribute("data-theme") == "dark"
            page.locator("#theme").click()
            page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            summary.click()
            assert storm.get_by_text("Seasons", exact=True).is_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            storm.screenshot(path=str(screenshots / "storm-tracks-mobile-details.png"))
            summary.click()
            page.locator("#workbench").scroll_into_view_if_needed()
            page.screenshot(path=str(screenshots / "mobile.png"))
            page.get_by_role('button', name='Install yourself', exact=True).click()
            assert page.locator('[data-tool]:visible').count() == install_count
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            page.locator('#install').scroll_into_view_if_needed()
            page.screenshot(path=str(screenshots / "mobile-install.png"))
            for tool in tools:
                if tool["hosting"] == "local":
                    assert page.goto(url + tool["url"]).status == 200
            check_rack_recipes(page, url)
            assert page.goto(url + "/field-notes/").status == 200
            context = browser.new_context(java_script_enabled=False)
            nojs = context.new_page()
            nojs.goto(url)
            assert nojs.locator("[data-tool]:visible").count() == entries
            assert nojs.locator('#browser-tools').is_visible()
            assert nojs.locator('#install').is_visible()
            nojs.locator('[data-tool-id="stormtracks"] summary').click()
            assert nojs.locator('[data-tool-id="stormtracks"] dl').is_visible()
            nojs.goto(url + "/archive-shelf/")
            assert nojs.locator("#issues").is_visible()
            assert nojs.locator(".issue-list li a").count() == 18
            context.close()
            check_featured(browser, url)
            check_outcomes(browser, url, screenshots)
            check_report(browser, url)
            check_protocols(browser,url)
            check_archive_shelf(browser,url,screenshots)
            assert not errors, errors
            browser.close()
        print("Browser checks passed: search, clear, theme, mobile, local pages and no-JS catalogue")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
