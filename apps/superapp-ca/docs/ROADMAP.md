# Direction and next work

## What makes this its own project

The initial inspiration is omg.lol’s collection of small personal-web services. Its [official API](https://api.omg.lol/) describes profiles, /now pages, weblogs, status updates, pastes and permanent links. Superapp implements its own smaller collection with a different product purpose; it does not copy their code, brand, member content or design.

| Superapp principle | Concrete product choice |
| --- | --- |
| Pay what you can | $0 is welcome; one feature set; optional hosted contribution link |
| Buy Canadian | Moderated directory with source links and separate ownership/manufacturing/hosting claims |
| Self-hosting as a normal option | Plain PHP/PDO, Apache and MariaDB; SQLite trial; GPL-3.0-or-later source |
| A home for tinkerers | Homelab runbooks, code pastes, /uses pages and a scriptable API |
| Preserve context | Archive catalogue, notes, tags, stable URLs, open exports |
| Get outside sometimes | Field notes for local exploring, trails, photography and maker projects |
| Community without a popularity race | Chronological commons, no follower counts or likes, moderated guestbooks |
| Portability | RSS, JSON exports/imports, bookmark export, no CDN or vendor backend |
| Evidence over flag badges | Sources and review dates; listings explicitly are not certifications |

## Next: make a good pilot dependable

1. Operator onboarding, email verification, verified reset links, MFA/passkeys, scoped expiring API keys, audit logs, and more granular quotas. Revisit abuse handling with the actual pilot workload.
2. Cursor pagination for garden, directory, public profiles and moderation; indexes informed by real queries; deployment-time migration versioning; concurrency/load tests.
3. Directory correction requests, source re-review reminders, change history, province/category facets, and product-level manufacturing notes. Add evidence standards before claiming verification.
4. Donor-chosen CAD checkout integration if desired. Keep hosted payment details outside the app, verify signed webhooks, and only publish funding totals backed by settled transaction records. Donations must never alter access or rankings.
5. Optional French UI and bilingual community copy. Proper translation catalogues and human review, not a decorative language switch.

## Then: more of the human web

- Webmentions with SSRF protections, moderation, and rate limits; IndieAuth/Micropub; OPML and bookmark import. Current v1 offers RSS and rel=me, not those protocols.
- Member-owned custom domains with explicit DNS verification and certificate automation. Currently everyone uses `/@handle`; no subdomain or DNS management is implemented.
- A webring and small-site discovery shelf; no gamified leaderboards.
- Images/photo essays after a safe media pipeline: format inspection, re-encoding, metadata removal, quotas, storage separation, backup and deletion.
- Archive capture workers using established WARC tooling, on a separately isolated queue with strict URL/network controls. Current Time capsule is a catalogue only.
- Optional external Mastodon cross-posting/federation, not a pretend social server.
- A transparent, real expense ledger once the operator has actual costs and settlement records to publish.

## Deliberately out of scope for v1

Email forwarding/webmail, arbitrary hosted scripts, DNS hosting, public file storage, automatic uptime monitoring, complete browser archives, maps/location tracking, built-in card collection, and a full Mastodon replacement. Each adds a substantial operating or security responsibility and should be a separately planned service.

## Seed sources

Optional demo seed, checked 2026-11-12:

- [Vancouver Community Network — Who we are](https://www2.vcn.bc.ca/who-we-are/): community network mission.
- [Canadian Web Hosting](https://canadianwebhosting.com/): provider's own Canadian ownership statement. Self-description, not independent corporate verification.

Example member posts are fictional illustrative writing. These organisations are not claimed to be Superapp members, customers, sponsors, partners or donors.
