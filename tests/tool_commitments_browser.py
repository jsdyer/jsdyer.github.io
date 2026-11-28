"""Visit a legacy tool through the production origin while serving its assets offline."""


def check_tool_commitments(browser, built):
    context = browser.new_context(viewport={"width": 360, "height": 800})
    context.add_init_script("Object.defineProperty(navigator, 'globalPrivacyControl', {get: () => true})")
    page = context.new_page()
    requests = []

    def deliver(route):
        path = route.request.url.removeprefix("https://coolcode.ca")
        requests.append(path)
        if path == "/assets/tool-metrics.js":
            return route.fulfill(path=built / "assets/tool-metrics.js", content_type="text/javascript")
        if path == "/archive-shelf/":
            return route.fulfill(path=built / "archive-shelf/index.html", content_type="text/html")
        if path in ("/bankrates/", "/bankrates/example/", "/report/"):
            return route.fulfill(body=(
                '<!doctype html><meta charset="utf-8"><script src="/assets/tool-metrics.js"></script>'
                '<h1>Example</h1><p>Look up a record.</p><button>Look up</button>'
            ), content_type="text/html")
        route.abort()

    page.route("**/*", deliver)
    for path in ("/bankrates/", "/bankrates/example/", "/archive-shelf/", "/report/"):
        requests.clear()
        page.goto("https://coolcode.ca" + path)
        notice = page.locator("[data-coolcode-commitments]")
        if path == "/report/":
            assert notice.count() == 0
        else:
            assert notice.count() == 1 and notice.is_visible()
            assert notice.inner_text() == "No CoolCode account · No ads · How CoolCode works", (path, notice.inner_text())
            assert notice.get_by_role("link").get_attribute("href") == "/about/#our-commitments"
        assert "/metrics/bridge.html" not in requests
        assert not any("sentry.io" in request for request in requests)
        if path.startswith("/bankrates/"):
            assert requests == [path, "/assets/tool-metrics.js"]
    context.close()
