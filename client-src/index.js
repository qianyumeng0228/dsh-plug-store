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
  // The iframe height tracks its document's content height, so the host
  // section scrollbar is the ONLY scrollbar: no scrollbar appears inside the
  // iframe (site html/body are overflow:hidden) and the store content is fully
  // browsable through the host's right-hand scrollbar (same feel as dshmarket).
  const frameRef = React.useRef(null)
  React.useEffect(() => {
    const sync = () => {
      const f = frameRef.current
      if (!f) return
      try {
        const doc = f.contentDocument
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0
        )
        const cur = parseFloat(f.style.height || '')
        if (h > 0 && (isNaN(cur) || Math.abs(h - cur) > 4)) {
          f.style.height = h + 'px'
        }
      } catch (e) {
        /* cross-origin or not loaded yet */
      }
    }
    sync()
    const timer = setInterval(sync, 500)
    return () => clearInterval(timer)
  }, [])
  const onLoad = () => {
    const f = frameRef.current
    if (!f) return
    try {
      const doc = f.contentDocument
      const h = Math.max(
        doc.documentElement.scrollHeight,
        doc.body ? doc.body.scrollHeight : 0
      )
      if (h > 0) f.style.height = h + 'px'
    } catch (e) {}
  }
  return React.createElement(
    'div',
    {
      style: {
        display: 'block',
        minHeight: 'calc(100vh - 92px)',
        background: '#ffffff',
      },
    },
    React.createElement('iframe', {
      ref: frameRef,
      src: '/dsh-store/',
      title: 'DSH 插件商店',
      onLoad,
      style: {
        width: '100%',
        height: 'calc(100vh - 92px)',
        border: '0',
        display: 'block',
      },
    }),
  )
}

function StoreLogo() {
  // Shopping bag + "+" mark, single color (inherits currentColor) so it adapts to
  // the host's light/dark sidebar. The plus is an even-odd hole in the bag body.
  return React.createElement(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 64 64',
      'aria-hidden': 'true',
      style: { display: 'block' },
    },
    React.createElement('path', {
      d: 'M27 26.5v-6a5 5 0 0 1 10 0v6',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 4.4,
      strokeLinecap: 'round',
    }),
    React.createElement('path', {
      fill: 'currentColor',
      fillRule: 'evenodd',
      d: 'M19.4 26H44.3a3.2 3.2 0 0 1 3.16 3.14L44 44.46A3.2 3.2 0 0 1 40.84 47.6H23.8a3.2 3.2 0 0 1-3.04-3.14L16.84 29.14A3.2 3.2 0 0 1 19.4 26zM29.4 31h5.2v3.9h3.9v5.2h-3.9v3.9h-5.2v-3.9h-3.9v-5.2h3.9z',
    }),
  )
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
      }, (owner = {}) => React.createElement(StoreLogo))
      return () => {
        if (typeof offRow === 'function') offRow()
        if (typeof offPanel === 'function') offPanel()
      }
    }, false)
    ctx.slots.inject('sidebar.panellist', () => sidebarGate.available())
    // Fall back to visible once the sidebar is supported even if the gate's
    // inject never fires on this host.
    setTimeout(() => sidebarGate.available(), 1500)
  } catch (error) {
    console.error('[dsh-store-market] client mount failed; store missing this session', error)
  }
}
