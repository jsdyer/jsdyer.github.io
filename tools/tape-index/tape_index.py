#!/usr/bin/env python3
"""Make and verify an offline checksum catalog of a directory of files."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile


FORMAT = "tape-index-v1"
CHUNK_SIZE = 1024 * 1024


def raise_walk_error(error):
    raise error


def scan(collection):
    """Walk by directory descriptor and hash regular files without following links."""
    entries = {}
    for directory, _, names, directory_fd in os.fwalk(collection, onerror=raise_walk_error):
        for name in names:
            info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            if not stat.S_ISREG(info.st_mode):
                continue
            relative = str((Path(directory) / name).relative_to(collection))
            flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
            with os.fdopen(os.open(name, flags, dir_fd=directory_fd), "rb") as source:
                before = os.fstat(source.fileno())
                if not stat.S_ISREG(before.st_mode) or not os.path.samestat(info, before):
                    raise ValueError("file replaced during scan: " + repr(relative))
                digest = hashlib.sha256()
                while True:
                    chunk = source.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    digest.update(chunk)
                after = os.fstat(source.fileno())
                if (before.st_size, before.st_ctime_ns) != (after.st_size, after.st_ctime_ns):
                    raise ValueError("file changed during scan: " + repr(relative))
            entries[relative] = {"bytes": after.st_size, "sha256": digest.hexdigest()}
    return entries


def save_manifest(path, entries):
    """Publish a fully written catalog without replacing an existing baseline."""
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent) as temp:
        json.dump({"format": FORMAT, "files": entries}, temp, indent=2, sort_keys=True)
        temp.write("\n")
        temp.flush()
        os.fsync(temp.fileno())
        os.link(temp.name, path)


def unique_fields(pairs):
    fields = {}
    for name, value in pairs:
        if name in fields:
            raise ValueError("duplicate manifest key: " + repr(name))
        fields[name] = value
    return fields


def read_manifest(path):
    with path.open(encoding="utf-8") as source:
        data = json.load(source, object_pairs_hook=unique_fields)
    if not isinstance(data, dict) or data.get("format") != FORMAT or not isinstance(data.get("files"), dict):
        raise ValueError("expected a Tape Index v1 manifest")
    for name, entry in data["files"].items():
        if any(part in ("", ".", "..") for part in name.split("/")):
            raise ValueError("invalid manifest path: " + repr(name))
        if (not isinstance(entry, dict) or type(entry.get("bytes")) is not int
                or entry["bytes"] < 0 or not isinstance(entry.get("sha256"), str)
                or not re.fullmatch("[0-9a-f]{64}", entry["sha256"])):
            raise ValueError("invalid manifest entry: " + repr(name))
    return data["files"]


def verify(expected, actual):
    differences = 0
    for name in sorted(expected.keys() | actual.keys()):
        if name not in actual:
            state = "MISSING"
        elif name not in expected:
            state = "ADDED"
        elif actual[name] != expected[name]:
            state = "CHANGED"
        else:
            continue
        print(state, json.dumps(name))
        differences += 1
    if differences:
        print(f"{differences} difference(s).")
        return 1
    print(f"Verified {len(expected)} file(s).")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("create", "verify"))
    parser.add_argument("collection", type=Path, help="directory to catalog")
    parser.add_argument("manifest", type=Path, help="manifest outside the collection")
    args = parser.parse_args()
    try:
        collection = args.collection.resolve(strict=True)
        if not collection.is_dir():
            raise ValueError("collection must be a directory")
        # Resolve the parent separately so an existing symlink cannot direct a write.
        manifest = args.manifest.parent.resolve(strict=True) / args.manifest.name
        if manifest == collection or collection in manifest.parents or manifest.is_symlink():
            raise ValueError("use a manifest outside the collection, with a non-symlink filename")
        if args.command == "verify":
            expected = read_manifest(manifest)
            return verify(expected, scan(collection))
        if manifest.exists():
            raise ValueError("manifest already exists; choose a new filename")
        entries = scan(collection)
        save_manifest(manifest, entries)
        total = sum(entry["bytes"] for entry in entries.values())
        print(f"Cataloged {len(entries)} file(s), {total} bytes.")
        return 0
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"tape-index: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
