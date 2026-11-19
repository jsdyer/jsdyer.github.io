#!/usr/bin/env python3
"""Validate the catalogue and build the static site; Python standard library only."""
import argparse
from collections import Counter
from datetime import date
from html import escape
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import quote, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DATA_MODES = {
    "snapshot": "Saved dataset", "live": "On-demand lookup", "local": "Local inputs",
    "reference": "Reference collection", "mixed": "Multiple data sources",
    "installed": "Self-hosted data",
}
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
# Retain the existing public files, including downloadable examples and tool source.
PUBLIC_PATHS = {"admin", "report", "metrics", "about", "assets", "field-notes", "tools", "favicon.svg", "CNAME",
                ".nojekyll", "README.md", "SECURITY.md"}
RESERVED = PUBLIC_PATHS | {"data", "templates", "scripts", "tests", "dist", "index.html"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def https_url(value):
    if not nonempty(value) or any(c.isspace() for c in value) or "\\" in value:
        return False
    parsed = urlsplit(value)
    return parsed.scheme == "https" and bool(parsed.hostname) and parsed.username is None and parsed.password is None


def manifest_slug(tool):
    slug = tool.get("id")
    require(isinstance(slug, str) and SLUG.fullmatch(slug)
            and tool.get("source") == f"https://github.com/jsdyer/{slug}"
            and tool.get("url") == f"/{slug}/" and tool.get("hosting") == "project"
            and tool.get("access") == "browser",
            f"{slug}: manifest sync requires a matching jsdyer project repository, browser route and ID")
    return slug


def validate(categories, tools, root=ROOT):
    require(isinstance(categories, list) and categories, "categories.json must contain a nonempty array")
    require(isinstance(tools, list) and tools, "tools.json must contain a nonempty array")
    icons = set(re.findall(r'\[data-icon="([^"]+)"\]', (root / "assets/coolcode.css").read_text()))
    category_ids = set()
    for category in categories:
        require(isinstance(category, dict), "Each category must be an object")
        require(set(category) == {"id", "title", "icon"}, "Category fields must be id, title and icon")
        cid = category["id"]
        require(isinstance(cid, str) and SLUG.fullmatch(cid), f"Invalid category ID: {cid!r}")
        require(cid not in category_ids, f"Duplicate category ID: {cid}")
        require(nonempty(category["title"]), f"Missing title for {cid}")
        require(isinstance(category["icon"], str) and category["icon"] in icons, f"Unknown icon for {cid}")
        category_ids.add(cid)
    ids, destinations = set(), set()
    required = {"id", "title", "description", "category", "tags", "icon", "url", "source", "hosting", "access", "readme"}
    for tool in tools:
        require(isinstance(tool, dict), "Each tool must be an object")
        require(required <= set(tool) <= required | {"requirements", "install_url", "data_date_badge", "data_info", "sync_manifest"}, f"Missing or unknown tool fields: {tool.get('id', '?')}")
        tid = tool["id"]
        require(isinstance(tid, str) and SLUG.fullmatch(tid), f"Invalid tool ID: {tid!r}")
        require(tid not in ids, f"Duplicate tool ID: {tid}")
        ids.add(tid)
        for key in ("title", "description", "category", "icon", "url", "source", "hosting"):
            require(nonempty(tool[key]), f"{tid}: {key} must be a nonempty string")
        require(tool["category"] in category_ids, f"{tid}: unknown category")
        require(tool["icon"] in icons, f"{tid}: unknown icon")
        require(isinstance(tool["tags"], list) and all(nonempty(t) for t in tool["tags"]), f"{tid}: tags must be an array of nonempty strings")
        require(tool["access"] in ("browser", "install"), f"{tid}: access must be browser or install")
        if "sync_manifest" in tool:
            require(type(tool["sync_manifest"]) is bool, f"{tid}: sync_manifest must be a boolean")
            if tool["sync_manifest"]:
                manifest_slug(tool)
        info = tool.get("data_info", {})
        require(isinstance(info, dict) and info.get("mode") in DATA_MODES
                and nonempty(info.get("detail")), f"{tid}: describe the data source and mode")
        guide = tool["readme"]
        require(isinstance(guide, dict) and set(guide) <= {"note", "lead"} and nonempty(guide.get("note"))
                and ("lead" not in guide or nonempty(guide["lead"])), f"{tid}: import a practical note from the tool README")
        require(guide["note"] not in (tool["description"], info["detail"]), f"{tid}: the README should add detail to the card")
        require(all(nonempty(info[k]) for k in ("cadence", "install_detail") if k in info),
                f"{tid}: empty cadence or installation detail")
        probes = info.get("probes", [])
        require(isinstance(probes, list), f"{tid}: probes must be a list")
        for probe in probes:
            require(isinstance(probe, dict) and https_url(probe.get("url"))
                    and nonempty(probe.get("label")) and isinstance(probe.get("path"), list)
                    and probe["path"], f"{tid}: invalid date source")
            if "end_path" in probe:
                require(isinstance(probe["end_path"], list) and probe["end_path"], f"{tid}: missing coverage end")
            if "precision" in probe:
                require(probe["precision"] == "minute" and "end_path" not in probe, f"{tid}: invalid date precision")
            if "allow_unknown" in probe:
                require(type(probe["allow_unknown"]) is bool, f"{tid}: invalid allow_unknown flag")
            if "count_at" in probe:
                spec = probe["count_at"]
                require(isinstance(spec, dict) and isinstance(spec.get("path"), list) and nonempty(spec.get("unit")),
                        f"{tid}: invalid count source")
                require(spec.get("measure") in (None, "length", "sum"), f"{tid}: invalid count measure")
                if spec.get("measure") == "sum":
                    require(nonempty(spec.get("field")), f"{tid}: missing count field")
        if "data_date_badge" in tool:
            require(isinstance(tool["data_date_badge"], bool), f"{tid}: data_date_badge must be a boolean")
            if tool["data_date_badge"]:
                require(tool["hosting"] == "project" and tool["access"] == "browser",
                        f"{tid}: data_date_badge requires a project-hosted browser tool")
        if tool["access"] == "install" or "install_url" in tool:
            require(nonempty(tool.get("requirements")), f"{tid}: installation requirements must be stated")
        else:
            require("requirements" not in tool, f"{tid}: requirements need an installable version")
        if "install_url" in tool:
            require(tool["access"] == "browser" and https_url(tool["install_url"]), f"{tid}: install_url is an HTTPS guide for a browser tool's optional installable version")
            require(tool["install_url"] != tool["url"], f"{tid}: browser and installation destinations must differ")
        require(https_url(tool["source"]), f"{tid}: source must be an HTTPS URL")
        url = tool["url"]
        require(tool["hosting"] in {"local", "project", "external"}, f"{tid}: invalid hosting")
        if tool["hosting"] in {"local", "project"}:
            require(re.fullmatch(r"/[a-z0-9]+(?:-[a-z0-9]+)*/", url), f"{tid}: use a /tool-slug/ destination")
            directory = url.strip("/")
            require(directory not in RESERVED, f"{tid}: reserved route {url}")
            if tool["hosting"] == "local":
                require((root / directory / "index.html").is_file(), f"{tid}: missing local index.html at {url}")
            else:
                require(not (root / directory).exists(), f"{tid}: project route collides with a local directory")
        else:
            require(https_url(url), f"{tid}: external destination must use HTTPS")
            if urlsplit(url).hostname in {"coolcode.ca", "www.coolcode.ca"}:
                raise ValueError(f"{tid}: use local/project hosting for CoolCode routes")
        canonical = url.rstrip("/").casefold()
        require(canonical not in destinations, f"{tid}: duplicate destination {url}")
        destinations.add(canonical)
    used = Counter(tool["category"] for tool in tools)
    require(all(used[cid] for cid in category_ids), "Remove empty categories or add a tool to them")


def load_catalogue(root=ROOT):
    categories = json.loads((root / "data/categories.json").read_text(encoding="utf-8"))
    tools = json.loads((root / "data/tools.json").read_text(encoding="utf-8"))
    validate(categories, tools, root)
    return categories, tools


def data_date_path(tool):
    if tool.get("data_date_badge"):
        return tool["url"] + "data-date.svg"
    return ""


def data_date_alt(tool):
    for probe in tool["data_info"].get("probes", []):
        if probe["label"] == "Data retrieved" and probe.get("value"):
            return f'{tool["title"]} data retrieved {probe["value"]}'
        if probe["label"] == "Data retrieved" and "value" in probe and probe["value"] is None:
            return f"{tool['title']} retrieval date unrecorded"
    return f'Read the dataset retrieval date for {tool["title"]}'


def data_summary(tool, access):
    info = tool["data_info"]
    if access == "install":
        return DATA_MODES["installed"], info.get("install_detail", info["detail"])
    return DATA_MODES[info["mode"]], info["detail"]


def data_facts(tool, access):
    """Collect the source values once for both the homepage and the README."""
    info = tool["data_info"]
    if access == "install":
        return [], [], []
    dates, counts, notices = [], [], []
    for probe in info.get("probes", []):
        value = probe.get("value")
        if value or probe.get("unavailable") or "value" in probe:
            dates.append((probe["label"], value or ("date unavailable" if probe.get("unavailable") else "unrecorded")))
        if "count" in probe:
            counts.append(f'{probe["count"]:,} {probe["count_at"]["unit"]}')
        elif "count_at" in probe and "value" in probe:
            counts.append(f'Count unavailable ({probe["count_at"]["unit"]})')
        if probe.get("notice") and probe["notice"] not in notices:
            notices.append(probe["notice"])
    if any(p.get("unavailable") and p.get("value") for p in info.get("probes", [])):
        notices.append("Date check unavailable (last verified value shown)")
    return dates, counts, notices


def data_notes(tool, access):
    dates, counts, notices = data_facts(tool, access)
    cadence = tool["data_info"].get("cadence") if access == "browser" else None
    notes = ["Scheduled checks: " + cadence.lower()] if cadence else []
    for label, value in dates:
        if label != "Data retrieved" or not tool.get("data_date_badge") or value == "date unavailable":
            notes.append(f"{label}: {value}")
    return notes + counts + notices


def display_date(value):
    """Keep partial dates and ranges in their original precision."""
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}) UTC)?", value)
    if not match:
        return escape(value)
    day, clock = match.groups()
    try:
        parsed = date.fromisoformat(day)
    except ValueError:
        return escape(value)
    text = f"{parsed:%b} {parsed.day}, {parsed.year}"
    timestamp = day
    if clock:
        text += f", {clock} UTC"
        timestamp = f"{day}T{clock}Z"
    return f'<time datetime="{timestamp}">{text}</time>'


