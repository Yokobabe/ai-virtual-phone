# 线上富媒体提示核对

- 用户需求：仅检查线上私聊/群聊是否提示语音、表情包、图片和屏幕特效能力。
- 分支/基准：feat/imessage-private-chat / 3f76c07，含本地工作区变更。
- 默认内置预设 lib/builtin-preset.ts 私聊及群聊均含可选富媒体协议，列照片/多图、表情包、语音条等。表情包宏来自实际角色列表，禁止自创不可用表情包。预设块是否进入请求受用户选择的预设、启用顺序与场景标签过滤影响，不保证任意外部预设带全套规则。
- lib/chat-engine.ts 普通线上私聊另注入 buildEchoPrompt/buildLovePrompt/buildFireworksPrompt 与图片发送指导；lib/group-chat-engine.ts 群聊另注入对应系统能力。效果自主使用，合计每轮最多一条，最近使用则默认不再用；仅作用文字，不可附到图片/语音等。
- lib/llm-prompt-assembler.ts 另注入新语音表达规则，按角色绑定 ElevenLabs v3/v4 系列门控，结合角色上下文与人设选择，不强制发语音。
- 静态检查实际请求组装路径；未读取用户当前角色配置或抓取真实请求，未调用模型/付费生成、未操作浏览器。能力提示不等同每轮使用；实际图片生成及 TTS 还依赖用户配置。
- 只创建诊断文档并登记 TODO，未改业务代码、未 commit/push。
