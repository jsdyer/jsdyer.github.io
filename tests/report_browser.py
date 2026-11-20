"""Check the private report form without sending an actual visitor report."""


def check_report(browser, url):
    context = browser.new_context()
    try:
        page = context.new_page()
        page.route("**/assets/service.mjs", lambda route: route.fulfill(
            content_type="text/javascript", body='export const SERVICE = "' + url.replace('http:', 'https:') + '";'))
        requests = []

        def receive(route):
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*",
                              "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type"})
                return
            requests.append(route.request.post_data_json)
            route.fulfill(status=429 if len(requests) == 1 else 201,
                          headers={"Access-Control-Allow-Origin": "*"}, json={"ok": True, "id": "test-receipt"})

        page.route("**/report", receive)
        page.goto(url + "/report/?tool=nightfinder")
        assert page.locator("#report-form").is_visible()
        page.wait_for_function("document.querySelector('#tool').selectedOptions[0].text === 'Nightfinder'")
        page.locator("#message").fill("The selected location disappeared when I reloaded the page.")
        page.get_by_role("button", name="Send private report").click()
        page.get_by_text("Too many reports", exact=False).wait_for()
        assert page.locator("#message").input_value().startswith("The selected location")
        page.get_by_role("button", name="Send private report").click()
        page.get_by_text("Your private report has been sent", exact=False).wait_for()
        assert len(requests) == 2 and requests[0] == requests[1]
        assert requests[1]["tool"] == "nightfinder"
        assert "test-receipt" in page.locator("#report-status").inner_text()
        page.route("**/assets/service.mjs", lambda route: route.fulfill(
            content_type="text/javascript", body='export const SERVICE = "";'))
        page.goto(url + "/report/?tool=nightfinder")
        page.get_by_text("Private reporting is currently unavailable", exact=False).wait_for()
        assert page.locator("#report-form").is_hidden()
        assert page.locator("#github").is_visible()
        from urllib.parse import parse_qs, urlsplit
        args = parse_qs(urlsplit(page.locator("#github").get_attribute("href")).query)
        assert "nightfinder" in args["title"][0].lower()
    finally:
        context.close()
    check_admin_traffic(browser, url)


def check_admin_traffic(browser, url):
    """Exercise both reporting periods with private statistics served locally."""
    page = browser.new_page()
    try:
        # Use a dedicated HTTPS origin so the test never reaches the collector.
        page.route("**/assets/service.mjs", lambda route: route.fulfill(
            content_type="text/javascript", body='export const SERVICE = "https://collector.test";'))

        def collector(route):
            headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization"}
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers=headers)
                return
            if "/admin/stats?" in route.request.url:
                days = 28 if route.request.url.endswith("days=28") else 7
                lineup = {"experiment": "test", "variant": "a", "impressions": 4, "clicks": 1}
                payload = {"days": days, "through": "2026-11-19",
                           "tools": [{"tool": "nightfinder", "views": 3}, {"tool": "atip", "views": 1}],
                           "daily": [{"day": "2026-11-19", "views": 4}],
                           "experiments": [lineup], "cards": [dict(lineup, tool="nightfinder")]}
            else:
                payload = {"reports": []}
            route.fulfill(json=payload, headers=headers)

        page.route("https://collector.test/**", collector)
        page.goto(url + "/admin/")
        page.get_by_label("Read-only GitHub token for private reports").fill("test-credential")
        page.get_by_role("button", name="Load private reports").click()
        page.get_by_text("Private reports loaded.").wait_for()
        page.get_by_label("Find a tool").fill("nightfinder")
        assert "75%" in page.get_by_role("table", name="Recorded tool pageviews").inner_text()
        page.get_by_text("Daily tool opens ·", exact=False).click()
        assert page.locator("meter").evaluate_all("(bars) => bars.map(b => b.value)") == [0]*6 + [4]
        page.get_by_text("See individual featured cards").click()
        assert "25%" in page.get_by_role("table", name="Featured tool performance").inner_text()
        page.get_by_label("Reporting period").select_option("28")
        page.wait_for_function("document.querySelectorAll('meter').length === 28")
        page.get_by_role("button", name="Clear private reports").click()
        assert page.locator("meter").count() == 0
    finally:
        page.close()
