"use strict";

const services = [
  {
    id: "freshrss", group: "Library", title: "FreshRSS", purpose: "Bring your RSS feeds into one reading room.",
    memory: 512, image: "freshrss/freshrss:latest", port: 8080, internalPort: 80,
    volumes: { feeds: "/var/www/FreshRSS/data", extensions: "/var/www/FreshRSS/extensions" },
    environment: { CRON_MIN: "13,43" }, initial: true,
    setup: "Complete the installer and choose SQLite for storage."
  },
  {
    id: "linkding", group: "Library", title: "linkding", purpose: "Tag, search and keep your own bookmark collection.",
    memory: 384, image: "sissbruecker/linkding:latest", port: 9090, internalPort: 9090,
    volumes: { bookmarks: "/etc/linkding/data" }, initial: false,
    setup: "Create your first user in the terminal, then sign in.",
    command: "docker compose exec linkding python manage.py createsuperuser"
  },
  {
    id: "uptime-kuma", group: "Operations", title: "Uptime Kuma", purpose: "Keep a local record of service uptime.",
    memory: 512, image: "louislam/uptime-kuma:2", port: 3001, internalPort: 3001,
    volumes: { uptime: "/app/data" }, initial: true,
    setup: "Create the admin account and add your first monitor."
  },
  {
    id: "gitea", group: "Operations", title: "Gitea",
    purpose: "Keep Git projects, issues and code reviews on your own host.",
    memory: 512, image: "docker.gitea.com/gitea:28.4.0", port: 3000, internalPort: 3000,
    volumes: {"repositories": "/data"},
    setup: "Choose SQLite3 in the installer, enter the address shown here as the base URL and clone repositories over HTTP.",
    guide: "https://docs.gitea.com/installation/install-with-docker/"
  },
  {
    id: "grafana", group: "Operations", title: "Grafana",
    purpose: "Build dashboards from your own monitoring data.",
    memory: 512, image: "grafana/grafana:latest", port: 3030, internalPort: 3000,
    volumes: {"grafana-data": "/var/lib/grafana"},
    setup: "Sign in, change the initial admin password and add a data source. For project folders, give container user 472 write access first.",
    guide: "https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/"
  },
  {
    id: "changedetection", group: "Operations", title: "changedetection.io",
    purpose: "Keep a dated history of changes to public web pages.",
    memory: 512, image: "ghcr.io/dgtlmoon/changedetection.io:latest", port: 5000, internalPort: 5000,
    volumes: {"watched-pages": "/datastore"},
    setup: "Add a public page URL as a watch. The included HTTP fetcher works with pages served as HTML.",
    guide: "https://github.com/dgtlmoon/changedetection.io"
  },
  {
    id: "ntfy", group: "Operations", title: "ntfy",
    purpose: "Send yourself notifications from scripts and scheduled jobs.",
    memory: 128, image: "binwiederhier/ntfy:latest", port: 8085, internalPort: 80,
    volumes: {"notification-cache": "/var/cache/ntfy"},
    args: ["serve"], environment: { NTFY_CACHE_FILE: "/var/cache/ntfy/cache.db" },
    setup: "Subscribe to a topic in the web interface, then publish a test message to that topic using the same local server.",
    guide: "https://docs.ntfy.sh/install/"
  },
  {
    id: "navidrome", group: "Library", title: "Navidrome",
    purpose: "Browse and stream an existing music collection.",
    memory: 384, image: "deluan/navidrome:latest", port: 4533, internalPort: 4533,
    volumes: {"music-index": "/data"},
    media: "./media/music:/music:ro",
    setup: "Put readable music files in ./media/music before startup, then create the admin account and scan the library.",
    guide: "https://www.navidrome.org/docs/installation/docker/"
  },
  {
    id: "audiobookshelf", group: "Library", title: "Audiobookshelf",
    purpose: "Listen to and organize your own audiobooks.",
    memory: 512, image: "ghcr.io/advplyr/audiobookshelf:latest", port: 13378, internalPort: 80,
    volumes: {"audiobook-config": "/config", "audiobook-metadata": "/metadata"},
    media: "./media/audiobooks:/audiobooks:ro",
    setup: "Put readable books in ./media/audiobooks. Create the first user and add /audiobooks as an audiobook library.",
    guide: "https://www.audiobookshelf.org/docs/"
  },
  {
    id: "actual-budget", group: "Personal", title: "Actual Budget",
    purpose: "Track spending and give each dollar a job in a private budget.",
    memory: 384, image: "actualbudget/actual-server:latest", port: 5006, internalPort: 5006,
    volumes: {"budgets": "/data"},
    setup: "Open the loopback address on your host, set a server password and create or import a budget.",
    guide: "https://actualbudget.org/docs/install/docker/"
  },
  {
    id: "mealie", group: "Personal", title: "Mealie",
    purpose: "Save recipes, plan meals and build shopping lists.",
    memory: 1024, image: "ghcr.io/mealie-recipes/mealie:v3.31.0", port: 9925, internalPort: 9000,
    volumes: {"recipes": "/app/data"},
    setup: "Use the first-login instructions in the installation guide, change the account password and import your first recipe.",
    guide: "https://mealie.io/documentation/getting-started/installation/sqlite/"
  },
  {
    id: "memos", group: "Personal", title: "Memos",
    purpose: "Keep searchable, dated notes on your own server.",
    memory: 192, image: "neosmemo/memos:stable", port: 5230, internalPort: 5230,
    volumes: {"notes": "/var/opt/memos"},
    setup: "Open the setup page and register the first administrator.",
    guide: "https://usememos.com/docs/deploy/docker"
  }
];

