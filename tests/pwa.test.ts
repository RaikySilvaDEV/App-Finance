import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const publicUrl = (path: string) => new URL(`../public${path}`, import.meta.url);
const worker = readFileSync(publicUrl('/sw.js'), 'utf8');
const origin = 'https://finpulse.example';

function harness() {
  const listeners: Record<string, (event: any) => void> = {};
  const cacheNames = new Map<string, Map<string, Response>>();
  const writes: string[] = [], deleted: string[] = [], requests: { url: string; options: any }[] = [];
  let fail = false, claimed = false;
  const self = { location: { origin }, addEventListener: (name: string, callback: any) => { listeners[name] = callback; }, skipWaiting: async () => {}, clients: { claim: async () => { claimed = true; } } };
  const caches = {
    keys: async () => [...cacheNames.keys()],
    delete: async (key: string) => { deleted.push(key); return cacheNames.delete(key); },
    open: async (key: string) => {
      if (!cacheNames.has(key)) cacheNames.set(key, new Map());
      return {
        addAll: async (list: any[]) => {
          for (const item of list) {
            assert.equal(item.credentials, 'omit');
            const path = new URL(item.url).pathname;
            assert.ok(existsSync(publicUrl(path)), path);
            writes.push(path);
            cacheNames.get(key)!.set(path, new Response(readFileSync(publicUrl(path))));
          }
        },
        match: async (path: string) => cacheNames.get(key)?.get(path)?.clone(),
      };
    },
  };
  class WorkerRequest { url: string; credentials: string; constructor(path: string, options: any) { this.url = new URL(path, origin).href; this.credentials = options.credentials; } }
  runInNewContext(worker, { self, caches, URL, Response, Request: WorkerRequest, fetch: async (request: any, options: any) => { requests.push({ url: request.url, options }); if (fail) throw new Error('offline'); return new Response('live document'); } });
  async function lifecycle(name: string) { let promise: Promise<unknown> | undefined; listeners[name]({ waitUntil: (p: Promise<unknown>) => { promise = p; } }); await promise; }
  function fetchResource(path: string, mode = 'cors', method = 'GET') {
    let result: Promise<Response> | undefined;
    listeners.fetch({ request: { url: new URL(path, origin).href, mode, method }, respondWith: (p: Promise<Response>) => { result = p; } });
    return result;
  }
  return { lifecycle, fetchResource, writes, requests, cacheNames, deleted, goOffline: () => { fail = true; }, claimed: () => claimed };
}

test('PWA manifest has standalone launch, stable identity and valid PNG dimensions', () => {
  const manifest = JSON.parse(readFileSync(publicUrl('/manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
  assert.equal(manifest.prefer_related_applications, false);
  for (const size of [192, 512]) assert.ok(manifest.icons.some((icon: any) => icon.sizes === `${size}x${size}` && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon: any) => icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const file = readFileSync(publicUrl(icon.src));
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(file.subarray(1, 4).toString(), 'PNG');
    assert.equal(file.readUInt32BE(16), width); assert.equal(file.readUInt32BE(20), height);
  }
});

test('worker caches only public files and removes only older FinPulse PWA caches', async () => {
  const h = harness(); h.cacheNames.set('finpulse-pwa-old', new Map()); h.cacheNames.set('another-app', new Map());
  await h.lifecycle('install'); await h.lifecycle('activate');
  assert.deepEqual(h.deleted, ['finpulse-pwa-old']); assert.ok(h.claimed());
  assert.ok(h.writes.includes('/offline.html'));
  assert.ok(h.writes.every((path) => path.startsWith('/icons/') || ['/offline.html', '/manifest.webmanifest'].includes(path)));
  assert.equal(h.writes.includes('/'), false);
});

test('financial APIs, POSTs, external services and query-bearing icons bypass the worker', async () => {
  const h = harness(); await h.lifecycle('install'); const writes = h.writes.length;
  for (const path of ['/api', '/api/user/state', '/api/user/history', '/api/auth/google/callback?code=secret', '/api/manual/imports/confirm', 'https://bank.example/data', '/icons/icon-192.png?secret=x', '/assets/app.js']) {
    assert.equal(h.fetchResource(path), undefined, path);
  }
  assert.equal(h.fetchResource('/api/auth/login', 'navigate', 'POST'), undefined);
  assert.equal(h.fetchResource('/api/user/state', 'navigate'), undefined);
  assert.equal(h.fetchResource('/', 'navigate', 'POST'), undefined);
  assert.equal(h.writes.length, writes);
});

test('navigation is network-only and failures show public offline HTML, not a saved account', async () => {
  const h = harness(); await h.lifecycle('install'); const writes = h.writes.length;
  const response = await h.fetchResource('/', 'navigate')!;
  assert.equal(await response.text(), 'live document'); assert.equal(h.requests[0].options.cache, 'no-store');
  h.goOffline();
  const offline = await h.fetchResource('/?reset_password=sensitive', 'navigate')!;
  assert.match(await offline.text(), /Você está sem conexão/);
  assert.equal(h.writes.length, writes);
  assert.equal((await h.fetchResource('/icons/icon-192.png')!).status, 200);
});
