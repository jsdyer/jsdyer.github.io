"""Run from this directory with: python3 -m unittest discover -s tests -v"""

import sqlite3
import tempfile
import unittest
from pathlib import Path

import lanwatch


class LanwatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = lanwatch.connect(Path(self.tmp.name) / "state.sqlite3")

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def test_valid_and_invalid_targets(self):
        for target in ("192.168.1.1", "2001:db8::1", "my-nas.local", "router.home.arpa"):
            self.assertEqual(lanwatch.validate_target(target), target)
        for target in ("-Ieth0", "https://example.com", "a..b", "name with spaces", ""):
            with self.assertRaises(ValueError):
                lanwatch.validate_target(target)

    def test_only_records_state_transitions(self):
        lanwatch.add_device(self.conn, "router", "192.168.1.1")
        result = iter([(True, 1.3), (True, 1.0), (False, None)])
        probe = lambda _target, _timeout: next(result)
        for _ in range(3):
            lanwatch.run_check(self.conn, 1, 1, probe=probe)
        samples = self.conn.execute("SELECT online FROM samples ORDER BY id").fetchall()
        events = self.conn.execute("SELECT kind, online FROM events ORDER BY id").fetchall()
        self.assertEqual([r["online"] for r in samples], [1, 1, 0])
        self.assertEqual([(r["kind"], r["online"]) for r in events], [("initial", 1), ("change", 0)])

    def test_upsert_and_remove(self):
        lanwatch.add_device(self.conn, "nas", "nas.local")
        lanwatch.add_device(self.conn, "nas", "192.168.1.40")
        rows = self.conn.execute("SELECT target FROM devices").fetchall()
        self.assertEqual([r["target"] for r in rows], ["192.168.1.40"])
        self.conn.execute("DELETE FROM devices WHERE name='nas'")
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
