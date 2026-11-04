/**
 * dsh-apps client bundle
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

export const name = 'dsh-apps'
export const inject = ['slots', 'locale']

const NS = 'dsh-apps'

function StoreFrame() {
  // iframe 撑到内容高度，滚动交给宿主设置页的内容列 —— 整页只有一条滚动条，
  // 和 dshmarket 的内联渲染一致。此前改成「iframe 固定高度自己滚」是为了修弹层，
  // 但那样宿主内容列和 iframe 各出一条滚动条，用户看到的就是两条。
  // 弹层错位改由商店页自己解决：它按宿主滚动状态把浮层罩在可见窗口上
  // （site/index.html 的 syncViewport），不再依赖 iframe 视口。
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
        console.warn('[dsh-apps] slot register failed', error)
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
    }), 'dsh-apps: dictionaries')
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

  } catch (error) {
    console.error('[dsh-apps] client mount failed; store missing this session', error)
  }
}
