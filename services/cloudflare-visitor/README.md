# CoolCode visitor Worker

`worker.template.js`, `gateway.js`, `halifax-gateway.js`,
`inspection-gateway.js` and `parcel-corporate-gateway.js` are the reviewed source.
`worker.js` is generated from them and every ID in `data/tools.json` by
`python3 scripts/sync_operations.py`. Never hand-maintain a second tool array.

The existing `coolcode-visitor-api` Worker provides aggregate visits, private issue
reports, owner-only administration and the read-only tool APIs below. `/registry` returns public catalogue IDs
without reading visitor data or inserting a test event. It supports deployment audits.

After generating and testing a changed Worker, use the connected Cloudflare tools or:

```sh
python3 services/cloudflare-visitor/deploy.py
python3 scripts/check_live_registry.py
```

The deploy script asks locally for the existing account and a Workers Scripts Write
token. It refuses to overwrite unreviewed live changes, uploads through Cloudflare's
**content-only** endpoint, and downloads the deployed module to verify its bytes.
It preserves the D1 binding, secrets, settings, routes and database contents.
Commit `data/operations/cloudflare-deployment.json` with the generated Worker.
No token or private report belongs in Git.

An equivalent connected-tool deployment must produce the same verified receipt.
The operations audit rejects a generated Worker whose code hash differs from that
receipt and compares the live `/registry` response with the catalogue. The offline
homepage build can still publish while a provider deployment is blocked; that does
not mark the Worker integration complete.

See [the complete tool lifecycle](../../docs/tool-lifecycle.md).

## Current deployment state

The seven-tool release stages 257 catalogue IDs and new Halifax Transit, Nova
Scotia inspection, Canada Post and federal-corporation handlers. Its complete
manual deployment instructions are in [seven-tools-setup.md](seven-tools-setup.md).
The owner will paste the tested generated Worker. The earlier deployment receipt
remains the record of the last verified source until the new module has actually
been downloaded and checked. Do not treat the configuration flags as a successful
provider request or replace the receipt before verification.

For a later manual update, copy the complete generated source from
[worker.js](https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/main/services/cloudflare-visitor/worker.js),
preserving all existing bindings and settings. Download the deployed module,
verify its source and `/registry`, and record the resulting receipt. Deployments
through `deploy.py` continue to require exact uploaded/downloaded bytes and refuse
to overwrite unexpected live changes.

## Public tool APIs and secrets

Use the existing Worker **Settings → Variables and Secrets → Secret**. These are
runtime bindings, never public frontend variables or files in tool repositories.
The existing four provider keys remain configured. The new Canada Post and ISED
bindings have been added; real provider requests are verified after the owner
deploys the new handlers.

| Tool | Secret bindings | GET routes below `/api/` |
| --- | --- | --- |
| Podcast Route | `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET` | `podcastroute/search?q=`, `episodes?id=`, `feed?url=` |
| Channel Queue | `YOUTUBE_API_KEY` | `channelqueue/channel?id=` or `handle=`, `playlist?id=&pageToken=`, `videos?ids=`, `search?q=` |
| Recipe Math (USDA only) | `FDC_API_KEY` | `recipemath/search?q=&page=`, `food?id=` |
| Distro Pilot | None | `distropilot/project?name=` |
| Feed Harbour | None | `feedharbour/feed?url=` |
| Halifax Next | None | `halifaxnext/realtime?feed=vehicles`, `feed=alerts`, `feed=trips&stop=` |
| Inspection Trail | None | `inspectiontrail/search?q=&town=&address=&mode=`, `report?id=&q=&town=&address=&mode=` |
| Parcel Bench | `CANADAPOST_CLIENT_ID`, `CANADAPOST_CLIENT_SECRET` | `parcelbench/rates?origin=&destination=&weight=&length=&width=&height=&mailingDate=`, `offices?postal=`, `office?id=` |
| Corporate Ghosts | `ISED_CORPORATIONS_API_KEY` | `corporateghosts/corporation?id=` |


