#!/usr/bin/env node

const rgb = (r, g, b, msg) => "\x1b[38;2;" + r + ";" + g + ";" + b + "m" + msg + "\x1b[0m";
const log = (...args) => console.log("[" + rgb(88, 101, 242, "arRPC") + "]", ...args);

import * as Bridge from "./bridge.js";
import Server from "./server.js";

(async () => {
  try {
    const port = await Bridge.ready;
    log("browser helper v1.0.0 listening on 127.0.0.1:" + port);
    const server = await new Server();
    server.on("activity", data => Bridge.send(data));
  } catch (error) {
    console.error("[arRPC] Failed to start:", error);
    process.exitCode = 1;
  }
})();
