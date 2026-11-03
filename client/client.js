window.__ModuleLoader__.load({ id: "dsh-store-market", factory: (require) => {
var __dshStoreClient = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // client-src/index.js
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject,
    name: () => name
  });
  var import_react = __toESM(__require("react"), 1);
  var name = "dsh-store-market";
  var inject = ["slots", "locale"];
  var NS = "dsh-store-market";
  var SIDEBAR_PANEL_ID = "dsh-store-market";
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
    let lastLayout = ''
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
    const report = (snap) => {
      const json = JSON.stringify(snap)
      if (json === lastLayout) return
      lastLayout = json
      fetch('/dsh-store/api/layout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-dsh-store': '1' },
        body: json,
      }).catch(() => {})
    }
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
      report(snap)
      // 宿主不再需要滚、且我们确实占到了窗口底，就算收敛
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

  function createSectionGate(register, initiallyVisible = true) {
    let ready = false;
    let wanted = initiallyVisible;
    let removed = false;
    let dispose = null;
    const apply2 = () => {
      if (!ready) return;
      const shouldShow = wanted && !removed;
      if (shouldShow && dispose === null) {
        try {
          dispose = register();
        } catch (error) {
          console.warn("[dsh-store-market] slot register failed", error);
        }
        return;
      }
      if (!shouldShow && dispose !== null) {
        const stop = dispose;
        dispose = null;
        stop();
      }
    };
    return {
      available: () => {
        ready = true;
        apply2();
      },
      setVisible: (visible) => {
        wanted = visible;
        apply2();
      },
      visible: () => dispose !== null,
      retire: () => {
        removed = true;
        apply2();
      }
    };
  }
  function apply(ctx) {
    try {
      ctx.effect(() => ctx.locale.register(NS, {
        zh: { nav: "\u63D2\u4EF6\u5546\u5E97", desc: "DSH \u63D2\u4EF6\u5546\u5E97 \u2014 \u6D4F\u89C8\u5E76\u5B89\u88C5\u793E\u533A\u63D2\u4EF6" },
        en: { nav: "Plugin Store", desc: "DSH Plugin Store \u2014 browse and install community plugins" }
      }), "dsh-store-market: dictionaries");
      const t = ctx.locale.bind(NS);
      const frame = () => import_react.default.createElement(StoreFrame);
      const sectionGate = createSectionGate(() => {
        const off = ctx.slots.register({
          name: "settings.section",
          id: NS,
          order: 41,
          label: () => t("nav"),
          locale: NS,
          inject: () => ({ t })
        }, frame);
        return typeof off === "function" ? off : () => {
        };
      });
      ctx.slots.inject("settings.section", () => sectionGate.available());
      const tabGate = createSectionGate(() => {
        const off = ctx.slots.register({
          name: "settings.plugins.tab",
          id: NS,
          order: 60,
          label: () => t("nav"),
          locale: NS,
          inject: () => ({ t })
        }, frame);
        return typeof off === "function" ? off : () => {
        };
      });
      ctx.slots.inject("settings.plugins.tab", () => tabGate.available());
      const sidebarGate = createSectionGate(() => {
        const offPanel = ctx.slots.register({
          name: "main",
          key: SIDEBAR_PANEL_ID,
          locale: NS,
          inject: () => ({ t })
        }, () => import_react.default.createElement("div", { style: { width: "100%", height: "100%", background: "#ffffff" } }, frame()));
        const offRow = ctx.slots.register({
          name: "sidebar.panellist",
          id: SIDEBAR_PANEL_ID,
          order: 1,
          label: () => t("nav"),
          locale: NS
        }, (owner = {}) => import_react.default.createElement(StoreLogo, { size: owner.size ?? 16 }));
        return () => {
          if (typeof offRow === "function") offRow();
          if (typeof offPanel === "function") offPanel();
        };
      }, true);
      ctx.slots.inject("sidebar.panellist", () => sidebarGate.available());
      setTimeout(() => sidebarGate.available(), 1500);
    } catch (error) {
      console.error("[dsh-store-market] client mount failed; store missing this session", error);
    }
  }
  return __toCommonJS(index_exports);
})();
return __dshStoreClient;
} });