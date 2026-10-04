// lib/memory-storage.ts
// IndexedDB persistence for long-term memory entries + short-term events + localStorage config.

import type { MemoryEntry, MemoryConfig } from "./memory-types";
import { DEFAULT_MEMORY_CONFIG } from "./memory-types";
import { kvGet, kvSet, registerKvMigration, registerDynamicPrefix } from "./kv-db";
import { openIndexedDbAtLeast } from "./idb-open";
import type { MemoryCognition } from "./memory-cognition";
import { cognitionRevision, type CognitionRevision, type CognitionHistoryFacet } from "./memory-cognition-history";

// ── Long-term memory DB (unchanged from v1) ──

const DB_NAME = "ai_phone_memory_db_v1";
const DB_VERSION = 5;
const STORE_NAME = "memories";
const COGNITION_STORE = "cognition";
const HISTORY_STORE = "cognition_history";

const CONFIG_KEY = "ai_phone_memory_config_v1";

function hasBrowserApi(): boolean {
    return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function ensureMemoryIndexes(store: IDBObjectStore): void {
    if (!store.indexNames.contains("by_character")) {
        store.createIndex("by_character", "characterId", { unique: false });
    }
    if (!store.indexNames.contains("by_character_type")) {
        store.createIndex("by_character_type", ["characterId", "type"], { unique: false });
    }
    if (!store.indexNames.contains("by_character_created")) {
        store.createIndex("by_character_created", ["characterId", "createdAt"], { unique: false });
    }
}

async function openDb(): Promise<IDBDatabase | null> {
    if (!hasBrowserApi()) return null;
    // Open at >= DB_VERSION: a backup restore may have bumped the stored version
    // higher, and opening at a fixed lower version would throw a VersionError.
    const upgrade = (db: IDBDatabase, _oldVersion: number, tx: IDBTransaction | null) => {
        if (!db.objectStoreNames.contains(COGNITION_STORE)) db.createObjectStore(COGNITION_STORE, { keyPath: "characterId" });
        const newHistory = !db.objectStoreNames.contains(HISTORY_STORE);
        const history = newHistory ? db.createObjectStore(HISTORY_STORE, { keyPath: "id" }) : tx!.objectStore(HISTORY_STORE);
        if (!history.indexNames.contains("by_character_facet_time")) history.createIndex("by_character_facet_time", ["characterId", "facet", "recordedAt", "id"]);
        {
            const cursor = tx!.objectStore(COGNITION_STORE).openCursor();
            cursor.onsuccess = () => {
                if (!cursor.result) return;
                for (const facet of ["mirror", "gaze"] as const) {
                    const revision = cognitionRevision(cursor.result.value, facet);
                    if (revision) {
                        const existing = history.get(revision.id);
                        existing.onsuccess = () => { if (!existing.result) history.add(revision); };
                    }
                }
                cursor.result.continue();
            };
        }
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        } else {
            store = tx!.objectStore(STORE_NAME);
        }
        ensureMemoryIndexes(store);
    };
    try {
        let db = await openIndexedDbAtLeast(DB_NAME, DB_VERSION, upgrade);
        // Old backups can have a higher version but still lack the new cognition store.
        if (!db.objectStoreNames.contains(COGNITION_STORE) || !db.objectStoreNames.contains(STORE_NAME) ||
            !db.objectStoreNames.contains(HISTORY_STORE) ||
            !db.transaction(HISTORY_STORE).objectStore(HISTORY_STORE).indexNames.contains("by_character_facet_time")) {
            const nextVersion = db.version + 1; db.close();
            db = await openIndexedDbAtLeast(DB_NAME, nextVersion, upgrade);
        }
        return db;
    } catch { return null; }
}

function runRequest<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ── Long-term Entry CRUD ──

export async function saveMemoryEntry(entry: MemoryEntry): Promise<void> {
    return saveMemoryEntries([entry]);
}

