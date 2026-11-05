import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { gameInput, gameUpdateInput, isGameCoverUrl } from './lib/game-list-validation.ts';
const require = createRequire(import.meta.url);
const base = { platform: 'ps5', name: 'ASTRO BOT', size: 0, price: 0, storage: '' };
const url = 'https://res.cloudinary.com/aeylqy7h/image/upload/v1/game.webp';

test('game validation preserves zero values and restricts uploads to the game account', () => {
  assert.equal(gameInput.parse({...base, platform: 'PS5COPY'}).platform, 'ps5Copy');
  assert.equal(gameInput.parse(base).price, 0);
  assert.equal(gameInput.parse(base).size, 0);
  assert.ok(isGameCoverUrl(url));
  for (const invalid of ['https://example.org/x.webp', 'https://res.cloudinary.com/old/image/upload/a.webp', 'https://res.cloudinary.com/aeylqy7h/video/upload/a.mp4', 'javascript:alert(1)', url+'?x=1']) assert.equal(isGameCoverUrl(invalid), false);
  for (const invalid of [{name:''},{platform:'invalid'},{price:-1},{price:1.5},{size:Infinity},{imageUrl:'https://example.com/image.png'}]) assert.equal(gameInput.safeParse({...base,...invalid}).success, false);
});

