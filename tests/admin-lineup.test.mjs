import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSettings,sameSettings} from '../admin/lineup.mjs';
const a=['nightfinder','eventradar','dnslens','atip'], b=['exploitgraveyard','inflation-basket',...a.slice(2)];
const original={mode:'fixed',a,b,experiment:'launch'}, ids=new Set([...a,...b]);
test('a change to visible tools starts a clean reporting period',()=>{
  assert.equal(makeSettings(original,'fixed',b,a,ids,'next').experiment,'next');
  assert.equal(makeSettings(original,'ab',a,b,ids,'test').experiment,'test');
  assert.equal(makeSettings(original,'fixed',a,[...b].reverse(),ids,'unused').experiment,'launch');
  assert(sameSettings(original,makeSettings(original,'fixed',a,b,ids,'unused')));
});
test('reject duplicate, unknown and indistinguishable choices',()=>{
  assert.throws(()=>makeSettings(original,'fixed',[a[0],a[0],a[2],a[3]],b,ids,'x'));
  assert.throws(()=>makeSettings(original,'fixed',[...a.slice(0,3),'unknown'],b,ids,'x'));
  assert.throws(()=>makeSettings(original,'ab',a,a,ids,'x'));
});
