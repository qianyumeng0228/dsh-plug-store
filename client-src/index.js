/**
 * dsh-store-market client bundle
 * Registers a "插件商店" settings section (and the Plugins-page tab on new
 * hosts) that embeds the host-served store UI at /dsh-store/ in an iframe.
 * The store page itself probes /dsh-store/api/capabilities and switches to
 * host mode automatically (real install/uninstall/update/backup/diagnose).
 *
 * Built with esbuild; React is bundled in (no host React dependency).
 */

import React from 'react'

export const name = 'dsh-store-market'
export const inject = ['slots', 'locale']

const NS = 'dsh-store-market'

function StoreFrame() {
  return React.createElement('iframe', {
    src: '/dsh-store/',
    title: 'DSH 插件商店',
    style: {
      width: '100%',
      height: '100%',
      minHeight: '72vh',
      border: '0',
      background: '#ffffff',
      display: 'block',
    },
  })
}

export function apply(ctx) {
  try {
    ctx.effect(() => ctx.locale.register(NS, {
      zh: { nav: '插件商店', desc: 'DSH 插件商店 — 浏览并安装社区插件' },
      en: { nav: 'Plugin Store', desc: 'DSH Plugin Store — browse and install community plugins' },
    }), 'dsh-store-market: dictionaries')
    const t = ctx.locale.bind(NS)

    const registerSection = (slot, order) => ctx.slots.register({
      name: slot,
      id: NS,
      order,
      label: () => t('nav'),
      locale: NS,
      inject: () => ({ t }),
    }, () => React.createElement(StoreFrame))

    ctx.slots.register({
      name: 'settings.section',
      id: NS,
      order: 41,
      label: () => t('nav'),
      locale: NS,
      inject: () => ({ t }),
    }, () => React.createElement(StoreFrame))

    // dsh >= 0.2.1-alpha.4 exposes a Plugins-page tab slot; older hosts
    // simply do not declare it, so a missing registration is a no-op.
    try {
      ctx.slots.register({
        name: 'plugins.tab',
        id: NS,
        order: -1,
        label: () => t('nav'),
        locale: NS,
        inject: () => ({ t }),
      }, () => React.createElement(StoreFrame))
    } catch (err) {
      console.warn('[dsh-store-market] plugins.tab slot unavailable on this host', err)
    }
  } catch (error) {
    console.error('[dsh-store-market] client mount failed; store missing this session', error)
  }
}
