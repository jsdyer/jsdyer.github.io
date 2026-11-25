import json
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sync_operations import outputs, sync
from check_integration import check_built, manual_source_receipt, receipt_source, verify_source_receipt


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.tools = json.loads((ROOT / 'data/tools.json').read_text())
        self.registry = json.loads((ROOT / 'data/operations/repositories.json').read_text())
        self.overrides = json.loads((ROOT / 'data/operations/freshness.json').read_text())

    def test_committed_outputs_are_current(self):
        sync(ROOT, check=True)

    def test_scheduled_data_workflows_have_published_timestamp_checks(self):
        # The six non-data jobs are explained in services/refresh-watchdog/README.md.
        workflow_only = {
            'jsdyer/atlanticdial/station-schedules.yml',
            'jsdyer/donairafterdark/watch.yml',
            'jsdyer/jsdyer.github.io/canada-probes.yml',
            'jsdyer/jsdyer.github.io/catalogue-audit.yml',
            'jsdyer/jsdyer.github.io/catalogue-freshness.yml',
            'jsdyer/jsdyer.github.io/service-monitor.yml',
        }
        generated = outputs(ROOT, self.tools, self.registry, self.overrides)
        targets = json.loads(generated['services/refresh-watchdog/targets.json'])['targets']
        missing = {f"{t['repo']}/{t['workflow']}" for t in targets if not t.get('freshness')}
        self.assertEqual(missing, workflow_only,
                         'Add reviewed published timestamp probes for new data workflows.')

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


class DeploymentReceiptTests(unittest.TestCase):
    def test_dashboard_final_newline_variation_is_explicit_and_narrow(self):
        code = b'export default {};\n'
        receipt = {'source_sha256': hashlib.sha256(code[:-1]).hexdigest(), 'source_transform': 'remove-final-newline'}
        verify_source_receipt(code, receipt)
        with self.assertRaises(ValueError):
            verify_source_receipt(b'export default {changed:true};\n', receipt)
        with self.assertRaises(ValueError):
            verify_source_receipt(code + b'\n', receipt)
        with self.assertRaises(ValueError):
            verify_source_receipt(code, {**receipt, 'source_transform': 'ignore-whitespace'})
        with self.assertRaises(ValueError):
            verify_source_receipt(code, {'source_sha256': receipt['source_sha256']})

    def test_audited_list_order_comments_and_final_newline_preserve_exact_live_hash(self):
        generated = b'// generated\nconst toolList = [\n  "alpha",\n  "beta"\n];\nexport default {};\n'
        literal = '[\n  "beta", // manually added\n  "alpha",\n]'
        for ending in (b'\n', b''):
            downloaded = b'// generated\nconst toolList = ' + literal.encode() + b';\nexport default {};' + ending
            with self.subTest(final_lf=bool(ending)):
                receipt = manual_source_receipt(generated, downloaded)
                self.assertEqual(receipt['source_sha256'], hashlib.sha256(downloaded).hexdigest())
                self.assertEqual(receipt['tool_list_literal'], literal)
                self.assertEqual(receipt['remove_final_newline'], not bool(ending))
                self.assertEqual(receipt_source(generated, receipt), downloaded)
                verify_source_receipt(generated, receipt)

    def test_recorded_list_cannot_change_membership_or_contain_executable_tokens(self):
        generated = b'const toolList = ["alpha", "beta"];\nexport default {};\n'
        bad_literals = [
            '["alpha", "alpha", "beta"]', '["alpha"]', '["alpha", "beta", "extra"]',
            '["alpha", ...otherIds]', '["alpha", getId()]', '["alpha" + "beta"]',
            '["alpha",, "beta"]', '["alpha" "beta"]', '["alpha", "beta"]; alert(1)',
            '["alpha", /* unsupported block */ "beta"]', '["alpha", // comment\u2028 "beta"]',
            '["alpha", "beta"] // trailing code', '["alpha", "\\u0062eta"]',
        ]
        for literal in bad_literals:
            with self.subTest(literal=literal), self.assertRaises(ValueError):
                manual_source_receipt(generated, b'const toolList = ' + literal.encode() + b';\nexport default {};\n')
        with self.assertRaises(ValueError):
            manual_source_receipt(generated.replace(b'"alpha", "beta"', b'"alpha", "alpha"'), generated)

    def test_recorded_list_does_not_ignore_outside_code_or_newline_changes(self):
        generated = b'const toolList = ["alpha", "beta"];\nexport default {};\n'
        downloaded = b'const toolList = ["beta", "alpha",];\nexport default {};'
        receipt = manual_source_receipt(generated, downloaded)
        for changed in (generated.replace(b'export default {};', b'export default {changed:true};'),
                        generated.replace(b';\nexport', b'; \nexport'), generated + b'\n'):
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                verify_source_receipt(changed, receipt)
        with self.assertRaises(ValueError):
            manual_source_receipt(generated, downloaded.replace(b'export default {};', b'export default {changed:true};'))
        with self.assertRaises(ValueError):
            manual_source_receipt(generated, downloaded.replace(b';\nexport', b';\r\nexport'))

    def test_recorded_list_receipt_rejects_ambiguous_declarations_and_flags(self):
        generated = b'const toolList = ["alpha", "beta"];\nexport default {};\n'
        downloaded = b'const toolList = ["beta", "alpha"];\nexport default {};'
        receipt = manual_source_receipt(generated, downloaded)
        for flag in (None, 'false', 0):
            with self.subTest(flag=flag), self.assertRaises(ValueError):
                verify_source_receipt(generated, {**receipt, 'remove_final_newline': flag})
        with self.assertRaises(ValueError):
            verify_source_receipt(generated + b'const toolList = ["alpha", "beta"];\n', receipt)
        with self.assertRaises(ValueError):
            verify_source_receipt(generated, {**receipt, 'source_sha256': '0' * 64})
