from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from check_atlantic_dial import check


class StationScheduleChecks(unittest.TestCase):
    def test_slot_must_appear_under_the_published_weekday(self):
        data = {
            'stations': {'x': {'name': 'Example', 'source': 'https://example.org'}},
            'shows': [{'title':'Kitchen music', 'station':'x', 'slots':[
                {'days':[6], 'daySection':True, 'sourceText':['Kitchen music 7pm–8pm']}
            ]}]
        }
        slot = 'Kitchen music 7pm–8pm'
        good = f'<h3>Saturday</h3><p>{slot}</p><h3>Sunday</h3>'
        wrong = f'<h3>Saturday</h3><script>{slot}</script><h3>Sunday</h3><p>{slot}</p>'
        self.assertEqual(check(data, lambda _: good), [])
        self.assertIn('review Kitchen music', check(data, lambda _: wrong)[0])
        self.assertIn('review Kitchen music', check(data, lambda _: good.replace('8pm', '9pm'))[0])
