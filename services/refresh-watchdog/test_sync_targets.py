import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from sync_targets import update

CONFIG = {'version':1,'targets':[{'repo':'jsdyer/example','branch':'main','workflow':'refresh.yml','crons':['17 * * * *']}]}
NOW = dt.datetime(2026,11,24,tzinfo=dt.timezone.utc)


class RegistryTests(unittest.TestCase):
    def test_new_valid_registry_is_adopted_without_reinstalling(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)/'targets.json'
            update(p, p, fetch=lambda:CONFIG.copy(), now=NOW)
            self.assertEqual(json.loads(p.read_text())['targets'],CONFIG['targets'])
            self.assertEqual(p.stat().st_mode & 0o777,0o600)

    def test_failed_or_invalid_update_keeps_last_good_targets(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)/'targets.json'
            update(p,p,fetch=lambda:CONFIG.copy(),now=NOW)
            update(p,p,fetch=lambda:{'targets':[]},now=NOW+dt.timedelta(hours=1))
            saved=json.loads(p.read_text())
            self.assertEqual(saved['targets'],CONFIG['targets'])
            self.assertNotIn('_registry_warning',saved)
            update(p,p,fetch=lambda:{'targets':[]},now=NOW+dt.timedelta(days=2))
            self.assertIn('_registry_warning',json.loads(p.read_text()))

    def test_foreign_repository_is_not_adopted(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'targets.json';p.write_text(json.dumps(CONFIG))
            bad={'version':1,'targets':[{**CONFIG['targets'][0],'repo':'other/example'}]}
            update(p,p,fetch=lambda:bad,now=NOW)
            self.assertEqual(json.loads(p.read_text())['targets'],CONFIG['targets'])
