# Rack Recipes

A browser-based Compose planner for a small Linux homelab. Choose among twelve services for a media library, monitoring, development and personal records, budget RAM, assign host ports and choose where each service stores its data. Copy or download the generated YAML. Recipe files and selections stay on your device.

<!-- coolcode:guide -->
Plan a media server or monitoring stack from 12 services, change ports and storage, and reopen the exported Compose file later.
<!-- /coolcode:guide -->

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
| [Gitea](https://docs.gitea.com/installation/install-with-docker/) | `http://127.0.0.1:3000` | Choose SQLite3 in the installer, enter the address shown here as the base URL and clone repositories over HTTP. |
| [Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/) | `http://127.0.0.1:3030` | Sign in, change the initial admin password and add a data source. For project folders, give container user 472 write access first. |
| [changedetection.io](https://github.com/dgtlmoon/changedetection.io) | `http://127.0.0.1:5000` | Add a public page URL as a watch. The included HTTP fetcher works with pages served as HTML. |
| [ntfy](https://docs.ntfy.sh/install/) | `http://127.0.0.1:8085` | Subscribe to a topic in the web interface, then publish a test message to that topic using the same local server. |
| [Navidrome](https://www.navidrome.org/docs/installation/docker/) | `http://127.0.0.1:4533` | Put readable music files in ./media/music before startup, then create the admin account and scan the library. |
| [Audiobookshelf](https://www.audiobookshelf.org/docs/) | `http://127.0.0.1:13378` | Put readable books in ./media/audiobooks. Create the first user and add /audiobooks as an audiobook library. |
| [Actual Budget](https://actualbudget.org/docs/install/docker/) | `http://127.0.0.1:5006` | Open the loopback address on your host, set a server password and create or import a budget. |
| [Mealie](https://mealie.io/documentation/getting-started/installation/sqlite/) | `http://127.0.0.1:9925` | Use the first-login instructions in the installation guide, change the account password and import your first recipe. |
| [Memos](https://usememos.com/docs/deploy/docker) | `http://127.0.0.1:5230` | Open the setup page and register the first administrator. |

The table shows default ports. Published ports bind to IPv4 loopback on the Docker host. Change a host port in the planner to update its mapping, setup address and download together. Two selected services sharing a host port block the export. Check other applications on the host for additional conflicts. On a remote host, forward the chosen port over SSH to use it from a workstation. Choose Docker volumes for Compose-managed storage, or project folders for bind mounts under `./data/<service>/<volume>/` beside the YAML file. The setup panel lists the volume keys or folder paths for each selected service. Switching this setting on an existing deployment points the service to a different location. Migrate the data separately if you intend to keep it. Run `docker compose stop` to pause the services and `docker compose start` to resume. The selected image tags follow upstream releases; pin a tested version or digest for repeatable deployments.

RAM figures are planning allowances for light use. They include a fixed 1 GiB host reserve and a per-service estimate shown in the UI. Compose does not set memory limits. Measure your workload with `docker stats` and leave room for other host processes. Available disk and architecture compatibility also depend on the host.

## Reopen a recipe

Select **Open a saved recipe** and choose a previously downloaded YAML file. New exports carry the chosen services, host RAM, ports and storage in the `x-rack-recipes` Compose extension. The planner reads those settings. Edits made by hand elsewhere in the YAML stay in the original file. An unmodified export from the earlier three-service planner also reopens with its original services, default ports and Docker volumes. Earlier exports did not record RAM, so the current RAM selection carries over.

## Service definitions

Edit the `services` array in `recipe.js` to update images, host/container ports, mounts, setup steps and memory estimates. The planner uses the upstream projects' installation guides.

- [FreshRSS Docker guide](https://github.com/FreshRSS/FreshRSS/blob/edge/Docker/README.md) and [Compose example](https://github.com/FreshRSS/FreshRSS/blob/edge/Docker/freshrss/docker-compose.yml)
- [linkding installation and first-user setup](https://linkding.link/installation/)
- [Uptime Kuma Compose example](https://github.com/louislam/uptime-kuma/blob/master/compose.yaml) and [installation notes](https://github.com/louislam/uptime-kuma#-how-to-install)
