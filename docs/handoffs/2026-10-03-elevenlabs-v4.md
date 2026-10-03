# ElevenLabs v4 模型支持

- 需求：更新定制分支 ElevenLabs 新模型支持。
- 分支/基准：feat/imessage-private-chat / 3f76c07；保留工作区其他变更。
- 官方依据：https://elevenlabs.io/v4 、https://elevenlabs.io/docs/eleven-api/quickstart 、https://elevenlabs.io/docs/eleven-api/guides/how-to/websockets/tts-vs-ttd-websockets 。官方确认模型 ID eleven_v4 和 eleven_v4_turbo；本项目继续现有 REST text-to-speech 合成路径，不新增 WebSocket/多说话者功能。
- 改动：lib/elevenlabs-tts.ts 新增两个可选模型，v3/v4 系列保留账户默认 voice_settings；components/settings/voice-settings.tsx 共用同一判断隐藏不实际发送的旧参数控件。旧默认 eleven_multilingual_v2 与用户保存配置不迁移。没有新增布局或样式。
- scripts/check-elevenlabs-models.cjs 隔离验证模型 ID、表达标签保留、账户默认参数省略、旧模型参数和 Voice ID 编码；无网络/密钥/付费合成。限定源码类型检查及空白检查见本轮结果。
- 浏览器、真实语音、账号模型权限和真机未验收。设置内选择新模型后试听会使用用户额度，本轮未触发。
- 未 commit/push/部署。
