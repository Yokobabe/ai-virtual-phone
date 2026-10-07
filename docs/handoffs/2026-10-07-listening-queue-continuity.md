# 一起听跨歌曲持续

- 分支/基准：feat/imessage-private-chat / 8de5fb7；未提交、未push。
- 需求：接受角色单曲邀请后，继续按队列听歌，直到任一方主动退出。
- 核对：playByQuery 保留原队列（新歌曲前插）；切歌/暂停/自然结束没有调用 leaveListeningRoom；角色上下文读取实时歌曲，不固定邀请曲目。身份/访问权限失效仍保留隔离保护。
- lib/music-context.tsx：一起听 joined 时，顺序播放到队尾继续队首；正常下一首与单曲/随机模式保持原逻辑。仅一首时继续该曲；无队列不自动寻找或虚构歌单。
- lib/listen-together.ts：角色上下文明确换歌/暂停/曲终不结束一起听，不需重邀，主动退出才结束。
- scripts/check-listening-queue.cjs：直接执行真实 handleTrackEnd 回调，覆盖普通下一首、队尾、单首、空队列、非一起听队尾及单曲模式，全部通过。check-listen-together.cjs 通过，未调用真实模型。
- 浏览器/真机：未完成实际连续播放验收；没有修改用户队列/真实邀请。
