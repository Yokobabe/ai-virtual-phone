const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let history=[],chars=[{id:'c1',name:'A',avatar:'old'},{id:'c2',name:'B',avatar:'other'}],notices=[];
const sessions=[{id:'s1',contactId:'c1'},{id:'g1',isGroup:true,participantIds:['c1','c2']}];
const sandbox={exports:{},Date,Map,require:id=>id==='./chat-storage'?{loadChatMessages:()=>history,loadChatSessions:()=>sessions,pushChatMessage:m=>notices.push(m)}:{loadCharacters:()=>chars,saveCharacters:c=>{chars=c;}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chat-avatar-action.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
const {buildAvatarActionPrompt:build,applyAvatarAction:apply}=sandbox.exports;
const photo=(content='这两张是头像候选，你想换哪张？')=>({id:'i1',sessionId:'s1',role:'user',content,mediaType:'image',mediaUrl:'data:image/png;base64,AA=='});
function issue(enabled=true){return build('s1','c1',history,history.map(x=>({...x})),enabled);}
history=[photo('今天拍的风景')];issue();assert.equal(apply('s1','c1','i1'),false);
history=[photo()];issue(false);assert.equal(apply('s1','c1','i1'),false);
issue();assert.equal(apply('s1','c1','invented'),false);assert.equal(apply('s1','c2','i1'),false);
assert.equal(apply('s1','c1','i1'),true);assert.equal(chars[0].avatar,history[0].mediaUrl);assert.equal(chars[1].avatar,'other');assert.equal(notices.filter(m=>m.content==='A 更换了头像').length,1);assert.equal(apply('s1','c1','i1'),false);
history=[photo('不要换头像')];issue();assert.equal(apply('s1','c1','i1'),false);
history=[photo()];build('s1','c1',history,[{...history[0],mediaUrl:undefined}],true);assert.equal(apply('s1','c1','i1'),false);
issue();history[0].isRetracted=true;assert.equal(apply('s1','c1','i1'),false);
history=[photo()];issue();history[0].mediaUrl='data:image/png;base64,BB==';assert.equal(apply('s1','c1','i1'),false);
history=[{...photo(),sessionId:'g1',mediaUrl:'data:image/png;base64,CC=='}];build('g1','c2',history,history.map(x=>({...x})),true);assert.equal(apply('g1','c2','i1'),true);assert.equal(chars[1].avatar,history[0].mediaUrl);
console.log('PASS: non-avatar photos, no vision, missing image, fabricated ID, cross-character, retraction, changed source, replay rejected; private/group self-avatar updates and notice.');
// Fresh per-scenario stores ensure negative tests are not merely passing because
// an earlier turn was consumed. Also covers repeated private/group-style turns.
require('./check-chat-avatar-group-rounds.cjs');
