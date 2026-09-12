const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('lib/chat-avatar-action.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){
 const state={history:[],chars:[{id:'a',name:'A',avatar:'old'},{id:'b',name:'B',avatar:'other'}],notices:[]};
 const sessions=[{id:'s',contactId:'a'},{id:'g',isGroup:true,participantIds:['a','b']}];
 const sandbox={exports:{},Date,Map,Set,require:id=>id==='./chat-storage'?{
  loadChatMessages:()=>state.history,loadChatSessions:()=>sessions,pushChatMessage:m=>state.notices.push(m),
  normalizeVisionImagePromptLimit:value=>value==null?1:Math.max(0,Math.min(20,Math.floor(value))),MAX_VISION_IMAGE_PROMPT_LIMIT:20
 }:{loadCharacters:()=>state.chars,saveCharacters:chars=>{state.chars=chars;}}};
 vm.runInNewContext(source,sandbox);
 return {...sandbox.exports,state,build:(char='a',session='s',enabled=true,vision=state.history)=>sandbox.exports.buildAvatarActionPrompt(session,char,state.history,vision.map(m=>({...m})),enabled)};
}
const photo=(id='p1',content='这是头像候选，你想换哪张？',sessionId='s')=>({id,sessionId,role:'user',content,mediaType:'image',mediaUrl:`data:image/png;base64,${id}==`});
const text=(id,content,role='user',sessionId='s')=>({id,sessionId,role,content});
for(const mode of ['ordinary','no-vision','missing-image','fabricated','cross-character','retracted','changed-source','declined','expired-turn']){
 const f=fixture(),s=f.state;s.history=[photo()];
 if(mode==='ordinary')s.history[0].content='今天拍的风景';
 f.build('a','s',mode!=='no-vision',mode==='missing-image'?[{...s.history[0],mediaUrl:undefined}]:s.history);
 if(mode==='retracted')s.history[0].isRetracted=true;
 if(mode==='changed-source')s.history[0].mediaUrl='data:image/png;base64,changed==';
 if(mode==='declined')s.history.push(text('u2','别换了'));
 if(mode==='expired-turn')s.history.push(text('u2','晚饭吃什么'));
 assert.equal(f.applyAvatarAction('s',mode==='cross-character'?'b':'a',mode==='fabricated'?'invented':'p1'),false,mode);
 assert.equal(s.chars[0].avatar,'old',mode);
}
{
 const f=fixture(),s=f.state;
 s.history=[photo('p1','换头像吧','g')];f.build('a','g');assert.equal(f.applyAvatarAction('g','a','p1'),true);
 s.history.push(photo('p2','你俩用这张吧','g'));f.build('a','g');f.build('b','g');
 assert.equal(f.applyAvatarAction('g','a','p1'),false);
 assert.match(s.notices.at(-1).content,/已是当前头像/);
 const noticeCount=s.notices.length;f.applyAvatarAction('g','a','p1');assert.equal(s.notices.length,noticeCount);
 assert.equal(f.applyAvatarAction('g','b','p2'),true);
 for(let i=0;i<40;i++)s.history.push(text(`reply${i}`,'好的！','assistant','g'));
 assert.equal(f.applyAvatarAction('g','a','p2'),true);
 assert.equal(s.chars[0].avatar,s.chars[1].avatar);
 assert.equal(s.chars[0].avatar,photo('p2').mediaUrl);
 f.build('a','g');assert.equal(f.applyAvatarAction('g','a','p1'),false);
 s.history.push(photo('p3','换另一张，和我用一对','g'));f.build('b','g');f.build('a','g');
 assert.equal(f.applyAvatarAction('g','a','p3'),true);assert.equal(f.applyAvatarAction('g','b','p3'),true);
 assert.equal(s.notices.filter(m=>m.content==='A 更换了头像').length,3);
 assert.equal(s.notices.filter(m=>m.content==='B 更换了头像').length,2);
}
{
 const f=fixture(),s=f.state;
 s.history=[text('u1','想不想一起换情侣头像？'),text('a1','可以，你发来我选。','assistant')];
 for(let i=0;i<35;i++)s.history.push(text(`a${i+2}`,'群聊碎片','assistant'));
 s.history.push(photo('p2','就这个吧'));
 assert.equal(f.isAvatarDiscussion(s.history),true);f.build();
 f.build('a','s',false);
 assert.equal(f.applyAvatarAction('s','a','p2'),true);
}
{
 const f=fixture(),s=f.state;s.history=[photo()];f.build();
 s.history[0].mediaUrl='data:image/png;base64,edited==';f.build();
 assert.equal(f.applyAvatarAction('s','a','p1'),false,'Rebuilding must not replace the original source binding');
}
for(const content of ['用这张吧','你俩一起换','你们一人一张','换另一张','和我用这张','use this picture']){
 const f=fixture();f.state.history=[photo('p1',content)];assert.equal(f.isAvatarDiscussion(f.state.history),true,content);
}
for(const content of ['不要换头像','别换了','先不用这张','只是分享一下','拿来做聊天背景']){
 const f=fixture();f.state.history=[photo(),text('u2',content)];assert.equal(f.isAvatarDiscussion(f.state.history),false,content);
}
console.log('PASS: group A previously changed + new photo for A/B; redundant old choice then new choice; 40 intervening bubbles; repeated rounds; natural follow-ups; preview/replay/source/denial guards and failure notices.');

