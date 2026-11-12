#!/usr/bin/env python3
"""Exercise the real HTTP API with only Python's standard library.

Default: create an isolated SQLite archive and PHP development server.
Set TIMEFOLD_TEST_DSN, TIMEFOLD_TEST_DB_USER, TIMEFOLD_TEST_DB_PASSWORD to
exercise a dedicated MySQL/MariaDB test database instead. Never use a live
archive for these variables. An existing disposable server can be supplied via
TIMEFOLD_TEST_BASE_URL and TIMEFOLD_TEST_PASSWORD.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent.parent
PASSWORD = os.environ.get("TIMEFOLD_TEST_PASSWORD", "Timefold-integration-7b8c43a6")
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR5kAAAAASUVORK5CYII=")


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


class Browser:
    def __init__(self, base: str):
        self.base = base.rstrip("/")
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self.csrf = ""

    def request(self, action: str, *, data: bytes | None = None,
                content_type: str | None = None, csrf: bool = True,
                expected: int = 200) -> tuple[bytes, object]:
        headers = {}
        if content_type:
            headers["Content-Type"] = content_type
        if data is not None and csrf:
            headers["X-CSRF-Token"] = self.csrf
        request = urllib.request.Request(
            f"{self.base}/api.php?action={action}", data=data, headers=headers
        )
        try:
            response = self.opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        check(response.code == expected,
              f"{action}: expected HTTP {expected}, got {response.code}: {body[:250]!r}")
        return body, response.headers

    def json(self, action: str, value: object | None = None, **kwargs):
        data = None if value is None else json.dumps(value).encode()
        body, _ = self.request(action, data=data,
                               content_type="application/json" if data is not None else None,
                               **kwargs)
        return json.loads(body)

    def multipart(self, action: str, fields: dict[str, str],
                  files: dict[str, tuple[str, bytes, str]] | None = None, **kwargs):
        boundary = "timefold-test-" + uuid.uuid4().hex
        parts = []
        for name, value in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'.encode() + value.encode() + b"\r\n")
        for name, (filename, content, mime) in (files or {}).items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        body, _ = self.request(action, data=b"".join(parts),
                               content_type=f"multipart/form-data; boundary={boundary}", **kwargs)
        return json.loads(body)

    def capsules(self):
        return self.json("list")["capsules"]


def unused_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def exercise(base: str) -> None:
    browser = Browser(base)
    session = browser.json("session")
    check(session["authenticated"] is False, "fresh session is anonymous")
    browser.csrf = session["csrf"]
    check(bool(browser.csrf), "anonymous sessions receive a CSRF token for login")
    browser.json("list", expected=401)
    browser.json("export", expected=401)
    browser.json("login", {"password": PASSWORD}, csrf=False, expected=403)
    browser.json("login", {"password": "definitely-incorrect"}, expected=401)
    anonymous_csrf = browser.csrf
    browser.json("login", {"password": PASSWORD})
    session = browser.json("session")
    check(session["authenticated"] is True, "correct password authenticates")
    check(session["csrf"] != anonymous_csrf, "login rotates the anonymous CSRF token")
    browser.csrf = anonymous_csrf
    browser.json("logout", {}, expected=403)
    browser.csrf = session["csrf"]
    before = browser.capsules()
    prefix = "HTTP test " + uuid.uuid4().hex[:8]
    created_ids = []

    def fields(title: str, **changes):
        value = {"title": title, "note": "A <script>literal</script> note & archive proof.",
                 "date": "2001-04-05", "kind": "photo", "tags": "linux, archive, linux",
                 "source": "https://example.org/archive"}
        value.update(changes)
        return value

    def find(title):
        matches = [item for item in browser.capsules() if item["title"] == title]
        check(len(matches) == 1, f"exactly one saved capsule named {title}")
        return matches[0]

    try:
        browser.multipart("save", fields(prefix + " invalid date", date="2025-02-30"), expected=400)
        check(len(browser.capsules()) == len(before), "invalid calendar date does not write a capsule")
        browser.multipart("save", fields(prefix + " missing csrf"), csrf=False, expected=403)
        browser.multipart("save", fields(prefix + " image"),
                          {"attachment": ("scan.png", PNG, "image/png")})
        first = find(prefix + " image")
        created_ids.append(first["id"])
        check(first["note"] == fields("")["note"], "notes round-trip without HTML interpretation")
        check(first["sha256"] == hashlib.sha256(PNG).hexdigest(), "file SHA-256 matches uploaded bytes")
        check(first["is_image"] is True and first["has_file"] is True, "raster image is previewable")
        check(sorted(first["tags"]) == ["archive", "linux"], "tags are normalized and deduplicated")
        content, headers = browser.request("file&id=" + first["id"])
        check(content == PNG, "authenticated image download preserves original bytes")
        check(headers.get("X-Content-Type-Options") == "nosniff", "files disable MIME sniffing")

        browser.multipart("save", fields(prefix + " duplicate"),
                          {"attachment": ("same-bytes.png", PNG, "image/png")})
        second = find(prefix + " duplicate")
        created_ids.append(second["id"])
        check(second["sha256"] == first["sha256"], "identical attachments share their content fingerprint")

        payload = b"<?php echo 'this must only download'; ?>"
        browser.multipart("save", fields(prefix + " save", kind="save", date="1993-12-10"),
                          {"attachment": ("old-save.php", payload, "application/octet-stream")})
        saved = find(prefix + " save")
        created_ids.append(saved["id"])
        check(saved["is_image"] is False, "arbitrary attachments are never previewed as images")
        content, headers = browser.request("file&id=" + saved["id"])
        check(content == payload, "attachment bytes cannot execute as PHP")
        check("attachment" in headers.get("Content-Disposition", ""), "non-image attachment is forced to download")

        browser.multipart("save", fields(prefix + " edited", id=first["id"], note="An edited recollection."))
        edited = find(prefix + " edited")
        check(edited["id"] == first["id"] and edited["has_file"], "editing preserves identity and attachment")
        check(edited["note"] == "An edited recollection.", "editing updates note")
        browser.multipart("save", fields(prefix + " edited", id=first["id"], remove_file="1"))
        check(find(prefix + " edited")["has_file"] is False, "attachment can be removed without deleting the capsule")
        # The other capsule still references the same content-addressed blob.
        check(browser.request("file&id=" + second["id"])[0] == PNG,
              "removing one duplicate does not break the other attachment")

        exported, headers = browser.request("export")
        backup = [json.loads(line) for line in exported.splitlines() if line.strip()]
        check(backup[0].get("format") == "timefold" and backup[0].get("version") == 1, "backup declares its portable NDJSON format")
        check("attachment" in headers.get("Content-Disposition", ""), "backup is offered as a download")
        count_before_import = len(browser.capsules())
        browser.multipart("import", {}, {"backup": ("timefold.ndjson", exported, "application/json")})
        check(len(browser.capsules()) == count_before_import, "reimporting own backup is idempotent")
        browser.multipart("import", {}, {"backup": ("broken.ndjson", b'{"not": "a backup"}\n', "application/json")}, expected=400)
        check(len(browser.capsules()) == count_before_import, "invalid backup does not partially write records")
        verify_backup_attacks(browser, backup, count_before_import)

        stranger = Browser(base)
        stranger.request("file&id=" + second["id"], expected=401)
        browser.json("logout", {})
        browser.json("list", expected=401)
        browser.json("export", expected=401)
        browser.csrf = browser.json("session")["csrf"]
        browser.json("login", {"password": PASSWORD})
        browser.csrf = browser.json("session")["csrf"]
        for item_id in created_ids:
            browser.json("delete", {"id": item_id})
        created_ids.clear()
        check(len(browser.capsules()) == len(before), "delete restores original archive record count")
        print("PASS: HTTP authentication, CSRF, CRUD, validation, attachment safety, backup import/export, and logout")
    finally:
        # A failed assertion should leave no test records in an externally supplied disposable server.
        for item_id in created_ids:
            try:
                browser.json("delete", {"id": item_id})
            except Exception:
                pass


def verify_backup_attacks(browser: Browser, backup: list[dict], count: int) -> None:
    def encoded(rows):
        return b"".join(json.dumps(row).encode() + b"\n" for row in rows)

    header = backup[0]
    sample = copy.deepcopy(backup[1])
    valid = copy.deepcopy(sample)
    valid["id"] = uuid.uuid4().hex
    valid["title"] = "Must roll back if a later record is malformed"
    invalid = copy.deepcopy(sample)
    invalid["id"] = "../../outside-storage"
    browser.multipart("import", {}, {"backup": ("unsafe.ndjson", encoded([header, valid, invalid]), "application/x-ndjson")}, expected=400)
    check(len(browser.capsules()) == count, "invalid record ID rejects the whole import before writing its valid first record")

    attached = next((row for row in backup[1:] if row.get("attachment")), None)
    check(attached is not None, "export includes complete attachment bytes")
    altered = copy.deepcopy(attached)
    altered["id"] = uuid.uuid4().hex
    altered["attachment"]["data"] = base64.b64encode(b"tampered bytes").decode()
    browser.multipart("import", {}, {"backup": ("corrupt.ndjson", encoded([header, altered]), "application/x-ndjson")}, expected=400)
    check(len(browser.capsules()) == count, "attachment hash mismatch does not modify the archive")

    browser.multipart("import", {}, {"backup": ("truncated.ndjson", b'{"format":"timefold",', "application/x-ndjson")}, expected=400)
    check(len(browser.capsules()) == count, "truncated backup leaves existing records intact")


def main() -> None:
    supplied = os.environ.get("TIMEFOLD_TEST_BASE_URL")
    if supplied:
        exercise(supplied)
        return
    with tempfile.TemporaryDirectory(prefix="timefold-http-") as temporary:
        directory = Path(temporary)
        environment = dict(os.environ)
        environment.update({
            "TIMEFOLD_DATA_DIR": str(directory / "data"),
            "TIMEFOLD_CONFIG_PATH": str(directory / "config.php"),
            "TIMEFOLD_PASSWORD": PASSWORD,
            "TIMEFOLD_DSN": os.environ.get("TIMEFOLD_TEST_DSN", f"sqlite:{directory / 'archive.sqlite'}"),
            "TIMEFOLD_DB_USER": os.environ.get("TIMEFOLD_TEST_DB_USER", ""),
            "TIMEFOLD_DB_PASSWORD": os.environ.get("TIMEFOLD_TEST_DB_PASSWORD", ""),
        })
        subprocess.run(["php", "bin/timefold.php", "init"], cwd=ROOT, env=environment,
                       check=True, stdout=subprocess.DEVNULL)
        port = unused_port()
        base = f"http://127.0.0.1:{port}"
        with (directory / "server.log").open("wb") as log:
            server = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", "public"],
                                      cwd=ROOT, env=environment, stdout=log, stderr=log)
            try:
                for _ in range(80):
                    try:
                        urllib.request.urlopen(base + "/api.php?action=session", timeout=.5).close()
                        break
                    except (urllib.error.URLError, TimeoutError):
                        if server.poll() is not None:
                            raise RuntimeError("PHP server exited: " + (directory / "server.log").read_text())
                        time.sleep(.1)
                else:
                    raise RuntimeError("PHP server did not become ready")
                exercise(base)
            finally:
                server.terminate()
                try:
                    server.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait()


if __name__ == "__main__":
    main()
