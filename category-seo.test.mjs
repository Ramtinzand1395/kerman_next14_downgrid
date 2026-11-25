import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function load(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}
const seo = await load('./lib/catalog/category-seo.ts');
const usedConsole = await load('./lib/used-console.ts');
const rows = [
  { _id: '111111111111111111111111', name: 'لوازم جانبی', slug: 'accessories', parent: null },
  { _id: '222222222222222222222222', name: 'تابلو گیمینگ', slug: 'gaming-wall-art', parent: '111111111111111111111111' },
  { _id: '333333333333333333333333', name: 'طرح تیکن', slug: 'تابلو-تیکن', parent: '222222222222222222222222' },
  { _id: '444444444444444444444444', name: 'خالی', slug: 'empty', parent: null },
];
test('arbitrary depth counts and breadcrumbs; unsafe/cyclic/orphan categories cannot become index pages', () => {
  const entries = seo.buildCategoryEntries([...rows,
    { _id: 'x', name: 'cycle', slug: 'cycle', parent: 'x' },
    { _id: 'y', name: 'orphan', slug: 'orphan', parent: 'missing' },
    { _id: 'z', name: 'unsafe', slug: '../bad', parent: null },
    { _id: 'w', name: 'empty slug', slug: '', parent: null },
  ], [{ _id: rows[0]._id, count: 1 }, { _id: rows[2]._id, count: 3 }]);
  assert.deepEqual(entries.map(row => row.productCount), [4, 3, 3, 0]);
  assert.deepEqual(seo.descendantIds(rows[0]._id, entries), rows.slice(0,3).map(row => row._id));
  assert.deepEqual(seo.categoryAncestors(rows[2], entries).map(row => row.slug), ['accessories', 'gaming-wall-art']);
  for (const slug of ['%ZZ', '%2Fetc', '.', '..', 'a?b', '\ud800']) assert.equal(seo.decodeCategorySlug(slug), null);
  assert.equal(seo.decodeCategorySlug(encodeURIComponent('تابلو-تیکن')), 'تابلو-تیکن');
});
test('filters cannot override category; pagination has its own canonical and filters canonicalize to base', () => {
  const q = seo.parseCatalogQuery({ page: '2', category: 'other' });
  assert.equal(seo.categoryCanonical(rows[1], q), '/category/gaming-wall-art?page=2');
  assert.equal(seo.hasCatalogFilters(q), false);
  assert.equal(seo.categoryCanonical(rows[1], { ...q, tag: 'tekken' }), '/category/gaming-wall-art');
  assert.equal(seo.parseCatalogQuery({ page: '2x', q: ['one','two'], sort: '$where' }).page, 1);
  assert.equal(seo.parseCatalogQuery({ page: '999999999999999999999' }).page, 1);
  assert.equal(seo.catalogQueryString({ ...q, q: 'قاب & طرح' }), 'q=%D9%82%D8%A7%D8%A8+%26+%D8%B7%D8%B1%D8%AD&page=2');
});
test('legacy category names, encoded labels and IDs resolve to one current slug without accepting paths', () => {
  for (const value of ['Gaming Wall Art', 'GAMING-WALL-ART', 'تابلو گیمینگ', rows[1]._id, 'Gaming%20Wall%20Art', 'Gaming%2520Wall%2520Art']) {
    assert.equal(seo.resolveLegacyCategory(value, rows)?.slug, 'gaming-wall-art', value);
  }
  for (const value of ['../gaming-wall-art', 'https://example.com', '%ZZ', '%2Fgaming-wall-art', ['gaming-wall-art'], null]) {
    assert.equal(seo.resolveLegacyCategory(value, rows), null);
  }
});
test('SEO overrides are optional and Persian family-specific guides are available', () => {
  assert.match(seo.categoryContent(rows[1], [rows[0]]).guide, /شاسی/);
  const custom = seo.categoryContent({ ...rows[1], seoTitle: 'عنوان دلخواه', introduction: 'معرفی' }, [rows[0]]);
  assert.equal(custom.title, 'عنوان دلخواه');
  assert.equal(custom.intro, 'معرفی');
});
test('real page metadata/render preserve product URLs, links and escaped JSON-LD; invalid/out-of-range category 404', async () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  let fail = false;
  const entries = seo.buildCategoryEntries(rows, [{ _id: rows[1]._id, count: 13 }]);
  const page = await load('./app/(public)/category/[slug]/page.tsx', {
    react: { ...require('react'), cache: fn => fn },
    '@/app/components/navigation/NavigationFeedback': ({ href, children, ...props }) => require('react').createElement('a', { href, ...props }, children),
    'next/navigation': { notFound: () => { throw new Error('404'); }, permanentRedirect: value => { throw new Error('308 ' + value); } },
    '../../components/Cart': ({ game }) => require('react').createElement('a', { href: `/product/${game.slug}` }, game.title),
    '@/lib/site': { toAbsoluteUrl: path => `https://kermanatari.ir${path}` },
    '@/lib/catalog/category-seo': seo,
    '@/lib/catalog/category-data': { PAGE_SIZE: 12, getCategoryCatalog: async () => entries, getCategoryProducts: async (id, _, query) => { if (fail) throw new Error('service unavailable'); return { total: id === rows[3]._id ? 0 : 13, tags: [], products: [{ _id: 'product', slug: 'existing-product-url', title: '</script><script>bad</script>' }] }; } },
  });
  const props = { params: { slug: 'gaming-wall-art' }, searchParams: {} };
  const meta = await page.generateMetadata(props);
  assert.equal(meta.robots.index, true);
  assert.equal((await page.generateMetadata({ ...props, searchParams: { tag: 'tekken' } })).robots.index, false);
  assert.equal((await page.generateMetadata({ ...props, params: { slug: 'empty' } })).robots.index, false);
  assert.equal((await page.generateMetadata({ ...props, searchParams: { page: '2' } })).alternates.canonical, '/category/gaming-wall-art?page=2');
  const html = renderToStaticMarkup(await page.default(props));
  assert.ok(html.includes('/product/existing-product-url'));
  assert.ok(html.includes('href="/category/gaming-wall-art?page=2"'));
  assert.ok(html.includes('href="/category/accessories"'));
  assert.ok(!html.includes('</script><script>bad'));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.mainEntity.itemListElement[0].url, 'https://kermanatari.ir/product/existing-product-url');
  await assert.rejects(page.generateMetadata({ ...props, params: { slug: 'does-not-exist' } }), /404/);
  await assert.rejects(page.generateMetadata({ ...props, searchParams: { page: '3' } }), /404/);
  fail = true;
  await assert.rejects(page.generateMetadata(props), /service unavailable/);
});
test('SEO update accepts bounded text and rejects URL/hierarchy/product modifications', async () => {
  const { categorySeoInput } = await load('./lib/catalog/category-input.ts');
  assert.ok(categorySeoInput.safeParse({ seoTitle: 'عنوان', faqs: [] }).success);
  for (const body of [{ slug: 'new-url' }, { parent: 'new-parent' }, { seoTitle: 'a'.repeat(101) }, { faqs: [{ question: '', answer: 'x' }] }]) assert.equal(categorySeoInput.safeParse(body).success, false);
});

