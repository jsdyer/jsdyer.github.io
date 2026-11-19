"""Exercise local protocol inputs and the archived Canadian routing measurements."""
import json

def check_protocols(browser, url):
    page = browser.new_page(viewport={"width": 390, "height": 844})
    try:
        page.goto(url + '/protocol-cabinet/')
        page.locator('#live').click()
        page.locator('#report').wait_for(state='visible')
        assert 'HEAD' in page.locator('#message').inner_text()
        assert '200' in page.locator('#message').inner_text()
        def entry(host, status, ms):
            return {'request': {'method':'GET', 'url':'https://'+host+'/?private=value'},
                    'response': {'status':status, 'headers':[{'name':'Set-Cookie','value':'secret'}]}, 'time': ms}
        capture = {'log': {'entries':[entry('quick.example',200,11),entry('slow.example',304,170)]}}
        page.locator('#file').set_input_files({'name':'browser.har','mimeType':'application/json','buffer':json.dumps(capture).encode()})
        page.get_by_text('2 of 2 entries',exact=True).wait_for()
        page.locator('#sort').select_option('slow')
        assert 'slow.example' in page.locator('#direction').inner_text()
        assert 'private' not in page.locator('#message').inner_text()
        assert 'secret' not in page.locator('#message').inner_text()
        page.locator('#filter').fill('quick')
        assert '1 of 2' in page.locator('#count').inner_text()
        page.locator('[data-protocol="dns"]').click()
        page.get_by_text('Paste an export or headers',exact=True).click()
        page.locator('#paste').fill(json.dumps({'Status':3,'Question':[{'name':'absent.example','type':1}]}))
        page.locator('#read').click()
        assert 'NXDOMAIN' in page.locator('#message').inner_text()
        page.locator('[data-protocol="smtp"]').click()
        page.locator('#paste').fill('Received: from two by three; Wed, 01 Jan 2020 12:01:00 GMT\nReceived: from one\n by two; Wed, 01 Jan 2020 12:00:00 GMT\n\nbody')
        page.locator('#read').click()
        assert 'Hop 1 · two' in page.locator('#direction').inner_text()
        page.locator('#forward').click()
        assert 'Hop 2 · three' in page.locator('#direction').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.goto(url + '/packet-detour/')
        assert page.locator('#hops tr').count() == 13
        assert 'probe_ids=6493' in page.locator('#source').get_attribute('href')
        page.get_by_role('button',name='Montréal',exact=False).click()
        assert page.locator('#hops tr').count() == 9
        assert page.locator('#changes').inner_text() == 'Unknown'
        page.locator('#notes').fill('Origin | CA | 1\nIntermediate | US | 8\nReturn | CA | 14')
        page.locator('#note-form button').click()
        assert page.locator('#changes').inner_text() == '2'
        assert page.locator('#source').is_hidden()
    finally:
        page.close()
