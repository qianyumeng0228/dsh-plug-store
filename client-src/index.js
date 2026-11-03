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

function normalizeText(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
}

/**
 * Find our own row in the settings navigation.
 *
 * `settings.section` projects only `id` / `order` / `label`, so the shell paints
 * its own fallback glyph for every third-party section — that cube is not our
 * icon, it is the shell's. The only handle we have on "which row is ours" is the
 * visible label, so we claim the row by text.
 *
 * Three scopes instead of one because the desktop shell groups sections under
 * headings and the exact ancestor chain is not part of any published contract:
 * the documented `[role=dialog] nav button` first, then any `nav button`, then
 * any button whose text is our label. All three miss only if the label we resolve
 * disagrees with what is on screen.
 */
function findOwnNavRow(label) {
  if (!label) return null
  for (const sel of ['[role="dialog"] nav button', 'nav button', 'button']) {
    const hit = Array.from(document.querySelectorAll(sel)).find(
      (b) => normalizeText(b.textContent) === label,
    )
    if (hit) return hit
  }
  return null
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
function installSettingsNavIcon(ctx, resolveLabel) {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    let disposed = false
    let scheduled = false
    const sync = () => {
      scheduled = false
      if (disposed) return
      let wanted = ''
      try {
        wanted = normalizeText(resolveLabel())
      } catch (e) {
        wanted = ''
      }
      const row = wanted ? findOwnNavRow(wanted) : null
      // 别的行可能带着上一次的标记（改名、语言切换），一并摘掉
      for (const stale of document.querySelectorAll('[' + NAV_ICON_FLAG + ']')) {
        if (stale !== row) {
          stale.removeAttribute(NAV_ICON_FLAG)
          const svg = stale.querySelector('svg')
          if (svg) svg.removeAttribute('stroke-width')
        }
      }
      if (!row) return
      const svg = row.querySelector('svg')
      if (!svg) return
      if (row.getAttribute(NAV_ICON_FLAG) !== 'store') {
        row.setAttribute(NAV_ICON_FLAG, 'store')
        paintStorefront(svg)
      }
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
      for (const row of document.querySelectorAll('[' + NAV_ICON_FLAG + ']')) row.removeAttribute(NAV_ICON_FLAG)
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
