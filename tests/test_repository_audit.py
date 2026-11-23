import sys
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from audit_repositories import audit, fetch_repositories


class RepositoryAuditTests(unittest.TestCase):
    def test_all_pages_are_read(self):
        calls = []
        def fetch(url):
            page = int(parse_qs(urlsplit(url).query)["page"][0])
            calls.append(page)
            start = (page - 1) * 100
            return [{"name": f"repo-{i}"} for i in range(start, min(start + 100, 224))]
        self.assertEqual(len(fetch_repositories("jsdyer", fetch)), 224)
        self.assertEqual(calls, [1, 2, 3])

    def test_failed_or_repeated_page_does_not_become_complete_inventory(self):
        with self.assertRaisesRegex(ValueError, "Repeated"):
            fetch_repositories("jsdyer", lambda _: [{"name": f"repo-{i}"} for i in range(100)])
        with self.assertRaisesRegex(ValueError, "repository list"):
            fetch_repositories("jsdyer", lambda _: {"message": "rate limited"})

    def test_missing_tool_starters_private_and_shared_repo_are_distinct(self):
        repos = [{"name": name} for name in ["hub", "new-tool", "starter"]]
        repos += [{"name": "private-name", "visibility": "private"}]
        tools = [{"source": "https://github.com/jsdyer/hub/tree/main/a"},
                 {"source": "https://github.com/jsdyer/hub/tree/main/b"}]
        exclusions = [{"repo": "starter", "status": "starter", "reason": "No implemented tool", "reviewed_at": "2026-11-23"}]
        report = audit(repos, tools, exclusions)
        self.assertEqual(report["listed_source_repositories"], 1)
        self.assertEqual(report["catalogue_tools"], 2)
        self.assertEqual([item["repo"] for item in report["needs_review"]], ["new-tool"])
        self.assertEqual(report["excluded"], exclusions)
        self.assertEqual(report["private_repositories_omitted"], 1)
        self.assertNotIn("private-name", str(report))

    def test_previously_excluded_repo_becoming_listed_requires_cleanup(self):
        report = audit([{"name": "ready"}], [{"source": "https://github.com/jsdyer/ready"}],
                       [{"repo": "ready", "status": "starter", "reason": "Was incomplete", "reviewed_at": "2026-11-22"}])
        self.assertEqual(report["stale_exclusions"], ["ready"])
        self.assertEqual(report["needs_review"], [])
