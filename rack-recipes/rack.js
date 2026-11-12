"use strict";

const services = [
  {
    id: "freshrss", title: "FreshRSS", purpose: "Bring your RSS feeds into one reading room.",
    memory: 512, image: "freshrss/freshrss:latest", port: 8080, internalPort: 80,
    volumes: { feeds: "/var/www/FreshRSS/data", extensions: "/var/www/FreshRSS/extensions" },
    environment: { CRON_MIN: "13,43" }, initial: true,
    setup: "Complete the installer and choose SQLite for storage."
  },
  {
    id: "linkding", title: "linkding", purpose: "Tag, search and keep your own bookmark collection.",
    memory: 384, image: "sissbruecker/linkding:latest", port: 9090, internalPort: 9090,
    volumes: { bookmarks: "/etc/linkding/data" }, initial: false,
    setup: "Create your first user in the terminal, then sign in.",
    command: "docker compose exec linkding python manage.py createsuperuser"
  },
  {
    id: "uptime-kuma", title: "Uptime Kuma", purpose: "Keep a local record of service uptime.",
    memory: 512, image: "louislam/uptime-kuma:2", port: 3001, internalPort: 3001,
    volumes: { uptime: "/app/data" }, initial: true,
    setup: "Create the admin account and add your first monitor."
  }
];

const byId = id => document.getElementById(id);
const choose = byId("services");
const ram = byId("ram");
const preview = byId("preview");
const feedback = byId("feedback");
const rackUnits = Array.from(document.querySelectorAll(".rack-unit"));
const systemReserve = 1024;
let recipe = "";

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function addChoice(service) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = service.id;
  input.checked = service.initial;
  input.setAttribute("aria-labelledby", service.id + "-title");
  const body = document.createElement("span");
  const title = element("strong", service.title);
  title.id = service.id + "-title";
  body.append(title, element("small", service.purpose));
  label.append(input, body, element("span", service.memory + " MiB", "size"));
  choose.append(label);
}

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
      lines.push("      - " + volume + ":" + mount);
    }
    if (service.environment) {
      lines.push("    environment:");
      for (const [key, value] of Object.entries(service.environment)) {
        lines.push("      " + key + ': "' + value + '"');
      }
    }
  }
  lines.push("", "volumes:");
  for (const service of active) {
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

function memoryLabel(mib) {
  return mib >= 1024 && mib % 1024 === 0 ? (mib / 1024) + " GiB" : mib + " MiB";
}

function render() {
  const active = services.filter((service, index) => {
    const checked = byId(service.id).checked;
    rackUnits[index].classList.toggle("active", checked);
    return checked;
  });
  const capacity = Number(ram.value) * 1024;
  const used = active.reduce((sum, service) => sum + service.memory, 0);
  const balance = capacity - used - systemReserve;
  const unit = 100 / capacity;
  byId("system-bar").style.width = (systemReserve * unit) + "%";
  byId("apps-bar").style.width = (Math.min(capacity - systemReserve, used) * unit) + "%";
  byId("apps-memory").textContent = memoryLabel(used);
  byId("balance-label").textContent = balance < 0 ? "Over budget" : "Available";
  byId("balance").textContent = memoryLabel(Math.abs(balance));
  byId("shortage").hidden = balance >= 0;
  const count = active.length + (active.length === 1 ? " service" : " services");
  byId("count").textContent = count;
  byId("summary").textContent = count + " selected. " + memoryLabel(Math.abs(balance)) +
    (balance < 0 ? " over budget." : " available.");
  recipe = active.length ? compose(active) : "";
  preview.textContent = recipe || "# Select a service to generate your recipe.";
  byId("download").disabled = !recipe;
  byId("copy").disabled = !recipe;
  byId("instructions").hidden = !recipe;
  byId("empty-instructions").hidden = Boolean(recipe);
  const startup = byId("startup");
  startup.replaceChildren();
  for (const service of active) {
    const address = "http://127.0.0.1:" + service.port;
    const line = document.createElement("li");
    line.append(element("strong", service.title), " · ", element("code", address),
      element("span", service.setup, "setup"));
    if (service.command) line.append(element("code", service.command, "command"));
    startup.append(line);
  }
  feedback.textContent = "";
}

for (const service of services) addChoice(service);
choose.addEventListener("change", render);
ram.addEventListener("change", render);
byId("download").addEventListener("click", () => {
  if (!recipe) return;
  const url = URL.createObjectURL(new Blob([recipe], { type: "application/yaml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "compose.yaml";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback.textContent = "Downloaded compose.yaml.";
});
byId("copy").addEventListener("click", async () => {
  if (!recipe) return;
  try {
    await navigator.clipboard.writeText(recipe);
    feedback.textContent = "Copied the Compose file.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(preview);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    preview.parentElement.focus();
    feedback.textContent = "YAML selected. Use your browser’s Copy command.";
  }
});

render();
byId("bench").hidden = false;
