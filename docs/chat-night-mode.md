# Chat appearance — incremental rollout

Status: first iteration, chat screen only. Desktop and other apps are not migrated.

- Follow device `prefers-color-scheme`, including live changes.
- Independently sample wallpaper brightness locally; dark wallpaper improves quote and sender-name contrast even in light mode.
- Preserve wallpaper pixels and avatar-derived name hue. Do not restore viewport fading masks.
- Cross-origin sampling failure falls back to normal styling; never proxy/upload an image to classify it.
- Every newly finalized screen needs a light/dark appearance review before joining the rollout.

- Transfer and gift cards now have scoped dark surfaces, readable labels/amounts and separators; transfer detail styling is included. Card dimensions are unchanged. Device visual review remains pending.

Next checks: mixed-brightness wallpapers/local contrast, remaining media-card variants, chat settings and secondary sheets, manual light/dark/system preference. These are not all fully adapted in this first iteration.
