#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';

import * as Bridge from './bridge.js';
import RPCServer from './server.js';

const DISCORD_URL = 'https://discord.com/app';
const shouldOpenBrowser = !process.argv.includes('--no-open');

function openDefaultBrowser() {
  let command;
  let args;

  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/d', '/s', '/c', 'start', '', DISCORD_URL];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [DISCORD_URL];
  } else {
    command = 'xdg-open';
    args = [DISCORD_URL];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  child.once('error', error => {
    console.error('[arRPC Lite] Could not open the default browser:', error.message);
  });
  child.unref();
}

async function main() {
  try {
    const port = await Bridge.ready;
    const server = await new RPCServer();
    server.on('activity', data => Bridge.send(data));

    console.info('[arRPC Lite] Game detection and RPC services are running.');
    console.info(`[arRPC Lite] Local browser bridge: 127.0.0.1:${port}`);
    console.info('[arRPC Lite] Keep this process running while you want Rich Presence.');

    if (shouldOpenBrowser) openDefaultBrowser();
    else console.info('[arRPC Lite] Browser auto-open disabled (--no-open).');
  } catch (error) {
    console.error('[arRPC Lite] Failed to start:', error);
    process.exitCode = 1;
  }
}

main();
