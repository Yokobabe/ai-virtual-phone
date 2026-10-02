# SP 原版控件与内心资料卡功能对齐

## 基准与边界

- `feat/imessage-private-chat` / `ddaddba`，接续本地 SP 第一版，未提交。
- 用户反馈原版 SVG 未照搬、控件飘动、顶栏缺未读圆点、头像误做设置入口、缺角色头像署名、翻译分割线及资料卡配色/切页不符。
- 使用 pinpoint 定点修正，仅作用 SP；经典、玻璃、主功能菜单与模型协议不改。编辑前已备份对应文件到 versions 的 sp-v2。

## 修改

- 新 `components/chat/sp-chat-header.tsx`：水平头像名字，移除头像设置入口与箭头；三个独立电话、视频、四格设置按钮。沿用 Float 原通话动作。
- `chat-unread-pill.tsx` 增加可选 dotOnly；SP 按真实其他会话未读状态显示 7px 圆点，无未读不捏造圆点，其他模式继续数字胶囊。
- `chat-room.tsx`：每段/每个新 responseBatch 的开头显示 32px 角色头像与备注署名；署名打开内心资料卡，私聊用 session.alias，群聊用角色私有备注。移除 SP 冗余心形与思维预览入口。
- `styles/chat-sp.css`：克服 iMessage 绝对定位、发送/麦克风二选一与更高优先级规则，SP 保持麦克风→表情包→小飞机常驻同水平；移除静默发送键。飞机沿用发送并触发回复，空输入继续回复；生成中保留停止。表情包打开贴纸面板，麦克风打开语音消息输入。
- `scripts/import-sp-thought-assets.cjs` + `public/sp/{mic,sticker,send,settings,video,verified}.svg`：从用户 NJJ V37 最终 SVG 定义提取，非近似重画；电话用 NJJ 参考页同型原生电话路径。
- `sp-thought-card.tsx`：Tweets 显示保存的 innerMonologue 与状态值；Replies 显示已返回的 reasoningText，没有就空白，不生成思维。真实按钮、选中下划线、关闭键；原资料装饰不进入上下文。
- 封面按最终 NJJ SP 覆盖为粉色，徽标使用原 SVG；翻译去横线、2px 紧凑间距、正体13px灰色（User白色76%），原双语显示/点击逻辑不改。

## 验证

- 当前源码类型检查 `tsc --noEmit -p tmp/tsconfig-approved-effects.json` 通过。
- `scripts/check-chat-sp.cjs` 隔离真实 ChatRoom：日夜、320/390/430 常驻三键及同一水平线、顶栏独立设置、真实未读圆点、32px头像、署名入口、自动翻译无横线、Tweets/Replies 的有内容及空白切换、关闭与经典/玻璃恢复通过。
- 已查看日夜聊天与粉色完整资料卡截图；只用一次性浏览器上下文的测试数据，不访问用户存储，不调用模型或通话。
- 开发服务在检查中因原6GB堆耗尽退出，确认3003空闲后按原项目/原`.next-3003`恢复，堆限制8GB；没有停止其他服务、清缓存或改聊天记录。
- 真机布局、实际输入键盘、真实群聊与通话仍待用户验收。

## 状态

未 commit/push。修改与第一版 SP 及其他共享未提交工作共存，后续提交须逐文件/逐差异核对。
