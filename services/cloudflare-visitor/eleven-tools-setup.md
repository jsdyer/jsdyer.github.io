# Eleven-tool API setup

The owner has already registered the eleven IDs. This update adds the live API
routes required by Podcast Route, Channel Queue, Feed Harbour, Distro Pilot and
Recipe Math. It also retains all 250 IDs and the existing visit/report/admin code.

1. Open the existing **coolcode-visitor-api** Worker, choose **Edit code**, and
   replace the complete module with `worker-next.js` from this release branch.
2. Deploy while retaining the existing **DB** D1 binding, compatibility date,
   routes and settings. No new database or account is needed. Two additive cache
   and request-budget tables are created on the first data request; existing
   visits and reports are unchanged.
3. Under **Settings → Variables and Secrets**, add these as **Secret**, then deploy:
   `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET`, `YOUTUBE_API_KEY`, `FDC_API_KEY`.
   Do not put their values in repository files or public frontend variables.
4. Open `/api/status` on the Worker URL. The three key-dependent capabilities
   should show `true`. This endpoint never prints key values.

Backbone Compare separately accepts `PEERINGDB_API_KEY` as an **Actions repository
secret** in `jsdyer/backbonecompare`; its browser interface uses the public API.
Manual Shelf, Mission Media, Renewal Bench, Trip Brief, Port Window, Distro Pilot
and Feed Harbour require no keys. Recipe Math's Canadian food dataset also works
without a USDA key.

Public search terms/feed URLs pass through Cloudflare and the relevant provider.
Private notes, queues, recipes and financial scenarios stay in the browser.
The API stores bounded temporary public responses, with original capture times,
for 15 minutes to 24 hours; it does not cache errors. Feed URLs must be public and
must not include credentials or secret tokens. Local/private feed files can be
opened directly in Feed Harbour. Keep the Worker on Cloudflare's ordinary public
outbound network; the feed fetcher must never gain private-network access.

The code has passing Node/SQLite gateway and existing visitor regression tests
and a Wrangler deployment dry run. Production source and live requests still
need verification after this manual deployment. This document does not claim
that the new API routes have already been deployed.

After all apps are verified, the release is reconciled into the main catalogue,
the canonical generated `worker.js`, watchdog registry, README and sitemap.
