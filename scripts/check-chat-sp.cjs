const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHAT_TEST_BROWSER });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const choosePreset = async preset => {
    await page.locator('.chat-beauty-picker summary').click();
    await page.getByRole('group', { name: '选择美化预设', exact: true }).getByRole('button', { name: { sp: 'SP', glass: '玻璃', classic: '经典' }[preset], exact: true }).click();
    assert.equal(await page.locator('.chat-beauty-picker[open]').count(), 0, 'selection closes picker');
  };
  page.on('pageerror', error => console.error('preview page error:', error.message));
  // Fresh isolated context; never touch the user's browser database or call a model.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol === 'data:' ? route.continue() : route.abort();
  });
  try {
    await page.goto('http://127.0.0.1:3003/dev/imessage26', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('.imessage-contact-card').waitFor({ timeout: 120000 });
    await page.getByRole('button', { name: '联系人详情', exact: true }).click();
    assert.equal(await page.locator('.imessage-settings-page .menu-label').filter({hasText:'Tapback 候选'}).count(),0,'redundant Tapback setting hidden');
    await page.locator('.chat-beauty-picker summary').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.chat-beauty-picker[open]').count(),0,'Escape closes picker');
    await page.locator('.chat-beauty-picker summary').click();
    await page.getByText('美化预设',{exact:true}).click();
    assert.equal(await page.locator('.chat-beauty-picker[open]').count(),0,'outside tap closes picker');
    await choosePreset('sp');
    // Close the mounted settings via its real back button.
    await page.locator('.imessage-settings-page .page-back-btn').click();
    const room = page.locator('.chat-room-wrapper[data-beauty-preset="sp"]');
    await room.waitFor();
    const result = await page.evaluate(() => {
      const get = s => getComputedStyle(document.querySelector(s));
      return { user: get('.chat-bubble-role-user .imessage-bubble-surface').backgroundColor,
        char: get('.chat-bubble-role-assistant .imessage-bubble-surface').backgroundColor,
        plus: get('.chat-plus-toggle').backgroundColor,
        emoji: get('.imessage-composer-emoji').display,
        subject: get('.imessage-composer-subject-label').display,
        avatar: document.querySelector('.sp-header-avatar').getBoundingClientRect().width };
    });
    assert.equal(result.user, 'rgb(0, 47, 167)'); assert.equal(result.char, 'rgb(241, 243, 248)');
    assert.equal(result.plus, 'rgb(245, 205, 221)'); assert.equal(result.emoji, 'none'); assert.equal(result.subject, 'none'); assert.equal(result.avatar, 42);
    assert.equal(await page.locator('.imessage-header-back').evaluate(e => getComputedStyle(e).boxShadow), 'none');
    fs.mkdirSync(path.resolve(__dirname, '../qa/sp'), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, '../qa/sp/day.png') });
    await page.locator('.chat-input-textarea').fill('SP 预设验收，不发送。');
    await page.screenshot({ path: path.resolve(__dirname, '../qa/sp/input.png') });
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const geometry = await page.locator('.chat-input-bar').evaluate(e => ({ height: e.getBoundingClientRect().height,
        controls: [...e.querySelectorAll('.chat-plus-toggle,.chat-send-btn,.imessage-composer-sticker,.chat-voice-message-btn')].filter(n => getComputedStyle(n).display !== 'none').map(n => {
          const r = n.getBoundingClientRect(); return { x: r.x, right: r.right, center: r.y + r.height / 2 };
        }) }));
      assert(geometry.height < 100, 'single-row composer');
      assert(geometry.controls.every(r => r.x >= 0 && r.right <= width), 'controls fit narrow viewport');
      assert(Math.max(...geometry.controls.map(r => r.center)) - Math.min(...geometry.controls.map(r => r.center)) < 4, 'controls share one row');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.locator('.chat-room-wrapper[data-chat-dark]').waitFor();
    assert.equal(await page.locator('.chat-bubble-role-user .imessage-bubble-surface').first().evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(35, 78, 212)');
    assert.equal(await page.locator('.chat-bubble-role-assistant .imessage-bubble-surface').first().evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(41, 45, 53)');
    await page.screenshot({ path: path.resolve(__dirname, '../qa/sp/night.png') });
    assert.equal(await page.locator('.sp-header-actions button').count(), 3);
    assert.equal(await page.getByRole('button', { name: '联系人详情', exact: true }).count(), 0);
    assert.equal(await page.locator('.imessage-composer-ai-reply').evaluate(e => getComputedStyle(e).display), 'none');
    assert.equal(await page.locator('.chat-send-btn').evaluate(e => getComputedStyle(e).display), 'grid');
    await page.locator('.chat-input-textarea').fill('');
    assert.equal(await page.locator('.chat-send-btn').evaluate(e => getComputedStyle(e).display), 'grid');
    assert.equal(await page.locator('.chat-voice-message-btn').evaluate(e => getComputedStyle(e).display), 'grid');
    assert(await page.getByRole('button', { name: '查看内心资料卡', exact: true }).count() > 0);
    // Add a thought only to this disposable browser context, never the user's storage.
    await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('AiPhoneChatDB');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction(['messages', 'sessions'], 'readwrite'), store = tx.objectStore('messages');
        tx.objectStore('sessions').put({ id: 'sp-test-other-chat', contactId: 'sp-test-other', unreadCount: 3, updatedAt: new Date().toISOString(), isPinned: false });
        const get = store.getAll();
        get.onsuccess = () => { const message = get.result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).find(m => m.role === 'assistant'); message.innerMonologue = '这是已保存的内心独白。保持真实正文，不生成新的角色想法。'; message.reasoningText = '示例模型思维过程，来自测试数据。'; store.put(message); };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
      };
    }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '联系人详情', exact: true }).click();
    await choosePreset('sp');
    await page.locator('.menu-item').filter({ has: page.getByText('折叠中文译文', { exact: true }) }).locator('.menu-right button').click();
    await page.locator('.imessage-settings-page .page-back-btn').click();
    await page.locator('.sp-unread-count').waitFor();
    assert.equal(await page.locator('.sp-unread-count').innerText(), '3');
    assert.equal(await page.locator('.sp-unread-dot').count(), 0);
    assert.equal(await page.locator('.chat-unread-pill').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(35, 78, 212)');
    assert.equal(await page.locator('.sp-unread-count').evaluate(e => getComputedStyle(e).color), 'rgb(255, 255, 255)');
    assert.equal(await page.locator('.chat-bilingual-divider').first().evaluate(e => getComputedStyle(e).display), 'none');
    assert.equal(await page.locator('.chat-msg-avatar .group-mention-avatar').first().evaluate(e => e.getBoundingClientRect().width), 32);
    await page.getByRole('button', { name: '查看内心资料卡', exact: true }).first().click();
    await page.locator('.sp-thought-card').waitFor();
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const position = await page.locator('.sp-thought-card').evaluate(card => {
        const parent = card.parentElement, name = parent.querySelector('.sp-reply-signature').getBoundingClientRect();
        const bubble = parent.querySelector('[data-ui="bubble-bot"]').getBoundingClientRect();
        const r = card.getBoundingClientRect();
        return { cardX: r.x, bubbleX: bubble.x, cardTop: r.top, cardBottom: r.bottom, nameBottom: name.bottom, bubbleTop: bubble.top, right: r.right };
      });
      assert(Math.abs(position.cardX - position.bubbleX) < 1, 'card and bubble share left edge');
      assert(position.cardTop >= position.nameBottom && position.cardBottom <= position.bubbleTop, 'name -> card -> bubble');
      assert(position.right <= width, 'card fits viewport');
      const inset = await page.locator('.chat-msg-wrapper[data-role="assistant"] > .chat-msg-avatar').first().evaluate(e => e.getBoundingClientRect().left - e.closest('.chat-room-wrapper').getBoundingClientRect().left);
      assert(Math.abs(inset - 12) < 1, `SP avatar is 12px from left edge, got ${inset}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert((await page.locator('.sp-thought-content').innerText()).includes('这是已保存的内心独白'));
    await page.locator('.sp-thought-card').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.resolve(__dirname, '../qa/sp/thought-night.png') });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(async () => { const image = new Image(); image.src = '/sp/thought-profile-light.svg'; await image.decode(); });
    await page.locator('.sp-thought-card').screenshot({ path: path.resolve(__dirname, '../qa/sp/thought-day.png') });
    await page.getByRole('tab', { name: 'Replies', exact: true }).click();
    assert((await page.getByRole('tabpanel').innerText()).includes('示例模型思维过程'));
    await page.getByRole('tab', { name: 'Tweets', exact: true }).click();
    assert((await page.getByRole('tabpanel').innerText()).includes('这是已保存的内心独白'));
    await page.getByRole('button', { name: '关闭内心资料卡', exact: true }).click();
    // Count formatting and empty-state checks in the disposable database.
    for (const count of [12, 123, 0]) {
      await page.evaluate(count => new Promise((resolve, reject) => {
        const request = indexedDB.open('AiPhoneChatDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('sessions', 'readwrite');
          tx.objectStore('sessions').put({ id: 'sp-test-other-chat', contactId: 'sp-test-other', unreadCount: count, updatedAt: new Date().toISOString(), isPinned: false });
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
        };
      }), count);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '联系人详情', exact: true }).click();
      await choosePreset('sp');
      await page.locator('.imessage-settings-page .page-back-btn').click();
      if (count) {
        await page.locator('.sp-unread-count').waitFor();
        assert.equal(await page.locator('.sp-unread-count').innerText(), count > 99 ? '99+' : String(count));
        for (const width of [320, 390, 430]) {
          await page.setViewportSize({ width, height: 844 });
          const rect = await page.locator('.sp-header-actions').evaluate(e => ({ right: e.getBoundingClientRect().right, top: e.getBoundingClientRect().top }));
          assert(rect.right <= width, 'unread capsule does not push actions offscreen');
        }
        if (count > 99) await page.screenshot({ path: path.resolve(__dirname, '../qa/sp/unread-99plus.png') });
      } else assert.equal(await page.locator('.chat-unread-pill').count(), 0);
    }
    assert.equal(await page.locator('.sp-thought-card').count(), 0);
    await page.getByRole('button', { name: '查看内心资料卡', exact: true }).last().click();
    await page.getByRole('tab', { name: 'Replies', exact: true }).click();
    assert.equal((await page.getByRole('tabpanel').innerText()).trim(), '');
    await page.getByRole('button', { name: '关闭内心资料卡', exact: true }).click();
    await page.getByRole('button', { name: '聊天设置', exact: true }).click();
    await choosePreset('glass');
    await page.locator('.imessage-settings-page .page-back-btn').click();
    assert.equal(await page.locator('.chat-room-wrapper[data-glass-bubbles]').count(), 1);
    await page.getByRole('button', { name: '联系人详情', exact: true }).click();
    await choosePreset('classic');
    await page.locator('.imessage-settings-page .page-back-btn').click();
    assert.equal(await page.locator('.chat-room-wrapper[data-glass-bubbles]').count(), 0);
    console.log('PASS SP: day/night, 320/390/430 aligned permanent mic/sticker/send, separate header settings + real unread capsule, reply avatar/signature, no translation divider, Tweets/Replies populated/empty, classic/glass restored; no model called.');
  } finally { await context.close(); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
