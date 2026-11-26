import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../services/cloudflare-visitor/worker.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const path='https://worker.example/api/browserreceipt/connection';

test('connection response is bounded, uncached and never calls storage or a provider',async t=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('No upstream allowed');};t.after(()=>globalThis.fetch=original);
  const request=new Request(path,{headers:{Origin:'https://coolcode.ca','CF-Connecting-IP':'192.0.2.20'}});
  Object.defineProperty(request,'cf',{value:{asn:64500,asOrganization:'Example ISP',country:'CA',colo:'YVR',httpProtocol:'HTTP/2',tlsVersion:'TLSv1.3',privateExtra:'not returned'}});
  const response=await worker.fetch(request,{});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  const body=await response.json();
  assert.deepEqual(body.data,{ip:'192.0.2.20',asn:64500,organization:'Example ISP',country:'CA',colo:'YVR',http:'HTTP/2',tls:'TLSv1.3'});
  assert.ok(Number.isFinite(Date.parse(body.fetched_at)));
});

test('connection diagnostics rejects other origins, methods and query arguments',async()=>{
  for(const [url,origin,method,status] of [[path,'https://elsewhere.example','GET',403],[path,'','GET',403],[path,'https://coolcode.ca','POST',405],[path+'?ip=example','https://coolcode.ca','GET',400]]) {
    const response=await worker.fetch(new Request(url,{method,headers:{Origin:origin}}),{});
    assert.equal(response.status,status);
  }
});

test('unknown Cloudflare properties remain unknown instead of inferred',async()=>{
  const response=await worker.fetch(new Request(path,{headers:{Origin:'https://coolcode.ca'}}),{});
  assert.equal(response.status,200);
  for(const value of Object.values((await response.json()).data)) assert.equal(value,null);
});
