# arRPC Browser

[![Build](https://github.com/flessan/arrpc-bin/actions/workflows/build-release.yml/badge.svg)](https://github.com/flessan/arrpc-bin/actions/workflows/build-release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**arRPC Browser** connects a small browser extension to the existing arRPC game-detection helper. It uses your current browser and Discord Web tab. It does not bundle Chromium or open a separate Discord window.

> **Important:** the browser extension is lightweight, but it cannot inspect native game processes by itself. A small Node.js helper must run locally for automatic game detection. Discord Web must also be open and signed in. This project is unofficial and relies on Discord Web internals that can change without notice.

## Supported browsers

| Browser family | Support |
| --- | --- |
| Chrome and Chromium-based browsers | Current Chrome, Edge, Brave, Vivaldi, Opera, and other browsers supporting Manifest V3 content-script `MAIN` world |
| Firefox | Firefox 128 or newer, using the Firefox-specific Manifest V3 package |
| Safari | Not included yet. Safari requires its own packaging and compatibility work. |

The extension package contains only the extension files. It does not contain a browser engine, Electron, or a bundled copy of Discord.

## Download extensions

Get the latest Chromium and Firefox packages from [arRPC Browser Downloads](https://dl.thio.cc.cd/). Choose the package for your browser. The GitHub release archive is available on the [releases page](https://github.com/flessan/arrpc-bin/releases).

### Chromium: manual installation

1. Download the Chromium extension ZIP from [arRPC Browser Downloads](https://dl.thio.cc.cd/).
2. Extract the ZIP to a normal folder. Keep that folder in place because the browser loads the extension directly from it.
3. Open `chrome://extensions` in Chrome. For Edge, use `edge://extensions`; for Brave, use `brave://extensions`.
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
6. Open or refresh [Discord Web](https://discord.com/app) and sign in normally.

The extension is loaded locally, so there is no need to upload it to the Chrome Web Store for personal use. If you move or delete the extracted folder, load the extension again from its new location.

### Firefox

Download the Firefox package from [arRPC Browser Downloads](https://dl.thio.cc.cd/).

For temporary local testing before the add-on is available through Mozilla Add-ons, extract the ZIP, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and select the extracted `manifest.json`. Firefox removes temporary add-ons when it restarts.

## Start the local game-detection helper

Requirements: Node.js 22 or newer and npm.

```sh
git clone https://github.com/flessan/arrpc-bin.git
cd arrpc-bin
npm install
npm run start:helper
```

Keep that terminal/process running while you use Rich Presence. Then open [Discord Web](https://discord.com/app), sign in, and refresh the tab after installing the extension. The helper scans supported running processes approximately every five seconds and sends game activity to the extension over a loopback-only WebSocket.

The helper listens on `127.0.0.1:1337`; the normal arRPC IPC/WebSocket RPC ports remain available for compatible RPC clients. It does not listen on your LAN interface. No Discord account token or cookie needs to be copied into the helper.

### Helper commands

```sh
npm run check
npm test
npm run build:extensions
```

`npm run build:extensions` creates `dist/chromium/` and `dist/firefox/` unpacked extension folders. GitHub Actions packages each folder into a ZIP for release.

## How it works

- The browser extension runs only on supported Discord Web origins: `discord.com`, `ptb.discord.com`, and `canary.discord.com`.
- A background script connects to the helper at `ws://127.0.0.1:1337` and relays game activity to the Discord Web page.
- The page bridge dispatches activity updates through Discord Web's internal client modules.
- The Node.js helper uses the existing arRPC transports and detectable-game database to scan supported game processes.

## Troubleshooting

**The extension says the helper is disconnected.** Start `npm run start:helper` and keep it running. If port `1337` is already occupied, inspect the helper log before stopping another process.

**The helper is connected but no activity appears.** Refresh Discord Web, check that the game is in the detectable-game database, and try restarting the helper. Some launchers, custom executable names, or unsupported games may not be detected.

**Rich Presence stopped after Discord updated.** The extension uses undocumented Discord Web modules, so a Discord update can break the page bridge. Open an issue with your browser and OS version plus relevant logs. Do not include account tokens, cookies, or other authentication secrets.

## Privacy and limitations

- This is not an official Discord product and does not use a public API for setting personal-account Rich Presence.
- Rich Presence integration depends on private Discord Web implementation details and may stop working when Discord changes them.
- The helper scans local process metadata to identify supported games. Activity is relayed only to the local extension connection and Discord Web.
- The browser extension does not replace the local helper and does not guarantee that all games are detectable.
- Safari is not supported by this release.

## Credits and license

This project builds on [OpenAsar/arRPC](https://github.com/OpenAsar/arrpc), an MIT-licensed implementation of Discord's local RPC interfaces and game-detection approach. See [LICENSE](LICENSE) for the license text.

Upstream project: [OpenAsar/arRPC](https://github.com/OpenAsar/arrpc).
