const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const source = fs.readFileSync('components/chat/share-destination-sheet.tsx', 'utf8');
const ast = ts.createSourceFile('share.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let expression;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'confirm') expression = node.initializer.getText(ast); ts.forEachChild(node, visit); }
visit(ast);
const session = { id: 'actual-session', contactId: 'person' };
function setup(target) {
    const calls = [], submitting = { current: false }, destination = { current: '' };
    const context = { target, ready: true, submitting, sentDestination: destination, identity: { current: 'owner' }, getCurrentIdentityId: () => 'owner',
        payload: { type: 'music', title: 'Test', artist: 'Artist', coverUrl: 'cover' }, note: 'note', excerpt: 'lyrics', audienceIds: ['person'],
        addMomentPost: data => { calls.push(['post', data]); return { id: 'post' }; }, onUserPost: () => {},
        loadChatSessions: () => [session], loadChatContacts: () => [{ characterId: 'person' }], canCurrentIdentityInteract: () => true,
        createOrGetSession: () => session, canShare: () => true, pushChatMessage: data => calls.push(['message', data]),
        window: { dispatchEvent() {} }, CustomEvent: function() {}, setSent: value => calls.push(['sent', value]), setError: error => calls.push(['error', error]),
    };
    const code = ts.transpileModule(`const confirm = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return { confirm: vm.runInNewContext(code + ';confirm', context), destination, calls };
}
const moments = setup(null);
moments.confirm('moments'); moments.confirm('moments');
assert.equal(moments.calls.filter(c => c[0] === 'post').length, 1);
assert.equal(moments.destination.current, 'moments');
const chat = setup({ id: 'contact:person', contactId: 'person' });
chat.confirm();
assert.equal(chat.destination.current, 'actual-session');
assert.equal(chat.calls.filter(c => c[0] === 'message').length, 1);
assert.doesNotMatch(source, /已发送到对话|已发布到朋友圈|setTarget\("moments"\)/);
assert.match(source, /onView\(sentDestination.current\)/);
console.log('PASS: direct moments publish, duplicate guard, resolved private-chat destination and go-view wiring; synthetic storage only.');
