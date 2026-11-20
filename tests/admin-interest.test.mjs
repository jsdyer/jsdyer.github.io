import assert from 'node:assert/strict';
import test from 'node:test';
import {dailyTraffic, genreUsage, repoFromSource} from '../admin/interest.mjs';

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

test('GitHub daily traffic preserves reported zero, missing days, and tied peaks', () => {
  const day = (d, count, uniques) => ({timestamp:d + 'T00:00:00Z', count, uniques});
  const result = dailyTraffic({views:[
    day('2026-11-12', 9, 2), day('2026-11-10', 9, 7), day('2026-11-14', 0, 0),
  ]}, 'views');
  assert.equal(result.peak, 9);
  assert.deepEqual(result.peakDays, ['2026-11-10','2026-11-12']);
  assert.equal(result.series.has('2026-11-11'), false);
  assert.deepEqual(result.series.get('2026-11-14'), {count:0, uniques:0});
  assert.deepEqual(dailyTraffic({views:[day('2026-11-12', 0, 0)]}, 'views').peakDays, []);
});

test('an empty GitHub series is distinct from a missing or unreadable breakdown', () => {
  assert.equal(dailyTraffic({count:4}, 'clones'), null);
  assert.equal(dailyTraffic(undefined, 'clones'), null);
  assert.equal(dailyTraffic({clones:[]}, 'clones').series.size, 0);
  const row = {timestamp:'2026-11-10T00:00:00Z', count:3, uniques:2};
  for (const rows of [[null], [row, row], [{...row, timestamp:'yesterday'}], [{...row, count:-1}]]) {
    assert.equal(dailyTraffic({clones:rows}, 'clones'), null);
  }
});
