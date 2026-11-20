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

        requests = []

        def collector(route):
            headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization"}
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers=headers)
                return
            requests.append(route.request.url)
            if route.request.headers.get("authorization") != "Bearer test-credential":
                route.fulfill(status=401, headers=headers, json={"error": "Access denied"})
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
        key = page.get_by_label("Owner GitHub token")
        unlock = page.get_by_role("button", name="Unlock admin")
        assert key.is_visible() and page.locator("#lineup").count() == 0 and not requests
        key.fill("wrong-token")
        unlock.click()
        page.get_by_text("Access was denied.", exact=False).wait_for()
        assert page.locator("#lineup").count() == 0
        assert len(requests) == 1 and "/admin/stats?" in requests[0]
        key.fill("test-credential")
        unlock.click()
        page.get_by_text("Private reports loaded.").wait_for()
        # Monitor requests are public. Only the normal owner routes receive a key.
        public_headers = {"Access-Control-Allow-Origin": "*"}
        def public_probe(route):
            assert "authorization" not in route.request.headers
            route.fulfill(status=503, headers=public_headers, body="unavailable")
        page.route("https://coolcode.ca/**", public_probe)
        page.route("https://collector.test/health", lambda r: r.fulfill(json={"ok": True}, headers=public_headers))
        page.route("**/actions/workflows/service-monitor.yml/runs?**",
                   lambda r: r.fulfill(json={"workflow_runs": []}, headers=public_headers))
        # Operational usage is loaded only by the signed-in Cloudflare panel.
        cloudflare_requests = []
        def cloudflare_usage(route):
            headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization"}
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers=headers)
                return
            if not route.request.headers.get("authorization"):
                route.fulfill(status=401, json={"error": "Owner sign-in required."}, headers=headers)
                return
            assert route.request.headers.get("authorization") == "Bearer test-credential"
            cloudflare_requests.append(route.request.url)
            payload = {"start": "2026-11-18T12:00:00Z", "end": "2026-11-19T12:00:00Z",
                       "worker": {"requests": 10, "subrequests": 2, "outcomes": [{"status": "ok", "requests": 10}]},
                       "database": None if len(cloudflare_requests) == 1 else
                       {"readQueries": 5, "writeQueries": 1, "rowsRead": 17, "rowsWritten": 2}}
            route.fulfill(json=payload, headers=headers)
        page.route("https://coolcode-admin-metrics.jeffdyer.workers.dev/**", cloudflare_usage)
        page.get_by_role("link", name="Cloudflare usage", exact=True).click()
        page.get_by_text("D1 measurements unavailable for this interval.").wait_for()
        assert "10" in page.get_by_role("table", name="Visitor API", exact=True).inner_text()
        page.get_by_role("button", name="Refresh Cloudflare usage").click()
        page.get_by_role("table", name="D1 reporting database").wait_for()
        assert len(cloudflare_requests) == 2
        page.get_by_role("link", name="Service status", exact=True).click()
        page.get_by_text("3 of 4 checks need review.", exact=False).wait_for()
        page.get_by_text("No external checks recorded yet.").wait_for()
        assert "Passed" in page.locator("#service-results").inner_text()
        history_urls = []
        def runs(route):
            assert "authorization" not in route.request.headers
            history_urls.append(route.request.url)
            route.fulfill(headers={"Access-Control-Allow-Origin": "*"}, json={
                "total_count": 1, "workflow_runs": [{"name": "Data refresh", "conclusion": "failure",
                "event": "schedule", "created_at": "2026-11-18T00:00:00Z", "html_url": "https://github.com/"}]})
        page.route("https://api.github.com/repos/jsdyer/*/actions/runs?**", runs)
        # The first view joins each saved refresh to its exact public workflow attempt.
        def refresh_runs(route):
            assert "authorization" not in route.request.headers
            route.fulfill(headers=public_headers, json={"workflow_runs": [
                {"id": 731, "run_attempt": 2, "conclusion": "failure", "created_at": "2026-11-19T01:00:00Z"},
                {"id": 700, "run_attempt": 1, "conclusion": "success", "created_at": "2026-11-18T01:00:00Z"}]})
        def refresh_history(route):
            assert "authorization" not in route.request.headers
            route.fulfill(headers=public_headers, json={"version": 1, "runs": [
                {"run_id": "731", "attempt": 2, "checked_at": "2026-11-19T02:00:00Z",
                 "counts": {"changed": 1, "unchanged": 2, "recovered": 0, "unavailable": 0},
                 "checked_by_tool": {"nightfinder": 2, "welllayers": 1},
                 "details": [{"tool": "nightfinder", "label": "Sites", "status": "changed", "fields": {"count": [0, 2]}}]}]})
        page.route("**/actions/workflows/catalogue-freshness.yml/runs?**", refresh_runs)
        page.route("**/catalogue-refresh-log/refresh-history.json", refresh_history)
        page.get_by_role("link", name="Update log").click()
        page.get_by_role("link", name="Run 731, attempt 2", exact=True).wait_for()
        page.get_by_label("Refresh results").select_option("attention")
        assert page.get_by_role("link", name="Run 700", exact=True).count() == 0
        page.get_by_text("Inspect 1 check", exact=True).click()
        assert "count 0 → 2" in page.locator("#activity-body").inner_text()
        page.get_by_label("Project", exact=True).select_option("welllayers")
        page.get_by_label("Refresh results").select_option("unchanged")
        assert "Well Layers · 0 changed · 0 recovered · 0 unavailable · 1 unchanged" in page.locator("#activity-body").inner_text()
        page.get_by_label("Project", exact=True).select_option("")
        page.get_by_label("History", exact=True).select_option("runs")
        page.get_by_role("link", name="Data refresh", exact=True).wait_for()
        with page.expect_response(lambda response: "/nightfinder/actions/runs?" in response.url):
            page.get_by_label("Project", exact=True).select_option("nightfinder")
        page.wait_for_function("document.querySelector('#activity-body [role=status]').textContent.startsWith('Page 1')")
        assert any("/nightfinder/actions/runs" in u for u in history_urls)
        genre_table = page.get_by_role("table", name="Usage by catalogue genre · 7 days")
        assert "Nightfinder" in genre_table.inner_text()
        panel = page.get_by_text("Compare tool opens with GitHub interest", exact=True)
        panel.click()
        page.get_by_label("Comparison tool", exact=True).select_option("nightfinder")
        def repo_traffic(route):
            headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization"}
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers=headers)
            else:
                assert route.request.headers.get("authorization") == "Bearer test-credential"
                if route.request.url.endswith("/views"):
                    route.fulfill(headers=headers, json={"count": 17, "uniques": 6})
                else:
                    route.fulfill(status=403, headers=headers, json={})
        page.route("https://api.github.com/repos/jsdyer/nightfinder/traffic/*", repo_traffic)
        page.get_by_role("button", name="Load GitHub traffic").click()
        repo_table = page.get_by_role("table", name="GitHub repository traffic · last 14 days")
        assert "17" in repo_table.inner_text()
        assert "Unavailable" in repo_table.inner_text()
        page.get_by_label("Comparison tool", exact=True).select_option("rack-recipes")
        assert repo_table.count() == 0
        page.get_by_text("Counts cover the entire shared site repository.", exact=False).wait_for()
        page.get_by_label("Find a tool").fill("nightfinder")
        assert "75%" in page.get_by_role("table", name="Recorded tool pageviews").inner_text()
        page.get_by_text("Daily tool opens ·", exact=False).click()
        assert page.locator("meter").evaluate_all("(bars) => bars.map(b => b.value)") == [0]*6 + [4]
        page.get_by_text("See individual featured cards").click()
        assert "25%" in page.get_by_role("table", name="Featured tool performance").inner_text()
        page.get_by_label("Reporting period").select_option("28")
        page.wait_for_function("document.querySelectorAll('meter').length === 28")
        # Publishing uses the same session. GitHub can decline writes for a read-only key.
        import base64
        from pathlib import Path
        config = (Path(__file__).resolve().parents[1] / "data/featured.json").read_bytes()
        writes = []

        def github(route):
            headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
                       "Access-Control-Allow-Headers": "Authorization, Content-Type, X-GitHub-Api-Version"}
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers=headers)
            elif route.request.method == "GET":
                route.fulfill(json={"sha": "test", "content": base64.b64encode(config).decode()}, headers=headers)
            else:
                writes.append(route.request.headers.get("authorization"))
                route.fulfill(status=403, json={}, headers=headers)

        page.route("https://api.github.com/repos/jsdyer/jsdyer.github.io/contents/data/featured.json*", github)
        mode = page.locator("#mode")
        mode.select_option("ab" if mode.input_value() == "fixed" else "fixed")
        page.get_by_role("button", name="Publish featured tools").click()
        page.get_by_text("GitHub declined publishing.", exact=False).wait_for()
        assert writes == ["Bearer test-credential"]
        page.get_by_role("button", name="Lock admin").click()
        assert key.is_visible() and page.locator("#lineup").count() == 0
        key.fill("test-credential")
        unlock.click()
        page.get_by_text("Private reports loaded.").wait_for()
        page.reload()
        assert key.is_visible() and key.input_value() == ""
        assert page.locator("meter").count() == 0
    finally:
        page.close()
