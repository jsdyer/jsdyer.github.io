from pathlib import Path
import sys
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from refresh_dates import AllowedRedirects, badge_metadata, check_url, refresh, select, source_date


class CatalogueDateTests(unittest.TestCase):
    def test_dates_preserve_resolution_and_source_calendar_day(self):
        examples = [(2018, '2018'), ('2024-02', '2024-02'), ('April 2026', '2026-04'),
                    ('2024-02-29', '2024-02-29'), ('June 1, 2026', '2026-06-01'),
                    ('2026-11-17T23:30:10.397-07:00', '2026-11-17'),
                    ('Wed, 18 Nov 2026 05:00:00 GMT', '2026-11-18')]
        for raw, expected in examples:
            with self.subTest(raw=raw):
                self.assertEqual(source_date(raw), expected)
        for raw in ('2026-02-29', '2026-13', '0000', 'today', True, None, '2026-11-17T99:00'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                source_date(raw)

    def test_date_badges_use_only_the_retrieval_title(self):
        def svg(title):
            return f'<svg xmlns="http://www.w3.org/2000/svg"><title>{title}</title><text>2030-02-01</text></svg>'
        for title in ('Data retrieved · 2026-11-18', 'Data retrieved 2026-11-18'):
            self.assertEqual(badge_metadata(svg(title)), {'retrieved': '2026-11-18'})
        for wrong in (svg('Data built 2020-01-01'), svg('Data retrieved 2026-02-29'),
                      svg('Data retrieved · 2026-11'), '<html><title>Data retrieved 2026-11-18</title></html>',
                      '<!broken>'):
            with self.subTest(wrong=wrong), self.assertRaises(ValueError):
                badge_metadata(wrong)

    def test_paths_require_a_unique_match(self):
        data = {'cases': [{'id': 'A', 'dates': [2024, 2026]}, {'id': 'B'}]}
        self.assertEqual(select(data, ['cases', {'id': 'A'}, 'dates', -1]), 2026)
        self.assertEqual(select(data, ['cases', 1, 'id']), 'B')
        for path in ([], ['cases', 5], ['cases', -3], ['cases', True], ['cases', {'id': 'C'}]):
            with self.subTest(path=path), self.assertRaises(ValueError):
                select(data, path)
        data['cases'].append({'id': 'A'})
        with self.assertRaisesRegex(ValueError, 'matched 2 records'):
            select(data, ['cases', {'id': 'A'}])

    def test_bounded_public_source_hosts_even_after_redirect(self):
        for url in ('https://coolcode.ca/a/data.json',
                    'https://raw.githubusercontent.com/jsdyer/tool/main/metadata.json'):
            check_url(url)
        invalid = ['http://coolcode.ca/a', 'https://coolcode.ca@other.example/a',
                   'https://coolcode.ca:443/a', 'https://raw.githubusercontent.com/other/tool/main/a',
                   'https://raw.githubusercontent.com/jsdyer/tool/../other',
                   'https://raw.githubusercontent.com/jsdyer/%2e%2e/other/main/a']
        for url in invalid:
            with self.subTest(url=url), self.assertRaises(ValueError):
                check_url(url)
        with self.assertRaises(ValueError):
            AllowedRedirects().redirect_request(None, None, 302, '', {}, 'https://other.example/test')

    def test_grouped_fetch_preserves_last_success_per_field(self):
        ok_url, bad_url = 'https://coolcode.ca/one/source.json', 'https://coolcode.ca/two/data.json'
        ok = {'url': ok_url, 'label': 'Data retrieved', 'path': ['date'], 'unavailable': True,
              'notice_if': {'path': ['fallback'], 'equals': True, 'text': 'Bundled fallback'},
              'count_at': {'path': ['rows'], 'unit': 'records'}}
        broken = {'url': ok_url, 'label': 'Coverage', 'path': ['through'], 'value': '2021'}
        down = {'url': bad_url, 'label': 'Source published', 'path': ['date'], 'value': '2020-06',
                'notice': 'Previous source', 'count': 25}
        tools = [{'id': 'one', 'data_info': {'probes': [ok, broken]}},
                 {'id': 'two', 'data_info': {'probes': [down]}}]
        document = {'date': '2026-06-01', 'fallback': True, 'rows': 0}
        def retrieve(url):
            if url == bad_url:
                raise OSError('source offline')
            return document
        fetch = Mock(side_effect=retrieve)
        warnings = refresh(tools, fetch)
        self.assertEqual(fetch.call_count, 2)
        self.assertEqual(len(warnings), 2)
        self.assertEqual(ok['value'], '2026-06-01')
        self.assertEqual(ok['notice'], 'Bundled fallback')
        self.assertEqual(ok['count'], 0)
        self.assertNotIn('unavailable', ok)
        self.assertEqual((broken['value'], broken['unavailable']), ('2021', True))
        self.assertEqual((down['value'], down['count'], down['notice'], down['unavailable']),
                         ('2020-06', 25, 'Previous source', True))
        del document['fallback']  # Live snapshots omit the fallback-only flag.
        document.update(through='2026-04', rows=-1)
        refresh(tools, fetch)
        self.assertNotIn('count', ok)
        ok['count_at']['measure'] = 'length'
        document['rows'] = [{'id': 2}, {'id': 3}]
        refresh(tools, fetch)
        self.assertEqual(ok['count'], 2)
        self.assertNotIn('notice', ok)
        self.assertNotIn('unavailable', broken)
        self.assertEqual(broken['value'], '2026-04')


if __name__ == '__main__':
    unittest.main()
