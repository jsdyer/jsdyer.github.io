# Tape Index

Give a box of digitized prints, field recordings or WARC captures a checksum catalog you can keep on another disk. Tape Index records each regular file's relative path, exact size in bytes and SHA-256 digest in a readable JSON manifest. You can verify a copy under a different directory name.

## Try it on Linux

Slackware and Ubuntu can run this with their system Python 3.8 or later. From `tools/tape-index` in the CoolCode checkout, try a disposable collection.

```sh
work=$(mktemp -d)
mkdir -p "$work/field-notes"
printf 'Rain at the ferry terminal.\n' > "$work/field-notes/roll-01.txt"
python3 tape_index.py create "$work/field-notes" "$work/field-notes.json"
python3 tape_index.py verify "$work/field-notes" "$work/field-notes.json"
```

The last line should report `Verified 1 file(s).` To see how damage or editing shows up, change the sample and verify it again.

```sh
printf 'More rain.\n' >> "$work/field-notes/roll-01.txt"
python3 tape_index.py verify "$work/field-notes" "$work/field-notes.json"
```

```text
CHANGED "roll-01.txt"
1 difference(s).
```

## Use it on an archive

Create the manifest from a stable collection, then verify future copies against that same manifest. Replace the example mount paths with your own.

```sh
mkdir -p "$HOME/manifests"
python3 tape_index.py create /mnt/original/polaroids "$HOME/manifests/polaroids.json"
python3 tape_index.py verify /mnt/backup/polaroids "$HOME/manifests/polaroids.json"
```

A moved file appears as `MISSING` under its old name and `ADDED` under its new one. Files with different bytes appear as `CHANGED`, including changes that preserve length and timestamp. Timestamps, permissions, empty directories, symlinks and special files are outside the catalog. A WARC or compressed tarball is hashed as a single file.

The manifest's parent directory must exist outside the collection and support hard links (for example, ext4). Creation publishes the completed manifest atomically and requires an unused filename. Keep a trusted copy of it. For a collection that changes while you work, catalog a filesystem snapshot or pause writers first.

Exit codes are `0` for successful creation or a complete match, `1` for differences and `2` for a usage, read or write error.
