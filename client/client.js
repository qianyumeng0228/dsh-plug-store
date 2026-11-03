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
    const wrapRef = import_react.default.useRef(null);
    const [height, setHeight] = import_react.default.useState("100%");
    import_react.default.useEffect(() => {
      const measure = () => {
        const el = wrapRef.current;
        if (!el) return;
        const parent = el.parentElement;
        const avail = parent ? parent.clientHeight : 0;
        setHeight(avail > 160 ? "100%" : "calc(100vh - 92px)");
      };
      measure();
      window.addEventListener("resize", measure);
      let ro = null;
      if (typeof ResizeObserver !== "undefined" && wrapRef.current?.parentElement) {
        ro = new ResizeObserver(measure);
        ro.observe(wrapRef.current.parentElement);
      }
      return () => {
        window.removeEventListener("resize", measure);
        if (ro) ro.disconnect();
      };
    }, []);
    return import_react.default.createElement(
      "div",
      {
        ref: wrapRef,
        style: {
          display: "block",
          height,
          overflow: "hidden",
          background: "#ffffff"
        }
      },
      import_react.default.createElement("iframe", {
        src: "/dsh-store/",
        title: "DSH \u63D2\u4EF6\u5546\u5E97",
        style: { width: "100%", height: "100%", border: "0", display: "block" }
      })
    );
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
function installSettingsNavIcon(ctx, resolveLabel) {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    let disposed = false
    let scheduled = false
    let lastReport = ''
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
        const inserted = stale.querySelector('svg[data-dsh-store-inserted]')
        if (inserted) stale.removeChild(inserted)
        else {
          const svg = stale.querySelector('svg')
          if (svg) svg.removeAttribute('stroke-width')
        }
      }
      const svg = row ? row.querySelector('svg') : null
      if (row && !svg) {
        // 回退符号不是 svg：插我们自己的，同时上报现场
        const inserted = buildStorefrontSvg(16)
        row.insertBefore(inserted, row.firstChild)
        row.setAttribute(NAV_ICON_FLAG, 'store')
        report({ label: wanted, scopes, matched: true, hasSvg: false, inserted: true,
          rowHtmlHead: String(row.innerHTML).slice(0, 160) })
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
        const inserted = row.querySelector('svg[data-dsh-store-inserted]')
        if (inserted) row.removeChild(inserted)
      }
    }
  }, 'dsh-store-market: settings nav icon')
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
      installSettingsNavIcon(ctx, () => t("nav"));
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