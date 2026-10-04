// Actual 3003 UI, fresh profile and synthetic records. Blocks external/paid requests.
const assert = require('node:assert/strict');
const { Script } = require('node:vm');
const { paletteRuntime } = require('./check-memory-entry-palette.cjs');
const { chromium, webkit } = require('C:/Users/Effy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function main() {
 const engine=process.env.MEMORY_TEST_BROWSER==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit.launch({headless:true}):chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}));
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}), errors=[];
  const cdp=engine==='chromium'?await page.context().newCDPSession(page):null;
  if(cdp){await cdp.send('Runtime.enable');cdp.on('Runtime.exceptionThrown',({exceptionDetails:d})=>console.log('EXCEPTION SOURCE',JSON.stringify({url:d.url,line:d.lineNumber,column:d.columnNumber,description:d.exception?.description?.slice(0,180)})));}
  page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR',e.message)});
  await page.route('**/api/**',route=>route.abort());
  await page.route('https://**/*',route=>route.abort());
  // Buffer local dev chunks so a partial/compressed transfer cannot corrupt the browser's script input.
  // Compilation only, never execution here; an actual syntax error still fails after three reads.
  await page.route('**/_next/static/chunks/**',async route=>{
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await route.fetch({headers:{'accept-encoding':'identity'},timeout:60000});const body=await response.body();
     new Script(body.toString('utf8'));
     await route.fulfill({response,body,headers:{...response.headers(),'content-encoding':'identity','content-length':String(body.length)}});return;
    }catch{
     if(!browser.isConnected()||page.isClosed())return;
     if(attempt===2){errors.push(`Local chunk transfer/parse failed: ${new URL(route.request().url()).pathname}`);await route.abort().catch(()=>{});}
    }
   }
  });
  await page.route('**/memory-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Memory fixture</title>'}));
  await page.goto('http://127.0.0.1:3003/memory-fixture');
  await page.evaluate(async avatarOnly=>{
   const now=new Date().toISOString();
   const open=async(name,version,upgrade)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>upgrade(r.result);return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})};
   const finish=tx=>new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});
   const db=await open('AiPhoneKvDB',10,d=>d.createObjectStore('entries',{keyPath:'key'}));
   const tx=db.transaction('entries','readwrite'),s=tx.objectStore('entries');
   const avatar='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="420" height="280"><defs><linearGradient id="g"><stop stop-color="#c2d9ea"/><stop offset="1" stop-color="#efbdd3"/></linearGradient></defs><rect width="420" height="280" fill="url(#g)"/><circle cx="250" cy="95" r="65" fill="#f7eeee"/><path d="M0 230Q80 80 200 230T420 190V280H0Z" fill="#a8c2da"/><path d="M0 240Q150 170 320 240T420 180V280H0Z" fill="#d7abc7"/><circle cx="115" cy="70" r="4" fill="white"/><circle cx="345" cy="140" r="3" fill="white"/></svg>');
   const raster=(width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#284878';ctx.fillRect(0,0,width,height);ctx.fillStyle='#edb5bc';ctx.fillRect(width*.25,height*.2,width*.5,height*.65);return canvas.toDataURL('image/png')};
   const rows={ai_phone_user_identities_v1:[{id:'A',name:'测试用户 A',avatarUrl:avatar,bio:'',gender:'保密',age:'',occupation:'',customSettings:''},{id:'B',name:'测试用户 B',bio:'',gender:'保密',age:'',occupation:'',customSettings:''}],
    ai_phone_characters_v1:[{id:'C',name:'沈言',avatar:avatarOnly?raster(240,600):avatar,persona:'沉稳温柔',personality:'克制',createdAt:now,updatedAt:now},{id:'D',name:'夏予',avatar:avatarOnly?raster(300,300):avatar,persona:'热情开朗',createdAt:now,updatedAt:now},{id:'E',name:'林溪',persona:'文静',createdAt:now,updatedAt:now},...(avatarOnly?[{id:'F',name:'横图角色',avatar,persona:'合成图片',createdAt:now,updatedAt:now}]:[])],
    ai_phone_bindings_v1:{globalDefaults:{userIdentityId:'A'},characterBindings:[]},float_identity_character_access_v1:{}};
   for(const [key,value]of Object.entries(rows))s.put({key,value:JSON.stringify(value)});
   await finish(tx);db.close();
   const mem=await open('ai_phone_memory_db_v1',4,d=>{d.createObjectStore('memories',{keyPath:'id'});d.createObjectStore('cognition',{keyPath:'characterId'})});
   const mt=mem.transaction(['memories','cognition'],'readwrite');
   const evidence=[{id:'msg-fixture',timestamp:now,sourceApp:'chat',excerpt:'我们周末去海边，好不好？'}];
   const facet={text:'愿意兑现与A的约定，关系正逐渐变得亲密。',evidence,updatedAt:now};
   mt.objectStore('cognition').put({version:1,characterId:'C',mirror:facet,gaze:{...facet,text:'A认真而柔软，他珍惜A的信任。'},emotion:{...facet,text:'轻松，带着期待。'},mood:{...facet,text:'期待周末的相处。'},updatedAt:now,openItems:[{id:'open-fixture',kind:'commitment',text:'周末一起去海边',status:'open',evidence,createdAt:now,updatedAt:now}]});
   mt.objectStore('memories').put({id:'long-fixture',characterId:'C',type:'long_term',sourceApp:'chat',content:'沈言与A约定周末去海边。',importance:.8,createdAt:now,updatedAt:now,metadata:{evidence}});
   for(let i=0;i<3;i++)mt.objectStore('memories').put({id:`d-${i}`,characterId:'D',type:'long_term',sourceApp:'chat',content:`夏予的记忆${i}`,importance:.8,createdAt:now,updatedAt:now});
   await finish(mt);mem.close();
   localStorage.setItem('float_identity_runtime_v1',JSON.stringify({version:1,activeUserId:'A',legacyOwnerId:'A',userIds:['A','B'],deletingUserIds:[],revision:0}));
   localStorage.setItem('ai_phone_chat_sessions_v1',JSON.stringify([{id:'chat-fixture',contactId:'C',unreadCount:0,isPinned:false,updatedAt:now,autoReplied:true}]));
   localStorage.setItem('ai_phone_chat_messages_v1',JSON.stringify([{id:'chat-user-fixture',sessionId:'chat-fixture',role:'user',content:'想和你一起看看海。',type:'text',status:'read',createdAt:now}]));
  },process.env.MEMORY_AVATAR_ONLY==='1');
  const enter=async()=>{
   // A dev rebuild can momentarily serve incomplete manifests. Require a ready HTTP response before opening the UI.
   for(let attempt=0;attempt<3;attempt++){const response=await page.request.get('http://127.0.0.1:3003/',{timeout:60000});if(response.status()===200)break;assert.ok(attempt<2,`3003 not ready: HTTP ${response.status()}`)}
   await page.goto('http://127.0.0.1:3003/',{waitUntil:'domcontentloaded',timeout:120000});
   const button=page.getByRole('button',{name:'Enter',exact:true});await button.waitFor({timeout:120000});
   await page.waitForFunction(()=>!document.querySelector('[aria-label="Enter"]')?.disabled,{},{timeout:60000}).catch(async error=>{console.log('STARTUP',await page.locator('body').innerText(),errors);throw error});
   await button.click();const notice=page.getByRole('button',{name:'我知道了',exact:true});if(await notice.waitFor({state:'visible',timeout:3000}).then(()=>true).catch(()=>false))await notice.click();
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('open-app',{detail:{appId:'resources'}})));
   await page.getByText('记忆库',{exact:true}).click();await page.getByRole('navigation',{name:'角色记忆入口'}).waitFor();
  };
  const openChar=async(name='沈言')=>{await page.getByRole('navigation',{name:'角色记忆入口'}).getByRole('button',{name:new RegExp(name)}).click();await page.getByRole('navigation',{name:'记忆栏目'}).waitFor()};
  const checkLayout=async(navName,file)=>{
   const nav=page.getByRole('navigation',{name:navName});
   assert.equal(await nav.getByRole('button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})),true,'Banner overflow');
   await page.screenshot({path:`tmp/${file}.png`});
   return nav.evaluate(n=>getComputedStyle(n.parentElement).backgroundColor);
  };
  await enter();
  if(process.env.MEMORY_AVATAR_ONLY==='1'){
   for(const width of [320,390,430])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:theme});
    await page.getByRole('navigation',{name:'角色记忆入口'}).locator('img').first().waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('nav[aria-label="角色记忆入口"] img')].every(n=>n.complete&&n.naturalWidth>0));
    await page.screenshot({path:`tmp/memory-avatar-${engine}-${width}-${theme}-${process.env.MEMORY_AVATAR_CAPTURE||'after'}.png`});
    const geometry=await page.getByRole('navigation',{name:'角色记忆入口'}).getByRole('button').evaluateAll(nodes=>nodes.map(card=>{
     const r=card.getBoundingClientRect(),banner=card.querySelector('[class*="banner"]'),b=banner.getBoundingClientRect(),img=banner.querySelector('img'),image=img?.getBoundingClientRect();
     return {name:card.querySelector('[class*="cardTitle"]').textContent,card:{top:r.top,bottom:r.bottom,height:r.height},banner:{top:b.top,bottom:b.bottom,height:b.height},image:image?{top:image.top,bottom:image.bottom,height:image.height}:null};
    }));
    console.log(engine,width,theme,JSON.stringify(geometry));
    if(process.env.MEMORY_AVATAR_CAPTURE)continue;
    for(const row of geometry){assert.ok(Math.abs(row.banner.top-row.card.top)<=2&&Math.abs(row.banner.bottom-row.card.bottom)<=2,`${engine}: Avatar banner does not fill card: ${row.name}`);if(row.image)assert.ok(row.image.top<=row.card.top+2&&row.image.bottom>=row.card.bottom-2,`${engine}: Avatar image is pushed below card: ${row.name}`)}
    assert.equal(await page.locator('[class*="hero"] img').first().evaluate(n=>n.complete&&n.naturalWidth>0&&n.getBoundingClientRect().height>=70),true,'Identity avatar missing');
   }
   assert.deepEqual(errors,[]);console.log(process.env.MEMORY_AVATAR_CAPTURE?`CAPTURE ONLY: ${engine} baseline, geometry assertions skipped.`:`PASS: ${engine} actual 3003 portrait/square/landscape avatars and placeholder full card bounds and identity image, 320/390/430 day/night.`);return;
  }
  const rootColors=await page.evaluate(()=>['--c-panel','--c-bubble-self','--c-icon-active'].map(key=>getComputedStyle(document.documentElement).getPropertyValue(key)));
  await page.getByRole('heading',{name:'测试用户 A',exact:true}).waitFor();
  const characterNav=page.getByRole('navigation',{name:'角色记忆入口'});
  const characterOrder=()=>characterNav.getByRole('button').evaluateAll(nodes=>nodes.map(n=>n.querySelector('[class*="cardTitle"]').childNodes[0].textContent));
  assert.equal(await characterNav.getByRole('button').count(),3);
  assert.deepEqual(await characterOrder(),['夏予','沈言','林溪'],'Default descending record count');
  assert.equal(await page.getByText('Memory · Link',{exact:true}).count(),1);
  assert.equal(await page.locator('[data-ui="header"]').getByText('Memory · Link',{exact:true}).count(),1,'Title belongs in header');
  assert.equal(await page.getByText('当前用户身份 · 选择一位角色，进入你们的记忆',{exact:true}).count(),0);
  assert.equal(await page.locator('[class*="heroIcons"]').count(),0);
  for(const width of [390,320])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:theme});
   const bg=await checkLayout('角色记忆入口',`memory-characters-${width}-${theme}`);assert.equal(bg,theme==='dark'?'rgb(28, 28, 30)':'rgb(255, 255, 255)','Neutral page background');
   await openChar();const nav=page.getByRole('navigation',{name:'记忆栏目'});assert.equal(await nav.getByRole('button').count(),5);
   assert.deepEqual(await nav.locator('[class*="cardEnglish"]').allTextContents(),['FACTS','CORE','LIST','MIRROR','GAZE']);
   assert.equal(await nav.locator('[class*="iconTile"]').count(),0,'No oversized icon squares');
   const layers=await nav.getByRole('button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,height:r.height}}));
   for(let i=0;i<layers.length;i++){assert.equal(layers[i].height,i===4?78:96);if(i)assert.equal(layers[i].top-layers[i-1].top,78,'Visible layer height');}
   assert.equal(await nav.getByRole('button').evaluateAll(nodes=>nodes.every(n=>['cardEnglish','cardDesc'].every(key=>{
    const r=n.querySelector(`[class*="${key}"]`).getBoundingClientRect();return n.contains(document.elementFromPoint(r.left+5,r.top+r.height/2));
   }))),true,'Layer titles/descriptions are not covered');
   assert.equal(await nav.locator('[class*="banner"]').count(),0,'No duplicated large section icons');
   await page.addScriptTag({content:paletteRuntime()});
   const expected=await page.evaluate(async dark=>{
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('AiPhoneKvDB');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    const row=await new Promise((resolve,reject)=>{const request=db.transaction('entries').objectStore('entries').get('ai_phone_characters_v1');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});db.close();
    const avatar=JSON.parse(row.value).find(c=>c.id==='C').avatar;
    const sample=await window.productionMemoryPalette.extractMemoryColors(avatar);
    return window.productionMemoryPalette.memoryPalette(sample,dark);
   },theme==='dark');
   await page.waitForFunction(expected=>{
    const nodes=[...document.querySelectorAll('nav[aria-label="记忆栏目"] button')];
    return nodes.every((n,i)=>n.style.getPropertyValue('--section-paper')===expected[i]);
   },expected);
   assert.equal(await nav.getByRole('button').evaluateAll(nodes=>{
    const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    return nodes.every(n=>{const bg=lum(getComputedStyle(n).backgroundColor);return [...n.querySelectorAll('[class*="cardEnglish"],[class*="cardDesc"],[class*="sectionCount"]')].every(text=>{
     const fg=lum(getComputedStyle(text).color);return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)>=4.5;
    });});
   }),true,'Day/night sampled palette text contrast');
   await checkLayout('记忆栏目',`memory-garden-${width}-${theme}`);await page.getByRole('button',{name:'返回',exact:true}).click();await page.getByRole('heading',{name:'测试用户 A',exact:true}).waitFor();
  }
  // Check real child views, editor and settings sheets in the same isolated 3003 profile.
  const checkControl=async(selector)=>{
   await page.waitForFunction(()=>{
    const root=document.querySelector('[data-memory-theme]');return root?.getAttribute('data-memory-theme')===(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
   });
   const button=page.locator(selector).first();await button.scrollIntoViewIfNeeded();
   const data=await button.evaluate(n=>{
    const root=n.closest('[data-memory-theme]'), styles=getComputedStyle(n),vars=getComputedStyle(root);
    const hex=vars.getPropertyValue('--memory-control').trim();
    const expected='rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';
    const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const a=lum(styles.backgroundColor),b=lum(styles.color);
    return {bg:styles.backgroundColor,expected,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
   });
   assert.equal(data.bg,data.expected,`Control inherits its column palette: ${selector}`);assert.ok(data.contrast>=4.5,`Control contrast: ${selector}`);
  };
  for(const width of [390,320])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:theme});await openChar();
   for(const key of ['facts','core','open','mirror','gaze']){
    await page.locator(`nav[aria-label="记忆栏目"] [data-section="${key}"]`).click();
    const selector=key==='facts'?'[aria-pressed="true"]':key==='core'?'.mem-empty-add-btn':key==='open'?'[class*="itemActions"] button':'[class*="updateRow"] button';
    await checkControl(selector);
    if(key==='facts'){
     await page.locator('.mem-tl-card').first().click();await page.locator('.mem-tl-bubble-text').getByText('想和你一起看看海。',{exact:true}).waitFor();
     await checkControl('.mem-tl-bubble-r .mem-tl-bubble-body');
     await page.getByRole('button',{name:'长期',exact:true}).click();await checkControl('.mem-entry-add-btn');
     await page.locator('.mem-entry-menu-btn').first().click();await page.getByText('编辑',{exact:true}).click();
     const editor=page.locator('.mem-edit-sheet');await editor.waitFor();await checkControl('.mem-edit-save-btn');
     await page.screenshot({path:`tmp/memory-editor-colors-${width}-${theme}.png`});await editor.locator('.modal-header-btn-muted').click();
     await page.locator('.mem-entry-clear-btn').click();
     const danger=page.locator('[data-ui="modal-dialog"] .ui-btn-danger');await danger.waitFor();
     assert.equal(await danger.evaluate(n=>getComputedStyle(n).backgroundColor),await danger.evaluate(n=>getComputedStyle(n).getPropertyValue('--c-danger').trim()).then(c=>{
      if(c.startsWith('#'))return 'rgb('+[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)).join(', ')+')';return c;
     }),'Destructive action keeps warning color');await page.getByRole('button',{name:'取消',exact:true}).click();
    }
    await page.screenshot({path:`tmp/memory-${key}-colors-${width}-${theme}.png`});await page.getByRole('button',{name:'返回',exact:true}).click();
   }
   await page.getByRole('button',{name:'更多',exact:true}).click();await page.locator('.memory-settings-menu').waitFor();
   const settings=page.locator('[data-memory-section="settings"]');
   assert.equal(await settings.locator('.ui-toggle').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).getPropertyValue('--memory-accent').trim())),true);
   await page.getByRole('button',{name:/记忆来源.*全部开启/}).click();
   await page.locator('.memory-source-sheet').waitFor();await checkControl('.memory-source-chip');
   const source=page.locator('.memory-source-chip').first();await source.click();assert.equal(await source.getAttribute('aria-pressed'),'false');await source.click();
   await page.screenshot({path:`tmp/memory-source-colors-${width}-${theme}.png`});await page.locator('.memory-source-sheet .modal-header-btn').click();
   await page.getByRole('button',{name:'总结',exact:true}).click();await page.getByRole('heading',{name:'选择总结范围',exact:true}).waitFor();
   await page.screenshot({path:`tmp/memory-range-colors-${width}-${theme}.png`});await page.locator('[data-ui="modal-sheet"] .modal-header-btn').click();
   const slider=page.getByRole('slider',{name:'短期记忆+最近上下文'});
   await slider.scrollIntoViewIfNeeded();await slider.focus();
   await page.screenshot({path:`tmp/memory-settings-colors-${width}-${theme}.png`});
   assert.equal(await settings.evaluate(n=>[...n.querySelectorAll('.menu-group')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})),true,'Settings narrow width');
   await page.getByRole('button',{name:'返回',exact:true}).click();await page.getByRole('navigation',{name:'记忆栏目'}).waitFor();
   await page.getByRole('button',{name:'返回',exact:true}).click();await characterNav.waitFor();
  }
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
  // Real touch long press opens the action dialog, release does not enter the character.
  const zeroCard=characterNav.getByRole('button',{name:/林溪/});const rect=await zeroCard.boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+30,y:rect.y+30}]});await page.waitForTimeout(650);
  await page.getByRole('dialog',{name:'林溪的记忆卡片操作'}).waitFor();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await characterNav.count(),1,'Long press must not navigate');
  await page.waitForTimeout(350);await page.screenshot({path:'tmp/memory-pin-dialog-390-light.png'});
  await page.getByRole('button',{name:'置顶',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(await characterOrder(),['林溪','夏予','沈言'],'Pin outranks memory count');
  await zeroCard.focus();await page.keyboard.press('Shift+F10');await page.getByRole('button',{name:'取消置顶',exact:true}).waitFor();
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await zeroCard.evaluate(n=>n===document.activeElement),true,'Return focus on close');
  await zeroCard.focus();await page.keyboard.press('Shift+F10');await page.getByRole('button',{name:'取消置顶',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(await characterOrder(),['夏予','沈言','林溪'],'Unpin restores count order');
  // Scrolling cancels the timer and must not open the action menu.
  const scrollRect=await zeroCard.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scrollRect.x+30,y:scrollRect.y+30}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:scrollRect.x+30,y:scrollRect.y+5}]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.getByRole('dialog').count(),0,'Touch move cancels long press');await characterNav.waitFor();
  // Keep a pin to check reload and identity boundaries, including the narrow dark dialog.
  await page.setViewportSize({width:320,height:844});await page.emulateMedia({colorScheme:'dark'});await zeroCard.focus();await page.keyboard.press('Shift+F10');
  await page.getByRole('dialog').waitFor();await page.waitForTimeout(350);await page.screenshot({path:'tmp/memory-pin-dialog-320-dark.png'});
  console.log('PIN DIALOG STYLE',await page.locator('[data-ui="modal-dialog"]').evaluate(n=>({background:getComputedStyle(n).backgroundColor,opacity:getComputedStyle(n).opacity})));
  assert.equal(await page.getByRole('dialog').locator('[data-ui="modal-dialog"]').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}),true);
  const cancelButton=page.getByRole('button',{name:'取消',exact:true});await cancelButton.focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.getByRole('button',{name:'置顶',exact:true}).evaluate(n=>n===document.activeElement),true,'Dialog focus trap');
  await page.getByRole('button',{name:'置顶',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});await enter();assert.deepEqual(await characterOrder(),['林溪','夏予','沈言'],'Pin persists after reload');
  // Every character row opens directly, including a character without any records.
  await openChar('林溪');await page.getByRole('navigation',{name:'记忆栏目'}).getByRole('button',{name:/FACTS/}).click();
  assert.equal(await page.locator('[data-memory-section="facts"]').evaluate(n=>getComputedStyle(n).getPropertyValue('--memory-control').trim()),'#e3f1fb','No-avatar fallback remains the default color card');
  await page.getByRole('button',{name:'长期',exact:true}).click();await page.getByText('暂无长期记忆。点击设置页的手动总结，或直接新增一条记忆。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'返回',exact:true}).click();await page.getByRole('navigation',{name:'记忆栏目'}).waitFor();await page.getByRole('button',{name:'返回',exact:true}).click();await openChar();
  await page.getByRole('navigation',{name:'记忆栏目'}).getByRole('button',{name:/FACTS/}).click();
  assert.equal(await page.getByRole('button',{name:'短期',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'长期',exact:true}).click();await page.getByText('沈言与A约定周末去海边。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'查看共同经历',exact:true}).count().then(n=>assert.equal(n,0));
  await page.getByRole('button',{name:'短期',exact:true}).click();await page.getByRole('button',{name:'查看共同经历',exact:true}).click();
  await page.getByText('暂无共享事件。用户发朋友圈或参与群聊后会自动显示。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'长期',exact:true}).click();await page.getByText('沈言与A约定周末去海边。',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'记忆入口',exact:true}).count(),0,'No duplicate back');
  assert.equal(await page.getByRole('button',{name:'返回',exact:true}).count(),1,'Single header back');
  assert.equal(await page.locator('.page-body').last().evaluate(n=>getComputedStyle(n).backgroundColor === 'rgb(255, 255, 255)'),true,'Facts content keeps neutral background');
  await page.screenshot({path:'tmp/memory-facts-single-back-390-light.png'});
  await page.getByRole('button',{name:'返回',exact:true}).click();
  await page.getByRole('navigation',{name:'记忆栏目'}).getByRole('button',{name:/MIRROR/}).focus();await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'人物理解',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'人物理解',exact:true}).evaluate(el=>el.getBoundingClientRect().top<430),true,'Section retained the scrolled entry position');await page.getByText('原话依据 · 1',{exact:true}).first().click();await page.getByText('我们周末去海边，好不好？',{exact:true}).first().waitFor();
  // Production schema migration keeps the original facet; synthetic earlier results exercise the real read-only, paginated UI.
  await page.evaluate(async()=>{
   const r=indexedDB.open('ai_phone_memory_db_v1');const db=await new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
   const tx=db.transaction('cognition_history','readwrite');
   for(let i=0;i<12;i++){
    const recordedAt=new Date(Date.now()-(i+1)*3600000).toISOString();
    tx.objectStore('cognition_history').put({id:`fixture-history-${i}`,characterId:'C',facet:'mirror',origin:'generated',recordedAt,value:{text:`历史认识${i}：我想靠近，也保留自己的边界。`,updatedAt:recordedAt,evidence:[{id:'old-source',sourceApp:'chat',timestamp:recordedAt,excerpt:'旧相处的原话'}]}});
   }
   await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
  });
  const history=page.getByRole('region',{name:'镜子历史'}),historyToggle=page.getByRole('button',{name:'查看历次镜子',exact:true});
  await historyToggle.focus();await page.keyboard.press('Enter');
  await history.locator(':scope > div > details').first().waitFor();
  assert.equal(await history.locator(':scope > div > details').count(),10,'History must load in bounded pages');
  await history.locator(':scope > div > details > summary').first().click();
  await history.getByText('愿意兑现与A的约定，关系正逐渐变得亲密。',{exact:true}).waitFor();
  await history.getByText('当前',{exact:true}).waitFor();
  await page.getByRole('button',{name:'加载更早的版本',exact:true}).click();
  await history.getByText('历史认识11：我想靠近，也保留自己的边界。',{exact:true}).waitFor({state:'attached'});
  assert.equal(await history.locator(':scope > div > details').count(),13,'History pagination dropped earlier versions');
  assert.equal(await page.getByRole('button',{name:'加载更早的版本',exact:true}).count(),0);
  for(const width of [320,390])for(const scheme of ['light','dark']){
   await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:scheme});
   await checkControl('[class*="historyToggle"]');await page.locator('.page-body').last().evaluate(n=>n.scrollTop=0);
   assert.equal(await history.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}),true,'History overflows viewport');
   await page.screenshot({path:`tmp/memory-history-${width}-${scheme}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
  await page.getByRole('button',{name:'收起历次镜子',exact:true}).click();
  await page.screenshot({path:'tmp/memory-mirror-390.png'});await page.getByRole('button',{name:'返回',exact:true}).click();
  await page.getByRole('navigation',{name:'记忆栏目'}).getByRole('button',{name:/LIST/}).click();await page.getByRole('button',{name:'标为完成',exact:true}).click();await page.getByText('已完成',{exact:true}).waitFor();
  await enter();await openChar();await page.getByRole('navigation',{name:'记忆栏目'}).getByRole('button',{name:/LIST/}).click();await page.getByText('已完成',{exact:true}).waitFor();
  // Reload into B's real identity namespace. Shared character remains, A's relation memory does not.
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('float_identity_runtime_v1'));state.activeUserId='B';state.revision++;localStorage.setItem('float_identity_runtime_v1',JSON.stringify(state))});
  await enter();await page.getByRole('heading',{name:'测试用户 B',exact:true}).waitFor();assert.equal(await characterNav.getByText('置顶',{exact:true}).count(),0,'A pin must not appear under B');await openChar();await page.getByRole('navigation',{name:'记忆栏目'}).getByRole('button',{name:/GAZE/}).click();assert.equal(await page.getByText('A认真而柔软，他珍惜A的信任。',{exact:true}).count(),0);
  await page.getByText('还没有整理到这里。新的相处与记忆总结会慢慢留下轮廓。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'查看历次凝视',exact:true}).click();await page.getByText('还没有保存过这一部分的认知。',{exact:true}).waitFor();
  assert.equal(await page.getByText('A认真而柔软，他珍惜A的信任。',{exact:true}).count(),0,'A cognition leaked through B history');
  assert.deepEqual(errors,[],'Runtime browser errors');
  assert.deepEqual(await page.evaluate(()=>['--c-panel','--c-bubble-self','--c-icon-active'].map(key=>getComputedStyle(document.documentElement).getPropertyValue(key))),rootColors,'Memory colors must not modify global/chat theme tokens');
  console.log('PASS: 320/390 day/night sections and palette contrast, keyboard history expansion/current marker/13-version pagination/legacy migration/A-B history isolation; timeline, editor/source/settings, sorting/pin/navigation/evidence regression and unchanged global theme. Fresh fixture; no paid requests.');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
