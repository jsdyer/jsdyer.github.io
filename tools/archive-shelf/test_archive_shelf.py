"""Exercise Archive Shelf through its public CLI, with a real multi-page PDF."""

import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest

CLI = Path(__file__).with_name("archive_shelf.py")


def pdf_file(pages):
    """Construct a small valid PDF, with one text stream (possibly empty) per page."""
    def obj(number):
        return f"{number} 0 R".encode()

    kids = b" ".join(obj(4 + n * 2) for n in range(len(pages)))
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>",
               b"<< /Type /Pages /Count %d /Kids [ %s ] >>" % (len(pages), kids),
               b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    for n, text in enumerate(pages):
        stream = b"BT /F1 12 Tf 40 740 Td (" + text.encode("ascii") + b") Tj ET" if text else b""
        objects.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                       b"/Resources << /Font << /F1 3 0 R >> >> /Contents " + obj(5 + n * 2) + b" >>")
        objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for n, data in enumerate(objects, 1):
        offsets.append(len(out))
        out.extend(b"%d 0 obj\n" % n + data + b"\nendobj\n")
    start = len(out)
    out.extend(b"xref\n0 %d\n0000000000 65535 f \n" % len(offsets))
    for offset in offsets[1:]:
        out.extend(b"%010d 00000 n \n" % offset)
    out.extend(b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(offsets), start))
    return bytes(out)


class ShelfTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name)
        self.root = self.tmp / "collection"
        self.root.mkdir()
        self.db = self.tmp / "index.sqlite"

    def run_cli(self, *args, success=True):
        result = subprocess.run([sys.executable, str(CLI), *map(str, args), "--db", str(self.db)],
                                text=True, capture_output=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout)
        return result

    def hits(self, query):
        return json.loads(self.run_cli("search", query, "--json").stdout)

    def test_text_search_update_and_deletion(self):
        notes = self.root / "newsletter #1.md"
        notes.write_text("A small library.\fThe Dial-up service ran overnight.\n", encoding="utf-8")
        (self.root / "two.txt").write_text("Library notes.", encoding="utf-8")
        self.run_cli("index", self.root)
        self.assertEqual(self.db.stat().st_mode & 0o077, 0)
        hit, = self.hits("dial-up")
        self.assertEqual(hit["page"], 2)
        self.assertEqual(hit["path"], notes.name)
        self.assertEqual(hit["url"], notes.as_uri())
        self.assertIn("[Dial-up]", hit["snippet"])
        self.assertEqual(self.hits("dial-up OR library"), [])
        self.assertIn("unchanged 2", self.run_cli("index", self.root).stdout)
        notes.write_text("New modem installed.", encoding="utf-8")
        (self.root / "two.txt").unlink()
        self.assertIn("removed 1", self.run_cli("index", self.root).stdout)
        self.assertEqual(self.hits("library"), [])
        self.assertEqual(self.hits("dial-up"), [])
        self.assertEqual(len(self.hits("modem")), 1)

    @unittest.skipUnless(shutil.which("pdftotext"), "requires Poppler")
    def test_real_pdf_page_and_ocr(self):
        pdf = self.root / "Exchange news #2.pdf"
        pdf.write_bytes(pdf_file(["Coming soon", "", "Dial-up service opens", ""]))
        summary = self.run_cli("index", self.root).stdout
        self.assertIn("4 page(s)", summary)
        self.assertIn("page 2", summary)
        self.assertIn("page 4", summary)
        hit, = self.hits("dial up")
        self.assertEqual(hit["url"], pdf.as_uri() + "#page=3")
        self.assertEqual(hit["page"], 3)
        self.assertIn("[Dial-up]", hit["snippet"])
        ocr = self.run_cli("ocr").stdout
        self.assertIn("page 2", ocr)
        self.assertIn("page 4", ocr)
        self.assertNotIn("page 3", ocr)

    def test_failed_scan_preserves_previous_state(self):
        original = self.root / "one.txt"
        original.write_text("Keep this record.", encoding="utf-8")
        self.run_cli("index", self.root)
        original.unlink()
        (self.root / "two.txt").write_text("New record.", encoding="utf-8")
        (self.root / "broken.txt").write_bytes(b"\xff")
        failure = self.run_cli("index", self.root, success=False)
        self.assertIn("broken.txt", failure.stderr)
        self.assertIn("not committed", failure.stderr)
        self.assertEqual(len(self.hits("Keep")), 1)
        self.assertEqual(len(self.hits("New")), 0)
        (self.root / "broken.txt").unlink()
        self.run_cli("index", self.root)
        self.assertEqual(len(self.hits("Keep")), 0)

    def test_symlinks_and_collection_identity(self):
        outside = self.tmp / "outside"
        outside.mkdir()
        secret = outside / "private.txt"
        secret.write_text("Secret", encoding="utf-8")
        (self.root / "linked.txt").symlink_to(secret)
        (self.root / "subdir").symlink_to(outside, target_is_directory=True)
        self.run_cli("index", self.root)
        self.assertEqual(self.hits("secret"), [])
        failure = self.run_cli("index", outside, success=False)
        self.assertIn("another collection", failure.stderr)
        self.assertEqual(self.hits("secret"), [])

    def test_missing_or_foreign_index(self):
        self.run_cli("search", "old", success=False)
        self.assertFalse(self.db.exists())
        db = sqlite3.connect(self.db)
        db.execute("CREATE TABLE personal (id INTEGER)")
        db.commit()
        db.close()
        self.run_cli("index", self.root, success=False)
        db = sqlite3.connect(self.db)
        self.assertEqual(db.execute("SELECT name FROM sqlite_master").fetchall(), [("personal",)])
        db.close()


if __name__ == "__main__":
    unittest.main()
