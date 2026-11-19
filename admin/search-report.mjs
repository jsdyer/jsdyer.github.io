// Google Search Console's Performance export has a separate CSV for each dimension.
function csvRows(input) {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows = [];
  let row = [], value = "", quoted = false, afterQuote = false;
  function finishRow() {
    row.push(value);
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
    row = [];
    value = "";
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') value += char;
      else if (text[i + 1] === '"') { value += '"'; i++; }
      else { quoted = false; afterQuote = true; }
    } else if (char === delimiter) {
      row.push(value);
      value = "";
      afterQuote = false;
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finishRow();
      afterQuote = false;
    } else if (char === '"' && !value && !afterQuote) {
      quoted = true;
    } else if (afterQuote && /[ \t]/.test(char)) {
      continue;
    } else if (afterQuote || char === '"') {
      throw new Error("The CSV has a misplaced quotation mark. Export the report again.");
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("The CSV ends inside a quoted field. Export the complete report.");
  finishRow();
  return { rows, delimiter };
}

function count(value) {
  const number = value?.trim().replace(/[ \u00A0\u202F]/g, "") || "";
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(number)) return null;
  const parsed = Number(number.replaceAll(",", ""));
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function positivePosition(value, delimiter) {
  const text = value?.trim() || "";
  const position = Number(delimiter === ";" ? text.replace(",", ".") : text);
  return Number.isFinite(position) && position > 0 ? position : null;
}

export function readQueryReport(input) {
  const { rows, delimiter } = csvRows(input);
  const header = (rows.shift() || []).map(cell => cell.trim().toLowerCase());
  const column = (...names) => header.findIndex(label => names.includes(label));
  const query = column("top queries", "query", "queries", "requêtes", "requêtes les plus fréquentes", "principales requêtes", "requêtes les plus populaires");
  const clicks = column("clicks", "clics"), impressions = column("impressions");
  const position = column("position", "average position", "position moyenne");
  if (query < 0 || clicks < 0 || impressions < 0) {
    throw new Error("Choose Queries.csv from the Search Console Performance export. It must include search phrases, clicks and impressions.");
  }
  const queries = [];
  let invalid = 0;
  for (const row of rows) {
    const phrase = row[query]?.trim(), c = count(row[clicks]), n = count(row[impressions]);
    if (!phrase || c === null || n === null) { invalid++; continue; }
    queries.push({ phrase, clicks: c, impressions: n, ctr: n ? c / n : null,
      position: positivePosition(row[position], delimiter) });
  }
  return { queries, invalid };
}

export function readSearchReport(input, catalog) {
  const { rows, delimiter } = csvRows(input);
  const header = (rows.shift() || []).map(cell => cell.trim().toLowerCase());
  const col = (...names) => header.findIndex(label => names.includes(label));
  const page = col("top pages", "pages", "page", "url", "pages les plus populaires", "pages principales");
  const clicks = col("clicks", "clics");
  const impressions = col("impressions");
  const position = col("position", "average position", "position moyenne");
  if (page < 0 || clicks < 0 || impressions < 0)
    throw new Error("Choose Pages.csv from a Search Console Performance export. It must include page URLs, clicks and impressions.");

  const titles = new Map(catalog.filter(t => t.access === "browser").map(t => [t.id, t.title]));
  const groups = new Map();
  let unmatched = 0, invalid = 0;
  for (const row of rows) {
    let url;
    try { url = new URL(row[page]); } catch { invalid++; continue; }
    const slug = url.pathname.split("/")[1];
    if (!["http:", "https:"].includes(url.protocol) || !["coolcode.ca", "www.coolcode.ca"].includes(url.hostname)
        || url.port || url.username || url.password || !titles.has(slug)) { unmatched++; continue; }
    const c = count(row[clicks]), n = count(row[impressions]);
    if (c === null || n === null) { invalid++; continue; }
    const group = groups.get(slug) || { id: slug, title: titles.get(slug), clicks: 0, impressions: 0, weighted: 0, positioned: 0 };
    group.clicks += c;
    group.impressions += n;
    const p = positivePosition(row[position], delimiter);
    if (p !== null) {
      group.positioned += n;
      group.weighted += n * p;
    }
    groups.set(slug, group);
  }
  const tools = [...groups.values()].map(g => ({
    id: g.id, title: g.title, clicks: g.clicks, impressions: g.impressions,
    ctr: g.impressions ? g.clicks / g.impressions : null,
    position: g.positioned && g.positioned === g.impressions ? g.weighted / g.positioned : null,
  })).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.title.localeCompare(b.title));
  return { tools, unmatched, invalid };
}
