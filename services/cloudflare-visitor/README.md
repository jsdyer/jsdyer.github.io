# CoolCode visitor Worker

`worker.template.js` is the reviewed application source imported from production.
`worker.js` is generated from it and every ID in `data/tools.json` by
`python3 scripts/sync_operations.py`. Never hand-maintain a second tool array.

The existing `coolcode-visitor-api` Worker provides aggregate visits, private issue
reports and owner-only administration. `/registry` returns public catalogue IDs
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
239 catalogue IDs, including Contaminated Places, Query Confessional, Backup Ledger,
Park Ready, Tariff Bench, Clam Counter and Basket Math. The live `/registry` agrees.
No additional dashboard update is needed for this release.

The owner preserved the application code but appended IDs in a different order,
with a comment and without a final newline. The receipt records that exact list
literal and the actual downloaded-code hash. Verification accepts only the same
unique catalogue IDs and reconstructs the downloaded bytes; changes anywhere else
in the Worker still fail the receipt check. This is verification of an actual
manual deployment, not a replacement of the receipt with an unverified local hash.

For a later manual update, copy the complete generated source from
[worker.js](https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/main/services/cloudflare-visitor/worker.js),
preserving all existing bindings and settings. Download the deployed module,
verify its source and `/registry`, and record the resulting receipt. Deployments
through `deploy.py` continue to require exact uploaded/downloaded bytes and refuse
to overwrite unexpected live changes.
