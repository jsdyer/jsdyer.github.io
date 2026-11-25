# Four-tool release — 24 November 2026

Park Ready, Tariff Bench, Basket Math and Clam Counter have completed implementation
and independent code review. The evidence below includes checks completed on
25 November UTC. Source-access limitations remain explicit.

## Publication evidence

| Tool | Verified result | Publication status |
| --- | --- | --- |
| [Park Ready](https://coolcode.ca/parkready/) | Complete BC Parks pagination produced 1,037 parks and 501 linked advisories; successful source check `2026-11-25T04:30:42Z`. Date-only values, advisory expiry, exact-year gate windows and access filters have regression coverage. | Live; [collection, browser checks and publication](https://github.com/jsdyer/parkready/actions/runs/45547243390) passed. |
| [Tariff Bench](https://coolcode.ca/tariffbench/) | BC Hydro and Nova Scotia Power rates checked against official sources. Tier thresholds, riders, time-of-day adjustments and incremental device costs verified. | Live; [final verification and publication](https://github.com/jsdyer/tariffbench/actions/runs/45547111855) passed. |
| [Basket Math](https://coolcode.ca/basketmath/) | Exact decimal/unit calculations and promotion/coupon rules verified, including 30,000 independent comparisons against exhaustive purchase quantities. Narrow-screen tax assumptions remain readable. | Live; [final tests, Chrome checks and publication](https://github.com/jsdyer/basketmath/actions/runs/45547412760) passed. Published assets match the reviewed build byte for byte. |
| [Clam Counter](https://coolcode.ca/clamcounter/) | All nine restaurant sources checked, including the Pleasant St. menu image; 11 dishes retain stated prices, unknown market prices, portions and availability caveats. CRA's 14% Nova Scotia HST confirmed. | Live; application/browser tests and Pages publication passed in [the initial run](https://github.com/jsdyer/clamcounter/actions/runs/45547509942) and [official-menu follow-up](https://github.com/jsdyer/clamcounter/actions/runs/45547982574). Source-monitor failures remain explicit; see the source-access note below. |

Independent local suites passed: Park Ready 9 Node and 18 Python tests; Tariff
Bench 17 and 12; Basket Math 20 and 12; Clam Counter 8 and 31. Local Chromium was
unavailable, so actual browser execution is verified through the linked GitHub runs.

## Integration evidence

The regenerated hub contains **239 tools: 228 browser tools and 11 installable tools**,
covering **230 source repositories**. The complete repository inventory reconciles
**242 public repositories, 12 documented exclusions and no unreviewed repositories**.
The operations registry contains **171 scheduled workflows** and passes the installed
watchdog configuration validator. Guide/README synchronization, catalogue build,
generated sitemap and deployment-receipt checks pass. Local validation passed 76 Python, 47 Node and 99 watchdog tests.
The associated publication run and browser checks are recorded in the repository
[Actions history](https://github.com/jsdyer/jsdyer.github.io/actions/workflows/pages.yml).
Homepage/search and sitemap are generated from this same validated catalogue.

The owner deployed the Cloudflare Worker, and its live registry was verified with
239 tool IDs. The downloaded deployed module has SHA-256:

```text
9b6b0869bc970ce27d25deb22f703ce58310c6fe75cefa2313b4ce03da6c5c11
```

The deployment receipt preserves exact downloaded bytes. Reviewed tool-list order,
comments and final-newline differences do not permit changes elsewhere in the
Worker. Hub token-origin/redirect protections and receipt/integration tests passed
(6 repository-audit tests, 14 operations tests and 3 live-registry tests).
Live registry checks compare unique ID membership, accepting harmless list order
differences while rejecting duplicates, missing IDs and unexpected IDs.

## Source-access findings

The first Clam Counter run reached eight restaurant sources but received HTTP 403
from Palladium's ordering host. Its official restaurant menu and menu image were
reviewed as an alternative; that source passed on the next GitHub run. The official
menu lists market price, which remains unknown in comparisons. That next run
received invalid menu/image bodies from three other restaurant hosts that had
passed previously. Their preserved check timestamps and visible error status
correctly distinguish this from current data. These observed external-source failures remain visible; successful app deployment
does not imply every menu check succeeded.

## Scheduling and server action

| Tool | GitHub schedule, UTC | Published freshness check |
| --- | --- | --- |
| Park Ready | `17 * * * *` — hourly at minute 17 | `data/status.json.checked_at`; maximum age 6 hours |
| Clam Counter | `47 11 * * 2` — Tuesdays at 11:47 | `data/status.json.checked_at`; maximum age 15 days |

Both scheduled repositories include inactivity guards. Tariff Bench is a reviewed
rate edition and Basket Math calculates locally; neither needs a public collector
or watchdog target. No API keys or service registrations are required by these tools.

This release changes the watchdog registry, **not the installed watchdog runtime**.
The existing server adopts published targets automatically; no reinstall is needed.
If its GitHub App uses selected repositories, grant access to `parkready` and
`clamcounter`, then confirm the next server report sees both targets. Public GitHub
checks cannot verify the private server's credentials or running state. See the
[watchdog maintenance guidance](../services/refresh-watchdog/README.md).

## Interpretation limits

- Park records and gate dates are planning evidence, not an assertion that a park
  is open or safe. Published notices are not a complete historical archive or future
  forecast; read the official conditions before travelling.
- Tariff Bench's static reviewed edition is valid through 31 December 2026. It does
  not fetch new rates automatically or forecast future bills; rate changes require
  another source review.
- Clam Counter's weekly checks detect source changes, not current prices or stock.
  Changes require manual review. Unknown prices remain unknown, listed hours do not
  confirm kitchen availability, and unweighed dishes are not equal-weight comparisons.
  Handled source failures publish their current error status before the workflow
  reports failure; they never advance the last complete successful-check timestamp
  or replace reviewed menu prices.
