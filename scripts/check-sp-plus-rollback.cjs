const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{for(const file of ['components/chat/chat-room.tsx','components/chat/chat-settings-panel.tsx'])assert.ok(!fs.readFileSync(file,'utf8').includes('PwaHeaderBlur'));
assert.ok(!fs.existsSync('components/chat/pwa-header-blur-experiment.tsx'));
const browser=await require(process.env.PLAYWRIGHT_MODULE||'playwright').chromium.launch({headless:true,executablePath:process.env.CHAT_TEST_BROWSER});try{
const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent('<div class="chat-room-wrapper" data-imessage-private data-beauty-preset="sp"><div class="chat-input-bar" data-imessage-private><button class="chat-plus-toggle"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button></div></div>');
for(const file of ['styles/chat.css','styles/imessage26.css','styles/chat-sp.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
const state=await page.locator('.chat-plus-toggle').evaluate(e=>{const c=getComputedStyle(e),s=getComputedStyle(e.querySelector('svg'));return {icon:s.width,height:s.height,button:c.width,bg:c.backgroundColor}});assert.equal(state.icon,'26px');assert.equal(state.height,'26px');assert.equal(state.button,'36px');assert.equal(state.bg,'rgb(245, 205, 221)');
console.log('PASS both PWA experiments unreachable/removed; SP plus 26px, 36px pink circle unchanged. Isolated browser only.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
