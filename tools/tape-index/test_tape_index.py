"""Exercise Tape Index through its Linux command-line interface."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("tape_index.py")


class TapeIndexTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.collection = self.root / "collection"
        self.collection.mkdir()
        self.manifest = self.root / "catalog.json"

    def cli(self, command, collection=None, manifest=None):
        return subprocess.run(
            [sys.executable, SCRIPT, command, collection or self.collection,
             manifest or self.manifest], capture_output=True, text=True
        )

    def test_copies_and_changes(self):
        photo = self.collection / "prints" / "one.tif"
        photo.parent.mkdir()
        photo.write_bytes(b"abc")
        lost = self.collection / "lost.txt"
        lost.write_text("missing")
        self.assertEqual(self.cli("create").returncode, 0)
        entry = json.loads(self.manifest.read_text())["files"]["prints/one.tif"]
        self.assertEqual(entry, {"bytes": 3, "sha256":
                         "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"})
        timestamp = photo.stat()
        photo.write_bytes(b"abd")
        os.utime(photo, ns=(timestamp.st_atime_ns, timestamp.st_mtime_ns))
        lost.unlink()
        (self.collection / "new.txt").touch()
        result = self.cli("verify")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout.splitlines(), [
            'MISSING "lost.txt"', 'ADDED "new.txt"', 'CHANGED "prints/one.tif"', "3 difference(s)."
        ])

    def test_ignores_links_and_verifies_relocated_collection(self):
        (self.collection / "sample.wav").write_bytes(b"sound")
        (self.collection / "elsewhere").symlink_to(self.root, target_is_directory=True)
        (self.collection / "link").symlink_to("/missing")
        os.mkfifo(self.collection / "pipe")
        self.assertEqual(self.cli("create").returncode, 0)
        relocated = self.root / "relocated"
        self.collection.rename(relocated)
        result = self.cli("verify", collection=relocated)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "Verified 1 file(s).")

    def test_refuses_output_inside_archive_and_existing_baselines(self):
        alias = self.root / "alias"
        alias.symlink_to(self.collection, target_is_directory=True)
        self.assertEqual(self.cli("create", manifest=alias / "bad.json").returncode, 2)
        self.assertFalse((self.collection / "bad.json").exists())
        self.manifest.symlink_to(self.collection / "bad.json")
        self.assertEqual(self.cli("create").returncode, 2)
        self.assertTrue(self.manifest.is_symlink())
        self.manifest.unlink()
        self.assertEqual(self.cli("create").returncode, 0)
        previous = self.manifest.read_bytes()
        (self.collection / "added").touch()
        self.assertEqual(self.cli("create").returncode, 2)
        self.assertEqual(self.manifest.read_bytes(), previous)

    def test_corrupt_manifest_or_missing_collection(self):
        self.manifest.write_text('{"format": "tape-index-v1", "files": {}, "files": {}}')
        result = self.cli("verify")
        self.assertEqual(result.returncode, 2)
        self.assertIn("duplicate manifest key", result.stderr)
        self.collection.rmdir()
        self.assertEqual(self.cli("verify").returncode, 2)


if __name__ == "__main__":
    unittest.main()