function loadRoute(path, overrides = {}) {
  const writes = [];
  const items = [{ _id: 'a'.repeat(24), ...base, imageUrl: url, imageAlt: 'کاور' }];
  items.id = id => items.find(i => i._id === id);
  const model = {
    findOne: () => ({ lean: async () => ({items}) }),
    findOneAndUpdate: async (...args) => {writes.push(args); return {items};},
    updateOne: async (...args) => {writes.push(args); return {modifiedCount:1};},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const deps = {
    'next/server': {NextResponse:{json:(data,init={})=>({data,status:init.status||200})}},
    'next-auth': {getServerSession:async()=>({user:{role:'admin'}})},
    '@/app/api/auth/[...nextauth]/options': {authOptions:{}},
    '@/lib/mongodb': {default:async()=>{}},
    '@/model/GameList': {default:model},
    '@/lib/game-cloudinary': {uploadGameCover:async()=>({url,publicId:'test'})},
    '@/lib/game-list-validation': {gameInput,gameUpdateInput,gameItemId:require('zod').z.string().regex(/^[a-f\d]{24}$/i),gamePlatform:gameInput.shape.platform},
    ...overrides,
  };
  new Function('require','module','exports',code)(n=>deps[n]??require(n),module,module.exports);
  return {route:module.exports,writes};
}
const routePath = './app/api/admin/store-order/game-list/route.ts';
const request = body => ({json:async()=>body});
test('all admin CRUD methods reject unauthorized requests before database writes', async()=>{
  const {route,writes}=loadRoute(routePath,{'next-auth':{getServerSession:async()=>null}});
  for (const method of ['GET','POST','PUT','DELETE']) assert.equal((await route[method](request(base))).status,403);
  assert.equal(writes.length,0);
});
test('create persists a cover; older clients preserve it on edit; explicit clear resets all cover metadata',async()=>{
  const {route,writes}=loadRoute(routePath);
  assert.equal((await route.POST(request({...base,imageUrl:url,imageAlt:'کاور'}))).status,201);
  assert.equal(writes[0][1].$push.items.imageUrl,url);
  await route.PUT(request({...base,itemId:'a'.repeat(24)}));
  assert.equal(Object.hasOwn(writes[1][1].$set,'items.$.imageUrl'),false);
  await route.PUT(request({...base,itemId:'a'.repeat(24),imageUrl:''}));
  assert.equal(writes[2][1].$set['items.$.imageAlt'],'');
  assert.equal(writes[2][1].$set['items.$.imagePublicId'],'');
  assert.equal(writes[2][1].$set['items.$.price'],0);
});
test('bad IDs and invalid images return 400, missing delete returns 404',async()=>{
  const {route,writes}=loadRoute(routePath);
  assert.equal((await route.PUT(request({...base,itemId:'bad'}))).status,400);
  assert.equal((await route.POST(request({...base,imageUrl:'https://evil.example/a.webp'}))).status,400);
  assert.equal(writes.length,0);
  const missing=loadRoute(routePath,{'@/model/GameList':{default:{updateOne:async()=>({modifiedCount:0})}}});
  assert.equal((await missing.route.DELETE(request({platform:'ps5',itemId:'a'.repeat(24)}))).status,404);
});
test('cover upload is authenticated and reports missing dedicated credentials',async()=>{
  const path='./app/api/admin/store-order/game-list/cover/route.ts';
  const blocked=loadRoute(path,{'next-auth':{getServerSession:async()=>null}});
  assert.equal((await blocked.route.POST({})).status,403);
  const {route}=loadRoute(path,{'@/lib/game-cloudinary':{uploadGameCover:async()=>{throw new Error('GAME_CLOUDINARY_NOT_CONFIGURED');}}});
  const file=new File([new Uint8Array([1,2])],'a.webp',{type:'image/webp'});
  const uploadRequest={headers:new Headers(),formData:async()=>new Map([['file',file]])};
  assert.equal((await route.POST(uploadRequest)).status,503);
  const success=loadRoute(path);
  assert.equal((await success.route.POST(uploadRequest)).status,201);
});

test('migration preserves counts and identities, and refuses stale edits or price changes',async()=>{
  const {buildGameListUpdate}=await import('./lib/gamelist-migration.mjs');
  const doc={platform:'ps5',items:[{_id:'a',name:'old',price:12},{_id:'b',name:'other'}]};
  const entries=[{id:'a',before:{name:'old'},after:{name:'new',imageUrl:url}}];
  const operation=buildGameListUpdate(doc,entries);
  assert.equal(operation.update.$set['items.0.name'],'new');
  assert.deepEqual(operation.filter.$expr,{$eq:[{$size:'$items'},2]});
  assert.equal(operation.filter['items.0._id'],'a');
  assert.deepEqual(operation.filter['items.0.imageUrl'],{$exists:false});
  assert.equal(doc.items.length,2);
  assert.equal(doc.items[0].price,12);
  assert.throws(()=>buildGameListUpdate({...doc,items:[{_id:'a',name:'edited'}]},entries),/Concurrent change/);
  assert.throws(()=>buildGameListUpdate(doc,[{id:'a',before:{price:12},after:{price:1}}]),/Forbidden/);
  const reverse=buildGameListUpdate({platform:'ps5',items:[{_id:'a',name:'new',imageUrl:url}]},entries,true);
  assert.equal(reverse.update.$set['items.0.name'],'old');
  assert.ok(Object.hasOwn(reverse.update.$unset,'items.0.imageUrl'));
});


test('game cover SDK receives dedicated credentials without changing global Cloudinary configuration',async()=>{
  const old=Object.fromEntries(['GAME_CLOUDINARY_CLOUD_NAME','GAME_CLOUDINARY_API_KEY','GAME_CLOUDINARY_API_SECRET'].map(key=>[key,process.env[key]]));
  Object.assign(process.env,{GAME_CLOUDINARY_CLOUD_NAME:'test-games-cloud',GAME_CLOUDINARY_API_KEY:'test-game-key',GAME_CLOUDINARY_API_SECRET:'test-game-secret'});
  let received;
  const {route}=loadRoute('./lib/game-cloudinary.ts',{cloudinary:{v2:{uploader:{upload_stream:(options,callback)=>{received=options;return {end:()=>callback(null,{secure_url:url,public_id:'game'})};}},config:()=>{throw new Error('Shared config must not be changed');}}}});
  try {
    assert.equal((await route.uploadGameCover(Buffer.from('test'))).publicId,'game');
    assert.equal(received.cloud_name,'test-games-cloud');
    assert.equal(received.api_key,'test-game-key');
    assert.equal(received.api_secret,'test-game-secret');
    assert.equal(received.format,'webp');
  } finally {for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
