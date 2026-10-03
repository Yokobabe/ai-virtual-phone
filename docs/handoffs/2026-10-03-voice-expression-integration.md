# 语音表达规则接入

- 需求：用户授权把基础规则接入实际生成，必须结合角色人设和上下文。
- 分支/基准：feat/imessage-private-chat / 3f76c07，保留其他工作区改动。
- lib/voice-expression.ts 为运行规则和转换工具；lib/llm-prompt-assembler.ts 私聊/群聊 system 指导，按角色 chat 语音绑定和模型门控，通话通过 voice/video appTags 切换正文协议。沿用现有角色人设和历史，群聊列出适用角色ID。
- 使用 {voice:英文表达} 中间标记，避免 [语音条:...] 嵌套方括号。lib/rich-message-parser.ts 保存显示 label 与语音 speechText；lib/chat-storage.ts 增字段；components/chat/message-bubble.tsx 合成使用独立语音原文，编辑显示台词后不读旧台词。
- components/chat/voice-call-screen.tsx、video-call-screen.tsx、group-call-screen.tsx 去除存档/字幕标记，实际 TTS 转换成英文方括号标签。lib/tts-service.ts 切换不支持表达的模型/供应商时清理标签。
- docs/voice-expression-rules.md、TODO 更新实施状态；无 UI 样式修改。
- scripts/check-voice-expression.cjs 隔离检查绑定/模型门控、规则结合人设上下文、通话协议、实际语音条解析与旧消息兼容。限定类型与空白检查见本轮结果。未运行真实模型、付费合成或浏览器/真机测试。
- 用户测试：选 v3/v4/v4 Turbo 并绑定到角色，刷新 3003，让角色新发语音或进行通话。旧消息不会自动增加表达；模型可自主选择不加标签。真实表现受角色遵从/音色影响。
- 未 commit/push/部署，不增加额外模型调用。
