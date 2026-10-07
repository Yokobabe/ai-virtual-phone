// Real review/summary/context/parser modules with synthetic persistence and a model sink.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), modules = {}, records = new Map(), states = new Map(), cursors = new Map(), counters = new Map(), pending = new Map(), cache = new Map();
let owner = 'A', active = true, allowed = true, api = true, model, config, calls = 0, lastMessages;
const timelines = new Map(), histories = new Map();
const key = char => `${owner}:${char}`;
const check = () => { if (!active) throw Error('retired'); };
const deps = {
    'kv-db': { registerDynamicPrefix() {}, kvGet: id => cache.get(key(id)), kvSetAsync: async (id, value) => cache.set(key(id), value) },
    'identity-runtime': { assertIdentityActive: check, getCurrentIdentityId: () => owner },
    'identity-access': { canCurrentIdentityInteract: () => allowed },
    'character-storage': { loadCharacters: () => [{ id: 'C', name: 'C', persona: '从容克制，重要时会坦诚承认误判', personality: '言简意赅' }] },
    'settings-storage': { resolveAuxiliaryApiConfig: id => api && id === 'memorySummaryApiConfigId' ? { model: 'fake' } : null,
        resolveUserIdentity: () => ({ id: owner, name: owner, bio: '喜欢直接沟通', gender: '女', age: '28', occupation: '画师', customSettings: '相处时愿意坦诚' }) },
    'short-term-assembler': {
        loadNativeTimeline: (id, options) => (timelines.get(key(id)) || []).filter(e => !options?.afterTimestamp || e.timestamp > options.afterTimestamp),
        filterTimelineByAllowedSources: (events, sources) => events.filter(e => sources?.[e.sourceApp] !== false),
        formatTimelineForSummarization: events => ({ earliest: events[0]?.timestamp, latest: events.at(-1)?.timestamp }),
    },
    'memory-storage': {
        loadMemoryConfig: () => config, loadMemoryEntries: async id => records.get(key(id)) || [],
        loadMemoryEntriesByType: async (id, type) => (records.get(key(id)) || []).filter(e => e.type === type),
        loadPersistedMemoryCognition: async id => states.get(key(id)) || null,
        saveMemoryEntries: async (entries, state, options) => {
            check();
            const char = state?.characterId || entries[0]?.characterId;
            if (options?.expectedUpdatedAt !== undefined && (states.get(key(char))?.updatedAt || '') !== options.expectedUpdatedAt) throw Error('concurrent update');
            const rows = records.get(key(char)) || [];
            records.set(key(char), [...rows.filter(e => !entries.some(next => next.id === e.id)), ...entries]);
            if (state) {
                const history = histories.get(key(char)) || new Set();
                for (const value of [states.get(key(char)), state, options?.generatedCognition]) for (const facet of ['mirror', 'gaze']) if (value?.[facet]?.revisionId) history.add(value[facet].revisionId);
                histories.set(key(char), history); states.set(key(char), state);
            }
        },
        getEventCounter: id => counters.get(key(id)) || 0, resetEventCounter: (id, count = 0) => counters.set(key(id), count),
        getLastSummarizedTimestamp: id => cursors.get(key(id)), setLastSummarizedTimestamp: (id, value) => cursors.set(key(id), value),
        getPendingSummaryTimestamp: id => pending.get(key(id)), setPendingSummaryTimestamp: (id, value) => pending.set(key(id), value),
        incrementCoreMemoryCounter() {}, deleteMemoryEntries: async () => {},
    },
    'memory-embedding': { resolveEmbeddingModel: () => null },
    'core-memory-builder': { maybeRunCoreMemoryPipeline: async () => {} },
    'api-helpers': { simpleLLMCall: async (_api, messages) => { calls++; lastMessages = messages; return await model(messages); } },
};
function load(name) {
    name = name.replace(/^.*\//, '');
    if (deps[name]) return deps[name]; if (modules[name]) return modules[name];
    if (!['memory-types', 'memory-cognition', 'memory-cognition-context', 'memory-summarizer', 'token-counter'].includes(name)) throw Error(`Unexpected import ${name}`);
    const exports = {}; modules[name] = exports;
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, `lib/${name}.ts`), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, { exports, require: load, console, Date, Math, Map, Set, JSON });
    return exports;
}
const types = load('memory-types'), cog = load('memory-cognition'), context = load('memory-cognition-context'), engine = load('memory-summarizer');
config = { ...types.DEFAULT_MEMORY_CONFIG, vectorRecallEnabled: false, autoBuildCoreEnabled: false };
const t1 = '2026-10-01T00:00:00Z', t2 = '2026-10-02T00:00:00Z';
const event = { id: 'event-new', sourceApp: 'chat', timestamp: t2, content: '铺垫'.repeat(230) + '后来把误会解释清楚了。' };
const memories = [
    { id: 'core', characterId: 'C', type: 'core', sourceApp: 'chat', content: '彼此承诺重要的事直接说。', createdAt: t1, updatedAt: t1, metadata: { active: true } },
    { id: 'long', characterId: 'C', type: 'long_term', sourceApp: 'moments', content: '以前一次误会之后两人重新约定坦诚。', createdAt: t1, updatedAt: t1 },
    { id: 'inactive', characterId: 'C', type: 'core', sourceApp: 'chat', content: '失效认知不能选', createdAt: t1, updatedAt: t1, metadata: { active: false } },
    { id: 'other-char', characterId: 'D', type: 'long_term', sourceApp: 'chat', content: '另一个角色的秘密', createdAt: t1, updatedAt: t1 },
];
const source = { id: 'old-event', sourceApp: 'chat', timestamp: t1, excerpt: '我当时误会她了。' };
const old = { ...cog.emptyCognition('C'), updatedAt: t1, mirror: { text: '我用从容遮掩害怕误判。', evidence: [source], updatedAt: t1, revisionId: 'old-version' } };
const nullUpdate = { summary: '事实摘要', mirror: null, gaze: null, emotion: null, mood: null, openItems: [] };
const reviewed = { ...nullUpdate, mirror: { text: '坦诚让我愿意纠正从前的误判。', digest: '愿意承认误判', evidenceIds: ['memory:core', event.id],
    claims: [{ text: '坦诚有助于纠正我的误判', kind: 'interpretation', evidenceIds: ['memory:core', event.id] }],
    citations: [{ id: 'memory:core', quote: memories[0].content }, { id: event.id, quote: '后来把误会解释清楚了。' }] } };
