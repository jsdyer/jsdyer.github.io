#!/usr/bin/env python3
"""LANWatch: a small, dependency-free Linux LAN availability logger."""

from __future__ import annotations

import argparse
import csv
import ipaddress
import os
import re
import shutil
import sqlite3
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB = Path(os.environ.get("LANWATCH_DB", "~/.local/share/lanwatch/lanwatch.sqlite3")).expanduser()
SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    target TEXT NOT NULL,
    added_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    checked_at TEXT NOT NULL,
    online INTEGER NOT NULL CHECK(online IN (0, 1)),
    latency_ms REAL
);
CREATE INDEX IF NOT EXISTS idx_samples_device_id ON samples(device_id, id);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    occurred_at TEXT NOT NULL,
    online INTEGER NOT NULL CHECK(online IN (0, 1)),
    kind TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id, id);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: Path) -> sqlite3.Connection:
    path = path.expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def validate_target(target: str) -> str:
    """Allow IPs and DNS/mDNS names; reject shell/option injection and URLs."""
    try:
        ipaddress.ip_address(target)
        return target
    except ValueError:
        pass
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,252}", target):
        raise ValueError("target must be an IP address or hostname (not a URL)")
    if ".." in target or target.endswith("."):
        raise ValueError("invalid hostname")
    return target


def add_device(conn: sqlite3.Connection, name: str, target: str) -> None:
    if not name.strip() or len(name) > 60:
        raise ValueError("name must contain 1-60 non-whitespace characters")
    validate_target(target)
    conn.execute(
        """INSERT INTO devices(name, target, added_at) VALUES(?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET target=excluded.target""",
        (name.strip(), target, utc_now()),
    )
    conn.commit()


def ping_target(target: str, timeout: int) -> tuple[bool, float | None]:
    command = ["ping", "-n", "-c", "1", "-W", str(timeout)]
    try:
        if ipaddress.ip_address(target).version == 6:
            command.append("-6")
    except ValueError:
        pass
    command.append(target)
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, check=False, timeout=timeout + 2
        )
    except subprocess.TimeoutExpired:
        return False, None
    if result.returncode != 0:
        return False, None
    match = re.search(r"time[=<]([0-9]+(?:\.[0-9]+)?)\s*ms", result.stdout)
    return True, float(match.group(1)) if match else None


def run_check(conn: sqlite3.Connection, timeout: int, workers: int, probe=ping_target) -> int:
    devices = conn.execute("SELECT id, name, target FROM devices ORDER BY name").fetchall()
    if not devices:
        print("No devices configured. Start with: python3 lanwatch.py add router 192.168.1.1")
        return 0
    checked_at = utc_now()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(lambda row: probe(row["target"], timeout), devices))
    changes = 0
    for device, (online, latency) in zip(devices, results):
        previous = conn.execute(
            "SELECT online FROM samples WHERE device_id=? ORDER BY id DESC LIMIT 1",
            (device["id"],),
        ).fetchone()
        conn.execute(
            "INSERT INTO samples(device_id, checked_at, online, latency_ms) VALUES (?, ?, ?, ?)",
            (device["id"], checked_at, int(online), latency),
        )
        if previous is None or bool(previous["online"]) != online:
            kind = "initial" if previous is None else "change"
            conn.execute(
                "INSERT INTO events(device_id, occurred_at, online, kind) VALUES (?, ?, ?, ?)",
                (device["id"], checked_at, int(online), kind),
            )
            changes += 1
        latency_str = f" ({latency:.1f} ms)" if latency is not None else ""
        print(f"{'UP  ' if online else 'DOWN'}  {device['name']} [{device['target']}]{latency_str}")
    conn.commit()
    print(f"Checked {len(devices)} device(s); {changes} initial/changed state(s).")
    return len(devices)


def show_status(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """SELECT d.name, d.target, s.online, s.latency_ms, s.checked_at
        FROM devices d LEFT JOIN samples s ON s.id = (
            SELECT id FROM samples WHERE device_id=d.id ORDER BY id DESC LIMIT 1
        ) ORDER BY d.name"""
    ).fetchall()
    if not rows:
        print("No devices configured.")
        return
    print(f"{'DEVICE':20} {'TARGET':26} {'STATE':8} {'LATENCY':10} LAST CHECK (UTC)")
    for row in rows:
        state = "UNTESTED" if row["online"] is None else ("UP" if row["online"] else "DOWN")
        latency = f"{row['latency_ms']:.1f} ms" if row["latency_ms"] is not None else "-"
        print(f"{row['name'][:20]:20} {row['target'][:26]:26} {state:8} {latency:10} {row['checked_at'] or '-'}")


def show_history(conn: sqlite3.Connection, limit: int) -> None:
    rows = conn.execute(
        """SELECT e.occurred_at, d.name, e.online, e.kind
        FROM events e JOIN devices d ON d.id=e.device_id
        ORDER BY e.id DESC LIMIT ?""", (limit,)
    ).fetchall()
    if not rows:
        print("No recorded state changes yet.")
    for row in rows:
        print(f"{row['occurred_at']}  {row['name']:20} {'UP' if row['online'] else 'DOWN':5} {row['kind']}")


def export_samples(conn: sqlite3.Connection, limit: int) -> None:
    writer = csv.writer(sys.stdout)
    writer.writerow(["checked_at_utc", "name", "target", "online", "latency_ms"])
    rows = conn.execute(
        """SELECT s.checked_at, d.name, d.target, s.online, s.latency_ms
        FROM samples s JOIN devices d ON d.id=s.device_id
        ORDER BY s.id DESC LIMIT ?""", (limit,)
    ).fetchall()
    for row in rows:
        writer.writerow(tuple(row))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="SQLite database path")
    sub = parser.add_subparsers(dest="command", required=True)
    add = sub.add_parser("add", help="Add/update a host to monitor")
    add.add_argument("name")
    add.add_argument("target")
    remove = sub.add_parser("remove", help="Remove a host and its observations")
    remove.add_argument("name")
    check = sub.add_parser("check", help="Ping configured hosts and record states")
    check.add_argument("--timeout", type=int, default=2, help="Per-host ping timeout in seconds")
    check.add_argument("--workers", type=int, default=12, help="Parallel probes (1-64)")
    sub.add_parser("status", help="Show latest result for each host")
    history = sub.add_parser("history", help="Show first-seen and change events")
    history.add_argument("--limit", type=int, default=30)
    export = sub.add_parser("export", help="Export the most recent samples as CSV")
    export.add_argument("--limit", type=int, default=1000)
    args = parser.parse_args(argv)
    if args.command == "check" and (args.timeout < 1 or not 1 <= args.workers <= 64):
        parser.error("--timeout must be >= 1 and --workers must be 1-64")
    if args.command in ("history", "export") and args.limit < 1:
        parser.error("--limit must be >= 1")
    if args.command == "check" and shutil.which("ping") is None:
        parser.error("Linux ping is missing: install the iputils-ping package")
    with connect(args.db) as conn:
        if args.command == "add":
            try:
                add_device(conn, args.name, args.target)
            except ValueError as exc:
                parser.error(str(exc))
            print(f"Monitoring {args.name}: {args.target}")
        elif args.command == "remove":
            cursor = conn.execute("DELETE FROM devices WHERE name=?", (args.name,))
            conn.commit()
            print("Removed." if cursor.rowcount else "Device not found.")
        elif args.command == "check":
            run_check(conn, args.timeout, args.workers)
        elif args.command == "status":
            show_status(conn)
        elif args.command == "history":
            show_history(conn, args.limit)
        elif args.command == "export":
            export_samples(conn, args.limit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
