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

## Verified deployment

The manually deployed Worker was downloaded and verified on 2026-11-24. Its
public `/registry` matches all 232 catalogue IDs. The dashboard editor omitted
one final newline; the receipt records that precise byte transformation and the
actual downloaded hash. Any other source change still fails verification.
Future deployments through `deploy.py` use an exact byte match by default.

Copy the generated source from
[worker.js](https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/main/services/cloudflare-visitor/worker.js).
The connector still requires Workers Scripts Write for future API deployments;
the current deployment is verified and no longer pending.
