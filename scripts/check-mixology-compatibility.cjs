// Offline integration regression: real mixology modules, in-memory KV and fake LLM only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const data = new Map([['chat-sentinel', 'untouched'], ['album-sentinel', 'untouched']]);
const cache = new Map(), calls = [], hooks = [];
let reply = '「这是模拟回复。」', hookHandler = () => ({});
const mocks = {
  'lib/kv-db.ts': {kvGet: k => data.get(k), kvSet: (k,v) => data.set(k,v), registerKvMigration() {}},
  'lib/download-utils.ts': {downloadFile() {}},
  'lib/chat-engine.ts': {
    ChatEngineError: class extends Error {},
    sendLLMRequest: async (...args) => {calls.push(args); return reply;},
    sendLLMStreamRequest: async () => {throw Error('Unexpected streaming request');},
  },
  'lib/settings-storage.ts': {loadApiConfigs: () => [{id:'mock'}], loadBindingConfig: () => ({globalDefaults:{apiConfigId:'mock'}})},
  'lib/mixology/mechanism-runtime.ts': {
    disposeMixSandboxes() {},
    runMixHook: async (session, material, script, hook, payload) => {hooks.push(hook); return hookHandler(hook,payload);},
  },
};
function load(file) {
  file = file.replaceAll('\\','/');
  if (mocks[file]) return mocks[file];
  if (cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}}; cache.set(file,module);
  const source = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const req = id => {
    const resolved = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file),id)) : null;
    if (!resolved) throw Error('Unexpected dependency: '+id);
    return load(resolved.endsWith('.ts') ? resolved : resolved+'.ts');
  };
  vm.runInNewContext(source, {module,exports:module.exports,require:req,console,Date,Math,JSON,Map,Set,RegExp,URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,atob,btoa,escape,unescape,crypto:require('node:crypto').webcrypto,
    fetch:()=>{throw Error('Network forbidden in regression');}}, {filename:file});
  return module.exports;
}
const transfer=load('lib/mixology/transfer.ts'), compat=load('lib/mixology/compatibility-runtime.ts');
const storage=load('lib/mixology/storage.ts'), engine=load('lib/mixology/engine.ts');
const external={spec:'chara_card_v3',spec_version:'3.0',data:{name:'Sample',description:'CARD_DESCRIPTION',personality:'CARD_PERSONALITY',scenario:'CARD_SCENARIO',first_mes:'Hello {{user}}',alternate_greetings:['Other opening'],mes_example:'<START>\n{{user}}: Hi\n{{char}}: Hello',system_prompt:'CARD_SYSTEM',post_history_instructions:'CARD_POST',character_book:{entries:[{enabled:true,constant:true,content:'CONSTANT_LORE',position:'before_char'},{enabled:true,keys:['garden'],content:'KEYWORD_LORE',position:'after_char'},{enabled:false,constant:true,content:'DISABLED_LORE'}]},extensions:{tavern_helper:{scripts:[{content:'throw Error("must never run")'}]}}}};
const presetData={temperature:.7,openai_max_tokens:65000,api_key:'DO_NOT_KEEP',prompts:[{identifier:'init',role:'system',content:'{{setvar::style::STYLE}}'},{identifier:'main',role:'system',content:'MAIN'},{identifier:'style',role:'user',content:'{{getvar::style}} {{char}} {{user}}'},{identifier:'charDescription',marker:true},{identifier:'charPersonality',marker:true},{identifier:'scenario',marker:true},{identifier:'worldInfoBefore',marker:true},{identifier:'worldInfoAfter',marker:true},{identifier:'dialogueExamples',marker:true},{identifier:'chatHistory',marker:true},{identifier:'deep',role:'system',content:'DEPTH_ONE',injection_position:1,injection_depth:1},{identifier:'off',role:'system',content:'DISABLED_PROMPT'}]};
presetData.prompt_order=[{character_id:100001,order:presetData.prompts.map(p=>({identifier:p.identifier,enabled:p.identifier!=='off'}))}];
async function main(){
 const card=transfer.parseMixMaterialsFromJson(JSON.stringify(external),'tavern')[0];
 const preset=transfer.parseMixMaterialsFromJson(JSON.stringify(presetData),'tavern','Sample.json')[0];
 assert.equal(card.openings.length,2);assert.equal(card.examples.length,2);
 assert.equal(preset.name,'Sample');assert.equal(preset.compatibility.data.api_key,undefined);
 assert.equal(compat.compatibilityPreset(preset).openai_max_tokens,8192);
 assert.throws(()=>transfer.parseMixMaterialsFromJson(JSON.stringify(external)),/第三方/);
 assert.throws(()=>transfer.parseMixMaterialsFromJson(JSON.stringify(presetData),'janitor'),/酒馆预设/);
 const janitor=transfer.parseMixMaterialsFromJson(JSON.stringify({name:'Janitor sample',personality:'Traits',initial_message:'Hi',example_dialogs:'{{char}}: Hi'}),'janitor')[0];assert.equal(janitor.openings[0],'Hi');assert.equal(janitor.compatibility.source,'janitor');
 const macro=compat.createCompatibilityMacros({char:'C',user:'U'},()=>0);
 assert.equal(macro('{{setvar::test::{{char}}}}{{getvar::test}} {{random::A::B}} {{roll:1d2+1}}'),'C A 2');
 assert.equal(macro('{{unknown}}'),'{{unknown}}');
 const base={card,active:{character:[card],base:[preset]},history:[{role:'assistant',content:'hello'},{role:'user',content:'garden'}],userName:'Player',nativeSystem:'',postHistory:''};
 const result=compat.buildCompatibilityMessages(base); const text=result.messages.map(m=>m.content).join('\n');
 for(const s of ['CARD_DESCRIPTION','CARD_PERSONALITY','CARD_SCENARIO','CARD_SYSTEM','CARD_POST','CONSTANT_LORE','KEYWORD_LORE','STYLE Sample Player'])assert.ok(text.includes(s),s);
 assert.ok(!text.includes('DISABLED_'));assert.equal(text.split('CARD_PERSONALITY').length-1,1);
 const index=result.messages.findIndex(m=>m.content==='garden');assert.equal(result.messages[index-1].content,'DEPTH_ONE');assert.equal(result.messages.find(m=>m.content==='STYLE Sample Player').role,'user');
 assert.throws(()=>compat.buildCompatibilityMessages({...base,active:{base:[preset,preset]}}),/只能使用一份/);
 assert.equal(compat.buildCompatibilityMessages({...base,card:{...card,compatibility:undefined},active:{}}),null);
 assert.ok(!compat.buildCompatibilityMessages({...base,history:[]}).messages.some(m=>m.content==='KEYWORD_LORE'));
 // Synthetic PNG exercises real decoding, not filename guesses.
 const payload=Buffer.from('ccv3\0'+Buffer.from(JSON.stringify(external)).toString('base64'));
 const chunk=Buffer.alloc(payload.length+12);chunk.writeUInt32BE(payload.length);chunk.write('tEXt',4);payload.copy(chunk,8);
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk,Buffer.from([0,0,0,0,73,69,78,68,0,0,0,0])]);
 const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 assert.equal(transfer.parseMixMaterialsFromPng(ab(png),'janitor')[0].charName,'Sample');
 assert.throws(()=>transfer.parseMixMaterialsFromPng(ab(Buffer.from([255,216,255,224])),'janitor'),/JPEG/);
 assert.throws(()=>transfer.parseMixMaterialsFromPng(ab(png.subarray(0,20)),'tavern'),/不完整/);
 // Actual engine -> fake provider verifies compatibility is used, not just parsed.
 storage.saveMixMaterial(card);storage.saveMixMaterial(preset);
 const recipe={id:'compat-recipe',name:'Compat',slots:{character:card.id,base:preset.id},createdAt:1,updatedAt:1};
 const session=engine.startMixSession(recipe,{userName:'Player'});
 assert.equal(session.turns[0].text,'Hello Player');
 await engine.generateMixReply(session.id,'garden');
 assert.equal(calls.length,1);assert.equal(calls[0][1].temperature,.7);assert.equal(calls[0][1].openai_max_tokens,8192);
 assert.ok(calls[0][2].some(m=>m.content.includes('KEYWORD_LORE')));
 assert.ok(!calls[0][2].some(m=>m.content.includes('正文标记规则')));
 // Native JSON round-trip retains compatibility metadata without changing identity in place.
 const restored=transfer.parseMixMaterialsFromJson(JSON.stringify(preset))[0];assert.notEqual(restored.id,preset.id);assert.equal(restored.compatibility.format,'preset');
 const regexModule=load('lib/mixology/compatibility-regex.ts');
 const loreModule=load('lib/mixology/compatibility-worldbook.ts');
 const textModule=load('lib/mixology/compatibility-text.ts');
 const runRegex=(text,rules,phase,depth=0,placement=2,isEdit=false)=>regexModule.applyCompatibilityRegex(text,rules,{phase,depth,placement,isEdit,macro:s=>s.replaceAll('{{char}}','A.B')});
 const basic=[{findRegex:'/SECRET/g',replaceString:'',placement:[2],markdownOnly:true,promptOnly:false}];
 assert.equal(runRegex('SECRET visible',basic,'display'),' visible');assert.equal(runRegex('SECRET visible',basic,'prompt'),'SECRET visible');
 assert.equal(runRegex('SECRET',basic,'source'),'SECRET');
 assert.equal(runRegex('SECRET',[{...basic[0],markdownOnly:false,promptOnly:false}],'source'),'');
 assert.equal(runRegex('SECRET',[{...basic[0],disabled:true}],'display'),'SECRET');
 assert.equal(runRegex('SECRET',[{...basic[0],minDepth:2}],'display',1),'SECRET');
 assert.equal(runRegex('SECRET',[{...basic[0],runOnEdit:false}],'display',0,2,true),'SECRET');
 assert.equal(runRegex('A.B AxB',[{findRegex:'/{{char}}/g',substituteRegex:2,replaceString:'OK',placement:[2],promptOnly:true}],'prompt'),'OK AxB');
 assert.equal(runRegex('abc',[{findRegex:'/(?<word>abc)/',replaceString:'$0/$1/$<word>/{{match}}',trimStrings:['b'],placement:[2],promptOnly:true}],'prompt'),'ac/ac/ac/ac');
 const book={name:'Test book',recursive_scanning:true,entries:[
 {uid:0,constant:true,content:'dragon',extensions:{position:0}},
 {uid:1,keys:['dragon'],content:'RECURSIVE',extensions:{position:4,depth:2,role:1}},
 {uid:2,constant:true,content:'NEVER',extensions:{useProbability:true,probability:0}},
 {uid:3,keys:['/garden/i'],content:'REGEX_KEY'},
 {uid:4,keys:['cat'],content:'WHOLE',extensions:{match_whole_words:true}},
 {uid:5,constant:true,content:'GROUP_LOW',extensions:{group:'one',group_override:true},insertion_order:1},
 {uid:6,constant:true,content:'GROUP_HIGH',extensions:{group:'one',group_override:true},insertion_order:99},
 {uid:7,keys:['garden'],content:'STICKY',extensions:{sticky:2,cooldown:2}},
 {uid:8,constant:true,content:'DELAYED',extensions:{delay:3}},
 {uid:9,constant:true,content:'BUDGET'.repeat(10000)},
 {uid:10,keys:['garden'],secondary_keys:['rain'],selective:true,content:'SECONDARY',extensions:{selectiveLogic:2}},
 ]};
 const world=transfer.parseMixMaterialsFromJson(JSON.stringify(book),'tavern','Book.json')[0];assert.equal(world.compatibility.format,'worldbook');
 const loreInput={card:{...card,compatibility:undefined},active:{flavor:[world]},history:['Garden concatenate'],fields:{},macro:s=>s,turn:1,contextBudget:1000,random:()=>.5};
 const selected=loreModule.selectCompatibilityLore(loreInput);const loreText=selected.entries.map(e=>e.content).join(' ');
 for(const expected of ['RECURSIVE','REGEX_KEY','GROUP_HIGH','STICKY','SECONDARY'])assert.ok(loreText.includes(expected),expected);
 for(const absent of ['NEVER','WHOLE','GROUP_LOW','DELAYED','BUDGET'])assert.ok(!loreText.includes(absent),absent);
 assert.ok(loreModule.selectCompatibilityLore({...loreInput,history:[],turn:2,state:selected.state}).entries.some(e=>e.content==='STICKY'));
 assert.ok(!loreModule.selectCompatibilityLore({...loreInput,turn:4,state:selected.state}).entries.some(e=>e.content==='STICKY'));
 assert.ok(loreModule.selectCompatibilityLore({...loreInput,turn:6,state:selected.state}).entries.some(e=>e.content==='STICKY'));
 assert.ok(selected.report.entries.some(e=>e.status==='超出世界书预算'));
 const routed=compat.buildCompatibilityMessages({...base,active:{base:[preset],flavor:[world]},turn:1});assert.ok(routed.messages.some(m=>m.role==='user'&&m.content==='RECURSIVE'));
 const samples=[];
 for(const file of process.argv.slice(2)){
  const bytes=fs.readFileSync(file);const mats=/\.json$/i.test(file)?transfer.parseMixMaterialsFromJson(bytes.toString('utf8'),'tavern',path.basename(file)):transfer.parseMixMaterialsFromPng(ab(bytes),'tavern');
  samples.push(...mats);
  if(path.basename(file).startsWith('Kemini')){
    const rules=regexModule.compatibilityRegexRules({base:mats});
    const raw='<think><analysis>hidden</analysis></think>正文<summary>剧情摘要</summary>';
    const display=runRegex(raw,rules,'display');assert.ok(!display.includes('hidden'));assert.ok(display.includes('正文'));assert.ok(display.includes('<details>'));
    const recent=runRegex(raw,rules,'prompt',0);assert.ok(!recent.includes('hidden'));assert.ok(recent.includes('正文'));assert.ok(!recent.includes('剧情摘要'));
    const old=runRegex(raw,rules,'prompt',11);assert.ok(!old.includes('正文'));assert.ok(old.includes('剧情摘要'));assert.ok(!old.includes('hidden'));
    assert.ok(runRegex('你好',rules,'prompt',0,1).includes('<interactive_input>'));assert.equal(runRegex('你好',rules,'prompt',3,1),'你好');
    assert.equal(textModule.transformCompatibilityText({text:'<think>partial',active:{base:mats},charName:'C',userName:'U',phase:'display',placement:2,streaming:true}),'');
    reply=raw;storage.saveMixMaterial(mats[0]);const r={...recipe,id:'regex-engine',slots:{character:card.id,base:mats[0].id}};const ss=engine.startMixSession(r);await engine.generateMixReply(ss.id,'hello');await engine.generateMixReply(ss.id,'continue');
    assert.equal(storage.getMixSession(ss.id).turns.at(-1).rawText,raw);assert.ok(!calls.at(-1)[2].some(m=>m.role==='assistant'&&m.content.includes('hidden')));
  }
  if(path.basename(file).startsWith('雾中')){
    const rules=regexModule.compatibilityRegexRules({base:mats});const raw='<thinking>HIDDEN_REASONING</thinking>正文<details><summary>摘要</summary>MEMORY</details>';
    assert.ok(!runRegex(raw,rules,'display').includes('HIDDEN_REASONING'));
    const recent=runRegex(raw,rules,'prompt',0);assert.ok(recent.includes('正文'));assert.ok(!recent.includes('MEMORY'));
    const old=runRegex(raw,rules,'prompt',6);assert.ok(old.includes('MEMORY'));assert.ok(!old.includes('正文'));assert.ok(!old.includes('HIDDEN_REASONING'));
  }
  for(const m of mats){const sample=compat.buildCompatibilityMessages({...base,card:m.kind==='character'?m:card,active:{base:m.kind==='base'?[m]:[preset]}});assert.ok(sample.messages.length>0);assert.ok(sample.messages.every(x=>typeof x.content==='string'));}
  console.log('Sample parsed and assembled:',path.basename(file));
 }
 for(const c of samples.filter(m=>m.kind==='character')) for(const p of samples.filter(m=>m.compatibility?.format==='preset')) { const result=compat.buildCompatibilityMessages({...base,card:c,active:{base:[p]},history:[{role:'user',content:'Hello'}]}); assert.ok(result.messages.length>0); assert.ok(result.messages.some(m=>m.role==='user')); }
 const latest=storage.getMixSession(session.id);assert.ok(latest.turns.at(-1).compatibilityLoreReport);
 const originalLast=latest.turns.at(-1);engine.editMixTurn(session.id,originalLast.id,'Edited assistant');await engine.runMixEditSync(session.id,originalLast.id);assert.ok(storage.getMixSession(session.id).turns.at(-1).compatibilityLore);
 await engine.rerollMixReply(session.id);assert.ok(storage.getMixSession(session.id).turns.at(-1).compatibilityLoreReport);
 assert.equal(data.get('chat-sentinel'),'untouched');assert.equal(data.get('album-sentinel'),'untouched');
 console.log('PASS: compatibility import, macros, ordered roles, lore, depth, engine/provider, native round-trip; no network.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
