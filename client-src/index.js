/**
 * dsh-store-market client bundle
 * Registers a "插件商店" settings section, a Plugins-page tab, and a
 * left-sidebar row + main panel (the dshmarket-style entry the user asked
 * for) that embeds the host-served store UI at /dsh-store/ in an iframe.
 *
 * Slot registration follows dshmarket's proven pattern: a slot may be
 * declared by the host only after apply() runs, and `slots.register` on an
 * undeclared slot throws ("a parent entry's children table must declare it").
 * So every seat is gated: we `slots.inject(name, cb)` first, and the callback
 * performs the actual register once the host declares/refreshes the slot.
 * A disposer guards against duplicate registers on repeated callbacks.
 *
 * Built with esbuild; React is bundled in (no host React dependency).
 */

import React from 'react'

export const name = 'dsh-store-market'
export const inject = ['slots', 'locale']

const NS = 'dsh-store-market'
const SIDEBAR_PANEL_ID = 'dsh-store-market'

function StoreFrame() {
  // The iframe is a viewport that scrolls itself. It must NOT be resized to its
  // content height: inside the frame, `position: fixed` resolves against the
  // iframe viewport, so a stretched frame makes the detail modal, the queue dock
  // and the toast position themselves against the whole document — the modal
  // lands thousands of pixels below what the user is looking at.
  //
  // The height has to be the container's, not `100vh`. `100vh` in the host
  // document is the whole window, which is taller than the dialog's content box,
  // so the host scrolled AND the frame scrolled — two scrollbars side by side.
  // Fit the parent instead, and fall back to vh only if the ancestor chain
  // gives us no resolvable height (clientHeight collapses).
  const wrapRef = React.useRef(null)
  const [height, setHeight] = React.useState('100%')
  React.useEffect(() => {
    const measure = () => {
      const el = wrapRef.current
      if (!el) return
      const parent = el.parentElement
      const avail = parent ? parent.clientHeight : 0
      setHeight(avail > 160 ? '100%' : 'calc(100vh - 92px)')
    }
    measure()
    window.addEventListener('resize', measure)
    // 宿主可能在我们挂载之后才把内容区撑开，所以跟着容器尺寸重新判定；
    // 这里只在 '100%' 与 vh 兜底之间切换，不会反过来改变容器高度，不构成回环。
    let ro = null
    if (typeof ResizeObserver !== 'undefined' && wrapRef.current?.parentElement) {
      ro = new ResizeObserver(measure)
      ro.observe(wrapRef.current.parentElement)
    }
    return () => {
      window.removeEventListener('resize', measure)
      if (ro) ro.disconnect()
    }
  }, [])
  return React.createElement(
    'div',
    {
      ref: wrapRef,
      style: {
        display: 'block',
        height,
        // hidden, not auto: the frame owns the single scrollbar; a second one
        // here is exactly what the user is reporting.
        overflow: 'hidden',
        background: '#ffffff',
      },
    },
    React.createElement('iframe', {
      src: '/dsh-store/',
      title: 'DSH 插件商店',
      style: { width: '100%', height: '100%', border: '0', display: 'block' },
    }),
  )
}

// One storefront geometry, shared by the sidebar row and the settings-nav row so
// the two can never drift apart. Outlined arched canopy with a striped hem over a
// shop body and door — the same grammar as the 插件市场 row the user pointed at.
// Stroke 1.9 on a 24 grid is the point where the walls stay solid ink at 18px and
// the door still reads at 16px; translate(0 -0.25) puts the ink dead centre
// (measured 0.00 / 0.00 at both 16px and 18px).
const STORE_VB = '0 0 24 24'
const STORE_SW = '1.9'
const STORE_SHIFT = 'translate(0 -0.25)'
const STORE_PATHS = [
  'M3.2 9.2V7.1C3.2 5.3 4.6 4 6.3 4h11.4C19.4 4 20.8 5.3 20.8 7.1v2.1',
  'M3.2 9.2h17.6',
  'M8.8 4.2v5M15.2 4.2v5',
  'M5.4 9.2v10.2a1.1 1.1 0 0 0 1.1 1.1h11a1.1 1.1 0 0 0 1.1-1.1V9.2',
  'M9.6 20.5v-4.7a1.1 1.1 0 0 1 1.1-1.1h2.6a1.1 1.1 0 0 1 1.1 1.1v4.7',
]

// The host asks for 16px in the expanded sidebar and 18px when collapsed
// (SidebarRoot passes `size: wide ? 16 : 18`), so the glyph must take the size.
function StoreLogo({ size = 16 }) {
  return React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: STORE_VB,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: STORE_SW,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      style: { display: 'block' },
    },
    React.createElement(
      'g',
      { transform: STORE_SHIFT },
      STORE_PATHS.map((d, i) => React.createElement('path', { key: i, d })),
    ),
  )
}

