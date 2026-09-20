# 2026-09-20 独家特调上游整合

## 需求与授权
用户要求仔细核对独家特调，确认兼容后整合到自己的定制分支。仅授权特调及其必要依赖；未授权 commit、push、部署或真实模型/账号操作。

## 分支、基准与来源
- 目标：feat/imessage-private-chat，HEAD 1c71ea6373cea62a1062063726da11f2a387432f。
- 上游：xiaolongbao0709/ai-virtual-phone，固定 fc65539c8494b9328ea76c1e557ec12b168e24bc。
- 共同基准：784c23814fead1203e7ba731a250b3714e17a161。
- 隔离 worktree：C:/Users/Effy/.codex/worktrees/float-mixology-upstream/ai-virtual-phone，从定制 HEAD 创建；不包含主目录未提交定制。
- 特调核心和选定共享文件相对共同基准没有本地已提交定制，也没有本轮前的未提交修改。采用上游最终净补丁，因此包含后续修正，不带入已回退的 mix.draft 等中间状态。
- 核心目录、特调 API、小卷特调工具/提示词、特调 SQL 使用基准到上游固定 SHA 的限定路径补丁；资源集市仅取 6a07593 的特调信任模式导入门禁补丁，排除其他集市更新。
- 语音 4c727a6 仅保留其在特调 audio-player 内的更新，不引入共享 TTS/微信改动。未修改 package.json/lock，无需新依赖。

## 已整合内容
- 序言/核对材料、标题覆盖、官方件复制、一框式角色卡。
- 连接器、对白按钮和官方朗读机括、宿主音频、机括信任模式与导入提示。
- 机括完整存档、sections/lastReply/rawReply 钩子、历史重跑滤网。
- 特调正文 HTML/代码块、槽位长按排序、历史懒加载、酒局轮数、弹层层级等上游修复。
- 必要共享修改限制在小卷特调套件、资源集市特调导入确认、特调 API 类型白名单和 SQL。
- 新增 scripts/check-mixology-upstream.cjs，使用内存 KV 和模拟模型，禁止真实网络。

## 行为差异与边界
- 序言与核对不再隐式附加；需要时在特调配方装入官方材料。旧配方可读，但未选这些槽位时提示词会按上游规则改变。
- 漏写状态栏不再自动追加补写请求。
- 普通机括继续沙盒运行；信任模式是显式材料属性，陌生来源导入/装入配方保留上游确认流程，可在宿主页面运行。没有导入或执行用户真实第三方脚本。
- 大厅 preface/checklist 类型所需 docs/mixology-supabase.sql 已更新；未执行数据库升级，未验证线上大厅发布。如果后台仍是旧约束，新类型发布需要另外执行该专用脚本的升级段。
- 连接器保存在 mixology_connectors_v1；通用 KV 备份有未注册键的兜底覆盖，本次不引入上游全局云凭证备份改造。

## 验证
通过：
- 隔离 worktree 完整 TypeScript noEmit（incremental false），退出 0。
- 隔离 worktree 生产构建：先执行项目两项 dist 生成，再 next build、restore-backdrop-filter，全流程成功。Next 配置会跳过内置类型检查，以上独立 tsc 已单独通过。
- 新特调回归：旧字符串槽位、旧配方读盘不写迁移、一框式/序言/核对与宏、长机括记忆、模板转义/参数/限流、材料导入、HTML 解析、单次请求、原文保留、临时历史隔离、重跑滤网、信任实例生命周期。
- 相册核心/事实与相册动作协议回归通过。
- Playwright + Edge 新临时浏览器上下文，430×932 手机宽度；酒柜、连接器预设保存、旧酒局轮数、历史分批展开、页面无横向溢出或 pageerror，截图人工检查。外网与所有 /api 请求被拦截，没有真实模型/TTS请求。
- 浏览器入口为隔离副本临时 /mixology-qa，端口 3017；测试路由和仅放行该路由的 middleware 改动未整合回主目录。系统浅/深色环境下截图检查不代表特调改变了自身原有暗色设计。
- 主目录整合后完整 tsc 与新特调回归再次通过。
- 36 个整合文件 SHA256 与已测试副本逐一一致；所有整合前已跟踪文件的未提交改动逐字保留；限定范围 git diff --check 通过。

未通过或未验证：
- 旧 check-chat-multi-photo.cjs、check-chat-echo.cjs 因 mock 未提供 ./image-grid-split 停止，不能称通过；这两个测试和解析器本轮无差异。
- check-group-mentions.cjs 的浏览器部分因 require('playwright') 未找到依赖停止，不能称通过（特调浏览器测试用已安装 runtime 的明确路径运行）。
- 未执行真机、真实模型、真实 TTS、真实连接器调用、线上大厅发布或 3003 完整交互回归。

## 整合与交付状态
已将审核后的限定补丁应用到主目录 feat/imessage-private-chat 的工作区，未暂存、未创建提交或 merge commit、未推送、未部署。HEAD 保持 1c71ea6；Git 历史不会把这 85 个上游提交视为已合并，以后全量同步时仍须按实际差异审查。
未切换共享目录分支、未改 main、未删除用户数据、未停止/抢占 3003。
验收结束已停止本任务的 3017 隔离服务；3003 原服务仍保留。
隔离构建生成的 Supabase dist、临时 QA 路由、middleware、tsconfig 和构建输出均排除在整合外。
本轮交接与 TODO 同步更新。后续需用户真机验收，再按指定文件另行授权提交/推送。

## 整合文件（36 项，另加本交接和 TODO）
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
