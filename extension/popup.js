const api = globalThis.browser || globalThis.chrome;
const title = document.getElementById("status-title");
const detail = document.getElementById("status-detail");
const dot = document.getElementById("status-dot");
const tabCount = document.getElementById("tab-count");
const discordStatus = document.getElementById("discord-status");

function render(status) {
  const connected = Boolean(status?.helperConnected);
  title.textContent = connected ? "Helper connected" : status?.status === "connecting" ? "Connecting…" : "Helper not running";
  detail.textContent = connected
    ? "The helper is connected. Keep Discord Web open in this browser."
    : "Start the Node.js helper with: npm run start:helper";
  dot.className = "dot" + (connected ? " connected" : status?.status === "connecting" ? "" : " error");
  tabCount.textContent = String(status?.discordTabCount ?? 0);
  discordStatus.textContent = (status?.discordReadyCount ?? 0) > 0 ? "Ready" : "Waiting";
}
function requestStatus() {
  try {
    const result = api.runtime.sendMessage({ type: "ARRPC_GET_STATUS" });
    if (result && typeof result.then === "function") result.then(render).catch(() => {});
  } catch {}
}
document.getElementById("reconnect").addEventListener("click", () => {
  try {
    const result = api.runtime.sendMessage({ type: "ARRPC_RECONNECT" });
    if (result && typeof result.then === "function") result.then(render).catch(() => {});
  } catch {}
});
api.runtime.onMessage.addListener(message => {
  if (message?.type === "ARRPC_STATUS_UPDATED") render(message.status);
});
requestStatus();
