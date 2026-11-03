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

// The host asks for 16px in the expanded sidebar and 18px when collapsed
// (SidebarRoot passes `size: wide ? 16 : 18`), so the glyph must take the size.
function StoreLogo({ size = 16 }) {
  // Storefront: solid awning + walls + door. The neighbour row (插件市场) is an
  // outlined awning with stripes, so a filled canopy keeps the two rows
  // distinguishable while both read as "shop". Stroke weight 2.2 on a 24 grid is
  // the point where the walls stay solid ink at 18px without clogging the door
  // at 16px.
  return React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2.2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      style: { display: 'block' },
    },
    React.createElement('path', {
      d: 'M2.6 9.2L4.55 4.5A1.6 1.6 0 0 1 6.04 3.5h11.92a1.6 1.6 0 0 1 1.49 1L21.4 9.2Z',
      fill: 'currentColor',
      stroke: 'none',
    }),
    React.createElement('path', {
      d: 'M5.3 9.2v10.2a1.2 1.2 0 0 0 1.2 1.2h11a1.2 1.2 0 0 0 1.2-1.2V9.2',
    }),
    React.createElement('path', {
      d: 'M9.4 20.6v-5.2a1.1 1.1 0 0 1 1.1-1.1h3a1.1 1.1 0 0 1 1.1 1.1v5.2',
    }),
  )
}

/**
 * The storefront as a standalone SVG for a CSS `mask-image`.
 *
 * Painted pure black: a mask reads alpha only, and the visible colour comes from
 * the element's `background-color: currentColor`, so the glyph follows whatever
 * ink the shell gives a nav row — light and dark themes alike.
 */
function storeMaskUrl() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2.6 9.2L4.55 4.5A1.6 1.6 0 0 1 6.04 3.5h11.92a1.6 1.6 0 0 1 1.49 1L21.4 9.2Z" fill="#000" stroke="none"/>' +
    '<path d="M5.3 9.2v10.2a1.2 1.2 0 0 0 1.2 1.2h11a1.2 1.2 0 0 0 1.2-1.2V9.2"/>' +
    '<path d="M9.4 20.6v-5.2a1.1 1.1 0 0 1 1.1-1.1h3a1.1 1.1 0 0 1 1.1 1.1v5.2"/>' +
    '</svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const NAV_ICON_MARKER = 'data-dsh-store-nav-icon'
const NAV_ROW_SELECTOR = '[role="dialog"] nav button'

/**
 * Give our row in the settings navigation a storefront.
 *
 * `settings.section` projects only `id` / `order` / `label`, so a registrant has
 * no icon to pass and the shell paints its own fallback glyph for us — which is
 * why our row read as an anonymous box next to the market's. The row's glyph is a
 * direct child <svg>, so hide it and draw ours through ::before on a row we have
 * marked by its own visible label.
 *
 * Narrow on purpose: only the row whose text equals our current label is marked;
 * the shell's structure is untouched; the marker and the stylesheet live inside a
 * `ctx.effect`, so they leave with the fiber; a locale switch re-claims the row
 * through the observer, so label and glyph never disagree.
 */
function installSettingsNavIcon(ctx, resolveLabel) {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-store-market'
    tag.textContent = [
      `[${NAV_ICON_MARKER}] > svg { display: none; }`,
      `[${NAV_ICON_MARKER}]::before {`,
      `  content: '';`,
      `  flex: none;`,
      `  width: 16px;`,
      `  height: 16px;`,
      `  background-color: currentColor;`,
      `  -webkit-mask-image: url("${storeMaskUrl()}");`,
      `  mask-image: url("${storeMaskUrl()}");`,
      `  -webkit-mask-repeat: no-repeat;`,
      `  mask-repeat: no-repeat;`,
      `  -webkit-mask-position: center;`,
      `  mask-position: center;`,
      `  -webkit-mask-size: 16px 16px;`,
      `  mask-size: 16px 16px;`,
      `}`,
    ].join('\n')
    document.head.appendChild(tag)

    let disposed = false
    let scheduled = false
    const sync = () => {
      scheduled = false
      if (disposed) return
      let wanted = ''
      try {
        wanted = String(resolveLabel() ?? '').trim()
      } catch (e) {
        wanted = ''
      }
      for (const row of document.querySelectorAll(NAV_ROW_SELECTOR)) {
        // An empty label matches nothing: a locale that has not resolved yet must
        // not mark the whole nav.
        if (wanted.length > 0 && String(row.textContent ?? '').trim() === wanted) {
          row.setAttribute(NAV_ICON_MARKER, '')
        } else {
          row.removeAttribute(NAV_ICON_MARKER)
        }
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
    return () => {
      disposed = true
      observer.disconnect()
      for (const row of document.querySelectorAll(`[${NAV_ICON_MARKER}]`)) row.removeAttribute(NAV_ICON_MARKER)
      tag.remove()
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