test('real query service scopes to published descendants, escapes text, ignores inactive variants and paginates after filters', async () => {
  const pipelines = [];
  const mongoose = require('mongoose');
  const product = {
    aggregate: async pipeline => { pipelines.push(pipeline); return pipeline.some(stage => stage.$facet) ? [{ products: [], count: [{ total: 2 }] }] : []; },
    populate: async docs => docs,
  };
  const data = await load('./lib/catalog/category-data.ts', {
    react: { ...require('react'), cache: fn => fn },
    '@/lib/mongodb': async () => {}, '@/model/Product': product, '@/model/Category': {}, '@/model/Comment': {},
    '@/model/Tag': { collection: { name: 'tags' }, findOne: () => ({ select: () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId('555555555555555555555555') }) }) }) },
    './category-seo': seo, '@/lib/used-console': usedConsole,
  });
  await data.getCategoryProducts(rows[0]._id, rows, { page: 2, q: '.*', tag: 'tekken', sort: 'lowPrice', inStock: true });
  const pipeline = pipelines.find(p => p.some(stage => stage.$facet));
  assert.equal(pipeline[0].$match.status, 'published');
  assert.equal(pipeline[0].$match.deletedAt, null);
  assert.deepEqual(pipeline[0].$match.category.$in.map(String), rows.slice(0,3).map(row => row._id));
  assert.equal(pipeline[0].$match.$or[0].title.$regex, '\\.\\*');
  assert.ok(pipeline.find(stage => stage.$match?._listingStock?.$gt === 0));
  const facet = pipeline.find(stage => stage.$facet).$facet;
  assert.deepEqual(facet.products.slice(0,3), [{ $sort: { _listingPrice: 1, _id: -1 } }, { $skip: 12 }, { $limit: 12 }]);
  assert.deepEqual(data.listingStages()[0].$set._activeVariants.$filter.cond, { $ne: ['$$variant.isActive', false] });
  assert.deepEqual(data.listingStages()[1].$set._listingPrice.$cond[1].$min.$map.in, { $ifNull: ['$$variant.discountPrice', '$$variant.price'] });
  assert.deepEqual(data.listingStages()[1].$set._listingStock.$cond[1], { $sum: '$_activeVariants.stock' });
});

