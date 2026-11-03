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
  function StoreFrame() {
    // iframe 必须是一个固定高度、自己滚动的视口。撑到内容高度会让 iframe 视口
    // 等于整篇文档，页内 position:fixed 的详情弹层就落到文档正中。
    //
    // 高度也不能猜：calc(100vh - 92px) 比宿主设置页内容区高，宿主就自己滚一条、
    // iframe 内部再滚一条，这就是双滚动条。先给够，再「只允许收缩」地校正 ——
    // 只收缩是为了杜绝「变高→宿主滚动→top 变小→再变高」的失控回环。
    const wrapRef = import_react.default.useRef(null);
    const [px, setPx] = import_react.default.useState(0);
    import_react.default.useEffect(() => {
      const first = wrapRef.current;
      if (!first) return;
      const floor = 320;
      let disposed = false;
      let settled = false;
      let timer = null;
      let current = Math.max(floor, Math.round(window.innerHeight - first.getBoundingClientRect().top - 8));
      setPx(current);
      const settledCheck = () => {
        const node = wrapRef.current;
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        const scrollH = document.documentElement.scrollHeight;
        return scrollH <= window.innerHeight + 2 && rect.bottom <= window.innerHeight + 2;
      };
      const tick = () => {
        const node = wrapRef.current;
        if (!node || disposed) return;
        const overflow = Math.round(node.getBoundingClientRect().bottom - window.innerHeight);
        if (overflow > 2) {
          current = Math.max(floor, current - overflow);
          setPx(current);
        }
        if (settledCheck()) {
          settled = true;
          clearInterval(timer);
          timer = null;
        }
      };
      timer = setInterval(tick, 300);
      const onResize = () => {
        if (disposed) return;
        const n2 = wrapRef.current;
        current = Math.max(floor, Math.round(window.innerHeight - (n2 ? n2.getBoundingClientRect().top : 0) - 8));
        setPx(current);
        if (settled && !timer) {
          settled = false;
          timer = setInterval(tick, 300);
        }
        tick();
      };
      window.addEventListener("resize", onResize);
      return () => {
        disposed = true;
        if (timer) clearInterval(timer);
        window.removeEventListener("resize", onResize);
      };
    }, []);
    const height = px ? px + "px" : "calc(100vh - 92px)";
    return import_react.default.createElement(
      "div",
      { ref: wrapRef, style: { display: "block", height, overflow: "hidden", background: "#ffffff" } },
      import_react.default.createElement("iframe", {
        src: "/dsh-store/",
        title: "DSH \u63D2\u4EF6\u5546\u5E97",
        style: { width: "100%", height: "100%", border: "0", display: "block" }
      })
    );
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
    } catch (error) {
      console.error("[dsh-store-market] client mount failed; store missing this session", error);
    }
  }
  return __toCommonJS(index_exports);
})();
return __dshStoreClient;
} });