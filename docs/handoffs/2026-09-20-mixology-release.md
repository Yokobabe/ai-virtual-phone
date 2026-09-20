# 2026-09-20 特调限定发布

## 授权与范围
用户明确要求先将已调整的特调提交并推送，晚些时候体验。DAÏS 预设另行一起精简，保留用户原创开篇，本次没有修改或上传私人预设/角色卡。

## 分支与来源
目标 feat/imessage-private-chat，基准 1c71ea6373cea62a1062063726da11f2a387432f；推送前远端同 SHA。包含上游特调限定净补丁及本地三来源、正则、世界书适配；不全量合并 main。
独立发布验证副本：C:/Users/Effy/.codex/worktrees/mixology-release/ai-virtual-phone。只复制下列 49 项，与主目录逐字一致。其他任务未提交改动不纳入。

## 检查
- 独立全量 TypeScript noEmit（incremental false）无错误。
- 原生特调回归、兼容合成回归通过；Kemini、雾中诗人、V3 PNG 实物解析和交叉装配通过，全部离线模拟，无付费模型调用。
- 生产构建及两项 dist 生成、backdrop-filter 恢复通过，73 页，不包含临时 QA 路由。构建自动跳过类型/lint，已另行运行完整 tsc；未另跑 lint。
- 限定差异 whitespace 检查通过。
- 浏览器沿用三来源、正则世界书交接内已通过的隔离 Edge 检查，本轮发布未重跑浏览器。真实模型、真机待用户验收。

## 遗留与发布状态
核心酒柜/导入/酒局不依赖大厅数据库；没有升级线上数据库。酒馆插件脚本、向量检索等边界见 regex-worldbook 交接；JanitorAI 入口只导入含标准卡数据的文件，不同步网站账号或模型。
检查完成后按明确文件清单提交并推送 origin/feat/imessage-private-chat；最终提交 SHA 与远端结果在任务回复和本地 TODO 中记录。Netlify 在线构建状态需单独确认，不把本地构建当成线上已部署。
3003 服务与用户存储未改动。公共 TODO 仅本地更新，避免本次提交夹带其他任务尚未归档的全量清单。

## 产品与检查文件
- app/api/mixology/hall-list/route.ts
- app/api/mixology/hall/route.ts
- components/mixology/connector-sheet.tsx
- components/mixology/mechanism-panel.tsx
- components/mixology/mixology-app.tsx
- components/mixology/mixology-editor.tsx
- components/mixology/mixology-game.tsx
- components/mixology/mixology-hall.tsx
- components/mixology/mixology-preview.tsx
- components/mixology/mixology-shared.tsx
- components/mixology/prose-view.tsx
- components/mixology/slot-editor.tsx
- components/mixology/trusted-slot.tsx
- docs/mixology-supabase.sql
- lib/mascot-prompts.ts
- lib/mascot-tools.ts
- lib/mixology/assembler.ts
- lib/mixology/audio-player.ts
- lib/mixology/builtin.ts
- lib/mixology/card-freeform.ts
- lib/mixology/connectors.ts
- lib/mixology/crafting-guides.ts
- lib/mixology/engine.ts
- lib/mixology/hall-parts.ts
- lib/mixology/mascot-tools.ts
- lib/mixology/mechanism-protocol.ts
- lib/mixology/mechanism-runtime.ts
- lib/mixology/prose.ts
- lib/mixology/storage.ts
- lib/mixology/transfer.ts
- lib/mixology/trusted-runtime.ts
- lib/mixology/types.ts
- styles/mixology.css
- components/resource-hub/resource-hub-app.tsx
- lib/resource-hub-client.ts
- scripts/check-mixology-upstream.cjs
- lib/mixology/compatibility.ts
- lib/mixology/compatibility-runtime.ts
- components/mixology/compatibility-preset-editor.tsx
- scripts/check-mixology-compatibility.cjs
- components/mixology/rich-text.tsx
- lib/mixology/compatibility-regex.ts
- lib/mixology/compatibility-worldbook.ts
- lib/mixology/compatibility-text.ts
- lib/mixology/compatibility-worker.ts
- lib/mixology/compatibility-worker-client.ts
- lib/mixology/compatibility-worker-browser.ts
- components/mixology/compatibility-prose.tsx
- components/mixology/compatibility-data-editor.tsx
