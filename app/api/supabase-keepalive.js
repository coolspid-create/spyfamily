import { Buffer } from 'node:buffer';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const PUBLIC_METADATA_URL = 'https://nsuxjflmexbfjsmbmlax.supabase.co/storage/v1/object/info/public/app-assets/';
const SAMPLE_PATHS = ['diary-samples/book-cover.jpg', 'diary-samples/book-page1.jpg'];
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;

function isAuthorized(authorization, secret) {
  if (!secret || typeof authorization !== 'string') return false;
  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readSampleMetadata(path) {
  const url = new URL(path, PUBLIC_METADATA_URL);
  // Force an origin metadata read instead of a cached asset response.
  url.searchParams.set('check', randomUUID());
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache, no-store' },
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Supabase HTTP ${response.status}`);
  }
  const metadata = await response.json();
  if (metadata?.bucket_id !== 'app-assets' || metadata.name !== path || !metadata.id) {
    throw new Error('Unexpected public metadata response');
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!isAuthorized(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const results = await Promise.allSettled(SAMPLE_PATHS.map(readSampleMetadata));
    if (results.every(result => result.status === 'fulfilled')) {
      const checkedAt = new Date().toISOString();
      console.info('[supabase-keepalive] Public metadata read succeeded', { checkedAt, reads: SAMPLE_PATHS.length, attempt });
      return res.status(200).json({ ok: true, checkedAt, reads: SAMPLE_PATHS.length });
    }
    console.warn('[supabase-keepalive] Public metadata read failed', { attempt });
    if (attempt < MAX_ATTEMPTS) await delay(1000);
  }
  return res.status(502).json({ ok: false, error: 'Supabase public metadata check failed' });
}
