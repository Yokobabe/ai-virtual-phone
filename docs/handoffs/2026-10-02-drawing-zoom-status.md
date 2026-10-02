# 绘图白板缩放与交替状态

- 分支/基准：feat/imessage-private-chat / ddaddba，共享目录，保留已有未提交修改。
- 需求：仅绘图白板增加双指缩放、明显灰细框；状态与角色评论交替；审查创作限制。
- 改动：components/chat/drawing-board.tsx、styles/chat-drawing.css、scripts/check-chat-drawing.cjs。
- 双指0.5–4倍缩放并移动；变换只作用视图，笔迹坐标、模型快照、发送图不变。第二触点取消本次未完成笔迹，剩余单指不继续误画；缩放不发起模型调用，暂停既有交棒倒计时。
- 评论显示3.5–8秒后回到当前状态，开始落笔立即回状态；历史评论仍进入草稿及发送快照，重开不把旧评论当成当前状态。
- 灰框采用内移1px outline，不改变600×800像素或布局。
- 测试：当前源码TypeScript检查通过；隔离Edge浏览器/CDP真实触控事件回归通过（缩放、无误笔/误调用、缩放后坐标、缩小、交替显示、3秒交棒、草稿/评论快照、锁定/取消）；3003 HTTP 200。没有调用真实付费模型；iOS真机待验收。
- 提示词仅审查未改：DRAWING_RULES多次限定一个局部细节，请求再次要求局部细节，运行时最多3笔/整轮路径750。建议改为一轮一个创作意图，允许相关笔触、小元素、局部铺色与俏皮改造，同时禁止完成整幅；配套适度放宽硬预算。等待用户确认。
- 未commit/push。备份在components/chat/versions/drawing-board.zoom-v1.tsx.bak与styles/versions/chat-drawing.zoom-v1.css.bak。
