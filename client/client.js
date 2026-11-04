window.__ModuleLoader__.load({ id: "dsh-apps", factory: (require) => {
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
  var name = "dsh-apps";
  var inject = ["slots", "locale"];
  var NS = "dsh-apps";
  function StoreFrame() {
    const frameRef = import_react.default.useRef(null);
    import_react.default.useEffect(() => {
      const sync = () => {
        const f = frameRef.current;
        if (!f) return;
        try {
          const doc = f.contentDocument;
          const h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
          const cur = parseFloat(f.style.height || "");
          if (h > 0 && (isNaN(cur) || Math.abs(h - cur) > 4)) f.style.height = h + "px";
        } catch (e) {
        }
      };
      sync();
      const timer = setInterval(sync, 500);
      return () => clearInterval(timer);
    }, []);
    const onLoad = () => {
      const f = frameRef.current;
      if (!f) return;
      try {
        const doc = f.contentDocument;
        const h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
        if (h > 0) f.style.height = h + "px";
      } catch (e) {
      }
    };
    return import_react.default.createElement(
      "div",
      { style: { display: "block", minHeight: "calc(100vh - 92px)", background: "#ffffff" } },
      import_react.default.createElement("iframe", {
        ref: frameRef,
        src: "/dsh-store/",
        title: "DSH \u63D2\u4EF6\u5546\u5E97",
        onLoad,
        style: { width: "100%", height: "calc(100vh - 92px)", border: "0", display: "block" }
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
          console.warn("[dsh-apps] slot register failed", error);
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
      }), "dsh-apps: dictionaries");
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
      console.error("[dsh-apps] client mount failed; store missing this session", error);
    }
  }
  return __toCommonJS(index_exports);
})();
return __dshStoreClient;
} });