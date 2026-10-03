# 语音指导临时关闭对照

- 用户要求：暂时移除我们新增指导库，以便自行生成新语音对照，后续须无损恢复。
- 分支/基准：feat/imessage-private-chat / 3f76c07。
- lib/voice-expression.ts 增 VOICE_EXPRESSION_GUIDANCE_ENABLED=false，入口立即返回空指导，私聊/群聊/通话不注入本库；原始规则全文保留。恢复仅把该常量改 true，无需重建规则或清理数据。
- 解析、speechText、旧音频、角色人设/上下文、基础语音条协议和 ElevenLabs 参数保持。用户生成新消息才可对照，不应重播旧音频当无指导组。历史或外部预设仍可能给模型表达线索，不承诺严格实验隔离。
- scripts/check-voice-expression.cjs 检查实际关闭状态，并仅在隔离模块内开启做已有规则/解析回归；不改变运行状态，不触发真实模型/TTS。
- 类型及测试见本轮结果；浏览器与真实声音待用户自行测试，未 commit/push。
