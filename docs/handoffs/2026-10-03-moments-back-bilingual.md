# 朋友圈返回与双语漏译跟进

- 需求：修复朋友圈边缘返回误开发布页；检查大写英文及漏翻译，加强代码请求要求。
- 分支/基准：feat/imessage-private-chat / 3f76c07；保留其他未提交改动。
- 原因：发布按钮共用 page-back-btn 类，findExposedBackButton 倒序命中发布按钮。
- 修复：发布按钮标记 data-edge-back=off，返回候选筛选尊重显式禁用；不改变现有左边缘向右滑动返回方向。
- 双语：解析没有大小写免译判断，Bossy/全大写/Title Case 正确配对均通过隔离测试。加强 CHAT_TEXT_PAIRING_INSTRUCTION 的大小写非豁免和输出前逐气泡完整翻译检查；buildChatBilingualInstruction 已用于实际请求，兼容自定义双语提示。
- 不新增模型请求、不编造译文、不重写历史。提示不能保证模型遵从；用户稍后提供截图，漏译根因仍待定位。
- 文件：moments-feed.tsx、edge-swipe-back.ts、bilingual-prompt-defaults.ts、check-edge-swipe-back.cjs，以及交接/TODO。
- 验证：手势隔离回归（新增发布按钮排除）通过，大写双语解析及群聊要求检查通过，diff 检查通过。完整类型检查退出 1，包含 tmp 发布副本重复声明、Deno 未识别及 pixelworld 图标映射错误，未全绿；浏览器/真机未验收。
- 截图反馈：缺译集中于某成员连续多条发言，其他成员大写文字可正常显示翻译；不足以证明模型或解析器责任。群聊双语为会话级开关，无成员独立开关。追加实际正文语言优先于角色身份，以及每成员每气泡独立配对要求，防止“中文角色忽略”歧义。未读取私人历史或调用模型。
- 未 commit/push/部署；3003 已运行，可供用户验收。
