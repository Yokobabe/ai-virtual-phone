const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(source, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', source), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, {
    exports, Intl,
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  }, { filename: source });
  return exports;
}

const { shouldSendChatInputOnEnter: enter } = load('lib/chat-input-keyboard.ts');
assert.equal(enter({ key: 'Enter' }, true), true);
assert.equal(enter({ key: 'Enter' }, false), false);
assert.equal(enter({ key: 'Enter', shiftKey: true }, true), false);
assert.equal(enter({ key: 'Enter', altKey: true }, true), false);
assert.equal(enter({ key: 'Enter', ctrlKey: true }, false), true);
assert.equal(enter({ key: 'Enter', metaKey: true }, false), true);
assert.equal(enter({ key: 'Enter', nativeEvent: { isComposing: true } }, true), false);
assert.equal(enter({ key: 'a' }, true), false);

let messages = [];
let writes = 0;
const tapback = load('lib/chat-tapback.ts', {
  './kv-db': { kvGet: () => null, kvSet() {}, registerKvMigration() {} },
  './chat-storage': {
    getChatMessagePreview: m => m.content,
    loadChatMessages: () => messages,
    updateMessageMediaData(id, mediaData) {
      writes++;
      messages = messages.map(m => m.id === id ? { ...m, mediaData } : m);
    },
  },
});
for (const emoji of ['🥹', '🫶🏽', '👨‍👩‍👧‍👦', '🇨🇳', '1️⃣', '❤️', '‼️']) {
  assert.equal(tapback.isNativeTapbackEmoji(emoji), true, emoji);
}
for (const invalid of ['', 'hello', '❤️😂', '1', '[Tapback:❤️]']) {
  assert.equal(tapback.isNativeTapbackEmoji(invalid), false, invalid);
}
messages = [
  { id: 'u1', role: 'user', content: '谢谢你一直陪着我', mediaData: { label: 'kept' } },
  { id: 'a1', role: 'assistant', content: '我在' },
  { id: 'u2', role: 'user', content: '撤回', isRetracted: true },
  { id: 'call', role: 'user', content: '', mediaType: 'voice_call' },
];
assert.equal(tapback.applyAssistantTapback('session', undefined), null);
assert.equal(writes, 0, 'No requested action must not create a tapback');
assert.equal(tapback.applyAssistantTapback('session', 'not emoji'), null);
const applied = tapback.applyAssistantTapback('session', '🥹');
assert.equal(applied.id, 'u1');
assert.equal(applied.mediaData.tapback, '🥹', 'Emoji outside six candidates must work');
assert.equal(applied.mediaData.label, 'kept');
assert.equal(applied.mediaData.tapbackBy, 'assistant');
tapback.applyAssistantTapback('session', '🫶🏽');
assert.equal(messages[0].mediaData.tapback, '🫶🏽', 'A new reaction replaces the old one');
messages = [{ id: 'a2', role: 'assistant', content: '你好' }];
assert.equal(tapback.applyAssistantTapback('session', '😂'), null);
console.log('PASS: Enter/IME/newline behavior; native emoji validation; optional tapback, target selection and replacement.');
