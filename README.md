# CoolCode.ca

A Linux workbench for archiving, self-hosting and running a home lab. The public site is a catalogue. Each project lives in its own directory with source and a Linux walkthrough.

| Project | What you can do | Runs with |
| --- | --- | --- |
| [Timefold](tools/timefold/README.md) | Travel through a private archive of photographs, notes, game saves and web fragments; explore tag constellations and export complete portable backups. | PHP 8.2+, Apache and MySQL/MariaDB; optional SQLite demo |
| [Tape Index](tools/tape-index/README.md) | Verify a backup of a WARC collection, photo scans or game saves against a SHA-256 manifest. | Python 3 |
| [Switchboard](tools/switchboard/README.md) | Serve a LAN start page with links to your archive, NAS and DNS console. | PHP 8+ |
| [Vhost Logbook](tools/logbook/README.md) | Summarize a local Apache access log by date and HTTP status. | PHP CLI 8+ |
| [LANWatch](tools/lanwatch/README.md) | Check the hosts you choose and keep their availability history in SQLite. | Python 3 and Linux iputils ping |

## First run on Linux

For the new LAMP app, start with [Timefold's installation guide](tools/timefold/README.md).
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

If you already have the checkout, run `git pull --ff-only` in it and skip the clone. On Debian and Ubuntu the packages for all four projects are `git python3 php-cli iputils-ping`. The project guides cover configuration, examples and output.

## Preview and publish the homepage

From the repository root, run this to preview on your LAN:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Open `http://localhost:8000/` on the Linux machine or `http://YOUR-LAN-IP:8000/` from another device. Press Ctrl+C to stop. Switchboard has its own PHP server command in its guide.

GitHub Pages publishes the static homepage at [coolcode.ca](https://coolcode.ca/). The root `CNAME` records the custom domain, and `.nojekyll` enables static publishing. The PHP and Python tools run on the machine where you install them.

## Add another project

Put the code and a short README in a new directory under `tools/`. Include a command someone can run with sample data. Add a project card to the directory in `index.html` and a row in the table above. Preview the page locally, then commit the files and push to `main`. The [Pages workflow history](https://github.com/jsdyer/jsdyer.github.io/actions) shows when the updated site is deployed.
