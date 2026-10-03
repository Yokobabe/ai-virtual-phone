/** Local pre-migration snapshots; never exported or sent to a server automatically. */
import Dexie, { type Table } from "dexie";
import { createIdentityId } from "./identity-space";
import { IDENTITY_RUNTIME_KEY, isSharedIdentityKey, identityDatabaseIsShared, silenceIdentityRuntime } from "./identity-runtime";
type RecoveryMeta = { id: string; createdAt: string; complete: boolean; local: Array<[string, string]>; databases: Array<{ name: string; version: number; stores: Array<{ name: string; keyPath: string | string[] | null; autoIncrement: boolean; indexes: Array<{ name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }> }> }> };
type RecoveryChunk = { id: string; recoveryId: string; database: string; store: string; rows: unknown[]; keys: IDBValidKey[] };
class RecoveryDb extends Dexie {
  points!: Table<RecoveryMeta, string>;
  chunks!: Table<RecoveryChunk, string>;
  constructor() { super("AiPhoneIdentityRecoveryDB"); this.version(1).stores({ points: "id, createdAt", chunks: "id, recoveryId" }); }
}
const recovery = new RecoveryDb();
/** Deletion also removes the deleted world's private copies from local recovery points. */
export async function purgeIdentityRecoveryData(userId: string, legacyOwnerId: string | null, removedAssetIds: string[]): Promise<void> {
  const prefix = `identity:${encodeURIComponent(userId)}:`;
  const ownsKey = (key: string) => userId === legacyOwnerId ? !key.startsWith("identity:") && !isSharedIdentityKey(key) && key !== IDENTITY_RUNTIME_KEY : key.startsWith(prefix);
  const ownsDb = (name: string) => !identityDatabaseIsShared(name) && (userId === legacyOwnerId ? !name.includes("::identity:") : name.endsWith(`::identity:${encodeURIComponent(userId)}`));
  await recovery.transaction("rw", recovery.points, recovery.chunks, async () => {
    for (const point of await recovery.points.toArray()) {
      point.databases = point.databases.filter(database => !ownsDb(database.name));
      point.local = point.local.filter(([key]) => !ownsKey(key)).map(([key, value]) => {
        if (key === IDENTITY_RUNTIME_KEY) {
          const state = JSON.parse(value);
          state.userIds = state.userIds.filter((id: string) => id !== userId);
          state.deletingUserIds = state.deletingUserIds.filter((id: string) => id !== userId);
          if (state.activeUserId === userId) state.activeUserId = state.userIds[0] ?? null;
          return [key, JSON.stringify(state)];
        }
        return [key, value];
      });
      await recovery.points.put(point);
      for (const chunk of await recovery.chunks.where("recoveryId").equals(point.id).toArray()) {
        if (ownsDb(chunk.database)) { await recovery.chunks.delete(chunk.id); continue; }
        const keep = (row: any) => {
          if (chunk.database === "AiPhoneKvDB") return !ownsKey(row.key);
          if (chunk.database === "ai_phone_theme_db_v1") return !removedAssetIds.includes(row.id);
          return true;
        };
        const indices = chunk.rows.map((_, i) => i).filter(i => keep(chunk.rows[i]));
        chunk.rows = indices.map(i => {
          const row = chunk.rows[i] as { key?: string; value?: string };
          if (row.key === "ai_phone_user_identities_v1") return { ...row, value: JSON.stringify(JSON.parse(row.value!).filter((identity: { id: string }) => identity.id !== userId)) };
          if (row.key === "float_identity_character_access_v1") return { ...row, value: JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(row.value!)).map(([charId, ids]) => [charId, (ids as string[]).filter(id => id !== userId)]))) };
          return row;
        });
        chunk.keys = indices.map(i => chunk.keys[i]);
        await recovery.chunks.put(chunk);
      }
    }
  });
}
function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export async function createIdentityRecoveryPoint(): Promise<string> {
  const id = `identity-before-${createIdentityId()}`;
  const local: Array<[string, string]> = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i); if (key) local.push([key, window.localStorage.getItem(key) ?? ""]);
  }
  const meta: RecoveryMeta = { id, createdAt: new Date().toISOString(), complete: false, local, databases: [] };
  await recovery.points.put(meta);
  if (!indexedDB.databases) throw new Error("当前浏览器无法建立完整身份备份，请先升级浏览器");
  const databases = await indexedDB.databases();
  try {
    for (const entry of databases) {
      if (!entry.name || entry.name === "AiPhoneIdentityRecoveryDB") continue;
      const db = await req(indexedDB.open(entry.name));
      try {
        const definition: RecoveryMeta["databases"][number] = { name: db.name, version: db.version, stores: [] };
        for (const name of Array.from(db.objectStoreNames)) {
          const info = db.transaction(name).objectStore(name);
          definition.stores.push({ name, keyPath: info.keyPath, autoIncrement: info.autoIncrement,
            indexes: Array.from(info.indexNames).map(indexName => { const index = info.index(indexName); return { name: index.name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }; }) });
          let lastKey: IDBValidKey | undefined; let chunk = 0;
          while (true) {
            const store = db.transaction(name).objectStore(name);
            const range = lastKey === undefined ? undefined : IDBKeyRange.lowerBound(lastKey, true);
            const [rows, keys] = await Promise.all([req(store.getAll(range, 64)), req(store.getAllKeys(range, 64))]);
            if (!keys.length) break;
            await recovery.chunks.put({ id: JSON.stringify([id, db.name, name, chunk++]), recoveryId: id, database: db.name, store: name, rows, keys });
            lastKey = keys[keys.length - 1];
          }
        }
        meta.databases.push(definition);
      } finally { db.close(); }
    }
    meta.complete = true; await recovery.points.put(meta); return id;
  } catch (error) {
    await recovery.chunks.where("recoveryId").equals(id).delete();
    await recovery.points.delete(id); throw error;
  }
}
export async function listIdentityRecoveryPoints(): Promise<Array<{ id: string; createdAt: string }>> {
  return (await recovery.points.toArray()).filter(point => point.complete).map(({ id, createdAt }) => ({ id, createdAt }));
}

