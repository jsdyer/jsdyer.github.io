# Repository coverage audit

The current inventory is regenerated from every public repository page. The latest review includes the missing Fleet Sheet tool, four newly created starter repositories, and the public-apis contribution/reference fork. The machine-readable result is
[`data/repository-audit.json`](../data/repository-audit.json). It includes public
repository names only; private repository identities are omitted.

## What was missing

**Word Weave was already listed** under **Media, events & the old web**. The search
indexed its displayed name, “Word Weave”, but not its repository ID, `wordweave`.
Every catalogue entry now indexes its ID as well as its title and tags. Both forms
find the same tool. The browser/install filter still applies to search results.

Three completed installable projects were absent from the directory:

| Project | Destination and evidence | What visitors need |
| --- | --- | --- |
| [Retro Screensavers](https://github.com/jsdyer/screensaver) | Two implemented Win32 scenes, build instructions and successful cross-compile/Windows smoke workflow | 64-bit Windows; MinGW-w64 on Linux/WSL to compile |
| [PDF Signing Lab](https://github.com/jsdyer/pdfsigning) | Signing scripts and sample PDF whose signature verifies; its self-signed issuer is intentionally not trusted | Linux, Python, OpenSSL, pyHanko and Poppler |
| [RTR Sandbox Explorer](https://github.com/jsdyer/payments) | Implemented PHP workbench, CLI, documented scenario importer and offline tests | PHP 8.2+ with curl/XML/ZIP and Payments Canada sandbox credentials |

These open installation instructions under **Install yourself**. They are not
publicly hosted payment, signing or Windows services. The Payments test suite was
inspected but not executed in the audit environment because PHP was unavailable.

Compose Diff and MIME Cabinet were starter templates at the start of this review.
Both are now implemented, deployed and checked, and are listed as browser tools.
Current counts and classifications are generated in [data/repository-audit.json](../data/repository-audit.json), not maintained separately in this narrative. Refresh that report after every catalogue change. The offline integration check rejects stale counts, unresolved repositories and stale exclusions.


## Reviewed exclusions

[`data/repository-audit-exclusions.json`](../data/repository-audit-exclusions.json)
records each public exclusion with a reason and review date:

- Ten separate personal/business websites are not CoolCode utilities.
- `coolcode-tool-template` is the reusable starter, not a finished tool.
- Starter repositories are explicitly classified until their actual tools are implemented and verified.
- `queryconfessional` and `backupledger` contain no source files yet.

An exclusion is a review decision, not a permanent block. Remove it when a tool is
implemented and verified, then add the catalogue entry. Dataset Diff retains its
CSV/GeoJSON comparisons; no completed general JSON comparison tool was found to
cross-link. DNS Lens remains the existing DNS utility.

## Repeat the audit

Run this separately from the offline homepage build:

```sh
python3 scripts/audit_repositories.py
python3 scripts/audit_repositories.py --check
```

The script paginates the public GitHub API, compares repository names with the
catalogue's **source** links, and reports unlisted repositories. The default
command updates the JSON report; `--check` writes nothing and exits nonzero for
unreviewed repositories, stale exclusions or missing catalogue source repos.
Rate limits, failed pages and repeated pages fail the audit instead of producing
a falsely complete report. No API key is needed for a small public inventory.

A complete paginated GitHub connector export can be used without another request:

```sh
python3 scripts/audit_repositories.py --inventory /path/to/repositories.json
```

The input is a JSON array. Each object needs `name`; it can also include
`full_name` or `repository_full_name` and `private` or `visibility`. Do not pass
only the first page. Private entries are counted and excluded from public output.

For each candidate, inspect the source and README, exercise its main task, and
verify its live page or installation path. A repository name, `tool.json`, or HTTP
200 response is not sufficient evidence of functionality. Add verified tools to
`data/tools.json`, synchronize their README notes, regenerate the directory and
rerun the audit. The audit never automatically publishes a starter or changes the
homepage, and network audit failures do not block a valid offline build.
