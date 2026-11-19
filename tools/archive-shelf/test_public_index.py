"""Keep the public page citations aligned with the checked-in original issues."""
import json
import re
import shutil
import unittest

import build_public_index as public


@unittest.skipUnless(shutil.which("pdftotext"), "requires Poppler")
class PublicIndexTest(unittest.TestCase):
    def test_published_index_and_issue_links_match_sources(self):
        for path, expected in public.generate().items():
            self.assertEqual(path.read_text(encoding="utf-8"), expected, path.name)
        script = (public.SHELF / "archive-pages.js").read_text(encoding="utf-8")
        issues = json.loads(script[len("const archiveIssues = "):-2])
        self.assertEqual(sum(len(issue["pages"]) for issue in issues), 75)
        hits = [(issue["date"], page) for issue in issues
                for page, text in enumerate(issue["pages"], 1)
                if re.search(r"\bdial\W+up\b", text, re.IGNORECASE)]
        self.assertEqual(hits, [("2001-07-26", 2), ("2003-09-23", 5), ("2006-08-15", 7)])
