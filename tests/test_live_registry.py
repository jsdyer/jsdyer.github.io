import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from check_live_registry import verify_registry


class LiveRegistryTests(unittest.TestCase):
    def test_manual_list_order_does_not_change_accepted_membership(self):
        verify_registry({'schema': 'coolcode.tool-registry.v1', 'tool_ids': ['beta', 'alpha']},
                        ['alpha', 'beta'])

    def test_duplicates_missing_extra_and_nonstring_ids_are_rejected(self):
        for ids in (['alpha', 'beta', 'beta'], ['alpha'], ['alpha', 'beta', 'gamma'],
                    ['alpha', None], ['alpha', {}]):
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                verify_registry({'schema': 'coolcode.tool-registry.v1', 'tool_ids': ids},
                                ['alpha', 'beta'])

    def test_unexpected_response_schema_is_rejected(self):
        for value in (None, [], {}, {'schema': 'other', 'tool_ids': ['alpha']}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                verify_registry(value, ['alpha'])
