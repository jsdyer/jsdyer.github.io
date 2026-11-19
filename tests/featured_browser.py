"""Check tab assignment and the static fallback with a real browser."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build import load_catalogue, render


def check_featured(browser, url):
    categories, tools = load_catalogue()
    template = (ROOT / "templates/index.html").read_text()
    config = {"mode": "ab", "experiment": "browser-check",
              "a": ["nightfinder", "eventradar", "dnslens", "atip"],
              "b": ["inflation-basket", "dnslens", "atip", "exploitgraveyard"]}
    fixture = render(categories, tools, template, featured=config)
    route = url + "/?featured-browser-check"

    def check_links(page, variant):
        links = page.locator("[data-featured-grid] [data-featured-tool]")
        assert links.evaluate_all("(links) => links.map(a => a.dataset.featuredTool)") == config[variant]
        assert page.locator("[data-featured-grid]").get_attribute("data-variant") == variant

    for javascript in (True, False):
        context = browser.new_context(java_script_enabled=javascript)
        try:
            page = context.new_page()
            page.route(route, lambda request: request.fulfill(content_type="text/html", body=fixture))
            if javascript:
                # The first visit draws B. On reload A would be drawn if the stored choice were discarded.
                page.add_init_script("""Math.random = () => sessionStorage.getItem('changed-random') ? .1 : .9""")
            page.goto(route)
            check_links(page, "b" if javascript else "a")
            if javascript:
                assert page.locator("[data-featured-ready=true]").count() == 1
                page.evaluate("sessionStorage.setItem('changed-random', 'true')")
                page.reload()
                check_links(page, "b")
            for width, columns in ((1440, 4), (768, 2), (390, 1)):
                page.set_viewport_size({"width": width, "height": 900})
                grid = page.locator("[data-featured-grid]")
                assert grid.evaluate("el => getComputedStyle(el).gridTemplateColumns.split(' ').length") == columns
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        finally:
            context.close()
