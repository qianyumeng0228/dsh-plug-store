/**
 * dsh-store-market — DSH 插件商店（宿主版）
 * 宿主侧插件：在 DSH 的 webServer 上挂载 /dsh-store/* 路由，
 * 用 child_process 调 `dsh plugin` 执行真实安装/卸载/更新/备份/诊断。
 *
 * 零运行时依赖；仅依赖宿主提供的 webServer 服务。
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

export const name = 'dsh-store-market'

export const inject = ['webServer']

const DATA_URL = 'https://qianyumeng0228.github.io/dsh-store/data/plugins.json'
const INDEX_URL = 'https://qianyumeng0228.github.io/dsh-store/index.json'

/** 宿主 data 目录：本插件安装目录内 site/data（npm 包内自带当日快照） */
function bundledDataDir() {
  return join(dirname(fileURLToPath(import.meta.url)), 'site', 'data')
}

import { fileURLToPath } from 'node:url'

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

function dshProfileOf(config, ctx) {
  if (config && typeof config.profile === 'string' && config.profile) return config.profile
  const env = process.env.DSH_PROFILE
  if (env && env !== 'desktop') return env
  return 'web'
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
      const isGit = /^(github:|git\+|https:\/\/github)/i.test(String(version))
      const gitMatch = String(version).match(/github\.com[/:]([^/#]+)\/([^/#]+)/i)
      return {
        name,
        version: String(version),
        kind: isGit ? 'git' : 'npm',
        repo: gitMatch ? `${gitMatch[1]}/${gitMatch[2]}` : undefined,
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

/**
 * 把前端传来的插件标识解析成 dsh CLI 安装参数。
 * git 源必须拿到完整 owner/repo（只用仓库名末段会拼出 `github:dsh-xxx` 这种无效参数），
 * 同时拒绝以 - 开头的值，避免被 CLI 当成选项解析。合法返回 {source, arg, target}，否则 null。
 */
function installPlan(body) {
  const source = body && body.source === 'github' ? 'github' : 'npm'
  if (source === 'github') {
    const repo = String((body && (body.repo || body.name)) || '').trim().replace(/^github:/i, '')
    return GH_REPO_RE.test(repo) ? { source, arg: `github:${repo}`, target: repo } : null
  }
  const name = String((body && body.name) || '').trim()
  return NPM_NAME_RE.test(name) ? { source, arg: name, target: name } : null
}

function localDataFiles() {
  const dir = join(bundleDirOfSelf(), 'site', 'data')
  const pluginsFile = join(dir, 'plugins.json')
  return {
    dir,
    plugins: existsSync(pluginsFile) ? pluginsFile : null,
    pluginsBytes: existsSync(pluginsFile) ? readFileSync(pluginsFile).byteLength : 0,
  }
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
    const profile = dshProfileOf(config, hostCtx)
    const disposers = []

    const route = (method, path, handler) => {
      disposers.push(server.register({
        kind: 'exact',
        path,
        handler: (request, response) => {
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
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(readFileSync(page))
    }
    route('GET', '/dsh-store/', serveUi)
    route('GET', '/dsh-store', serveUi)
    route('GET', '/dsh-store/index.html', serveUi)

    route('GET', '/dsh-store/api/capabilities', (req, res) => {
      const local = localDataFiles()
      sendJson(res, 200, {
        name: 'dsh-store-market',
        version: '0.1.1',
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
        sendJson(res, 400, { error: 'invalid plugin identifier', hint: 'npm 源要包名，github 源要 owner/repo' })
        return
      }
      const result = await runDsh(['plugin', '--profile', profile, 'add', plan.arg], { timeout: 300000 })
      sendJson(res, result.code === 0 ? 200 : 500, {
        name: plan.target,
        source: plan.source,
        target: plan.arg,
        ok: result.code === 0,
        code: result.code,
        output: (result.stdout + result.stderr).slice(-8000),
        note: result.code === 0 ? '已更新到最新，重启后生效' : '更新失败，详见 output',
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
      sendJson(res, 200, checks)
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
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' })
        res.end(readFileSync(local.plugins))
        return
      }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const remote = await fetch(DATA_URL, { signal: controller.signal })
        if (!remote.ok) throw new Error(`HTTP ${remote.status}`)
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' })
        res.end(await remote.text())
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
