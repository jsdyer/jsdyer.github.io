from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build import load_catalogue, validate
from sync_manifests import import_manifests, manifest_source


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.tool = {
            "id": "demo-map", "url": "/demo-map/", "source": "https://github.com/jsdyer/demo-map",
            "access": "browser", "hosting": "project", "sync_manifest": True,
            "title": "Demo Map", "description": "Original card.", "readme": {"note": "Choose a county."},
            "data_info": {"mode": "snapshot", "detail": "Original data.", "cadence": "Weekly",
                          "probes": [{"label": "Data retrieved", "value": "2026-11-18", "count": 85}]}
        }
        self.manifest = dict(self.tool, title="County Map", description="Compare two counties.",
                             data_info={"mode": "snapshot", "detail": "Annual census counts.",
                                        "cadence": "Monthly", "probes": []})

    def test_imports_only_authorized_copy_and_handles_discontinued_schedule(self):
        untouched = deepcopy(self.tool)
        untouched["sync_manifest"] = False
        original = deepcopy(untouched)
        with patch("sync_manifests.fetch_metadata", return_value=self.manifest) as fetch:
            self.assertEqual(import_manifests([self.tool, untouched]), [])
            fetch.assert_called_once_with("https://raw.githubusercontent.com/jsdyer/demo-map/HEAD/tool.json")
        self.assertEqual(self.tool["title"], "County Map")
        self.assertEqual(untouched, original)
        self.assertEqual(self.tool["description"], "Compare two counties.")
        self.assertEqual(self.tool["data_info"]["detail"], "Annual census counts.")
        self.assertEqual(self.tool["data_info"]["cadence"], "Monthly")
        self.assertEqual(self.tool["data_info"]["probes"][0]["count"], 85)
        self.assertEqual(self.tool["readme"]["note"], "Choose a county.")
        del self.manifest["data_info"]["cadence"]
        self.assertEqual(import_manifests([self.tool], lambda _: self.manifest), [])
        self.assertNotIn("cadence", self.tool["data_info"])

    def test_invalid_copy_route_identity_or_fetch_retains_all_cached_fields(self):
        original = deepcopy(self.tool)
        for changes in ({"source": "https://github.com/another-owner/demo-map"}, {"url": "/moved/"},
                        {"id": "other", "url": "/other/", "source": "https://github.com/jsdyer/other"},
                        {"description": ""}, {"data_info": {"mode": "live", "detail": "Changed."}},
                        {"data_info": {"mode": "snapshot", "detail": "Changed.", "cadence": 2}}):
            with self.subTest(changes=changes):
                self.assertTrue(import_manifests([self.tool], lambda _: dict(self.manifest, **changes)))
                self.assertEqual(self.tool, original)
        with patch("sync_manifests.fetch_metadata", side_effect=OSError("offline")):
            self.assertTrue(import_manifests([self.tool]))
        self.assertEqual(self.tool, original)

    def test_invalid_opt_in_cannot_fetch_a_different_repository(self):
        categories, tools = load_catalogue()
        with self.assertRaisesRegex(ValueError, "boolean"):
            validate(categories, [dict(tools[0], sync_manifest="true"), *tools[1:]])
        with patch("sync_manifests.fetch_metadata") as fetch:
            with self.assertRaisesRegex(ValueError, "matching"):
                manifest_source(dict(self.tool, id="../other"))
            fetch.assert_not_called()
