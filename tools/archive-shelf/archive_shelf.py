#!/usr/bin/env python3
"""Build and search a local, page-level index of PDF and UTF-8 text collections."""

import argparse
import json
import os
from pathlib import Path
import sqlite3
import stat
import subprocess
import sys

APP_ID = 0x41534846
EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}


def collection_root(db):
    if db.execute("PRAGMA application_id").fetchone()[0] != APP_ID:
        raise ValueError("This database is not an Archive Shelf index.")
    if db.execute("PRAGMA user_version").fetchone()[0] != 1:
        raise ValueError("This index was created by an unsupported version of Archive Shelf.")
    return Path(db.execute("SELECT root FROM collection").fetchone()[0])


def prepare(db, root):
    if db.execute("PRAGMA application_id").fetchone()[0] == 0 and not db.execute(
        "SELECT 1 FROM sqlite_master LIMIT 1"
    ).fetchone():
        db.execute("CREATE TABLE collection (root TEXT NOT NULL)")
        db.execute("INSERT INTO collection VALUES (?)", (str(root),))
        db.execute("CREATE TABLE documents (id INTEGER PRIMARY KEY, path TEXT UNIQUE, signature TEXT)")
        db.execute("""CREATE TABLE pages (
            id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL,
            number INTEGER NOT NULL, review INTEGER NOT NULL)""")
        db.execute("CREATE INDEX pages_by_document ON pages(document_id)")
        db.execute("CREATE VIRTUAL TABLE searchable USING fts5(body, tokenize='unicode61')")
        db.execute(f"PRAGMA application_id = {APP_ID}")
        db.execute("PRAGMA user_version = 1")
    if collection_root(db) != root:
        raise ValueError("This index belongs to another collection. Choose a separate --db path.")


