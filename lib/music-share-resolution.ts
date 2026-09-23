import { unifiedSearch, type UnifiedSearchResult } from "./music-service";
import type { MusicTrack } from "./music-storage";

const normalized = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}]/gu, "");

/** Do not silently substitute a cover artist or a different recording title. */
export function selectSharedSong(results: UnifiedSearchResult[], title: string, artist?: string) {
    if (!artist?.trim()) return null;
    return results.find(item => normalized(item.title) === normalized(title)
        && item.artist.split(/\s*[/、,;&]\s*/).some(name => normalized(name) === normalized(artist))
    ) || results.find(item => normalized(item.title) === normalized(title)
        && normalized(item.artist) === normalized(artist)) || null;
}

export async function resolveSharedSong(title: string, artist?: string): Promise<MusicTrack | null> {
    if (!artist?.trim()) return null;
    // Title-only search includes local tracks too; combined queries miss local exact matches.
    let match = selectSharedSong(await unifiedSearch(title), title, artist);
    if (!match) match = selectSharedSong(await unifiedSearch(`${title} ${artist}`), title, artist);
    if (match?.localTrack) {
        const track = match.localTrack;
        return { ...track, coverUrl: track.coverUrl?.startsWith("blob:") ? undefined : track.coverUrl };
    }
    const song = match?.neteaseResult;
    if (!song) return null;
    return { id: `netease_${song.id}`, title: song.name, artist: song.artists, album: song.album,
        duration: song.duration / 1000, coverUrl: song.coverUrl, liked: false, addedAt: new Date().toISOString() };
}
