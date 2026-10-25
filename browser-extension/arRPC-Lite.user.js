// ==UserScript==
// @name         arRPC Lite Bridge
// @namespace    https://github.com/flessan/arrpc-bin
// @version      3.8.0
// @description  Connects Discord Web to the local arRPC Lite process.
// @match        https://discord.com/*
// @match        https://ptb.discord.com/*
// @match        https://canary.discord.com/*
// @run-at       document-idle
// @grant        none
// @inject-into  page
// ==/UserScript==

(() => {
  if (window.__arrpcLiteBridgeBooted) return;
  window.__arrpcLiteBridgeBooted = true;

  let Dispatcher;
  let lookupAsset;
  let lookupApp;
  let socket;
  let reconnectDelay = 1000;
  let reconnectTimer;
  const applications = new Map();

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
    if (!chunks || typeof chunks.push !== 'function') return null;

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
      hasSource(require, 'getAssetImage: size must === [') &&
      hasSource(require, 'coverImage', '.application')
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
      if (result || !value || (typeof value !== 'object' && typeof value !== 'function')) return;
      if (value === window || value === document || value === globalThis || seen.has(value)) return;
      seen.add(value);

      try {
        if (test(value)) {
          result = value;
          return;
        }
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
      typeof candidate?.dispatch === 'function' &&
      typeof candidate?.subscribe === 'function'
    );

    const assetModule = findModule(require, 'getAssetImage: size must === [');
    eachCandidate(assetModule, candidate => {
      if (lookupAsset || typeof candidate !== 'function') return;
      const source = candidate.toString();
      if (source.includes('APPLICATION_ASSETS_FETCH_SUCCESS') && source.includes('startsWith("http:")')) {
        lookupAsset = async (appId, name) => (await candidate(appId, [name]))[0];
      }
    });

    const applicationModule = findModule(require, 'Invalid Origin', 'coverImage', '.application');
    eachCandidate(applicationModule, candidate => {
      if (lookupApp || typeof candidate !== 'function') return;
      const source = candidate.toString();
      if (source.includes('Invalid Origin') && source.includes('coverImage') && source.includes('.application')) {
        lookupApp = async appId => {
          const request = {};
          await candidate(request, appId);
          return request.application;
        };
      }
    });

    return Boolean(Dispatcher && lookupAsset && lookupApp);
  };

  const applyActivity = async message => {
    if (!initializeDiscordModules()) {
      throw new Error('Discord Web Rich Presence modules are not ready yet.');
    }

    const activity = message.activity;
    if (activity?.assets?.large_image) {
      activity.assets.large_image = await lookupAsset(
        activity.application_id,
        activity.assets.large_image
      );
    }
    if (activity?.assets?.small_image) {
      activity.assets.small_image = await lookupAsset(
        activity.application_id,
        activity.assets.small_image
      );
    }

    if (activity) {
      const appId = activity.application_id;
      if (!applications.has(appId)) applications.set(appId, await lookupApp(appId));
      const application = applications.get(appId);
      if (!activity.name) activity.name = application?.name || 'Game';
    }

    Dispatcher.dispatch({ type: 'LOCAL_ACTIVITY_UPDATE', ...message });
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, 15000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    try {
      socket = new WebSocket('ws://127.0.0.1:1337');
    } catch (error) {
      console.error('[arRPC Lite] Could not create bridge socket:', error);
      scheduleReconnect();
      return;
    }

    socket.addEventListener('open', () => {
      reconnectDelay = 1000;
      console.info('[arRPC Lite] Connected to the local RPC bridge.');
    });

    socket.addEventListener('message', async event => {
      try {
        await applyActivity(JSON.parse(event.data));
      } catch (error) {
        console.warn('[arRPC Lite] Rich Presence update failed:', error);
      }
    });

    socket.addEventListener('error', () => {
      try { socket.close(); } catch {}
    });

    socket.addEventListener('close', scheduleReconnect, { once: true });
  };

  connect();
})();