const NAV_ICON_FLAG = 'data-dsh-store-nav-icon'

// 宿主设置页那一行的元素类型不在任何公开契约里，而且不同宿主外壳会给不同
// class（navCell / navItem / navRow）。只押 `nav button` 一种，猜错就整个
// 功能静默失效 —— 这正是 0.1.6~0.1.10 在真实宿主里没生效的原因。
const NAV_ROW_SELECTORS = [
  '[role="dialog"] nav button',
  'nav button',
  '[class*="navCell"]',
  '[class*="navItem"]',
  '[class*="navRow"]',
  '[role="dialog"] nav [role="button"]',
  'button',
]

function normalizeText(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
}

/** 行里真正显示标签的那段文本：优先取最后一个 span，避开尾部的计数/徽标。 */
function navRowLabel(el) {
  const spans = el.querySelectorAll('span')
  for (let i = spans.length - 1; i >= 0; i--) {
    const t = normalizeText(spans[i].textContent)
    if (t) return t
  }
  return normalizeText(el.textContent)
}

/** 标签后面只跟了计数/括号之类时，仍算同一行。 */
function labelMatches(rowText, wanted) {
  if (rowText === wanted) return true
  if (!rowText.startsWith(wanted)) return false
  return /^[\d\s()（）·|/.]*$/.test(rowText.slice(wanted.length))
}

function findOwnNavRow(label) {
  if (!label) return null
  for (const sel of NAV_ROW_SELECTORS) {
    let list
    try {
      list = document.querySelectorAll(sel)
    } catch (e) {
      continue
    }
    for (const el of list) {
      if (labelMatches(navRowLabel(el), label)) return el
      if (labelMatches(normalizeText(el.textContent), label)) return el
    }
  }
  return null
}

/** 行里根本没有 svg 时（回退符号可能是 i/img/背景图），自己插一个进去。 */
function buildStorefrontSvg(size) {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('data-dsh-store-inserted', '1')
  svg.style.flex = 'none'
  paintStorefront(svg)
  return svg
}

/** Draw the storefront into the shell's fallback svg, keeping its size and ink. */
function paintStorefront(svg) {
  const NS = 'http://www.w3.org/2000/svg'
  svg.setAttribute('viewBox', STORE_VB)
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', STORE_SW)
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  const g = document.createElementNS(NS, 'g')
  g.setAttribute('transform', STORE_SHIFT)
  for (const d of STORE_PATHS) {
    const p = document.createElementNS(NS, 'path')
    p.setAttribute('d', d)
    g.appendChild(p)
  }
  svg.appendChild(g)
}

/**
 * Give our row in the settings navigation a storefront.
 *
 * Rewriting the fallback svg in place rather than hiding it and drawing a CSS
 * `::before` mask: the mask route depends on the row being a flex box, on nothing
 * else claiming `::before`, and on mask-image support — any one of those failing
 * silently leaves the shell's glyph. The svg is already sized and coloured by the
 * shell, so editing it inherits both, light and dark themes included.
 *
 * Scope stays narrow: only the row whose text equals our current label is
 * touched, and the flag plus a re-check on every mutation keep a locale switch or
 * a shell re-render from leaving the label and the glyph disagreeing.
 */
/**
 * 把一行的构成写清楚。
 *
 * 上一版上报的是「插入之后」的 innerHTML 前 240 字，结果那 240 字全被我们自己
 * 插进去的 svg 占满了，宿主的符号到底画在哪儿一点没看见 —— 上报要是有用，
 * 就得先看清敌人长什么样。这里改成结构化的 children + 行自身的 ::before。
 */
function describeNavRow(el) {
  if (!el) return null
  const kids = []
  for (const kid of el.children) {
    let cs
    try { cs = getComputedStyle(kid) } catch (e) { continue }
    kids.push({
      tag: String(kid.tagName).toLowerCase(),
      cls: String(kid.getAttribute('class') || '').slice(0, 60),
      text: normalizeText(kid.textContent).slice(0, 24),
      display: cs.display,
      bg: cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 70) : null,
      mask: (cs.maskImage || cs.webkitMaskImage || 'none') !== 'none' ? 'yes' : null,
    })
  }
  let before = null
  try {
    const bs = getComputedStyle(el, '::before')
    before = {
      content: bs.content === 'none' ? null : String(bs.content).slice(0, 24),
      bg: bs.backgroundImage && bs.backgroundImage !== 'none' ? bs.backgroundImage.slice(0, 70) : null,
      mask: (bs.maskImage || bs.webkitMaskImage || 'none') !== 'none' ? 'yes' : null,
      w: bs.width, h: bs.height,
    }
  } catch (e) { /* ignore */ }
  return { tag: String(el.tagName).toLowerCase(), cls: String(el.className || '').slice(0, 60), kids, before }
}