/** Related memory changes commit in one IDB transaction. */
export async function saveMemoryEntries(entries: MemoryEntry[], cognition?: MemoryCognition, options?: {
    generatedCognition?: MemoryCognition;
    baselineCognition?: MemoryCognition;
    expectedUpdatedAt?: string;
}): Promise<void> {
    const db = await openDb();
    if (!db) throw new Error("记忆数据库暂不可用，未保存");
    try {
        const tx = db.transaction(cognition ? [STORE_NAME, COGNITION_STORE, HISTORY_STORE] : STORE_NAME, "readwrite");
        let failure: Error | null = null;
        const completion = new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(failure || tx.error);
            tx.onabort = () => rej(failure || tx.error || new Error("记忆保存已取消"));
        });
        const abort = (error: unknown) => { failure = error instanceof Error ? error : new Error(String(error)); tx.abort(); };
        try {
            for (const entry of entries) tx.objectStore(STORE_NAME).put(entry);
            if (cognition) {
                const current = tx.objectStore(COGNITION_STORE).get(cognition.characterId);
                current.onsuccess = () => {
                    try {
                        if (options?.expectedUpdatedAt !== undefined && (current.result?.updatedAt || "") !== options.expectedUpdatedAt) throw new Error("认知已变化，整理结果未覆盖新修改");
                        // Archive both ends, including results from an older range that must not replace the current cognition.
                        const seen = new Set<string>();
                        for (const state of [current.result || options?.baselineCognition, cognition, options?.generatedCognition]) {
                            if (!state || state.characterId !== cognition.characterId) continue;
                            for (const facet of ["mirror", "gaze"] as const) {
                                const revision = cognitionRevision(state, facet);
                                if (!revision || seen.has(revision.id)) continue;
                                seen.add(revision.id);
                                const history = tx.objectStore(HISTORY_STORE);
                                const existing = history.get(revision.id);
                                existing.onsuccess = () => { if (!existing.result) history.put(revision); };
                            }
                        }
                        tx.objectStore(COGNITION_STORE).put(cognition);
                    } catch (error) { abort(error); }
                };
            }
        } catch (error) { abort(error); }
        await completion;
    } finally {
        db.close();
    }
}

export async function loadPersistedMemoryCognition(characterId: string): Promise<MemoryCognition | null> {
    const db = await openDb();
    if (!db) return null;
    try { return (await runRequest(db.transaction(COGNITION_STORE, "readonly").objectStore(COGNITION_STORE).get(characterId))) || null; }
    finally { db.close(); }
}

export async function saveCognitionRecord(value: MemoryCognition, baselineCognition?: MemoryCognition): Promise<void> {
    await saveMemoryEntries([], value, { baselineCognition });
}

/** Read-only, newest-first pages; old versions are never loaded into the chat prompt. */
export async function loadCognitionHistory(characterId: string, facet: CognitionHistoryFacet, options?: {
    limit?: number; before?: [string, string];
}): Promise<{ revisions: CognitionRevision[]; before?: [string, string] }> {
    const db = await openDb();
    if (!db) throw new Error("认知历史暂不可用，请重试");
    try {
        const limit = Math.min(50, Math.max(1, options?.limit || 10));
        const lower = [characterId, facet, "", ""];
        const upper = options?.before ? [characterId, facet, ...options.before] : [characterId, facet, "\uffff", "\uffff"];
        const range = IDBKeyRange.bound(lower, upper, false, Boolean(options?.before));
        const req = db.transaction(HISTORY_STORE).objectStore(HISTORY_STORE).index("by_character_facet_time").openCursor(range, "prev");
        return await new Promise((resolve, reject) => {
            const revisions: CognitionRevision[] = [];
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor || revisions.length === limit) {
                    const last = revisions.at(-1);
                    resolve({ revisions, ...(cursor && last ? { before: [last.recordedAt, last.id] as [string, string] } : {}) });
                    return;
                }
                revisions.push(cursor.value); cursor.continue();
            };
        });
    } finally { db.close(); }
}

export async function loadMemoryEntries(characterId: string): Promise<MemoryEntry[]> {
    const db = await openDb();
    if (!db) return [];
    try {
        let entries: MemoryEntry[];
        try {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const idx = store.index("by_character");
            entries = await runRequest(idx.getAll(characterId));
        } catch {
            const tx = db.transaction(STORE_NAME, "readonly");
            const allEntries: MemoryEntry[] = await runRequest(tx.objectStore(STORE_NAME).getAll());
            entries = allEntries.filter(entry => entry.characterId === characterId);
        }
        entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return entries;
    } finally {
        db.close();
    }
}

export async function loadMemoryEntriesByType(
    characterId: string,
    type: MemoryEntry["type"],
): Promise<MemoryEntry[]> {
    const entries = await loadMemoryEntries(characterId);
    return entries.filter(entry => entry.type === type);
}

export async function deleteMemoryEntry(id: string): Promise<void> {
    const db = await openDb();
    if (!db) return;
    try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    } finally {
        db.close();
    }
}

export async function deleteMemoryEntries(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await openDb();
    if (!db) return;
    try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const id of ids) {
            store.delete(id);
        }
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    } finally {
        db.close();
    }
}

export async function deleteCharacterMemories(characterId: string): Promise<void> {
    const entries = await loadMemoryEntries(characterId);
    await deleteMemoryEntries(entries.map(e => e.id));
}

export async function deleteCharacterMemoriesByType(
    characterId: string,
    type: MemoryEntry["type"],
): Promise<void> {
    const entries = await loadMemoryEntriesByType(characterId, type);
    await deleteMemoryEntries(entries.map(e => e.id));
}

