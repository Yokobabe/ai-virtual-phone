# 相册背景定义、版本可靠性与角色自主动作

日期：2026-09-19。分支 `feat/imessage-private-chat`，接续基准 HEAD `925bc9f`。共享目录已有大量相册与聊天未提交改动，本轮保留，未 commit / push / 部署。

## 授权范围与交付

- 生图预览点保存时打开背景表单；可留空直接保存，也可填背景、发生日期，勾选「作为共同经历记住」并指定相关角色。原生相册照片的信息面板可再次编辑/撤销确认。未确认的描述不是事实；选角色不自动授予图片访问权限。
- 照片有稳定展示 ID、来源关联 ID、内容版本、涂鸦版本。转发复制媒体并携带来源 ID/版本；再次生成保留展示 ID，产生新内容版本，不继承旧心语/讨论/相册涂鸦。普通涂鸦保留讨论。聊天源心语逐张绑定，而非照片组共用。
- 压缩/托管属于引用迁移，使用 `relocatePhotoMedia` / `relocateAlbumNativeMedia`，不产生新内容版本；旧讨论迁移到版本制。自动清理跳过相册收藏。删除原生媒体先检查还有无其他相册引用。没有全局媒体去重，转发仍是独立副本以保证删除源图后聊天不裂图。
- 已查看记录按角色保存客观视觉、当时讨论、版本、权限状态；撤权/删除后保留历史快照但不继续取图。原图视觉缓存不随涂鸦重复调用，涂鸦通过结构化标记进入上下文。识图关闭或未附图时不接受模型虚构的 visual 字段。
- 相册 review 返回后复核图片/涂鸦/背景定义/权限及最新评论，拒收过期结果。错误五分钟重试。手动编辑心语同步已知快照。旧版本见闻与动作日志进入相册短期事件，后续沿用现有摘要管线。
- 上传、生图专辑均可设共享权限，默认私人；生图专辑标题固定。原生共享图只评论，不自动写聊天源心语。
- 角色可由 review JSON 或聊天动作协议自主评论、转发照片给用户、选照片作自己的私聊头像；不强制选择。必须已看过当前版本且仍可访问。转发/换头像只允许原生上传/生图源、已有本人私聊；聊天源仅评论。头像要求有真实识图记录，合成当前涂鸦并限制最长边 512px，保留现有会话头像历史。动作前复核权限、版本、会话和取消信号，失败释放占位、清理临时复制媒体。按角色互斥，Web Locks 可用时跨页签加锁；转发/头像防突发频率 60 秒，按照片版本去重。
- 群提示词只注入当前群源相册；成员私有相册短期条目不合并进群提示词。
- 聊天动作目标为 `assetId|variantVersion`，缺版本不执行；可避免模型生成期间原图/涂鸦变化后误用新版本。解析与群成员身份边界见 `scripts/check-album-action-protocol.cjs`。

## 存储与记忆约定

`ai_phone_album_core_v1`（AiPhoneKvDB）保存 identities / definitions / seen；不把定义重复写入不可自动修订的长期摘要。`photoFactContext` 为私聊及个人相册 review 提供最新权威记录，旧冲突摘要应让位；相对日期有创建时本地日期/timezone 锚点，也可明确选日期。撤销确认保留修订记录，通知旧相关角色该事实已撤销，不假装删除其曾参与的讨论。

相册元数据、权限、讨论、core 四个 KV 键明确归属数据管理的聊天模块，避免被当缓存清掉，并进入聊天备份。二进制仍在原媒体存储中。核心表只存内联图片的定位指纹，不再复制整段 base64；该指纹不用于权限或媒体去重。

历史上限：身份版本 20、单角色旧见闻 5、动作日志 20、旧讨论 5；提示词当前取最近 40 个相关定义、30 个已看记录、20 条讨论更新。完整当前定义持久保存，但尚无大规模语义检索，因此很多旧图时不可保证模型仅凭模糊描述定位正确；协议要求不确定时询问，不猜照片 ID。

## 本轮文件

- 新增 `lib/photo-album-core.ts`、`lib/photo-album-actions.ts`。
- 修改 `lib/photo-album-storage.ts`、`photo-album-lab.ts`、`photo-album-permissions.ts`、`photo-album-discussion.ts`、`photo-album-review.ts`。
- 修改 `lib/chat-storage.ts`（转发来源字段）、`chat-avatar-action.ts`（受控相册头像写入）、`action-parser.ts`、`group-chat-engine.ts`、`short-term-assembler.ts`、`media-maintenance.ts`、`data-management/modules.ts`。
- 修改 `components/photo-album/photo-album-lab.tsx`、`photo-album-app.tsx`、`styles/photo-album.css`。
- 新增 core/actions/maintenance 回归及共享 VM helper，更新相册既有回归；隔离浏览器脚本 `tmp/check-album-detail-browser.cjs` 加背景定义流程。

## 验证

- 当前 `tsc --noEmit` 通过（并非沿用历史结果）。
- `check-album-core`、`check-album-actions`、`check-album-maintenance`、`check-album-discussion`、`check-photo-album`、`check-album-lab`、`check-album-permissions`、`check-album-references`、`check-album-group-forward`、`check-chat-avatar-action` 均通过。模型/媒体/权限使用内存模拟，无真实 API 调用。
- 浏览器独立上下文、仅允许本地非 API 请求：背景编辑/确认角色/撤销确认、上传、权限改名、多目标转发、聊天内图片显示、旧 asset 链接、图库缩放、详情滑动/缩略条、心语手改与评论滚动通过。截图 `tmp/album-definition-mobile.png`。未使用或清除用户浏览器数据。
- 启动时 3003 无监听，恢复本项目开发服务 PID 2900，`.next-3003`，6GB heap。首次编译阶段出现截断 JS/manifest，稳定后整套浏览器通过；没有停止另一个 3001 进程。日志 `tmp/album-core-server.*.log`。
- 真机、深色完整流程和真实角色语气/自主动作频率未验收。浏览器测试禁用 API，因此转发后的模型后台回复报未配置属于预期，不声称真实模型已通过。

## 明确边界

- review 与延迟动作依赖小手机页面运行；不是关闭浏览器后仍可执行的服务器任务。
- 未找到已实现的全相册批量转图链入口；本轮提供迁移接口并接入聊天压缩，不声称已验证用户所指的外部托管流程。后续具体托管器必须显式使用引用迁移 API，不能通过普通 replace 冒充位置变化。
- 版本历史保存标记与见闻，不备份所有旧图片二进制，也没有回退旧图 UI。
- 不做自动全面识图；按共享 review 排队处理，识图受现有配置控制，会产生模型调用。语义识别正确度和行为选择仍需真实模型验收。

## 建议用户验收

1. 生图保存时填背景、选角色并确认；私聊询问，修改/撤销后再次询问，检查不会继续断言旧定义。
2. 上传或生图专辑设共享；等待 review，留言/涂鸦；处理中撤权或改图，确认没有过期回复。
3. 与角色讨论已共享照片，观察评论、转发或换头像的自主选择；共享图可能被静默看过，不保证每张都行动。
4. 原聊天图替换、撤回、多图各自心语、相册单向涂鸦与收藏保护；真机检查新表单与日期输入。
