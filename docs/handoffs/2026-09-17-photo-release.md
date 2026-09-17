# 照片编辑与翻译修复提交

- 用户授权 commit/push 至 feat/imessage-private-chat，基准 9d1ac2f。
- 范围：照片 URL 生命周期、左滑方向锁、逐图 Tapback、照片编辑器重做、Emoji 手势和比例、Rough.js 手绘及多色自由涂鸦、角色二创历史、紧凑双语气泡。
- 文件：app/globals.css；components/chat/{chat-room,message-bubble,photo-markup-editor}.tsx；lib/{builtin-preset,chat-photo-markup,chat-storage,llm-prompt-assembler,rich-message-parser,photo-doodle}.ts；styles/{chat,photo-editor}.css；package.json/package-lock.json；两项照片测试脚本与本轮相关交接。
- 不包含像素世界、桌面入口、旧日志、middleware、微信函数、tsconfig、qa/share 等其他工作区改动；共享 PROJECT/TODO 保留本地，避免夹带其他窗口状态。
- 验证：类型检查、照片涂鸦数据及固定 seed 回归、编辑器模拟触屏回归。真实手机和真实角色长时间使用仍待验收。
- 提交/推送：本次授权执行，最终提交号与远端结果见任务回复。先前交接的未提交状态为各自完成时的历史记录。
