import { estimateTokens } from "../token-counter";
import { record, records, string, strings, type CompatRecord } from "./compatibility";
import { parseCompatibilityRegex } from "./compatibility-regex";
import type { MixCharacterCard, MixMaterial, MixMaterialKind } from "./types";

export type LoreState = { activated: Record<string, number> };
export type LoreReport = { entries: { name: string; status: string }[]; estimatedTokens: number; budget: number };
export type LoreEntry = CompatRecord & { _key: string; _name: string; _position: number; _depth: number; _role: number; _order: number; _book: CompatRecord; _ext: CompatRecord };
const num = (v: unknown, fallback: number) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
function entriesOf(book: CompatRecord): CompatRecord[] {
    return Array.isArray(book.entries) ? records(book.entries) : Object.values(record(book.entries)).map(record);
}
export function compatibilityBooks(card: MixCharacterCard, active: Partial<Record<MixMaterialKind, MixMaterial[]>>) {
    const books: { id: string; name: string; data: CompatRecord }[] = [];
    const embedded = record(card.compatibility?.data.character_book);
    if (embedded.entries) books.push({ id: card.id, name: string(embedded.name) || card.name, data: embedded });
    for (const m of active.flavor ?? []) if (m.compatibility?.format === "worldbook") books.push({ id: m.id, name: m.name, data: m.compatibility.data });
    return books;
}
export function lorePosition(e: CompatRecord): number {
    const ext = record(e.extensions);
    if (typeof ext.position === "number") return ext.position;
    if (typeof e.position === "number") return e.position;
    return ({ before_char: 0, after_char: 1, before_an: 2, after_an: 3, before_em: 5, after_em: 6 } as Record<string, number>)[string(e.position)] ?? 1;
}

