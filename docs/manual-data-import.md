# Manually recover a tool's published data

Download the original official source through your browser, run the tool's own
importer against that saved file, then commit its validated snapshot and metadata
together. A successful data-only push publishes the result. You do not need to
change Cloudflare, DNS, the homepage, sitemap or watchdog targets for an existing
tool's data-only update.

There is currently no universal admin upload button. Source formats and committed
outputs differ between tools. The validated commands below are for Census Lens and
Lobby Trail; do not assume another tool's `--input` option saves publishable data.

## Windows download, Linux import

1. Download the official file in Windows and complete any ordinary browser checks.
   Keep the original ZIP intact. Note the actual download date/time and timezone.
2. Copy the downloaded files using SFTP to your Linux server, outside all Git repos.
   The examples use `/root/coolcode-imports/`.
3. Use an up-to-date checkout of the **individual tool repository**. The hub's
   `services/refresh-watchdog` directory is not a data-import destination.
4. Run the documented import and tests. Stop on an error; do not commit partial output.
5. Review the changed counts, dates and files, commit only the tool's generated data
   and metadata, and push to its main branch using your existing GitHub login.
6. Check the Pages workflow and the published metadata. A commit alone is not a
   verified deployment. The admin's Tool outcomes report picks up the new public
   readings on its next observation; a cached reading may take time to update.

If these tool repos are not already on your server, clone each once:

```sh
mkdir -p /root/b /root/coolcode-imports/census
git clone https://github.com/jsdyer/census-lens.git /root/b/census-lens
git clone https://github.com/jsdyer/lobbytrail.git /root/b/lobbytrail
```

Cloning public repositories needs no secret; pushing changes requires your existing
GitHub authentication. The watchdog's Actions-only App credentials are not Git
push credentials. Do not put credentials into the files being imported.

The import can also run entirely on Windows with Git and Python installed
(and Node for Census tests): use `py` instead of `python3`, quoted Windows file paths,
and the same Git commands from the respective repo checkout.

## Census Lens

Download **all 15** linked ZIPs. These are the exact official bulk-file codes used
by the collector. A single national ZIP does not replace the full set.

| Save the unopened ZIP as | Official download |
| --- | --- |
| `001` | [ZIP 001](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=001) |
| `002` | [ZIP 002](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=002) |
| `016` | [ZIP 016](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=016) |
| `017` | [ZIP 017](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=017) |
| `018` | [ZIP 018](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=018) |
| `019` | [ZIP 019](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=019) |
| `020` | [ZIP 020](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=020) |
| `021` | [ZIP 021](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=021) |
| `022` | [ZIP 022](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=022) |
| `023` | [ZIP 023](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=023) |
| `024` | [ZIP 024](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=024) |
| `025` | [ZIP 025](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=025) |
| `026` | [ZIP 026](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=026) |
| `027` | [ZIP 027](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=027) |
| `028` | [ZIP 028](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=028) |

Store these files inside `/root/coolcode-imports/census/`. File names must be exactly
`001`, `002`, `016`, …, `028`, with **no extension**; they are still ZIP archives.
Do not extract them or use a file called `001.zip` with the current importer.

**Download and import on the same UTC day.** Census Lens currently stamps
`retrieved` with the import day's date and has no historical-download-date input.
Its 2016/2021 observation years do not change. For an older saved download, obtain a
fresh official copy before using this procedure.

From `/root/b/census-lens`, follow the
[import, validation and publication commands](https://github.com/jsdyer/census-lens#publish-files-downloaded-in-your-browser).
The essential import command is:

```sh
python3 scripts/refresh.py --source-dir /root/coolcode-imports/census
```

Commit **both** `web/data/edition.json.gz` and `web/data/status.json` after validation.
Never commit the raw source archives or `dist/`.

Verify the [Pages workflow](https://github.com/jsdyer/census-lens/actions/workflows/pages.yml)
and [published status](https://coolcode.ca/census-lens/data/status.json).
Use a data-only push for publication. The workflow's **Run workflow** button starts
a new online download and can encounter the same 403 again.

## Lobby Trail

Download the [official communications ZIP](https://lobbycanada.gc.ca/media/mqbbmaqk/communications_ocl_cal.zip)
and copy it to `/root/coolcode-imports/communications_ocl_cal.zip`. Keep it zipped.

From `/root/b/lobbytrail`, follow the
[import, validation and publication commands](https://github.com/jsdyer/lobbytrail#publish-a-file-downloaded-in-your-browser).
The essential import command is:

```sh
python3 scripts/import_snapshot.py /root/coolcode-imports/communications_ocl_cal.zip --retrieved-at '2026-11-24T06:00:00-07:00'
```

**Replace the example timestamp with the real browser download time.** Include
`Z` for UTC or an offset such as `-07:00`. The importer validates the source using
the normal parser and saves a compact, verified snapshot; it does not contact the
source website. It refuses a source edition older than the saved edition, a download
older than the recorded successful check, invalid/future times, and incomplete input.

Commit all `data/seed/` changes together, including the manifest, the new compact
ZIP, and removal of its superseded compact ZIP. The official raw download remains
outside Git. `build.py --input` only creates a local preview; it does not save the
snapshot for the next Pages build.

Verify the [Pages workflow](https://github.com/jsdyer/lobbytrail/actions/workflows/pages.yml)
and [published index](https://coolcode.ca/lobbytrail/index.json).

## Applying this to another tool

| Tool behaviour | Manual recovery approach |
| --- | --- |
| Publishes a saved CSV/JSON/ZIP-derived dataset | Use its documented local source input, validate the whole required file set, and commit its snapshot plus metadata. A preview command may need an explicit save option. |
| Combines several source datasets | Supply the complete set the collector requires; one successful download may not be enough. |
| Records periodic observations or accumulates history | Preserve prior captures and true observation times. A current download cannot reconstruct observations missed during an outage. |
| Queries a live API when someone uses it | There may be no saved dataset to upload. A snapshot fallback needs a deliberate app change. |
| Processes the visitor's files entirely in the browser | The app's file picker handles local input; it does not publish a shared dataset. |

For another tool, identify its repo, official input files, local-import command,
validation rules, committed output paths and push-triggered publishing behaviour.
If the README lacks a verified manual path, add and test that small collector-specific
path before importing. Do not drop arbitrary source ZIPs into a repo or edit a
published timestamp to make a failed collection appear successful.

## What this means for the watchdog

A manual import can restore current published data while GitHub's online collector
still fails. The watchdog checks those separately: an offline Pages build does not
prove a source download succeeded. It may continue recovery attempts six hours apart
until an eligible online refresh succeeds. Do not disable it just to hide the old
failed run; check the data's actual acquisition time in the published metadata.

## Maintenance record

This procedure adds no tool, route, schedule, workflow input, dependency or freshness
field. Existing catalogue entries, Worker IDs, sitemap routes and the 168-target
watchdog registry remain applicable. Keep each tool's import instructions beside its
collector, and this guide linked from [site administration](site-administration.md).

