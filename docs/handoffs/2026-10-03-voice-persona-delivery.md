# 人设影响语音表达

- 需求：同一 teasing 按沉稳角色与阳光小狗型角色区分声音表达。
- 分支/基准：feat/imessage-private-chat / 3f76c07，保留其他工作区改动。
- lib/voice-expression.ts 实际注入指导新增人设影响音量、节奏、句尾语调、亲昵程度；加入轻声从容下沉与明亮真诚上扬两种描述性示例。只在既有人设/关系明确时采用上下位亲昵感，不强制人格模板。
- docs/voice-expression-rules.md 同步；scripts/check-voice-expression.cjs 检查指导与两种表达标记转换。
- 无 UI/存储协议变更；保持指导开启。不调用模型或付费合成。真实人设差异与声音表现待用户试听。未 commit/push。
