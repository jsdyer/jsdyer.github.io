"""Verify the actual Rack Recipes download and browser import."""
from pathlib import Path
from tempfile import TemporaryDirectory


def check_rack_recipes(page, url):
    page.goto(url + "/rack-recipes/")
    page.locator("#bench").wait_for()
    assert page.locator("#services input").count() == 12
    page.locator("#navidrome").check()
    page.locator("#ntfy").check()
    assert "./media/music:/music:ro" in page.locator("#preview").text_content()
    assert 'command: ["serve"]' in page.locator("#preview").text_content()
    page.locator("#linkding").check()
    page.locator("#freshrss-port").fill("9090")
    assert page.locator("#download").is_disabled()
    assert "both use host port 9090" in page.locator("#config-error").inner_text()
    page.locator("#freshrss-port").fill("8181")
    page.select_option("#freshrss-storage", "folder")
    page.select_option("#ram", "128")
    assert "127.0.0.1:8181" in page.locator("#startup").inner_text()
    with TemporaryDirectory() as temp:
        with page.expect_download() as pending:
            page.locator("#download").click()
        download = pending.value
        assert download.suggested_filename == "compose.yaml"
        path = Path(temp) / download.suggested_filename
        download.save_as(path)
        yaml = path.read_text()
        assert yaml == page.locator("#preview").text_content()
        assert '"127.0.0.1:8181:80"' in yaml
        assert "./data/freshrss/feeds:/var/www/FreshRSS/data" in yaml
        assert "bookmarks: {}" in yaml and "feeds: {}" not in yaml
        page.reload()
        page.locator("#recipe-file").set_input_files(path)
        page.get_by_text("Opened the saved Rack Recipes settings.").wait_for()
        assert page.locator("#preview").text_content() == yaml
        assert page.locator("#ram").input_value() == "128"
        assert page.locator("#freshrss-storage").input_value() == "folder"
        assert page.locator("#linkding").is_checked()
        path.write_text("services: {}")
        page.locator("#recipe-file").set_input_files(path)
        page.get_by_text("Choose a Compose file exported by Rack Recipes.").wait_for()
        assert page.locator("#preview").text_content() == yaml
