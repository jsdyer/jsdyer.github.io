# Packet Detour

An offline, browser-based Canadian routing notebook. The three samples use invented locations and round-trip times to illustrate a detour via Seattle, a route with Canadian labels throughout, and a route with missing locations.

Open `index.html` locally or visit [Packet Detour on CoolCode](https://coolcode.ca/packet-detour/). Choose an example to load its ledger and editable notes. Paste your own rows to compare the sequence of country labels and each hop’s RTT. All processing happens in the tab. Reloading restores the Seattle example.

## Note format

Supply one hop per line in traversal order. Separate the three fields with pipes or tabs. Blank lines are ignored.

```text
Langley access | CA | 1.8
Unlocated hop | ? | 9.1
Seattle transit | US | 13.4
Victoria destination | CA | 25.1
```

The location is free text of up to 100 characters. The country is a user-supplied two-letter label or `?`. RTT accepts 0–60,000 milliseconds with up to three decimal places, or `?`. The ledger accepts up to 128 hops. Invalid notes produce a line-specific message where possible and preserve the last valid ledger.

The change count compares adjacent, known country labels. For `CA → ? → US → CA`, it counts one adjacent change, from US to CA. Missing locations, incomplete traces and inaccurate geolocation limit what these notes can establish. The bars use per-hop round-trip times from the source. A difference between bars cannot establish the latency of the link between those routers.

The application uses plain HTML, CSS and JavaScript and performs no probes, API requests or automatic geolocation. For real regional measurements and traceroute methodology, see [RIPE Atlas Region Meshes](https://atlas.ripe.net/docs/tools-and-code/region-meshes).
