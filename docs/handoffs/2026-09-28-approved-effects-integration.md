# 已验收三种屏幕特效正式接入

## 范围与基准

- 用户批准 Echo v4、Love v5、Fireworks v2 全部接入正式聊天；追加发送候选纯文字、角色能发送与理解爱心/烟花、视觉需结合聊天背景及页面。
- 分支 `feat/imessage-private-chat`，基准 `dd4420509d39612a9bd37daeec6d17924524eff5`。共享目录大量已有改动保留；未切分支、未重置、未 commit/push/部署。
- 本条替代此前“独立预览待接入”的状态，不重新修改已验收的造型和主要动效参数。

## 定稿来源

- 本机可视化目录的 `versions/echo-motion-study-v4-approved.html`：SHA256 `0995C89AA8FA1C051D71A7DDC1CE4A505E14B80AA7BBFE7339C62F8A7E9009F2`。
- `versions/love-motion-study-v5-approved.html`：SHA256 `A121F4CA3791A6B4344F1D0B1573F073FC12BD410EF16451FCD0D6422F1DA680`。
- 本次冻结 `versions/fireworks-motion-study-v2-approved.html`：SHA256 `B99E04138FC4E821F3693295F7567FBF8F588D04BA7CAE205DDBD010EAC399AD`。
- 从定稿抽取渲染模块，去掉实验页假聊天背景、假气泡和播放控件；不把演示场景搬进正式聊天。

## 改动

- `lib/message-effects/*-renderer.js` 及 `.d.ts`：定稿渲染核心和类型化调用边界。Echo 240 副本 / 6 秒；Love 金属曲面 / 6 秒；Fireworks 13 次爆发、末段六次连放与余烬 / 9.2 秒。按真实容器宽高换算，Love 源点来自实际消息，反光使用当前可见消息和顶栏。
- `components/chat/message-effect-playback.tsx`：统一 Canvas 播放、快照、跳过、尺寸变化、后台暂停、减少动态、卸载资源清理；WebGL 不可用时 Love 显示简化效果提示。
- `components/chat/use-chat-echo.tsx`：三效果共用队列，保存对应消息 ID；旧消息不自动重播，支持手动重播，不互相覆盖。
- `components/chat/chat-room.tsx`、`styles/imessage26.css`：长按发送键后只显示「回声 / 爱心 / 烟花」三个文字选项，无图标；新增烟花发送、分组隔离与重播。其他页面、气泡材质不改。
- `lib/chat-storage.ts`：增加 fireworks 枚举与 screenEffectScene 元数据。
- `lib/chat-fireworks.ts`、`lib/chat-love.ts`、`lib/chat-echo.ts`、`lib/rich-message-parser.ts`、`lib/stream-preview.ts`：三种协议及历史语义、去除流式标记碎片；同一次富消息解析最多一条特效，角色是否使用自行决定。
- `lib/chat-engine.ts`、`lib/group-chat-engine.ts`、`lib/llm-prompt-assembler.ts`：私聊/群聊都提供角色能力和历史语义。背景不限定星空；不声称模型看见未提供的画面。
- `lib/message-effects/capture.ts`、`scene-memory.ts`：本地合成可见背景、消息文字/图片、顶栏与特效的代表性关键帧，保存到本地资产库并关联消息。下一次正常模型请求且开启识图时附上最近场景；不额外调用模型，不采集草稿、不跨会话读取，重播不重复存储。

## 视觉上下文边界

- 是根据当前聊天 DOM 测量合成的参考关键帧，不是逐像素截图、实时录像，也不保证用户完整观看。提示词明确区分当时场景和当前背景。
- 普通背景图、文字、照片及顶栏参与合成；复杂媒体、跨域失败资源、变换叠图/标记层可能不完整，记录 partial 并禁止模型猜测缺失部分。未发送草稿不采集。
- 用户发送效果时能进入随后正常请求；角色自己发送的最终画面须等它实际播放/快照完成后，在后续正常请求中读取。后台未播放、减少动态或资源失败时可能没有视觉快照，仍保留特效历史语义。
- 快照不是对所有历史消息逐帧永久注入：仅取本会话最近 16 条以内的最新可用效果场景。

## 验证

- `scripts/check-approved-message-effects.cjs`：真实协议解析、三种共用限额、流式标记清理、群聊角色段、视觉开关及背景/场景区分；隔离 Edge 的实际 React 播放组件验证三效果队列、历史不自动播放、关键帧持久化、真实背景采集、会话隔离、重播去重、禁用卸载、减少动态、320px 窄屏。通过，浏览器 pageerror 为 0。未调用真实付费模型。
- 旧 `check-chat-echo.cjs` / `check-chat-love.cjs` 保留为旧 DOM/SVG 动画断言，不作为新 Canvas 版本的验收脚本；本轮由上面的新脚本覆盖正式链路。
- 原始 `tsc --noEmit --incremental false` 确实运行：被 `tmp/drawing-release-check` 历史副本的重复声明、Deno 和旧 IconId 类型阻塞。临时配置排除此副本、检查当前 app/components/lib/types/middleware 后通过；没有为此修改共享 tsconfig。
- Next 实际 3003 首页编译和隔离浏览器加载通过：HTTP 200、title=float、pageerror=0。既有 splash 字体请求 404，不属于本次效果改动。
- 运行中发现 3003 未监听，确认另一个 node 仅监听 3001 后，隐藏启动本仓库 `.next-3003` 服务，未停止/抢占其他进程。局域网 3003 返回 200；本次启动 PID 47320（后续应重新查端口，不依赖旧 PID）。日志 `tmp/message-effects-3003*.log`。
- 本地 QA 截图在 `qa/approved-message-effects/`。这些是隔离测试数据，不含用户聊天。

## 待真机验收

- 手机刷新 3003，长按发送键，确认三项纯文字；分别播放短句与长句 Echo、左右发送者 Love、Fireworks 末段连放和余烬。
- 更换任意聊天背景，发送效果后开启识图正常聊天，检查模型如何理解整体构图；角色自主决定是否发送/评论，不保证每次回应。
- iPhone GPU/FPS、Safari、真实模型理解未实测；本次不宣称已通过真机验收，也未提交推送。
