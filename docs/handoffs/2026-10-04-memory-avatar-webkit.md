# 记忆入口手机头像裁切修复

2026-10-04；分支 `feat/imessage-private-chat`；HEAD `c3cd2d3`。在现有未提交记忆页面上修复用户截图所示角色横幅头像，不改其他工作区内容。未 commit/push/部署。

## 现象与已确认原因

手机截图中每张角色卡片仅底边露出图片，图片已经加载，不能将其归因为头像 URL 丢失。

在实际3003页面、独立合成资料、Playwright WebKit复现：旧 `.banner` 采用 grid + place-items:center，其内部百分比高度图片的原始宽高比影响隐式网格轨道尺寸。390px下横幅top291.5、图片top325.97，向下偏移约34.47px；图片仍有100px高，却被100px横幅裁切。偏移随图片比例与横幅宽度变化，竖图影响更大。之前只在Chromium检查卡片边界与图片存在，没覆盖WebKit实际图片几何。

## 定向修改

| 元素 | Before | After | Why |
| --- | --- | --- | --- |
| 卡片右侧头像 | 网格自动轨道布局图片 | 横幅block、图片绝对定位inset:0铺满 | 图片原始比例不再推移布局 |
| 无图占位 | 跟随横幅grid居中 | 独立铺满横幅的居中占位 | 保持姓名首字与原渐隐 |

仅改 `components/memory/memory-garden.module.css` 中 characterCard 头像三条规则：保留72%宽度、长渐隐、object-fit:cover、38%裁切焦点及日夜颜色。未修改头像数据、用户身份、取色算法、记忆规则和导航/置顶行为。修改前样式保存为 `components/memory/versions/memory-garden.before-avatar-webkit-v7.css.bak`。

## 验证

- `scripts/check-memory-ui.cjs` 增加可选WebKit引擎、头像专项模式；合成PNG竖图/方图、SVG横图和无图角色，检查图片实际top/bottom是否铺满卡片，另检查用户身份头像。采集模式明确仅截图/输出数据，不当作通过断言。
- `$env:MEMORY_TEST_BROWSER='webkit'; $env:MEMORY_AVATAR_ONLY='1'; node scripts/check-memory-ui.cjs`：实际3003 WebKit，320/390/430日夜全部通过。修复后图像top/bottom与横幅一致。截图在 `tmp/memory-avatar-webkit-*-after.png`。
- `$env:MEMORY_AVATAR_ONLY='1'; node scripts/check-memory-ui.cjs`：实际3003 Chromium，同样六种宽度/日夜组合、三比例图片与占位、身份头像通过。
- 普通 `node scripts/check-memory-ui.cjs`：完整原页面排序/长按置顶/键盘/记忆导航/历史分页/证据/设置/色板/A-B隔离回归通过。初次复跑发现测试脚本新增引擎分支把CDP变量限定在局部作用域，已修正并完整重跑通过；此问题不在应用源码。
- 本轮仅CSS和回归脚本，不改TS接口；diff空白检查通过。不调用模型/TTS、不读取或清除用户浏览器数据。浏览器引擎测试不是用户真实iPhone验收，手机刷新3003后待用户确认。
- 3003保持PID60052运行，没有停服/更换端口。测试WebKit下载到本机浏览器测试缓存，无仓库依赖或锁文件升级。
