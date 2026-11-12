#!/usr/bin/env python3
"""Run against a disposable local instance with registration enabled. Uses stdlib only.
Usage: python3 tests/http_smoke.py http://127.0.0.1:3000
Creates two uniquely named accounts and deletes them after successful checks.
"""
import http.cookiejar, json, re, secrets, sys, urllib.request, urllib.error, urllib.parse
import xml.etree.ElementTree as ET
BASE=sys.argv[1].rstrip('/')
CHECKS=0
class Client:
    def __init__(self):
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(self,path,data=None,method=None,headers=None):
        headers=headers or {}
        if isinstance(data,dict): data=urllib.parse.urlencode(data).encode()
        req=urllib.request.Request(BASE+path,data=data,method=method,headers=headers)
        try: r=self.opener.open(req)
        except urllib.error.HTTPError as e: r=e
        return r.status,r.read().decode(),r.headers
    def post(self,path,data,form='/settings'):
        _,html,_=self.request(form)
        token=re.search(r'name="csrf" value="([a-f0-9]+)"',html)
        assert token, ('no CSRF token',form,html[:200])
        return self.request(path,dict(data,csrf=token.group(1)))
def check(test,label):
    global CHECKS
    assert test,label
    CHECKS+=1
    print(f'ok {CHECKS} - {label}')
anon=Client();a=Client();b=Client()
suffix=secrets.token_hex(4);an='qa'+suffix+'a';bn='qa'+suffix+'b';password=secrets.token_hex(16)
for c,name in [(a,an),(b,bn)]:
    status,html,_=c.post('/join',dict(username=name,email=name+'@example.invalid',password=password),'/join')
    check(status==200 and 'Let it feel like you' in html,'registration opens profile editor')
status,_,_=anon.request('/workspace');check(status==401,'workspace requires authentication')
status,_,_=a.request('/entry/save',dict(kind='post',title='No CSRF'));check(status==403,'missing CSRF denied')
status,_,_=a.post('/profile/save',dict(display_name='Test human',bio='<script>alert(1)</script>',website='',location='',now_text='learning slowly',uses_text='Linux',theme='cedar',listed='1'),'/profile');check(status==200,'profile saves')
_,html,_=anon.request('/@'+an);check('&lt;script&gt;' in html and '<script>alert' not in html,'profile output escapes markup')
ids={}
for kind in ['post','status','bookmark','paste','link','lab','archive','field']:
    data=dict(kind=kind,title='Entry '+kind,body='content '+kind,slug='qa-'+kind,visibility='public')
    if kind in ['bookmark','link','archive']:data['target_url']='https://example.org/'
    status,html,_=a.post('/entry/save',data)
    check(status==200 and 'A little refinement' in html,kind+' can be created')
    ids[kind]=re.search(r'name="id" value="(\d+)"',html).group(1)
    status,_,_=anon.request('/@'+an+'/e/qa-'+kind);check(status==200,kind+' public permalink opens')
