# 全部顶部实验撤销 / SP加号

- 用户拒绝顶部实验1.0/2.0，要求视作未出现；另要求SP加号稍大并检查引用漏项。
- 基准feat/imessage-private-chat / 2f60500；不覆盖其他本轮未提交修改，未commit/push。
- chat-room.tsx与chat-settings-panel.tsx去掉实验import/渲染/设置开关；删除pwa-header-blur-experiment.tsx及仅其2.0测试脚本。页面不再读取v1/v2设备键（不擅自改用户浏览器存储）、不叠顶部层/裁切消息/修改header。原meta布局保持实验前配置。旧实验源码可从Git及versions备份恢复，历史交接保留但不代表运行状态。
- styles/chat-sp.css只把plus svg22px改26px；粉底按钮36px与顺序/字号/其他模式不动，备份styles/versions/chat-sp.plus-v1.css.bak。Pinpoint限定局部。
- 类型检查与check-sp-plus-rollback.cjs隔离浏览器核对删除入口/组件、加号26px、圆底36px/粉色通过。未操作真实聊天数据、未调用模型。
- SP引用静态检查：仅正文quote-reply有部分SP圆角/字体，预览及连接线/尾巴仍继承经典。尚未修改引用；需用户明确截图所指是输入待发引用还是已发送引用以及希望的细节。