export async function getAllCharacterIdsWithMemories(): Promise<string[]> {
    const db = await openDb();
    if (!db) return [];
    try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const entries: MemoryEntry[] = await runRequest(tx.objectStore(STORE_NAME).getAll());
        const ids = new Set<string>();
        for (const e of entries) ids.add(e.characterId);
        return Array.from(ids);
    } finally {
        db.close();
    }
}

export async function getMemoryCount(characterId: string): Promise<number> {
    const entries = await loadMemoryEntries(characterId);
    return entries.length;
}

export async function getMemoryCountByType(
    characterId: string,
    type: MemoryEntry["type"],
): Promise<number> {
    const entries = await loadMemoryEntriesByType(characterId, type);
    return entries.length;
}

// ── Config (localStorage for fast sync access) ──

export function loadMemoryConfig(): MemoryConfig {
    if (typeof window === "undefined") return { ...DEFAULT_MEMORY_CONFIG };
    try {
        const raw = kvGet(CONFIG_KEY);
        if (!raw) return { ...DEFAULT_MEMORY_CONFIG };
        return { ...DEFAULT_MEMORY_CONFIG, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_MEMORY_CONFIG };
    }
}

export function saveMemoryConfig(config: MemoryConfig): void {
    if (typeof window === "undefined") return;
    kvSet(CONFIG_KEY, JSON.stringify(config));
}

// ── Per-character event counter (localStorage) ──

const EVENT_COUNTER_PREFIX = "ai_phone_mem_evt_count_";
const LAST_SUMMARY_TS_PREFIX = "ai_phone_mem_last_sum_";
const CORE_COUNTER_PREFIX = "ai_phone_mem_core_count_";
const LAST_CORE_SUMMARY_TS_PREFIX = "ai_phone_mem_last_core_sum_";
const PENDING_SUMMARY_PREFIX = "ai_phone_mem_pending_sum_";
registerKvMigration(CONFIG_KEY);
registerDynamicPrefix(EVENT_COUNTER_PREFIX);
registerDynamicPrefix(LAST_SUMMARY_TS_PREFIX);
registerDynamicPrefix(CORE_COUNTER_PREFIX);
registerDynamicPrefix(LAST_CORE_SUMMARY_TS_PREFIX);
registerDynamicPrefix(PENDING_SUMMARY_PREFIX);

export function getPendingSummaryTimestamp(characterId: string): string | null { return kvGet(PENDING_SUMMARY_PREFIX + characterId); }
export function setPendingSummaryTimestamp(characterId: string, timestamp: string | null): void { kvSet(PENDING_SUMMARY_PREFIX + characterId, timestamp || ""); }

export function getEventCounter(characterId: string): number {
    if (typeof window === "undefined") return 0;
    const val = kvGet(EVENT_COUNTER_PREFIX + characterId);
    return val ? parseInt(val, 10) || 0 : 0;
}

export function incrementEventCounter(characterId: string): number {
    const next = getEventCounter(characterId) + 1;
    if (typeof window !== "undefined") {
        kvSet(EVENT_COUNTER_PREFIX + characterId, String(next));
    }
    return next;
}

export function resetEventCounter(characterId: string, remaining = 0): void {
    if (typeof window === "undefined") return;
    kvSet(EVENT_COUNTER_PREFIX + characterId, String(Math.max(0, remaining)));
}

export function getLastSummarizedTimestamp(characterId: string): string | null {
    if (typeof window === "undefined") return null;
    return kvGet(LAST_SUMMARY_TS_PREFIX + characterId) || null;
}

export function setLastSummarizedTimestamp(characterId: string, ts: string): void {
    if (typeof window === "undefined") return;
    kvSet(LAST_SUMMARY_TS_PREFIX + characterId, ts);
}

export function getCoreMemoryCounter(characterId: string): number {
    if (typeof window === "undefined") return 0;
    const val = kvGet(CORE_COUNTER_PREFIX + characterId);
    return val ? parseInt(val, 10) || 0 : 0;
}

export function incrementCoreMemoryCounter(characterId: string): number {
    const next = getCoreMemoryCounter(characterId) + 1;
    if (typeof window !== "undefined") {
        kvSet(CORE_COUNTER_PREFIX + characterId, String(next));
    }
    return next;
}

export function resetCoreMemoryCounter(characterId: string): void {
    if (typeof window === "undefined") return;
    kvSet(CORE_COUNTER_PREFIX + characterId, "0");
}

export function getLastCoreSummarizedTimestamp(characterId: string): string | null {
    if (typeof window === "undefined") return null;
    return kvGet(LAST_CORE_SUMMARY_TS_PREFIX + characterId) || null;
}

export function setLastCoreSummarizedTimestamp(characterId: string, ts: string): void {
    if (typeof window === "undefined") return;
    kvSet(LAST_CORE_SUMMARY_TS_PREFIX + characterId, ts);
}