def render_data(tool, access, *, show_access=False):
    mode, detail = data_summary(tool, access)
    dates, counts, notices = data_facts(tool, access)
    lines = ['<div class="tool-data"><div class="tool-evidence">',
             f'<p class="tool-source"><span class="sr-only">{escape(mode)}. </span>{escape(detail)}</p>']
    facts = []
    if counts:
        facts.append(f'<strong>{escape(counts[0])}</strong>')
    if dates:
        label, value = dates[0]
        label = {"Data retrieved": "Retrieved", "Snapshot generated": "Snapshot built"}.get(label, label)
        facts.append(f'<span>{escape(label)} {display_date(value)}</span>')
    if facts:
        lines.append('<div class="tool-dates">' + ''.join(facts) + '</div>')
    lines.extend(f'<p class="tool-notice">{escape(notice)}</p>' for notice in notices)
    lines.append('</div>')

    cadence = tool["data_info"].get("cadence") if access == "browser" else None
    badge = data_date_path(tool) if access == "browser" else ""
    has_details = cadence or badge or len(dates) > 1 or len(counts) > 1
    if show_access or has_details:
        lines.append('<div class="tool-foot">')
        if show_access:
            label = "Use in browser" if access == "browser" else "Installation required"
            lines.append(f'<span class="tool-mode tool-mode-{access}">{label}</span>')
        if has_details:
            lines.append(f'<details class="tool-details"><summary>Data details<span class="sr-only"> for {escape(tool["title"])}</span></summary>')
            rows = [(escape(label), display_date(value)) for label, value in dates[1:]]
            rows.extend(("Count", escape(count)) for count in counts[1:])
            if cadence:
                rows.append(("Scheduled checks", escape(cadence)))
            if badge:
                url = escape(badge, quote=True)
                rows.append(("Tool’s date badge", f'<a class="tool-data-date" href="{url}">'
                             f'<img src="{url}" alt="{escape(data_date_alt(tool), quote=True)}" loading="lazy"></a>'))
            lines.append('<dl>' + ''.join(f'<div><dt>{label}</dt><dd>{value}</dd></div>' for label, value in rows) + '</dl></details>')
        lines.append('</div>')
    if show_access and access == "install":
        lines.append(f'<span class="tool-requirements">{escape(tool["requirements"])}</span>')
    return ''.join(lines) + '</div>'