test('admin SEO endpoint checks role, validates whitelist and changes only the requested category SEO', async () => {
  const { categorySeoInput } = await load('./lib/catalog/category-input.ts');
  let role = null, writes = [];
  const route = await load('./app/api/admin/category/[id]/route.ts', {
    '@/lib/catalog/category-input': { categorySeoInput },
    'next-auth': { getServerSession: async () => role ? { user: { role } } : null },
    '@/app/api/auth/[...nextauth]/options': { authOptions: {} }, '@/lib/mongodb': async () => {},
    '@/model/Category': { findByIdAndUpdate: (...args) => { writes.push(args); return { lean: async () => ({ _id: rows[1]._id }) }; } },
    '@/model/Product': {}, '@/model/Loyalty Club/Coupon': {}, '@/model/Loyalty Club/CashbackRule': {},
  });
  const call = body => route.PUT(new Request('https://example.test', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { params: { id: rows[1]._id } });
  assert.equal((await call({})).status, 401);
  role = 'user'; assert.equal((await call({})).status, 403);
  role = 'superadmin'; assert.equal((await call({ slug: 'changed' })).status, 400);
  assert.equal(writes.length, 0);
  assert.equal((await call({ seoTitle: 'عنوان', introduction: 'معرفی' })).status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], rows[1]._id);
  assert.ok(!('slug' in writes[0][1].$set));
});

test('products use one listing for metadata and render, reject missing pages and apply the stock filter', async () => {
  const calls = { count: 0, list: 0 };
  const stockFilters = [];
  let total = 13;
  const listing = {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => [],
  };
  const route = await load('./app/api/products/all_products/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/mongodb': async () => {},
    '@/model/Product': {
      countDocuments: async filter => { calls.count++; stockFilters.push(filter); return total; },
      aggregate: async stages => { if (stages.some(stage => stage.$skip !== undefined)) calls.list++; return []; },
      find: () => { calls.list++; return listing; },
    },
    '@/model/Comment': { collection: { name: 'comments' } },
    '@/model/Tag': { collection: { name: 'tags' } },
    '@/model/Category': { collection: { name: 'categories' } },
  });
  const component = () => null;
  const react = require('react');
  const page = await load('./app/(public)/products/page.tsx', {
    react: {
      ...react,
      cache(fn) {
        const responses = new Map();
        return key => {
          if (!responses.has(key)) responses.set(key, fn(key));
          return responses.get(key);
        };
      },
    },
    'next/navigation': { notFound: () => { throw new Error('404'); } },
    '@/app/api/products/all_products/route': route,
    '@/app/components/navigation/NavigationFeedback': component,
    '@/lib/catalog/category-data': {},
    '@/lib/catalog/category-seo': seo,
    '@/lib/site': { SITE_URL: 'https://kermanatari.ir', toAbsoluteUrl: path => 'https://kermanatari.ir' + path },
    '../constants/categories': { categories: [] },
    '../components/Cart': component,
    './components/FilterProducts': component,
    './components/Pagination': component,
    './components/SortProducts': component,
    './components/ProductsSearch': component,
    './components/ProductArtSlider': component,
    './components/ProductNavigation': { ProductResults: component, ProductNavigationLink: component, ProductNavigationProvider: component },
  });
  const searchParams = { page: '2', sort: 'newest' };
  const metadata = await page.generateMetadata({ searchParams });
  await page.default({ searchParams: { ...searchParams } });
  assert.equal(metadata.alternates.canonical, '/products?page=2');
  assert.deepEqual(calls, { count: 1, list: 1 });
  await assert.rejects(page.generateMetadata({ searchParams: { page: '100' } }), /404/);
  assert.deepEqual(calls, { count: 2, list: 1 });
  for (const sort of ['bestSeller', 'highestDiscount']) {
    const alternative = await page.generateMetadata({ searchParams: { sort, page: '2' } });
    assert.deepEqual(alternative.robots, { index: false, follow: true });
    assert.equal(alternative.alternates.canonical, '/products');
  }
  total = 1;
  await assert.rejects(page.generateMetadata({ searchParams: { page: '2', inStock: '1', q: 'PS5' } }), /404/);
  const stockFilter = stockFilters.at(-1);
  assert.equal(stockFilter.$or.length, 3);
  assert.deepEqual(stockFilter.$and[0].$or, [
    { productType: 'multi', variants: { $elemMatch: { isActive: { $ne: false }, stock: { $gt: 0 } } } },
    { productType: { $ne: 'multi' }, stock: { $gt: 0 } },
  ]);
  for (const page of ['0', '-1', '9007199254740992']) {
    assert.equal((await route.GET(new Request('http://localhost/api/products/all_products?page=' + page))).status, 404);
  }
  total = 0;
  assert.equal((await route.GET(new Request('http://localhost/api/products/all_products'))).status, 200);
});