`/api/status` returns configuration booleans only. Successful lookups return
`{fetched_at,data}`; failures return `{error:{code,message}}` with non-2xx status.
Halifax real-time feeds are the exception: successful responses stream bounded
`application/x-protobuf` bytes and expose `X-CoolCode-Fetched-At`. The browser
decodes and filters the public feed, keeping that CPU work out of the Worker.
The captured time survives cached reads. The browser's saved private work remains
unchanged when a provider fails. Search terms and public feed URLs are sent to
Cloudflare and the relevant provider. Private notes, recipes and listening state
are not sent to this API.

The existing `DB` binding holds two additive tables, `gateway_cache` and
`gateway_budget`. Existing visit/report tables and administration are retained.
Ordinary cached responses have a 256-entry cap and a 500 KB response limit
(1 MB for package evidence). Halifax uses three fixed public feed keys in the edge Cache API with 30-second
expiry. Feed responses are bounded at 5 MB and decoded/filtered in the browser;
no protobuf decode, JSON expansion or gzip work runs in the Worker.
Halifax's IIS source requires `application/protocol-buffer` in the upstream Accept
header. The relay requests identity encoding and uses `redirect: 'manual'`, rejecting
non-success responses without following them. Workers does not support the Fetch
standard's `redirect: 'error'` mode; the regression fixture enforces this difference.
Inspection and corporation details expire after five minutes. Parcel quotes and
outlet lookups are never persisted in the shared cache and return no-store.
Errors are not cached. SQL upserts enforce
shared budgets across Worker instances: 50 YouTube searches/day, 5,000 ordinary
YouTube calls/day, 500 USDA calls/hour, 1,500 Podcast Index calls/day, 3,000 feed
fetches/day and 600 Repology calls/day. Repology also has an atomic 1.1-second
spacing lease. Requests rejected by that lease do not consume its daily allowance.
Cached reads remain available after source budgets are exhausted.

Repology's source deadline is 35 seconds; inspection sessions use 30 seconds,
Canada Post/ISED requests 15 seconds, and the other providers 12 seconds. Distro
Pilot waits 45 seconds. Production Repology succeeded after 25 seconds during
verification, and a subsequent request reused the same capture. Source timeouts
return `504 source_timeout`; network failures and invalid source data remain
separate failures. Source response bodies are bounded before parsing. The app
logs only fixed source identifiers and error categories, never provider URLs or
key values.

Feed fetching uses Cloudflare's ordinary public-network `fetch` only. Do not give
it private-network/VPC outbound access. Every URL and redirect must be public
HTTPS, with no credentials, custom ports or common secret-token parameters;
callers must not submit secret-bearing feeds. No caller cookies/authorization
are forwarded. DTD/entity declarations and non-feed documents are rejected; XML
is returned as JSON text for the frontend's safe parser. This endpoint does not
scrape full articles or bypass access controls.

Backbone Compare's optional `PEERINGDB_API_KEY` belongs in that repository's
**Settings → Secrets and variables → Actions**. Its browser uses public APIs and
does not receive the secret. The other new tools need no keys; Recipe Math's
complete Canadian food dataset also works without USDA access.

## Additional provider limits and validation

The new adapters use fixed official upstream hosts and reject unsupported paths,
repeated parameters, redirects and oversized responses. Inspection queries are
limited to 1,500 shared requests/day. Halifax allows 4,000 source requests/day/feed;
short caching normally serves many visitors from each download. ISED is limited
to 50 uncached requests/minute with a shared 1.1-second spacing lease. Canada Post
uses an 80-request/minute application budget and a shared 300ms spacing lease,
including token calls. Canada Post tokens are kept only in bounded isolate memory
and expire or are replaced when the configured credentials change.

Canada Post API Key maps to `CANADAPOST_CLIENT_ID`; its matching API Secret maps
to `CANADAPOST_CLIENT_SECRET`. Use Secret bindings for both. A customer number is
not needed for the consumer counter quotes. No account pricing or label purchase
is requested. Federal details include public names and lifecycle records, with
explicit truncation flags; personal street addresses and birth dates are omitted.

Run `npm ci --prefix services/cloudflare-visitor --ignore-scripts` and
`npm run check --prefix services/cloudflare-visitor` for the dashboard JavaScript
check against pinned Cloudflare types. The JavaScript check is intentionally
non-strict to match this existing plain-JavaScript Worker; no diagnostic is
suppressed. Runtime suites exercise malformed UTF-8, source contracts, credential
redaction, cache separation and source budgets against SQLite.
