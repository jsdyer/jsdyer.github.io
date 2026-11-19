const repository = "jsdyer/jsdyer.github.io";
const issuesUrl = "https://github.com/" + repository + "/issues";
const pageSize = 25;

export function issueSubject(issue, catalog) {
  const firstLine = (issue.body || "").split(/\r?\n/, 1)[0].trim();
  if (firstLine === "Website: CoolCode website or catalogue") return "CoolCode website";
  if (firstLine.startsWith("Tool: ")) {
    const name = firstLine.slice(6).trim();
    const known = catalog.find(tool => tool.title === name || tool.id === name);
    if (known) return known.title;
  }
  return "Repository issue";
}
function link(label, url) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = url;
  return a;
}
function makeButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  return button;
}

export function publicIssues(parent, catalog) {
  const section = document.createElement("section");
  section.className = "stats-section";
  const title = document.createElement("h3");
  title.textContent = "Public GitHub issues";
  const note = document.createElement("p");
  note.textContent = "The public report form opens issues in the CoolCode catalogue repository. This list also includes its other issues. Private submissions stay in the private inbox.";
  const picker = document.createElement("label");
  picker.textContent = "Issue state ";
  const filter = document.createElement("select");
  filter.append(new Option("Open", "open"), new Option("Closed", "closed"));
  picker.append(filter);
  const refresh = makeButton("Refresh public issues");
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  const list = document.createElement("ul");
  const prev = makeButton("Previous issues"), next = makeButton("Next issues");
  const nav = document.createElement("div");
  nav.className = "actions";
  nav.append(prev, next);
  nav.hidden = true;
  const links = document.createElement("p");
  links.append(link("All issues on GitHub", issuesUrl), " · ",
    link("Catalogue link checks", "https://github.com/" + repository + "/actions/workflows/catalogue-audit.yml"),
    " · ", link("Catalogue data refreshes", "https://github.com/" + repository + "/actions/workflows/catalogue-freshness.yml"));
  section.append(title, note, picker, refresh, message, list, nav, links);
  parent.append(section);

  let page = 1, serial = 0;
  async function show() {
    const request = ++serial;
    const state = filter.value;
    refresh.disabled = true;
    nav.hidden = true;
    list.replaceChildren();
    message.textContent = "Checking public issues…";
    try {
      const query = new URLSearchParams({
        q: `repo:${repository} is:issue is:${state}`, per_page: String(pageSize),
        page: String(page), sort: "updated", order: "desc",
      });
      const response = await fetch("https://api.github.com/search/issues?" + query, {
        headers: { Accept: "application/vnd.github+json" }, credentials: "omit",
        cache: "no-cache", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      if (request !== serial) return;
      if (!Array.isArray(data.items) || !Number.isSafeInteger(data.total_count) || data.total_count < 0)
        throw new Error("Invalid response");
      for (const issue of data.items) {
        if (!Number.isSafeInteger(issue.number) || issue.number < 1 || issue.pull_request) continue;
        const entry = document.createElement("li");
        const date = /^\d{4}-\d{2}-\d{2}/.exec(issue.updated_at || "")?.[0];
        entry.append(link(`#${issue.number} ${issue.title}`, issuesUrl + "/" + issue.number),
          " · " + issueSubject(issue, catalog), date ? " · Updated " + date : "");
        list.append(entry);
      }
      const count = data.total_count.toLocaleString("en-CA");
      message.textContent = `${count} ${state} public issue${data.total_count === 1 ? "" : "s"}`
        + (data.incomplete_results ? " in a partial GitHub search." : ".")
        + (data.total_count > pageSize ? ` Page ${page}.` : "");
      prev.disabled = page === 1;
      // GitHub search returns at most the first 1,000 matches. Link to its issue list for more.
      next.disabled = page * pageSize >= Math.min(1000, data.total_count);
      nav.hidden = prev.disabled && next.disabled;
    } catch (error) {
      if (serial === request) message.textContent =
        ["403", "429"].includes(error.message)
          ? "GitHub limited public issue lookups. Use the GitHub link below or refresh later."
          : "GitHub’s public issue count is unavailable. Open the repository link below.";
    } finally {
      if (serial === request) refresh.disabled = false;
    }
  }
  filter.addEventListener("change", () => { page = 1; show(); });
  refresh.addEventListener("click", () => { page = 1; show(); });
  prev.addEventListener("click", () => { if (page > 1) { page--; show(); } });
  next.addEventListener("click", () => { page++; show(); });
  show();
}