function compose(active) {
  const lines = ["services:"];
  for (const service of active) {
    lines.push(
      "  " + service.id + ":",
      "    image: " + service.image,
      "    restart: unless-stopped",
      "    ports:",
      '      - "127.0.0.1:' + service.port + ':' + service.internalPort + '"',
      "    volumes:"
    );
    for (const [volume, mount] of Object.entries(service.volumes)) {
      const source = service.storage === "folder" ? "./data/" + service.id + "/" + volume : volume;
      lines.push("      - " + source + ":" + mount);
    }
    if (service.media) lines.push("      - " + service.media);
    if (service.args) lines.push("    command: " + JSON.stringify(service.args));
    if (service.environment) {
      lines.push("    environment:");
      for (const [key, value] of Object.entries(service.environment)) {
        lines.push("      " + key + ': "' + value + '"');
      }
    }
  }
  const named = active.filter((service) => service.storage !== "folder");
  if (named.length) lines.push("", "volumes:");
  for (const service of named) {
    for (const volume of Object.keys(service.volumes)) lines.push("  " + volume + ": {}");
  }
  // First-run steps travel with the file when it leaves the planner.
  lines.push("", "# From this directory: docker compose config --quiet && docker compose up -d");
  for (const service of active) {
    lines.push("# " + service.title + " • http://127.0.0.1:" + service.port + " — " + service.setup);
    if (service.command) lines.push("# " + service.command);
  }
  return lines.join("\n") + "\n";
}


const recipeKey = "x-rack-recipes: ";
const capacities = [1, 2, 4, 8, 16, 32, 64, 128];

function materialize(plan) {
  if (!plan || plan.version !== 1 || !capacities.includes(plan.ram) ||
      !Array.isArray(plan.services) || !plan.services.length) {
    throw Error("Choose at least one service and a supported host RAM size.");
  }
  const ports = new Map(), ids = new Set();
  return plan.services.map((choice) => {
    const service = services.find((s) => s.id === choice?.id);
    if (!service || ids.has(service.id)) throw Error("The recipe contains an unknown or repeated service.");
    if (!Number.isInteger(choice.port) || choice.port < 1 || choice.port > 65535) {
      throw Error(service.title + " needs a whole host port between 1 and 65535.");
    }
    if (ports.has(choice.port)) {
      throw Error(ports.get(choice.port) + " and " + service.title + " both use host port " + choice.port + ". Choose a different port for one service.");
    }
    if (!["volume", "folder"].includes(choice.storage)) throw Error("Choose a storage option for " + service.title + ".");
    ports.set(choice.port, service.title);
    ids.add(service.id);
    return { ...service, port: choice.port, storage: choice.storage };
  });
}

function exportRecipe(plan) {
  const active = materialize(plan);
  return compose(active) + "\n" + recipeKey + JSON.stringify(plan) + "\n";
}

function readRecipe(text, currentRam) {
  const yaml = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const markers = yaml.split("\n").filter((line) => line.startsWith(recipeKey));
  if (markers.length === 1) {
    let plan;
    try { plan = JSON.parse(markers[0].slice(recipeKey.length)); }
    catch { throw Error("The saved planner settings could not be read."); }
    materialize(plan);
    return { plan, legacy: false };
  }
  // The original planner had no settings field. Recognize its exact seven exports.
  for (let mask = 1; mask < 2 ** 3; mask++) {
    const selected = services.slice(0, 3).filter((_, i) => mask & (1 << i));
    if (compose(selected).trim() === yaml) {
      return { legacy: true, plan: { version: 1, ram: currentRam,
        services: selected.map(({ id, port }) => ({ id, port, storage: "volume" })) } };
    }
  }
  throw Error("Choose a Compose file exported by Rack Recipes.");
}
