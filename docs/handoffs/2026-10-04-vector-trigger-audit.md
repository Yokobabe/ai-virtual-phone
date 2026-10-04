# 向量触发核对

2026-10-04；feat/imessage-private-chat；基准 c3cd2d3。仅诊断，未改代码、未读取用户API密钥/浏览器数据、未真实调用、未 commit/push。

memory-summarizer 生成长期摘要时，在vectorRecallEnabled且有效embedding绑定下生成摘要向量；手工新增/修改长期记忆也尝试生成。自动请求 memory-service 只有长期总token超longTermTokenBudget才生成查询向量和排序，且需要长期已有向量；预算内直接返回所有长期记忆。核心检索不用该向量。memory-bank设置说明正是长期超预算时检索。源码默认预算100000，不能推断用户当前值；是否实际调用需用户配置/请求日志证据。generateEmbedding直接embedding HTTP，成功没有明显页面提示，仅失败console.warn。

价值：当前主要在记忆过多时筛选内容；存档生成向量与聊天实际向量召回不同。优化可将相关性选择提前且保留重要关系/状态，增加可观测信息，但未经授权不调整阈值或模型请求。
