const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');
const { chromium } = require('C:/Users/Effy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

// Execute the production exports in an isolated browser, not a copy of the algorithm.
function paletteRuntime() {
 const compile = file => ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
 }).outputText;
 return `(()=>{const colors={};((exports)=>{${compile('lib/chat-bubble-colors.ts')}})(colors);
 const result={};((exports,require)=>{${compile('lib/memory-entry-palette.ts')}})(result,()=>colors);
 window.productionMemoryPalette=result;})();`;
}
async function main() {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
 try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname, '../docs/previews/memory-layered.html')).href);
  await page.addScriptTag({ content: paletteRuntime() });
  const fixture = color => page.evaluate(color => {
   const canvas = document.createElement('canvas'); canvas.width = canvas.height = 80;
   const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 80, 80);
   return canvas.toDataURL();
  }, color);
  for (const color of ['#3b75aa', '#bd526c', '#438c66', '#00ff00', '#101035', '#edb697', '#111111', '#eeeeee']) {
   const src = await fixture(color);
   await page.evaluate(async src => {
    const prod = window.productionMemoryPalette, preview = window.memoryPreview;
    const [actual, approved] = await Promise.all([prod.extractMemoryColors(src), preview.extractMemoryColors(src)]);
    if (JSON.stringify(actual) !== JSON.stringify(approved)) throw Error('Representative colors differ from approved preview');
    for (const dark of [false, true]) {
     const palette = prod.memoryPalette(actual, dark);
     if (JSON.stringify(palette) !== JSON.stringify(preview.memoryPalette(approved, dark))) throw Error('Palette differs from approved preview');
     if (new Set(palette).size !== 5) throw Error('Five distinct tones required');
     const luminance = c => c.slice(1).match(/../g).map(n => parseInt(n, 16) / 255)
      .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
     for (const bg of palette) for (const fg of Object.values(prod.memoryPaletteText(bg, dark))) {
      const a = luminance(bg), b = luminance(fg);
      if ((Math.max(a, b) + .05) / (Math.min(a, b) + .05) < 4.5) throw Error('Insufficient text contrast');
     }
    }
   }, src);
  }
  assert.equal(await page.evaluate(() => window.productionMemoryPalette.extractMemoryColors('data:image/png;base64,invalid')), null);
  assert.equal(await page.evaluate(() => window.productionMemoryPalette.representativeColors(new Uint8ClampedArray(64 * 64 * 4))), null);
  if (process.env.MEMORY_AVATAR_TEST_IMAGE) {
   const src = 'data:image/jpeg;base64,' + fs.readFileSync(process.env.MEMORY_AVATAR_TEST_IMAGE).toString('base64');
   const photo = await page.evaluate(async src => {
    const sample = await window.productionMemoryPalette.extractMemoryColors(src);
    const approved = await window.memoryPreview.extractMemoryColors(src);
    return { same: JSON.stringify(sample) === JSON.stringify(approved), primaryHue: sample.colors[0].h };
   }, src);
   assert.equal(photo.same, true, 'Supplied image matches approved extraction');
   assert.ok(photo.primaryHue >= 60 && photo.primaryHue <= 110, 'Olive green retained');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: production sampler equals approved preview, eight color families, five tones, day/night text contrast, invalid/transparent fallback, optional supplied photo.');
 } finally { await browser.close(); }
}
module.exports = { paletteRuntime };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
