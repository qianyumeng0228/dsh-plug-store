/**
 * dsh-store-market — DSH 插件商店（宿主版）
 * 宿主侧插件：在 DSH 的 webServer 上挂载 /dsh-store/* 路由，
 * 用 child_process 调 `dsh plugin` 执行真实安装/卸载/更新/备份/诊断。
 *
 * 零运行时依赖；仅依赖宿主提供的 webServer 服务。
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { gzip } from 'node:zlib'

export const name = 'dsh-store-market'

export const inject = ['webServer']

const DATA_URL = 'https://qianyumeng0228.github.io/dsh-store/data/plugins.json'
const INDEX_URL = 'https://qianyumeng0228.github.io/dsh-store/index.json'

/** 宿主 data 目录：本插件安装目录内 site/data（npm 包内自带当日快照） */
function bundledDataDir() {
  return join(dirname(fileURLToPath(import.meta.url)), 'site', 'data')
}

import { fileURLToPath } from 'node:url'

/**
 * 商店页上报的布局现场：iframe 实际多高、宿主文档要不要滚。
 *
 * 「右侧两条滚动条」的判据就是 hostScrolls：宿主一旦要滚，那条是宿主的，iframe
 * 内部还有一条。这一层在渲染进程里，外面看不到，所以让商店页报回来。
 */
let layoutReport = null

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

/** 定位 dsh CLI：环境变量 > 宿主进程自身 > 常见安装目录 */
function findDshCli() {
  const candidates = []
  if (process.env.DSH_CLI) candidates.push(process.env.DSH_CLI)
  // 宿主进程自身路径推导（最可靠：spawn 我们的人就在 DeepSeek Harness 里）
  try {
    const exe = process.execPath || ''
    if (exe) {
      const base = exe.replace(/[\\/][^\\/]+$/, '')
      candidates.push(join(base, 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd'))
      candidates.push(join(base, 'resources', 'cli', 'bin', 'dsh.cmd'))
      candidates.push(join(base, '..', 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd'))
    }
  } catch { /* noop */ }
  if (process.platform === 'win32') {
    const local = join(process.env.LOCALAPPDATA || '', 'Programs', 'DeepSeek Harness', 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd')
    candidates.push(local)
    candidates.push(join(process.env.LOCALAPPDATA || '', 'Programs', 'DeepSeek Harness', 'resources', 'cli', 'bin', 'dsh.cmd'))
  } else {
    candidates.push('/usr/local/bin/dsh')
    candidates.push('/opt/deepseek-harness/bin/dsh')
  }
  return candidates.find((p) => existsSync(p)) || 'dsh'
}

/** profile 目录 */
function profileDir(profile) {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'profiles', profile)
}

/**
 * 本插件自身的安装路径 -> 宿主实际加载它的 profile。
 * 路径形如 ~/.dsh/profiles/<profile>/node_modules/dsh-store-market/index.js，
 * 桌面端里 DSH_PROFILE 是 'desktop'，早先的实现把它当无效值丢掉、硬回落 'web'，
 * 导致在桌面端装插件却写进 web profile，界面里看不到、已装列表也不对。
 */
function profileFromBundlePath() {
  try {
    const p = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/')
    const m = p.match(/\/profiles\/([^/]+)\/node_modules\//)
    return m ? m[1] : ''
  } catch {
    return ''
  }
}

function dshProfileOf(config) {
  if (config && typeof config.profile === 'string' && config.profile) return config.profile
  return profileFromBundlePath() || process.env.DSH_PROFILE || 'web'
}

/** 解析 dsh CLI 的真实调用方式：优先直接跑宿主 exe（无 shell 转义问题） */
function dshInvocation() {
  // dsh.cmd 的内容：DeepSeek Harness.exe --expose-internals <cli.js> %*
  // 我们直接内联该逻辑，避免 Windows cmd 引号/中文路径转义
  try {
    const exe = process.execPath || ''
    if (exe && /DeepSeek Harness\.exe$/i.test(exe)) {
      const base = dirname(exe)
      const entryCandidates = [
        join(base, 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js'),
        join(base, 'resources', 'app.asar.unpacked', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js'),
        join(base, 'resources', 'app', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js'),
      ]
      const entry = entryCandidates.find((p) => existsSync(p))
      if (entry) return { file: exe, args: ['--expose-internals', entry] }
    }
  } catch { /* fall through */ }
  return { file: findDshCli(), args: [] }
}

/** 执行 dsh CLI 并捕获 stdout/stderr */
function runDsh(args, opts = {}) {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let child
    const inv = dshInvocation()
    try {
      child = spawn(inv.file, [...inv.args, ...args], {
        windowsHide: true,
        cwd: opts.cwd,
        env: { ...process.env },
      })
    } catch (e) {
      resolve({ code: -1, stdout: '', stderr: String(e) })
      return
    }
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* noop */ }
    }, opts.timeout || 120000)
    child.stdout?.on('data', (d) => { stdout += d })
    child.stderr?.on('data', (d) => { stderr += d })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ code: -1, stdout, stderr: String(e) })
    })
  })
}

