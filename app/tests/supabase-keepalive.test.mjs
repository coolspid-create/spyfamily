import assert from 'node:assert/strict';
import process from 'node:process';
import { test } from 'node:test';
import handler from '../api/supabase-keepalive.js';

const testSecret = 'test-secret';

function setSecret(t, secret = testSecret) {
  const previous = process.env.CRON_SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
  process.env.CRON_SECRET = secret;
}

async function request(method, authorization) {
  const res = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; }
  };
  await handler({ method, headers: { authorization } }, res);
  return res;
}

test('rejects non-GET and unauthorized invocations without reaching Supabase', async (t) => {
  setSecret(t);
  const fetch = t.mock.method(globalThis, 'fetch');
  assert.equal((await request('POST', `Bearer ${testSecret}`)).statusCode, 405);
  assert.equal((await request('GET')).statusCode, 401);
  assert.equal((await request('GET', 'Bearer bad-secret!')).statusCode, 401);
  assert.equal(fetch.mock.callCount(), 0);
});

test('reads only uncached public sample metadata and returns no object data', async (t) => {
  setSecret(t);
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    const prefix = '/storage/v1/object/info/public/app-assets/';
    assert.equal(url.origin, 'https://nsuxjflmexbfjsmbmlax.supabase.co');
    assert.ok(url.pathname.startsWith(prefix));
    assert.ok(url.searchParams.get('check'));
    assert.equal(options.method, 'GET');
    assert.deepEqual(options.headers, { 'Cache-Control': 'no-cache, no-store' });
    return Response.json({ bucket_id: 'app-assets', id: 'sample-id', name: url.pathname.slice(prefix.length) });
  });
  const res = await request('GET', `Bearer ${testSecret}`);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(Object.keys(res.body).sort(), ['checkedAt', 'ok', 'reads']);
  assert.equal(res.body.reads, 2);
});

test('retries and reports a failure when Supabase cannot be read', async (t) => {
  setSecret(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 544 }));
  const res = await request('GET', `Bearer ${testSecret}`);
  assert.equal(fetch.mock.callCount(), 4);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
});
