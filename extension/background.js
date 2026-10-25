const api = globalThis.browser || globalThis.chrome;
const BRIDGE_URL = "ws://127.0.0.1:1337";
const discordTabs = new Set();
const readyTabs = new Set();
let socket = null;
let retryTimer = null;
let retryDelay = 1000;
let connectionStatus = "disconnected";

function currentStatus() {
  return {
    status: connectionStatus,
    helperConnected: Boolean(socket && socket.readyState === WebSocket.OPEN),
    discordTabCount: discordTabs.size,
    discordReadyCount: readyTabs.size
  };
}

function broadcastStatus() {
  try {
    const result = api.runtime.sendMessage({ type: "ARRPC_STATUS_UPDATED", status: currentStatus() });
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {}
}

function sendToTab(tabId, message) {
  try {
    const result = api.tabs.sendMessage(tabId, message);
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {}
}

function clearRetry() {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
}

function scheduleReconnect() {
  if (!discordTabs.size || retryTimer !== null) return;
  const delay = retryDelay;
  retryDelay = Math.min(retryDelay * 2, 15000);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectToHelper();
  }, delay);
}

function connectToHelper() {
  if (!discordTabs.size) return;
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
  clearRetry();
  connectionStatus = "connecting";
  broadcastStatus();

  let nextSocket;
  try {
    nextSocket = new WebSocket(BRIDGE_URL);
  } catch {
    connectionStatus = "disconnected";
    broadcastStatus();
    scheduleReconnect();
    return;
  }
  socket = nextSocket;

  nextSocket.addEventListener("open", () => {
    if (socket !== nextSocket) return;
    connectionStatus = "connected";
    retryDelay = 1000;
    broadcastStatus();
  });

  nextSocket.addEventListener("message", event => {
    if (socket !== nextSocket) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (!message || typeof message !== "object" || !("activity" in message)) return;
    for (const tabId of discordTabs) sendToTab(tabId, { type: "ARRPC_ACTIVITY", payload: message });
  });

  nextSocket.addEventListener("error", () => {
    try { nextSocket.close(); } catch {}
  });

  nextSocket.addEventListener("close", () => {
    if (socket !== nextSocket) return;
    socket = null;
    connectionStatus = "disconnected";
    broadcastStatus();
    scheduleReconnect();
  });
}

function reconnectNow() {
  clearRetry();
  retryDelay = 1000;
  const previous = socket;
  socket = null;
  if (previous) {
    try { previous.close(); } catch {}
  }
  connectionStatus = "disconnected";
  connectToHelper();
  broadcastStatus();
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ARRPC_TAB_READY" && Number.isInteger(sender.tab?.id)) {
    discordTabs.add(sender.tab.id);
    connectToHelper();
    sendResponse(currentStatus());
    return false;
  }

  if (message?.type === "ARRPC_DISCORD_STATUS" && Number.isInteger(sender.tab?.id)) {
    if (message.ready) readyTabs.add(sender.tab.id);
    else readyTabs.delete(sender.tab.id);
    broadcastStatus();
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "ARRPC_GET_STATUS") {
    sendResponse(currentStatus());
    return false;
  }

  if (message?.type === "ARRPC_RECONNECT") {
    reconnectNow();
    sendResponse(currentStatus());
    return false;
  }
  return false;
});

api.tabs.onRemoved.addListener(tabId => {
  discordTabs.delete(tabId);
  readyTabs.delete(tabId);
  if (!discordTabs.size) {
    clearRetry();
    const previous = socket;
    socket = null;
    if (previous) {
      try { previous.close(); } catch {}
    }
    connectionStatus = "disconnected";
  }
  broadcastStatus();
});
