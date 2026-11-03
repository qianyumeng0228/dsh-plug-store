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

function StoreFrame() {
  // iframe 是一个自己滚动的视口。不能把它撑到内容高度：iframe 内的
  // `position: fixed` 按 iframe 视口解析，撑满整篇文档后详情弹层会落到
  // 文档正中，用户点卡片只看到一层灰。
  //
  // 但高度也不能猜。`calc(100vh - 92px)` 比宿主设置页内容区高出一截，
  // 宿主就自己滚一条、iframe 内部再滚一条 —— 双滚动条就是这么来的。
  // 先给一个够用的初值，再"只允许收缩"地校正：包裹层底边超出窗口多少就减掉
  // 多少，直到宿主文档不再需要滚为止。只收缩是为了杜绝
  // 「变高→宿主滚动→top 变小→再变高」的失控回环；收敛后定时器就停掉。
  const wrapRef = React.useRef(null)
  const [px, setPx] = React.useState(0)
  React.useEffect(() => {
    const first = wrapRef.current
    if (!first) return
    const floor = 320
    let disposed = false
    let settled = false
    let timer = null
    let current = Math.max(floor, Math.round(window.innerHeight - first.getBoundingClientRect().top - 8))
    setPx(current)

    const snapshot = () => {
      const node = wrapRef.current
      if (!node) return null
      const rect = node.getBoundingClientRect()
      return {
        wrapH: Math.round(rect.height),
        wrapTop: Math.round(rect.top),
        wrapBottom: Math.round(rect.bottom),
        winH: window.innerHeight,
        docScrollH: document.documentElement.scrollHeight,
        hostScrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
      }
    }
    // 这里不上报：宿主文档 origin 是 dsh-app://app/，相对请求会被接口守卫（要求
    // 回环 Host）拒掉，静默失败。布局自检放在 iframe 内的商店页做，那边的
    // /dsh-store/api/* 是通的，而且同源能直接量到宿主。
    const tick = () => {
      const node = wrapRef.current
      if (!node || disposed) return
      const overflow = Math.round(node.getBoundingClientRect().bottom - window.innerHeight)
      if (overflow > 2) {
        current = Math.max(floor, current - overflow)
        setPx(current)
      }
      const snap = snapshot()
      if (!snap) return
      if (!snap.hostScrolls && overflow <= 2 && snap.wrapBottom <= snap.winH + 2) {
        settled = true
        clearInterval(timer)
        timer = null
      }
    }
    timer = setInterval(tick, 300)
    const onResize = () => {
      if (disposed) return
      current = Math.max(floor, Math.round(window.innerHeight - (wrapRef.current ? wrapRef.current.getBoundingClientRect().top : 0) - 8))
      setPx(current)
      if (settled && !timer) { settled = false; timer = setInterval(tick, 300) }
      tick()
    }
    window.addEventListener('resize', onResize)
    return () => {
      disposed = true
      if (timer) clearInterval(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  const height = px ? px + 'px' : 'calc(100vh - 92px)'
  return React.createElement(
    'div',
    {
      ref: wrapRef,
      style: { display: 'block', height: height, overflow: 'hidden', background: '#ffffff' },
    },
    React.createElement('iframe', {
      src: '/dsh-store/',
      title: 'DSH 插件商店',
      style: { width: '100%', height: '100%', border: '0', display: 'block' },
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

  } catch (error) {
    console.error('[dsh-store-market] client mount failed; store missing this session', error)
  }
}
