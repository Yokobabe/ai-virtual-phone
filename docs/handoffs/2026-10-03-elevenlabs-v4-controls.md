# v4 参数控制

- 用户授权：仅给 v4 增加稳定性、相似度及有用的 language_code。
- 分支：feat/imessage-private-chat，基准 3f76c07，保留其他改动。
- lib/elevenlabs-tts.ts v4/v4 Turbo 发送 stability、similarity_boost，默认 .5/.75；不发送旧版 speed/style/speaker_boost。语言可留空自动，非空校验两位字母并小写发送；v3/其他模型不发送语言。
- lib/settings-types.ts 增 languageCode；components/settings/voice-settings.tsx 沿用现有设置控件样式，v4 显示两条滑块与可选语言输入。v3/旧模型行为保留。已有配置通过原保存路径保存，无自动账户变更。
- scripts/check-elevenlabs-models.cjs 验证两种 v4 请求、参数隔离、语言显式/自动/格式错误及旧模型兼容。限定类型检查、空白检查见本轮结果。浏览器与真机未验收，未调用真实模型/TTS 或收费 API。
- 官方：https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech ，https://elevenlabs.io/docs/api-reference/text-to-speech/convert 。语言指导发音不翻译；不支持时模型忽略。
- 未 commit/push/部署。
