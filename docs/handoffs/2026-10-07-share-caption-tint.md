# 分享附言气泡颜色

- 分支/基准：feat/imessage-private-chat / 8de5fb7；未提交、未push。
- 原因：音乐消息外层未调用 groupBubbleTint，新增附言虽然复用了 TextBubble 和材质节点，却缺少普通消息的表面色/文字色变量，显示默认浅灰底。
- components/chat/chat-room.tsx：有附言的 music_share 复用同一发送者的 groupBubbleTint；接入用户主题/日夜/SP 预设，不硬编码蓝色。歌词卡自身专辑取色不变。备份位于 versions/20261007-share-fixes。
- 验证：类型检查；浏览器工具读取当前 tab 超时，未完成实际页面颜色验收；没有发送真实消息。
