# 记忆层叠入口接入正式页面

日期：2026-10-04。分支 `feat/imessage-private-chat`；基准 HEAD `c3cd2d3`。用户验收独立 HTML 和多代表色修复后授权写入正式项目。保留工作区原有改动，不提交、不推送、不部署。

## 结果

- 第二层使用验收原型的五层圆角入口：FACTS / CORE / LIST / MIRROR / GAZE。只有英文栏目标题，中文说明与条数保留；前四层高 96px，层间重叠 18px，各层可见高度 78px，末层高 78px。
- 取色源为档案库 `Character.avatar`。`MemoryBankPane` 原有 `loadInteractableCharacters` 链路传入该档案，不读取聊天头像覆盖；纯像素取色，不调用模型、不上传图片。
- 将 HTML 中已验收的多代表色算法移植为独立 TS 模块：饱和中间调优先、阴影与中心肤色样色软降权、主／辅助色派生五档明度。黑白图使用层次灰，无头像或加载失败使用默认色板。
- 日间白色页面、夜间深色页面。保留第一层当前身份头像、角色头像长渐隐横幅、记忆条数排序与身份私有置顶；第二层不替换第一层。
- 继续使用父页面单返回、Facts 短期／长期切换以及认知／未了功能。栏目内容标题统一英文。“查看不调用模型”文案明确为“查看不调用模型，整理更新会调用记忆总结模型”，总结调用逻辑不变。
- 头像取色缓存上限 64、8 秒超时；组件依据当前头像源匹配结果并清理旧 effect，防止旧请求覆盖新头像。系统日夜变化重新派生颜色；文字与实际底色对比度至少 4.5:1。

## 文件

- `components/memory/memory-garden.tsx`：第二层颜色输入、英文标题与栏目文案。
- `components/memory/memory-garden.module.css`：已验收的层叠布局、统一白／深色背景；保留第一层头像样式。
- `lib/memory-entry-palette.ts`：正式头像多代表色及柔和五色板。
- `scripts/check-memory-entry-palette.cjs`：直接执行生产模块与批准的 HTML 算法比对，多色系／对比度／回退检查；可通过临时环境变量传入本地测试图片，不记录私人路径或图片。
- `scripts/check-memory-ui.cjs`：更新正式 3003 页面的英文栏目、叠层位置／命中、实际档案配色与中性背景断言；原有导航、置顶、身份回归保留。
- 修改前快照：`components/memory/versions/memory-garden.before-layered-v4.tsx.bak` 与 `.css.bak`。
- `docs/TODO.md` 和本交接。

## 验证

- 限定源码类型检查通过：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`。范围为当前 app/components/lib 等源码，不等同完整工程构建。
- `node scripts/check-memory-entry-palette.cjs` 通过。八类颜色的生产采样与原型一致、五档区别、日夜文字对比度、异常／透明回退。另以用户提供的实际照片通过同一脚本的可选图片检查：主色仍是橄榄绿，结果与验收原型相同；照片未写入公开素材。
- `node scripts/check-memory-ui.cjs` 通过：3003 实际 React 页面，390/320 日夜，第一层三角色／身份头像／排序，五层英文标题与文字未被覆盖、实际档案色板、Facts 与共同经历、单返回、真实触屏长按／滚动取消、键盘置顶与焦点、置顶持久化、未了完成与原话依据、A/B 私有认知／置顶隔离。已查看实际页面日夜及第一层截图；使用独立浏览器合成数据，拦截模型／外部请求，不改用户存储。
- 10 个底层文件 SHA256 与修改前一致：记忆认知、总结、服务、存储、类型、prompt 组装、核心构建、置顶存储、公共头像取色、气泡配色。只新增记忆入口专用取色，不改变记忆生成／注入规则。

## 状态与边界

3003 原服务继续使用，未重启／抢占端口；3014 验收原型保留。正式页面已可在 `http://192.168.101.2:3003/` 的资源库 → 记忆库验收。原型验收已获用户确认，正式页面仍待用户实际设备验收。跨域图片若不允许 Canvas 读取会用默认色板；不擅自代理下载。未 commit／push／部署，未调用付费模型。
