import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile, copyFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const root = path.dirname(fileURLToPath(import.meta.url));
const next = path.join(root, 'node_modules/next/dist/bin/next');
function request(port, pathname) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: pathname }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', data => body += data);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

test('production category HTTP serves real routes, metadata, filters and deep links; failures are not soft 404s', { timeout: 180000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'kerman-category-http-'));
  let server;
  t.after(async () => {
    if (server && server.exitCode === null) { const exit = once(server, 'exit'); server.kill('SIGTERM'); await exit; }
    await rm(dir, { recursive: true, force: true });
  });
  for (const part of ['app/category/[slug]', 'app/categories', 'app/components', 'lib/catalog']) await mkdir(path.join(dir, part), { recursive: true });
  await symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  await writeFile(path.join(dir, 'package.json'), '{"private":true}');
  await writeFile(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./*'] }, jsx: 'preserve' } }));
  await writeFile(path.join(dir, 'next.config.js'), 'module.exports = { experimental: { cpus: 1 }, typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } };');
  await writeFile(path.join(dir, 'app/layout.tsx'), 'export const metadata = { metadataBase: new URL("https://kermanatari.ir") }; export default function Layout({children}: any) { return <html lang="fa" dir="rtl"><body>{children}</body></html>; }');
  await writeFile(path.join(dir, 'app/page.tsx'), 'export default function Home() { return <p>Home</p>; }');
  for (const [from,to] of [
    ['app/(public)/category/[slug]/page.tsx','app/category/[slug]/page.tsx'],
    ['app/(public)/categories/page.tsx','app/categories/page.tsx'],
    ['lib/catalog/category-seo.ts','lib/catalog/category-seo.ts'], ['lib/site.ts','lib/site.ts'],
  ]) await copyFile(path.join(root, from), path.join(dir,to));
  await writeFile(path.join(dir, 'app/components/Cart.tsx'), 'import Link from "next/link"; export default function Card({game}: any) { return <article><h2><Link href={`/product/${game.slug}`}>{game.title}</Link></h2></article>; }');
  await writeFile(path.join(dir, 'lib/catalog/category-data.ts'), `
export const PAGE_SIZE = 12;
export async function getCategoryCatalog() { return [
  { _id: 'root', slug: 'accessories', name: 'لوازم جانبی', parent: null, productCount: 13 },
  { _id: 'art', slug: 'gaming-wall-art', name: 'تابلو گیمینگ', parent: 'root', productCount: 13 },
  { _id: 'deep', slug: 'tekken', name: 'تیکن', parent: 'art', productCount: 1 },
  { _id: 'empty', slug: 'empty', name: 'خالی', parent: null, productCount: 0 },
]; }
export async function getCategoryProducts(id: string, rows: any, query: any) {
  if (query.q === 'service-error') throw new Error('controlled backend failure');
  const total = id === 'empty' || query.q === 'no-results' ? 0 : 13;
  return { total, tags: [{ _id: 'tag', slug: 'tekken', name: 'تیکن', count: 1 }], products: total ? [{ _id: 'product', slug: 'existing-product-slug', title: 'تابلو تیکن' }] : [] };
}`);
  const build = spawn(process.execPath, [next, 'build'], { cwd: dir, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] });
  let output = ''; build.stdout.on('data', data => output += data); build.stderr.on('data', data => output += data);
  const [code] = await once(build, 'exit'); assert.equal(code, 0, output);
  server = spawn(process.execPath, [next, 'start', '-p', '0'], { cwd: dir, stdio: ['ignore','pipe','pipe'] });
  const port = await new Promise((resolve,reject) => {
    let text = ''; const timeout = setTimeout(() => reject(new Error('server timeout')), 20000);
    server.stdout.on('data', data => { text += data; const match = text.match(/localhost:(\d+)/); if (match) { clearTimeout(timeout); resolve(Number(match[1])); } });
    server.on('error', reject);
  });
  const hub = await request(port, '/categories');
  assert.equal(hub.status, 200); assert.match(hub.body, /href="\/category\/tekken"/);
  const valid = await request(port, '/category/gaming-wall-art');
  assert.equal(valid.status, 200); assert.match(valid.body, /href="\/product\/existing-product-slug"/); assert.match(valid.body, /<h1[^>]*>خرید /);
  assert.match(valid.body, /rel="canonical" href="https:\/\/kermanatari.ir\/category\/gaming-wall-art"/);
  const second = await request(port, '/category/gaming-wall-art?page=2');
  assert.equal(second.status, 200); assert.match(second.body, /rel="canonical" href="https:\/\/kermanatari.ir\/category\/gaming-wall-art\?page=2"/);
  const filtered = await request(port, '/category/gaming-wall-art?tag=tekken&inStock=1&sort=lowPrice');
  assert.equal(filtered.status, 200); assert.match(filtered.body, /content="noindex, follow"/);
  assert.match(filtered.body, /href="\/category\/gaming-wall-art\?tag=tekken&amp;sort=lowPrice&amp;inStock=1&amp;page=2"/);
  assert.match((await request(port, '/category/empty')).body, /content="noindex, follow"/);
  assert.equal((await request(port, '/category/not-real')).status, 404);
  assert.equal((await request(port, '/category/gaming-wall-art?page=3')).status, 404);
  assert.equal((await request(port, '/category/gaming-wall-art?q=service-error')).status, 500);
  const redirect = await request(port, '/category/gaming-wall-art?category=accessories');
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.location, '/category/gaming-wall-art');
});
