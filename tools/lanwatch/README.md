# LANWatch

A tiny Linux LAN host monitor that uses **ICMP ping + SQLite**. No Python packages, web account, Docker image, or cloud service needed.

- Monitors only the devices you explicitly add (no network scanning).
- Probes hosts concurrently, records each sample, and logs first observations plus UP/DOWN transitions.
- Stores its database in `~/.local/share/lanwatch/lanwatch.sqlite3` by default.
- Supports IPv4, IPv6, and hostnames, including `.local` and `home.arpa`.
- Exports recent samples to CSV for your own graphs or analyses.

## Install on Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y git python3 iputils-ping
mkdir -p ~/src && cd ~/src
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io/tools/lanwatch
python3 lanwatch.py --help
```

## First run

```bash
python3 lanwatch.py add router 192.168.1.1
python3 lanwatch.py add nas nas.local
python3 lanwatch.py check
python3 lanwatch.py status
python3 lanwatch.py history
python3 lanwatch.py export --limit 500 > recent.csv
```

Use `python3 lanwatch.py remove nas` to forget a device and its observations. Update a target by running `add` again with the same device name. Use `--db /path/to/other.sqlite3` **before** the subcommand to use a different database.

**Caution:** `DOWN` only means the ICMP echo probe failed; a device may be reachable via TCP but block ping. A laptop that sleeps will also appear offline. LANWatch is intentionally only a lightweight availability check, not a network scanner, security monitor, or inventory discovery agent.

## Schedule checks with cron on Slackware or another Linux host

With Python 3 and iputils installed, clone this repository at `~/src/jsdyer.github.io` and add the devices you want to monitor. Open your user's crontab with `crontab -e` and add this line for a check every five minutes:

```cron
*/5 * * * * /usr/bin/python3 "$HOME/src/jsdyer.github.io/tools/lanwatch/lanwatch.py" check >/dev/null
```

Use your regular account so scheduled checks and interactive commands use the same SQLite database. Run `python3 lanwatch.py history` from the project folder to read the results. Remove the crontab line to stop. Choose one scheduler for a given host.

## Auto-run every five minutes with systemd (user timer)

The unit file assumes the clone lives at `~/src/jsdyer.github.io`. Edit its path if you cloned elsewhere.

```bash
mkdir -p ~/.config/systemd/user
cp systemd/lanwatch.service systemd/lanwatch.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now lanwatch.timer
systemctl --user list-timers lanwatch.timer
journalctl --user -u lanwatch.service --no-pager -n 40
```

To run even when not logged in, you can enable user lingering if your machine's policy allows it: `sudo loginctl enable-linger "$USER"`. To stop monitoring: `systemctl --user disable --now lanwatch.timer`.

## Run tests

```bash
python3 -m unittest discover -s tests -v
```

## Privacy

The code is public, but the **host list, probe history, and database stay on your Linux machine**. Do not commit your database, CSV export, or personal inventory into the public repository. This project is offered as a small learning utility, not a replacement for a full monitoring stack.
