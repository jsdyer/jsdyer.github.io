import assert from 'node:assert/strict';
import test from 'node:test';
import {genreUsage, repoFromSource} from '../admin/interest.mjs';

test('genres use current browser tools, preserve zeros and report tied leaders', () => {
  const catalog = ['a','b','c','d','e'].map(id => ({id,title:id,access:id==='e'?'install':'browser',genre:id==='d'?'Sky':'Places'}));
  const counts = ['a','b','e','retired'].map(tool => ({tool,views:3}));
  assert.deepEqual(genreUsage(catalog,counts),[
    {genre:'Places',total:6,active:2,size:3,peak:3,leaders:['a','b']},
    {genre:'Sky',total:0,active:0,size:1,peak:0,leaders:[]},
  ]);
});

test('traffic requests use only a named repository under the owner', () => {
  assert.equal(repoFromSource('https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold'),'jsdyer.github.io');
  assert.equal(repoFromSource('https://github.com/jsdyer/nightfinder'),'nightfinder');
  assert.equal(repoFromSource('https://example.org/jsdyer/sketch'),null);
  assert.equal(repoFromSource('https://github.com/another-owner/nightfinder'),null);
});
