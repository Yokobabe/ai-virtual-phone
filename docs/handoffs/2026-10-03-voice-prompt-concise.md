# 精简实际语音提示

- 用户要求：模型预设只保留专业执行指导，用户说明不混入，节省 token。
- 分支 feat/imessage-private-chat / 基准 3f76c07；lib/voice-expression.ts 精简实际 system 内容，保留丰富表达词表、人设差异、自然密度和协议，移除官方/效果限制说明。完整旧运行文件留 tmp/voice-expression-before-concise.ts 供本轮比较，不覆盖其他变更。
- scripts/check-voice-expression.cjs 更新措辞断言并验证注入无官方/效果解释；原解析兼容测试保留。AGENTS.md 固化模型指令与用户说明分离要求。
- docs/voice-expression-rules.md 为用户解释版本，可保留支持范围和效果说明；运行版本以 lib/voice-expression.ts 为准。
- 本轮无协议/UI/存储变化，无真实模型或付费 TTS 调用；隔离回归及字符减少比较见本轮输出。未 commit/push。
