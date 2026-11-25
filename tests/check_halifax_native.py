#!/usr/bin/env python3
"""Optional native-stream smoke test. Requires an existing workerd executable.

python3 tests/check_halifax_native.py --workerd /path/to/workerd
No deployment, network calls or additional project dependencies are needed.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

FIXTURE = r'''
export default {async test(){
 const assert=(value,message)=>{if(!value)throw new Error(message)};
 for(const [size,length,shouldFail] of [[5,5,false],[5,4,true],[5,6,true]]){
  let failed=false;
  try{
   const result=new Response(halifaxBoundedStream(new Response(new Uint8Array(size)).body,length));
   assert((await result.arrayBuffer()).byteLength===length,'Incorrect exact length');
  }catch{failed=true}
  assert(failed===shouldFail,'Native length enforcement failed: '+size+'/'+length);
 }
 for(const length of [undefined,0,-1,1.5,5000001,NaN]){
  let failed=false;try{halifaxBoundedStream(new Response(new Uint8Array(5)).body,length)}catch{failed=true}
  assert(failed,'Invalid length was accepted: '+length);
 }
 const bytes=new Uint8Array([1,2,3,4,5]), capture='2026-11-25T12:00:00Z';
 const response=new Response(halifaxBoundedStream(new Response(bytes).body,bytes.length),{
  headers:{'Content-Type':'application/x-protobuf','Cache-Control':'public,max-age=30','X-CoolCode-Fetched-At':capture}
 });
 const key=new Request('https://halifax-smoke.example/feed');
 const [,output]=await Promise.all([caches.default.put(key,response.clone()),response.arrayBuffer()]);
 assert(new Uint8Array(output).join(',')===bytes.join(','),'Relay changed bytes');
 const hit=await caches.default.match(key);
 assert(hit&&hit.headers.get('X-CoolCode-Fetched-At')===capture,'Cache lost capture time');
 assert(new Uint8Array(await hit.arrayBuffer()).join(',')===bytes.join(','),'Cache changed bytes');
 console.log('Actual Halifax helper: native exact/short/excess, invalid lengths and cached clone passed');
}};
'''

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workerd', default=os.environ.get('WORKERD', 'workerd'))
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source = (root / 'services/cloudflare-visitor/halifax-gateway.js').read_text()
    with tempfile.TemporaryDirectory(prefix='halifax-native-') as directory:
        path = Path(directory)
        (path / 'cache').mkdir()
        (path / 'smoke.mjs').write_text(source + '\n' + FIXTURE)
        config = '''using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
 services = [
  (name="smoke", worker=(compatibilityDate="2026-11-19",
   modules=[(name="smoke.mjs",esModule=embed "smoke.mjs")],cacheApiOutbound="cache")),
  (name="cache",cache=(path=%s))
 ]
);
''' % json.dumps(str(path / 'cache'))
        (path / 'config.capnp').write_text(config)
        subprocess.run([args.workerd, 'test', '--experimental', str(path / 'config.capnp')], check=True)

if __name__ == '__main__':
    main()
