# SP 聊天美化预设与完整内心资料卡

## 需求与基准

- 分支 `feat/imessage-private-chat`，基准 `ddaddba`；共享目录原有大量未提交工作，均保留。
- 按用户批准的 NJJ V37 配色及布局移植，不重新设计：User 克莱因蓝，Char 珍珠灰，粉底蓝图标，水平头像名字顶栏与单行输入栏。
- 三种会话预设：经典、玻璃、SP；保留旧 glassBubblesEnabled 的兼容及原自定义气泡设置。
- 用户确认内心独白照搬完整推特式资料卡，包含原封面、大小头像、名字、账号及资料装饰、推文正文。
- 仅隐藏原输入栏 Emoji 入口；不动 Tapback、图片 Emoji 或功能主菜单。

## 文件

- `lib/chat-beauty-preset.ts`、`lib/chat-storage.ts`：预设解析、旧数据兼容、日夜 SP 气泡色。
- `components/chat/chat-settings-panel.tsx`、`chat-room.tsx`、`use-group-bubble-tint.ts`：会话切换与渲染接入。
- `components/chat/chat-unread-pill.tsx`：SP 数字渲染，原模式数字镂空保留。
- `components/chat/sp-thought-card.tsx`、`styles/chat-sp.css`、`app/globals.css`：限定 SP 的样式与完整资料卡。
- `public/sp/*`：从用户已批准 NJJ CSS 提取的封面及日夜资料装饰。`scripts/import-sp-thought-assets.cjs` 可重现提取。
- `scripts/check-chat-sp.cjs`：隔离真实 ChatRoom 回归。

## 语义与边界

- 内心正文仍使用保存的 innerMonologue，双语展示与 StateValuesPanel 保留；私聊头像使用当前会话角色头像，群聊使用发言角色头像。
- 资料装饰中的日期、关注数等沿用 NJJ 原稿，仅视觉装饰，aria-hidden，不注入模型上下文或记忆。
- 经典与玻璃的小独白卡不改；API reasoning sheet 仅跟随 SP 配色，不伪装为角色独白。
- 没有改变 PWA 状态栏兼容实验、模型调用、主菜单或 iMessage 特效。

## 检查

- 当前源码 TypeScript 检查：`tsc --noEmit -p tmp/tsconfig-approved-effects.json` 通过。
- `git diff --check` 通过（仅既有 CRLF 提示）。
- 隔离 Edge/Playwright：SP 日夜色、320/390/430 单行输入布局、头像/顶栏、Emoji 隐藏、三预设切换、真实保存独白的完整资料卡渲染通过；截图已查看。
- 测试只修改临时浏览器上下文内的示例数据库，不访问用户浏览器、不发消息、不调用模型。
- 3003 开发预览可访问；真机/PWA、长姓名及真实群聊待用户验收。

## 提交状态

本任务未 commit/push。不要把共享目录其他工作混入提交。入口：聊天设置 → 美化预设 → SP。
