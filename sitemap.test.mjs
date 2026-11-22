import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { resolveRouteData } = require('next/dist/build/webpack/loaders/metadata/resolve-route-data.js');
const source = await readFile(new URL('./app/sitemap.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
}}).outputText;

function loadSitemap({ blogs = [], products = [], connectionError, blogError, categories = [] } = {}) {
  const queries = [];
  const model = (kind, rows, error) => ({ find(filter, projection) {
    queries.push({ kind, filter, projection });
    const query = {
      lean() { return query; },
      async exec() {
        if (error) throw error;
        return rows.filter(row => Object.entries(filter).every(([key, value]) =>
          value === null ? row[key] == null : row[key] === value));
      },
    };
    return query;
  }});
  const dependencies = {
    '@/lib/mongodb': async () => { if (connectionError) throw connectionError; },
    '@/model/Product': model('products', products),
    '@/model/Blog': model('blogs', blogs, blogError),
    '@/lib/site': { SITE_URL: 'https://kermanatari.ir' },
    '@/lib/catalog/category-data': { getCategoryCatalog: async () => categories },
    '@/lib/catalog/category-seo': {
      categoryHref: slug => `/category/${encodeURIComponent(slug)}`,
      descendantIds: (id, rows) => {
        const ids = new Set([id]);
        const queue = [id];
        for (let i = 0; i < queue.length; i++) {
          for (const row of rows) {
            if (row.parent === queue[i] && !ids.has(row._id)) {
              ids.add(row._id);
              queue.push(row._id);
            }
          }
        }
        return [...ids];
      },
    },
    '@/lib/used-console': {
      isConsoleGeneration: slug => ['playstation-2', 'playstation-3', 'playstation-4', 'playstation-5'].includes(slug),
    },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return { ...module.exports, queries };
}

test('sitemap keeps static/product pages and includes only published, non-deleted articles', async () => {
  const sitemap = loadSitemap({
    products: [{ slug: 'valid-product', status: 'published' }, { slug: 'draft-product', status: 'draft' }],
    blogs: [{ slug: 'published', published: true }, { slug: 'draft', published: false },
      { slug: 'removed', published: true, deletedAt: new Date() }, { slug: ' ', published: true }],
  });
  assert.equal(sitemap.dynamic, 'force-dynamic');
  const entries = await sitemap.default();
  const urls = entries.map(entry => entry.url);
  assert.ok(urls.includes('https://kermanatari.ir/blog'));
  assert.ok(urls.includes('https://kermanatari.ir/product/valid-product'));
  assert.ok(urls.includes('https://kermanatari.ir/blog/published'));
  assert.ok(!urls.some(url => /draft|removed/.test(url)));
  assert.deepEqual(sitemap.queries.find(query => query.kind === 'blogs').filter, { published: true, deletedAt: null });
  assert.equal(new Set(urls).size, urls.length);
});

test('Persian and encoded legacy slugs deduplicate with accurate lastmod and valid XML', async () => {
  const slug = 'راهنمای-تابلو';
  const sitemap = loadSitemap({ blogs: [
    { slug, published: true, updatedAt: '2026-10-01' },
    { slug: encodeURIComponent(slug), published: true, updatedAt: '2026-10-29' },
    { slug: encodeURIComponent(encodeURIComponent(slug)), published: true, updatedAt: '2026-10-02' },
    { slug: 'a&b', published: true, updatedAt: 'invalid', publishedAt: '2026-10-15' },
    { slug: 'no-date', published: true },
    { slug: '../bad', published: true }, { slug: '%2Fbad', published: true },
    { slug: null, published: true }, { slug: '..', published: true },
  ] });
  const entries = await sitemap.default();
  const articles = entries.filter(entry => entry.url.includes('/blog/'));
  assert.equal(articles.length, 3);
  assert.equal(articles[0].url, `https://kermanatari.ir/blog/${encodeURIComponent(slug)}`);
  assert.equal(articles[0].lastModified.toISOString(), '2026-10-29T00:00:00.000Z');
  assert.equal(articles[1].lastModified.toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(articles[2].lastModified, undefined);
  const xml = resolveRouteData(entries, 'sitemap');
  assert.match(xml, /<urlset/);
  assert.ok(xml.includes(`<loc>${articles[0].url}</loc>`));
  assert.ok(xml.includes('/blog/a%26b'));
  assert.ok(!xml.includes('Invalid Date'));
});

test('sitemap encodes legacy product slugs as single URL segments', async () => {
  const sitemap = loadSitemap({ products: [
    { slug: 'Dragon Katana & Red Moon', status: 'published' },
  ] });
  const entries = await sitemap.default();
  const xml = resolveRouteData(entries, 'sitemap');
  assert.ok(xml.includes('<loc>https://kermanatari.ir/product/Dragon%20Katana%20%26%20Red%20Moon</loc>'));
});

test('a new request reflects publishing, unpublishing and physical deletion', async () => {
  const blogs = [{ slug: 'first', published: true }, { slug: 'second', published: false }];
  const sitemap = loadSitemap({ blogs });
  const articleUrls = async () => (await sitemap.default()).filter(entry => entry.url.includes('/blog/')).map(entry => entry.url);
  assert.deepEqual(await articleUrls(), ['https://kermanatari.ir/blog/first']);
  blogs[0].published = false; blogs[1].published = true;
  assert.deepEqual(await articleUrls(), ['https://kermanatari.ir/blog/second']);
  blogs.splice(0);
  assert.deepEqual(await articleUrls(), []);
});

test('database failures reject instead of returning an incomplete successful sitemap', async () => {
  await assert.rejects(loadSitemap({ connectionError: new Error('offline') }).default(), /offline/);
  await assert.rejects(loadSitemap({ blogError: new Error('query failed') }).default(), /query failed/);
});

test('all populated categories and subcategories enter sitemap; empty categories remain accessible outside sitemap', async () => {
  const entries = await loadSitemap({ categories: [
    { slug: 'accessories', productCount: 4 }, { slug: 'تابلو-تیکن', productCount: 2 }, { slug: 'empty', productCount: 0 },
  ] }).default();
  assert.ok(entries.some(row => row.url === 'https://kermanatari.ir/categories'));
  assert.ok(entries.some(row => row.url === 'https://kermanatari.ir/category/accessories'));
  assert.ok(entries.some(row => row.url.endsWith('/category/' + encodeURIComponent('تابلو-تیکن'))));
  assert.ok(!entries.some(row => row.url.endsWith('/category/empty')));
});


test('used PlayStation hub appears in sitemap only for published used devices in PS2–PS5 categories', async () => {
  const categories = [
    { _id: 'ps5-id', slug: 'playstation-5', parent: null, productCount: 3 },
    { _id: 'ps5-slim-id', slug: 'ps5-slim', parent: 'ps5-id', productCount: 1 },
    { _id: 'accessories-id', slug: 'accessories', parent: null, productCount: 2 },
  ];
  const products = [
    { slug: 'used-ps5', status: 'published', condition: 'used', category: 'ps5-slim-id' },
    { slug: 'used-controller', status: 'published', condition: 'used', category: 'accessories-id' },
    { slug: 'draft-ps5', status: 'draft', condition: 'used', category: 'ps5-id' },
  ];
  const sitemap = loadSitemap({ products, categories });
  const urls = (await sitemap.default()).map(entry => entry.url);
  assert.ok(urls.includes('https://kermanatari.ir/used-consoles'));
  assert.ok(urls.includes('https://kermanatari.ir/product/used-ps5'));
  assert.ok(!urls.includes('https://kermanatari.ir/product/draft-ps5'));
  assert.equal(urls.filter(url => url.endsWith('/used-consoles')).length, 1);
  const xml = resolveRouteData(await sitemap.default(), 'sitemap');
  assert.ok(xml.includes('<loc>https://kermanatari.ir/used-consoles</loc>'));

  products[0].status = 'draft';
  assert.ok(!(await sitemap.default()).some(entry => entry.url.endsWith('/used-consoles')));
  products[0].status = 'published';
  products[0].condition = 'new';
  assert.ok(!(await sitemap.default()).some(entry => entry.url.endsWith('/used-consoles')));
  products[0].condition = 'used';
  products[0].deletedAt = new Date();
  assert.ok(!(await sitemap.default()).some(entry => entry.url.endsWith('/used-consoles')));
});

test('used controller alone does not create an empty PS2–PS5 collection sitemap URL', async () => {
  const categories = [{ _id: 'accessories-id', slug: 'accessories', parent: null, productCount: 1 }];
  const products = [{ slug: 'used-controller', status: 'published', condition: 'used', category: 'accessories-id' }];
  const urls = (await loadSitemap({ products, categories }).default()).map(row => row.url);
  assert.ok(!urls.includes('https://kermanatari.ir/used-consoles'));
});
