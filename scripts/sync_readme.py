#!/usr/bin/env python3
"""Generate the README's tool tables from the same catalogue as the homepage."""
import argparse
from html import escape
import re
from urllib.parse import quote

from build import ROOT, data_date_path, load_catalogue, require


def markdown_text(value):
    """Keep catalogue text inside one Markdown table cell, without active HTML."""
    text = " ".join(value.split())
    text = re.sub(r"([\\`*_\[\]~])", r"\\\1", text)
    return escape(text, quote=False).replace("|", "&#124;")


def link(label, destination):
    if destination.startswith("/"):
        destination = "https://coolcode.ca" + destination
    # Angle-bracket destinations handle parentheses; encode characters that could
    # break either the destination or its surrounding Markdown table.
    destination = quote(destination, safe=":/?#[]@!$&'()*+,;=%-._~")
    return f"[{markdown_text(label)}](<{destination}>)"


def browser_tables(categories, tools):
    browser = [tool for tool in tools if tool["access"] == "browser"]
    lines = [f"{len(browser)} browser tools, grouped as on the homepage."]
    for category in categories:
        entries = [tool for tool in browser if tool["category"] == category["id"]]
        if not entries:
            continue
        lines.extend(["", f"#### {markdown_text(category['title'])}", "",
                      "| Tool | What it does | Code / documentation |",
                      "| --- | --- | --- |"])
        for tool in entries:
            description = markdown_text(tool["description"])
            if badge_path := data_date_path(tool):
                image = "!" + link(f"Read the dataset retrieval date for {tool['title']}", badge_path)
                description += f" <br> [{image}](<https://coolcode.ca{badge_path}>)"
            lines.append(f"| {link(tool['title'], tool['url'])} | "
                         f"{description} | "
                         f"{link('Source & docs', tool['source'])} |")
    return "\n".join(lines)


def installation_table(tools):
    install = [tool for tool in tools if tool["access"] == "install" or "install_url" in tool]
    lines = [f"{len(install)} installation options. Tools with both versions also appear above.", "",
             "| Project / installation guide | What it does | Requirements | Code / documentation |",
             "| --- | --- | --- | --- |"]
    for tool in install:
        destination = tool.get("install_url", tool["url"])
        lines.append(f"| {link(tool['title'], destination)} | "
                     f"{markdown_text(tool['description'])} | "
                     f"{markdown_text(tool['requirements'])} | "
                     f"{link('Source & docs', tool['source'])} |")
    return "\n".join(lines)


def render_readme(source, categories, tools):
    blocks = {"BROWSER_TOOLS": browser_tables(categories, tools),
              "INSTALL_TOOLS": installation_table(tools)}
    # Validate both regions before replacing anything. Preserve all prose outside
    # them, and reject malformed boundaries instead of overwriting nearby docs.
    regions = []
    for name, content in blocks.items():
        begin, end = f"<!-- BEGIN {name} -->", f"<!-- END {name} -->"
        require(source.count(begin) == source.count(end) == 1,
                f"README must contain {begin} and {end} exactly once")
        start, finish = source.index(begin) + len(begin), source.index(end)
        require(start <= finish, f"README markers are reversed for {name}")
        regions.append((start, finish, content))
    regions.sort()
    require(regions[0][1] < regions[1][0], "README generated regions must not overlap")
    for start, finish, content in reversed(regions):
        source = source[:start] + "\n\n" + content + "\n\n" + source[finish:]
    return source


def synchronize(root=ROOT, check=False):
    categories, tools = load_catalogue(root)
    path = root / "README.md"
    current = path.read_text(encoding="utf-8")
    expected = render_readme(current, categories, tools)
    if current == expected:
        return False
    if check:
        raise ValueError("README tool directory is out of sync. Run python3 scripts/sync_readme.py and commit README.md with the catalogue changes.")
    path.write_text(expected, encoding="utf-8")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="Fail if the committed README differs; do not write files")
    args = parser.parse_args()
    try:
        changed = synchronize(check=args.check)
        print("Updated README tool directory" if changed else "README tool directory matches the catalogue")
    except (OSError, ValueError) as exc:
        parser.exit(1, f"README sync failed: {exc}\n")


if __name__ == "__main__":
    main()
