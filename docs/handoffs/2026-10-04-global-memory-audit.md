# 跨应用全局记忆静态核对

2026-10-04；feat/imessage-private-chat；基准 c3cd2d3。诊断/讨论，未改功能、未运行真实模型、未 commit/push。

事实：short-term-assembler 的 loadNativeTimeline 按 char 汇集私聊、成员群聊、可见朋友圈、剧情/线下/漫卷等原生数据；prepareShortTermContext 按来源开关和预算组织。memory-summarizer 从同一时间线提炼长期记忆。chat/group/moments/story 引擎调用共享短期及长期/核心检索。身份底层分区，记忆再按 char 索引。

限制：剧情和线下跨应用投影依赖 storySummary/summary，缺失会跳过；剧情投影选择该角色首个匹配会话。群聊按当前 participantIds 纳入，不能单凭这个保证加入前/退出后的历史知情边界。各源开关、预算、自定义预设标记及模型召回影响实际使用。源码接入不代表每个页面/真实请求完整验收。新系统需统一来源/角色可知/关系认知与状态入口，并区分正式经历、平行故事、模拟。

线下模式：依附聊天会话，单聊和群聊皆可，保存独立 turn 与摘要；生成调用聊天/群聊引擎线下场景。剧情应用：story 专属会话、存储、绑定和提示场景，正文解析/折叠及摘要；仍可读写共享记忆。不同正文入口不自动等于不同世界分支。
