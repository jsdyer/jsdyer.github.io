from pathlib import Path
import sys
import tempfile
import unittest
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import write_search_files


class SearchFilesTests(unittest.TestCase):
    def test_sitemap_uses_public_routes_and_published_articles(self):
        tools = [
            {"access": "browser", "hosting": "project", "url": "/from-another-repo/"},
            {"access": "browser", "hosting": "local", "url": "/shared/", "install_url": "https://github.com/example"},
            {"access": "install", "hosting": "external", "url": "https://github.com/example/install"},
            {"access": "browser", "hosting": "external", "url": "https://example.org/widget"},
        ]
        with tempfile.TemporaryDirectory() as temp:
            stage = Path(temp)
            for path in ["field-notes", "field-notes/reading", "admin", "tools/example"]:
                (stage / path).mkdir(parents=True)
                (stage / path / "index.html").write_text("<!doctype html>")
            write_search_files(stage, tools)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            sitemap = ElementTree.parse(stage / "sitemap.xml")
            self.assertEqual(
                [el.text for el in sitemap.findall("s:url/s:loc", ns)],
                ["https://coolcode.ca" + path for path in
                 ["/", "/field-notes/", "/field-notes/reading/", "/from-another-repo/", "/shared/"]],
            )
            self.assertEqual((stage / "robots.txt").read_text().splitlines(),
                             ["User-agent: *", "Allow: /", "Sitemap: https://coolcode.ca/sitemap.xml"])
