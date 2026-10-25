(() => {
  if (window.__arrpcBrowserBridgeBooted) return;
  window.__arrpcBrowserBridgeBooted = true;

  let Dispatcher;
  let lookupAsset;
  let lookupApp;
  let lastReadyState = null;
  let retryTimer = null;
  let retryDelay = 250;
  let processing = false;
  const applications = new Map();
  const pending = new Map();

  const eachCandidate = (module, callback) => {
    if (!module) return;
    try { callback(module); } catch {}
    try { if (module.default) callback(module.default); } catch {}
    try {
      for (const key of Reflect.ownKeys(module)) {
        try { callback(module[key]); } catch {}
      }
    } catch {}
  };

  const getWebpackRequire = () => {
    const chunks = window.webpackChunkdiscord_app;
    if (!chunks || typeof chunks.push !== "function") return null;
    const requires = [];
    chunks.push([[Symbol()], {}, require => {
      if (require && !requires.includes(require)) requires.push(require);
    }]);
    chunks.pop();

    const hasSource = (require, ...needles) => {
      for (const id in require?.m) {
        let source;
        try { source = require.m[id]?.toString?.(); } catch { continue; }
        if (source && needles.every(needle => source.includes(needle))) return true;
      }
      return false;
    };

    return requires.find(require =>
      hasSource(require, "getAssetImage: size must === [") &&
      hasSource(require, "coverImage", ".application")
    ) || requires.at(-1) || null;
  };

  const findModule = (require, ...needles) => {
    for (const id in require?.m) {
      let source;
      try { source = require.m[id]?.toString?.(); } catch { continue; }
      if (!source || !needles.every(needle => source.includes(needle))) continue;
      try { return require(id); } catch {}
    }
    return null;
  };

  const findInCache = (require, test, depth = 4) => {
    const seen = new WeakSet();
    let result;
    const visit = (value, remainingDepth) => {
      if (result || !value || (typeof value !== "object" && typeof value !== "function")) return;
      if (value === window || value === document || value === globalThis || seen.has(value)) return;
      seen.add(value);
      try {
        if (test(value)) { result = value; return; }
      } catch {}
      if (!remainingDepth) return;
      eachCandidate(value, candidate => visit(candidate, remainingDepth - 1));
    };
    for (const id in require?.c) {
      const exports = require.c[id]?.exports;
      if (!exports) continue;
      visit(exports, depth);
      if (result) return result;
    }
    return null;
  };

  const initializeDiscordModules = () => {
    if (Dispatcher && lookupAsset && lookupApp) return true;
    const require = getWebpackRequire();
    if (!require) return false;

    Dispatcher = findInCache(require, candidate =>
      typeof candidate?.dispatch === "function" && typeof candidate?.subscribe === "function"
    );

    const assetModule = findModule(require, "getAssetImage: size must === [");
    eachCandidate(assetModule, candidate => {
      if (lookupAsset || typeof candidate !== "function") return;
      const source = candidate.toString();
      if (source.includes("APPLICATION_ASSETS_FETCH_SUCCESS") && source.includes('startsWith("http:")')) {
        lookupAsset = async (appId, name) => (await candidate(appId, [name]))[0];
      }
    });

    const applicationModule = findModule(require, "Invalid Origin", "coverImage", ".application");
    eachCandidate(applicationModule, candidate => {
      if (lookupApp || typeof candidate !== "function") return;
      const source = candidate.toString();
      if (source.includes("Invalid Origin") && source.includes("coverImage") && source.includes(".application")) {
        lookupApp = async appId => {
          const request = {};
          await candidate(request, appId);
          return request.application;
        };
      }
    });
    return Boolean(Dispatcher && lookupAsset && lookupApp);
  };

  const reportReady = ready => {
    if (lastReadyState === ready) return;
    lastReadyState = ready;
    window.postMessage({ source: "arrpc-discord-main", type: "ARRPC_DISCORD_STATUS", ready }, window.location.origin);
  };

  const applyActivity = async message => {
    const activity = message.activity;
    if (activity?.assets?.large_image) {
      activity.assets.large_image = await lookupAsset(activity.application_id, activity.assets.large_image);
    }
    if (activity?.assets?.small_image) {
      activity.assets.small_image = await lookupAsset(activity.application_id, activity.assets.small_image);
    }
    if (activity) {
      const appId = activity.application_id;
      if (!applications.has(appId)) applications.set(appId, await lookupApp(appId));
      const application = applications.get(appId);
      if (!activity.name) activity.name = application?.name || "Game";
    }
    Dispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", ...message });
  };

  const scheduleDrain = () => {
    if (retryTimer !== null || processing || !pending.size) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      drainPending();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 5000);
  };

  const drainPending = async () => {
    if (processing || !pending.size) return;
    if (!initializeDiscordModules()) {
      reportReady(false);
      scheduleDrain();
      return;
    }
    retryDelay = 250;
    reportReady(true);
    processing = true;
    for (const [key, message] of Array.from(pending.entries())) {
      try { await applyActivity(message); }
      catch (error) { console.warn("[arRPC Browser] Rich Presence update failed:", error); }
      if (pending.get(key) === message) pending.delete(key);
    }
    processing = false;
    if (pending.size) scheduleDrain();
  };

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.source !== "arrpc-extension-content" || event.data?.type !== "ARRPC_ACTIVITY") return;
    const message = event.data.payload;
    if (!message || typeof message !== "object" || !("activity" in message)) return;
    pending.set(String(message.socketId ?? "default"), message);
    drainPending();
  });

  reportReady(false);
})();
