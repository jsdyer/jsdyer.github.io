# Five-tool coverage and persistence update

This follow-up expands the existing Feed Harbour, Podcast Route, Port Window,
Distro Pilot and Backbone Compare releases. Their repository IDs and public
routes are unchanged.

| Tool | User-facing change | Evidence and limits |
| --- | --- | --- |
| Feed Harbour | Searchable directory, individual feed buttons and optional topic packs across all nine CoolCode subjects | 33 sources checked through the deployed gateway and parsed as RSS, Atom or RSS 1.0. No bulk subscription or feed fetch happens without an explicit action. Arbitrary feeds, OPML and local XML remain supported. Discovery and validation receipts live in the app repository. |
| Podcast Route | Automatic saving for followed shows, queue, notes and playback positions | Browser storage, visible save/failure state, explicit temporary-tab choice, export and clear. Reload restores the same browser's workspace. Other devices and cleared/private browser storage do not share it. Versioned assets prevent old scripts from accompanying a new page. |
| Port Window | Adds Halifax, Charlottetown, Saint John, Sydney and Louisbourg to the three Pacific ports | Sydney has 90 and Louisbourg 6 verified 2026 calls. Pacific sources publish 2027; the app keeps seasons separate. Halifax's official source rejects automated access; Charlottetown and Saint John have not published the next schedule. Their source links and individual status stay visible. Missing or failed sources never become invented calls. |
| Distro Pilot | Searchable project and distribution browsers | 64 verified projects and 20 release choices across nine distribution families. Rolling/development releases and ended support are labelled. Linux Mint and other absent index targets are explained rather than equated to a parent distro. Arbitrary project lookup and older imported captures remain supported. |
| Backbone Compare | Provider-name/alias search and Eastlink support | Eight full captures and 13 starter directory entries; public PeeringDB search reaches beyond the starter directory. Eastlink is AS11260 / Bragg Communications; the live directory also exposes its regional ASN records. This is not a complete provider or physical-route map. |

## Deployment and integration

All five applications passed their required unit tests, offline builds and hosted
Chrome workflow checks before publication. Live checks verify real source payloads
and the ordinary browser tasks; source failures remain visible rather than being
converted into empty success. Asset URLs share a deterministic release revision
to prevent a cached script from being mixed with a newer page.
The source collector schedules remain unchanged: Port Window 10:43 UTC,
Distro Pilot 08:31 UTC and Backbone Compare 08:53 UTC daily. Feed Harbour and
Podcast Route use visitor-triggered APIs and have no scheduled collector.

Port Window's status timestamp now means the oldest successful check among
available schedules. A failed retained capture keeps its original date; pending
ports and failed sources are separate per-port states. The catalogue and watchdog
probe labels use this meaning. The reviewed collection step is now
`Refresh official port schedules`.

The catalogue and README guide excerpts describe the new coverage and saving
behavior. Sitemap generation retains the same five URLs. The public repository
audit accounts for all 253 repositories: 241 catalogue sources and 12 explained
non-tool exclusions. There are no new repositories to grant to the watchdog App.

The Worker registry still accepts all 250 catalogue IDs. Worker code and API
secrets are unchanged. The watchdog downloads the regenerated target registry
from GitHub on its next pass; no server code or timer edit is required for this
update. This release does not claim to inspect the user's private server runtime.
