import copy
from html.parser import HTMLParser
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import ROOT, load_catalogue, render, render_entry, validate


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.entries = 0
        self.ids = []
        self.hrefs = []
        self.images = []
        self.tools = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "data-tool" in attrs:
            self.entries += 1
            self.tools.append(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if "href" in attrs:
            self.hrefs.append(attrs["href"])
        if tag == "img":
            self.images.append(attrs)


class CatalogueTests(unittest.TestCase):
    def setUp(self):
        self.categories, self.tools = load_catalogue()
        self.template = (ROOT / "templates/index.html").read_text()

    def reject(self, change, message):
        change()
        with self.assertRaisesRegex(ValueError, message):
            validate(self.categories, self.tools)

    def test_all_destinations_are_in_static_html(self):
        page = Page(render(self.categories, self.tools, self.template))
        self.assertEqual(page.entries, len(self.tools) + sum("install_url" in t for t in self.tools))
        self.assertEqual(len(page.ids), len(set(page.ids)))
        for tool in self.tools:
            self.assertIn(tool["url"], page.hrefs)
        for category in self.categories:
            if any(t["category"] == category["id"] and t["access"] == "browser" for t in self.tools):
                self.assertIn(category["id"], page.ids)
                self.assertIn("#" + category["id"], page.hrefs)

    def test_repository_slugs_are_searchable(self):
        page = Page(render(self.categories, self.tools, self.template))
        for entry in page.tools:
            self.assertIn(entry["data-tool-id"], entry["data-keywords"].split())
        wordweave = next(entry for entry in page.tools if entry["data-tool-id"] == "wordweave")
        self.assertIn("wordweave", wordweave["data-keywords"])

    def test_access_labels_are_explicit_for_every_entry(self):
        html = render(self.categories, self.tools, self.template)
        page = Page(html)
        for tool in self.tools:
            entries = [t for t in page.tools if t["data-tool-id"] == tool["id"]]
            expected = [tool["access"]] + (["install"] if "install_url" in tool else [])
            self.assertCountEqual([t["data-access"] for t in entries], expected)
        self.assertNotIn("Browser demo", html)
        self.assertNotIn('class="tool-mode">Local file', html)

    def test_summary_preserves_coverage_fallback_and_zero_counts(self):
        tool = dict(self.tools[0], data_date_badge=False, data_info={
            "mode": "snapshot", "detail": "Example records", "cadence": "Monthly",
            "probes": [{"label": "Data through", "value": "2026-09", "unavailable": True,
                        "notice": "Serving bundled data", "count_at": {"unit": "records"}, "count": 0}]
        })
        from sync_readme import describe
        html = render_entry(tool, "browser")
        visible, extra = html.split('<details ', 1)
        for fact in ["Data through 2026-09", "0 records", "Serving bundled data", "last verified value shown"]:
            self.assertIn(fact, visible)
        self.assertIn('<dt>Scheduled checks</dt><dd>Monthly</dd>', extra)
        for fact in ["Scheduled checks: monthly", "Data through: 2026-09", "0 records", "Serving bundled data"]:
            self.assertIn(fact, describe(tool, "browser"))
        tool["data_info"] = {"mode": "live", "detail": "Requested on use"}
        self.assertIn("On-demand lookup", render_entry(tool, "browser"))
        self.assertNotIn("<details", render_entry(tool, "browser"))
        self.assertNotIn("Data retrieved", describe(tool, "browser"))

    def test_compact_dates_keep_their_meaning_and_precision(self):
        tool = dict(self.tools[0], data_info={"mode": "snapshot", "detail": "A & B", "probes": [
            {"label": "Oldest source retrieved", "value": "2026-11-18 04:02 UTC"},
            {"label": "Seasons", "value": "1851–2025", "count": 2, "count_at": {"unit": "tracks"}}
        ]})
        visible, extra = render_entry(tool, "browser").split('<details ', 1)
        self.assertIn('A &amp; B', visible)
        self.assertIn('Oldest source retrieved <time datetime="2026-11-18T04:02Z">Nov 18, 2026, 04:02 UTC</time>', visible)
        self.assertIn('2 tracks', visible)
        self.assertNotIn('1851', visible)
        self.assertIn('<dt>Seasons</dt><dd>1851–2025</dd>', extra)
        probe = tool["data_info"]["probes"][0]
        probe.update(label="Snapshot generated", value=None)
        self.assertIn('Snapshot built unrecorded', render_entry(tool, "browser"))

    def test_dual_version_links_to_two_destinations(self):
        archive = next(t for t in self.tools if t["id"] == "archive-shelf")
        page = Page(render(self.categories, self.tools, self.template))
        self.assertIn(archive["url"], page.hrefs)
        self.assertIn(archive["install_url"], page.hrefs)

    def test_installation_requires_requirements(self):
        tool = next(t for t in self.tools if t["access"] == "install")
        self.reject(lambda: tool.pop("requirements"), "installation requirements")

    def test_data_date_is_independent_of_access_labels_and_install_destinations(self):
        tool = next(t.copy() for t in self.tools if t["hosting"] == "project" and t["access"] == "browser")
        tool.update(data_date_badge=True, install_url="https://example.org/install", requirements="Linux")
        browser = Page(render_entry(tool, "browser"))
        self.assertEqual([image["src"] for image in browser.images], [tool["url"] + "data-date.svg"])
        self.assertIn(tool["title"], browser.images[0]["alt"])
        tool["data_info"] = dict(tool["data_info"], probes=[{"label": "Data retrieved", "value": "2026-11-18"}])
        dated = Page(render_entry(tool, "browser"))
        self.assertEqual(dated.images[0]["alt"], tool["title"] + " data retrieved 2026-11-18")
        self.assertIn(browser.images[0]["src"], browser.hrefs)
        self.assertEqual(Page(render_entry(tool, "install")).images, [])
        tool["data_date_badge"] = False
        self.assertEqual(Page(render_entry(tool, "browser")).images, [])

    def test_data_date_badges_accept_only_project_images(self):
        tool = next(t for t in self.tools if t["hosting"] == "local")
        self.reject(lambda: tool.update(data_date_badge="https://example.org/untrusted.svg"), "boolean")
        self.reject(lambda: tool.update(data_date_badge=True), "project-hosted browser tool")

    def test_access_cannot_be_omitted_or_guessed_from_hosting(self):
        self.reject(lambda: self.tools[0].pop("access"), "Missing")

    def test_install_guide_must_be_https(self):
        self.reject(lambda: self.tools[0].update(install_url="javascript:bad()", requirements="Python"), "HTTPS guide")

    def test_use_cases_cannot_index_user_queries_or_external_urls(self):
        tool = next(t for t in self.tools if t["hosting"] == "project" and t["access"] == "browser")
        for path in ["https://example.org/", "../admin/", "/admin/", "lookup/?id=private", "saved/#receipt", ""]:
            with self.subTest(path=path):
                tool["use_cases"] = [{"title": "Public example", "path": path}]
                with self.assertRaisesRegex(ValueError, "public use case"):
                    validate(self.categories, self.tools)

    def test_duplicate_tool_id(self):
        self.reject(lambda: self.tools.append(copy.deepcopy(self.tools[0])), "Duplicate tool ID")

    def test_duplicate_route(self):
        duplicate = copy.deepcopy(self.tools[0])
        duplicate["id"] = "different-id"
        self.reject(lambda: self.tools.append(duplicate), "duplicate destination")

    def test_unknown_category(self):
        self.reject(lambda: self.tools[0].update(category="typo"), "unknown category")

    def test_unknown_icon(self):
        self.reject(lambda: self.tools[0].update(icon="typo"), "unknown icon")

    def test_missing_local_page(self):
        self.reject(lambda: self.tools[0].update(url="/missing-page/"), "missing local")

    def test_project_cannot_shadow_local_tool(self):
        self.reject(lambda: self.tools[0].update(hosting="project"), "collides")

    def test_reserved_and_traversal_routes(self):
        for url in ("/assets/", "/../outside/", "//example.com/", "/field-notes/"):
            with self.subTest(url=url):
                tools = copy.deepcopy(self.tools)
                tools[0]["url"] = url
                with self.assertRaises(ValueError):
                    validate(self.categories, tools)

    def test_external_script_url_rejected(self):
        self.reject(lambda: self.tools[0].update(hosting="external", url="javascript:alert(1)"), "HTTPS")

    def test_unknown_field_catches_typo(self):
        self.reject(lambda: self.tools[0].update(descripton="typo"), "unknown tool fields")

    def test_html_is_escaped(self):
        self.tools[0].update(title='<img src=x onerror="alert(1)">', tags=['" onmouseover="bad'], description="<script>bad()</script>")
        html = render(self.categories, self.tools, self.template)
        self.assertNotIn('<img src=x', html)
        self.assertNotIn('<script>bad()', html)
        self.assertIn('&lt;script&gt;bad()', html)
        self.assertEqual(Page(html).entries, len(self.tools) + sum("install_url" in t for t in self.tools))

    def test_growing_catalogue_does_not_need_html_edits(self):
        for number in range(100):
            tool = copy.deepcopy(self.tools[0])
            tool.update(id=f"future-{number}", url=f"/future-{number}/", hosting="project", source=f"https://github.com/jsdyer/future-{number}")
            self.tools.append(tool)
        validate(self.categories, self.tools)
        self.assertEqual(Page(render(self.categories, self.tools, self.template)).entries, len(self.tools) + sum("install_url" in t for t in self.tools))

    def test_missing_template_marker_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "exactly once"):
            render(self.categories, self.tools, self.template.replace("{{TOOL_GROUPS}}", ""))


if __name__ == "__main__":
    unittest.main()