{
 const f=fixture(),s=f.state;
 s.history=[photo('p1','','g'),photo('p2','','g'),photo('p3','','g'),text('u1','你们各选一张头像','user','g')];
 assert.equal(f.getAvatarVisionPromptLimit(s.history,undefined,true),3,'Default 1 must not hide two photos in the same avatar batch');
 assert.equal(f.getAvatarVisionPromptLimit(s.history,0,true),0);
 assert.equal(f.getAvatarVisionPromptLimit(s.history,1,false),1);
 assert.equal(f.getAvatarVisionPromptLimit(s.history,10,true),10);
 const normal=[photo('n1','风景','g'),photo('n2','今天拍的','g')];
 assert.equal(f.getAvatarVisionPromptLimit(normal,1,true),1,'Ordinary chat retains configured budget');
 const large=Array.from({length:25},(_,i)=>photo(`many${i}`,'','g')).concat(text('u2','各挑一张头像','user','g'));
 assert.equal(f.getAvatarVisionPromptLimit(large,1,true),20);
 const invited=[text('invite','发来头像候选，我来挑','assistant','g'),...Array.from({length:12},(_,i)=>photo(`batch${i}`,'','g'))];
 assert.equal(f.getAvatarVisionPromptLimit(invited,1,true),12,'A multi-photo user turn must not erase the preceding invitation');
 const separate=[photo('old','','g'),text('reply','收到','assistant','g'),photo('new','用这张头像','g')];
 assert.equal(f.getAvatarVisionPromptLimit(separate,1,true),1,'Do not expand to all historical photos');
 // Exercise the real engine's image limiter, not a copy of it.
 const engine=ts.createSourceFile('engine.ts',fs.readFileSync('lib/chat-engine.ts','utf8'),ts.ScriptTarget.Latest,true);
 const wanted=new Set(['isVisionPromptImageMessage','hasVisionPromptImageData','stripVisionPromptImageData','applyVisionImagePromptLimit']);
 const limiterSource=engine.statements.filter(n=>ts.isFunctionDeclaration(n)&&wanted.has(n.name?.text)).map(n=>n.getText(engine)).join('\n');
 const limitSandbox={exports:{},normalizeVisionImagePromptLimit:n=>n};
 vm.runInNewContext(ts.transpileModule(limiterSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,limitSandbox);
 const visible=limitSandbox.exports.applyVisionImagePromptLimit(s.history.map(m=>({...m})),f.getAvatarVisionPromptLimit(s.history,1,true));
 assert.equal(visible.filter(m=>m.mediaUrl).length,3);
 let context=f.buildGroupAvatarContext('g',s.history,visible,true);
 assert.match(context,/第1张 → p1/);assert.match(context,/第2张 → p2/);assert.match(context,/第3张 → p3/);
 assert.match(context,/已经有人使用的图片仍可选/);assert.match(context,/争抢同款、拒绝/);
 assert.doesNotMatch(context,/先协调本轮分配|严格按分配|应选不同的图片ID|用户明确要同款.*可以共用/);
 assert.equal(visible[0].content.match(/共享选图顺序/g).length,1);
 f.buildGroupAvatarContext('g',s.history,visible,true);
 assert.equal(visible[0].content.match(/共享选图顺序/g).length,1,'Do not duplicate shared labels');
 f.build('a','g',true,visible);f.build('b','g',true,visible);
 assert.equal(f.applyAvatarAction('g','a','p1'),true);assert.equal(f.applyAvatarAction('g','b','p2'),true);
 context=f.buildGroupAvatarContext('g',s.history,visible,true);
 assert.match(context,/A：当前用第1张（p1）/);assert.match(context,/B：当前用第2张（p2）/);
 // No explicit user permission to use the same photo is necessary: characters
 // may independently choose an already-used image, without an ownership lock.
 s.history.push(text('u2','这些头像，你们自己想想','user','g'));
 f.build('a','g');f.build('b','g');
 assert.equal(f.applyAvatarAction('g','a','p3'),true);assert.equal(f.applyAvatarAction('g','b','p3'),true);
 assert.equal(f.buildGroupAvatarContext('g',s.history,visible,false),'');
 assert.equal(f.buildGroupAvatarContext('s',s.history,visible,true),'');
}
console.log('PASS: avatar-only batch vision 1→3, normal/off/20-image cap, shared ordering & live A/B ownership; no allocation instructions and independent same-photo choices remain allowed.');