/** Explicit recovery action only, never part of normal app initialization. */
export async function restoreIdentityRecoveryPoint(id: string): Promise<void> {
  const point = await recovery.points.get(id);
  if (!point?.complete) throw new Error("身份恢复点不存在或不完整");
  silenceIdentityRuntime();
  for (const database of await indexedDB.databases()) {
    if (!database.name || database.name === "AiPhoneIdentityRecoveryDB") continue;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(database.name!);
      request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("请先关闭其他 Float 页面，再恢复数据"));
    });
  }
  for (const definition of point.databases) {
    const request = indexedDB.open(definition.name, definition.version);
    request.onupgradeneeded = () => {
      for (const info of definition.stores) {
        if (request.result.objectStoreNames.contains(info.name)) continue;
        const store = request.result.createObjectStore(info.name, { keyPath: info.keyPath, autoIncrement: info.autoIncrement });
        for (const index of info.indexes) store.createIndex(index.name, index.keyPath, { unique: index.unique, multiEntry: index.multiEntry });
      }
    };
    const db = await req(request);
    try {
      for (const info of definition.stores) {
        const chunks = (await recovery.chunks.where("recoveryId").equals(id).toArray()).filter(chunk => chunk.database === db.name && chunk.store === info.name);
        const tx = db.transaction(info.name, "readwrite");
        const done = new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
        const store = tx.objectStore(info.name); store.clear();
        for (const chunk of chunks) for (let i = 0; i < chunk.rows.length; i++) {
          if (info.keyPath === null) store.put(chunk.rows[i], chunk.keys[i]); else store.put(chunk.rows[i]);
        }
        await done;
      }
    } finally { db.close(); }
  }
  window.localStorage.clear();
  for (const [key, value] of point.local) window.localStorage.setItem(key, value);
}
