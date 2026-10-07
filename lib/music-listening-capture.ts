import { getMusicControlBridge } from "./music-control-bridge";
import { assertIdentityActive, getCurrentIdentityId } from "./identity-runtime";
import { createMusicListeningContext, type MusicListeningContext } from "./music-listening";

export function captureMusicListeningContext(capturedAt = new Date().toISOString(), reference?: MusicListeningContext | null): MusicListeningContext | null {
    assertIdentityActive();
    const owner = getCurrentIdentityId();
    if (reference?.reference && reference.identityId === owner) {
        // A selected lyric keeps its source even if playback has changed songs.
        return { ...reference, capturedAt, lines: reference.lines.map(line => ({ ...line })), reference: { ...reference.reference } };
    }
    const snapshot = getMusicControlBridge()?.getState();
    if (!snapshot || snapshot.identityId !== owner) return null;
    return createMusicListeningContext(snapshot, owner, capturedAt) || null;
}
