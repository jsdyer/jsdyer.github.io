"""Import the listing copy that standalone projects maintain in their tool.json."""
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPException

from build import manifest_slug, nonempty, require
from refresh_dates import fetch_metadata


def manifest_source(tool):
    slug = manifest_slug(tool)
    return fetch_metadata(f"https://raw.githubusercontent.com/jsdyer/{slug}/HEAD/tool.json")


def import_manifest(tool, manifest):
    slug = manifest_slug(tool)
    require(isinstance(manifest, dict) and manifest_slug(manifest) == slug,
            f"{slug}: project manifest belongs to a different tool")
    info = manifest.get("data_info")
    require(isinstance(info, dict) and info.get("mode") == tool["data_info"]["mode"],
            f"{slug}: review the data mode and probes before updating the catalogue")
    require(nonempty(manifest.get("title")) and nonempty(manifest.get("description"))
            and nonempty(info.get("detail")), f"{slug}: incomplete manifest copy")
    require("cadence" not in info or nonempty(info["cadence"]), f"{slug}: invalid cadence")
    require(tool.get("readme", {}).get("note") not in (manifest["description"], info["detail"]),
            f"{slug}: the README note needs a practical detail beyond the card")

    # Validate the full update before changing any cached field.
    if "task_label" in tool and manifest["title"] != tool["title"]:
        tool.setdefault("brand_name", tool["title"])
    tool["title"] = manifest["title"]
    tool["description"] = manifest["description"]
    tool["data_info"]["detail"] = info["detail"]
    if "cadence" in info:
        tool["data_info"]["cadence"] = info["cadence"]
    else:
        tool["data_info"].pop("cadence", None)


def import_manifests(tools, read=manifest_source):
    def import_one(tool):
        try:
            import_manifest(tool, read(tool))
        except (HTTPException, OSError, ValueError) as exc:
            return f"{tool['id']}: {exc}"

    opted_in = [tool for tool in tools if tool.get("sync_manifest") is True]
    with ThreadPoolExecutor(max_workers=4) as pool:
        return [error for error in pool.map(import_one, opted_in) if error]
