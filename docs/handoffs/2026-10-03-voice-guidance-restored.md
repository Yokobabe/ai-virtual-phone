# 恢复语音指导与重播核对

- 用户授权恢复临时关闭的指导，询问同一条语音重播是否扣额度。
- 分支/基准 feat/imessage-private-chat / 3f76c07；lib/voice-expression.ts 常量恢复 true，不改规则、绑定或历史。
- scripts/check-voice-expression.cjs 隔离回归通过。本轮只改布尔常量，未新增类型结构；未调用真实模型/TTS。
- components/chat/message-bubble.tsx handlePlay：已有 mediaUrl 且 synthesizedFromText 与当前 speechText 一致，直接 Audio 播放；暂停继续同样直接播放。无音频或合成文本变化时调用 synthesizeVoiceForMessage，合成成功经 persistMessageVoiceAudio 保存音频和文本。不是每次点击都调用 TTS；旧消息缺合成文本标记也可能首次重新合成。恢复指导不改已有消息文本/音频。
- lib/chat-storage.ts persistMessageVoiceAudio 更新缓存及 KV 存档。此结论为源码静态核对，未监测用户网络或账户额度；实际重播/跨刷新验证待用户。
- 官方额度说明：https://elevenlabs.io/docs/help-center/account/general/do-i-use-quota-on-every-generation 。API 重生成无网页免费重生成优惠；缓存重播不发合成请求。
- 未 commit/push，无浏览器/真机测试。