/**
 * 从 profile 依赖版本号里解析 owner/repo。三种真实写法都要覆盖：
 *   github:owner/repo                       —— dsh plugin add github:... 写入的形式
 *   git+https://github.com/owner/repo.git   —— 带 .git 后缀，必须去掉才能和目录里的 repo 对上
 *   https://codeload.github.com/owner/repo/tar.gz/refs/heads/branch
 * 早先只匹配 github.com 且不去 .git，导致前两种都拿不到 repo，
 * 前端按 repo 匹配 git 插件的「已装」状态于是永远不命中。
 */
const GIT_REPO_RE = /(?:github\.com[/:]|^github:)([^/#\s]+)\/([^/#?\s]+)/i

function gitRepoOf(version) {
  const m = String(version).match(GIT_REPO_RE)
  if (!m) return undefined
  return `${m[1]}/${m[2].replace(/\.git$/, '')}`
}

function readInstalled(profile) {
  const dir = profileDir(profile)
  const pkgFile = join(dir, 'package.json')
  if (!existsSync(pkgFile)) return []
  try {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    const deps = pkg.dependencies || {}
    const bundles = Array.isArray(pkg.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles : []
    return Object.entries(deps).map(([name, version]) => {
      const isBundle = bundles.includes(name)
      const repo = gitRepoOf(version)
      return {
        name,
        version: String(version),
        kind: repo ? 'git' : 'npm',
        repo,
        bundle: isBundle,
      }
    })
  } catch {
    return []
  }
}

function bundleDirOfSelf() {
  return dirname(fileURLToPath(import.meta.url))
}

const NPM_NAME_RE = /^(@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._][A-Za-z0-9._-]*$/
const GH_REPO_RE = /^[A-Za-z0-9._][A-Za-z0-9._-]*\/[A-Za-z0-9._][A-Za-z0-9._-]*$/
const LOOPBACK_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i

/**
 * 宿主根路径要 token，插件路由却是全开的：本机任意网页都能对 /dsh-store/api/install
 * 发请求，DNS rebinding 还能绕过同源检查。这里要求回环 Host + 自定义头
 * （自定义头会触发浏览器预检，跨源页面带不上），商店前端的 api 调用都带上该头。
 * 商店页面与 /data/plugins.json 是公开目录数据，不设限。
 */
function apiAllowed(req, res) {
  const host = String((req.headers && req.headers.host) || '')
  if (!LOOPBACK_RE.test(host)) {
    sendJson(res, 403, { error: 'non-loopback host' })
    return false
  }
  if (String((req.headers && req.headers['x-dsh-store']) || '') !== '1') {
    sendJson(res, 403, { error: 'missing x-dsh-store: 1 header' })
    return false
  }
  return true
}

/**
 * 把前端传来的插件标识解析成 dsh CLI 安装参数。
 * git 源必须拿到完整 owner/repo（只用仓库名末段会拼出 `github:dsh-xxx` 这种无效参数），
 * 同时拒绝以 - 开头的值，避免被 CLI 当成选项解析。合法返回 {source, arg, target}，否则 null。
 *
 * 更新场景必须带 version/ref：`pnpm add <pkg>` 对已装的包会回 "Already up to date"
 * 且退出码 0，不写版本就等于什么都没做却报成功。version/ref 走白名单字符校验，
 * 不合法直接判无效标识，绝不把用户输入原样拼进 spec。
 */
function installPlan(body) {
  const source = body && body.source === 'github' ? 'github' : 'npm'
  if (source === 'github') {
    const repo = String((body && (body.repo || body.name)) || '').trim().replace(/^github:/i, '')
    if (!GH_REPO_RE.test(repo)) return null
    const ref = String((body && body.ref) || '').trim()
    if (ref && !/^[A-Za-z0-9._/-]{1,80}$/.test(ref)) return null
    return { source, arg: ref ? `github:${repo}#${ref}` : `github:${repo}`, target: repo, ref }
  }
  const name = String((body && body.name) || '').trim()
  if (!NPM_NAME_RE.test(name)) return null
  const version = String((body && body.version) || '').trim()
  if (version && !/^(?!-)[A-Za-z0-9._+-]{1,60}$/.test(version)) return null
  return { source, arg: version ? `${name}@${version}` : name, target: name, version }
}

function localDataFiles() {
  const dir = join(bundleDirOfSelf(), 'site', 'data')
  const pluginsFile = join(dir, 'plugins.json')
  return {
    dir,
    plugins: existsSync(pluginsFile) ? pluginsFile : null,
    // 近 20MB 的快照：取体积用 stat，别为了 byteLength 把整个文件读进内存
    pluginsBytes: existsSync(pluginsFile) ? statSync(pluginsFile).size : 0,
  }
}

/** 同一份文件的压缩结果缓存（键含 mtime，快照每天换一次，只压一次）。 */
const gzipCache = new Map()

function fileEtag(st) {
  return `W/"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`
}

/**
 * 大 JSON 快照的读取路径：ETag 协商 + gzip。
 *
 * 未压缩时这个文件近 20MB，浏览器每次打开商店都要重下一遍再 parse；gzip 后约
 * 3.6MB，而命中 ETag 时只回 304。压缩走 zlib 的异步接口，不占宿主事件循环。
 */
async function serveSnapshot(req, res, file, contentType) {
  let st
  try {
    st = statSync(file)
  } catch (e) {
    sendJson(res, 404, { error: 'data file unavailable' })
    return
  }
  const etag = fileEtag(st)
  if (String(req.headers['if-none-match'] || '').includes(etag)) {
    res.writeHead(304, { etag, 'cache-control': 'no-cache' })
    res.end()
    return
  }
  const acceptsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))
  const base = { etag, 'cache-control': 'no-cache', 'content-type': contentType, vary: 'Accept-Encoding' }
  if (!acceptsGzip) {
    const body = readFileSync(file)
    res.writeHead(200, { ...base, 'content-length': String(body.byteLength) })
    res.end(body)
    return
  }
  const key = `${file}|${etag}`
  let zipped = gzipCache.get(key)
  if (!zipped) {
    zipped = await new Promise((resolve, reject) => {
      gzip(readFileSync(file), { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)))
    }).catch((e) => {
      console.warn('[dsh-store-market] gzip failed, serving raw', e)
      return null
    })
    if (zipped) {
      // 只留最新一份，避免旧快照的压缩结果常驻
      gzipCache.clear()
      gzipCache.set(key, zipped)
    }
  }
  if (!zipped) {
    const body = readFileSync(file)
    res.writeHead(200, { ...base, 'content-length': String(body.byteLength) })
    res.end(body)
    return
  }
  res.writeHead(200, { ...base, 'content-encoding': 'gzip', 'content-length': String(zipped.byteLength) })
  res.end(zipped)
}

