# 绘图状态与吐槽区域整理 / 独立发布

分支 feat/imessage-private-chat，基准 9fb7602。用户授权修复并 commit/push 到该分支。

## 本轮 UI

- 状态简化为“你先画 / 角色名字在看 / 角色名字在画”。隐藏三秒机制说明，保持实际 3000ms 交棒及调色暂停机制。
- 状态、吐槽合入一块浅 Apple 灰信息区，统一 13px 字号、左对齐；状态、作者、正文用字重/颜色/间距区分，评论长文可滚动。
- 按 pinpoint 局部整理，原白板、笔刷和照片涂鸦不变。备份保留于本地 versions 目录。

## 提交范围

绘图此前全部未提交，因此本次发布包含完整独立绘图功能：单人旁观/双人共画、三秒交棒、手绘/铅笔/水彩、色谱/粗细/透明度、角色评论、草稿及最终快照/过程档案。

- 新增 components/chat/drawing-board.tsx、lib/chat-drawing.ts、lib/chat-drawing-model.ts、styles/chat-drawing.css。
- app/globals.css 仅新增绘图样式导入。
- components/chat/chat-room.tsx 仅按 HEAD 组合绘图导入、菜单、弹层类型和发送接入；不提交同文件其他工作。
- lib/chat-storage.ts 仅新增可选 drawingProcess 字段；不提交 Love 类型修改。
- scripts/check-chat-drawing.cjs、scripts/check-drawing-icon.cjs 和本交接。
- 其他窗口未提交改动、回声/Love/玻璃/头像等本地修改均不混入提交。docs/TODO.md 在本地更新，不将未跟踪的整个多任务总览夹入发布。

## 验证

工作目录与索引导出的实际提交版本均通过类型检查；导出版本的画板与图标隔离浏览器检查通过。包括三秒交棒/取消、视觉参数、旁观不落笔、评论与快照持久化，以及状态/评论统一 13px 字号和左对齐断言。截图已检查。未跑生产构建；真实模型及远程手机验收由用户完成，不调用付费模型。

长期记忆摘要仍遵循已有设置和阈值，不保证每次发送即时生成长期条目。远端 SHA 在 push 后核对；Netlify 部署和真机效果不可仅凭 Git 推送认定成功。
