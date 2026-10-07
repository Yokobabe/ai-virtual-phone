import type { MemoryEntry, MemoryConfig } from "./memory-types";
import type { MemoryCognition, MemoryEvidence, CognitionBasis } from "./memory-cognition";
import type { NativeTimelineEntry } from "./short-term-assembler";
import { evidenceFromTimeline } from "./memory-cognition";
import { estimateTokens } from "./token-counter";

function withinBudget(text: string, budget: number): string {
    if (estimateTokens(text) <= budget) return text;
    let low = 0, high = text.length;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (estimateTokens(text.slice(0, middle)) <= budget) low = middle; else high = middle - 1;
    }
    return text.slice(0, low);
}

export function buildCognitionContext(
    characterId: string, memories: MemoryEntry[], timeline: NativeTimelineEntry[], previous: MemoryCognition,
    config: MemoryConfig, mode: "review" | "incremental",
): { events: NativeTimelineEntry[]; sources: MemoryEvidence[]; supplement: string; basis: CognitionBasis } {
    const query = [...timeline.slice(-12).map(e => e.content.slice(0, 800)), previous.mirror?.digest || "", previous.gaze?.digest || ""].join("\n");
    const words = [...new Set(query.toLowerCase().match(/[a-z\d]{2,}|[\p{Script=Han}]{2}/gu) || [])].slice(-256);
    const score = (text: string) => { const normalized = text.toLowerCase(); return words.filter(word => normalized.includes(word)).length; };
    const allowed = (source: string) => config.shortTermAllowedSources?.[source as keyof NonNullable<MemoryConfig["shortTermAllowedSources"]>] !== false;
    const events: NativeTimelineEntry[] = [];
    let eventTokens = 0;
    // A review samples recent history; an incremental summary already has its bounded oldest-first batch.
    if (mode === "review") {
        for (const entry of [...timeline].reverse()) {
            const content = withinBudget(entry.content.slice(0, 12000), 3965), cost = estimateTokens(content) + 35;
            if (eventTokens + cost > 4000) continue;
            events.unshift({ ...entry, content }); eventTokens += cost;
            if (events.length >= 80) break;
        }
    } else {
        events.push(...timeline); eventTokens = estimateTokens(events.map(e => e.content).join("\n"));
    }
    const sources = evidenceFromTimeline(events);
    const supplement: string[] = [];
    let core = 0, longTerm = 0, previousSources = 0, extraTokens = 0;
    const candidates = memories.filter(e => e.characterId === characterId && allowed(e.sourceApp)
        && (e.type === "long_term" || (e.type === "core" && e.metadata?.active !== false)));
    const ranks = new Map(candidates.map(memory => [memory.id, score(memory.content)]));
    for (const kind of ["core", "long_term"] as const) {
        let used = 0;
        const sorted = candidates.filter(e => e.type === kind).sort((a, b) => ranks.get(b.id)! - ranks.get(a.id)!
            || (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt) || a.id.localeCompare(b.id));
        for (const memory of sorted) {
            const content = withinBudget(memory.content.slice(0, 4500), 1450);
            const row = `[memory:${memory.id}] ${kind === "core" ? "核心记忆" : "长期记忆摘要"} ${memory.updatedAt || memory.createdAt}\n${content}`;
            const cost = estimateTokens(row) + 10;
            if (used + cost > 1600) continue;
            if ((kind === "core" ? core : longTerm) >= 8) break;
            supplement.push(row); used += cost; extraTokens += cost;
            sources.push({ id: `memory:${memory.id}`, sourceApp: memory.sourceApp, timestamp: memory.updatedAt || memory.createdAt,
                excerpt: content.slice(0, 600), context: content, kind: "memory" });
            if (kind === "core") core++; else longTerm++;
        }
    }
    const oldSources = [...new Map([...(previous.mirror?.evidence || []), ...(previous.gaze?.evidence || [])].map(e => [e.id, e])).values()]
        .filter(e => allowed(e.sourceApp) && !sources.some(s => s.id === e.id));
    const oldRanks = new Map(oldSources.map(source => [source.id, score(source.excerpt)]));
    oldSources.sort((a, b) => oldRanks.get(b.id)! - oldRanks.get(a.id)! || b.timestamp.localeCompare(a.timestamp));
    let oldTokens = 0;
    for (const source of oldSources) {
        const content = (source.context || source.excerpt).slice(0, 1800);
        const row = `[${source.id}] 旧判断关联材料 ${source.timestamp} ${source.sourceApp}\n${content}`;
        const cost = estimateTokens(row) + 10;
        if (oldTokens + cost > 1200) continue;
        if (previousSources >= 8) break;
        sources.push({ ...source, context: content }); supplement.push(row);
        oldTokens += cost; extraTokens += cost; previousSources++;
    }
    const timestamps = sources.map(s => s.timestamp).filter(Boolean).sort();
    return { events, sources, supplement: supplement.join("\n\n"), basis: {
        mode, events: events.length, core, longTerm, previousSources,
        earliest: timestamps[0], latest: timestamps.at(-1), estimatedTokens: eventTokens + extraTokens,
        sources: [...new Set(sources.map(s => s.sourceApp))], omittedEvents: timeline.length - events.length,
    } };
}
