# DSH 插件商店（宿主版）· dsh-store-market

在 DeepSeek Harness 内浏览 [qianyumeng0228/dsh-store](https://qianyumeng0228.github.io/dsh-store/) 的 1.7 万+ 插件目录，并**真实执行**安装 / 卸载 / 更新 / 备份 / 诊断——不再只是复制命令。

## 安装

```bash
# npm（发布后）
dsh plugin add dsh-store-market

# 或 GitHub 源码（免构建，零依赖，当前推荐）
dsh plugin --profile <profile> add github:qianyumeng0228/dsh-store-market
```

> 目标 profile 默认 `web`；桌面版请用应用内的插件管理器安装（或在 `--profile desktop` 下安装）。
> 安装后重启 DSH（或重载 profile），插件自动挂载 `/dsh-store/` 路由（bundle 层自动加载，无需手动补丁）。

安装后打开：
- **浏览器访问** `http://127.0.0.1:8900/dsh-store/`（DSH web 的端口与 token 见 `dsh web` 输出）
- 或从 DSH 设置页 / 插件页进入（客户端 section 注册）

## 数据

- 插件包内**自带数据快照**（当前 17,799 条，随版本更新），打开秒加载、零网络依赖；
- 数据源仍是 https://qianyumeng0228.github.io/dsh-store/ 每日构建的 `data/plugins.json`；
- 若本地快照缺失，自动回退远程拉取。

## 功能

| 能力 | 静态站（目录站） | 本插件（宿主内） |
|---|---|---|
| 浏览 17,506 个插件 / 搜索 / 17 分类 / 筛选 / 排序 | ✅ | ✅（同一 UI） |
| 作者头像 / 插件图标 / 下载量 / 更新检测 / DSH 兼容过滤 | ✅ | ✅ |
| 已安装状态 | 手动标记（localStorage） | **读取本机真实已装列表** |
| 一键安装 | 复制命令 | **`dsh plugin add` 真实执行** |
| 卸载 | — | **真实卸载**（二次确认） |
| 全部更新 | 复制命令清单 | **逐个真实更新**（重装 latest / 默认分支最新提交） |
| 备份 | 导出收藏/标记 JSON | **导出本机 DSH profile 配置（已装插件 + cordis 补丁）** |
| 诊断 | HTTP 连通性检查 | **检查 dsh CLI / profile / 数据源连通性** |
| 收藏 / 屏蔽 / 待装清单 / 主题页 / 提交插件 | ✅ | ✅ |

数据仍来自 GitHub Pages 每日构建的 `index.json`（与静态站同源），宿主内经插件同源代理读取，无跨域问题。

## 结构

```
dsh-store-market/
├── index.js            # 宿主插件：挂 /dsh-store/* 路由 + dsh CLI 子进程 API（零依赖）
├── cordis.patch.yml    # 插件层声明（dsh.bundle.patch）
├── client/client.js    # 客户端 bundle：设置页/插件页注册「插件商店」section（iframe 嵌入）
├── site/index.html     # 商店 UI（由 sync-upstream 从 dsh-store 同步；检测到宿主 API 自动启用宿主模式）
├── site/data/plugins.json  # 数据快照（同上，随版本更新）
├── .github/workflows/sync-upstream.yml  # 从上游同步 UI 与数据快照
└── client-src/         # 客户端源码（esbuild 打包）
```

## 已验证（0.1.6）

- [x] 侧栏/设置页图标换成店面（实心遮阳篷 + 屋身 + 门）。原标识是购物袋 + 加号，16px 下袋身是实心梯形、加号几乎占满，读起来是一个方块；新标识按 16px / 18px 逐像素调过：描边宽度 2.2（24 网格）是「18px 墙线仍为实心、16px 门洞不被填满」的拐点
- [x] `StoreLogo` 开始接受宿主传入的 `size`。宿主 `SidebarRoot` 按 `size: wide ? 16 : 18` 渲染面板图标，此前写死 16，收起侧栏时比邻行小一圈
- [x] **主侧栏条目此前从未注册**：`sidebarGate` 以 `initiallyVisible = false` 创建，而 `available()` 只置 `ready`、不置 `wanted`，没有任何地方调用 `setVisible(true)` —— 于是 `shouldShow` 恒 false，`sidebar.panellist` 与配套 `main` 面板都不注册。用 stub 宿主跑真实 bundle 复现：注册表里只有 `settings.section` / `settings.plugins.tab`。现改为默认可见，复测四项注册齐全
- [x] 设置页导航行补上自己的图标：`settings.section` 只投影 `id`/`order`/`label`，宿主 `navIcon(id)` 是 `account`/`models`/`agent-presets`/`plugins`/`archived-sessions` 的封闭映射，其余一律回落到通用齿轮 —— 这就是「插件商店」行戴着一个不像商店的通用符号的原因。做法与 dshmarket 一致：按行可见文本认领自己那一行，加属性标记，用 `::before` 的 `mask-image` + `background-color: currentColor` 画店面（跟随宿主墨色，明暗主题都不假），`ctx.effect` 内挂样式表与 MutationObserver，卸载时摘标记删样式

## 已验证（0.1.5）

- [x] 已安装卡片：状态改由「已安装」徽标表达，按钮一律是明确动作 —— 未装→安装；已装且有新版→更新 + 卸载；已装无新版→卸载；目录外依赖→卸载。此前是一个写着「已安装」的绿色按钮，既看不到卸载入口，又存在点一下即卸载的误操作风险
- [x] 详情弹层同样拆成 更新 / 卸载 两个按钮
- [x] 卸载发出本机真实依赖键：目录名 `yujunzhixue-dsh-purge` → 实发 `dsh-purge`（mock 宿主 + 真实浏览器抓请求确认）

## 已验证（0.1.4）

- [x] 已安装页纳入目录外依赖：本机 32 项依赖中 6 项目录里没有（`@deepseek-ai/dsh-subagent-*`、`@linxin666/…`、`@openviking/…`、`file:` 的 dsh-model-full、以及本插件自身），此前完全不显示、无法管理；现合成条目列出并可卸载
- [x] 主按钮反映本机状态：未装→安装；已装且有新版→更新；已装无新版→已安装（点击卸载，二次确认）；目录外依赖→卸载。静态站仍是复制命令
- [x] 卸载发的是本机真实依赖键（目录名 `yujunzhixue-dsh-purge` → 依赖键 `dsh-purge`）
- [x] 徽标几何关于 x=32 严格对称、墨迹垂直居中；256/64/34px 实测墨迹中心与方块中心偏差 0.00

## 已验证（0.1.2）

- [x] 17 条 Node 直驱断言：伪造 `webServer` 注册路由后逐个调用，覆盖守卫（缺头 403 / 非回环 Host 403 / installed 与 backup 同样受限）、profile 从 `profiles/desktop/node_modules/...` 推导为 `desktop`、installed 名字数组 + 明细、github 只给仓库名 400、带 `owner/repo` 时 CLI 参数为 `github:owner/repo`、npm 作用域名原样透传、`-` 开头值被拒、git 更新不带 name 不再 400、商店页不要求自定义头、方法不符 405
- [x] 测试全程把 `DSH_CLI` 指向不存在的桩程序，任何 spawn 都失败，不会真的改动 profile

## 已验证（0.1.1，本地 mock 宿主契约实测）

- [x] 宿主模式启用后「已安装」页与 ✓ 标记正确：npm 插件按包名匹配，git 插件按 `installedDetails[].repo` 匹配（此前 `installed` 是对象数组，前端按名字判断恒 false，已安装页永远为空）
- [x] git 插件安装载荷为 `{source:"github", repo:"owner/repo", name}`，服务端拼出 `github:owner/repo`（此前取 name 得到 `github:仓库名` 必失败）
- [x] git 插件更新不再因缺 `name` 被 400 拒绝（此前"全部更新"对 git 插件必然失败）
- [x] 顶部「全部更新」计数只统计"已装且有新版"，与按钮实际行为一致
- [x] 安装/卸载/更新后重新拉取 `api/installed`，本机状态不与前端缓存漂移
- [x] iframe 内嵌：文档 `html.inframe` 生效，页面自身不出现在第二条滚动条，默认卡片视图；独立站点仍为列表视图 + 正常滚动
- [x] 以 `-` 开头 / 非 `owner/repo` 形态的标识被 400 拒绝，不进入 `dsh` CLI 参数

## 宿主 API

- `GET  /dsh-store/api/capabilities` — 宿主能力探测（前端据此启用宿主模式）
- `GET  /dsh-store/api/installed` — `{profile, installed:[包名…], installedDetails:[{name,version,kind,repo,bundle}…]}`
  前端用 `installed` 按名字匹配 npm 插件，用 `installedDetails[].repo` 匹配 git 插件（目录展示名与本机依赖键常不一致，两个都得比）
- `POST /dsh-store/api/install`   — `{source:"npm", name}` 或 `{source:"github", repo:"owner/repo"}` 真实安装
- `POST /dsh-store/api/uninstall` — `{name}` 真实卸载
- `POST /dsh-store/api/update`    — 载荷同 install，重装到最新（npm latest / git 默认分支）
- `GET  /dsh-store/api/diagnose`  — dsh CLI / profile / 数据源健康检查
- `GET  /dsh-store/api/backup`    — 导出 profile 配置备份 JSON
- `GET  /dsh-store/data/plugins.json` — 数据代理（快照缺失时回退远程）

标识校验：npm 源必须是包名，github 源必须是完整 `owner/repo`（只给仓库名末段会拼出 `github:dsh-xxx` 这种无效参数），以 `-` 开头的值一律拒绝，避免被 `dsh` CLI 当成选项。

### 接口守卫（0.1.2 起）

宿主的根路径要 token，但插件注册的路由默认全开，所以 `/dsh-store/api/*` 自行加了两道校验：

1. **回环 Host**：`Host` 必须是 `localhost` / `127.0.0.1` / `[::1]`（可带端口），挡掉 DNS rebinding；
2. **自定义头**：请求须带 `x-dsh-store: 1`，跨源网页带不上该头（会被浏览器预检拦下）。

商店页面本身与 `/dsh-store/data/plugins.json` 不设限（公开目录数据）。UI 与 api 同源，因此正常调用不会触发 CORS 预检。

### profile 归属（0.1.2 起）

安装/卸载/更新与「已装」列表作用于哪个 profile，按以下顺序确定：

1. `cordis.yml` 里 `plugins.dsh-store-market.profile`（显式配置优先）；
2. **本插件自身的安装路径** `~/.dsh/profiles/<profile>/node_modules/dsh-store-market/`；
3. 环境变量 `DSH_PROFILE`；
4. 兜底 `web`。

此前没有第 2 步，且第 3 步把 `desktop` 当无效值丢掉，导致在桌面端点安装实际写进 `web` profile：界面里看不到已装、装完也不出现在桌面端。现在装在 desktop 就作用于 desktop。

## 与 dsh-store 的关系

`site/index.html` 与 `site/data/plugins.json` 都来自 [qianyumeng0228/dsh-store](https://github.com/qianyumeng0228/dsh-store)，由 `.github/workflows/sync-upstream.yml`（每周一 + 手动）从上游拉取并提交，**不要直接改本仓库这两份文件**：UI 的改动请在 dsh-store 里做，宿主专用差异（iframe 内不出现第二条滚动条、默认卡片视图）已由页面运行时检测，两份文件保持字节一致。

## 配置（cordis.yml）

```yaml
plugins:
  dsh-store-market:
    profile: web       # 默认 web；desktop 用户改为 desktop
    # path: /dsh-store   # 路由前缀
    # dataUrl: https://qianyumeng0228.github.io/dsh-store/data/plugins.json
```

## 开发

```bash
npm install          # esbuild + react（仅构建客户端用，不入包）
npm run check        # 宿主 index.js 语法检查
# 改 client-src/index.js 后：
npx esbuild client-src/index.js --bundle --format=iife --global-name=__dshStoreClient --outfile=_client_raw.js --minify
# 再以 ModuleLoader 包装生成 client/client.js（见脚本说明）
```

## 版本发布

```bash
npm pack            # 产出 dsh-store-market-<ver>.tgz
# 数据快照更新：cp ../dsh-store/dist/site/data/plugins.json site/data/plugins.json
# GitHub Release 附 tgz：gh release create v<ver> dsh-store-market-<ver>.tgz
# 用户安装：dsh plugin --profile web add <tgz-url 或 github:qianyumeng0228/dsh-store-market>
```

## 边界（诚实说明）

- 下载**进度条 / 任务面板 / 重启提醒 / 导出日志 / 评论**为 dsh-market 插件的更深度宿主能力，本插件当前以「执行 + 结果回显」完成安装/更新/卸载/备份/诊断；如需上述面板化能力可在此基础上扩展。
- git 来源插件安装可能需要 `allowBuilds`，建议锁定 commit。
- 卸载与安装均直接修改 `~/.dsh/profiles/<profile>/` 下的 package.json / cordis.patch.yml，执行前会自动由 dsh CLI 生成备份。

MIT License
