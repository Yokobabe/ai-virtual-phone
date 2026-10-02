const fs = require('fs'), assert = require('node:assert/strict');
(async () => {
  const browser = await require(process.env.PLAYWRIGHT_MODULE || 'playwright').chromium.launch({headless:true, executablePath:process.env.CHAT_TEST_BROWSER});
  try {
    const page = await browser.newPage();
    const base = ['styles/chat.css','styles/imessage26.css'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
    const current = fs.readFileSync('styles/chat-sp.css','utf8');
    const before = current.replace(/\/\* NJJ V37 detached quotes:[\s\S]*?(?=\/\* Single row:)/, '');
    const read = () => page.evaluate(() => {
      const get = (s,p)=>getComputedStyle(document.querySelector(s),p);
      const q=get('.chat-quote-message-assistant .chat-quote-preview');
      return {bg:q.backgroundColor,ink:q.color,radius:q.borderRadius,border:q.borderLeftWidth,font:q.fontSize,
        label:get('.chat-quote-message-assistant .chat-quote-preview','::before').content,
        connector:get('.chat-quote-connector').display,tail:get('.chat-quote-reply > .imessage-bubble-surface','::before').content,
        previewSurface:get('.imessage-quote-compose-bubble > .imessage-bubble-surface').display,
        userBg:get('.chat-quote-message-user .chat-quote-reply > .imessage-bubble-surface').backgroundColor,
        closeWidth:get('.imessage-quote-compose-close').width,
        overflow:document.documentElement.scrollWidth > innerWidth};
    });
    for(const width of [320,390,430]) for(const dark of [false,true]) for(const preset of ['sp','classic','glass']) {
      await page.setViewportSize({width,height:844});
      const attrs=`data-imessage-private data-imessage-quote-compose data-beauty-preset="${preset}" ${dark?'data-chat-dark':''} ${preset==='glass'?'data-glass-bubbles':''}`;
      const quote = role=>`<div class="chat-quote-message chat-quote-message-${role}" style="--quote-source-bg:red"><span class="chat-quote-connector"></span><div class="chat-quote-preview">引用一段较长的文字来确认窄屏不会溢出 long quoted message to verify wrapping</div><div class="chat-quote-reply"><span class="imessage-bubble-surface"></span>回复内容</div></div>`;
      const html=`<style>body{margin:0}.chat-room-wrapper{width:100%;--im26-edge:16px}</style><div class="chat-room-wrapper" ${attrs}><div class="page-body">${quote('user')}${quote('assistant')}</div><div class="chat-input-bar" data-imessage-private><div class="imessage-quote-compose-layer" data-quote-role="user"><div class="imessage-quote-compose-bubble" data-role="user"><span class="imessage-bubble-surface"></span>待发送引用</div><button class="imessage-quote-compose-close" onclick="this.parentElement.remove()">×</button></div></div></div>`;
      await page.setContent(html); await page.addStyleTag({content:base+before}); const old=await read();
      await page.setContent(html); await page.addStyleTag({content:base+current}); const state=await read();
      if(preset!=='sp') assert.deepEqual(state,old,`${preset} unchanged`);
      else {
        assert.equal(state.bg,dark?'rgb(53, 38, 49)':'rgb(255, 240, 246)');
        assert.equal(state.radius,'20px'); assert.equal(state.border,'0px'); assert.equal(state.font,'13px');
        assert.equal(state.label,'"对方回复了"'); assert.equal(state.connector,'none'); assert.equal(state.tail,'none');
        assert.equal(state.previewSurface,'none'); assert.equal(state.closeWidth,'40px'); assert.equal(state.overflow,false);
        assert.equal(state.userBg,dark?'rgb(35, 78, 212)':'rgb(0, 47, 167)');
        await page.locator('.imessage-quote-compose-close').click(); assert.equal(await page.locator('.imessage-quote-compose-layer').count(),0);
      }
    }
    console.log('PASS SP quotes: day/night, 320/390/430px, pink/gray, tail-free, close; classic/glass unchanged. Isolated browser fixture, no user data/model calls.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
