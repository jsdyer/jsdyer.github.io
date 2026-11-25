# CoolCode visitor Worker

`worker.template.js` and its inlined `gateway.js` are the reviewed application source.
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

The owner-deployed production Worker has been downloaded and verified with all
250 catalogue IDs and the eleven-app API integration. The live `/registry` agrees.
No additional dashboard update is needed for this release.

The dashboard removed the final newline. The receipt records that transformation
and the actual downloaded-code hash; all other deployed bytes match the generated
source. The earlier list-formatting transformation remains supported for actual
manual deployments, but is not used by this release's receipt.

For a later manual update, copy the complete generated source from
[worker.js](https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/main/services/cloudflare-visitor/worker.js),
preserving all existing bindings and settings. Download the deployed module,
verify its source and `/registry`, and record the resulting receipt. Deployments
through `deploy.py` continue to require exact uploaded/downloaded bytes and refuse
to overwrite unexpected live changes.

## Public tool APIs and secrets

Use the existing Worker **Settings → Variables and Secrets → Secret**. These are
runtime bindings, never public frontend variables or files in tool repositories.
All four are configured and have passed real provider requests in this release.

| Tool | Secret bindings | GET routes below `/api/` |
| --- | --- | --- |
| Podcast Route | `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET` | `podcastroute/search?q=`, `episodes?id=`, `feed?url=` |
| Channel Queue | `YOUTUBE_API_KEY` | `channelqueue/channel?id=` or `handle=`, `playlist?id=&pageToken=`, `videos?ids=`, `search?q=` |
| Recipe Math (USDA only) | `FDC_API_KEY` | `recipemath/search?q=&page=`, `food?id=` |
| Distro Pilot | None | `distropilot/project?name=` |
| Feed Harbour | None | `feedharbour/feed?url=` |

`/api/status` returns configuration booleans only. Successful lookups return
`{fetched_at,data}`; failures return `{error:{code,message}}` with non-2xx status.
The captured time survives cached reads. The browser's saved private work remains
unchanged when a provider fails. Search terms and public feed URLs are sent to
Cloudflare and the relevant provider. Private notes, recipes and listening state
are not sent to this API.

The existing `DB` binding holds two additive tables, `gateway_cache` and
`gateway_budget`. Existing visit/report tables and administration are retained.
The cache has at most 256 entries, at most 500 KB each (1 MB for package evidence),
with expiry from 15 minutes to 24 hours. Errors are not cached. SQL upserts enforce
shared budgets across Worker instances: 50 YouTube searches/day, 5,000 ordinary
YouTube calls/day, 500 USDA calls/hour, 1,500 Podcast Index calls/day, 3,000 feed
fetches/day and 600 Repology calls/day. Repology also has an atomic 1.1-second
spacing lease. Requests rejected by that lease do not consume its daily allowance.
Cached reads remain available after source budgets are exhausted.

Repology's source deadline is 35 seconds; other providers use 12 seconds. Distro
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