def render_entry(tool, access):
    tags = escape(" ".join(tool["tags"]), quote=True)
    icon, title, description, tid = (escape(tool[key], quote=True) for key in ("icon", "title", "description", "id"))
    destination = tool.get("install_url", tool["url"]) if access == "install" else tool["url"]
    url = escape(destination, quote=True)
    arrow = "↗" if destination.startswith("https:") else "→"
    return (f'                <li data-tool data-tool-id="{tid}" data-access="{access}" data-keywords="{tags}">'
            f'<span class="tool-icon" data-icon="{icon}" aria-hidden="true"></span><div class="tool-entry">'
            f'<a href="{url}"><span>{title}</span><span aria-hidden="true">{arrow}</span></a>'
            f'<p>{description}</p>{render_data(tool, access, show_access=True)}</div></li>')


def validate_featured(config, tools):
    require(isinstance(config, dict) and set(config) == {"mode", "experiment", "a", "b"},
            "featured.json requires mode, experiment, a and b")
    require(config["mode"] in ("fixed", "ab"), "Featured mode must be fixed or ab")
    experiment = config["experiment"]
    require(isinstance(experiment, str) and len(experiment) <= 48 and SLUG.fullmatch(experiment),
            "Featured experiment must be a lowercase slug up to 48 characters")
    browser_ids = {tool["id"] for tool in tools if tool["access"] == "browser"}
    for variant in ("a", "b"):
        ids = config[variant]
        require(isinstance(ids, list) and len(ids) == 4
                and all(isinstance(tid, str) and tid in browser_ids for tid in ids)
                and len(set(ids)) == 4, f"Featured lineup {variant} requires four distinct browser tool IDs")
    require(config["mode"] != "ab" or config["a"] != config["b"],
            "A/B mode requires two different featured lineups")


