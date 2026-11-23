# Customize your CoolCode tools

Starter selections are conveniences, not the tool's supported universe. These
tools accept custom inputs in the browser and keep their defaults in
`web/config.json` in their own repository. Edit that file on `main`; follow the
refresh step below when changing retained data as well as interface defaults.

| Tool | What you can enter immediately | Editable defaults | Publish or refresh |
| --- | --- | --- | --- |
| [FX Receipt](https://coolcode.ca/fxreceipt/) | Purchase, charge, currency pair, date or your own reference rate | [Currency defaults and provider choices](https://github.com/jsdyer/fxreceipt/blob/main/web/config.json) | Push config edits to `main`. Rates are fetched on demand; there is no stored transaction collection. |
| [Package Pulse](https://coolcode.ca/packagepulse/) | Any public npm package, including scoped names; optional comparison package | [Opening packages, shortcut names, release page size and timeline length](https://github.com/jsdyer/packagepulse/blob/main/web/config.json) | A main push refreshes the retained defaults, checks and publishes. The workflow also runs weekly; manual runs can refresh defaults. |
| [Art Timeline](https://coolcode.ca/arttimeline/) | Any museum search phrase; filter loaded works and compare two objects | [Search presets, opening artwork IDs and page size](https://github.com/jsdyer/arttimeline/blob/main/web/config.json) | Push interface edits normally. To collect new opening artwork IDs, run **Art Timeline · Check and publish** with its refresh option enabled, or use the collector documented in the repo. |
| [Label Compare](https://coolcode.ca/labelcompare/) | Any supported food barcode; import a previously saved receipt | [Saved labels, initial labels, comparison capacity and request limits](https://github.com/jsdyer/labelcompare/blob/main/web/config.json) | Push config edits; run **Label Compare · Check and publish** with **Refresh the saved labels listed in web/config.json** enabled when changing saved labels. |
| [Headline Vault](https://coolcode.ca/headlinevault/) | Keywords, exact phrase, dates, publication place, title or LCCN | [Starting searches, default fields and result page size](https://github.com/jsdyer/headlinevault/blob/main/web/config.json) | Push config edits; use **Headline Vault · Check and publish → Refresh saved searches** to populate new saved starting searches. Live searches work independently. |
| [Old News Oddities](https://coolcode.ca/oldnews-oddities/) | Your own phrase, word matching mode and year range | [Topic recipes, dates, labels and result page size](https://github.com/jsdyer/oldnews-oddities/blob/main/web/config.json) | A changed config triggers collection on the next main push. Weekly and explicitly requested workflow refreshes update the shelves too. |
| [Marine Names](https://coolcode.ca/marinenames/) | Any scientific name or AphiaID; open exported records | [Starting names, marine/living filters and request limits](https://github.com/jsdyer/marinenames/blob/main/web/config.json) | Push interface defaults to `main`. For a new retained capture, run `python3 scripts/refresh.py`, review and commit the new capture and data index. Earlier capture files remain available. |
| [Civic Lookup](https://coolcode.ca/civiclookup/) | Any Canadian postal code or explicit coordinates | [Location shortcuts, opening location and page limits](https://github.com/jsdyer/civiclookup/blob/main/web/config.json) | Push defaults to `main`. To replace the saved public example, run `python3 scripts/refresh_example.py` and commit its JSON. New live locations need no configuration change. |
| [Stream Atlas](https://coolcode.ca/streamatlas/) | Any station name, two-letter country code, language or genre | [Quick searches, country suggestions and retained station queries](https://github.com/jsdyer/streamatlas/blob/main/web/config.json) | Push interface edits to `main`. To rebuild the retained station shelf, run `python3 scripts/refresh.py` and commit `web/data/stations.json`. There is no background playback or polling. |
| [Password Exposure Check](https://coolcode.ca/pwncheck-kanon/) | A password, checked only after an explicit click | [Timeout and input/response size bounds](https://github.com/jsdyer/pwncheck-kanon/blob/main/web/config.json) | Push config edits to `main`. No collector, API key, stored password or check history exists. Keep analytics and password persistence out of this tool. |
| [Book Graveyard](https://coolcode.ca/bookgraveyard/) | Any title, author, subject or query; publication years and reading access | [Search presets, opening query, page size and shelf limits](https://github.com/jsdyer/bookgraveyard/blob/main/web/config.json) | Push presets to `main`. For a new retained opening query, run `python3 scripts/refresh_data.py`, review and commit the resulting data. Live searches remain independent. |
| [Format Shift](https://coolcode.ca/formatshift/) | Any artist name or MusicBrainz release/release-group ID; import a receipt | [Artist shortcuts, opening edition IDs and page limits](https://github.com/jsdyer/formatshift/blob/main/web/config.json) | Changing config on `main` triggers an identified API collection and publication, preserving the previous receipt on failure. The separate collection workflow can fetch arbitrary IDs into an importable artifact. |

Each repository's **Expand or customize** README section gives a working config
example and the exact command-line alternative. Limits for provider quotas,
comparison columns or maximum response sizes are explicit; they are separate
from the length of the starter list. Adding an entirely different upstream API
may still require an adapter because its response format and terms differ.

## Know which version you are viewing

A successful code deployment does not always collect new upstream data. Check
both the collection step and the deploy job when a refresh is required. Reload
an already-open tab after publication. Where a tool retains dated captures,
older captures keep their original coverage; adding an item today does not
rewrite the historical snapshot.

API failures should leave the last usable capture available and identify the
failed request. A saved result, a live result, no matches and a failed request
have different meanings. Keep those distinctions when extending a tool.
