# Four network and security tools

## Published applications

| Tool | Main fixes | Published code |
| --- | --- | --- |
| [Atlas Canada](https://coolcode.ca/atlas-canada/) | Eligible-route denominator, unanswered hops, cautious geolocation claims, family-specific probe ASN, capture-load races | `0935d65`; original capture reassessed in `f47d158` |
| [Takedown Watcher](https://coolcode.ca/takedown-watcher/) | Evidence-based states, TLS validation, public-only pinned connections and redirect checks, failed-check preservation, optional scans off by default | `cfc9537` |
| [Abuse Kit](https://coolcode.ca/abuse-kit/) | Recipient selection, compressed IPv6 parsing, private-address skips, lookup failures and safe contact links | `f35df29` |
| [Edge Map](https://coolcode.ca/edge-map/) | Full IP hiding, validated opt-in history, storage-error reporting, endpoint validation and geolocation wording | `65430f9` |

Abuse Kit and Takedown Watcher now share a versioned ICANN Public Suffix List
snapshot, including wildcard/exception rules, with a documented updater.
Takedown Watcher's initial targets are clearly labelled demonstration controls.
Its instant lookup accepts visitor domains; maintain the scheduled list in its
`watchlist.txt`. No reports or urlscan submissions were sent during this review.

All four passed their Node, Python, build and Chromium desktop/mobile checks in
GitHub Actions, and all four Pages deployments succeeded. Published page assets
and the collectors' small status endpoints were checked. Atlas's existing
90-trace capture was reassessed from original measurement results without new
measurements; 80 routes are eligible, 32 have foreign-located hops, and 67 traces
have unanswered hops. The original capture timestamp remains unchanged.

## Collection integration

- All four are listed in the homepage/search, imported guides and README, report
  choices, generated Worker and sitemap. The two datasets appear in the dataset directory.
- The public repository audit covers 238 repositories: 223 catalogue source
  repositories and 15 documented exclusions, with no unreviewed repositories.
- The GitHub-managed Linux watchdog has 168 workflows across 162 repositories.
  Atlas runs daily at 09:41 UTC; Takedown Watcher runs every six hours at :23.
  Both have small `last_success` freshness probes and allowlisted schedule guards.
  Abuse Kit and Edge Map are explicitly recorded as browser-only, with no schedule.
- Each application's AGENTS and README now point to the mandatory tool lifecycle.

## External completion requirements

The generated visitor Worker has 232 tool IDs. Cloudflare's content-only PUT
still returns HTTP 403 because this connection lacks Workers Scripts Write.
The browser is signed out. The deployment receipt deliberately remains the
previous live hash, so the deployment and weekly live-registry audits continue
to flag this discrepancy. Deploy `services/cloudflare-visitor/worker.js`,
verify the live module and `/registry`, then update the receipt.

The independent scheduler's installer and current targets are in GitHub at
`services/refresh-watchdog/`. Server installation cannot be verified from this
workspace. If its GitHub App uses selected repositories, grant it Actions access
to `atlas-canada` and `takedown-watcher`; changing the targets does not grant access.
