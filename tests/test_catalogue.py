import copy
from html.parser import HTMLParser
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import ROOT, load_catalogue, render, validate


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.entries = 0
        self.ids = []
        self.hrefs = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "data-tool" in attrs:
            self.entries += 1
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if "href" in attrs:
            self.hrefs.append(attrs["href"])


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
        self.assertEqual(page.entries, len(self.tools))
        self.assertEqual(len(page.ids), len(set(page.ids)))
        for tool in self.tools:
            self.assertIn(tool["url"], page.hrefs)
        for category in self.categories:
            self.assertIn(category["id"], page.ids)
            self.assertIn("#" + category["id"], page.hrefs)

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
        self.assertEqual(Page(html).entries, len(self.tools))

    def test_growing_catalogue_does_not_need_html_edits(self):
        for number in range(100):
            tool = copy.deepcopy(self.tools[0])
            tool.update(id=f"future-{number}", url=f"/future-{number}/", hosting="project", source=f"https://github.com/jsdyer/future-{number}")
            self.tools.append(tool)
        validate(self.categories, self.tools)
        self.assertEqual(Page(render(self.categories, self.tools, self.template)).entries, len(self.tools))

    def test_missing_template_marker_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "exactly once"):
            render(self.categories, self.tools, self.template.replace("{{TOOL_GROUPS}}", ""))


if __name__ == "__main__":
    unittest.main()
