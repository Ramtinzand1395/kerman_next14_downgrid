import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as merchantSchema from './lib/merchantSchema.ts';

const require = createRequire(import.meta.url);
const siteUrl = 'https://kermanatari.ir';
const shipping = {
  localDelivery: { enabled: true, feeToman: 150000 },
  nationalCollect: { enabled: true, description: 'پس‌کرایه؛ هزینه بر عهده مشتری' },
  tipax: { enabled: false }, postPishtaz: { enabled: false },
};
const product = {
  _id: 'product-id', slug: 'poster', title: 'تابلو', mainImage: '/image.webp',
  price: 200000, stock: 2, images: [], specifications: [], comments: [],
  category: { name: 'تابلو گیمینگ' }, tags: [], variants: [],
};

async function loadPage(file, value = product) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const stub = () => null;
  const genericModule = new Proxy({ __esModule: true, default: stub }, { get: (target, key) => key in target ? target[key] : stub });
  const dependencies = {
    'react': { cache: fn => fn },
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@/lib/merchantSchema': merchantSchema,
    '@/lib/site': { SITE_URL: siteUrl, toAbsoluteUrl: path => siteUrl + path },
    '@/lib/shippingSettings': { getStoreShippingSettings: async () => shipping },
    '@/lib/currency': { tomanToIrr: amount => amount * 10 },
    '@/lib/shipping': { formatLocalShippingPolicyText: amount => `کرمان: ${amount}` },
    '@/lib/relatedProducts': { getRelatedProducts: async () => ({ relatedProducts: [] }) },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', compiled)(
    name => dependencies[name] || genericModule, module, module.exports,
    async () => ({ ok: true, status: 200, json: async () => value }),
  );
  return module.exports.default;
}

function jsonLd(element) {
  const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
  const script = children.find(child => child?.type === 'script' && child.props.type === 'application/ld+json');
  assert.ok(script, 'Page emits JSON-LD');
  return JSON.parse(script.props.dangerouslySetInnerHTML.__html);
}

test('category is plain Text; malformed identifiers/objects are omitted', () => {
  assert.equal(merchantSchema.normalizeProductCategory({ name: '  تابلو   گیمینگ  ' }), 'تابلو گیمینگ');
  assert.equal(merchantSchema.normalizeProductCategory('<b>Gaming</b> Wall Art'), 'Gaming Wall Art');
  for (const value of [null, {}, { name: 42 }, '6ad6683ee7f8835eb339716f', '123', '', 'https://example.com', 'a'.repeat(751)]) {
    assert.equal(merchantSchema.normalizeProductCategory(value), undefined);
  }
});

test('actual product offers link to the return policy defined on the actual terms page', async () => {
  const Terms = await loadPage('./app/(public)/terms/page.tsx');
  const graph = jsonLd(await Terms())['@graph'];
  const organization = graph.find(node => node['@type'] === 'Organization');
  assert.equal(organization['@id'], `${siteUrl}/#organization`);
  const policy = organization.hasMerchantReturnPolicy;
  assert.equal(policy.merchantReturnLink, `${siteUrl}/terms#returns`);
  assert.equal(policy['@type'], 'MerchantReturnPolicy');
  assert.ok(!('merchantReturnDays' in policy));
  assert.ok(!('returnPolicyCategory' in policy));
  for (const value of [product, { ...product, productType: 'multi', variants: [
    { _id: 'a', price: 200000, stock: 1 }, { _id: 'b', price: 400000, stock: 1 },
  ] }]) {
    const Page = await loadPage('./app/(public)/product/[slug]/page.tsx', value);
    const data = jsonLd(await Page({ params: { slug: value.slug } }));
    assert.equal(data.category, 'تابلو گیمینگ');
    assert.equal(data.offers.hasMerchantReturnPolicy['@id'], policy['@id']);
    assert.equal(data.offers.seller['@id'], organization['@id']);
    assert.equal(data.offers.priceCurrency, 'IRR');
    assert.equal(data.offers.price ?? data.offers.lowPrice, 2000000);
    // Unknown carrier rate/time must not turn into free or nationwide fixed shipping.
    assert.ok(!('shippingDetails' in data.offers));
  }
});
