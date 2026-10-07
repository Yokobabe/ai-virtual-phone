// Real production parsing, summary, recall and prompt assembly; models/storage mocked, no paid requests.
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const modules = {}, kv = new Map(), records = new Map(), states = new Map();
let owner = 'A', permitted = true, active = true, response, llmCalls = 0, embeddings = 0, lastPrompt, lastTimestamp = null;
const clock = new Date().toISOString();
const timeline = [{ id: 'source-1', timestamp: clock, sourceApp: 'chat', content: 'A和C约好周末一起去海边。' }];
function key(char) { return `${owner}:${char}`; }
const deps = {
  'kv-db': { kvGet: k => kv.get(key(k)) || null, kvSet: (k, v) => kv.set(key(k), v), kvSetAsync: async (k,v)=>kv.set(key(k),v), registerDynamicPrefix:()=>{} },
  'identity-runtime': { assertIdentityActive:()=>{ if(!active) throw Error('silenced'); }, getCurrentIdentityId:()=>owner },
  'identity-access': { canCurrentIdentityInteract:()=>permitted },
  'character-storage': { loadCharacters:()=>[{id:'C',name:'C',persona:'沉稳，信守承诺',personality:'克制'}] },
  'settings-storage': { resolveAuxiliaryApiConfig:type=>type==='embeddingApiConfigId'?{model:'fixture'}:{model:'summary'},resolveUserIdentity:()=>({id:owner,name:owner,bio:'身份简介'}) },
  'short-term-assembler': {loadNativeTimeline:(_id,opts)=>timeline.filter(e=>!opts?.afterTimestamp||e.timestamp>opts.afterTimestamp),filterTimelineByAllowedSources:es=>es,formatTimelineForSummarization:es=>({earliest:es[0].timestamp,latest:es.at(-1).timestamp})},
  'api-helpers': {simpleLLMCall:async(_api,prompt)=>{llmCalls++;lastPrompt=prompt;return {content:typeof response==='function'?response(prompt):response};}},
  'memory-embedding': { resolveEmbeddingModel:()=> 'fixture',generateEmbedding:async()=>{embeddings++;return [1,0]},cosineSimilarity:(a,b)=>b[0] },
  'character-time': {buildCharacterTimeContext:()=>({}),buildGroupTimeContext:()=>({}),getSystemTimeZone:()=> 'Asia/Shanghai'},
  'prompt-time': {resolvePromptTimeAware:()=>false,getPromptTimestampOptionsForTimeContext:()=>({}),formatPromptTimestamp:()=>''},
  'voice-expression': {voiceExpressionInstruction:()=>''},
  'prompt-sanitizer': {stripStateAndInnerForPrompt:t=>t},
  'chat-echo': {echoHistoryText:(_m,t)=>t}, 'chat-love':{loveHistoryText:(_m,t)=>t}, 'chat-fireworks':{fireworksHistoryText:(_m,t)=>t},
};
function load(name) {
  name=name.replace(/^.*\//,'');
  if (deps[name]) return deps[name]; if (modules[name]) return modules[name];
  const filename=`lib/${name}.ts`;
  if (!fs.existsSync(filename) || !['music-listening','memory-cognition','memory-cognition-context','memory-types','memory-summarizer','core-memory-builder','memory-service','memory-injector','token-counter','llm-prompt-assembler','macro-engine'].includes(name)) return new Proxy({}, {get:()=>()=>''});
  const output={};modules[name]=output;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output,require:load,console,window:{},Date,Math,Map,Set,JSON});return output;
}
const types=load('memory-types'); let config={...types.DEFAULT_MEMORY_CONFIG,autoBuildCoreEnabled:false};
deps['memory-storage']={
  loadMemoryConfig:()=>config, loadMemoryEntries:async c=>records.get(key(c))||[],
  loadMemoryEntriesByType:async(c,t)=>(records.get(key(c))||[]).filter(e=>e.type===t),
  loadPersistedMemoryCognition:async c=>states.get(key(c))||null,
  saveCognitionRecord:async s=>states.set(key(s.characterId),s),
  saveMemoryEntries:async(es,s)=>{for(const e of es){const existing=records.get(key(e.characterId))||[];records.set(key(e.characterId),[...existing.filter(x=>x.id!==e.id),e]);}if(s)states.set(key(s.characterId),s)},
  deleteMemoryEntries:async ids=>{records.set(key('C'),(records.get(key('C'))||[]).filter(e=>!ids.includes(e.id)))},
  getEventCounter:()=>80,resetEventCounter:()=>{},getLastSummarizedTimestamp:()=>lastTimestamp,
  setLastSummarizedTimestamp:(_c,t)=>lastTimestamp=t,incrementCoreMemoryCounter:()=>{},getCoreMemoryCounter:()=>0,
  getPendingSummaryTimestamp:()=>null,setPendingSummaryTimestamp:()=>{},
  getLastCoreSummarizedTimestamp:()=>null,setLastCoreSummarizedTimestamp:()=>{},resetCoreMemoryCounter:()=>{},
};
async function main(){
 const cog=load('memory-cognition'), summarizer=load('memory-summarizer'), service=load('memory-service');
 const facet={text:'信任A，期待兑现约定。',evidenceIds:['source-1'],claims:[{text:'我期待兑现海边约定',kind:'interpretation',evidenceIds:['source-1']}],citations:[{id:'source-1',quote:'A和C约好周末一起去海边。'}]};
 const update={summary:'A和C约定周末一起去海边。',mirror:facet,gaze:facet,emotion:facet,mood:facet,openItems:[{id:'',kind:'commitment',text:'周末一起去海边',status:'open',dueAt:'',evidenceIds:['source-1']}]};
 response=JSON.stringify(update);
 assert.equal((await summarizer.runSummarizationPipeline('C','C')).success,true);
 assert.equal(llmCalls,1,'One summary call must update all cognition');
 assert.match(lastPrompt[0].content,/只输出 JSON/);assert.match(lastPrompt[1].content,/沉稳，信守承诺/);assert.match(lastPrompt[1].content,/source-1/);
 assert.match(lastPrompt[0].content,/完整内心剖析/);assert.match(lastPrompt[0].content,/新版融合已有认识/);assert.match(lastPrompt[0].content,/真正需要、害怕/);
 const first=cog.loadMemoryCognition('C');assert.equal(first.openItems.length,1);assert.equal((records.get(key('C'))||[])[0].sourceMessageIds[0],'source-1');
 const deep=cog.parseMemoryCognitionUpdate(JSON.stringify({...update,mirror:{...facet,text:'具体经历与内心矛盾。'.repeat(70),digest:'我用守诺维持从容，却害怕对方只需要可靠的我。'},gaze:{...facet,text:'信任和防备并存。'.repeat(80),digest:'她的主动让我想靠近，也动摇了我习惯掌控的距离。'}}),first,cog.evidenceFromTimeline(timeline),clock).cognition;
 assert.equal(deep.mirror.text.length>600,true);assert.equal(Boolean(deep.mirror.revisionId),true);assert.equal(Boolean(deep.mirror.generatedAt),true);
 const previousWithEvidence={...first,mirror:{...first.mirror,evidence:[{id:'earlier',sourceApp:'chat',timestamp:clock,excerpt:'此前的具体经历'}]}};
 const evolved=cog.parseMemoryCognitionUpdate(JSON.stringify({...update,mirror:{...facet,text:'经历让我重新理解信任。'}}),previousWithEvidence,cog.evidenceFromTimeline(timeline),clock).cognition;
 assert.deepEqual(Array.from(evolved.mirror.evidence,e=>e.id),['earlier','source-1'],'Evolution must retain old and new evidence');
 assert.notEqual(evolved.mirror.revisionId,deep.mirror.revisionId,'Distinct generations need distinct immutable IDs');
 await cog.cacheMemoryCognition(deep);
 const injected=cog.formatCognitionForPrompt('C','海边',800);
 assert.match(injected,/害怕对方只需要可靠的我/);assert.match(injected,/习惯掌控的距离/);assert.doesNotMatch(injected,/具体经历与内心矛盾/);assert.equal(load('token-counter').estimateTokens(injected)<=800,true);
 assert.match(cog.cognitionForSummary(deep),/具体经历与内心矛盾/,'Next summary must read full prior cognition, not just the digest');
 await cog.cacheMemoryCognition(first);
 // Completion updates in-place; null preserves other facets; no re-prompting of resolved tasks.
 const completion={...update,mirror:null,gaze:null,emotion:null,mood:null,openItems:[{...update.openItems[0],id:first.openItems[0].id,status:'completed'}]};
 const next=cog.parseMemoryCognitionUpdate(JSON.stringify(completion),first,cog.evidenceFromTimeline(timeline),clock).cognition;
 assert.equal(next.openItems.length,1);assert.equal(next.mirror.text,first.mirror.text);
 await cog.saveMemoryCognition(next);assert.doesNotMatch(cog.formatCognitionForPrompt('C','去海边'),/未了·约定/);
 for(const bad of ['not JSON',JSON.stringify({...update,gaze:{...facet,evidenceIds:['fabricated']}}),JSON.stringify({...update,openItems:[{...update.openItems[0],id:'unknown'}]})]){
  const before=JSON.stringify(states.get(key('C')));response=bad;lastTimestamp=null;
  assert.equal((await summarizer.runSummarizationPipeline('C','C')).success,false);assert.equal(lastTimestamp,null);assert.equal(JSON.stringify(states.get(key('C'))),before);
 }
 owner='B';assert.equal(cog.loadMemoryCognition('C').openItems.length,0);assert.equal(await deps['memory-storage'].loadPersistedMemoryCognition('C'),null);owner='A';
 permitted=false;assert.equal(cog.formatCognitionForPrompt('C','x'),'');assert.equal((await service.retrieveMemoriesForPrompt('C','海边',config)).length,0);permitted=true;
 // Vector recall now works without exhausting the legacy 100k budget, and unindexed matches stay eligible.
 records.set(key('C'),[
  {id:'a',characterId:'C',type:'long_term',content:'海边约定',embedding:[1,0],createdAt:clock},
  {id:'b',characterId:'C',type:'long_term',content:'海边一起看日出，未向量化',createdAt:clock},
  {id:'c',characterId:'C',type:'long_term',content:'不相关的一顿晚餐',embedding:[0,1],createdAt:clock},
 ]);
 const recalled=await service.retrieveMemoriesForPrompt('C','海边',config);
 assert.equal(embeddings>=2,true);assert.equal(recalled.some(e=>e.id==='b'),true);assert.equal(recalled.some(e=>e.id==='c'),false);assert.equal(service.loadMemoryRecallInfo('C').mode,'vector');
 const queryCalls=embeddings;await service.retrieveMemoriesForPrompt('C','海边',config);assert.equal(embeddings,queryCalls,'Repeated query spent another embedding call');
 owner='B';records.set(key('C'),[...recalled]);await service.retrieveMemoriesForPrompt('C','海边',config);assert.equal(embeddings,queryCalls+1,'Query cache crossed user boundary');owner='A';
 assert.equal(service.fillByBudget([{content:'x'.repeat(1000)},{content:'短'}],10).length,1,'Oversized memory must not hide later small ones');
 records.set(key('C'),[{id:'old',type:'core',content:'已过时',createdAt:clock,metadata:{active:false}},{id:'new',type:'core',content:'新状态',createdAt:clock,metadata:{active:true}}]);
 assert.equal((await service.retrieveCoreMemoriesForPrompt('C',config)).length,1);
 // Actual assembler: both default and third-party preset paths append current-user cognition once.
 const asm=load('llm-prompt-assembler');
 const input={character:{id:'C',name:'C',persona:'克制'},history:[],preset:null,worldBooks:[],regexes:[],userIdentity:{id:'A',name:'A'},appId:'story',timeAware:false};
 for(const preset of [null,{id:'custom',name:'第三方',prompts:[]}]){
  const payload=asm.assemblePromptPayload({...input,preset});
  const cognitive=payload.filter(m=>m._debugMeta?.marker==='memory_cognition');assert.equal(cognitive.length,1);assert.match(cognitive[0].content,/信任A/);
 }
 const group=asm.assembleGroupPromptPayload({members:[{character:input.character,worldBooks:[],regexes:[],preset:null}],history:[],worldBooks:[],regexes:[],userIdentity:input.userIdentity,userName:'A',timeAware:false});
 assert.equal(group.some(m=>m._debugMeta?.marker?.includes('memory_cognition')),true);
 config={...config,cognitionEnabled:false};assert.equal(asm.assemblePromptPayload(input).some(m=>m._debugMeta?.marker==='memory_cognition'),false);
 config={...config,cognitionEnabled:true};
 const before=JSON.stringify(records.get(key('C')));lastTimestamp=null;
 response=()=>{permitted=false;return JSON.stringify(update)};
 assert.equal((await summarizer.runSummarizationPipeline('C','C')).success,false);assert.equal(JSON.stringify(records.get(key('C'))),before);permitted=true;
 // Same-timestamp events spanning bounded batches must never be skipped by a timestamp cursor.
 timeline.splice(0,timeline.length,...Array.from({length:20},(_,i)=>({id:`batch-${i}`,timestamp:clock,sourceApp:'chat',content:'x'.repeat(9000)})));
 lastTimestamp=null;response=JSON.stringify({summary:'批量事实',mirror:null,gaze:null,emotion:null,mood:null,openItems:[]});
 for(let i=0;i<4;i++) assert.equal((await summarizer.runSummarizationPipeline('Bulk','Bulk')).success,true);
 const seen=(records.get(key('Bulk'))||[]).flatMap(e=>e.sourceMessageIds);assert.equal(new Set(seen).size,20);assert.equal(seen.length,20);
 assert.equal((await summarizer.runSummarizationPipeline('Bulk','Bulk')).success,false);
 response='关系已经确认，保留此前发展的重要转折。';records.set(key('C'),[
  {id:'old-core',characterId:'C',type:'core',content:'之前仍在试探',createdAt:clock,metadata:{active:true}},
  {id:'long-new',characterId:'C',type:'long_term',content:'两人明确确认关系',createdAt:clock,sourceApp:'chat'}]);
 assert.equal((await load('core-memory-builder').runCoreMemoryPipeline('C','C')).success,true);
 assert.match(lastPrompt[1].content,/之前仍在试探/);assert.equal((records.get(key('C'))||[]).find(e=>e.id==='old-core').metadata.active,false);
 console.log('PASS: shared summary call, persona/source protocol, strict parsing/no partial writes, in-place completion, identity/access boundaries, bounded hybrid recall, inactive core filtering, actual default/custom/group cognition injection. No paid requests.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
