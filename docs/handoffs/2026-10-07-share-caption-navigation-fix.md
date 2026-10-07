# 分享附言与结果跳转修复

- 分支：feat/imessage-private-chat；基准：8de5fb7；未提交、未推送。保留工作区其他主题改动。
- 需求：音乐/歌词附言显示为卡片外普通 user 气泡；检查朋友圈附言；去看看跳到实际对话或朋友圈。
- message-bubble.tsx / imessage26.css：复用 TextBubble、角色气泡与材质，右对齐，卡片后 4px 连续消息间距；不覆盖普通气泡的内边距/圆角。旧 music_share.content 同样显示，不迁移消息。附言与卡片仍属于同一存储消息，共用消息菜单。
- llm-prompt-assembler.ts：音乐历史格式保留附言。
- moment-post-card.tsx / moment-body-translation.ts：歌词附言允许清空；外文附言使用现有手动翻译入口与缓存，保留身份、编辑与删除保护。
- phone-chat-app.tsx / desktop-shell.tsx：等待聊天存储就绪后处理最新目标，重复目标也可重新打开；朋友圈使用 feeds 入口。
- 回归：check-music-listening.cjs、check-moment-body-translation.cjs、check-share-result-navigation.cjs 通过；覆盖附言历史、清空/过期翻译、延迟 hydration、重复聊天目标及朋友圈。
- 类型检查：tmp/tsconfig-currency-check.json 的 tsc 通过。git diff --check 通过。
- 浏览器/真机：未完成本轮新发送、跳转及气泡视觉验收；未调用真实模型、未发送测试消息、未清理存储。
