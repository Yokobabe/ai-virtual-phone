# 2026-09-25 聊天玻璃模式与 Tapback 升级

## 范围

- 分支：`feat/imessage-private-chat`
- 为单个聊天增加默认关闭的「玻璃气泡」开关。
- 统一普通消息、引用、语音、Tapback 与输入区的玻璃视觉体系，并使用左右 SVG 蒙版保持气泡与尾巴为完整轮廓。
- Tapback 候选栏增加 `+` 自由输入；长按候选时在原位进入替换输入，不再弹出整屏弹窗。
- 对手机 Chrome 的彩色 emoji 字体基线做细微光学校准，使单人和多人 Tapback 共用同一主圆视觉中心。

## 纳入文件

- `components/chat/chat-room.tsx`
- `components/chat/chat-settings-panel.tsx`（仅玻璃开关及会话即时同步相关片段）
- `lib/chat-storage.ts`
- `styles/imessage26.css`
- `public/chat-bubble-tail-left.svg`
- `public/chat-bubble-tail-right.svg`

## 检查

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`：通过。
- `scripts/check-chat-night-menus.cjs`：通过（使用工作区 Playwright 与本机 Edge）。
- 相关文件 `git diff --check`：通过，仅有仓库现存的 LF/CRLF 提示。
- 本地 `http://127.0.0.1:3003/`：HTTP 200。
- 玻璃气泡及 SVG 尾巴此前已由用户在手机 Chrome 验收；本轮 Tapback emoji 为源码与隔离浏览器检查，推送后仍以手机最终观感为准。

## 未纳入

- 聊天背景自动请求回复的移除改动。
- 旧 Tapback 头像取色、照片消息方向及其测试。
- 像素小屋、角色头像插件、历史文档、构建缓存、浏览器 profile 与版本备份。
