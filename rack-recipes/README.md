# Rack Recipes

A browser-based Compose planner for a small Linux homelab. Pick FreshRSS, linkding or Uptime Kuma in any combination, change the host RAM, inspect the generated YAML, then copy or download it. The planner runs entirely in the browser.

## Try it

From the repository root, run `python3 -m http.server 8000 --bind 127.0.0.1` and open [the local planner](http://127.0.0.1:8000/rack-recipes/). Opening this directory’s `index.html` directly also works.

## Run the generated recipe

Save `compose.yaml` in a dedicated folder on a host with a current Docker Engine and Docker Compose. From that folder, run the following commands.

```sh
docker compose config --quiet
docker compose up -d
docker compose ps
```

| Service | Address on the Docker host | First run |
| --- | --- | --- |
| FreshRSS | `http://127.0.0.1:8080` | Open the installer, select SQLite and create your account. Feed refreshes are scheduled twice hourly. |
| linkding | `http://127.0.0.1:9090` | Run `docker compose exec linkding python manage.py createsuperuser` and respond to its prompts. |
| Uptime Kuma | `http://127.0.0.1:3001` | Open the local setup page, create an administrator and add a monitor. |

Published ports bind to IPv4 loopback on the Docker host. If a port is in use, edit the host port in the downloaded mapping. On a remote host, forward the chosen port over SSH to use it from a workstation. Local Docker named volumes hold service data. Run `docker compose stop` to pause the services and `docker compose start` to resume. The selected image tags follow upstream releases; pin a tested version or digest for repeatable deployments.

RAM figures are planning allowances for light use. They include a fixed 1 GiB host reserve and a per-service estimate shown in the UI. Compose does not set memory limits. Measure your workload with `docker stats` and leave room for other host processes. Available disk and architecture compatibility also depend on the host.

## Service definitions

Edit the `services` array in `rack.js` to update images, host/container ports, mounts, setup steps and memory estimates. The planner uses the upstream projects' installation guides.

- [FreshRSS Docker guide](https://github.com/FreshRSS/FreshRSS/blob/edge/Docker/README.md) and [Compose example](https://github.com/FreshRSS/FreshRSS/blob/edge/Docker/freshrss/docker-compose.yml)
- [linkding installation and first-user setup](https://linkding.link/installation/)
- [Uptime Kuma Compose example](https://github.com/louislam/uptime-kuma/blob/master/compose.yaml) and [installation notes](https://github.com/louislam/uptime-kuma#-how-to-install)
