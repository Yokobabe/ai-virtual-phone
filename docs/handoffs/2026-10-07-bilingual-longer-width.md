# 双语气泡由占位更长的一侧决定宽度

- 用户调整：取消原文优先，中英文均参与宽度计算，到最大宽度后换行。
- 分支/基准：feat/imessage-private-chat / 18abdd0；用户已授权单独提交并push，交付时核对远端提交。
- styles/imessage26.css：移除译文的 contain:inline-size，复用已有自然尺寸与最大宽度规则；私聊86%、群聊78%上限不变。
- 备份：versions/20261007-share-fixes/imessage26-before-bilingual-width.css。
- 实际聊天页面/真机待验收；不修改消息数据。
- 检查：CSS解析与差异空白检查通过；布局回归脚本因当前环境缺少 playwright 未运行完成，不记为通过。
