"""Check project-owned result sitemaps and sample their canonical HTML during the network audit."""
from urllib.request import Request, urlopen
from xml.etree import ElementTree
import re


ORIGIN = "https://coolcode.ca"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def result_prefixes(directory_url, additional_paths=()):
    project = directory_url.rstrip("/").rsplit("/", 1)[0] + "/"
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*/", path) for path in additional_paths):
        raise ValueError("Expected relative result paths inside the same project")
    return (directory_url, *(project + path for path in additional_paths))


def result_urls(xml, prefix, additional_paths=()):
    root = ElementTree.fromstring(xml)
    if root.tag != NS + "urlset":
        raise ValueError("Expected a result URL set")
    urls = [e.text or "" for e in root.findall(NS + "url/" + NS + "loc")]
    if prefix not in urls or len(set(urls)) != len(urls) or len(urls) < 2:
        raise ValueError("Result sitemap requires a directory and distinct result pages")
    scopes = result_prefixes(prefix, additional_paths)
    if not any(url not in scopes for url in urls):
        raise ValueError("Result sitemap contains directories without any result pages")
    for url in urls:
        if url in scopes:
            continue
        if not any(url.startswith(scope) and re.fullmatch(r"(?:[a-z0-9]+(?:-[a-z0-9]+)*/)+", url[len(scope):])
                   for scope in scopes):
            raise ValueError("Unexpected URL in result sitemap")
    return sorted(urls)


def audit(tool, check):
    root = ORIGIN + tool["url"]
    url = root + "sitemap.xml"
    try:
        request = Request(url, headers={"User-Agent": "CoolCode catalogue link audit/1.0"})
        with urlopen(request, timeout=20) as response:
            xml = response.read(52_428_801)
            if response.url != url or len(xml) > 52_428_800:
                raise ValueError("Redirected or oversized result sitemap")
        directory = tool["result_directory"]
        directory_url = root + directory["path"]
        additional_paths = directory.get("additional_paths", ())
        urls = result_urls(xml, directory_url, additional_paths)
        scopes = result_prefixes(directory_url, additional_paths)
        pages = [page for page in urls if page not in scopes]
        selected = {pages[0], pages[-1], *(scope for scope in scopes if scope in urls)}
        for scope in scopes:
            sample = next((page for page in pages if page.startswith(scope)), None)
            if sample:
                selected.add(sample)
        samples = [check(page, True) for page in sorted(selected)]
        return {"url": url, "ok": all(page["ok"] for page in samples), "url_count": len(urls), "samples": samples}
    except (OSError, ValueError, ElementTree.ParseError) as exc:
        return {"url": url, "ok": False, "error": str(exc)}