const response = value => async () => ({ content: JSON.stringify(value) });
(async () => {
    records.set(key('C'), memories); timelines.set(key('C'), [event]); states.set(key('C'), old);
    counters.set(key('C'), 80); cursors.set(key('C'), t1); pending.set(key('C'), t1);
    model = response(reviewed);
    const review = await engine.refreshMemoryCognition('C', 'C');
    assert.equal(review.success, true); assert.equal(review.changed, true); assert.equal(calls, 1);
    assert.equal(cursors.get(key('C')), t1, 'review must not advance fact-summary cursor');
    assert.equal(counters.get(key('C')), 80); assert.equal(pending.get(key('C')), t1);
    assert.equal(records.get(key('C')).length, memories.length, 'review must not add a long-term summary');
    for (const required of ['memory:core', 'memory:long', 'old-event', '从容克制', '喜欢直接沟通', '性别：女', '年龄：28', '职业：画师', '相处时愿意坦诚', '主动重审']) assert.ok(lastMessages[1].content.includes(required), required);
    assert.ok(!lastMessages[1].content.includes('另一个角色的秘密')); assert.ok(!lastMessages[1].content.includes('失效认知不能选'));
    const state = states.get(key('C'));
    assert.equal(state.mirror.basis.mode, 'review'); assert.equal(state.mirror.basis.core, 1);
    assert.equal(state.mirror.evidence.find(e => e.id === event.id).excerpt, '后来把误会解释清楚了。', 'quote after character 400 must be retained');
    assert.ok(state.mirror.evidence.find(e => e.id === event.id).context.includes('后来把误会解释清楚了。'));
    assert.ok(histories.get(key('C')).has('old-version'));
    const versions = histories.get(key('C')).size;
    assert.equal((await engine.refreshMemoryCognition('C', 'C')).changed, false);
    assert.equal(histories.get(key('C')).size, versions, 'unchanged review must not manufacture a new version');
    const readContext = context.buildCognitionContext('C', memories, [event], state, config, 'incremental');
    assert.ok(readContext.supplement.includes(source.id), 'prior evidence must accompany later updates');
    // Structured provenance is validated before any persistence or cursor advancement.
    for (const badMirror of [
        { ...reviewed.mirror, claims: undefined },
        { ...reviewed.mirror, citations: [{ id: event.id, quote: '编造的原话' }] },
        { ...reviewed.mirror, claims: [{ text: '未知来源', kind: 'fact', evidenceIds: ['unknown'] }] },
    ]) {
        const before = JSON.stringify(states.get(key('C'))); model = response({ ...reviewed, mirror: badMirror });
        assert.equal((await engine.refreshMemoryCognition('C', 'C')).success, false);
        assert.equal(JSON.stringify(states.get(key('C'))), before); assert.equal(cursors.get(key('C')), t1);
    }
    model = async () => ({ content: JSON.stringify(reviewed), wasTruncated: true });
    assert.equal((await engine.refreshMemoryCognition('C', 'C')).success, false);
    let release;
    model = () => new Promise(resolve => { release = resolve; });
    const waiting = engine.refreshMemoryCognition('C', 'C');
    while (!release) await Promise.resolve();
    const beforeCalls = calls;
    assert.equal((await engine.runSummarizationPipeline('C', 'C')).success, false);
    assert.equal((await engine.refreshMemoryCognition('C', 'C')).success, false);
    assert.equal(calls, beforeCalls, 'manual review and auto summary share one character lock');
    owner = 'B'; release({ content: JSON.stringify(reviewed) });
    assert.equal((await waiting).success, false); assert.equal(states.has(key('C')), false); owner = 'A';
    allowed = false; const blockedCalls = calls;
    assert.equal((await engine.refreshMemoryCognition('C', 'C')).success, false); assert.equal(calls, blockedCalls); allowed = true;
    config = { ...config, cognitionEnabled: false };
    assert.equal((await engine.refreshMemoryCognition('C', 'C')).success, false); config = { ...config, cognitionEnabled: true };
    // Automatic update shares the summary request, including memory-backed review context.
    cursors.set(key('C'), t1); pending.delete(key('C')); model = response({ ...reviewed, mirror: { ...reviewed.mirror, text: '新的相处使我更愿意直说。' } });
    const beforeAuto = calls;
    await engine.maybeRunSummarization('C', 'C');
    assert.equal(calls, beforeAuto + 1); assert.equal(states.get(key('C')).mirror.basis.mode, 'incremental');
    assert.equal(cursors.get(key('C')), t2); assert.ok(lastMessages[1].content.includes('memory:long'));
    await engine.maybeRunSummarization('C', 'C'); assert.equal(calls, beforeAuto + 1, 'no new material means no repeated model call');
    // Pending work is drained oldest-first, bounded per trigger, and resumes below the 80-event threshold.
    const bulk = Array.from({ length: 20 }, (_, i) => ({ id: `bulk-${i}`, sourceApp: 'chat', timestamp: t2, content: 'x'.repeat(9000) }));
    timelines.set(key('Bulk'), bulk); counters.set(key('Bulk'), 80); model = response(nullUpdate);
    const beforeBulk = calls;
    await engine.maybeRunSummarization('Bulk', 'Bulk');
    assert.equal(calls, beforeBulk + 3); assert.ok(pending.get(key('Bulk')));
    await engine.maybeRunSummarization('Bulk', 'Bulk');
    const ids = records.get(key('Bulk')).flatMap(e => e.sourceMessageIds || []);
    assert.equal(new Set(ids).size, 20); assert.equal(ids.length, 20); assert.equal(pending.get(key('Bulk')), null);
    // Bad auto output does not become a request storm on each following chat message.
    timelines.set(key('Fail'), [event]); counters.set(key('Fail'), 80); model = async () => ({ content: 'invalid JSON' });
    const beforeFail = calls; await engine.maybeRunSummarization('Fail', 'Fail'); await engine.maybeRunSummarization('Fail', 'Fail');
    assert.equal(calls, beforeFail + 1);
    // Even oversized history can contribute a bounded recent sample.
    const oversized = context.buildCognitionContext('C', memories, [{ ...event, content: '长'.repeat(20000) }], old, config, 'review');
    assert.equal(oversized.events.length, 1); assert.ok(oversized.basis.estimatedTokens <= 8400);
    const hidden = context.buildCognitionContext('C', memories, [], old, { ...config, shortTermAllowedSources: { moments: false } }, 'review');
    assert.equal(hidden.sources.some(e => e.id === 'memory:long'), false);
    console.log('PASS: manual memory/persona/user review, independent summary checkpoint, provenance/late quotes, unchanged-version dedupe, identity/access/concurrency guards, automatic shared call and bounded backlog/resume, retry backoff, input budgets and source filtering. Fake model only.');
})().catch(error => { console.error(error); process.exitCode = 1; });
