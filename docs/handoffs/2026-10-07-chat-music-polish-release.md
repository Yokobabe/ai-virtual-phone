# 回复小窗与音乐分享验收版发布

- 用户授权：2026-10-07「push吧」。分支feat/imessage-private-chat，基准b829cf9。
- 范围：通知回复小窗复用ChatRoom、header/bottom紧凑兼容与图标；双语原文优先及气泡宽度；分享对象头像、音乐页对齐；歌词同步/选句/主题卡片；封面独立播放、轻阴影、小幅字号收紧；朋友圈简化确认与分享后去看看导航。
- 精确提交：components/chat下message-bubble、moment-post-card、phone-chat-app、quick-reply-window、share-destination-sheet、sp-chat-header；components/desktop-shell仅上述接入；components/music下music-player、lyric-share-card；lib下chat-storage、moments-types、music-listening、lyric-selection、lyric-card-color；styles下chat-sp、imessage26、music；三个新增回归脚本。
- 排除：PixelWorld、主题包导出、桌面小组件、身份预设种子、环境配置及其他未授权任务。desktop-shell使用精确暂存版本，不覆盖共享工作文件。
- 独立验证：从暂存树导出至float-chat-release-20261007，使用共享node_modules但不复制未提交业务文件；app/components/lib严格类型检查通过。quick-reply、lyric-range-card、share-result-navigation、share-destinations、music-listening五组离线回归通过。
- 独立生产构建通过（74页），部署包生成及backdrop-filter修复脚本通过。远端SHA核对在本次发布最终回复中记录。浏览器/真机未完成全面矩阵验证，未触发真实消息/模型；Netlify部署状态不等同Git推送成功。
- 本交接代表本轮发布状态，之前同主题交接的“未push”为各次修改时的历史状态。
