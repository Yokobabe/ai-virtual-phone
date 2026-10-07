# 分享与一起听修复发布

- 用户授权 push；分支 feat/imessage-private-chat，基准 8de5fb7。
- 本轮发布：歌曲/歌词分享附言以普通用户气泡呈现并继承发送者主题色，4px 连续消息间距；模型历史保留附言；朋友圈歌词附言清空和手动翻译；去看看等待存储就绪并支持重复目标；接受/拒绝邀请使用系统提醒；一起听顺序队尾续播，角色上下文明确跨歌曲保持状态。
- 文件：components/chat/{chat-room,message-bubble,moment-post-card,phone-chat-app}.tsx；components/desktop-shell.tsx 仅导航差异；lib/{listen-together,llm-prompt-assembler,moment-body-translation}.ts；lib/music-context.tsx；styles/imessage26.css；五个相关回归脚本。
- 检查：当前代码严格 TypeScript 检查通过；分享导航、音乐上下文、朋友圈翻译、一起听生命周期、一起听队列五组离线回归通过，无真实模型调用。
- 浏览器读取超时，实际手机颜色、分享跳转、连续播放尚待用户验收；本次未重跑生产构建。
- 本发布记录取代本轮四份修复交接的“未push”状态；实际提交/远端 SHA 在交付时核对。保留所有非本轮工作区改动。
