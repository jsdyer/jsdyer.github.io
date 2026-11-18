import copy
from html import unescape
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import load_catalogue
from sync_readme import render_readme, synchronize


SKELETON = """# Guide
Keep this introduction.
<!-- BEGIN BROWSER_TOOLS -->
<!-- END BROWSER_TOOLS -->
Keep these installation instructions.
<!-- BEGIN INSTALL_TOOLS -->
<!-- END INSTALL_TOOLS -->
Keep this footer.
"""


class ReadmeTests(unittest.TestCase):
    def setUp(self):
        self.categories, self.tools = load_catalogue()

    def test_every_catalogue_tool_is_documented_with_both_access_modes(self):
        text = render_readme(SKELETON, self.categories, self.tools)
        browser, install = text.split("<!-- END BROWSER_TOOLS -->", 1)
        for tool in self.tools:
            with self.subTest(tool=tool["id"]):
                destination = tool["url"]
                if destination.startswith("/"):
                    destination = "https://coolcode.ca" + destination
                section = browser if tool["access"] == "browser" else install
                self.assertIn(f"](<{destination}>)", section)
                self.assertIn(f"](<{tool['source']}>)", section)
                if "install_url" in tool:
                    self.assertIn(f"](<{tool['install_url']}>)", install)
                if tool["access"] == "install" or "install_url" in tool:
                    self.assertIn(tool["requirements"], install)
        headings = [unescape(browser).index("#### " + category["title"]) for category in self.categories
                    if any(t["category"] == category["id"] and t["access"] == "browser" for t in self.tools)]
        self.assertEqual(headings, sorted(headings))

    def test_updates_and_removals_replace_stale_rows_without_changing_prose(self):
        initial = render_readme(SKELETON, self.categories, self.tools)
        revised = copy.deepcopy(self.tools)
        removed = revised.pop(0)
        revised[0]["description"] = "A newly revised description."
        text = render_readme(initial, self.categories, revised)
        self.assertNotIn(f"https://coolcode.ca{removed['url']}", text)
        self.assertIn("A newly revised description.", text)
        for prose in ("Keep this introduction.", "Keep these installation instructions.", "Keep this footer."):
            self.assertIn(prose, text)
        self.assertEqual(text, render_readme(text, self.categories, revised))

    def test_markdown_text_and_destinations_cannot_break_the_table(self):
        tool = copy.deepcopy(self.tools[0])
        tool.update(title="A [name] | <script>", description="First line\nSecond *line*",
                    url="https://example.com/a(b)|c")
        text = render_readme(SKELETON, self.categories, [tool])
        self.assertIn(r"A \[name\] &#124; &lt;script&gt;", text)
        self.assertIn(r"First line Second \*line\*", text)
        self.assertIn("(<https://example.com/a(b)%7Cc>)", text)
        self.assertNotIn("<script>", text)

    def test_snapshot_images_point_at_the_tool_release_and_escape_the_alt_text(self):
        tool = next(t.copy() for t in self.tools if t["hosting"] == "project" and t["access"] == "browser")
        tool.update(title="River [delta] | tides", data_date_badge=True)
        text = render_readme(SKELETON, self.categories, [tool])
        browser, install = text.split("<!-- END BROWSER_TOOLS -->", 1)
        self.assertIn(r"![Read the dataset retrieval date for River \[delta\] &#124; tides]", browser)
        self.assertIn(f"(<https://coolcode.ca{tool['url']}data-date.svg>)", browser)
        self.assertNotIn("data-date.svg", install)
        tool["data_info"] = dict(tool["data_info"], probes=[{"label": "Data retrieved", "value": "2026-11-18"}])
        text = render_readme(SKELETON, self.categories, [tool])
        self.assertIn(r"![River \[delta\] &#124; tides data retrieved 2026-11-18]", text)

    def test_missing_duplicate_reversed_and_overlapping_markers_are_rejected(self):
        malformed = [SKELETON.replace("<!-- END BROWSER_TOOLS -->", ""),
                     SKELETON + "<!-- BEGIN INSTALL_TOOLS -->",
                     SKELETON.replace("<!-- BEGIN BROWSER_TOOLS -->", "PLACEHOLDER")
                     .replace("<!-- END BROWSER_TOOLS -->", "<!-- BEGIN BROWSER_TOOLS -->")
                     .replace("PLACEHOLDER", "<!-- END BROWSER_TOOLS -->"),
                     "<!-- BEGIN BROWSER_TOOLS --><!-- BEGIN INSTALL_TOOLS -->"
                     "<!-- END BROWSER_TOOLS --><!-- END INSTALL_TOOLS -->"]
        for source in malformed:
            with self.subTest(source=source), self.assertRaises(ValueError):
                render_readme(source, self.categories, self.tools)

    def test_check_mode_fails_without_writing_and_regeneration_repairs_drift(self):
        with tempfile.TemporaryDirectory() as directory, patch("sync_readme.load_catalogue", return_value=(self.categories, self.tools)):
            root = Path(directory)
            path = root / "README.md"
            path.write_text(SKELETON)
            with self.assertRaisesRegex(ValueError, "out of sync"):
                synchronize(root, check=True)
            self.assertEqual(path.read_text(), SKELETON)
            self.assertTrue(synchronize(root))
            self.assertFalse(synchronize(root, check=True))


if __name__ == "__main__":
    unittest.main()
