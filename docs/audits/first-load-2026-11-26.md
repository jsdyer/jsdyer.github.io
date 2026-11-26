# CoolCode opening screens on November 26, 2026

Headless Chromium 158.0.8127.0 rendered all 272 public browser tools at 1365 × 850 and 390 × 844 CSS pixels. At both sizes, every opening screen displayed a primary heading and a line of descriptive text. The 11 catalogue entries that require installation have a different entry point and were outside this browser pass.

| Opening-screen observation | Desktop | Phone |
| --- | ---: | ---: |
| Browser tools opened | 272 | 272 |
| Visible primary heading | 272 | 272 |
| Visible descriptive text | 272 | 272 |
| Enabled control or link in view | 270 | 271 |
| Recognized map in view | 26 | 14 |
| Recognized map above its opening text in the same column | 0 | 0 |
| Horizontal overflow greater than four CSS pixels | 0 | 0 |
| Uncaught JavaScript exception | 0 | 0 |
| Allowed resource returned an HTTP error | 0 | 0 |

## What a visitor sees

- On a phone, Flight Weather now shows **Find an airport** before its coverage statistics. Release Receipt offers **Compare GDP releases**, and Broadband Atlas offers **Explore Langley, BC** before its long filter form. These labels give visitors a specific place, series or task to start with.
- Lightkeeper introduces the colour and flash pattern before its map. Clam Grounds explains the selected Halifax habitat example. Park Visits opens with a numeric comparison between two named historic sites. Their outputs help visitors understand what changing the selection will do.
- Rack Expiry now shows **Add a system** on both screens. Stream Atlas puts **Search the directory by name, country or genre** in view on desktop and **Choose a station** on the phone.
- Contract Patterns now puts **Inspect this amendment** beside the Canada Energy Regulator’s CA$22,701 amendment for Thought Cloud Inc. Sanctions Ledger offers **Compare the two captures** beside a single field that changed between November 22 and 23. The dates label the captured list editions. Transit Receipt opens its Halifax Route 62 comparison at Bridge Terminal Bay 1, where the first retained sighting was 7 minutes 10 seconds earlier than the saved estimate.
- Maple Phish now gives a dated Interac example directly below its introduction. On November 25, 2026, 15 distinct reports in a 100-row sample matched the brand name. Its introduction explains that a name match can be unrelated to impersonation.
- Two controls needed more time. Shield Check’s capture selector appeared in the 6.5-second desktop repeat. Civic Lookup immediately explains postal-code entry and shows the form while its saved example loads. **View the saved Ottawa city centre example** became usable at both widths by 6.5 seconds.

The [tool-by-tool evidence](first-load-2026-11-26.csv) records the displayed heading, opening text, first detected control or link, map position and exceptions. Positions are CSS pixels from the top of the viewport. A source credit, archive download or navigation link can qualify as a control. An early link can be helpful when it opens a named example. The text detector looks for at least six words and 34 characters in a visible paragraph or introductory element. The count measures presence and placement. Establishing comprehension requires observing visitors use the tools.

## Repeat the observations

The [audit script](../../scripts/audit_first_load.py) reads the published catalogue routes from `data/tools.json`. A fresh Chromium context opens each route without clicking, typing, granting permissions or submitting forms. It allows the tool’s public static files, shared site assets, selected font or library CDNs, and standard OpenStreetMap image tiles. Live lookup endpoints, background services and WebSockets are blocked. The script counts uncaught page exceptions and HTTP errors for allowed resources. The measurements cover entry screens and exclude live-service availability, form completion and physical-device behaviour.

This audit reused production entry documents fetched that day and refreshed 63 changed tools after their releases. Chromium rendered the captured documents at their real production URLs with saved production assets. The two viewports shared the static-response cache. The measurement was taken 1.4 seconds after DOMContentLoaded. Selected loading or out-of-view controls were checked again after 6.5 seconds. A fresh directory creates a new capture.

```sh
python -m pip install -r tests/browser-requirements.txt
python -m playwright install chromium --only-shell
audit_dir=$(mktemp -d)
python scripts/audit_first_load.py --cache "$audit_dir/responses" --out "$audit_dir/capture"
python scripts/audit_first_load.py --cache "$audit_dir/responses" --out "$audit_dir/measured" --screenshots
```

Pass `--tool ID` to inspect a subset, `--viewport phone` for one width, or `--settle-ms 6500` for a longer observation. Each run writes a JSON record per viewport. This is a manual check.
