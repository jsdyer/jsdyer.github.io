import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueChanges, sourceScope } from '../admin/activity.mjs';

test('tool source history uses its registered repository or shared directory', () => {
  assert.deepEqual(sourceScope('https://github.com/jsdyer/nightfinder'), {repo:'nightfinder',path:''});
  assert.deepEqual(sourceScope('https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold'), {repo:'jsdyer.github.io',path:'tools/timefold'});
  assert.equal(sourceScope('https://example.com/jsdyer/test'),null);
});

test('catalogue diff preserves zero, reports recovery, and distinguishes additions and removals', () => {
  const tool = {id:'test',title:'Test',data_info:{probes:[{label:'Snapshot',count:0,unavailable:true}]}};
  const next = structuredClone(tool);
  next.data_info.probes[0] = {label:'Snapshot',count:2};
  assert.deepEqual(catalogueChanges([tool],[tool]),[]);
  assert.deepEqual(catalogueChanges([tool,{id:'old',title:'Old'}],[next,{id:'new',title:'New'}]),
    ['New · Added','Old · Removed','Test · Snapshot count: 0 → 2; Snapshot check recovered']);
});
