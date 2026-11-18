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


def check_atlantic_dial(browser, url, screenshots):
    context = browser.new_context(timezone_id="America/Vancouver", viewport={"width": 1280, "height": 900})
    page = context.new_page()
    problems = []
    page.on("pageerror", lambda error: problems.append(str(error)))
    page.clock.install(time="2026-11-21T17:05:00Z")
    assert page.goto(url + "/atlanticdial/").status == 200
    page.get_by_role("button", name="Show all seven days").wait_for()
    page.screenshot(path=str(screenshots / "atlantic-dial-desktop.png"))
    page.get_by_label("Province", exact=True).select_option("PEI")
    page.get_by_label("Show times in").select_option("America/St_Johns")
    row = page.locator("article.airing").filter(has_text="Saturday Night Hoedown").first
    assert "6:30" in row.locator(".time").inner_text()
    row.get_by_role("button", name="Save show Saturday Night Hoedown").click()
    page.get_by_label("Saved shows", exact=True).check()
    with page.expect_download() as downloading:
        row.get_by_role("button", name="Add to calendar").click()
    download = downloading.value
    assert "DTSTART:20261121T220000Z" in Path(download.path()).read_text()
    assert row.get_by_role("link", name="Station player").get_attribute("href") == "https://player.cfcy.fm/"
    page.reload()
    page.get_by_role("button", name="Remove saved show Saturday Night Hoedown").wait_for()
    assert page.get_by_label("Show times in").input_value() == "America/St_Johns"
    page.set_viewport_size({"width": 375, "height": 812})
    page.get_by_role("button", name="Show all seven days").click()
    assert page.locator("article.airing").count() > 7
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(screenshots / "atlantic-dial-mobile.png"))
    page.locator('a[href="#sources"]').click()
    assert page.locator("#sources ul").is_visible()
    assert not problems, problems
    context.close()


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
            assert page.goto(url + "/field-notes/").status == 200
            check_atlantic_dial(browser, url, screenshots)
            context = browser.new_context(java_script_enabled=False)
            nojs = context.new_page()
            nojs.goto(url)
            assert nojs.locator("[data-tool]:visible").count() == entries
            assert nojs.locator('#browser-tools').is_visible()
            assert nojs.locator('#install').is_visible()
            nojs.locator('[data-tool-id="stormtracks"] summary').click()
            assert nojs.locator('[data-tool-id="stormtracks"] dl').is_visible()
            nojs.goto(url + "/atlanticdial/")
            nojs.locator("#sources summary").click()
            assert nojs.locator("#sources ul a").count() == 7
            context.close()
            assert not errors, errors
            browser.close()
        print("Browser checks passed: search, clear, theme, mobile, local pages and no-JS catalogue")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
