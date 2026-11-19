"use strict";

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

function addChoice(service, group) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = service.id;
  input.checked = Boolean(service.initial);
  input.setAttribute("aria-labelledby", service.id + "-title");
  const body = document.createElement("span");
  const title = element("strong", service.title);
  title.id = service.id + "-title";
  body.append(title, element("small", service.purpose));
  label.append(input, body, element("span", service.memory + " MiB", "size"));
  group.append(label);
}

function addSettings(service) {
  const line = element("div", "", "service-settings");
  line.id = service.id + "-settings";
  const heading = element("strong", service.title);
  const portLabel = element("label", "Host port");
  const port = document.createElement("input");
  port.type = "number";
  port.id = service.id + "-port";
  port.min = "1";
  port.max = "65535";
  port.step = "1";
  port.value = service.port;
  port.setAttribute("aria-label", service.title + " host port");
  portLabel.append(port);
  const storageLabel = element("label", "Store data in");
  const storage = document.createElement("select");
  storage.id = service.id + "-storage";
  storage.setAttribute("aria-label", service.title + " storage");
  storage.add(new Option("Docker volumes", "volume"));
  storage.add(new Option("Project folders", "folder"));
  storageLabel.append(storage);
  line.append(heading, portLabel, storageLabel);
  byId("settings").append(line);
}

function memoryLabel(mib) {
  return mib >= 1024 && mib % 1024 === 0 ? (mib / 1024) + " GiB" : mib + " MiB";
}

function render() {
  const active = services.filter(service => {
    const checked = byId(service.id).checked;
    byId(service.id + "-settings").hidden = !checked;
    return checked;
  });
  for (const unit of rackUnits) {
    unit.classList.toggle("active", active.some(service => service.group === unit.dataset.group));
  }
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
  byId("settings-empty").hidden = active.length > 0;
  const plan = { version: 1, ram: Number(ram.value), services: active.map(({ id }) => ({
    id, port: byId(id + "-port").valueAsNumber, storage: byId(id + "-storage").value,
  })) };
  let error = "";
  recipe = "";
  if (active.length) {
    try { recipe = exportRecipe(plan); }
    catch (problem) { error = problem.message; }
  }
  byId("config-error").hidden = !error;
  byId("config-error").textContent = error;
  preview.textContent = recipe || (error ? "# Resolve the port or storage setting above." : "# Select a service to generate your recipe.");
  byId("download").disabled = !recipe;
  byId("copy").disabled = !recipe;
  byId("instructions").hidden = !recipe;
  byId("empty-instructions").hidden = active.length > 0;
  const startup = byId("startup");
  startup.replaceChildren();
  for (const choice of recipe ? plan.services : []) {
    const service = services.find((s) => s.id === choice.id);
    const address = "http://127.0.0.1:" + choice.port;
    const line = document.createElement("li");
    line.append(element("strong", service.title), " · ", element("code", address),
      element("span", service.setup, "setup"));
    if (service.command) line.append(element("code", service.command, "command"));
    const locations = Object.keys(service.volumes).map((v) =>
      choice.storage === "folder" ? "./data/" + service.id + "/" + v : v);
    line.append(element("span", (choice.storage === "folder" ? "Folders: " : "Volume keys: ") +
      locations.join(", "), "setup"));
    if (service.media) line.append(element("span", "Read-only media folder · " + service.media.split(":")[0], "setup"));
    if (service.guide) {
      const guide = element("a", "Installation guide");
      guide.href = service.guide;
      line.append(guide);
    }
    startup.append(line);
  }
  feedback.textContent = "";
}

for (const group of ["Library", "Operations", "Personal"]) {
  const section = document.createElement("section");
  section.append(element("h3", group));
  choose.append(section);
  for (const service of services.filter(service => service.group === group)) {
    addChoice(service, section);
    addSettings(service);
  }
}
byId("settings").addEventListener("input", render);
byId("open-recipe").addEventListener("click", () => byId("recipe-file").click());
byId("recipe-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const { plan, legacy } = readRecipe(await file.text(), Number(ram.value));
    for (const service of services) {
      const choice = plan.services.find((s) => s.id === service.id);
      byId(service.id).checked = Boolean(choice);
      byId(service.id + "-port").value = choice?.port ?? service.port;
      byId(service.id + "-storage").value = choice?.storage ?? "volume";
    }
    ram.value = plan.ram;
    render();
    feedback.textContent = legacy ? "Opened an earlier recipe. It uses the current host RAM setting." :
      "Opened the saved Rack Recipes settings.";
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    event.target.value = "";
  }
});
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
