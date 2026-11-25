#!/usr/bin/env python3
"""Compare public GitHub repositories with the curated catalogue, without auto-adding tools."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_json(url):
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "CoolCode repository catalogue audit"}
    # CI already supplies this token. Use its larger API allowance only at GitHub,
    # and never forward authorization through a redirect to another destination.
    origin = urlsplit(url)
    if origin.scheme == 'https' and origin.netloc == 'api.github.com' and os.environ.get('GH_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GH_TOKEN']
    request = Request(url, headers=headers)
    with build_opener(NoRedirect()).open(request, timeout=30) as response:
        body = response.read(5_000_001)
    if len(body) > 5_000_000:
        raise ValueError("Repository inventory response exceeds 5 MB")
    return json.loads(body)


def fetch_repositories(owner, fetch=read_json):
    """Read every public repository page. Never treat a partial fetch as complete."""
    repositories = []
    seen = set()
    for page in range(1, 101):
        query = urlencode({"per_page": 100, "page": page, "sort": "full_name"})
        batch = fetch(f"https://api.github.com/users/{owner}/repos?{query}")
        if not isinstance(batch, list):
            raise ValueError("GitHub did not return a repository list")
        names = [repository_name(repo, owner) for repo in batch]
        if any(name in seen for name in names) or len(set(names)) != len(names):
            raise ValueError("Repeated repository page; inventory may be incomplete")
        seen.update(names)
        repositories.extend(batch)
        if len(batch) < 100:
            return repositories
    raise ValueError("Inventory exceeded 100 pages; review the pagination limit")


def repository_name(repo, owner):
    if not isinstance(repo, dict) or not isinstance(repo.get("name"), str):
        raise ValueError("Each inventory entry needs a repository name")
    full = repo.get("full_name", repo.get("repository_full_name", owner + "/" + repo["name"]))
    if full.casefold() != (owner + "/" + repo["name"]).casefold():
        raise ValueError("Inventory contains a repository from a different owner")
    return repo["name"].casefold()


def catalogue_repositories(tools, owner):
    result = set()
    for tool in tools:
        source = urlsplit(tool["source"])
        parts = source.path.strip("/").split("/")
        if source.netloc == "github.com" and len(parts) >= 2 and parts[0].casefold() == owner.casefold():
            result.add(parts[1].casefold())
    return result


def audit(repositories, tools, exclusions, owner="jsdyer", checked_at=None):
    public = set()
    private = set()
    for repo in repositories:
        name = repository_name(repo, owner)
        if repo.get("private") or repo.get("visibility") == "private":
            private.add(name)
            continue
        public.add(name)
    listed = catalogue_repositories(tools, owner)
    excluded = {item["repo"].casefold(): item for item in exclusions}
    if len(excluded) != len(exclusions):
        raise ValueError("Duplicate repository exclusion")
    for item in exclusions:
        if not item.get("reason") or not item.get("reviewed_at") or not item.get("status"):
            raise ValueError("Every exclusion needs a status, reason and review date")
    unlisted = public - listed
    return {
        "schema": "coolcode.repository-audit.v1",
        "checked_at": checked_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "owner": owner,
        "scope": "Public repositories; private repository identities are omitted. Functional readiness is reviewed before listing.",
        "catalogue_tools": len(tools),
        "public_repositories": len(public),
        "private_repositories_omitted": len(private),
        "listed_source_repositories": len(listed & public),
        "public_repository_names": sorted(public),
        "needs_review": [{"repo": name, "url": f"https://github.com/{owner}/{name}",
                          "reason": "Public repository is not listed or explicitly excluded; inspect its implementation and destination."}
                         for name in sorted(unlisted - excluded.keys())],
        "excluded": [excluded[name] for name in sorted(unlisted & excluded.keys())],
        "stale_exclusions": sorted(excluded.keys() - unlisted - private),
        "catalogue_sources_missing_from_inventory": sorted(listed - public - private),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, help="Complete repository JSON array from a paginated GitHub export; otherwise fetch the public API")
    parser.add_argument("--output", type=Path, default=ROOT / "data/repository-audit.json")
    parser.add_argument("--check", action="store_true", help="Exit nonzero for unreviewed repositories or stale/missing records; do not write")
    args = parser.parse_args()
    try:
        repos = json.loads(args.inventory.read_text()) if args.inventory else fetch_repositories("jsdyer")
        if not isinstance(repos, list):
            raise ValueError("Inventory must be a complete repository JSON array")
        tools = json.loads((ROOT / "data/tools.json").read_text())
        exclusions = json.loads((ROOT / "data/repository-audit-exclusions.json").read_text())
        report = audit(repos, tools, exclusions)
    except (OSError, ValueError) as exc:
        parser.exit(2, f"Audit incomplete: {exc}\n")
    if not args.check:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"{report['public_repositories']} public repositories; {report['catalogue_tools']} catalogue tools; "
          f"{len(report['needs_review'])} repositories need review; {len(report['excluded'])} documented exclusions.")
    for item in report["needs_review"]:
        print(f"Review: {item['repo']}")
    if args.check and (report["needs_review"] or report["stale_exclusions"] or report["catalogue_sources_missing_from_inventory"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
