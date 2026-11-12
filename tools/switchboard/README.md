# Switchboard

A start page for the services you run. Put your NAS, DNS console, pywb collections and photo scans in a small JSON file. Switchboard renders the groups and links on each request. It works with PHP 8 or later, including on a LAMP virtual host. The browser can display it with JavaScript disabled.

## Try it on your LAN

From the repository root:

```sh
php -S 0.0.0.0:8080 -t tools/switchboard/public
```

Open `http://YOUR-LINUX-MACHINE-IP:8080/` on the LAN, substituting your server's address. On the same machine, use `http://localhost:8080/`. The first run shows three sample entries with example hostnames. Press Ctrl+C to stop.

## Use your own services

From the repository root:

```sh
mkdir -p ~/.config/coolcode
cp -i tools/switchboard/services.example.json ~/.config/coolcode/services.json
vi ~/.config/coolcode/services.json
SWITCHBOARD_CONFIG="$HOME/.config/coolcode/services.json" php -S 0.0.0.0:8080 -t tools/switchboard/public
```

Each entry has a `group`, `name`, an absolute HTTP or HTTPS `url`, and an optional `note`. Entries appear in file order within each group. Updates show up when you reload the page. Use hostnames that your other devices can resolve or substitute LAN IPs.

## Serve from Apache

On a PHP-enabled virtual host, set the document root to the absolute path of `tools/switchboard/public`. Set `SWITCHBOARD_CONFIG` in the environment of the PHP handler to the absolute path of your private JSON file. With PHP-FPM this can be a pool setting such as `env[SWITCHBOARD_CONFIG] = /etc/switchboard/services.json`. Give the PHP worker read access to that file, and reload the relevant service after changing its configuration.

Anyone who can reach this page can see the links. Use the same LAN, VPN, or web server access controls as the rest of your internal dashboard. Keep real service inventories outside the public document root and this public Git repository.
