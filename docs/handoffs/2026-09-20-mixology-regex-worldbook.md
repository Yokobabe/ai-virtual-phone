# 2026-09-20 酒馆正则与世界书运行适配

## 授权与基线
用户明确要求正则和世界书必须适配，尤其 Kemini 的思考清理、深度摘要规则，不能仅保留文件字段。
集成分支 feat/imessage-private-chat，基准 HEAD 1c71ea6；沿用独立 worktree `C:/Users/Effy/.codex/worktrees/mixology-compatibility/ai-virtual-phone`，重新从主目录同步本任务目标文件并记录 SHA-256 基线。没有切换主目录分支。
合回前 11 个已有文件与起始基线一致；另外 8 个新增文件没有同名冲突。仅这 19 个目标文件带回主目录，原版本备份在 worktree 父目录 before-regex-integration，清单 regex-lore-integrated-paths.json。未引入临时 QA 路由或样本全文。

## 正则实现
- 按角色卡、预设的顺序读取 extensions.regex_scripts；尊重 disabled、placement、markdownOnly、promptOnly、minDepth/maxDepth、runOnEdit。
- 三条处理语义：普通文本处理、显示处理、发给模型的上下文处理。存档原文保留，显示模板不会写回请求；深度从最近消息起算，界面与请求分别计算。
- 支持 /pattern/flags 与裸表达式、捕获组 $0/$1/$<name>/{{match}}、trimStrings、查找表达式宏的原始/转义替换、替换模板宏。
- 实际请求路径执行用户输入/模型历史正则；世界书文本处理执行 placement 5 的普通文本规则。斜杠命令和服务商独立 reasoning 字段未接入；正文中的 think/thinking 标签可正常清理。
- 屏幕正文、用户消息、流式内容走显示管线；对尚未闭合且应清理的思考标签延迟展示，避免先闪出隐藏段落。原生未配正则的用户文本保留原显示方式。
- 浏览器 Worker 执行正则和世界书匹配，3 秒处理超时会终止工作线程并显示错误；加载超时 20 秒。语法错误阻止保存或阻止本轮处理，不静默删内容。
- 正则 HTML 使用隔离 iframe，CSP 只允许本应用的高度桥接脚本，禁止导入内容的脚本、外部请求和表单；支持 CSS 和原生 details 折叠。原生特调 HTML 路径不变。

## 世界书实现
- 角色卡内嵌 character_book + 单独导入酒馆世界书 JSON（数组或 entries 对象）；独立世界书作为「风味」材料搭配，不把整本正文无条件塞进提示词。
- 常驻、关键词/正则关键词、大小写/整词、次关键词四种逻辑、扫描深度、额外人物/用户资料扫描、递归及递归排除/防继续触发、延迟递归、概率、分组优先/权重/评分、持续/冷却/初始延迟、生成类型过滤、预算与忽略预算。
- 位置：人物前后、历史深度与角色、示例前后；作者注释顶部/底部使用历史尾部位置适配（特调没有独立酒馆 Author's Note 槽）；outlet 可用宏引用。排序和选择分开处理。
- 激活状态存每轮快照，重说/回退沿剩余历史恢复；编辑后的后续状态失效，角色回复编辑补跑时重算。概率使用基于对局与最近消息的种子，重复处理不随渲染随机变化。
- 对话每轮可展开世界书报告，查看入选状态或关键词未命中、预算、冷却等未入选原因，以及估算 token 数。
- 编辑器可开关正则/世界书条目、编辑正则表达式与替换正文、切换递归；高级 JSON 可修改完整范围/深度、世界书正文及参数。

## 实际兼容边界
- 不是完整 SillyTavern 插件运行环境。向量检索、外部自动化、酒馆脚本扩展仍不执行；没有向量配置的向量专用条目报告未注入，有关键词的条目仍可按关键词触发。
- 世界书预算采用项目现有 token 估算，并受请求兼容预算限制；不是特定模型的精确 tokenizer。默认扫描深度 2；递归需书中启用或在编辑器中开启，最大 32 步。
- 持续/冷却以特调生成轮次记录；Author's Note 和部分酒馆全局世界书设置无一一对应槽位，不能声称所有酒馆配置逐字等价。未配置的酒馆全局设置无法从角色卡恢复。
- 正则 scope、深度及正文处理已实测；依赖独立 reasoning 通道、斜杠命令和脚本联动的规则不应声称已支持。
- 普通正则处理在读取原始/未显示处理文本时重建，避免不可逆改写旧聊天；与酒馆直接改写消息源的存储方式不同。

## 验证
- 阅读 SillyTavern release 的 public/scripts/extensions/regex/engine.js 与 public/scripts/world-info.js，核对阶段筛选、捕获替换、逻辑、位置等行为；参考源码仅放 worktree 父目录，未复制进产品。
- 两份真实预设及 Raymond V3 卡离线解析、交叉装配通过。Kemini 实测：去思考、近期去摘要、深度 11 留摘要、用户标签范围；雾中诗人实测：去思考、近期正文/较远摘要切换。
- 合成测试覆盖显示/上下文隔离、停用/深度/编辑过滤、转义宏、捕获组/trim、世界书独立导入、递归、概率 0、正则关键词、整词、分组、持续/冷却、预算、角色注入、编辑补跑/重说、原文保留和模拟模型参数。
- 原有 check-mixology-upstream.cjs 回归通过；网络被禁止的内存测试，不调用真实模型。
- 隔离 Edge 430×932 浏览器：真实 Kemini 的 Worker 清理与摘要折叠、模型输入清理、世界书注入、CSP、长耗时正则超时且界面计时仍前进；正则开关保存/重开；独立世界书导入及条目开关保存。无页面错误和横向溢出，截图已查看。
- 独立全量 TypeScript 检查通过；生产构建成功（75 页含两条临时 QA），执行 restore-backdrop-filter。临时页面/样本未带回主目录。
- 合回主目录后真实样本兼容回归和原生回归再次通过；主目录全量 TypeScript 检查通过。
- 测试只使用 127.0.0.1:3021 与独立浏览器，阻断外部/API 请求；测试服务已关闭。3003 未触碰，没有清理用户存储。

## 文件与交付
新增：lib/mixology/compatibility-regex.ts、compatibility-worldbook.ts、compatibility-text.ts、compatibility-worker.ts、compatibility-worker-client.ts、compatibility-worker-browser.ts；components/mixology/compatibility-prose.tsx、compatibility-data-editor.tsx。
修改：lib/mixology/compatibility.ts、compatibility-runtime.ts、assembler.ts、engine.ts、types.ts；components/mixology/mixology-app.tsx、mixology-editor.tsx、mixology-game.tsx、prose-view.tsx、rich-text.tsx；scripts/check-mixology-compatibility.cjs；文档本交接与 TODO。
未 stage/commit/push/部署。真实模型速度/文笔、真机验收未做。本交接替代此前“正则未执行、世界书仅基础关键词”的状态，不替代仍存在的兼容边界。
