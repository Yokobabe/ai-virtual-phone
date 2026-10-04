// lib/memory-service.ts
// High-level memory orchestration: retrieve long-term memories for prompt injection.

import type { MemoryConfig, MemoryEntry } from "./memory-types";
import { loadMemoryEntriesByType, loadPersistedMemoryCognition } from "./memory-storage";
import { resolveAuxiliaryApiConfig } from "./settings-storage";
import { generateEmbedding, resolveEmbeddingModel, cosineSimilarity } from "./memory-embedding";
import { estimateTokens } from "./token-counter";
import { assertIdentityActive, getCurrentIdentityId } from "./identity-runtime";
import { canCurrentIdentityInteract } from "./identity-access";
import { kvGet, kvSet, registerDynamicPrefix } from "./kv-db";
import { loadMemoryCognition, cacheMemoryCognition } from "./memory-cognition";
import type { ApiConfig } from "./settings-types";

const queryCache = new Map<string, { at: number; value: Promise<number[] | null> }>();
async function cachedQueryEmbedding(text: string, api: ApiConfig): Promise<{ embedding: number[] | null; cached: boolean }> {
    const key = JSON.stringify([getCurrentIdentityId(), api.id, api.provider, api.baseUrl, resolveEmbeddingModel(api), text]);
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.at < 300000) return { embedding: await cached.value, cached: true };
    const entry = { at: Date.now(), value: generateEmbedding(text, api).catch(() => null) };
    queryCache.set(key, entry);
    if (queryCache.size > 16) queryCache.delete(queryCache.keys().next().value!);
    const embedding = await entry.value;
    if (!embedding && queryCache.get(key) === entry) queryCache.delete(key);
    return { embedding, cached: false };
}

const RECALL_PREFIX = "ai_phone_memory_recall_v1_";
registerDynamicPrefix(RECALL_PREFIX);
export type MemoryRecallInfo = { mode: "all" | "vector" | "keyword" | "empty"; candidates: number; selected: number; estimatedTokens: number; at: string; reason?: string };
export function loadMemoryRecallInfo(characterId: string): MemoryRecallInfo | null {
    try { return JSON.parse(kvGet(RECALL_PREFIX + characterId) || "null"); } catch { return null; }
}

export function lexicalMemoryScore(content: string, query: string): number {
    const normalized = content.toLowerCase();
    const words = new Set(query.toLowerCase().match(/[a-z\d]{2,}|[\p{Script=Han}]{2,}/gu) || []);
    const terms = [...words].flatMap(word => /\p{Script=Han}/u.test(word) && word.length > 2
        ? Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2)) : [word]);
    return terms.length ? terms.filter(t => normalized.includes(t)).length / terms.length : 0;
}

/**
 * Retrieve relevant long-term memories for prompt injection.
 * Rank by vector + keywords when available; unindexed entries participate via keywords.
 * Otherwise use keyword matches, or a small recent fallback; fill within both budgets and top-K.
 * Embedding API is resolved from auxiliary binding (global, not per-character).
 */
