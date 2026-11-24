import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sync_operations import outputs, sync
from check_integration import check_built


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.tools = json.loads((ROOT / 'data/tools.json').read_text())
        self.registry = json.loads((ROOT / 'data/operations/repositories.json').read_text())
        self.overrides = json.loads((ROOT / 'data/operations/freshness.json').read_text())

    def test_committed_outputs_are_current(self):
        sync(ROOT, check=True)

    def test_new_repository_cannot_be_forgotten(self):
        self.tools.append({'id': 'another-real-tool', 'source': 'https://github.com/jsdyer/another-real-tool'})
        with self.assertRaisesRegex(ValueError, 'Repository coverage'):
            outputs(ROOT, self.tools, self.registry, self.overrides)

    def test_new_tool_flows_to_worker_and_watchdog_from_one_registration(self):
        self.tools.append({'id': 'another-real-tool', 'source': 'https://github.com/jsdyer/another-real-tool'})
        self.registry.append({'repo': 'jsdyer/another-real-tool', 'branch': 'main',
                              'workflows': [{'workflow': 'collect.yml', 'crons': ['17 * * * *'], 'inputs': {}}],
                              'guarded_paths': ['.github/workflows/collect.yml', '.github/workflows/schedule-guard.yml']})
        result = outputs(ROOT, self.tools, self.registry, self.overrides)
        self.assertIn('"another-real-tool"', result['services/cloudflare-visitor/worker.js'])
        targets = json.loads(result['services/refresh-watchdog/targets.json'])['targets']
        self.assertTrue(any(t['repo'] == 'jsdyer/another-real-tool' for t in targets))

    def test_removed_workflow_cannot_leave_stale_freshness_or_guard(self):
        item = next(r for r in self.registry if r['repo'] == 'jsdyer/translink')
        item['workflows'] = []
        item['guarded_paths'] = []
        with self.assertRaisesRegex(ValueError, 'Orphaned'):
            outputs(ROOT, self.tools, self.registry, self.overrides)

    def test_guard_must_cover_every_scheduled_workflow(self):
        item = next(r for r in self.registry if r['workflows'])
        item['guarded_paths'] = ['.github/workflows/schedule-guard.yml']
        with self.assertRaisesRegex(ValueError, 'guard allowlist'):
            outputs(ROOT, self.tools, self.registry, self.overrides)

    def test_removed_workflow_cannot_remain_in_guard(self):
        item = next(r for r in self.registry if r['workflows'])
        item['workflows'] = []
        with self.assertRaisesRegex(ValueError, 'guard allowlist'):
            outputs(ROOT, self.tools, self.registry, self.overrides)

    def test_overrides_cannot_redirect_dispatch(self):
        key = next(iter(self.overrides))
        self.overrides[key]['repo'] = 'another-owner/repo'
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            outputs(ROOT, self.tools, self.registry, self.overrides)


class BuiltIntegrationTests(unittest.TestCase):
    def test_built_routes_and_public_catalogue_include_new_tool(self):
        tool = {'id': 'new-tool', 'title': 'New tool', 'access': 'browser',
                'hosting': 'project', 'url': '/new-tool/', 'source': 'https://github.com/jsdyer/new-tool'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'dist/assets').mkdir(parents=True)
            sitemap = root / 'dist/sitemap.xml'
            sitemap.write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://coolcode.ca/new-tool/</loc></url></urlset>')
            catalog = root / 'dist/assets/tool-catalog.json'
            catalog.write_text(json.dumps([tool]))
            check_built(root, [tool])
            catalog.write_text('[]')
            with self.assertRaisesRegex(ValueError, 'catalogue differs'):
                check_built(root, [tool])
            catalog.write_text(json.dumps([tool]))
            sitemap.write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')
            with self.assertRaisesRegex(ValueError, 'missing public tool routes'):
                check_built(root, [tool])
