"""Publish CoolCode's admin metrics Worker to the owner's Cloudflare account."""
from getpass import getpass
import json
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import UUID, uuid4

WORKER = 'coolcode-admin-metrics'


def upload_body(source, database):
    metadata = {
        'main_module': 'worker.mjs',
        'compatibility_date': '2026-11-19',
        'bindings': [
            {'type': 'analytics', 'name': 'ANALYTICS_SQL'},
            {'type': 'service', 'name': 'COLLECTOR', 'service': 'coolcode-visitor-api'},
            {'type': 'plain_text', 'name': 'REPORTS_DATABASE_ID', 'text': database},
        ],
    }
    boundary = uuid4().hex
    parts = []
    for name, mime, value in [('metadata', 'application/json', json.dumps(metadata).encode()),
                              ('worker.mjs', 'application/javascript+module', source)]:
        header = (f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{name}"\r\n'
                  f'Content-Type: {mime}\r\n\r\n').encode()
        parts.extend((header, value, b'\r\n'))
    return b''.join(parts) + f'--{boundary}--\r\n'.encode(), 'multipart/form-data; boundary=' + boundary


def main():
    print('Deploy the admin metrics Worker to your CoolCode Cloudflare account.')
    account = input('Cloudflare account ID: ').strip()
    if not re.fullmatch('[a-fA-F0-9]{32}', account):
        raise ValueError('Expected a 32-character Cloudflare account ID.')
    database = str(UUID(input('UUID of the coolcode-reports D1 database: ').strip()))
    token = getpass('Cloudflare token with Workers Scripts Write on this account: ').strip()
    if not token:
        raise ValueError('A Cloudflare deployment token is required.')
    url = f'https://api.cloudflare.com/client/v4/accounts/{account}/workers/scripts/{WORKER}'
    source = Path(__file__).with_name('worker.mjs').read_bytes()
    body, content_type = upload_body(source, database)
    for method, endpoint, data, mime in [
        ('PUT', url, body, content_type),
        ('POST', url + '/subdomain', b'{"enabled":true,"previews_enabled":false}', 'application/json'),
    ]:
        request = Request(endpoint, data=data, method=method,
                          headers={'Authorization': 'Bearer ' + token, 'Content-Type': mime})
        with urlopen(request, timeout=45) as response:
            if not json.load(response).get('success'):
                raise RuntimeError('Cloudflare did not confirm the operation.')
    print('Published. Open https://coolcode.ca/admin/#cloudflare and refresh Cloudflare usage.')


if __name__ == '__main__':
    try:
        main()
    except HTTPError as error:
        raise SystemExit(f'Cloudflare returned HTTP {error.code}. Check this account’s Workers Scripts Write permission.')
    except (ValueError, OSError, RuntimeError) as error:
        raise SystemExit(str(error))