/** 邻行（宿主自己或别的插件的行）长什么样，是判断「图标该怎么给」的最好参照。 */
function findRowByLabel(label) {
  for (const sel of NAV_ROW_SELECTORS) {
    let list
    try { list = document.querySelectorAll(sel) } catch (e) { continue }
    if (!list.length) continue
    for (const el of list) {
      if (labelMatches(navRowLabel(el), label) || labelMatches(normalizeText(el.textContent), label)) return el
    }
  }
  return null
}

function installSettingsNavIcon(ctx, resolveLabel) {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    let disposed = false
    let scheduled = false
    let lastReport = ''
    // 宿主的符号可能画在行自己的 ::before 上，藏子元素没用；只能给它让位。
    // 规则只作用于我们打过标记的行，不碰别的行。
    const styleTag = document.createElement('style')
    styleTag.dataset.plugin = 'dsh-store-market'
    styleTag.textContent =
      '[data-dsh-store-hide-before]::before{content:none!important;display:none!important;width:0!important;height:0!important;background-image:none!important;-webkit-mask-image:none!important;mask-image:none!important}'
    document.head.appendChild(styleTag)
    const report = (snapshot) => {
      const json = JSON.stringify(snapshot)
      if (json === lastReport) return
      lastReport = json
      // 只在「没走通」的上报：正常改写那条路径不调用这里。
      fetch('/dsh-store/api/navicon', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-dsh-store': '1' },
        body: json,
      }).catch(() => {})
    }
    const sync = () => {
      scheduled = false
      if (disposed) return
      let wanted = ''
      try {
        wanted = normalizeText(resolveLabel())
      } catch (e) {
        wanted = ''
      }
      const scopes = {}
      for (const sel of NAV_ROW_SELECTORS) {
        try {
          scopes[sel] = document.querySelectorAll(sel).length
        } catch (e) {
          scopes[sel] = -1
        }
      }
      const row = wanted ? findOwnNavRow(wanted) : null
      // 上一轮被标记的行可能已经不属于我们了（改名、语言切换）
      for (const stale of document.querySelectorAll('[' + NAV_ICON_FLAG + ']')) {
        if (stale === row) continue
        stale.removeAttribute(NAV_ICON_FLAG)
        stale.removeAttribute('data-dsh-store-hide-before')
        const inserted = stale.querySelector('svg[data-dsh-store-inserted]')
        if (inserted) stale.removeChild(inserted)
        else {
          const svg = stale.querySelector('svg')
          if (svg) svg.removeAttribute('stroke-width')
        }
        for (const hidden of stale.querySelectorAll('[data-dsh-store-hidden]')) {
          hidden.style.display = ''
          hidden.removeAttribute('data-dsh-store-hidden')
        }
      }
      const svg = row ? row.querySelector('svg') : null
      if (row && !svg) {
        // 先记下插入之前的样子，否则上报里全是自己的节点，看不到宿主的符号
        const desc = describeNavRow(row)
        // 插件市场 那一行是现成的参照：它显示正常，照它抄就知道图标该怎么给
        const marketDesc = describeNavRow(findRowByLabel('插件市场'))
        const glyphIsBefore = !!(desc && desc.before && (desc.before.bg || desc.before.mask))
        if (!row.querySelector('svg[data-dsh-store-inserted]')) {
          for (const kid of row.children) {
            if (String(kid.tagName).toLowerCase() === 'svg') continue
            if (normalizeText(kid.textContent) === '') {
              kid.setAttribute('data-dsh-store-hidden', '1')
              kid.style.display = 'none'
              break
            }
          }
          // 宿主的符号画在行自己的 ::before 上时，藏子元素没用，得给它让位
          if (glyphIsBefore) row.setAttribute('data-dsh-store-hide-before', '1')
          row.insertBefore(buildStorefrontSvg(16), row.firstChild)
          row.setAttribute(NAV_ICON_FLAG, 'store')
        }
        report({ label: wanted, scopes, matched: true, hasSvg: false, inserted: true,
          glyphIsBefore: !!glyphIsBefore, desc: desc, marketDesc: marketDesc })
        return
      }
      if (row && svg) {
        if (row.getAttribute(NAV_ICON_FLAG) !== 'store') {
          row.setAttribute(NAV_ICON_FLAG, 'store')
          paintStorefront(svg)
        }
        return
      }
      // 一行都没找到：把看到的文本都带回去，才能判断是选择器不对还是标签不对
      const texts = []
      try {
        for (const sel of NAV_ROW_SELECTORS) {
          const list = document.querySelectorAll(sel)
          if (!list.length) continue
          for (const b of list) texts.push(navRowLabel(b) || normalizeText(b.textContent))
          break
        }
      } catch (e) { /* ignore */ }
      report({ label: wanted, scopes, matched: false, hasSvg: false, rows: texts.slice(0, 40) })
    }
    const schedule = () => {
      if (scheduled || disposed) return
      scheduled = true
      queueMicrotask(sync)
    }
    sync()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    // 兜底：对话框是懒挂载的，某些宿主不会为它改动 body 子树；低频重扫一次的成本
    // 只是几次字符串比较。
    const timer = setInterval(schedule, 1200)
    return () => {
      disposed = true
      observer.disconnect()
      clearInterval(timer)
      for (const row of document.querySelectorAll('[' + NAV_ICON_FLAG + ']')) {
        row.removeAttribute(NAV_ICON_FLAG)
        row.removeAttribute('data-dsh-store-hide-before')
        const inserted = row.querySelector('svg[data-dsh-store-inserted]')
        if (inserted) row.removeChild(inserted)
        for (const hidden of row.querySelectorAll('[data-dsh-store-hidden]')) {
          hidden.style.display = ''
          hidden.removeAttribute('data-dsh-store-hidden')
        }
      }
      styleTag.remove()
    }
  }, 'dsh-store-market: settings nav icon')
}

