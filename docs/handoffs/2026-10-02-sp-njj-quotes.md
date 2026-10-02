# SP 引用补齐

- 需求：按已有 NJJ SP CSS 补齐引用细节，先本地验收，不提交推送。
- 分支/基准：`feat/imessage-private-chat` / `2f60500`，保留全部其他未提交改动。
- 来源：本机 NJJ `njj-klein-pink-sp-v37-auto.css` 的 detached 引用及 V37 最终蓝粉覆盖；没有沿用中间版本的蓝色引用底。
- 修改：`styles/chat-sp.css`。已发送引用采用 20px 圆角、13px 文字、7px 间距、灰色/浅粉底、“你回复了/对方回复了”、侧边短标记。隐藏经典 L 连接线及尾巴。输入引用改为输入区域内的粉色标记预览，保留原取消逻辑、40px 按钮；不再让 SP 引用输入时模糊聊天历史或隐藏视频键。日夜模式分别使用源文件粉色 token。
- 备份：`styles/versions/chat-sp.quote-v1.css.bak`。
- 检查：`scripts/check-sp-quotes.cjs` 隔离浏览器通过；320/390/430px、日夜、无横向溢出、取消点击、无尾巴、经典/玻璃对比无变化。不调用真实模型、不读取用户聊天数据。CSS-only，未运行本轮完整类型检查。
- 状态：本地实现完成，真机验收待用户；未 commit/push。