def extract(source, suffix):
    if suffix == ".pdf":
        try:
            proc = subprocess.run(["pdftotext", "-enc", "UTF-8", "-", "-"],
                                  stdin=source, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except FileNotFoundError as error:
            raise ValueError("PDF indexing requires pdftotext from Poppler.") from error
        if proc.returncode:
            reason = proc.stderr.decode("utf-8", errors="replace").strip()
            raise ValueError(reason or f"pdftotext exited with status {proc.returncode}")
        text = proc.stdout.decode("utf-8")
        # Poppler emits one form feed per physical page, including blank pages.
        if text.endswith("\f"):
            text = text[:-1]
    else:
        text = source.read().decode("utf-8-sig")
    return text.split("\f")


def discard_pages(db, doc_id):
    db.execute("DELETE FROM searchable WHERE rowid IN (SELECT id FROM pages WHERE document_id=?)",
               (doc_id,))
    db.execute("DELETE FROM pages WHERE document_id=?", (doc_id,))


def fingerprint(info):
    return ":".join(str(n) for n in (info.st_dev, info.st_ino, info.st_size,
                                     info.st_mtime_ns, info.st_ctime_ns))


def index_file(db, relative, suffix, source, old):
    signature = fingerprint(os.fstat(source.fileno()))
    if old and old[1] == signature:
        return False
    bodies = extract(source, suffix)
    if fingerprint(os.fstat(source.fileno())) != signature:
        raise ValueError("File changed during extraction. Retry once it is stable.")
    if old:
        doc_id = old[0]
        discard_pages(db, doc_id)
        db.execute("UPDATE documents SET signature=? WHERE id=?", (signature, doc_id))
    else:
        doc_id = db.execute("INSERT INTO documents(path, signature) VALUES (?, ?)",
                            (relative, signature)).lastrowid
    for number, body in enumerate(bodies, start=1):
        review = suffix == ".pdf" and not body.strip()
        page_id = db.execute("INSERT INTO pages(document_id, number, review) VALUES (?, ?, ?)",
                             (doc_id, number, review)).lastrowid
        if body.strip():
            db.execute("INSERT INTO searchable(rowid, body) VALUES (?, ?)", (page_id, body))
    return True


def show_review(db):
    rows = db.execute("""SELECT d.path, p.number FROM pages p
        JOIN documents d ON p.document_id=d.id WHERE p.review=1 ORDER BY d.path,p.number""")
    for path, page in rows:
        print(f"OCR review: {path} (page {page}) — no extracted text")


def build(args):
    if args.collection.is_symlink() or not args.collection.is_dir():
        raise ValueError("Choose a collection directory, without a symlink as the root.")
    root = args.collection.resolve()
    db_path = args.db.resolve()
    errors = []
    # The index contains document text, so create new indexes owner-only.
    try:
        fd = os.open(db_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        pass
    else:
        os.close(fd)
    db = sqlite3.connect(db_path, timeout=30)
    try:
        db.execute("BEGIN IMMEDIATE")
        prepare(db, root)
        old = {path: (doc_id, signature) for path, doc_id, signature in
               db.execute("SELECT path,id,signature FROM documents")}
        changed = kept = 0
        for directory, _, files, dir_fd in os.fwalk(root, onerror=errors.append):
            for name in sorted(files):
                path = Path(directory) / name
                suffix = path.suffix.lower()
                if suffix not in EXTENSIONS or path == db_path:
                    continue
                relative = path.relative_to(root).as_posix()
                try:
                    info = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
                    if not stat.S_ISREG(info.st_mode):
                        continue
                    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=dir_fd)
                    with os.fdopen(fd, "rb") as source:
                        if not stat.S_ISREG(os.fstat(fd).st_mode):
                            raise ValueError("File type changed during indexing.")
                        modified = index_file(db, relative, suffix, source, old.pop(relative, None))
                    if modified:
                        changed += 1
                    else:
                        kept += 1
                except (OSError, ValueError) as error:
                    errors.append(f"{relative}: {error}")
        if errors:
            for error in errors:
                print(error, file=sys.stderr)
            raise ValueError("Indexing failed. This scan was not committed.")
        for doc_id, _ in old.values():
            discard_pages(db, doc_id)
            db.execute("DELETE FROM documents WHERE id=?", (doc_id,))
        pages = db.execute("SELECT count(*) FROM pages").fetchone()[0]
        db.commit()
        print(f"Indexed {changed + kept} document(s), {pages} page(s). "
              f"Updated {changed}, unchanged {kept}, removed {len(old)}.")
        show_review(db)
    finally:
        db.close()


def search(db, root, args):
    query = args.query.strip()
    if not query or "\x00" in query:
        raise ValueError("Enter a non-empty search phrase.")
    if not 1 <= args.limit <= 1000:
        raise ValueError("--limit must be between 1 and 1000.")
    # Quoting makes input literal FTS terms, including hyphenated words.
    phrase = '"' + query.replace('"', '""') + '"'
    rows = db.execute("""SELECT d.path, p.number, snippet(searchable, 0, '[', ']', ' … ', 24)
        FROM searchable JOIN pages p ON p.id=searchable.rowid
        JOIN documents d ON d.id=p.document_id WHERE searchable MATCH ?
        ORDER BY bm25(searchable), d.path, p.number LIMIT ?""", (phrase, args.limit))
    hits = []
    for path, page, snippet in rows:
        url = (root / path).as_uri()
        if Path(path).suffix.lower() == ".pdf":
            url += f"#page={page}"
        hits.append(dict(path=path, page=page, snippet=" ".join(snippet.split()), url=url))
    if args.json:
        print(json.dumps(hits, ensure_ascii=False, indent=2))
    elif hits:
        for hit in hits:
            print(f"{hit['path']}  (page {hit['page']})\n  {hit['snippet']}\n  {hit['url']}")
    else:
        print("No matching pages.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    index = subs.add_parser("index", help="Index or refresh a collection")
    index.add_argument("collection", type=Path)
    find = subs.add_parser("search", help="Search for a word or phrase")
    find.add_argument("query")
    find.add_argument("--limit", type=int, default=20)
    find.add_argument("--json", action="store_true")
    ocr = subs.add_parser("ocr", help="List PDF pages with no extracted text")
    for sub in (index, find, ocr):
        sub.add_argument("--db", type=Path, required=True, help="Path to the private SQLite index")
    args = parser.parse_args()
    try:
        if args.command == "index":
            build(args)
        else:
            db = sqlite3.connect(args.db.resolve().as_uri() + "?mode=ro", uri=True)
            try:
                root = collection_root(db)
                if args.command == "search":
                    search(db, root, args)
                else:
                    show_review(db)
            finally:
                db.close()
    except (OSError, ValueError, sqlite3.Error) as error:
        print(f"Archive Shelf: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
