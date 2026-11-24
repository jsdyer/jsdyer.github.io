#!/usr/bin/env python3
"""Deploy generated visitor code only, preserve bindings/settings, record verified content."""
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from getpass import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from sync_operations import sync


def module_content(payload, content_type):
    if 'multipart/' not in content_type:
        return payload
    message = BytesParser(policy=policy.default).parsebytes(
        ('Content-Type: ' + content_type + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + payload)
    parts = [p.get_payload(decode=True) for p in message.iter_parts()
             if p.get_param('name', header='content-disposition') == 'worker.js']
    if len(parts) != 1:
        raise ValueError('Expected exactly one worker.js module; review the deployed source')
    return parts[0]


def upload_body(source):
    boundary = uuid4().hex
    chunks = []
    for name, mime, value in [('metadata', 'application/json', b'{"main_module":"worker.js"}'),
                              ('worker.js', 'application/javascript+module', source)]:
        chunks.extend([(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n').encode(), value, b'\r\n'])
    return b''.join(chunks) + f'--{boundary}--\r\n'.encode(), 'multipart/form-data; boundary=' + boundary


def main():
    sync(ROOT, check=True)
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID') or input('Existing CoolCode Cloudflare account ID: ').strip()
    if not re.fullmatch('[a-fA-F0-9]{32}', account):
        raise ValueError('Expected the existing 32-character account ID')
    token = os.environ.get('CLOUDFLARE_API_TOKEN') or getpass('Workers Scripts Write token (hidden): ').strip()
    endpoint = f'https://api.cloudflare.com/client/v4/accounts/{account}/workers/scripts/coolcode-visitor-api'
    def request(method, suffix='', data=None, mime=None):
        headers = {'Authorization': 'Bearer ' + token}
        if mime: headers['Content-Type'] = mime
        with urlopen(Request(endpoint + suffix, method=method, data=data, headers=headers), timeout=45) as response:
            payload = response.read(2_000_001)
            if len(payload) > 2_000_000: raise ValueError('Unexpectedly large Worker response')
            return payload, response.headers.get('Content-Type', '')
    receipt_path = ROOT / 'data/operations/cloudflare-deployment.json'
    old, mime = request('GET')
    if receipt_path.exists():
        expected = json.loads(receipt_path.read_text())['source_sha256']
        if hashlib.sha256(module_content(old, mime)).hexdigest() != expected:
            raise ValueError('Live Worker changed outside GitHub; import and review those changes before deploying')
    source = Path(__file__).with_name('worker.js').read_bytes()
    body, mime = upload_body(source)
    response, _ = request('PUT', '/content', body, mime)
    if not json.loads(response).get('success'): raise ValueError('Cloudflare did not confirm deployment')
    deployed, mime = request('GET')
    if module_content(deployed, mime) != source:
        raise ValueError('Deployed code does not match generated source')
    receipt = {'worker': 'coolcode-visitor-api', 'source_sha256': hashlib.sha256(source).hexdigest(),
               'verified_at': datetime.now(timezone.utc).isoformat(), 'method': 'content-only upload; downloaded module verified'}
    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
    print('Verified visitor Worker deployment. Commit the updated deployment receipt with the source.')


if __name__ == '__main__':
    main()
