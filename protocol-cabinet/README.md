# Protocol Cabinet

[Open Protocol Cabinet](https://coolcode.ca/protocol-cabinet/) to inspect real protocol evidence. Choose HTTP, DNS or Email. Both live buttons perform read-only requests when clicked. File and paste workflows run locally and accept up to 8 MiB.

<!-- coolcode:guide -->
Open a browser HAR and sort by slowest request, inspect the answer rows in a DNS Lens export, or open an email’s original headers to read its recorded handoffs in delivery order.
<!-- /coolcode:guide -->

* **HTTP** accepts browser HAR exports and can fetch this page’s live HEAD response. Search by hostname or status, compare request timings, and step through selected response headers. A missing timing remains unreported. Query strings, cookies, authorization and bodies are omitted from the viewer.
* **DNS** accepts a single JSON DNS-over-HTTPS reply or the primary view of a downloaded [DNS Lens report](https://coolcode.ca/dnslens/). It shows the recorded return code, answer types, TTLs and DNSSEC AD flag. A live Google Public DNS lookup for CoolCode is available.
* **Email** accepts an EML file or pasted original headers. It unfolds Received fields, reverses their order to start at the earliest recorded hop and shows the text behind each handoff. A server’s claim and timestamp can be incomplete or inaccurate.

For a local preview, serve the repository over HTTP. Compatibility links such as `#http/cached` open the corresponding protocol.
