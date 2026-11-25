# Second discovery batch API update

Replace the existing `coolcode-visitor-api` Worker with `worker.js` from this directory.
Keep the current DB binding and Secrets. The update preserves all 271 registered tool
IDs and all existing API handlers, including Screen Places and Plane Here.

No new credential is needed: `TMDB_READ_ACCESS_TOKEN` and `WOLFRAM_APP_ID` are already
configured as Secrets. No separate migration or binding is needed; the new bounded
cache and quota tables are created on first use in the existing D1 database.

| Route | Purpose | Limits |
| --- | --- | --- |
| `GET /api/screenradar/person?wikidata=Q...` | Exact Wikidata-to-TMDb person lookup and notable acting credits | 30 distinct credits; one-day cache; 1,000 lookups/day |
| `GET /api/domain-biography/archive?domain=example.ca&mode=homepage` | Successful HTML homepage capture observations | 2,500 rows, explicit truncation, six-hour cache |
| `GET /api/domain-biography/archive?domain=example.ca&mode=pages` | Archived about/contact URLs | 500 distinct URLs; optional `from`/`to` years on both modes |
| `POST /api/measurebench/answer` | Explicit optional Wolfram Short Answers | 300-character JSON `query`, 50 uncached attempts/day and 1,000/calendar month; answer cache up to seven days |

Wolfram caps are shared across all Worker instances and enforced by one atomic D1
statement. Failed provider attempts count. Cached answers remain available at the
limit. No provider call is made if D1 is unavailable. The cache stores a hash of the
normalized query and the answer, not raw input or the AppID; answers can repeat
parts of the submitted query. Do not submit private information. Local calculations
never call the Worker. The browser submits a query only after an explicit click.
The shared cache retains at most 512 entries, so entries can be evicted before expiry.

Wayback counts describe the requested homepage and returned date range, not every
page on the domain or its registration date. Truncated results are lower bounds.
Source outages remain visible and must not be interpreted as zero captures.

## Validation

The new gateway has real SQLite tests for quota boundaries, credential isolation,
cache behavior, archive caps/date filtering, safe URLs and actor identity. A workerd
runtime test exercises the real D1 binding with eight simultaneous requests at the
last daily quota slot: exactly one provider request succeeds. Existing gateway tests
and Cloudflare type checks also pass. Live provider verification follows the owner's
manual Worker deployment; unit fixtures are not evidence of live provider availability.

The current deployed code is deliberately not replaced by tooling: the owner asked
to paste Worker updates manually. A committed update is not a deployed API update.
