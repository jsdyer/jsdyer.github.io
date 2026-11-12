# Make this your own

The project is deliberately small enough to read, with enough depth to become
a serious long-term tool. Start with `main.go` and follow one command downward.

| File or package | Responsibility | Useful first modification |
| --- | --- | --- |
| `main.go` | CLI flags, command routing, process lifetime | Add your preferred capture preset |
| `internal/capture` | Concurrent bounded HTTP traversal | Add URL inclusion/exclusion rules |
| `internal/webdoc` | HTML/CSS discovery and safe rewriting | Support another well-defined asset reference |
| `internal/capsule/model.go` | Versioned, readable data contract | Understand how a snapshot refers to objects |
| `internal/capsule/store.go` | Hashes, storage, diff, verification, ZIP | Add a read-only archive statistics command |
| `internal/viewer` | Embedded interface, API, offline responses | Make the shelf and link map your own |
| `internal/demo` | An entire fictional web that disappears | Add a page that exercises your next feature |

No frontend toolchain: edit the HTML/CSS/JS in the viewer and run `go build .`.
The `go:embed` directive includes those files in the new executable. They do
not need to be installed next to it. Keep the accessibility labels and keyboard
paths when changing the interface.

## Read the data without Waystation

A manifest contains the capture label, seed URLs, timestamp, resource URLs,
content types, status/error information, SHA-256 hashes, and outgoing links.
The hash identifies the original body under `objects/`. Two snapshots can point
to the same object. A missing/error record can have no hash at all.

`Resource.URL` is the requested URL. `FinalURL` records redirects when present;
relative links resolve against that final location. Display logic must not use
original URLs for browser network loads: route them through the snapshot.

Keep format changes explicit. The version field exists so future readers can
reject a format they do not understand instead of silently guessing. Prefer
derived indexes over changing old content objects.

## Three worthwhile directions for a major project

### 1. A personal web that can survive its hardware

Add a seed collection file, scheduled captures through cron/systemd, and an
inventory command showing stale or incomplete sites. Add an import route for
WARC files, preserving source provenance in a new manifest version. Keep the
first principle: archived pages remain useful after the origin disappears.

### 2. Understand how your web changes

Build text extraction and paragraph-level diffs on top of immutable objects.
Separate meaningful text changes from a timestamp in a footer. Show incoming
links to vanished pages; generate an RSS change journal that Apache can serve.
These are derived views and do not require a second database.

### 3. Carry an independent web between machines

Add manifest signing, capsule-to-capsule deduplication, and a static export
format. A transfer protocol can compare hashes before sending bytes. Treat
key management and authorization as design work, with tests before a listener
that writes or initiates network requests is exposed.

These are future directions, not implemented features.

## Add behavior without tangling the project

1. Make a local fixture that demonstrates the problem.
2. Put the smallest change in the responsible package.
3. Add a behavioral test (for example, a redirected CSS import still resolves).
4. Run `go test ./...` and `go vet ./...`.
5. Run `./waystation demo` and inspect the real experience.

For parser changes, test both discovery and replay. For capture changes, verify
the server receives no requests outside the permitted origins. For storage
changes, test interrupted writes and corrupted data. Keep raw objects immutable.

## Dependencies and releases

The core uses Go's standard library. `golang.org/x/net/html` supplies the HTML5
parser; only needed package sources are checked into `vendor/`. To update it
deliberately, run `go get golang.org/x/net@VERSION`, `go mod tidy`, and
`go mod vendor`, then review the source/license changes and run the suite.

Cross-build example for a 64-bit Linux homelab machine:

```sh
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -mod=vendor -trimpath -o waystation .
```

The GitHub workflow builds Linux, macOS, and Windows variants without a C
runtime dependency. Bump `VERSION` when a new release is ready; a successful
main-branch build creates its release if one does not exist. The embedded
version and release version come from the same file. Existing releases are
never replaced. Release tags use `waystation-v0.1.0` so they do not collide with
other projects in the CoolCode collection.
