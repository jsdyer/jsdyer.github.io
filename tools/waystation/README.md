# Waystation

**Unplug the server. Keep the small web.**

Waystation is a pocket internet for your homelab: a Go executable that captures
your server-rendered websites, stores their pages and assets in verifiable
capsules, and lets you browse them after the original machines have gone away.

Imagine retiring an old Apache box without losing its personal pages, a LAN
wiki, a collection of game notes, or the links between them. Capture before a
weekend of server work, capture afterward, and see which pages changed. Put a
capsule on a travel drive and bring that little web with you.

This belongs beside [Timefold](../timefold/): Timefold organizes personal
artifacts; Waystation preserves the websites that give those artifacts context.

## Try the disappearing-server demo

Download the archive for your machine from the
[Waystation v0.1.1 release](https://github.com/jsdyer/jsdyer.github.io/releases/tag/waystation-v0.1.1),
extract it, and run:

```sh
./waystation demo
```

On Windows, use `./waystation.exe demo` in PowerShell. Open
**http://127.0.0.1:8787/**. The demo creates a temporary local website, captures
two editions, and **shuts the original server down before the viewer starts**.
Browse the preserved site, inspect its link map, and compare the two editions.
The sample is fictional and does not read personal files or contact the internet.

Runtime requirements: the executable and a writable directory. No database,
PHP, Node, Docker, browser driver, account, or background service. Linux,
macOS, and Windows are supported; Linux ARM64 builds suit a 64-bit Pi.

### Build it yourself

Install [Go 1.26 or newer](https://go.dev/dl/), then:

```sh
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io/tools/waystation
go build -mod=vendor -trimpath -o waystation .
./waystation demo
```

On Windows, build with `-o waystation.exe`. The only third-party package is the
Go project's HTML parser (`golang.org/x/net/html`); its source and license are
vendored. Once you have the source and Go, **building needs no network**.
The interface ships inside the binary via `go:embed`.

## Keep a real site

```sh
./waystation capture --label "Before the server upgrade" http://lab.example/
./waystation list
./waystation serve
```

Use a site you own or have permission to archive. The capture command only
follows HTTP(S) links within origins you explicitly supply. An origin includes
the scheme, hostname, and port. To include an asset origin, supply it as another
seed URL:

```sh
./waystation capture --label "My little web" \
  https://www.example.com/ https://assets.example.com/site.css
```

Capturing starts at the seeds and follows reachable pages and assets. It is a
snapshot of what was reached within your limits, not a backup of server code,
SQL tables, or unlinked files. Query strings are retained; fragments refer to
the same stored page. External links remain visible in the manifest but are
not fetched. Replaying an uncaptured destination shows a local missing-page
notice.

All flags go **before** URLs or snapshot IDs:

```sh
./waystation capture --store ./capsules --workers 4 --depth 4 \
  --max-resources 250 --max-bytes 8388608 --max-total-bytes 67108864 \
  --timeout 15s --delay 100ms http://lab.example/
./waystation serve --store ./capsules --listen 127.0.0.1:8787
```

Those capture limits are the defaults. The delay spaces request starts, and
workers overlap waits for responses. Keep the limits gentle for small servers.
Failed requests and truncated captures are recorded, shown in the viewer,
and cause `capture` to exit nonzero **after saving the partial result**.

## Inspect, compare, verify, take it with you

Replace the uppercase placeholders with IDs printed by `list`:

```sh
./waystation inspect SNAPSHOT_ID
./waystation diff BEFORE_ID AFTER_ID
./waystation verify SNAPSHOT_ID
./waystation export --out my-small-web.zip SNAPSHOT_ID
```

`inspect`, `diff`, and `verify` print readable JSON, suitable for piping into
your existing scripts. Diff reports URL-level additions, removals, and changes;
it is not a visual or line-by-line text diff. Export refuses to overwrite an
existing ZIP and verifies the referenced content before packaging it.

Extract the ZIP into an empty directory on another machine and run:

```sh
./waystation serve --store ./extracted-capsule
```

Bring the executable for that machine too. The capsule is an ordinary ZIP of
manifests and content objects, not a proprietary database. Each export contains
one snapshot and exactly its referenced objects. It needs Waystation's local
viewer; it is not a double-click static HTML export.

The archive on disk is intentionally simple:

```text
waystation-data/
  snapshots/<snapshot-id>.json       # readable, versioned manifest
  objects/<first-two-hash-chars>/<sha256>  # original response body
```

Identical bytes are stored once across snapshots. Original bytes are retained;
links are rewritten only during replay. `verify` detects missing or changed
objects and incorrect lengths. This is integrity checking, not a cryptographic
signature proving who created a capsule. Back up the entire directory.

## Why Go here?

The interesting step beyond LAMP is not replacing PHP syntax. It is combining
three capabilities into an appliance you can carry:

- **Goroutines and channels** overlap fetches in a bounded worker pool. One slow
  page need not stall every other request.
- **Native HTTP and embedded files** put the collector, archive API, and viewer
  inside one executable. There is no application-server deployment procedure.
- **Explicit types and small interfaces** keep the data format and mechanics
  legible. SHA-256 objects separate preservation from presentation, so a new
  viewer does not require a new archive.

See [the architecture and modification guide](docs/HACKING.md) for a code map,
small first changes, and directions for making this a larger personal project.

## Honest boundaries

This first release targets ordinary **server-rendered HTML and CSS**. It does
not execute JavaScript, log in, submit forms, replay APIs, or restore a database.
Scripts, forms, frames, and embedded active content are made inert on replay;
archived pages have a restrictive Content Security Policy. Original raw bytes
still exist in the store, so do not open untrusted object files directly.

Conventional HTML links, images, stylesheets, `srcset`, CSS `url(...)`, and quoted
CSS `@import` are supported. Complex CSS escapes and browser-specific asset
loading may be incomplete. Replay expects UTF-8 source text; original bytes
remain unchanged. SVG files are downloadable attachments, not rendered images.
Depth and size limits can omit assets; inspect the
manifest. This is not a replacement for a full browser-based archival system.

Capture is an explicit command, with no web-triggered fetch endpoint. It allows
private addresses for homelabs, does not use your browser cookies, and does not
automatically enforce `robots.txt`; only capture authorized sites. Redirects
cannot silently expand to new origins. See [SECURITY.md](SECURITY.md) for the
trust model, local bind behavior, and limitations.

## Development

```sh
go test -mod=vendor ./...
go vet -mod=vendor ./...
# On a system with the race detector's C toolchain available:
go test -mod=vendor -race ./...
```

The tests run against local fixtures. They cover archive corruption, offline
replay after origin shutdown, scope controls, budgets, and link rewriting.
CI runs the suite on Linux and Windows and creates portable build artifacts.
A successful push to main publishes the version in `VERSION` if it has no
release yet, with archives and SHA-256 checksums. Existing releases are never
replaced. Tags named `waystation-v*` can also trigger the workflow.

MIT licensed; the vendored Go HTML parser retains its BSD-style license.