_,export,_=a.request('/export');data=json.loads(export);check(len(data['entries'])==8,'JSON export includes all apps')
check('password_hash' not in export and 'token_hash' not in export,'export excludes authentication secrets')
_,html,h=a.request('/export/bookmarks');check('NETSCAPE' in html and 'Entry bookmark' in html and 'attachment' in h['Content-Disposition'],'browser bookmark export downloads')
status,_,_=b.request('/compose?id='+ids['post']);check(status==404,'another member cannot open editor')
status,_,_=b.post('/entry/save',dict(id=ids['post'],kind='post',title='stolen',slug='qa-post'));check(status==404,'cross-account writes denied')
status,_,_=b.post('/entry/delete',dict(id=ids['post']));check(status==404,'cross-account deletion denied')
status,_,_=a.post('/entry/save',dict(id=ids['post'],visibility='private'));check(status==200,'visibility updates')
status,_,_=anon.request('/@'+an+'/e/qa-post');check(status==404,'private entry hidden from anonymous visitor')
status,_,_=a.request('/@'+an+'/e/qa-post');check(status==200,'owner can read private entry')
status,_,_=a.post('/entry/save',dict(id=ids['status'],visibility='unlisted'));check(status==200,'unlisted visibility saves')
status,_,_=anon.request('/@'+an+'/e/qa-status');check(status==200,'unlisted permalink remains readable')
_,feed,_=anon.request('/@'+an+'/feed.xml');ET.fromstring(feed)
check('Entry post' not in feed and 'Entry status' not in feed and 'Entry bookmark' in feed,'RSS is XML and excludes private and unlisted')
status,html,_=anon.request('/s/'+an+'/qa-link');check(status==200 and 'https://example.org/' in html and 'Continue to website' in html,'short link exposes destination before navigation')
status,_,_=a.post('/entry/save',dict(kind='link',title='bad',target_url='javascript:alert(1)'));check(status==422,'unsafe destination scheme rejected')
status,html,_=a.post('/token/create',{})
token=re.search(r'<code class="token">([a-f0-9]{64})</code>',html).group(1)
headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'}
status,body,_=anon.request('/api/entries',headers=headers);check(status==200 and len(json.loads(body)['entries'])==8,'token API reads own entries')
status,body,_=anon.request('/api/entries',json.dumps(dict(kind='status',title='From a script',body='hello',visibility='private')).encode(),headers=headers);check(status==201,'API creates entry')
api_id=json.loads(body)['id']
status,_,_=anon.request('/api/entries/'+str(api_id),json.dumps(dict(body='updated')).encode(),method='PATCH',headers=headers);check(status==200,'API partial update works')
status,_,_=anon.request('/api/entries/'+str(api_id),method='DELETE',headers=headers);check(status==200,'API deletion works')
a.post('/token/revoke',{});status,_,_=anon.request('/api/entries',headers=headers);check(status==401,'revoked API token fails')
_,html,_=a.request('/@'+bn);owner=re.search(r'name="owner_id" value="(\d+)"',html).group(1)
status,_,_=a.post('/guestbook/sign',dict(owner_id=owner,body='A kind little hello'),'/@'+bn);check(status==200,'guestbook message submitted')
_,html,_=anon.request('/@'+bn);check('A kind little hello' not in html,'pending guestbook message is hidden')
_,html,_=b.request('/guestbook');message_id=re.search(r'name="id" value="(\d+)"',html).group(1)
a.post('/guestbook/moderate',dict(id=message_id,decision='approved'),'/guestbook');_,html,_=anon.request('/@'+bn);check('A kind little hello' not in html,'non-owner cannot approve guestbook')
b.post('/guestbook/moderate',dict(id=message_id,decision='approved'),'/guestbook');_,html,_=anon.request('/@'+bn);check('A kind little hello' in html,'owner approval publishes guestbook')
status,_,_=a.post('/directory/submit',dict(name='QA directory '+suffix,website='https://example.org/',claim='Canadian-owned',evidence_url='https://example.org/about',category='testing',province='BC',notes='Test lead'))
check(status==200,'directory suggestion accepted')
_,html,_=anon.request('/directory?q='+suffix);check('QA directory '+suffix not in html,'unreviewed directory submission hidden')
status,_,_=a.request('/admin');check(status==403,'member cannot access admin')
status,_,_=a.post('/admin/directory',dict(id=1,decision='approved'));check(status==403,'member cannot moderate directory')
status,_,_=b.post('/import',dict(json=export));check(status==200,'JSON import works over HTTP')
_,body,_=b.request('/export');check(all(e['visibility']=='private' for e in json.loads(body)['entries']),'HTTP import stays private')
newpass=secrets.token_hex(16);status,_,_=a.post('/password',dict(current_password=password,password=newpass));check(status==200,'password change works')
check('Content-Security-Policy' in anon.request('/')[2],'CSP header present')
for c,pw,name in [(a,newpass,an),(b,password,bn)]:
    status,_,_=c.post('/account/delete',dict(password=pw));check(status==200,'account deletion succeeds')
    status,_,_=anon.request('/@'+name);check(status==404,'deleted profile no longer exists')
print(f'PASS: {CHECKS} HTTP checks')
