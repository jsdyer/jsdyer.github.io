#!/usr/bin/env python3
"""Validate the catalogue and build the static site; Python standard library only."""
import argparse
from collections import Counter
from html import escape
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
# Retain the existing public files, including downloadable examples and tool source.
PUBLIC_PATHS = {"assets", "field-notes", "tools", "favicon.svg", "CNAME",
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
    required = {"id", "title", "description", "category", "tags", "icon", "url", "source", "hosting", "access"}
    for tool in tools:
        require(isinstance(tool, dict), "Each tool must be an object")
        require(required <= set(tool) <= required | {"requirements", "install_url"}, f"Missing or unknown tool fields: {tool.get('id', '?')}")
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


def render_entry(tool, access):
    tags = escape(" ".join(tool["tags"]), quote=True)
    icon, title, description, tid = (escape(tool[key], quote=True) for key in ("icon", "title", "description", "id"))
    destination = tool.get("install_url", tool["url"]) if access == "install" else tool["url"]
    url = escape(destination, quote=True)
    arrow = "↗" if destination.startswith("https:") else "→"
    label = "Use in browser" if access == "browser" else "Installation required"
    detail = f'<span class="tool-requirements">{escape(tool["requirements"])}</span>' if access == "install" else ""
    return (f'                <li data-tool data-tool-id="{tid}" data-access="{access}" data-keywords="{tags}">'
            f'<span class="tool-icon" data-icon="{icon}" aria-hidden="true"></span><div class="tool-entry">'
            f'<a href="{url}"><span>{title}</span><span aria-hidden="true">{arrow}</span></a>'
            f'<p>{description}</p><span class="tool-mode tool-mode-{access}">{label}</span>{detail}</div></li>')


def render(categories, tools, template):
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
    for token, value in replacements.items():
        require(template.count(token) == 1, f"Template must contain {token} exactly once")
        template = template.replace(token, value)
    return template


def build(root=ROOT):
    categories, tools = load_catalogue(root)
    page = render(categories, tools, (root / "templates/index.html").read_text(encoding="utf-8"))
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
