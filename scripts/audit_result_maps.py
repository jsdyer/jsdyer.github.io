"""Check project-owned result sitemaps and sample their canonical HTML during the network audit."""
from urllib.request import Request, urlopen
from xml.etree import ElementTree
import re


ORIGIN = "https://coolcode.ca"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def result_urls(xml, prefix):
    root = ElementTree.fromstring(xml)
    if root.tag != NS + "urlset":
        raise ValueError("Expected a result URL set")
    urls = [e.text or "" for e in root.findall(NS + "url/" + NS + "loc")]
    if prefix not in urls or len(set(urls)) != len(urls) or len(urls) < 2:
        raise ValueError("Result sitemap requires a directory and distinct result pages")
    for url in urls:
        if not url.startswith(prefix) or not re.fullmatch(r"(?:[a-z0-9]+(?:-[a-z0-9]+)*/)*", url[len(prefix):]):
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
        urls = result_urls(xml, root + tool["result_directory"]["path"])
        samples = [check(page, True) for page in sorted({urls[0], urls[1], urls[-1]})]
        return {"url": url, "ok": all(page["ok"] for page in samples), "url_count": len(urls), "samples": samples}
    except (OSError, ValueError, ElementTree.ParseError) as exc:
        return {"url": url, "ok": False, "error": str(exc)}
