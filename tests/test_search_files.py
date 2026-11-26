from pathlib import Path
import sys
import tempfile
import unittest
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import render_datasets, source_check_time, write_search_files


class SearchFilesTests(unittest.TestCase):
    def test_scheduled_source_checks(self):
        self.assertEqual(source_check_time("23 10 * * *"), "Daily at 10:23 UTC")
        self.assertEqual(source_check_time("38 9 * * 3"), "Each Wednesday at 09:38 UTC")
        self.assertEqual(source_check_time("24 14 6 * *"), "Day 6 of each month at 14:24 UTC")
        for unsupported in ("0 36 * * *", "9 8 5 * 3", "0 */6 * * *"):
            self.assertIsNone(source_check_time(unsupported))

    def test_multi_file_dataset_links_to_explanatory_download_section(self):
        tools = [{"id": "example", "url": "/example/", "title": "Example",
                  "data_info": {"detail": "A group of source files."},
                  "dataset": {"title": "Research snapshot", "section": "dataset"}}]
        page = render_datasets("{{DATASET_ENTRIES}}", tools)
        self.assertIn('href="/example/#dataset"', page)
        self.assertIn("Source files and download formats", page)
        self.assertNotIn("manifest.json", page)

    def test_sitemap_uses_public_routes_and_published_articles(self):
        tools = [
            {"access": "browser", "hosting": "project", "url": "/from-another-repo/",
             "result_directory": {"title": "Records", "path": "records/"},
             "use_cases": [{"title": "Ready example", "path": "common/"}]},
            {"access": "browser", "hosting": "local", "url": "/shared/", "install_url": "https://github.com/example"},
            {"access": "install", "hosting": "external", "url": "https://github.com/example/install"},
            {"access": "browser", "hosting": "external", "url": "https://example.org/widget"},
        ]
        with tempfile.TemporaryDirectory() as temp:
            stage = Path(temp)
            for path in ["datasets", "topics/money", "field-notes", "field-notes/reading", "admin", "tools/example"]:
                (stage / path).mkdir(parents=True)
                (stage / path / "index.html").write_text("<!doctype html>")
            write_search_files(stage, tools)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            index = ElementTree.parse(stage / "sitemap.xml")
            self.assertEqual([node.text for node in index.findall("s:sitemap/s:loc", ns)],
                             ["https://coolcode.ca/sitemap-pages.xml", "https://coolcode.ca/from-another-repo/sitemap.xml"])
            sitemap = ElementTree.parse(stage / "sitemap-pages.xml")
            self.assertEqual(
                [el.text for el in sitemap.findall("s:url/s:loc", ns)],
                ["https://coolcode.ca" + path for path in
                 ["/", "/datasets/", "/field-notes/", "/field-notes/reading/", "/from-another-repo/", "/from-another-repo/common/", "/shared/", "/topics/money/"]],
            )
            self.assertEqual((stage / "robots.txt").read_text().splitlines(),
                             ["User-agent: *", "Allow: /", "Sitemap: https://coolcode.ca/sitemap.xml"])

    def test_collection_links_separate_tool_section_and_direct_download(self):
        tools = [{"id": "example", "url": "/example/", "title": "Example", "data_info": {"detail": "Published rates."},
                  "dataset": {"title": "Rate series", "file": "data/rates.csv", "format": "CSV", "section": "rates"}},
                 {"id": "calculator"}]
        page = render_datasets("{{DATASET_ENTRIES}}", tools)
        self.assertIn('href="/example/#rates"', page)
        self.assertIn('href="/example/data/rates.csv"', page)
        self.assertNotIn("calculator", page)

    def test_project_result_sitemap_rejects_other_origins_and_input_permutations(self):
        from audit_result_maps import result_urls
        prefix = "https://coolcode.ca/parks/places/"
        def document(child):
            return ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'
                    + prefix + '</loc></url><url><loc>' + child + '</loc></url></urlset>')
        self.assertEqual(result_urls(document(prefix + "jasper/"), prefix), [prefix, prefix + "jasper/"])
        for invalid in ("https://other.example/parks/", prefix + "?q=me", prefix + "../private/", prefix):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                result_urls(document(invalid), prefix)
