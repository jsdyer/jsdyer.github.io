"""Check public archive citations and private-file workflows in the built site."""
import json
from pathlib import Path


def check_archive_shelf(browser, base, screenshots):
    page = browser.new_page(viewport={"width": 1280, "height": 900}, accept_downloads=True)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base + "/archive-shelf/")
    assert page.locator(".issue-list li").count() == 9
    page.get_by_role("button", name="dial-up", exact=True).click()
    assert page.locator("#summary").inner_text() == '3 pages matching “dial-up”'
    links = page.locator("#results h4 a").all()
    assert [link.get_attribute("href") for link in links] == [
        "issues/the-daily-2001-07-26.pdf#page=2",
        "issues/the-daily-2003-09-23.pdf#page=5",
        "issues/the-daily-2006-08-15.pdf#page=7",
    ]
    page.screenshot(path=str(screenshots / "archive-shelf-desktop.png"), full_page=True)
    with page.expect_download() as download:
        page.locator("#export").click()
    records = json.loads(Path(download.value.path()).read_text())["results"]
    assert len(records) == 3 and records[1]["page"] == 5
    assert records[1]["original_pdf"].endswith("2003-9-23-eng.pdf")
    page.locator("#results summary").first.click()
    assert "Strong growth" in page.locator("details[open] .transcript").inner_text()
    page.select_option("#issue", "2003-09-23")
    page.reload()
    assert page.locator("#results .folio").inner_text() == "Page 5"
    page.set_viewport_size({"width": 360, "height": 800})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(screenshots / "archive-shelf-mobile.png"), full_page=True)
    page.locator("#clear").click()
    assert page.locator("#results li").count() == 8
    page.go_back()
    assert page.locator("#query").input_value() == "dial-up"
    page.locator("#browse").click()
    assert page.locator("#issues").is_visible()

    page.goto(base + "/archive-shelf/?q=cat")
    assert "66 pages matching" in page.locator("#summary").inner_text()
    assert "75 pages" in page.locator("#scope-note").inner_text()
    page.get_by_role("button", name="Hide catalogue labels").click()
    assert "0 pages matching" in page.locator("#summary").inner_text()
    assert "body=1" in page.url
    page.reload()
    assert page.locator("#skip-catalogue").is_checked()
    page.get_by_role("button", name="Include catalogue labels").click()
    assert "66 pages matching" in page.locator("#summary").inner_text()
    page.select_option("#collection", "local")
    assert page.locator("#catalogue-option").is_hidden()
    requests = []
    page.on("request", lambda request: requests.append(request.url))
    page.locator("#files").set_input_files([
        {"name": "minutes.md", "mimeType": "text/markdown",
         "buffer": b"Welcome\fPrivate orchid meeting minutes\nClosing."},
        {"name": "invalid.txt", "mimeType": "text/plain", "buffer": b"\xff"},
    ])
    page.wait_for_function("document.querySelector('#import-status').textContent.includes('UTF-8')")
    assert page.locator("#results li").count() == 2
    page.locator("#query").fill("private orchid")
    page.locator("#query").press("Enter")
    assert page.locator("#results .folio").inner_text() == "Page 2"
    assert "private" not in page.url
    with page.expect_download() as download:
        page.locator("#export").click()
    result, = json.loads(Path(download.value.path()).read_text())["results"]
    assert result["document"] == "minutes.md" and result["page"] == 2
    assert "original_pdf" not in result
    assert not [url for url in requests if url.startswith(("http://", "https://"))]
    page.locator("#forget").click()
    assert "Choose files" in page.locator(".empty").inner_text()
    page.goto(base + "/archive-shelf/?q=the")
    assert page.locator("#results li").count() == 12
    page.locator("#more").click()
    assert page.locator("#results li").count() == 24
    assert not errors, errors
    page.close()
