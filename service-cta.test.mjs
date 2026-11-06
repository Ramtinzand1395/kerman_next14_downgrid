import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
const require=createRequire(import.meta.url);
function load(path,deps={},globals={}) {
  const module={exports:{}};
  const compiled=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
  }).outputText;
  new Function('require','module','exports',...Object.keys(globals),compiled)(name=>deps[name]??require(name),module,module.exports,...Object.values(globals));
  return module.exports;
}
const topics=load('./lib/contact-topics.ts');
const storeContact=load('./lib/store-contact.ts',{'@/lib/storeIdentity':load('./lib/storeIdentity.ts')}).STORE_CONTACT;
function elements(node) {
  if(Array.isArray(node))return node.flatMap(elements);
  return React.isValidElement(node)?[node,...elements(node.props.children)]:[];
}

test('each services action leads to its promised destination, including contextual contact requests',()=>{
  const page=load('./app/(public)/services/page.tsx',{
    '@/lib/contact-topics':topics,'@/lib/site':{SITE_URL:'https://example.test'},
    '@/app/components/navigation/NavigationFeedback':{__esModule:true,default:()=>null},
  }).default;
  const links=new Map(elements(page()).filter(node=>node.props.href).map(node=>[node.props.children,node.props.href]));
  for(const [label,href] of [
    ['مشاهده بازی‌های اکانتی','/category/account-games'],
    ['بررسی شرایط ارسال','/terms#shipping'],
    ['دریافت مشاوره خرید',topics.contactTopicHref('buying-advice')],
    ['ارسال درخواست ارزیابی کنسول',topics.contactTopicHref('used-console')],
    ['ارتباط با پشتیبانی',topics.contactTopicHref('after-sales')],
    ['دریافت مشاوره خدمات',topics.contactTopicHref('service-advice')],
  ])assert.equal(links.get(label),href,label);
});

test('contact subjects accept only supported intents, not arbitrary strings, arrays or inherited object keys',()=>{
  assert.equal(topics.contactTopicSubject('used-console'),'درخواست ارزیابی کنسول کارکرده');
  for(const value of [undefined,'unknown','constructor','__proto__','<script>', ['after-sales']])assert.equal(topics.contactTopicSubject(value),'');
});

function formHarness(savedDraft, status='authenticated') {
  let states=[],stateIndex=0,refIndex=0,effectIndex=0,submitted,redirect;
  const refs=[],effects=[],pending=[];
  const storage=new Map(savedDraft?[['contactSupportDraft',JSON.stringify(savedDraft)]]:[]);
  const deps={react:{...React,
    useState(initial){const index=stateIndex++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},
    useRef(initial){return refs[refIndex++]??={current:initial};},
    useEffect(callback,dependencies){const index=effectIndex++;if(effects[index]?.every((value,i)=>Object.is(value,dependencies[i])))return;effects[index]=dependencies;pending.push(callback);},
  },'next-auth/react':{useSession:()=>({status})},'react-toastify':{toast:{success(){},error(){}}},
    '@/validations/contactValidation':load('./validations/contactValidation.ts'),
    '@/app/components/loading/LoadingSystem':{ButtonLoading:()=>null},
    '@/lib/store-contact':load('./lib/store-contact.ts',{'@/lib/storeIdentity':load('./lib/storeIdentity.ts')}),
  };
  const form=load('./app/(public)/contact-us/ContactForm.tsx',deps,{
    sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    window:{location:{pathname:'/contact-us',search:'?topic=after-sales',hash:'#contact-form',assign:url=>{redirect=url;}}},
    fetch:async(_url,options)=>{submitted=JSON.parse(options.body);return {ok:true,json:async()=>({})};},
  }).default;
  let subject='';
  const render=(nextSubject=subject)=>{
    subject=nextSubject;stateIndex=refIndex=effectIndex=0;let result=form({initialSubject:subject});
    if(pending.length){while(pending.length)pending.shift()();stateIndex=refIndex=effectIndex=0;result=form({initialSubject:subject});}
    return result;
  };
  return {render,get data(){return states[0];},get submitted(){return submitted;},get draft(){return JSON.parse(storage.get('contactSupportDraft'));},get redirect(){return redirect;},
    change(name,value){const node=elements(render()).find(node=>node.props.name===name);node.props.onChange({target:{name,value}});},
    submit:async()=>{const node=elements(render()).find(node=>node.type==='form');await node.props.onSubmit({preventDefault(){}});},
  };
}
const draft={name:'مشتری آزمایشی',phone:'09123456789',email:'test@example.test',message:'پیام قبلی مشتری حفظ شود.',subject:'موضوع شخصی مشتری'};

test('a new intent updates only the subject and preserves entered fields and message',()=>{
  const h=formHarness();h.render('مشاوره خرید بازی و کنسول');h.change('name',draft.name);h.change('message',draft.message);
  h.render('پشتیبانی پس از خرید');
  assert.equal(h.data.subject,'پشتیبانی پس از خرید');assert.equal(h.data.name,draft.name);assert.equal(h.data.message,draft.message);
});

test('login drafts preserve edited subjects for the same intent, while a different intent preserves other fields',()=>{
  const same=formHarness({...draft,contactTopic:'پشتیبانی پس از خرید'});same.render('پشتیبانی پس از خرید');assert.equal(same.data.subject,draft.subject);
  const different=formHarness({...draft,contactTopic:'مشاوره خدمات'});different.render('پشتیبانی پس از خرید');
  assert.equal(different.data.subject,'پشتیبانی پس از خرید');assert.equal(different.data.message,draft.message);
  const legacy=formHarness(draft);legacy.render();assert.equal(legacy.data.subject,draft.subject);
});

test('context survives login redirect and never leaks draft metadata into the strict contact API payload',async()=>{
  const guest=formHarness({...draft,contactTopic:'پشتیبانی پس از خرید'},'unauthenticated');guest.render('پشتیبانی پس از خرید');await guest.submit();
  assert.equal(guest.draft.contactTopic,'پشتیبانی پس از خرید');
  assert.equal(new URL(guest.redirect,'https://example.test').searchParams.get('callbackUrl'),'/contact-us?topic=after-sales#contact-form');
  const signedIn=formHarness(guest.draft);signedIn.render('پشتیبانی پس از خرید');await signedIn.submit();
  assert.deepEqual(signedIn.submitted,draft);assert.equal(signedIn.data.subject,'پشتیبانی پس از خرید');assert.equal(signedIn.data.message,'');
});

test('contact card uses the full store address for maps and the same hours as the public schedule',()=>{
  const nodes=elements(formHarness().render());
  const map=nodes.find(node=>node.props.href?.startsWith('https://www.google.com/maps/'));
  assert.ok(map);
  const query=new URL(map.props.href).searchParams.get('query');
  assert.ok(query.includes(storeContact.address));
  assert.ok(query.includes('کرمان آتاری'));
  assert.notEqual(query,'Kerman');
  assert.ok(nodes.some(node=>node.props.children===storeContact.hoursText));
  assert.ok(storeContact.hoursText.includes('۱۲:۳۰'));
  assert.ok(storeContact.openingHours.includes('Mo-Su 09:00-12:30'));
  assert.ok(storeContact.openingHours.includes('Mo-Su 16:00-20:00'));
});
