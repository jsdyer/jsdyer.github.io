from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build import load_catalogue, render_entry
from sync_guides import BEGIN, END, import_notes, read_note
from sync_readme import describe, markdown_text


class GuideNotesTests(unittest.TestCase):
    def test_marker_supersedes_legacy_sentence_and_preserves_accented_text(self):
        source = f'Older advice.\n\n{BEGIN}\nCompare the two years.\nMissing values stay blank.\n{END}'
        self.assertEqual(read_note(source, 'Older advice'), 'Compare the two years. Missing values stay blank.')
        for bad in [END + BEGIN, BEGIN, BEGIN + END, source + END]:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                read_note(bad)

    def test_reworded_sentence_refreshes_and_failure_retains_last_good_note(self):
        tool = {'id':'a', 'readme':{'lead':'Missing years', 'note':'Previous note.'}}
        self.assertEqual(import_notes([tool], lambda _: 'Overview. Missing years are blank.'), [])
        self.assertEqual(tool['readme']['note'], 'Missing years are blank.')
        self.assertTrue(import_notes([tool], lambda _: 'Missing years mean A. Missing years mean B.'))
        self.assertEqual(tool['readme']['note'], 'Missing years are blank.')

    def test_directory_has_the_guide_note_and_homepage_stays_concise(self):
        categories, tools = load_catalogue()
        for tool in tools:
            with self.subTest(tool=tool['id']):
                self.assertIn(markdown_text(tool['readme']['note']), describe(tool, tool['access']))
                changed = dict(tool, readme={'note':'A unique guide-only detail.'})
                self.assertNotIn('A unique guide-only detail.', render_entry(changed, tool['access']))
