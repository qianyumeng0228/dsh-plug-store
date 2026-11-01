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
├── site/index.html     # 商店 UI（与静态站同一份文件，检测到宿主 API 自动启用宿主模式）
└── client-src/         # 客户端源码（esbuild 打包）
```

## 宿主 API

- `GET  /dsh-store/api/capabilities` — 宿主能力探测（前端据此启用宿主模式）
- `GET  /dsh-store/api/installed` — 本机真实已装插件（读 profile package.json）
- `POST /dsh-store/api/install`   — `{source:"npm",name}` 或 `{source:"github",repo}` 真实安装
- `POST /dsh-store/api/uninstall` — `{name}` 真实卸载
- `POST /dsh-store/api/update`    — 重装到最新（npm latest / git 默认分支）
- `GET  /dsh-store/api/diagnose`  — dsh CLI / profile / 数据源健康检查
- `GET  /dsh-store/api/backup`    — 导出 profile 配置备份 JSON
- `GET  /dsh-store/data/plugins.json` — 数据代理（每日与线上同步）

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
