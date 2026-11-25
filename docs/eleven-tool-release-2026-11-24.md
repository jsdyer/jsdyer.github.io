# Eleven useful workspaces — November 24, 2026

This release adds 11 functioning browser apps, bringing CoolCode to **250 tools:
239 browser tools and 11 installable tools**. The complete inventory accounts for
**253 public repositories**, with **241 listed source repositories**, 12 documented
non-tool exclusions and no unreviewed public repositories. No repositories need
deletion for this release.

| App | Useful task | Data and update behaviour |
| --- | --- | --- |
| [Manual Shelf](https://coolcode.ca/manualshelf/) | Find equipment manuals, compare editions and maintain a private equipment cabinet | Internet Archive search, metadata and actual file links; on demand |
| [Podcast Route](https://coolcode.ca/podcastroute/) | Find podcasts, maintain a listening queue and track playback | Podcast Index and publisher audio; newest 100 episodes per feed, with publisher archive links |
| [Feed Harbour](https://coolcode.ca/feedharbour/) | Read public RSS/Atom, import OPML and organize unread/saved items | Arbitrary public feed URLs through the Worker; private XML imports stay local |
| [Renewal Bench](https://coolcode.ca/renewalbench/) | Compare Canadian mortgage renewal quotes over a common horizon | Local calculations with stated semiannual compounding, payment dates, prepayments and fees |
| [Port Window](https://coolcode.ca/portwindow/) | Plan around scheduled cruise calls, overlaps and personal travel buffers | 1,388 entries in Vancouver, Victoria and Juneau's official 2027 schedules; daily capture |
| [Distro Pilot](https://coolcode.ca/distropilot/) | Compare Linux package wishlists and plan release migrations | Daily package/lifecycle capture plus arbitrary live Repology project lookup |
| [Recipe Math](https://coolcode.ca/recipemath/) | Calculate and compare recipes by portions, servings or final weight | All 5,993 Canadian Nutrient File foods; monthly source check and optional live USDA search |
| [Mission Media](https://coolcode.ca/missionmedia/) | Find original NASA media, captions and credits; organize research boards | NASA image/video/audio library on demand |
| [Backbone Compare](https://coolcode.ca/backbonecompare/) | Compare observed ASN neighbours and listed peering locations | RIPEstat and PeeringDB; four starter networks checked daily plus arbitrary live ASN lookup |
| [Channel Queue](https://coolcode.ca/channelqueue/) | Build a learning queue from YouTube channels/playlists with timestamp notes | Official YouTube API and player; user notes persist separately from temporary API metadata |
| [Trip Brief](https://coolcode.ca/tripbrief/) | Build a private itinerary and dated advisory brief | All 230 destinations in Canada's official advisory index, checked hourly |

The tools support inputs beyond starter examples. Saved private work uses explicit
browser saves/imports/exports. Source dates are retained separately from build time.
Missing nutrients, unknown schedule times, absent indexed packages and uncertain
network observations are not silently replaced with zeros or stronger claims.

## Integration

The shared catalogue generates the homepage, browser/install sections, search,
README, report choices and sitemap. Each source manifest and marked guide is
included in the hub. The audit script reads the catalogue rather than another
hand-maintained app list. The operations registry explicitly records schedules
or their absence for all 241 source repositories.

The watchdog now has **176 targets**, adding five collectors:

| Repository | Schedule (UTC) | Published check field | Maximum age |
| --- | --- | --- | --- |
| `tripbrief` | Hourly, minute 29 | `data/status.json` → `checked_at` | 6 hours |
| `portwindow` | Daily 10:43 | Same | 72 hours |
| `distropilot` | Daily 08:31 | Same | 72 hours |
| `backbonecompare` | Daily 08:53 | Same | 72 hours |
| `recipemath` | First of each month, 12:23 | Same | 45 days |

All five have separate inactivity guards covering their collector and guard.
The installed watchdog downloads the generated registry every pass. **No watchdog
program edit or reinstall is needed.** If its GitHub App uses selected repositories,
add these five repositories to the installation. The private server's next report
is the evidence for its access; public CI cannot verify private server credentials.

## API setup and production evidence

The existing `coolcode-visitor-api` Worker serves the new read-only routes while
retaining visits, reports, administration, its DB binding and all 250 tool IDs.
The owner deployed it manually. Downloaded source and live `/registry` were checked;
the actual source hash is recorded in `data/operations/cloudflare-deployment.json`.
The dashboard's removed final newline is the only source transformation.

Worker Secrets are configured as `PODCASTINDEX_API_KEY`,
`PODCASTINDEX_API_SECRET`, `YOUTUBE_API_KEY` and `FDC_API_KEY`. They are not in
frontend files or Git. Backbone Compare separately accepts optional
`PEERINGDB_API_KEY` under its repository's Actions secrets. Other apps require no
keys. See [the Worker guide](../services/cloudflare-visitor/README.md) for routes,
bounded caches, global provider budgets, privacy and source-timeout behaviour.

Real production checks included Podcast Index search/100-episode retrieval/feed
lookup and an audio download returning 206 audio/mpeg; NASA YouTube channel/uploads
and five video details; USDA food search/detail normalization; both Feed Harbour
starter feeds (110 combined items); and Distro Pilot's arbitrary `jq` lookup beyond
the starter list. Repology required a 35-second upstream deadline from Cloudflare;
SQLite returned 724 records in 25 seconds, and its next request reused the same
capture. Other providers retain a 12-second deadline.

Actual Internet Archive PDF, NASA original image/assets/captions, official CLAA
PDFs, Canadian food ZIP and advisory JSON downloads were checked. All 11 public
app pages returned HTTP 200 with their finished interfaces. Collector status and
data checks distinguish a failed download from a successful source refresh.

Each app has model/collector/build tests and actual Chrome workflow tests. Browser
tests use fixtures for reproducibility; the production provider checks above use
real responses. The hub passes 76 Python tests, 64 Node tests (including the new
SQL-backed API tests), 99 watchdog tests, generated-file checks and the 250-route
build/sitemap checks. CI and live-page verification accompany publication; no
test page events or issue reports were inserted during Worker verification.

Historical reports for the previous three- and four-tool releases retain their
then-current counts; this report and the generated catalogue describe this release.
