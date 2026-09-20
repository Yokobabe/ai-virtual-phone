# Album performance hotfix release

- Request: urgently publish the album background performance fix to the user's integration branch.
- Branch/base: feat/imessage-private-chat, e9345b9433cc364407665e4552c0da8164cf5f37; remote base verified before release.
- Scope: lib/photo-album-core.ts, lib/photo-album-discussion.ts, lib/photo-album-review.ts, scripts/check-album-discussion.cjs, scripts/check-album-scheduling.cjs, and the two performance handoffs. Other dirty chat, music, pixel-world and infrastructure files excluded.
- Changes: cache parsed records and image fingerprints; throttle unchanged background scans; yield to typing/chat generation/hidden pages; preserve pending work on cancellation; reduce default album chat context without deleting stored memories or authoritative facts.
- Validation: current TypeScript noEmit and every non-browser check-album*.cjs plus check-photo-album.cjs passed on 2026-09-20. Prior browser test was blocked by splash Enter remaining disabled; no iPhone performance or deployed build success claimed.
- Delivery: user explicitly authorized commit/push this turn. This handoff is included in the hotfix commit; actual push result recorded in local TODO after verification.
- Remaining: mobile Safari acceptance and Netlify build completion. No real model calls or storage clearing performed.