export async function retrieveMemoriesForPrompt(
    characterId: string,
    currentContext: string,
    config: MemoryConfig
): Promise<MemoryEntry[]> {
    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return [];
    const longTermEntries = await loadMemoryEntriesByType(characterId, "long_term");
    assertIdentityActive();
    const cognition = await loadPersistedMemoryCognition(characterId);
    if (cognition?.updatedAt && cognition.updatedAt !== loadMemoryCognition(characterId).updatedAt) await cacheMemoryCognition(cognition);
    const budget = Math.max(0, Math.min(config.longTermTokenBudget, config.recallTokenBudget ?? 1800));
    const limit = Math.max(1, Math.min(config.recallMaxEntries ?? 8, 32));
    const finish = (entries: MemoryEntry[], mode: MemoryRecallInfo["mode"], reason?: string) => {
        assertIdentityActive();
        if (!canCurrentIdentityInteract(characterId)) return [];
        kvSet(RECALL_PREFIX + characterId, JSON.stringify({ mode, reason, candidates: longTermEntries.length,
            selected: entries.length, estimatedTokens: entries.reduce((sum, e) => sum + estimateTokens(e.content) + 4, 0), at: new Date().toISOString() }));
        return entries;
    };
    if (!longTermEntries.length || !currentContext.trim() || !budget) return finish([], "empty", "没有可召回的记忆或上下文");

    // Rank before filling the budget, even for small libraries. Unindexed memories remain eligible.
    const embeddingApiConfig = config.vectorRecallEnabled ? resolveAuxiliaryApiConfig("embeddingApiConfigId") : null;
    let vectorReason = config.vectorRecallEnabled ? "未配置有效向量模型或记忆尚未向量化" : "向量召回已关闭";
    if (longTermEntries.length > 1 && longTermEntries.some(e => e.embedding?.length) && embeddingApiConfig && resolveEmbeddingModel(embeddingApiConfig)) {
        const query = await cachedQueryEmbedding(currentContext.slice(-6000), embeddingApiConfig);
        const queryEmbedding = query.embedding;
        assertIdentityActive();
        if (queryEmbedding) {
            const withEmbeddings = longTermEntries.filter(m => m.embedding?.length === queryEmbedding.length);
            if (withEmbeddings.length > 0) {
                const scored = longTermEntries.map(entry => ({
                    entry,
                    score: (entry.embedding?.length === queryEmbedding.length ? Math.max(0, cosineSimilarity(queryEmbedding, entry.embedding)) : 0)
                        + lexicalMemoryScore(entry.content, currentContext),
                }));
                scored.sort((a, b) => b.score - a.score || b.entry.createdAt.localeCompare(a.entry.createdAt));
                return finish(fillByBudget(scored.filter(s => s.score >= 0.2).map(s => s.entry), budget, limit), "vector", query.cached ? "复用近期相同话题的查询向量" : undefined);
            }
            vectorReason = "向量维度不匹配，使用关键词与近期记忆";
        } else {
            vectorReason = "向量请求失败，使用关键词与近期记忆";
        }
    }
    if (longTermEntries.length === 1) return finish(fillByBudget(longTermEntries, budget, limit), "all", "仅一条记忆，无需向量排序");
    const sorted = [...longTermEntries].sort(
        (a, b) => lexicalMemoryScore(b.content, currentContext) - lexicalMemoryScore(a.content, currentContext) || b.createdAt.localeCompare(a.createdAt)
    );
    const relevant = sorted.filter(e => lexicalMemoryScore(e.content, currentContext) > 0);
    return finish(fillByBudget(relevant.length ? relevant : sorted.slice(0, 2), budget, limit), "keyword", vectorReason);
}

export async function retrieveCoreMemoriesForPrompt(
    characterId: string,
    config: MemoryConfig,
): Promise<MemoryEntry[]> {
    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return [];
    const coreEntries = await loadMemoryEntriesByType(characterId, "core");
    if (coreEntries.length === 0) return [];

    const sorted = coreEntries.filter(e => e.metadata?.active !== false).sort((a, b) => {
        const aActive = a.metadata?.active ? 1 : 0;
        const bActive = b.metadata?.active ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aDate = String(a.metadata?.eventDate ?? a.updatedAt ?? a.createdAt);
        const bDate = String(b.metadata?.eventDate ?? b.updatedAt ?? b.createdAt);
        return bDate.localeCompare(aDate);
    });

    return fillByBudget(sorted, config.coreMemoryTokenBudget);
}

/** Pick entries in order until token budget is exhausted. */
export function fillByBudget(entries: MemoryEntry[], budget: number, limit = Infinity): MemoryEntry[] {
    const result: MemoryEntry[] = [];
    let used = 0;
    for (const entry of entries) {
        const tokens = estimateTokens(entry.content) + 4;
        if (result.length >= limit) break;
        if (used + tokens > budget) continue;
        result.push(entry);
        used += tokens;
    }
    return result;
}
