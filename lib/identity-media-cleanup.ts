import { identityDatabaseIsShared } from "./identity-runtime";

const req = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
/** Shared desktop/library references keep their assets; private world images are collected. */
export async function deleteIdentityMedia(userId: string, legacyOwnerId: string | null, rows: Array<{ key: string; value: string }>, ownsKey: (key: string) => boolean): Promise<string[]> {
  const databases = await indexedDB.databases();
  if (!databases.some(database => database.name === "ai_phone_theme_db_v1")) return [];
  const owned: string[] = rows.filter(row => ownsKey(row.key)).map(row => row.value);
  const retained: string[] = rows.filter(row => !ownsKey(row.key)).map(row => row.value);
  for (const database of databases) {
    if (!database.name || identityDatabaseIsShared(database.name)) continue;
    const isOwned = userId === legacyOwnerId ? !database.name.includes("::identity:") : database.name.endsWith(`::identity:${encodeURIComponent(userId)}`);
    const db = await req(indexedDB.open(database.name));
    try {
      for (const store of Array.from(db.objectStoreNames)) {
        const records = await req(db.transaction(store).objectStore(store).getAll());
        (isOwned ? owned : retained).push(JSON.stringify(records));
      }
    } finally { db.close(); }
  }
  const theme = await req(indexedDB.open("ai_phone_theme_db_v1"));
  try {
    const assets = await req(theme.transaction("assets").objectStore("assets").getAll()) as Array<{ id: string; type: string; ownerUserId?: string }>;
    const deleted = assets.filter(asset => ["chat_bg", "vn_scene", "vn_sprite"].includes(asset.type)
      && (asset.ownerUserId === userId || (!asset.ownerUserId && owned.some(text => text.includes(asset.id))))
      && !retained.some(text => text.includes(asset.id))).map(asset => asset.id);
    const tx = theme.transaction("assets", "readwrite");
    const done = new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    for (const id of deleted) tx.objectStore("assets").delete(id);
    await done; return deleted;
  } finally { theme.close(); }
}