test('used-console sitemap eligibility matches the listing and tracking URLs keep their canonical', async () => {
  const generation = { ...rows[0], slug: 'playstation-5' };
  const child = { ...rows[1], parent: generation._id };
  const catalog = [generation, child];
  let existsFilter;
  let listingFilter;
  const data = await load('./lib/catalog/category-data.ts', {
    react: { ...require('react'), cache: fn => fn },
    '@/lib/mongodb': async () => {},
    '@/lib/used-console': usedConsole,
    '@/model/Product': {
      exists: async filter => { existsFilter = filter; return { _id: 'eligible' }; },
      aggregate: async stages => {
        if (!stages.some(stage => stage.$facet)) return [];
        listingFilter = stages[0].$match;
        return [{ products: [], count: [{ total: 13 }] }];
      },
      populate: async () => {},
    },
    '@/model/Category': {},
    '@/model/Comment': {},
    '@/model/Tag': { collection: { name: 'tags' } },
    './category-seo': seo,
  });
  const component = () => null;
  const page = await load('./app/(public)/used-consoles/page.tsx', {
    react: { ...require('react'), cache: fn => fn },
    '@/app/components/navigation/NavigationFeedback': component,
    '@/app/components/ProductImage': component,
    '../components/Cart': component,
    '@/lib/catalog/category-data': { ...data, getCategoryCatalog: async () => catalog },
    '@/lib/catalog/category-seo': seo,
    '@/lib/used-console': usedConsole,
    '@/lib/site': { toAbsoluteUrl: path => 'https://kermanatari.ir' + path },
  });
  assert.equal(await data.hasUsedConsoleProducts(catalog), true);
  const tracking = { utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'launch', gclid: '1', fbclid: '2' };
  const meta = await page.generateMetadata({ searchParams: { page: '2', ...tracking } });
  assert.equal(meta.alternates.canonical, '/used-consoles?page=2');
  assert.deepEqual(meta.robots, { index: true, follow: true });
  assert.deepEqual(existsFilter, listingFilter);
  assert.deepEqual(existsFilter.category.$in.map(String), [generation._id]);
  assert.equal(existsFilter.productType, 'single');
  assert.deepEqual(existsFilter.isDigital, { $ne: true });
  assert.deepEqual(existsFilter.isOnlineGame, { $ne: true });
  const filter = await page.generateMetadata({ searchParams: { inStock: '1', ...tracking } });
  assert.equal(filter.alternates.canonical, '/used-consoles');
  assert.deepEqual(filter.robots, { index: false, follow: true });
});
