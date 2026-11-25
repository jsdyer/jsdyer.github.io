# Seven practical tools: production Worker update

Copy the **complete** generated [worker.js](worker.js) into the existing
`coolcode-visitor-api` Worker editor and deploy it. This release retains every
existing tool ID and adds Halifax Next, Parcel Bench, Inspection Trail, Weather
Window, Fuel Window, Wage Window and Care Compass (257 IDs in total).

The update also adds the Halifax real-time adapter, Nova Scotia inspection
search adapter, Canada Post production APIs and current federal corporation
details. Adding the seven names alone does not install these API handlers.

## Bindings

Keep the current `DB` binding, existing keys, compatibility settings and routes.
No additional database binding or migration command is needed. Small additional
cache and request-budget tables are initialized by the handlers.

In **Settings → Variables and Secrets**, use type **Secret** for:

| Binding | Value |
| --- | --- |
| `CANADAPOST_CLIENT_ID` | Canada Post production **API Key**, not the customer number |
| `CANADAPOST_CLIENT_SECRET` | Matching Canada Post production **API Secret** |
| `ISED_CORPORATIONS_API_KEY` | Federal Corporation API key |

These bindings have already been added. The configuration check found
`CANADAPOST_CLIENT_SECRET` as a plain-text variable; change its type to Secret
while retaining its value. No key belongs in a public repository or browser code.
The customer number is not needed: Parcel Bench requests consumer counter rates
and excludes commercial account pricing. The approved production integration is
used directly; no additional account-registration step is part of this release.

Weather Window, Fuel Window, Wage Window, Care Compass and Halifax Next need no
API keys. The inspection adapter uses an anonymous session with the public
provincial search. Existing Podcast Index, YouTube and USDA keys remain unchanged.

## Verification after deployment

- `/health` should return `{"ok":true}`.
- `/registry` should contain all 257 catalogue IDs.
- `/api/status` should include `halifaxnext`, `inspectiontrail`, `parcelbench`
  and `corporateghosts`. The last two flags show that bindings exist; successful
  live provider requests separately verify the credentials and response format.
- Exercise Halifax departures/alerts, an arbitrary Nova Scotia inspection search,
  a Canada Post quote/outlet lookup and a current federal corporation lookup.
- Download the deployed module, compare it with this generated file and only then
  update `data/operations/cloudflare-deployment.json`.

The editor errors from the earlier Worker are corrected: both fatal UTF-8
decoders explicitly set `ignoreBOM:false`, and invalid request encoding becomes
a `SyntaxError` without accessing the Node-specific `TypeError.code` property.
The catalogue workflow now checks the generated Worker against pinned Cloudflare
types. Runtime tests cover the adapters, malformed data, rate limits, credentials,
cache boundaries and preservation of the earlier public APIs.

The watchdog configuration is generated from the repository workflows. Its
installed timer downloads the latest configuration automatically; the server
script does not need editing for these additions. If its GitHub App uses selected
repositories, that installation must include the new scheduled repositories.
The next watchdog report is the evidence of successful access and dispatch.
