# 回声近景改为中等尺寸

- 需求：用户认为几个巨型气泡破坏整体，确认先收住这几个额外放大，其余不动，先看本地成品。
- 分支/基准：feat/imessage-private-chat / ddaddba，叠加之前两轮本地近景轨迹与提前退远调整；未 commit/push。
- 文件：lib/message-effects/echo-renderer.js、scripts/check-echo-motion.cjs。改前备份 versions/echo-renderer.near-motion-v3.js.bak。
- 定向改动：仅八个近景的附加放大系数从1.25降到0.45；原始基础透视尺寸保留。240总数、八个近景、轨迹/节奏/透明度/6秒时长和普通气泡全部不动。消散前退远继续保留。
- 代码/浏览器：check-echo-motion通过逐帧尺寸上限、非近景尺寸/坐标不变、数量/透明度不变检查；check-echo-size通过。隔离Canvas 1.8/2.6/4.8秒截图已检查，tmp/echo-motion-comparison.png。
- 旧阈值结果：check-echo-near-passes未通过，其要求320屏近景字体达到23px持续2.1秒，当前短句没有达到23px。本轮用户主动要求减小这些近景，故保留旧测试失败事实，不偷偷降低阈值，也不把本轮视觉待验收描述为全回归通过。
- 真机：待3003用户重播验收；未访问真实用户存储、未调用付费模型。
