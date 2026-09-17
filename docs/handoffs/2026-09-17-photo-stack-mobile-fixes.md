# 叠图移动端稳定性修复交接

## 需求

- char 添加照片标记后，当前页面的被标记照片不能消失。
- 手机照片区域优先识别向左翻页；只有明显表现为纵向意图后才滚动聊天页面。
- 叠图详情移除顶部返回键，使用左边缘右滑分层返回。
- 恢复统一验收入口 `0.0.0.0:3003`。

## 分支与基准

- 分支：`feat/imessage-private-chat`
- 基准：`9d1ac2f feat(chat): add multi-photo stacks and autonomous chat actions`
- 本轮未提交、未推送。

## 改动文件

- `components/chat/message-bubble.tsx`
  - 媒体源解析只在 `messageId/mediaUrl` 改变时重跑，annotation-only 更新不再回收 blob URL。
  - annotation 元数据与已解析图片 URL 分开合并。
  - 叠图手势加入 pending/photo/page 三态方向锁；照片区域左滑优先，明确纵向后手动滚动最近的滚动容器。
  - 移除照片列表和聚焦层的顶部返回按钮；增加 30px 左边缘右滑区。聚焦层先退回列表，列表层再关闭详情。
- `styles/chat.css`
  - 叠图区域改为自行管理触摸动作。
  - 详情 header、内容和聚焦层补齐系统安全区。
  - 新增透明边缘返回手势区。
- `docs/PROJECT.md`、`docs/TODO.md`
  - 同步多图现状和本轮真机待验收项。

## 检查

- `node node_modules/typescript/bin/tsc --noEmit`：聊天改动未产生类型错误；全仓检查被现有 World Builder 缺少 `meshoptimizer`、`three-stdlib` 依赖阻断。
- `http://127.0.0.1:3003/`：HTTP 200。
- Next dev server：`0.0.0.0:3003` 已启动并成功编译首页。
- 浏览器自动刷新：页面请求成功，但自动化等待超时，未完成叠图交互检查。

## 待真机验收

- 斜向左滑是否稳定翻页，明确上下滑时页面滚动是否自然。
- char 标记前后照片是否始终可见。
- 聚焦照片和照片列表两层左边缘右滑是否符合预期。
- 普通 Safari 与主屏幕 PWA 的系统边缘手势是否存在差异。

## 提交状态

- 未 commit。
- 未 push。
