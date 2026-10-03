# 集市应用身份兼容实样检查

- 基准：feat/imessage-private-chat / e57d3db；仅查看公开包与宿主代码，未安装/执行应用、未调用模型。
- 来源：默认资源集市 xiaolongbao0709/ai-virtual-phone-share main，读取 _index.json 后下载 Bubble/bubble最最新.zip、Char动物园/charzoo-1.3.0.zip、2048/2048-1.0.0.zip 到 tmp 检查。
- Char 动物园 index.html：AiPhone.db.list/create/update('zoo_saves')、characters.list、user.getProfile；应用自身不按 user 分库存档。宿主可按 userId+appId+collection 隔离且保持原 API。
- Bubble html试试.html：api.db list/update/create 维护 cfg/dat 等集合，ai.generate 传 characterId；characters.list 选角色；模拟日期还有 localStorage 备用读写。需宿主 db/AI/角色权限与 iframe 重建共同适配。
- 2048 index.html：直接 localStorage 读写 2048_leaderboard。不能只改 AiPhone.db 就保证此类兼容；需补沙箱浏览器存储适配或修改包。
- 宿主 custom-app-runner 注入 window.AiPhone/AiPhoneApp，db/user/AI 经请求桥；iframe sandbox allow-scripts allow-downloads 未 allow-same-origin，源码未见 localStorage 适配，直接 localStorage 在该沙箱可能拒绝访问，未运行不能宣称可用。
- 现有 customAppCollectionKey 仅 appId/collection，无 user；characters.list 返回全部基础卡。SDK互动选角应适配可互动范围，共享角色库仍独立保留全部查看。
- 结论仅适用于抽查，不推断集市全部应用；深层宿主兼容可覆盖主要 SDK 路径，但自存储与内部 persona/缓存需逐包验证。
- 修改：仅本交接/TODO，下载样本在 tmp；未 commit/push。未浏览器/真机验收。
