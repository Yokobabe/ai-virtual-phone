// Isolated preview only: no real user database or paid model requests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const compile=f=>ts.transpileModule(fs.readFileSync(path.join(root,f),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const out={};vm.runInNewContext(compile('lib/chat-retry-guidance.ts'),{exports:out});
const history=[{id:'u',sessionId:'s',role:'user',content:'hello',createdAt:'2026-10-02',status:'sent'}];
assert.equal(out.withRetryGuidance(history,'s','  '),history);
const guided=out.withRetryGuidance(history,'s','更自然，不要替我说话');
assert.equal(history.length,1);assert.equal(guided.length,2);assert.equal(guided[1].role,'system');assert.equal(guided[1].mediaType,'system_instruction');assert.match(guided[1].content,/更自然，不要替我说话/);
assert.equal(out.withRetryGuidance(history,'s','x'.repeat(3000))[1].content.split('\n')[1].length,2000);
(async()=>{
 const browser=await require(process.env.PLAYWRIGHT_MODULE||'playwright').chromium.launch({headless:true,executablePath:process.env.CHAT_TEST_BROWSER});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||u.protocol==='data:'?route.continue():route.abort();});
 const choose=async mode=>{
  await page.getByRole('button',{name:await page.locator('[data-beauty-preset="sp"]').count()?'聊天设置':'联系人详情',exact:true}).click();
  await page.locator('.chat-beauty-picker summary').click();await page.getByRole('group',{name:'选择美化预设'}).getByRole('button',{name:{sp:'SP',glass:'玻璃',classic:'经典'}[mode],exact:true}).click();
  await page.locator('.imessage-settings-page .page-back-btn').click();
 };
 const pressBottom=async()=>{
  const node=page.locator('.chat-bubble-role-assistant[data-msg-id]').last();
  await page.evaluate(()=>{const pane=document.querySelector('.chat-room-wrapper > .page-body');const row=[...pane.querySelectorAll('.chat-msg-wrapper[data-role="assistant"]')].at(-1);row.style.marginTop='650px';pane.scrollTop=pane.scrollHeight;});
  await page.waitForTimeout(200);const b=await node.boundingBox();
  const composer=await page.locator('.chat-input-bar').boundingBox();assert.ok(b.y+b.height<composer.y,'last bubble not covered by composer');
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
  await page.locator('.imessage-context-index').waitFor();await page.waitForTimeout(350);
  const menu=await page.locator('.imessage-context-index').boundingBox();assert.ok(menu.y>=0&&menu.y+menu.height<=composer.y+1,'bottom menu fits above composer');
 };
 try {
  await page.goto('http://127.0.0.1:3003/dev/imessage26');await page.locator('.imessage-contact-card').waitFor();
  await choose('sp');await pressBottom();
  await page.getByRole('button',{name:'重试一下',exact:true}).click();await page.getByRole('dialog',{name:'重试指导'}).waitFor();
  const count=await page.locator('[data-msg-id]').count();await page.getByRole('textbox',{name:'重试指导'}).fill('更自然，不要替我说话');
  await page.screenshot({path:path.join(root,'tmp/sp-retry-guidance.png')});
  await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.locator('[data-msg-id]').count(),count,'cancel never deletes chat');
  await page.addScriptTag({content:`window.exports={};${compile('lib/message-effects/capture.ts')}`});
  const tail=await page.evaluate(()=>{
   const node=document.querySelector('.chat-bubble-role-user[data-msg-id]'),row=node.closest('.chat-msg-wrapper');
   row.setAttribute('data-imessage-tail','');const a=window.exports.captureEchoBubble(node);row.removeAttribute('data-imessage-tail');const b=window.exports.captureEchoBubble(node);
   const basicA=window.exports.captureBubble(node);row.setAttribute('data-imessage-tail','');const basicB=window.exports.captureBubble(node);
   return {same:a.sprite.toDataURL()===b.sprite.toDataURL(),size:a.width===b.width&&a.height===b.height,basic:basicA.sprite.toDataURL()===basicB.sprite.toDataURL()};
  });assert.ok(tail.same&&tail.size&&tail.basic,'SP capture never draws a tail or changes effect scale');
  await choose('glass');await pressBottom();await page.waitForTimeout(200);
  const light=await page.locator('.imessage-context-index .ctx-menu-btn:not(.ctx-menu-btn-danger)').first().evaluate(e=>getComputedStyle(e).color);assert.equal(light,'rgb(22, 25, 30)','light glass menu uses dark ink');
  await page.screenshot({path:path.join(root,'tmp/glass-menu-readable.png')});
  await page.locator('.chat-room-wrapper').click({position:{x:5,y:400}});
  await page.emulateMedia({colorScheme:'dark'});await pressBottom();await page.waitForTimeout(200);
  const dark=await page.locator('.imessage-context-index .ctx-menu-btn:not(.ctx-menu-btn-danger)').first().evaluate(e=>getComputedStyle(e).color);assert.equal(dark,'rgb(248, 250, 252)','dark glass menu uses light ink');
  assert.deepEqual(errors,[]);console.log('PASS: request-local retry instruction, unchanged cancel history, SP bottom long press/menu bounds, tail-free SP capture with same scale, light/dark glass menu ink. No model called.');
 } finally {await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
