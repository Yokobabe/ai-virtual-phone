# 中文短气泡末尾逗号显示兜底

- 需求：用户授权补齐上一轮标点反馈的代码兜底。
- 分支/基准：`feat/imessage-private-chat` / `2f60500`，保留其他未提交改动；未 commit/push。
- 修改：`lib/chat-text-layout.ts` 在既有 assistant 普通文字显示清理中移除中文短气泡末尾中英文逗号。短文本边界限定为去空白后最多 60 个 Unicode 字符；不删除句内逗号、句号、问号、感叹号、波浪号和省略号。长文本、显式多段/诗歌/列表/代码沿用保护规则。
- 范围：三个美化预设共享；双语分离后的原文和译文分别处理；user 文本不走此清理。仅改变显示，不重写历史、API 上下文或解析协议，不新增 API 调用。既有历史短气泡刷新后显示也会变化，存档仍保留原文。
- 备份：`lib/versions/chat-text-layout.comma-v1.ts.bak`。
- 检查：`scripts/check-chat-text-layout.cjs` 增加中英文句末逗号、句内逗号、语气符号、长文、结构化文本、双语及 user 保留断言；隔离浏览器 320/390/430px × 经典/玻璃/SP 排版回归通过。真机验收待用户。
- 限制：不处理逗号后还有 emoji/闭引号的文本，以免破坏引用或有意排版；不通过去标点替代模型的自然消息分段。
- 追加验证：`tsc --noEmit -p tmp/tsconfig-approved-effects.json` 通过；3003 首页 HTTP 200。未测试真机或调用真实模型。
