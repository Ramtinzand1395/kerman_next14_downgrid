import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.dirname(fileURLToPath(import.meta.url));
const next = path.join(root, 'node_modules/next/dist/bin/next');

// Exercise the real route metadata functions in a production Next.js 14 server.
// Only data access is replaced, so no store database or live API is touched.
async function metadataFrom(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8');
  const ast = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'generateMetadata');
  assert.ok(declaration, `Missing generateMetadata in ${relativePath}`);
  return declaration.getText(ast);
}

function request(port, pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: pathname, headers }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    }).on('error', reject);
  });
}

async function run(args, cwd) {
  const child = spawn(process.execPath, [next, ...args], { cwd, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 0, output);
}

test('production HTTP: real metadata rejects missing records before streaming; redirects preserve URLs', { timeout: 180000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'kerman-seo-http-'));
  let server;
  t.after(async () => {
    if (server && server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  });
  await symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ private: true }));
  await writeFile(path.join(dir, 'next.config.js'), `module.exports = { ...require(${JSON.stringify(path.join(root, 'next.config.js'))}), experimental: { cpus: 1 }, typescript: { ignoreBuildErrors: true } };`);
  await mkdir(path.join(dir, 'app'), { recursive: true });
  await writeFile(path.join(dir, 'app/layout.tsx'), `export default function Layout({children}: any) { return <html><body>{children}</body></html>; }`);
  // Mirror ancestor loading boundaries: reintroducing one must fail the HTTP check.
  async function mirrorLoading(source, destination) {
    try {
      await readFile(path.join(root, source));
      await writeFile(path.join(dir, destination), `export default function Loading() { return <p>Loading</p>; }`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mirrorLoading('app/(public)/loading.tsx', 'app/loading.tsx');
  await writeFile(path.join(dir, 'app/page.tsx'), `export default function Home() { return <p>Home</p>; }`);
  for (const kind of ['product', 'blog']) {
    const routeDir = path.join(dir, 'app', kind, '[slug]');
    await mkdir(routeDir, { recursive: true });
    const metadata = await metadataFrom(`app/(public)/${kind}/[slug]/page.tsx`);
    await mirrorLoading(`app/(public)/${kind}/loading.tsx`, `app/${kind}/loading.tsx`);
    await mirrorLoading(`app/(public)/${kind}/[slug]/loading.tsx`, `app/${kind}/[slug]/loading.tsx`);
    await writeFile(path.join(routeDir, 'page.tsx'), `
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
type Metadata = any; type ProductResponse = any; type Params = Promise<{slug: string}>;
const SITE_URL = 'https://kermanatari.ir';
const stripBlogHtml = (value: any) => value || '';
class ProductNotFoundError extends Error {}
async function getProduct(slug: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 30));
  if (slug === 'service-error') throw new Error('upstream failed');
  if (slug !== 'valid') throw new ProductNotFoundError();
  return { slug, title: 'Valid product', price: 120000, mainImage: 'https://example.com/image.webp', tags: [], status: 'published' };
}
async function getBlog(slug: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 30));
  if (slug === 'service-error') throw new Error('database failed');
  return slug === 'valid' ? { slug, title: 'Valid article', content: 'Article content', tags: [] } : null;
}
${metadata}
export default async function Page({params}: any) {
  const {slug} = await params;
  if (${JSON.stringify(kind)} === 'product') {
    try { await getProduct(slug); }
    catch (error) { if (error instanceof ProductNotFoundError) notFound(); throw error; }
  } else if (!(await getBlog(slug))) notFound();
  return <p>Valid ${kind}</p>;
}
`);
  }
  await run(['build'], dir);
  server = spawn(process.execPath, [next, 'start', '-p', '0', '-H', '127.0.0.1'], { cwd: dir, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server not ready: ${output}`)), 20000);
    const collect = chunk => {
      output += chunk;
      const match = output.match(/127\.0\.0\.1:(\d+)/);
      if (output.includes('Ready') && match) { clearTimeout(timer); resolve(Number(match[1])); }
    };
    server.stdout.on('data', collect); server.stderr.on('data', collect);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  for (const kind of ['product', 'blog']) {
    for (const ua of ['Mozilla/5.0', 'Googlebot/2.1']) {
      const missing = await request(port, `/${kind}/missing`, { 'User-Agent': ua });
      assert.equal(missing.status, 404, `${kind} missing for ${ua}`);
      assert.match(missing.body, /name="robots" content="noindex"/);
    }
    assert.equal((await request(port, `/${kind}/valid`)).status, 200);
    assert.equal((await request(port, `/${kind}/service-error`)).status, 500, 'Upstream errors must not become 404');
  }
  for (const pathname of ['/', '/products?page=2&sort=newest', '/product/%D8%AA%D8%A7%D8%A8%D9%84%D9%88?variant=123', '/api/products?limit=2']) {
    const www = await request(port, pathname, { Host: 'www.kermanatari.ir', 'x-forwarded-proto': 'https' });
    assert.equal(www.status, 308);
    assert.equal(new URL(www.headers.location).href, `https://kermanatari.ir${pathname}`);
  }
  // ArvanCloud terminates TLS before the HTTP-only VPS. Nginx sets this
  // header from its own HTTP connection, even for public HTTPS requests.
  const originResponse = await request(port, '/', { Host: 'kermanatari.ir', 'x-forwarded-proto': 'http' });
  assert.equal(originResponse.status, 200, 'CDN-to-origin HTTP must not loop to public HTTPS');
  assert.equal(originResponse.headers.location, undefined);
  assert.equal((await request(port, '/', { Host: 'kermanatari.ir', 'x-forwarded-proto': 'https' })).status, 200, 'No canonical redirect loop');
  assert.equal((await request(port, '/', { Host: 'localhost' })).status, 200, 'Local development remains accessible');
  assert.equal((await request(port, '/', { Host: 'wwwXkermanatariXir' })).status, 200, 'Host rules require literal dots');
  assert.equal((await request(port, '/', { Host: 'preview.vercel.app', 'x-forwarded-proto': 'http' })).status, 200, 'Preview hosts stay isolated');
});
