# Album Background Performance

- Request: fix global typing lag after album release and reduce album distraction in chat.
- Branch/base: feat/imessage-private-chat at e9345b9433cc364407665e4552c0da8164cf5f37. Existing unrelated working-tree changes preserved.
- Changed: lib/photo-album-core.ts, lib/photo-album-discussion.ts, lib/photo-album-review.ts, scripts/check-album-discussion.cjs, scripts/check-album-scheduling.cjs, docs/TODO.md.

## Changes

- Cache parsed core/discussion records until backing KV text changes; external writes still invalidate caches.
- Cache inline-image fingerprints by photo ID and current reference, pruning removed IDs, instead of thrashing an eight-image cache.
- Five-second scheduler ticks skip photo collection when unchanged and no active photo has a due task. Keep a one-minute reconciliation scan for timed sharing and periodic visits.
- Defer startup by 15 seconds and source updates by at least three seconds. Typing pauses review for 15 seconds and aborts its request. Hidden documents and live chat generation locks pause work; expired five-minute locks do not block indefinitely. Focus alone does not prevent idle recovery.
- Yield during queue preparation; pass one asset snapshot into sibling lookup. Aborted requests retain pending tasks. Existing permission/version checks remain.
- Default chat injection reduced from 20 updates/30 seen photos to four each, with bounded descriptions and no repeated comment histories. Authoritative user-defined facts and persisted memory are retained. Explicitly prioritize current chat; omitted older photos must not be guessed.

## Verification

- TypeScript noEmit passed.
- All non-browser check-album*.cjs plus check-photo-album.cjs passed, including scheduling, permissions, versions, actions, generation, discussion, forwarding, references and cleanup.
- Added tests for discussion cache reuse/external invalidation and scheduler quiet periods, resume, generation locks, hidden pages and listener cleanup.
- Synthetic desktop benchmark with 120 completed 16-KiB inline images: queue check about 165ms before / 1.4ms after; repeated fingerprints about 216ms before / 0.2ms after. Not iPhone timings; does not measure first import or full rendering.
- Browser filmstrip regression blocked: after restarting the stopped 3003 server, isolated browser's splash Enter remained disabled and timed out. No browser success claimed. No user storage cleared or real model API invoked.

## Remaining / Delivery

- iPhone Safari/Netlify acceptance still required; not a proof all global lag is eliminated.
- First imports and changed native albums still require scanning and serialization; sibling lookup remains quadratic. Background review may resume after user activity quiets; no offline server scheduling added.
- Current request cancellation does not guarantee upstream provider billing cancellation.
- Local 3003 restarted in this workspace using .next-3003. No commit, push or deployment performed; Netlify remains unchanged.
