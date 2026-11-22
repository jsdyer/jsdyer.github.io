import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const code = readFileSync(new URL('../assets/tool-metrics.js', import.meta.url), 'utf8');

function page(path, privacy = {}) {
  const handlers = {}, requests = [];
  const window = {addEventListener(type, callback) { handlers[type] = callback; }};
  window.top = window;
  const document = {createElement:() => ({addEventListener(){}}), body:{appendChild(){}}, querySelector:() => null};
  runInNewContext(code, {window, document, navigator:privacy, Error, URL, crypto:webcrypto,
    location:new URL(path, 'https://coolcode.ca'), fetch(url, opts) { requests.push({url, ...opts}); return Promise.resolve(); }});
  return {handlers, requests};
}

test('provides only known first-party source coordinates to Sentry', () => {
  const {handlers, requests} = page('/scorecard/?search=sensitive');
  const error = {error:new TypeError('private value'), filename:'https://coolcode.ca/scorecard/app.mjs?q=secret', lineno:10, colno:2};
  handlers.error(error);
  handlers.error(error);
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.referrerPolicy, 'no-referrer');
  assert.equal(request.credentials, 'omit');
  assert.match(request.url, /^https:\/\/o4512474869202944\.ingest\.de\.sentry\.io\/api\/4512474872610896\/envelope\/$/);
  assert.doesNotMatch(request.body, /secret|sensitive|private value/);
  const [header, item, event] = request.body.split('\n').map(JSON.parse);
  assert.equal(header.event_id, event.event_id);
  assert.equal(item.type, 'event');
  const exception = event.exception.values[0];
  assert.equal(exception.type, 'TypeError');
  assert.deepEqual(exception.stacktrace.frames, [{filename:'/scorecard/app.mjs',lineno:10,in_app:true,colno:2}]);
  assert.deepEqual(event.tags, {tool:'scorecard'});
});

test('limits traffic and ignores unknown scripts, unrelated pages and privacy opt-outs', () => {
  for (const path of ['/admin/', '/report/', '/scorecard/private/', '/datasetdiff/', '/catalogue/']) {
    assert.equal(page(path).handlers.error, undefined);
  }
  assert.equal(page('/', {globalPrivacyControl:true}).handlers.error, undefined);
  assert.equal(page('/scorecard/', {doNotTrack:'1'}).handlers.error, undefined);
  const {handlers, requests} = page('/scorecard/');
  for (const filename of ['https://example.com/scorecard/app.mjs', 'blob:https://coolcode.ca/local',
    'https://coolcode.ca/scorecard/user-supplied-name.js']) handlers.error({filename,lineno:1});
  assert.equal(requests.length,0);
  for (let line = 1; line <= 8; line++) handlers.error({filename:'https://coolcode.ca/scorecard/app.mjs',lineno:line});
  assert.equal(requests.length,3);
});

test('unhandled rejections reduce stack frames to a single known location', () => {
  const {handlers, requests} = page('/pantryprices/index.html');
  handlers.unhandledrejection({reason:'private text'});
  const problem = new Error('sensitive');
  problem.stack = 'Error: private\n    at secret (https://coolcode.ca/pantryprices/coffee.mjs?x=secret:81:5)';
  handlers.unhandledrejection({reason:problem});
  assert.equal(requests.length,1);
  assert.doesNotMatch(requests[0].body,/private|sensitive|secret/);
  const event = JSON.parse(requests[0].body.split('\n')[2]);
  assert.equal(event.exception.values[0].stacktrace.frames[0].lineno,81);
});
