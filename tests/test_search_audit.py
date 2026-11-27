import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from audit_search import ORIGIN, candidate_url, inventory, naming_finding


class ProductionSearchTests(unittest.TestCase):
    def setUp(self):
        self.tool = {'id':'my-tool', 'url':'/my-tool/', 'access':'browser', 'use_cases':[{'path':'existing/'}]}
        self.root = ORIGIN + self.tool['url']

    def test_legacy_label_with_an_approved_task_label_is_a_review_hint(self):
        tool = {"id":"bankrates", "title":"BankRate Lab", "task_label":"Bank of Canada Rates and Exchange Rates"}
        self.assertEqual(naming_finding("BankRate Lab · CoolCode.ca", tool, "title"),
                         "review_legacy_catalogue_title")
        self.assertIsNone(naming_finding("Bank of Canada Rates and Exchange Rates", tool, "title"))
        self.assertIsNone(naming_finding("BankRate Lab", {"id":"bankrates","title":"BankRate Lab"}, "h1"))

    def test_native_link_scope(self):
        self.assertEqual(candidate_url(self.root,'search/town/'), self.root+'search/town/')
        for href in ('#foo','#','/?q=personal','/other/','https://outside.example/',
                     'https://coolcode.ca.attacker.example/my-tool/','//example.com/my-tool/',
                     'data/secret/','private/x/','report.html','saved/abc/','export/','index.html','example.json',
                     'file.xml','person%2Fhidden/','find/?q=patient','x/one/two/three/'):
            with self.subTest(href=href):
                self.assertIsNone(candidate_url(self.root, href))

    def test_brand_headings_canonical_robots_and_candidate_budget(self):
        seen = []
        self.tool['result_directory'] = {'path': 'records/', 'additional_paths': ['places/']}
        def read(url):
            seen.append(url)
            if url == self.root:
                html = ('<title>My Tool · CoolCode</title></head><body><h1><a href="./">My Tool</a></h1>'
                        '<a href="records/">Index</a><a href="places/can/">Indexed country</a>'
                        '<a href="existing/">Registered example</a><a href="new/">New</a><a href="z/">Later</a>')
            else:
                html = (f'<title>Example task</title><link rel="canonical" href="{url}">'
                        '<meta name="description" content="Valid example"></head><body><h1>Example task</h1>')
            return dict(status='ok',http=200,robots=[],limited=False,body='<html><head>'+html+'</body></html>')
        output = inventory([self.tool,dict(self.tool,access='install')], read, 1)
        self.assertEqual(seen,[self.root,self.root+'new/'])
        self.assertEqual(output['candidate_count'],2)
        self.assertEqual(set(output['root_findings']),{'review_brand_only_title','review_brand_only_h1','missing_canonical','missing_description'})
        self.assertTrue(output['linked_pages'][0]['review_for_sitemap'])

    def test_robots_http_and_incomplete_html_remain_distinct(self):
        def read(url):
            if url==self.root:
                return dict(status='ok',http=200,robots=['googlebot: noindex'],limited=True,
                            body='<head><title>Title</title></head><body><a href="secret/">private</a>')
            return dict(status='unknown',http=403)
        output = inventory([self.tool,{'id':'other','url':'/other/','access':'browser'}],read,32)
        self.assertFalse(output['linked_pages'])
        self.assertEqual(output['unknown_roots'],1)
        self.assertEqual(output['roots'][1]['http'],403)
        self.assertNotIn('findings',output['roots'][1])
        self.assertIn('review_index_restriction',output['roots'][0]['findings'])
        self.assertIn('h1_unverified',output['roots'][0]['findings'])
