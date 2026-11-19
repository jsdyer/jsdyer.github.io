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
