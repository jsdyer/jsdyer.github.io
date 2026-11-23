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
