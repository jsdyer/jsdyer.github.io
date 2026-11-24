"""Exercise the reporting panel with public-response fixtures, without an owner token."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import expect

ROOT = Path(__file__).resolve().parents[1]
REPORT = 'https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/collector-outcomes-log/collector-outcomes.json'


def check_outcomes(browser, base, screenshots):
    now=datetime.now(timezone.utc)
    at=now.isoformat().replace('+00:00','Z')
    row={'repo':'jsdyer/lobbytrail','workflow':'refresh.yml','titles':['Lobby Trail'],
         'status':'attention','reasons':['Latest workflow run failure'],
         'execution':{'state':'active','latest':{'id':42,'status':'completed','conclusion':'failure','event':'workflow_dispatch','at':at},
                      'latest_refresh':{'id':42,'status':'completed','conclusion':'failure','event':'workflow_dispatch','at':at}},
         'output':{'status':'recent','checks':[{'label':'Source checked','url':'https://coolcode.ca/lobbytrail/index.json','timestamp':at,'precision':'timestamp','status':'fresh','max_age_seconds':259200}]},
         'counts':[{'label':'Reports','value':270514,'unit':'reports'}]}
    good=json.loads(json.dumps(row));good.update(repo='jsdyer/example',titles=['Example'],status='checked',reasons=[])
    good['execution']['latest']['conclusion']=good['execution']['latest_refresh']['conclusion']='success'
    good['output']['run_alignment']='date_only'
    report={'version':1,'checked_at':at,'rows':[row,good],'history':[]}
    context=browser.new_context()
    try:
        page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        context.route('**/admin/sign-in.mjs',lambda route:route.fulfill(content_type='text/javascript',body='''
          import {initializeOutcomes} from './tool-outcomes.mjs';
          document.getElementById('gate').hidden=true;
          const root=document.getElementById('dashboard');
          root.replaceChildren(document.getElementById('dashboard-layout').content.cloneNode(true));
          root.hidden=false;
          initializeOutcomes({signal:new AbortController().signal,token:'browser-fixture-token'});
        '''))
        context.route(REPORT+'*',lambda route:route.fulfill(content_type='application/json',body=json.dumps(report)))
        dispatches=[]
        def dispatch(route):
            dispatches.append(route.request.post_data)
            assert route.request.headers.get('authorization')=='Bearer browser-fixture-token'
            route.fulfill(status=204,headers={'Date':now.strftime('%a, %d %b %Y %H:%M:%S GMT')})
        context.route('https://api.github.com/repos/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml/dispatches',dispatch)
        page.goto(base+'/admin/#outcomes')
        expect(page.locator('#outcomes-body tbody tr')).to_have_count(1)
        expect(page.locator('#outcomes-body')).to_contain_text('Published check is recent')
        expect(page.locator('#outcomes-body')).to_contain_text('270,514')
        page.get_by_label('Outcome results').select_option('')
        expect(page.locator('#outcomes-body tbody tr')).to_have_count(2)
        expect(page.locator('#outcomes-body')).to_contain_text('Date-only evidence cannot identify')
        page.get_by_label('Find tool outcome').fill('Lobby')
        expect(page.locator('#outcomes-body tbody tr')).to_have_count(1)
        for width in (1440,390):
            page.set_viewport_size({'width':width,'height':1000})
            page.locator('#outcomes').scroll_into_view_if_needed()
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            page.locator('#outcomes').screenshot(path=str(screenshots/f'admin-outcomes-{width}.png'))
        page.get_by_role('button',name='Check GitHub now').click()
        expect(page.locator('.outcome-request')).to_contain_text('GitHub accepted')
        assert dispatches==['{"ref":"main"}']
        expect(page.get_by_role('button',name='Check GitHub now')).to_be_disabled()
        page.get_by_role('button',name='Load saved report').click()
        expect(page.locator('.outcome-request')).to_contain_text('table still shows the saved snapshot')
        report['read_mode']='fresh'
        for item in report['rows']:item['observed_at']=(now+timedelta(seconds=1)).isoformat().replace('+00:00','Z')
        page.get_by_role('button',name='Load saved report').click()
        expect(page.locator('.outcome-request')).to_contain_text('fresh check has finished')
        expect(page.get_by_role('button',name='Check GitHub now')).to_be_enabled()
        report['checked_at']=(now-timedelta(hours=5)).isoformat().replace('+00:00','Z')
        page.get_by_role('button',name='Load saved report').click()
        expect(page.locator('#outcomes-body [role=status]').first).to_contain_text('current tool health is unknown')
        report['rows']=[{'bad':'result'}]
        page.get_by_role('button',name='Load saved report').click()
        expect(page.locator('#outcomes-body [role=status]').first).to_contain_text('invalid tool result')
        expect(page.locator('#outcomes-body tbody tr')).to_have_count(0)
        assert not errors,errors
    finally:
        context.close()
