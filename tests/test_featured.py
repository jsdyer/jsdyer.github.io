import copy
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import load_catalogue, render_featured, validate_featured


class CardLinks(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.lineup = "a"
        self.links = {"a": [], "b": []}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "template":
            self.lineup = "b"
        if "data-featured-tool" in attrs:
            self.links[self.lineup].append((attrs["data-featured-tool"], attrs["href"]))


class FeaturedTests(unittest.TestCase):
    def setUp(self):
        self.categories, self.tools = load_catalogue()
        self.config = {"mode": "fixed", "experiment": "autumn",
                       "a": ["atip", "eventradar", "nightfinder", "dnslens"],
                       "b": ["dnslens", "nightfinder", "eventradar", "atip"]}

    def test_four_configured_links_in_static_html_and_alternative_in_template_only(self):
        for mode in ("fixed", "ab"):
            with self.subTest(mode=mode):
                self.config["mode"] = mode
                html = render_featured(self.config, self.categories, self.tools)
                links = CardLinks(html).links
                for variant in ("a", "b"):
                    ids = [] if mode == "fixed" and variant == "b" else self.config[variant]
                    self.assertEqual(links[variant], [(tid, f"/{tid}/") for tid in ids])
                self.assertIn('data-variant="a"', html)
                self.assertEqual('<template id="featured-lineup-b">' in html, mode == "ab")

    def test_details_follow_catalogue(self):
        tool = next(t for t in self.tools if t["id"] == "atip")
        tool.update(description="Find A & B.", data_info={
            "mode": "snapshot", "detail": "Catalogue <source>.", "probes": [
                {"label": "Data retrieved", "value": "2026-11-19"}]})
        html = render_featured(self.config, self.categories, self.tools)
        self.assertIn("Find A &amp; B.", html)
        self.assertIn("Catalogue &lt;source&gt;.", html)
        self.assertIn('<time datetime="2026-11-19">', html)

    def test_reject_invalid_modes_experiments_and_lineups(self):
        for field, value in (("mode", "other"), ("experiment", "'"), ("experiment", "a" * 49),
                             ("a", "atip"), ("a", self.config["a"][:3]),
                             ("b", ["atip"] * 4), ("b", ["dnslens", "atip", "nightfinder", "lanwatch"]),
                             ("b", ["dnslens", "atip", "nightfinder", "unknown"])):
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                validate_featured(dict(self.config, **{field: value}), self.tools)
        invalid = copy.copy(self.config)
        del invalid["b"]
        with self.assertRaisesRegex(ValueError, "requires mode"):
            validate_featured(invalid, self.tools)
        with self.assertRaisesRegex(ValueError, "different"):
            validate_featured(dict(self.config, mode="ab", b=self.config["a"]), self.tools)
