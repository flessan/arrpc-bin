const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
const log = (...args) => console.log(`[${rgb(88, 101, 242, 'arRPC')} > ${rgb(87, 242, 135, 'bridge')}]`, ...args);

import { WebSocket, WebSocketServer } from 'ws';

// basic bridge to pass info onto webapp
let lastMsg = {};
export const send = msg => {
  lastMsg[msg.socketId] = msg;
  wss.clients.forEach(x => {
    if (x.readyState !== WebSocket.OPEN) return;
    try { x.send(JSON.stringify(msg)); } catch (error) { log('send failed:', error.message); }
  });
};

let port = 1337;
if (process.env.ARRPC_BRIDGE_PORT) {
  port = parseInt(process.env.ARRPC_BRIDGE_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('invalid bridge port');
  }
}
const wss = new WebSocketServer({ port, host: '127.0.0.1' });
wss.on('error', error => log('server error:', error.message));

wss.on('connection', socket => {
  log('web connected');

  for (const id in lastMsg) { // catch up newly connected
    if (lastMsg[id].activity != null) send(lastMsg[id]);
  }

  socket.on('close', () => {
    log('web disconnected');
  });
});

wss.on('listening', () => log('listening on', port));
