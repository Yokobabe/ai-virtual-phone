# 发送键：有内容发送并回复，空内容直接生成

- 用户要求聚焦输入框时出现的发送键支持两种行为；按同一个按钮的双语义实施，没有新增第二个图标。
- 分支`feat/imessage-private-chat`，基准`2f60500`。保留之前文字/围观群及其他窗口未提交改动，未commit/push。
- `components/chat/chat-room.tsx`：短按统一handleSubmit，有正文sendDraft(true)，空白onTriggerAIResponse，生成中先停止（不被围观输入锁阻断）。主按钮标签按有字/无字切换，围观群生成键不再灰化成不可点击。空回车仍不触发，特效长按与仅发送功能保留。
- 修复前鼠标短按已有handleAIReply空生成路径，未用真实模型复现用户所述所有偶发情况；本轮将点击/停止分支统一并加入回归，不虚称确认所有手机偶发原因。
- Pinpoint限定按钮行为，不改配色/位置/尺寸；编辑前版本`components/chat/versions/chat-room.empty-send-v1.tsx.bak`。
- TypeScript定制范围检查通过；`check-chat-empty-send.cjs`通过生产提交分支＋隔离React触控（聚焦空白、输入后删除、发送带autoReply、停止、围观和锁定规则）。无真实存储/API调用。
- 特效长按回归`check-echo-send-gesture.cjs`结果以工具输出为准；真实手机验收待用户，未实现上轮仅评估的导演旁白输入功能。
