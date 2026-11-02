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
  // Flex root + absolute iframe: fills the settings section regardless of how
  // the host resolves percentage heights through its display:contents wrapper
  // (same pattern as dsh-model-full's .mf-frame-wrap).
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 'calc(100vh - 92px)',
        background: '#ffffff',
      },
    },
    React.createElement(
      'div',
      { style: { flex: 1, minHeight: 0, position: 'relative' } },
      React.createElement('iframe', {
        src: '/dsh-store/',
        title: 'DSH 插件商店',
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block',
        },
      }),
    ),
  )
}

function StoreLogo() {
  // Simple store glyph for the sidebar row; mask-free inline SVG.
  return React.createElement(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 16 16',
      'aria-hidden': 'true',
      style: { display: 'block' },
    },
    React.createElement('rect', {
      x: 1.5,
      y: 1.5,
      width: 13,
      height: 13,
      rx: 3,
      fill: 'currentColor',
      opacity: 0.9,
    }),
    React.createElement('path', {
      d: 'M5 7.5h6M5 10h4',
      stroke: '#fff',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      fill: 'none',
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