/** ST common entry semantics with request-local recursion and persisted activation snapshots. */
export function selectCompatibilityLore(input: {
    card: MixCharacterCard; active: Partial<Record<MixMaterialKind, MixMaterial[]>>;
    history: string[]; fields: Record<string, string>; macro: (s: string) => string;
    turn: number; state?: LoreState; contextBudget?: number; trigger?: string;
    random?: () => number;
}): { entries: LoreEntry[]; state: LoreState; report: LoreReport; outlets: Record<string, string> } {
    const books = compatibilityBooks(input.card, input.active);
    const entries: LoreEntry[] = books.flatMap(book => entriesOf(book.data).map((entry, i) => {
        const ext = { ...entry, ...record(entry.extensions) };
        return { ...entry, _key: `${book.id}:${entry.id ?? entry.uid ?? i}`, _name: `${book.name} · ${string(entry.comment) || string(entry.name) || `条目 ${i + 1}`}`, _position: lorePosition(entry), _depth: num(ext.depth, 4), _role: num(ext.role, 0), _order: num(entry.insertion_order, num(entry.order, 100)), _book: book.data, _ext: ext };
    }));
    const activated = { ...(input.state?.activated ?? {}) };
    const accepted = new Map<string, LoreEntry>();
    const status = new Map<string, string>();
    const rejected = new Set<string>();
    const chosenGroups = new Set<string>();
    const costs = new Map<CompatRecord, number>();
    const random = input.random ?? Math.random;
    let totalCost = 0;
    const overallBudget = Math.max(0, input.contextBudget ?? 8192);
    const bookBudget = (book: CompatRecord) => Math.max(0, num(book.token_budget, num(book.budget, overallBudget)));
    const flag = (e: LoreEntry, snake: string, camel: string) => e._ext[snake] ?? e._ext[camel];
    const groups = (e: LoreEntry) => string(e._ext.group).split(/,\s*/).map(s => s.trim()).filter(Boolean);
    const sticky = (e: LoreEntry) => activated[e._key] !== undefined && input.turn >= activated[e._key] && input.turn - activated[e._key] <= num(e._ext.sticky, 0) && num(e._ext.sticky, 0) > 0;
    const testKey = (key: string, haystack: string, e: LoreEntry): boolean => {
        key = input.macro(key).trim();
        if (!key) return false;
        if (key.startsWith("/") && key.lastIndexOf("/") > 0) {
            try { return parseCompatibilityRegex(key).test(haystack); } catch { status.set(e._key, "关键词正则无效"); return false; }
        }
        const sensitive = flag(e, "case_sensitive", "caseSensitive") ?? e._book.case_sensitive ?? false;
        if (!sensitive) { key = key.toLowerCase(); haystack = haystack.toLowerCase(); }
        if (!(flag(e, "match_whole_words", "matchWholeWords") ?? e._book.match_whole_words)) return haystack.includes(key);
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "u").test(haystack);
    };
    let recursionText = "";
    const maxSteps = Math.min(32, Math.max(1, ...books.map(b => num(b.data.max_recursion_steps, 8))));
    for (let pass = 0; pass <= maxSteps; pass++) {
        const candidates: { entry: LoreEntry; score: number }[] = [];
        for (const e of entries) {
            if (accepted.has(e._key) || rejected.has(e._key)) continue;
            const ext = e._ext;
            if (e.enabled === false || e.disable === true || !string(e.content)) { status.set(e._key, "已停用/空内容"); continue; }
            if (e._position === 7 && !string(ext.outlet_name)) { status.set(e._key, "缺少 outlet 名称"); continue; }
            if (ext.vectorized && !e.constant && !strings(e.keys ?? e.key).length) { status.set(e._key, "向量触发未配置，未注入"); continue; }
            const triggers = strings(ext.triggers);
            if (triggers.length && !triggers.includes(input.trigger ?? "normal")) { status.set(e._key, "生成类型不匹配"); continue; }
            if (input.turn < num(ext.delay, 0)) { status.set(e._key, "尚未到延迟轮数"); continue; }
            const last = activated[e._key];
            if (!sticky(e) && last !== undefined && input.turn > last && input.turn - last <= num(ext.sticky, 0) + num(ext.cooldown, 0)) { status.set(e._key, "冷却中"); continue; }
            const delayRecursion = flag(e, "delay_until_recursion", "delayUntilRecursion");
            if (!sticky(e) && (delayRecursion === true ? pass < 1 : pass < num(delayRecursion, 0))) { status.set(e._key, "等待递归"); continue; }
            const recursive = e._book.recursive_scanning === true || e._book.recursive === true;
            if (pass > 0 && (!recursive || flag(e, "exclude_recursion", "excludeRecursion"))) continue;
            const scanDepth = Math.max(0, Math.min(1000, num(flag(e, "scan_depth", "scanDepth"), num(e._book.scan_depth, 2))));
            const additional = Object.entries(input.fields).filter(([name]) => ext[`match_${name}`] === true).map(([, value]) => value).join("\n");
            const haystack = (scanDepth ? input.history.slice(-scanDepth).join("\n") : "") + "\n" + additional + (pass > 0 ? "\n" + recursionText : "");
            const keys = strings(e.keys ?? e.key), secondary = strings(e.secondary_keys ?? e.keysecondary);
            const score = keys.filter(k => testKey(k, haystack, e)).length;
            const forced = sticky(e) || e.constant === true || string(e.content).startsWith("@@activate");
            if (string(e.content).startsWith("@@dont_activate")) { status.set(e._key, "作者禁用触发"); continue; }
            let matches = forced || score > 0;
            if (!forced && matches && e.selective && secondary.length) {
                const all = secondary.every(k => testKey(k, haystack, e)), any = secondary.some(k => testKey(k, haystack, e));
                matches = [any, !all, !any, all][num(ext.selectiveLogic, 0)] ?? any;
            }
            if (!matches) { if (!status.has(e._key)) status.set(e._key, "关键词未命中"); continue; }
            if (!sticky(e) && (ext.useProbability ?? ext.use_probability) && random() * 100 >= num(ext.probability, 100)) { status.set(e._key, "概率未触发"); rejected.add(e._key); continue; }
            candidates.push({ entry: e, score });
        }
        // Select one member of each inclusion group, respecting sticky/override/scoring/weight.
        const losers = new Set<string>();
        for (const group of new Set(candidates.flatMap(c => groups(c.entry)))) {
            let members = candidates.filter(c => groups(c.entry).includes(group) && !losers.has(c.entry._key));
            if (chosenGroups.has(group)) { members.forEach(c => losers.add(c.entry._key)); continue; }
            const stickies = members.filter(c => sticky(c.entry));
            const overrides = members.filter(c => flag(c.entry, "group_override", "groupOverride"));
            let pool = stickies.length ? stickies : overrides.length ? overrides.sort((a, b) => b.entry._order - a.entry._order).slice(0, 1) : members;
            if (pool.some(c => flag(c.entry, "use_group_scoring", "useGroupScoring"))) { const max = Math.max(...pool.map(c => c.score)); pool = pool.filter(c => c.score === max); }
            const weight = (e: LoreEntry) => Math.max(0, num(flag(e, "group_weight", "groupWeight"), 100));
            let pick = random() * pool.reduce((n, c) => n + weight(c.entry), 0);
            const winner = pool.find(c => (pick -= weight(c.entry)) < 0) ?? pool[0];
            members.filter(c => c !== winner).forEach(c => losers.add(c.entry._key));
        }
        let added = 0;
        for (const { entry: e } of candidates.sort((a, b) => Number(sticky(b.entry)) - Number(sticky(a.entry)) || b.entry._order - a.entry._order)) {
            if (losers.has(e._key)) { status.set(e._key, "同组其他条目入选"); rejected.add(e._key); continue; }
            const content = input.macro(string(e.content).replace(/^@@(?:activate|dont_activate)\s*\n?/, ""));
            const cost = estimateTokens(content);
            const used = costs.get(e._book) ?? 0;
            if (!flag(e, "ignore_budget", "ignoreBudget") && (totalCost + cost > overallBudget || used + cost > bookBudget(e._book))) { status.set(e._key, "超出世界书预算"); rejected.add(e._key); continue; }
            accepted.set(e._key, { ...e, content });
            status.set(e._key, sticky(e) ? "持续生效" : pass ? "递归触发" : e.constant ? "常驻" : "关键词触发");
            if (!sticky(e)) activated[e._key] = input.turn;
            costs.set(e._book, used + cost); totalCost += cost; groups(e).forEach(g => chosenGroups.add(g)); added++;
            if (!flag(e, "prevent_recursion", "preventRecursion")) recursionText += "\n" + content;
        }
        const pendingDelayed = entries.some(e => !accepted.has(e._key) && num(flag(e, "delay_until_recursion", "delayUntilRecursion"), 0) > pass);
        if (!added && !pendingDelayed) break;
    }
    const selected = [...accepted.values()].sort((a, b) => a._order - b._order);
    const outlets: Record<string, string> = {};
    for (const e of selected.filter(e => e._position === 7)) { const name = string(e._ext.outlet_name); outlets[name] = [outlets[name], string(e.content)].filter(Boolean).join("\n\n"); }
    return { entries: selected, state: { activated }, report: { entries: entries.map(e => ({ name: e._name, status: status.get(e._key) ?? "未触发" })), estimatedTokens: totalCost, budget: overallBudget }, outlets };
}
