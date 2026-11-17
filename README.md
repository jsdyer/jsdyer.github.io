# CoolCode.ca

A Linux workbench for archiving, self-hosting and running a home lab. The public site is a catalogue. The installable tools have Linux walkthroughs. Browser projects open directly from the catalogue.

| Project | What you can do | Runs with |
| --- | --- | --- |
| [Packet Detour](packet-detour/README.md) | Explore Canadian routing examples and inspect your own annotated hops. | [Open browser tool](https://coolcode.ca/packet-detour/) |
| [Protocol Cabinet](protocol-cabinet/README.md) | Step through DNS, HTTP and SMTP exchanges. | [Open browser demo](https://coolcode.ca/protocol-cabinet/) |
| [Rack Recipes](rack-recipes/README.md) | Plan a homelab stack and export its Compose file. | [Open browser tool](https://coolcode.ca/rack-recipes/) |
| [Archive Shelf](tools/archive-shelf/README.md) | Search newsletters and meeting minutes by page and open the original PDF at the passage you found. | Python 3, SQLite FTS5, and Poppler for PDFs |
| [Waystation](tools/waystation/README.md) | Capture your small websites into verifiable capsules, compare changes, and browse them after the original server disappears. | One Go executable; Linux, macOS, Windows |
| [Timefold](tools/timefold/README.md) | Travel through a private archive of photographs, notes, game saves and web fragments; explore tag constellations and export complete portable backups. | PHP 8.2+, Apache and MySQL/MariaDB; optional SQLite demo |
| [Tape Index](tools/tape-index/README.md) | Verify a backup of a WARC collection, photo scans or game saves against a SHA-256 manifest. | Python 3 |
| [Switchboard](tools/switchboard/README.md) | Serve a LAN start page with links to your archive, NAS and DNS console. | PHP 8+ |
| [Vhost Logbook](tools/logbook/README.md) | Summarize a local Apache access log by date and HTTP status. | PHP CLI 8+ |
| [LANWatch](tools/lanwatch/README.md) | Check the hosts you choose and keep their availability history in SQLite. | Python 3 and Linux iputils ping |

Try [Archive Shelf in the browser](https://coolcode.ca/archive-shelf/) with a fictional newsletter or follow [Finding the dial-up page](https://coolcode.ca/field-notes/finding-the-dial-up-page/) on Linux. [Field Notes](https://coolcode.ca/field-notes/) has an [RSS feed](https://coolcode.ca/field-notes/feed.xml).

## First run on Linux

For a self-contained project beyond LAMP, try [Waystation's disappearing-server demo](tools/waystation/README.md).
For the LAMP app, start with [Timefold's installation guide](tools/timefold/README.md).
It includes Docker, native Apache/MariaDB, and a PHP/SQLite demo. The repository
also includes [a hands-on GitHub workshop](tools/timefold/docs/github-guide.md)
covering Actions, Codespaces, Releases, issue forms, and Dependabot.

With Git and the PHP CLI installed, try the included six-request Apache log.

```sh
mkdir -p ~/src
cd ~/src
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io
php tools/logbook/logbook.php tools/logbook/example.log
```

If you already have the checkout, run `git pull --ff-only` in it and skip the clone. On Debian and Ubuntu the packages for Vhost Logbook, Switchboard, Tape Index, and LANWatch are `git python3 php-cli iputils-ping`. The project guides cover configuration, examples and output.

## Preview and publish the homepage

The catalogue lives in `data/tools.json`; category definitions are in
`data/categories.json`. The page layout is `templates/index.html`.
A Python standard-library build generates the complete static site in `dist/`.
Visitors see browser tools first and installation-required projects in their own
section. Explicit access metadata keeps those labels consistent; see the adding guide.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`. Add `--bind 0.0.0.0` if you intentionally want to
preview on your LAN. Standalone project sites are deployed separately; open their
links on `https://coolcode.ca/` rather than this local server.

PRs validate and build the site. Successful builds from `main` publish `dist/`
through GitHub Actions. `CNAME` retains the custom domain. PHP, Python and Go tools
run where you install them, not on GitHub Pages.

See [the one-time Pages rollout](docs/pages-rollout.md) before merging the catalogue
migration. The independent link audit reports broken or blocked URLs separately
from publishing.

## Add another project

- Small static utilities can live in their own top-level directory here.
- Substantial browser apps, data explorers and new independently released installable
  tools get their own repositories. Existing projects keep their current homes.
- Start new browser applications from
  [coolcode-tool-template](https://github.com/jsdyer/coolcode-tool-template).
- After verifying a tool's destination, add one entry to `data/tools.json`.

[Adding tools](docs/adding-tools.md) documents the metadata, commands and conventions.
Do not edit generated HTML or commit `dist/`. The featured homepage cards and this
short installable-project table are editorial selections, not a second full catalogue.
