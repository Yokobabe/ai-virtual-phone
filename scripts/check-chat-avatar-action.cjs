const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let history=[],chars=[{id:'c1',name:'A',avatar:'data:image/png;base64,PROFILE_A'},{id:'c2',name:'B',avatar:'data:image/png;base64,PROFILE_B'}],notices=[];
let sessions=[{id:'s1',contactId:'c1'},{id:'g1',isGroup:true,participantIds:['c1','c2']}];
const avatar={
 getChatCharacterAvatar:(s,c)=>Object.prototype.hasOwnProperty.call(s?.characterAvatars||{},c.id)?s.characterAvatars[c.id]:c.avatar,
 getChatCharacterAvatarHistory:(s,id)=>s?.characterAvatarHistories?.[id]||[],
 CHAT_SESSION_AVATARS_UPDATED_EVENT:'chat-session-avatars-updated',
};
const sandbox={exports:{},Date,Map,Set,require:id=>id==='./chat-storage'?{
 loadChatMessages:()=>history,loadChatSessions:()=>sessions,saveChatSessions:s=>{sessions=s;},pushChatMessage:m=>notices.push(m),
 normalizeVisionImagePromptLimit:v=>v==null?1:Math.max(0,Math.min(20,Math.floor(v))),MAX_VISION_IMAGE_PROMPT_LIMIT:20,
}:id==='./chat-session-avatar'?avatar:id==='./character-storage'?{loadCharacters:()=>chars}:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chat-avatar-action.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const {buildAvatarActionPrompt:build,applyAvatarAction:apply}=sandbox.exports;
const photo=(id,sessionId='s1')=>({id,sessionId,role:'user',content:'换头像，用这张',mediaType:'image',mediaUrl:`data:image/png;base64,${id}==`});
history=[photo('p1')];build('s1','c1',history,history.map(x=>({...x})),true);
assert.equal(apply('s1','c1','p1'),true);
assert.equal(chars[0].avatar,'data:image/png;base64,PROFILE_A','profile avatar stays untouched');
assert.equal(sessions[0].characterAvatars.c1,history[0].mediaUrl,'private chat avatar changes');
assert.equal(sessions[0].characterAvatarHistories.c1.length,2,'chat-local avatar history remembers old and new');
assert.equal(apply('s1','c1','p1'),false,'duplicate action is rejected');
history=[photo('p2','g1')];build('g1','c2',history,history.map(x=>({...x})),true);
assert.equal(apply('g1','c2','p2'),true);
assert.equal(chars[1].avatar,'data:image/png;base64,PROFILE_B','group avatar action does not mutate profile');
assert.equal(sessions[1].characterAvatars.c2,history[0].mediaUrl,'group chat avatar changes independently');
assert.ok(notices.some(m=>m.content.includes('更换了头像')));
console.log('PASS: avatar actions update private/group chat state and history without mutating character profiles.');
