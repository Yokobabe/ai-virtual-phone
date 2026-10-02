# SP 内心卡片署名锚点修复

- 分支/基准：`feat/imessage-private-chat` / `ddaddba`；接续共享本地 SP 改动，未提交推送。
- 用户反馈：资料卡在第一个气泡后才展开，左端退到头像列。
- 原因：SP 资料卡仍作为整条 chat-msg-wrapper 的末尾子节点，而非署名所在 chat-msg-content-wrap 的子节点；布局与正文列不一致。
- 修改 `components/chat/chat-room.tsx`：SP 资料卡移到署名之后、正文气泡之前；经典/玻璃旧卡片位置保持原样。
- 修改 `styles/chat-sp.css`：展开时内容列容纳完整卡片，卡片和正文共享左端，正文保持自身宽度而非被卡片撑满；不改配色、SVG、头像、未读显示或卡片内容。
- 编辑前备份 chat-room.sp-v3.tsx.bak 与 chat-sp.v3.css.bak。
- `scripts/check-chat-sp.cjs` 新增实际几何检查：320/390/430 宽度，卡片/气泡左端差小于1px；署名→卡片→正文纵向顺序；卡片不超视口。
- 类型检查 `tsc --noEmit -p tmp/tsconfig-approved-effects.json` 通过。隔离浏览器完整 SP 回归通过，截图已查看；不调用模型、不修改用户存储。真机待验收。
- 3003 开发预览可用。未 commit/push。