def render_featured(config, categories, tools):
    validate_featured(config, tools)
    by_id = {tool["id"]: tool for tool in tools}
    category_titles = {category["id"]: category["title"] for category in categories}

    def cards(ids):
        parts = []
        for tid in ids:
            tool = by_id[tid]
            title = escape(tool["title"])
            category = escape(category_titles[tool["category"]])
            url = escape(tool["url"], quote=True)
            parts.append(
                f'<article class="card" data-featured-card="{tid}">'
                f'<div class="cover" data-featured-category="{tool["category"]}" aria-hidden="true">'
                f'<span class="tool-icon" data-icon="{tool["icon"]}"></span></div>'
                f'<div class="card-body"><p class="category">{category}</p><h3>{title}</h3>'
                f'<p>{escape(tool["description"])}</p>{render_data(tool, "browser")}'
                f'<a class="guide" data-featured-tool="{tid}" href="{url}">Open {title} '
                f'<span aria-hidden="true">→</span></a></div></article>'
            )
        return "\n".join(parts)

    grid = (f'<div class="catalogue" data-featured-grid data-mode="{config["mode"]}" '
            f'data-experiment="{config["experiment"]}" data-variant="a">\n{cards(config["a"])}\n</div>')
    if config["mode"] == "ab":
        grid += '\n<template id="featured-lineup-b">\n' + cards(config["b"]) + '\n</template>'
    return grid