/** 商店 UI 页面（site/index.html） */
function uiPagePath() {
  const p = join(bundleDirOfSelf(), 'site', 'index.html')
  return existsSync(p) ? p : null
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, method: 'HEAD' })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, status: null, error: String(e?.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

export function apply(ctx, config = {}) {
  ctx.inject(['webServer'], (hostCtx) => {
    const server = hostCtx.webServer
    const profile = dshProfileOf(config)
    const disposers = []

    const route = (method, path, handler) => {
      const isApi = path.startsWith('/dsh-store/api/')
      disposers.push(server.register({
        kind: 'exact',
        path,
        handler: (request, response) => {
          if (isApi && !apiAllowed(request, response)) return
          if (request.method !== method) {
            response.writeHead(405, { allow: method })
            response.end()
            return
          }
          return handler(request, response)
        },
      }))
    }

    // ── 商店 UI 页面 ──
    const serveUi = (req, res) => {
      const page = uiPagePath()
      if (!page) {
        sendText(res, 404, 'ui not found')
        return
      }
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        // 页面与 api 必须同版本：0.1.2 起 api 要求自定义头，
        // 浏览器若拿旧缓存的页面会全量 403，故不缓存。
        'cache-control': 'no-store',
      })
      res.end(readFileSync(page))
    }
    route('GET', '/dsh-store/', serveUi)
    route('GET', '/dsh-store', serveUi)
    route('GET', '/dsh-store/index.html', serveUi)

    route('GET', '/dsh-store/api/capabilities', (req, res) => {
      const local = localDataFiles()
      sendJson(res, 200, {
        name: 'dsh-store-market',
        version: '0.1.18',
        profile,
        capabilities: ['installed', 'install', 'uninstall', 'update', 'diagnose', 'backup', 'proxy-data'],
        data: {
          bundled: local.plugins !== null,
          bundledBytes: local.pluginsBytes,
        },
      })
    })

    route('GET', '/dsh-store/api/installed', (req, res) => {
      try {
        const entries = readInstalled(profile)
        // installed 给名字数组（前端按名字判断已装），installedDetails 保留来源信息
        sendJson(res, 200, {
          profile,
          installed: entries.map((e) => e.name),
          installedDetails: entries,
        })
      } catch (e) {
        sendJson(res, 500, { error: String(e?.message || e) })
      }
    })

    route('POST', '/dsh-store/api/install', async (req, res) => {
      let body
      try {
        body = await readBody(req)
      } catch {
        sendJson(res, 400, { error: 'invalid JSON body' })
        return
      }
      const plan = installPlan(body)
      if (!plan) {
        sendJson(res, 400, { error: 'invalid plugin identifier', hint: 'npm 源要包名，github 源要 owner/repo' })
        return
      }
      const result = await runDsh(['plugin', '--profile', profile, 'add', plan.arg], { timeout: 300000 })
      sendJson(res, result.code === 0 ? 200 : 500, {
        source: plan.source,
        target: plan.arg,
        ok: result.code === 0,
        code: result.code,
        output: (result.stdout + result.stderr).slice(-8000),
        note: result.code === 0 ? '已安装，重启 DSH（或重载 profile）后生效' : '安装失败，详见 output',
      })
    })

    route('POST', '/dsh-store/api/uninstall', async (req, res) => {
      let body
      try {
        body = await readBody(req)
      } catch {
        sendJson(res, 400, { error: 'invalid JSON body' })
        return
      }
      const name = String(body.name || '').trim()
      if (!name || !NPM_NAME_RE.test(name)) {
        sendJson(res, 400, { error: 'missing or invalid name' })
        return
      }
      const result = await runDsh(['plugin', '--profile', profile, 'remove', name], { timeout: 300000 })
      sendJson(res, result.code === 0 ? 200 : 500, {
        name,
        ok: result.code === 0,
        code: result.code,
        output: (result.stdout + result.stderr).slice(-8000),
        note: result.code === 0 ? '已卸载' : '卸载失败，详见 output',
      })
    })

    route('POST', '/dsh-store/api/update', async (req, res) => {
      let body
      try {
        body = await readBody(req)
      } catch {
        sendJson(res, 400, { error: 'invalid JSON body' })
        return
      }
      const plan = installPlan(body)
      if (!plan) {
        sendJson(res, 400, { error: 'invalid plugin identifier', hint: 'npm 源要包名（可带 version），github 源要 owner/repo（可带 ref）' })
        return
      }
      // 更新是否真的发生，只能回读 package.json 里的依赖版本：pnpm 判定"已是最新"时
      // 退出码同样是 0，光看退出码就会把空转报成成功（这正是"更新没反应"的由来）。
      const depVersion = (list) => {
        const repo = plan.source === 'github' ? plan.target.toLowerCase() : ''
        const e = list.find((x) => x.name === plan.target ||
          (repo && x.repo && String(x.repo).toLowerCase() === repo))
        return e ? String(e.version) : ''
      }
      const from = depVersion(readInstalled(profile))
      const result = await runDsh(['plugin', '--profile', profile, 'add', plan.arg], { timeout: 300000 })
      const to = depVersion(readInstalled(profile))
      const changed = !!to && to !== from
      const code = result.code
      sendJson(res, code === 0 ? 200 : 500, {
        name: plan.target,
        source: plan.source,
        target: plan.arg,
        ok: code === 0,
        code,
        from,
        to,
        changed,
        output: (result.stdout + result.stderr).slice(-8000),
        note: code !== 0
          ? '更新失败，详见 output'
          : changed
            ? `已更新 ${from || '（原先未装）'} → ${to}，重启后生效`
            : `版本未变化（本机 ${from || '未知'}），pnpm 判定已是最新；若确需升级请核对目录里的目标版本`,
      })
    })

    route('GET', '/dsh-store/api/diagnose', async (req, res) => {
      const cli = findDshCli()
      const dir = profileDir(profile)
      const checks = {
        cli: existsSync(cli) ? 'ok' : 'missing',
        cliPath: cli,
        profileDir: existsSync(dir) ? 'ok' : 'missing',
        profileDirPath: dir,
        data: localDataFiles(),
      }
      const versionRun = existsSync(cli) ? await runDsh(['--version'], { timeout: 15000 }) : null
      checks.cliVersion = versionRun && versionRun.code === 0 ? versionRun.stdout.trim().slice(0, 120) : null
      // 数据源探测：HEAD 主页（KB 级，避免 9MB 索引全量下载）
      const home = await fetchJson('https://qianyumeng0228.github.io/dsh-store/', 10000)
      checks.remote = {
        ok: home.ok,
        status: home.status || null,
        note: home.ok ? 'store reachable' : String(home.error || 'unreachable'),
      }
      checks.layout = layoutReport
      sendJson(res, 200, checks)
    })

    // 布局自检上报。发起方是 iframe 内的商店页而不是宿主文档：宿主文档的 origin
    // 是 dsh-app://app/，在那边用相对地址请求会被接口守卫（要求回环 Host）拒掉，
    // 上报会静默失败；商店页对 /dsh-store/api/* 的请求是通的，而且与宿主同源，
    // 能直接量到宿主要不要滚 —— 那才是「第二条滚动条」的判据。
    route('POST', '/dsh-store/api/layout', async (req, res) => {
      let body
      try {
        body = await readBody(req)
      } catch (e) {
        sendJson(res, 400, { error: 'bad json' })
        return
      }
      const num = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : null)
      const chain = Array.isArray(body && body.chain)
        ? body.chain.slice(0, 12).map((c) => ({
            tag: String(c && c.tag || '').slice(0, 20),
            cls: String(c && c.cls || '').slice(0, 48),
            ch: num(c && c.ch), sh: num(c && c.sh),
            cw: num(c && c.cw), sw: num(c && c.sw),
            oy: String(c && c.oy || '').slice(0, 20),
            ox: String(c && c.ox || '').slice(0, 20),
          }))
        : null
      layoutReport = {
        at: new Date().toISOString(),
        iframeH: num(body && body.selfH),
        iframeW: num(body && body.selfW),
        parentH: num(body && body.parentH),
        parentW: num(body && body.parentW),
        parentScrollH: num(body && body.parentScrollH),
        parentScrollW: num(body && body.parentScrollW),
        hostScrolls: !!(body && body.hostScrolls),
        chain: chain,
      }
      sendJson(res, 200, { ok: true })
    })

    route('GET', '/dsh-store/api/backup', (req, res) => {
      const dir = profileDir(profile)
      const files = ['package.json', 'cordis.yml', 'cordis.patch.yml', 'pnpm-workspace.yaml']
      const payload = { profile, exportedAt: new Date().toISOString(), files: {} }
      for (const f of files) {
        const p = join(dir, f)
        if (existsSync(p)) {
          payload.files[f] = readFileSync(p, 'utf8')
        }
      }
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="dsh-profile-${profile}-backup.json"`,
      })
      res.end(JSON.stringify(payload))
    })

    route('GET', '/dsh-store/data/plugins.json', async (req, res) => {
      const local = localDataFiles()
      if (local.plugins) {
        await serveSnapshot(req, res, local.plugins, 'application/json; charset=utf-8')
        return
      }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const remote = await fetch(DATA_URL, { signal: controller.signal })
        if (!remote.ok) throw new Error(`HTTP ${remote.status}`)
        const body = Buffer.from(await remote.arrayBuffer())
        const base = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache', vary: 'Accept-Encoding' }
        if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
          const zipped = await new Promise((resolve, reject) =>
            gzip(body, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)))
          ).catch(() => null)
          if (zipped) {
            res.writeHead(200, { ...base, 'content-encoding': 'gzip', 'content-length': String(zipped.byteLength) })
            res.end(zipped)
            return
          }
        }
        res.writeHead(200, { ...base, 'content-length': String(body.byteLength) })
        res.end(body)
      } catch (e) {
        sendJson(res, 502, { error: 'no bundled data and remote fetch failed', detail: String(e?.message || e) })
      } finally {
        clearTimeout(timer)
      }
    })

    return () => {
      for (const dispose of disposers) dispose()
    }
  })
}
