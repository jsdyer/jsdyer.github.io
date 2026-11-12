# Archive Shelf

Search a local collection of newsletters, minutes, zines, and field notes. Each hit includes the filename, a one-based page number, a short passage with the phrase marked, and a local link. PDF links open at the matching page in viewers that support page fragments.

[Try the public sample](https://coolcode.ca/archive-shelf/) · [Read the first Field Note](https://coolcode.ca/field-notes/finding-the-dial-up-page/)

## Try the sample on Linux

Use Python 3.8 or newer with SQLite FTS5. PDF extraction uses Poppler's `pdftotext`. On Debian or Ubuntu, install the packages with `sudo apt install python3 poppler-utils git`. On Slackware, use the distribution's Python 3, SQLite, Poppler, and Git packages. Check that your Python build has FTS5 with this command.

```sh
python3 -c "import sqlite3; sqlite3.connect(':memory:').execute('CREATE VIRTUAL TABLE test USING fts5(body)')"
```

Clone the site and try its fictional three-page community bulletin. If you already have the checkout, run `git pull --ff-only` in it and start at the `mkdir` command.

```sh
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io
mkdir -p -m 700 "$HOME/.local/share/archive-shelf"
db="$HOME/.local/share/archive-shelf/sample.sqlite3"
python3 tools/archive-shelf/archive_shelf.py index archive-shelf/sample --db "$db"
python3 tools/archive-shelf/archive_shelf.py search 'dial-up' --db "$db"
python3 tools/archive-shelf/archive_shelf.py search 'tape rotation' --db "$db"
```

Open the printed PDF link to read the passage in context. The first search leads to page 2 and the second to page 3. The complete sample and its browser search run independently of your local collection.

## Index a private collection

From the repository root, set the collection to an existing directory on your machine or a mounted share. Give each collection its own database in a private directory outside your checkout and web root. The database contains extracted text and the collection's absolute path.

```sh
collection="$HOME/archives/newsletters"
db="$HOME/.local/share/archive-shelf/newsletters.sqlite3"
python3 tools/archive-shelf/archive_shelf.py index "$collection" --db "$db"
python3 tools/archive-shelf/archive_shelf.py search 'modem pool' --db "$db"
python3 tools/archive-shelf/archive_shelf.py search 'dial-up' --limit 10 --json --db "$db"
python3 tools/archive-shelf/archive_shelf.py ocr --db "$db"
```

- Search matches a word or consecutive words, case-insensitively. The default limit is 20 matching pages. `--json` returns an array with `path`, `page`, `snippet`, and `url`.
- PDFs retain their physical page numbers, which may differ from printed numbering. UTF-8 text and Markdown files count as one page unless they contain form-feed separators. Their links open the file.
- Pages without extractable PDF text appear in the OCR review list. They may be image-only scans or deliberately blank pages. To make a scanned page searchable, run your preferred OCR tool on a working copy, then re-index.
- Run `index` again after changing the collection. It reuses unchanged documents and removes entries for deleted files. If a document fails to read or extract, fix it and retry. A failed scan leaves the previous successful index available.
- The indexer skips symbolic links. If you move the collection root, build a fresh index at another database path. All local operations work offline.

## Run the tests

From the repository root:

```sh
python3 -m unittest discover -s tools/archive-shelf -p 'test_*.py'
```
