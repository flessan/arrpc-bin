const api = globalThis.browser || globalThis.chrome;
const PAGE_SOURCE = "arrpc-extension-content";
const MAIN_SOURCE = "arrpc-discord-main";

function safeSendMessage(message) {
  try {
    const result = api.runtime.sendMessage(message);
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {}
}

api.runtime.onMessage.addListener(message => {
  if (message?.type !== "ARRPC_ACTIVITY" || !message.payload) return false;
  window.postMessage({ source: PAGE_SOURCE, type: "ARRPC_ACTIVITY", payload: message.payload }, window.location.origin);
  return false;
});

window.addEventListener("message", event => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.source !== MAIN_SOURCE || event.data?.type !== "ARRPC_DISCORD_STATUS") return;
  safeSendMessage({ type: "ARRPC_DISCORD_STATUS", ready: Boolean(event.data.ready) });
});

function announceDiscordTab() {
  safeSendMessage({ type: "ARRPC_TAB_READY" });
}

announceDiscordTab();
setInterval(announceDiscordTab, 15000);
