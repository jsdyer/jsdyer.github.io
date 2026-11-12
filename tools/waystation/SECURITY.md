# Waystation's trust model

Waystation is a single-owner, local archive. The viewer binds to `127.0.0.1`
by default and has no login system. Changing `--listen` exposes the archive
to whoever can reach that address. For a private LAN, use your firewall and a
trusted network; for remote access, put authentication and TLS in front of it.
Use an explicit listen IP or hostname; wildcard binds are rejected. Host headers
must match that address (loopback names are interchangeable), protecting the
default local viewer against DNS rebinding. A reverse proxy must set the upstream
Host header accordingly.
Capsules may contain private page content and sensitive URL query strings.
Do not commit real capsules or publish them accidentally.

Only the CLI initiates capture. It accepts explicitly supplied HTTP(S) origins,
including private IPs because homelab sites are a core use case. It rejects URL
credentials, does not reuse cookies, and checks redirects against the origin
allowlist. This is not an SSRF-safe multi-tenant capture service. Do not wrap the
CLI in an unauthenticated web form or feed it untrusted seed URLs.

Limits bound resource count, individual response size, total stored response
bytes, depth, concurrent requests, and request time. The aggregate budget is a
storage budget; concurrent in-flight responses can consume additional memory
and network bytes. A site can still serve misleading content or consume the
available budget. Capture only sites you own or are authorized to archive.

Replay rewrites known links to local content, removes active HTML elements and
dangerous attributes, and sends a restrictive CSP and MIME protection. Stored
scripts are never served as executable scripts. Missing destinations resolve
locally. Browser differences and malformed HTML/CSS are why both transformation
and response policy are used. Original raw objects are not sanitized at rest.

SHA-256 verification detects accidental corruption and altered bytes. There is
no signing key, authentication of the original server beyond normal HTTPS,
encrypted storage, or protection against an attacker who can rewrite the entire
archive. Keep backups and trust the machine that stores your data. No garbage
collector is included; unused objects can remain after interrupted captures.

Use one writer per archive directory. Read-only viewers can run alongside it.
Do not expose archive files through Apache's document root: serve them through
Waystation so replay protection is applied.

Report vulnerabilities privately to the repository owner. Include a minimal
synthetic fixture, never a private capsule or credentials.
