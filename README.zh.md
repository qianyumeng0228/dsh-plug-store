<p align="center">
  <img src="assets/logo.svg" width="88" alt="dsh-plug-store logo">
</p>

# dsh-plug-store

[English](README.md) | 中文

[![npm](https://img.shields.io/npm/v/dsh-plug-store)](https://www.npmjs.com/package/dsh-plug-store)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![catalog](https://img.shields.io/badge/catalog-29,593_plugins-blue)](https://qianyumeng0228.github.io/dsh-store/)

装在 DeepSeek Harness **里面**的插件商店。它把
[dsh-store](https://github.com/qianyumeng0228/dsh-store) 的插件目录挂成宿主设置页的一个分区，
并且**真的执行**安装 / 更新 / 卸载 / 备份——走 `dsh plugin` CLI，不是给你一段命令让你自己复制。

目录收录 29,593 个社区插件，其中 14,344 个可一键安装；描述中文优先；每个操作都有实时进度；
任务记录重启后还在。

## 安装

```sh
# npm 发布版
dsh plugin --profile <profile> add dsh-plug-store

# 或直接装 GitHub 源码——免构建、零运行时依赖
dsh plugin --profile <profile> add github:qianyumeng0228/dsh-plug-store
```

> **npm 目前只发布到 0.1.21。** GitHub 源码始终是最新的，且多带最近五次修复；
> npm 追上之前建议用上面的 `github:` 形式。

装完重启宿主；也可以不重启——本插件声明了 bundle，profile 的 HMR 会通过 `dsh.bundle.patch`
把它热加载进去。

- **DSH 桌面版**：请用应用内的插件管理器安装。在桌面机器上跑 `--profile web` 的命令会写进
  `profiles/web`，而桌面应用不加载那个 profile，条目就是不会出现。
- **作用于哪个 profile**，按这个顺序确定：插件配置里的 `profile` → 本插件自己的安装目录
  （`~/.dsh/profiles/<profile>/…`）→ 环境变量 `DSH_PROFILE` → 兜底 `web`。
  所以装在 `desktop` 下，操作对象就是 `desktop`。

**需要 cordis 系的 DSH 宿主**（在 0.2.1-rc.2 上开发并实测；peer `@deepseek-ai/cordis ^4.0.1`）。
宿主不支持时这个分区不会挂载。

## 在哪打开

**设置页 → 插件商店**（通过宿主的 `settings.section` 槽注册）。UI 同时挂在宿主回环端口的
`/dsh-store/` 上，浏览器直接打开也能用。

## 功能

- **真实安装，不是复制命令**：每个动作都以子进程调 `dsh plugin`，作用在正确的 profile 上，
  并回报真实结果。`pnpm` 对已装的固定版本依赖会回一句 "Already up to date" 且退出码 0，
  所以更新必须显式带上目标版本、装完再回读实际版本：版本真的动了才提示「已更新」，
  没动就明说「没有变化」。
- **实时进度 + 任务记录**：操作排队执行，进度来自 pnpm 的 `ndjson` 事件流
  （解析 / 下载 / 链接 / 构建四个阶段、当前包、字节数）。失败会按 13 个 `ERR_PNPM_*`
  错误码翻译成能看懂的中文提示。记录落盘在 `~/.dsh/store-data/tasks.json`，重启不丢
  （中断的任务标成「已中断」，不会静默消失），已完成 / 已失败的记录可一键清除。
- **「可更新」按你本机算**：拿本机已装版本和目录目标版本比，而不是看数据里的标记。
  本地链接等非 registry 依赖（`file:`、`link:`、`workspace:`、`git+…`）一律排除，
  免得"更新"把它们覆盖成别的东西。
- **中文优先的目录**：描述优先显示中文；只有英文的条目在构建期就机翻好（线上 99% 已覆盖），
  仍缺的在页面内按需翻译。中 / EN 切换按钮只在确实存在两种语言时才出现。
- **主题页是预览图墙**：主题卡片直接显示从各仓库 README 提取的真实截图
  （相对路径按 `raw.githubusercontent.com` 解析，`blob` 链接改写），只收横图，点开进灯箱可前后翻页。
- **扛得住体量的浏览**：真分页（每页 24/48/96，会记住）、17 个双语分类、名称/描述/标签搜索、
  多维筛选（可安装 / 官方 / 本周新增 / 可更新 / 收藏 / 已装）、含随机的七种排序、卡片与列表两种视图、
  「最近收录」「最多安装」两条可折叠横滑栏，以及底部待装栏——一次确认后批量真实安装。
- **收藏、屏蔽、备份、诊断**：收藏与屏蔽只留在你本机；备份导出该 profile 的已装清单加
  `cordis` 补丁，是可读 JSON，方便迁移；诊断会检查 `dsh` CLI、profile 目录、数据源连通性，
  以及内嵌页面的真实布局状态。
- **只有一条滚动条**：页面以 iframe 嵌入，高度被撑到内容的真实高度，滚动完全交给宿主设置页的内容列。
  浮层（详情弹层、待装栏、toast、灯箱）每次滚动都重新按可见窗口定位；撑高取的是内容真实结束位置
  而不是 `scrollHeight`，所以切到更短的分区时框架也会跟着缩回去。

## 数据

目录由 [`qianyumeng0228/dsh-store`](https://github.com/qianyumeng0228/dsh-store) 每日构建并发布到
GitHub Pages。本插件经自己的同源路由（`/dsh-store/data/plugins.json`）读取它，该路由把快照缓存在
`~/.dsh/store-data/plugins.json`，有效期 24 小时，过期后先给旧数据、后台拉新——打开商店因此很快，
也不依赖那一刻 CDN 是否可达。响应支持 gzip 协商与弱 ETag。

快照**故意不打进包里**：打进包等于冻结一份每天都会过期的数据，而上面的缓存已经提供了同样的首屏速度。

## 宿主接口

所有路由都在 `/dsh-store/` 下，其中 `api/*` 有守卫（见「安全」）。

| 路由 | 用途 |
|---|---|
| `GET /api/capabilities` | 能力探测；前端看到它就切进宿主模式 |
| `GET /api/installed` | 已装包名、版本、类型与来源仓库 |
| `POST /api/install` | `{source:"npm",name,version?}` 或 `{source:"github",repo,ref?}` → `202 {taskId}` |
| `POST /api/update` | 载荷同上；返回 `from` / `to` / `changed` |
| `POST /api/uninstall` | 真实卸载，界面二次确认 |
| `GET /api/tasks` | 排队 / 进行 / 已完成任务及进度 |
| `POST /api/tasks/clear` | 只清除已完成与失败的记录 |
| `GET /api/backup` | 导出 profile 已装清单 + cordis 补丁 |
| `GET /api/diagnose` | CLI、profile、数据源与内嵌布局健康检查 |
| `GET /data/plugins.json` | 目录代理（本地缓存 + 远程回退） |

标识在进入 CLI 前一律校验：npm 源必须是包名，GitHub 源必须是完整 `owner/repo`
（只给仓库名末段会拼出无效的 `github:dsh-xxx`），以 `-` 开头的值直接拒绝，避免被当成命令行选项。

`GET /api/installed` 同时返回名字数组和明细，因为目录展示名与本机依赖键经常不一致
（目录里的 `yujunzhixue-dsh-purge` 在磁盘上是 `dsh-purge`）——只比其中一种会静默漏掉一半已装项。

## 安全

- `api/*` 要求 **回环 `Host`**（`localhost` / `127.0.0.1` / `[::1]`）**且**带自定义头
  `x-dsh-store: 1`——跨站网页带不上这个头（预检就过不去）。商店页面与目录数据不设限，
  因为它们本来就是公开数据。
- **零运行时依赖**，也没有任何上报：唯一的外发请求就是拉目录。
- 不读任何凭据。写入只发生在 `~/.dsh/profiles/<profile>/`（通过 `dsh plugin`）
  和 `~/.dsh/store-data/`（自己的任务日志与数据缓存）。
- 安装源限定为目录里的条目；商店不接受任意 URL 作为插件来源。
- git 来源的插件在宿主里可能需要构建脚本放行（`allowBuilds`），待装队列会把这件事摊开说，
  不会藏着。
- 收录不等于背书：每一条都是第三方代码，装你自己信得过的。

## 配置

```yaml
plugins:
  dsh-plug-store:
    profile: desktop     # 不写就按安装路径自动判定
    # path: /dsh-store   # 路由前缀
    # dataUrl: https://qianyumeng0228.github.io/dsh-store/data/plugins.json
```

## 仓库结构

```
dsh-plug-store/
├── index.js              # 宿主侧：/dsh-store/* 路由 + dsh CLI 子进程（零依赖）
├── cordis.patch.yml      # bundle 声明，供 dsh.bundle.patch 消费
├── client-src/index.js   # 客户端源码（React）
├── client/client.js      # 上面那份源码的手工维护产物
├── site/index.html       # 商店 UI——与上游文件字节一致
├── assets/logo.svg       # 标识
└── .github/workflows/    # sync-upstream.yml 保持 site/index.html 与上游同步
```

## 开发

```sh
npm install      # 只是开发期工具（esbuild + react），都不进包
npm run check    # node --check index.js
```

有两条规矩各自踩过一次线上事故：

- `client/client.js` 是**手工维护的打包产物**，里面 React 的引用名是 `import_react.default`。
  把 `client-src` 里的 `React.useState` / `React.createElement` 原样贴进去，面板就整块空白。
  改客户端必须两处同改。
- `site/index.html` 是
  [`qianyumeng0228/dsh-store`](https://github.com/qianyumeng0228/dsh-store) 里同名文件的
  字节级副本，那份才是 UI 的唯一真源。宿主专用差异由页面运行时自己检测，所以两份必须一致：
  在上游改，然后同步过来。

## 排错

| 现象 | 原因 |
|---|---|
| 分区一直不出现 | 装进了当前宿主不加载的 profile（见「安装」） |
| 商店面板空白 | `client/client.js` 与 `client-src/index.js` 不同步 |
| 更新提示成功但什么都没变 | 更新链路没带显式版本——见「功能」 |
| 重启后任务列表是空的 | 被清除过；进行中的任务会保留并标为「已中断」 |
| 目录像是一天前的 | 本地缓存；跑「高级 → 运行诊断」，或删掉 `~/.dsh/store-data/plugins.json` 强制回源 |

## 提交插件

本仓库是商店应用，不是目录。收录由
[`dsh-store`](https://github.com/qianyumeng0228/dsh-store) 的管道产出——种子注册表、GitHub topic
扫描、npm 关键词爬取，每条都要拿 `package.json#dsh` 的证据核验。想被收录，或者发现某条数据不对，
请到那边开 issue；商店的「提交插件」页会自动生成预填好的表单。

## 许可

MIT
