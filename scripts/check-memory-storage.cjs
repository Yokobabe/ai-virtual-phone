// Real browser IDB: old high-version backup schema repair, atomic bundle and user namespaces.
const fs=require('node:fs'),http=require('node:http'),ts=require('typescript'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Effy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const files=['identity-runtime','identity-space','identity-access','idb-open','memory-storage','memory-cognition','memory-cognition-history','memory-types','token-counter'];
const sources=Object.fromEntries(files.map(n=>[n,ts.transpileModule(fs.readFileSync(`lib/${n}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText]));
async function main(){
 const server=http.createServer((_q,r)=>r.end('<!doctype html><title>Memory storage regression</title>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);
  const load=async owner=>{
   await page.evaluate(owner=>localStorage.setItem('float_identity_runtime_v1',JSON.stringify({version:1,activeUserId:owner,legacyOwnerId:'A',userIds:['A','B'],deletingUserIds:[],revision:owner==='A'?0:1})),owner);
   await page.goto(url);
   await page.evaluate(sources=>{
    const modules={},cache=new Map();window.module=name=>{name=name.replace(/^.*\//,'');if(name==='kv-db')return{kvGet:k=>cache.get(k)||null,kvSet:(k,v)=>cache.set(k,v),kvSetAsync:async(k,v)=>cache.set(k,v),registerDynamicPrefix:()=>{},registerKvMigration:()=>{}};if(modules[name])return modules[name];const exports={};modules[name]=exports;new Function('exports','require',sources[name])(exports,window.module);return exports;};
    window.check=(ok,message)=>{if(!ok)throw Error(message)};
   },sources);
  };
  await load('A');
  await page.evaluate(async()=>{
   const r=indexedDB.open('ai_phone_memory_db_v1',8);r.onupgradeneeded=()=>{r.result.createObjectStore('memories',{keyPath:'id'});const s=r.result.createObjectStore('cognition',{keyPath:'characterId'});s.put({version:1,characterId:'Migrated',openItems:[],mirror:{text:'旧版本镜子',evidence:[],updatedAt:'2026-01-01T00:00:00.000Z'},gaze:{text:'旧版本凝视',evidence:[],updatedAt:'2026-01-01T00:00:00.000Z'}})};
   const old=await new Promise(res=>r.onsuccess=()=>res(r.result));old.close();
   const storage=module('memory-storage'),cog=module('memory-cognition'),now=new Date().toISOString();
   const state={...cog.emptyCognition('C'),updatedAt:now,mirror:{text:'A与C的认知',evidence:[],updatedAt:now}};
   const entry={id:'e',characterId:'C',type:'long_term',sourceApp:'chat',content:'A与C',importance:.8,createdAt:now,updatedAt:now};
   await storage.saveMemoryEntries([entry],state);
   check((await storage.loadMemoryEntries('C'))[0].content==='A与C','Old schema upgrade lost memory');
   check((await storage.loadPersistedMemoryCognition('C')).mirror.text==='A与C的认知','Cognition bundle missing');
   check((await storage.loadCognitionHistory('Migrated','mirror')).revisions[0].value.text==='旧版本镜子','Legacy mirror was not archived on migration');
   check((await storage.loadCognitionHistory('Migrated','gaze')).revisions[0].value.text==='旧版本凝视','Legacy gaze was not archived on migration');
   const next={...state,updatedAt:'2026-02-01T00:00:00.000Z',mirror:{...state.mirror,text:'融合旧认识的新版本',digest:'新的提要',revisionId:'new-1',generatedAt:new Date(Date.parse(now)+1000).toISOString()}};
   await storage.saveMemoryEntries([],next,{expectedUpdatedAt:now});
   const history=await storage.loadCognitionHistory('C','mirror',{limit:1});
   check(history.revisions.length===1&&history.revisions[0].value.text===next.mirror.text&&Boolean(history.before),'Newest-first pagination failed');
   check((await storage.loadCognitionHistory('C','mirror',{before:history.before})).revisions[0].value.text==='A与C的认知','Older version was overwritten');
   await storage.saveCognitionRecord({...next,openItems:[],updatedAt:'2026-02-02T00:00:00.000Z'});
   check((await storage.loadCognitionHistory('C','mirror')).revisions.length===2,'Status-only update duplicated a reflection');
   const historical={...state,mirror:{...state.mirror,text:'重整旧片段产生的认识',revisionId:'old-range',generatedAt:new Date(Date.parse(now)+2000).toISOString()}};
   await storage.saveMemoryEntries([],next,{generatedCognition:historical});
   check((await storage.loadCognitionHistory('C','mirror')).revisions.length===3,'Older-range generation was discarded');
   check((await storage.loadPersistedMemoryCognition('C')).mirror.text===next.mirror.text,'Older-range generation rolled back current cognition');
   let stale=false;try{await storage.saveMemoryEntries([{...entry,id:'stale'}],state,{expectedUpdatedAt:'wrong'})}catch{stale=true}
   check(stale&&!(await storage.loadMemoryEntries('C')).some(e=>e.id==='stale'),'Optimistic guard did not roll back the whole bundle');
   let rejected=false;try{await storage.saveMemoryEntries([{...entry,id:'queued',content:'must rollback'},{...entry,id:'bad',content:()=>{}}],{...state,mirror:{...state.mirror,text:'must rollback'}})}catch{rejected=true}
   check(rejected,'Non-cloneable transaction must fail');
   check((await storage.loadPersistedMemoryCognition('C')).mirror.text===next.mirror.text,'Partial transaction committed cognition');
   check((await storage.loadCognitionHistory('C','mirror')).revisions.length===3,'Failed transaction archived a partial result');
   check(!(await storage.loadMemoryEntries('C')).some(e=>e.id==='queued'),'Queued record escaped rollback');
   let asyncRejected=false;try{await storage.saveMemoryEntries([{...entry,id:'async-failed'}],{...next,mirror:{...next.mirror,revisionId:'failed-generated',text:'不应入历史'},mood:{text:()=>{},evidence:[],updatedAt:now}})}catch{asyncRejected=true}
   check(asyncRejected,'Callback clone failure must reject');
   check((await storage.loadCognitionHistory('C','mirror')).revisions.length===3,'Callback failure committed history');
   check(!(await storage.loadMemoryEntries('C')).some(e=>e.id==='async-failed'),'Callback failure committed memory');
  });
  await load('B');await page.evaluate(async()=>{const s=module('memory-storage');check((await s.loadMemoryEntries('C')).length===0,'B sees A memories');check(await s.loadPersistedMemoryCognition('C')===null,'B sees A cognition');check((await s.loadCognitionHistory('C','mirror')).revisions.length===0,'B sees A versions');await s.saveCognitionRecord({...module('memory-cognition').emptyCognition('C'),updatedAt:new Date().toISOString()});});
  await load('A');await page.evaluate(async()=>{check((await module('memory-storage').loadPersistedMemoryCognition('C')).mirror.text==='融合旧认识的新版本','B write overwrote A');check((await module('memory-storage').loadCognitionHistory('C','mirror')).revisions.length===3,'B write changed A history')});
  console.log('PASS: actual IDB high-version migration archives legacy mirror/gaze, immutable paginated history, older-range retention, status dedup, stale-write/clone rollback, A/B independent history. No real data or model calls.');
 }finally{await browser.close();server.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