def render(categories, tools, template, *, featured=None, root=ROOT):
    if featured is None:
        featured = json.loads((root / "data/featured.json").read_text(encoding="utf-8"))
    browser_tools = [tool for tool in tools if tool["access"] == "browser"]
    install_tools = [tool for tool in tools if tool["access"] == "install" or "install_url" in tool]
    nav = ["            <ul>"]
    groups = []
    for category in categories:
        entries = [tool for tool in browser_tools if tool["category"] == category["id"]]
        if not entries:
            continue
        cid, title, icon = (escape(category[key], quote=True) for key in ("id", "title", "icon"))
        nav.append(f'              <li><a href="#{cid}" data-group-link="{cid}">{title}</a></li>')
        groups.extend([
            f'            <section class="tool-group" id="{cid}" aria-labelledby="{cid}-heading" data-tool-group>',
            f'              <h3 id="{cid}-heading"><span class="tool-icon" data-icon="{icon}" aria-hidden="true"></span><span>{title}</span></h3>',
            '              <ul>',
        ])
        groups.extend(render_entry(tool, "browser") for tool in entries)
        groups.extend(['              </ul>', '            </section>'])
    nav.append("            </ul>")
    replacements = {"{{CATEGORY_NAV}}": "\n".join(nav), "{{TOOL_GROUPS}}": "\n".join(groups),
                    "{{INSTALL_TOOLS}}": "\n".join(render_entry(tool, "install") for tool in install_tools),
                    "{{BROWSER_COUNT}}": str(len(browser_tools)), "{{INSTALL_COUNT}}": str(len(install_tools))}
    replacements["{{FEATURED_GRID}}"] = render_featured(featured, categories, tools)
    template = template.replace("{{TOOL_TOTAL}}", str(len(tools)))
    for token, value in replacements.items():
        require(template.count(token) == 1, f"Template must contain {token} exactly once")
        template = template.replace(token, value)
    return template


def write_search_files(stage, tools):
    origin = "https://coolcode.ca"
    # Project sites deploy separately and do not have directories in the hub.
    routes = {"/"} | {t["url"] for t in tools
                      if t["access"] == "browser" and t["hosting"] in {"local", "project"}}
    if (stage / "about/index.html").is_file():
        routes.add("/about/")
    for article in (stage / "field-notes").rglob("index.html"):
        routes.add("/" + quote(article.parent.relative_to(stage).as_posix()) + "/")

    sitemap = ElementTree.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for route in sorted(routes):
        entry = ElementTree.SubElement(sitemap, "url")
        ElementTree.SubElement(entry, "loc").text = origin + route
    ElementTree.indent(sitemap)
    ElementTree.ElementTree(sitemap).write(stage / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    (stage / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n", encoding="utf-8")


def build(root=ROOT):
    categories, tools = load_catalogue(root)
    page = render(categories, tools, (root / "templates/index.html").read_text(encoding="utf-8"), root=root)
    public = PUBLIC_PATHS | {t["url"].strip("/") for t in tools if t["hosting"] == "local"}
    # Match the tracked site, also allowing new, non-ignored local files in previews.
    files = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=root).decode().split("\0")
    output = root / "dist"
    require(not output.is_symlink(), "dist must not be a symlink")
    with tempfile.TemporaryDirectory(prefix="coolcode-site-") as temporary:
        stage = Path(temporary)
        for name in files:
            relative = Path(name)
            if not name or relative.parts[0] not in public:
                continue
            source = root / relative
            require(not source.is_symlink() and all(not p.is_symlink() for p in source.parents if p != root.parent), f"Symlink cannot be published: {name}")
            if not source.is_file():
                continue  # A tracked file may have been deleted in the worktree.
            target = stage / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        (stage / "index.html").write_text(page, encoding="utf-8")
        catalog = [{key: tool[key] for key in ("id", "title", "access")} for tool in tools]
        (stage / "assets/tool-catalog.json").write_text(json.dumps(catalog, ensure_ascii=False), encoding="utf-8")
        shutil.copyfile(root / "data/featured.json", stage / "admin/featured.json")
        write_search_files(stage, tools)
        require((stage / "CNAME").read_text().strip() == "coolcode.ca", "Keep the CoolCode custom domain")
        for tool in tools:
            if tool["hosting"] == "local":
                require((stage / tool["url"].strip("/") / "index.html").is_file(), f"Local page excluded from build: {tool['url']}")
        if output.exists():
            shutil.rmtree(output)
        shutil.copytree(stage, output)
    return len(tools), len(categories)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate metadata and template without writing dist")
    args = parser.parse_args()
    try:
        if args.check:
            categories, tools = load_catalogue()
            render(categories, tools, (ROOT / "templates/index.html").read_text(encoding="utf-8"))
            print(f"Validated {len(tools)} tools in {len(categories)} categories")
        else:
            count, categories = build()
            print(f"Built dist/: {count} tools in {categories} categories")
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f"Build failed: {exc}\n")


if __name__ == "__main__":
    main()
