import type { CognitionFacet, MemoryCognition } from "./memory-cognition";

export type CognitionHistoryFacet = "mirror" | "gaze";
export type CognitionRevision = {
    id: string;
    characterId: string;
    facet: CognitionHistoryFacet;
    value: CognitionFacet;
    recordedAt: string;
    origin: "generated" | "legacy";
    emotion?: CognitionFacet;
    mood?: CognitionFacet;
};

/** A stable legacy key avoids inventing new versions when only an item's status changes. */
export function cognitionRevision(state: MemoryCognition, facet: CognitionHistoryFacet): CognitionRevision | null {
    const value = state[facet];
    if (!value) return null;
    const id = JSON.stringify([state.characterId, facet, value.revisionId || [value.updatedAt, value.text, value.digest || "", value.evidence]]);
    return {
        id, characterId: state.characterId, facet, value,
        recordedAt: value.generatedAt || value.updatedAt,
        origin: value.revisionId ? "generated" : "legacy",
        ...(facet === "mirror" ? { emotion: state.emotion, mood: state.mood } : {}),
    };
}
