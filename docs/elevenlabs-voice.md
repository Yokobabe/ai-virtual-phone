# ElevenLabs 语音供应商

入口：设置 → Voice API → 新增语音方案 → ElevenLabs。填写自己的 API Key，点击「同步音色列表」后选音色，或直接粘贴 Voice ID。试听会消耗 ElevenLabs 额度。保存后，通过 float 原有绑定设置将方案绑定到角色／聊天。

## 本次接入范围

- 配置存储、角色绑定、试听、私聊／群聊语音条、语音／视频通话发声共用 `synthesizeSpeech`，增加 ElevenLabs 分支，不另做一套播放器。
- 默认模型 `eleven_multilingual_v2`；可选 Flash v2.5、Turbo v2.5、v3，支持手填模型 ID。实际可用模型／音色取决于账户权限。
- v2 系列支持稳定性、相似度、风格强度、音色增强、0.7–1.2 倍语速；v3 保留账户音色默认设置，不发送这组覆盖参数。
- 账户音色使用 `/v2/voices` 分页获取、去重，包含账户可访问的已有克隆音色；不增加上传／新建克隆功能。
- 合成采用 `/v1/text-to-speech/{voice_id}`，`xi-api-key` 鉴权，MP3 44.1kHz / 128kbps。不将 MiniMax 情绪／音高参数发送给 ElevenLabs。
- 不接入 ElevenLabs STT、对话 Agent、音乐接口。通话语音识别保留原有 OpenAI 兼容／设备识别机制。

## 网络与安全

与现有 TTS 一样由浏览器直接请求，默认地址 `https://api.elevenlabs.io/v1`。可填写可信 HTTPS 中转（须支持跨域、相同鉴权和 `/v1`、`/v2` 接口）。密钥保存在 float 现有本地配置中，不是服务器密钥保险箱；不要公开带密钥的备份。不同供应商之间切换会清除当前方案旧密钥及音色，避免误发送给另一家服务；建议不同供应商各建一个方案。

不会自动重试收费合成请求。超时覆盖请求和音频下载，错误信息区分鉴权、权限、额度、限流、空音频和非音频响应，不展示上游任意响应内容。更换供应商／密钥时，旧音色同步结果不会覆盖新配置。

## 验证与限制

运行 `node scripts/check-elevenlabs.cjs`：模拟请求校验鉴权、参数、二进制音频、分页、错误、超时、角色绑定和已有供应商回归。没有使用真实密钥或消耗合成额度；真实账户、网络跨域及手机试听需用户验证。项目类型检查仍有既存的三处 meshoptimizer / three-stdlib 缺失依赖错误。

官方协议依据：[合成接口](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)、[音色列表](https://elevenlabs.io/docs/api-reference/voices/search)、[声音设置](https://elevenlabs.io/docs/api-reference/voices/settings/get)。