/**
 * Copy of dshmarket's section gate: defers the actual register until the
 * slot is declared, and never double-registers.
 */
function createSectionGate(register, initiallyVisible = true) {
  let ready = false
  let wanted = initiallyVisible
  let removed = false
  let dispose = null
  const apply = () => {
    if (!ready) return
    const shouldShow = wanted && !removed
    if (shouldShow && dispose === null) {
      try {
        dispose = register()
      } catch (error) {
        console.warn('[dsh-store-market] slot register failed', error)
      }
      return
    }
    if (!shouldShow && dispose !== null) {
      const stop = dispose
      dispose = null
      stop()
    }
  }
  return {
    available: () => {
      ready = true
      apply()
    },
    setVisible: (visible) => {
      wanted = visible
      apply()
    },
    visible: () => dispose !== null,
    retire: () => {
      removed = true
      apply()
    },
  }
}

export function apply(ctx) {
  try {
    ctx.effect(() => ctx.locale.register(NS, {
      zh: { nav: '插件商店', desc: 'DSH 插件商店 — 浏览并安装社区插件' },
      en: { nav: 'Plugin Store', desc: 'DSH Plugin Store — browse and install community plugins' },
    }), 'dsh-store-market: dictionaries')
    const t = ctx.locale.bind(NS)

    installSettingsNavIcon(ctx, () => t('nav'))

    const frame = () => React.createElement(StoreFrame)

    // Settings dialog sidebar entry.
    const sectionGate = createSectionGate(() => {
      const off = ctx.slots.register({
        name: 'settings.section',
        id: NS,
        order: 41,
        label: () => t('nav'),
        locale: NS,
        inject: () => ({ t }),
      }, frame)
      return typeof off === 'function' ? off : () => {}
    })
    ctx.slots.inject('settings.section', () => sectionGate.available())

    // Plugins-page tab (dshmarket registers the same name).
    const tabGate = createSectionGate(() => {
      const off = ctx.slots.register({
        name: 'settings.plugins.tab',
        id: NS,
        order: 60,
        label: () => t('nav'),
        locale: NS,
        inject: () => ({ t }),
      }, frame)
      return typeof off === 'function' ? off : () => {}
    })
    ctx.slots.inject('settings.plugins.tab', () => tabGate.available())

    // Left sidebar row + main panel (dshmarket-style entry).
    //
    // Visible by default: the gate below only ever *readies* the seat, and a row
    // that needs an explicit setVisible(true) nobody calls meant this entry never
    // existed at all — the store was reachable from the settings dialog only.
    const sidebarGate = createSectionGate(() => {
      const offPanel = ctx.slots.register({
        name: 'main',
        key: SIDEBAR_PANEL_ID,
        locale: NS,
        inject: () => ({ t }),
      }, () => React.createElement('div', { style: { width: '100%', height: '100%', background: '#ffffff' } }, frame()))
      const offRow = ctx.slots.register({
        name: 'sidebar.panellist',
        id: SIDEBAR_PANEL_ID,
        order: 1,
        label: () => t('nav'),
        locale: NS,
      }, (owner = {}) => React.createElement(StoreLogo, { size: owner.size ?? 16 }))
      return () => {
        if (typeof offRow === 'function') offRow()
        if (typeof offPanel === 'function') offPanel()
      }
    }, true)
    ctx.slots.inject('sidebar.panellist', () => sidebarGate.available())
    // Fall back to visible once the sidebar is supported even if the gate's
    // inject never fires on this host.
    setTimeout(() => sidebarGate.available(), 1500)
  } catch (error) {
    console.error('[dsh-store-market] client mount failed; store missing this session', error)
  }
}
