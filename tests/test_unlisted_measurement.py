import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from measurement import measurement_ids, unlisted_tools


class UnlistedMeasurementTests(unittest.TestCase):
    def test_unlisted_id_is_measured_without_becoming_public(self):
        public = json.loads((ROOT / 'data/tools.json').read_text())
        self.assertNotIn('townheritage', {t['id'] for t in public})
        self.assertIn('townheritage', measurement_ids(ROOT, public))

    def test_duplicate_or_public_identity_is_rejected(self):
        row = {'id': 'review', 'title': 'Review prototype', 'source': 'https://github.com/jsdyer/review'}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root / 'data').mkdir()
            path = root / 'data/unlisted-tools.json'
            path.write_text(json.dumps([row, row]))
            with self.assertRaises(ValueError): unlisted_tools(root, [])
            path.write_text(json.dumps([row]))
            with self.assertRaises(ValueError): unlisted_tools(root, [{'id': 'review'}])

    def test_empty_unlisted_registry_is_supported(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(measurement_ids(Path(directory), [{'id': 'public'}]), ['public'])
