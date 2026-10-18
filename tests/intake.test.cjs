const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const html=readFileSync(__dirname+'/../intakeformulier.html','utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function formToObject'));
function setup({mailFails=false, insertFails=false}={}) {
 const handlers={}, storage=new Map(), fields=[{name:'style',type:'checkbox',value:'Premium',checked:true}], elements={};
 const button={disabled:false}; let inserts=0,reset=0;
 const form={addEventListener:(n,fn)=>handlers[n]=fn,querySelector:()=>button,querySelectorAll:selector=>selector.includes('checkbox')?fields:fields.filter(f=>selector.includes(f.name)),reset:()=>reset++};
 const get=id=>id==='intakeForm'?form:(elements[id]??={style:{},textContent:'',files:[],addEventListener(){}});
 const context=vm.createContext({document:{getElementById:get},supabase:{createClient:()=>({from:()=>({insert:async()=>{inserts++;return {error:insertFails?new Error('database unavailable'):null}}})})},FormData:class{*entries(){yield ['style','Premium'];yield ['client_name','Test'];yield ['client_email','test@example.invalid']}},File:class{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},CSS:{escape:x=>x},crypto:{randomUUID:()=> 'test-id'},window:{},console:{error(){}},setTimeout:()=>1,clearTimeout(){},fetch:async()=>{if(mailFails)throw new Error('mail unavailable');return {ok:true}},Date});
 vm.runInContext(script,context);
 return {context,fields,elements,storage,button,submit:()=>handlers.submit({preventDefault(){}}),get inserts(){return inserts},get reset(){return reset}};
}
test('one checkbox survives saving and restoring',()=>{const s=setup();vm.runInContext('saveDraft()',s.context);s.fields[0].checked=false;vm.runInContext('restoreDraft()',s.context);assert.equal(s.fields[0].checked,true)});
test('legacy single checkbox draft restores',()=>{const s=setup();s.storage.set('mnrv_website_intake_draft_v2',JSON.stringify({style:'Premium'}));vm.runInContext('restoreDraft()',s.context);assert.equal(s.fields[0].checked,true)});
test('mail failure still reports saved intake and clears draft',async()=>{const s=setup({mailFails:true});await s.submit();assert.equal(s.inserts,1);assert.equal(s.elements.successBox.style.display,'block');assert.equal(s.storage.size,0);assert.match(s.elements.successBox.textContent,/opgeslagen/)});
test('simultaneous submissions save only once',async()=>{const s=setup();await Promise.all([s.submit(),s.submit()]);assert.equal(s.inserts,1);assert.equal(s.button.disabled,false)});
test('database failure keeps the draft',async()=>{const s=setup({insertFails:true});await s.submit();assert.equal(s.elements.errorBox.style.display,'block');assert.equal(s.storage.size,1);assert.equal(s.reset,0)});
test('successful submission clears draft and resets form',async()=>{const s=setup();await s.submit();assert.equal(s.elements.successBox.style.display,'block');assert.equal(s.storage.size,0);assert.equal(s.reset,1)});
