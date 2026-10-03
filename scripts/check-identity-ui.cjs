// Disposable profile on local dev only; synthetic profiles, no models/cloud credentials.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Effy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function main() {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => { errors.push(error.message); console.log('BROWSER ERROR',error.stack); });
  await page.route('**/api/**', route => /\/(llm|voice|image|push)/.test(new URL(route.request().url()).pathname) ? route.abort() : route.continue());
  await page.route('**/identity-fixture', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated seed</title>'}));
  await page.goto('http://127.0.0.1:3003/identity-fixture');
  await page.evaluate(async () => {
   const request = indexedDB.open('AiPhoneKvDB',10);
   request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'key'});
   const db = await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
   const tx=db.transaction('entries','readwrite'); const store=tx.objectStore('entries');
   const identity=id=>({id,name:id==='A'?'测试身份 A':'测试身份 B',bio:'',gender:'保密',age:'',occupation:'',customSettings:''});
   store.put({key:'ai_phone_user_identities_v1',value:JSON.stringify([identity('A'),identity('B')])});
   store.put({key:'ai_phone_characters_v1',value:JSON.stringify([{id:'C',name:'共享角色 C',description:'测试角色',personality:'',scenario:'',firstMessage:'',exampleDialogue:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}])});
   store.put({key:'ai_phone_bindings_v1',value:JSON.stringify({globalDefaults:{userIdentityId:'A'},characterBindings:[]})});
   store.put({key:'float_identity_character_access_v1',value:'{}'});
   const fixtureHtml = '<!doctype html><html><body><pre id="output">ready</pre><button id="read">Read</button><button id="save">Save</button><script>read.onclick=async()=>{const profile=await AiPhone.user.getProfile({userId:"spoof"});const records=await AiPhone.db.list("test");output.textContent=JSON.stringify({id:profile.id,local:localStorage.getItem("test"),records})};save.onclick=async()=>{const profile=await AiPhone.user.getProfile();localStorage.setItem("test",profile.id);await AiPhone.db.create("test",{owner:profile.id});output.textContent="saved"};</script></body></html>';
   const manifest={id:'identity-fixture',name:'身份兼容测试',version:'1.0.0',permissions:['app.data.read','app.data.write','user.profile.read']};
   store.put({key:'ai_phone_custom_apps_v1',value:JSON.stringify([{id:manifest.id,name:manifest.name,version:manifest.version,manifest,permissions:manifest.permissions,assets:{},entryHtml:fixtureHtml,installedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}])});
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
   localStorage.setItem('float_identity_runtime_v1',JSON.stringify({version:1,activeUserId:'A',legacyOwnerId:'A',userIds:['A','B'],deletingUserIds:[],revision:0}));
  });
  await page.goto('http://127.0.0.1:3003/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(() => !document.querySelector('[aria-label="Enter"]')?.disabled);
  const enter = async () => {
   await page.getByRole('button',{name:'Enter',exact:true}).click();
   const notice=page.getByRole('button',{name:'我知道了',exact:true});
   if(await notice.waitFor({state:'visible',timeout:5000}).then(()=>true).catch(()=>false)) await notice.click();
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('open-app',{detail:{appId:'settings'}})));
   await page.getByText('配置绑定',{exact:true}).click();
  };
  await enter();
  const checkApp = async (id, expectedLocal, expectedRecords, save) => {
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('open-app',{detail:{appId:'custom_app:identity-fixture'}})));
   const frame=page.frameLocator('iframe[title="身份兼容测试"]');
   await frame.getByText('Read',{exact:true}).click();
   await frame.locator('#output').filter({hasText:'"id"'}).waitFor();
   const output=JSON.parse(await frame.locator('#output').innerText());
   assert.equal(output.id,id,'SDK spoofed userId');assert.equal(output.local,expectedLocal,'Legacy localStorage leaked');
   const records=Array.isArray(output.records)?output.records:output.records.records;
   assert.equal(records.length,expectedRecords,'SDK records leaked');
   if(save){await frame.getByText('Save',{exact:true}).click();await frame.locator('#output').filter({hasText:'saved'}).waitFor();await page.waitForTimeout(200);}
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('open-app',{detail:{appId:'settings'}})));
   await page.getByText('配置绑定',{exact:true}).click();
  };
  await checkApp('A',null,0,true);
  await page.getByText('当前用户身份',{exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({path:'tmp/identity-global-390-light.png'});
  await Promise.all([page.waitForNavigation(),page.getByRole('dialog').getByText('测试身份 B',{exact:true}).click()]);
  await page.getByRole('button',{name:'Enter',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('float_identity_runtime_v1')).activeUserId),'B');
  await enter();
  await checkApp('B',null,0,true);
  await page.getByText('当前用户身份',{exact:true}).click();
  await Promise.all([page.waitForNavigation(),page.getByRole('dialog').getByText('测试身份 A',{exact:true}).click()]);
  await enter();
  await checkApp('A','A',1,false);
  await page.getByRole('button',{name:'为角色配置专属绑定'}).click();
  await page.getByRole('dialog').getByText('共享角色 C',{exact:true}).click();
  await page.getByText('可互动身份',{exact:true}).click();
  const picker = page.getByRole('dialog');
  await picker.getByText('测试身份 A',{exact:true}).click();
  await picker.getByText('测试身份 B',{exact:true}).click();
  assert.equal(await picker.count(),1,'Multi-select closed after first selection');
  await page.waitForTimeout(300);
  const access=await page.evaluate(async()=>{
   const r=indexedDB.open('AiPhoneKvDB');const db=await new Promise(resolve=>{r.onsuccess=()=>resolve(r.result)});
   const q=db.transaction('entries').objectStore('entries').get('float_identity_character_access_v1');
   const row=await new Promise(resolve=>{q.onsuccess=()=>resolve(q.result)});db.close();return JSON.parse(row.value).C;
  });
  assert.deepEqual(access.sort(),['A','B']);
  for(const width of [320,390]) for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:844}); await page.emulateMedia({colorScheme:theme});
   await page.waitForFunction(dark => { const rgb = getComputedStyle(document.querySelector('[data-identity-picker="true"]')).backgroundColor.match(/[\d.]+/g).map(Number); return dark ? rgb[0] < 80 : rgb[0] > 150; }, theme === 'dark');
   await page.screenshot({path:`tmp/identity-binding-${width}-${theme}.png`});
   assert.equal(await picker.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true,'Picker overflow');
  }
  assert.deepEqual(errors,[],`Browser errors: ${errors.join('; ')}`);
  console.log('PASS: real 3003 A→B→A switch, SDK current-user translation and records, legacy iframe localStorage isolation, role whitelist multi-selection, 320/390 light/dark picker bounds. Synthetic profile; no paid model calls.');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
