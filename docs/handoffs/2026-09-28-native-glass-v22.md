# 玻璃材质 v22 与通用未读胶囊

## 授权与基准

- 用户授权直接调整成品：材质仅作用于玻璃模式；未读数字优化适用于两种模式。
- 分支 `feat/imessage-private-chat`，HEAD `dd44205`。保留共享目录原有未提交改动。未 commit/push/部署。
- 使用 pinpoint / emil-design-eng 做局部调整；编辑前保存 `styles/versions/imessage26.native-glass-v22.css.bak`、`components/chat/versions/chat-unread-pill.native-glass-v22.tsx.bak`、`chat-room.native-glass-v22.tsx.bak`。不改头栏布局、头像尺寸、特效、普通模式材质。

## 实现

- `styles/imessage26.css`：玻璃控件降低固定蓝染色和对比增益，6px blur / 120% saturation；半像素细边和克制表面高光，不添加外发光。输入区域单独 10px blur，保留细直分隔线。角色气泡默认中性 `rgba(66,72,81,.38)`，取代原深蓝黑高覆盖底，6px blur / 112% saturation；发送蓝气泡不改。
- 角色轮廓移除四次 drop-shadow，普通无尾气泡用 .6px 细边，有尾气泡通过 `public/chat-bubble-contour-left.svg` 九宫格轮廓覆盖保留现有尾巴遮罩；不改原始 silhouette 资产。旧 WebKit mask 不支持时保留圆角细边回退。
- `components/chat/use-glass-contrast.ts`：仅玻璃开启时运行；本地读取壁纸 64×64 像素，依据实际中心 cover 裁切和每个目标元素位置采样。控件/角色气泡分别判定前景明暗，保留滞回区间避免临界反复切色；白底等高亮场景采用深色文字与浅中性接收气泡。壁纸变化、滚动、尺寸、新消息更新时节流计算，不逐帧 readPixels、不上传、不调用模型。仅亮字的控件文字保留微弱可读性阴影，不是轮廓光晕。
- `components/chat/chat-room.tsx`：接入该 hook，关闭玻璃或卸载时清除所设局部 CSS 变量。菜单等无关组件未重新设计。
- `components/chat/chat-unread-pill.tsx`：两种模式统一 SVG 镂空数字，胶囊继承箭头 currentColor；去除固定黑色、夜间灰底白字分支。计数逻辑、99+、返回动作保持不变。

## 验证

- `scripts/check-native-glass-v22.cjs`：实际 React 未读组件与取色 hook，隔离 Edge 390px / DPR2。亮、暗、无壁纸 × 日夜 6 种组合；左右明暗分区的独立控件颜色；未读颜色继承、99+、单一镂空 mask；SVG 尾巴轮廓加载；关闭玻璃清理局部变量。通过、pageerror=0。
- 与编辑前 CSS 对比普通模式的按钮、角色气泡、surface、用户气泡 computed styles，完全一致；未读胶囊为用户授权的通用例外。
- 更新并通过 `scripts/check-chat-glass-controls.cjs`：原生五条语音图标、分隔线、无凸起 rim、玻璃作用域、新材质和单层轮廓。
- 当前应用源码类型检查：`tsc --noEmit -p tmp/tsconfig-approved-effects.json` 通过。使用既有临时配置排除 tmp 历史发布副本，未修改共享 tsconfig；未把这一结果宣称为包含历史副本的全仓库检查。
- 查看隔离截图 `qa/native-glass-v22/{split,dark,white,none}.png`。为无用户数据的测试夹具，非用户真实聊天截图；极端混合明暗的文字可读性仍需真实背景/真机观察。
- 3003 保持现有 PID 47320，不重启、不抢端口。页面和新增轮廓资源的实际可用性在交付时检查。

## 限制与手机验收

- 尚未 iPhone/Safari 真机验证。局部明暗规则是本项目实现，不宣称复刻 Apple 原生算法或实时折射。
- 遇远程图片 CORS 禁止取像素时使用既有明暗回退，不保证精确局部采样；透明图片按会话日夜底色合成取样。
- 刷新 3003：检查当前冰川背景上的功能键、角色气泡的轻盈度/细描边，换亮壁纸检查黑色返回与镂空数字，再关闭玻璃确认普通模式材质不变。
