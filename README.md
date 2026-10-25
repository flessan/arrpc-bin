# arRPC Tray

[![Build](https://github.com/flessan/arrpc-bin/actions/workflows/build-release.yml/badge.svg)](https://github.com/flessan/arrpc-bin/actions/workflows/build-release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small system-tray companion for **arRPC**. It scans for supported games and runs a persistent Discord Web session in an Electron window that can be hidden to the tray. The goal is to make game Rich Presence easier to run without keeping the full Discord desktop application open.

> **Preview build.** Discord does not provide a public HTTP API for writing Rich Presence to a personal account. This project relies on Discord Web's internal client modules to bridge activities, so compatibility is not guaranteed and can break when Discord updates its web app. It is not an official Discord product.

## Downloads

Download the latest tested build from [GitHub Releases](https://github.com/flessan/arrpc-bin/releases).

| Platform | Package | Notes |
| --- | --- | --- |
| Linux x86_64 | `.AppImage` | Portable build; mark it executable before launching. |
| Windows x86_64 | Portable `.exe` | No installer required. |
| macOS | `.dmg` / `.zip` | Builds are experimental; game-detection coverage may vary. |

Pull request and branch builds are uploaded as temporary GitHub Actions artifacts. Version tags such as `v3.8.0` trigger a clean build matrix; a GitHub Release is published only after the platform builds pass. Release assets include SHA-256 checksums.

## Getting started

1. Download the package for your operating system from [Releases](https://github.com/flessan/arrpc-bin/releases).
2. Launch arRPC Tray. On the first launch, the embedded Discord Web window opens so you can sign in normally.
3. Wait for Discord to finish loading. Keep arRPC Tray running.
4. Close the window to hide it to the system tray. Closing the window does **not** quit the app.
5. Open the tray menu to show Discord again, reload the page, toggle startup at login, open the log, or quit the app.

The Discord Web login session is stored in Electron's persistent local session. The app does not ask you to copy or paste a Discord account token.

### Linux

For an AppImage download:

```sh
chmod +x "arRPC Tray-3.8.0-linux-x86_64.AppImage"
./"arRPC Tray-3.8.0-linux-x86_64.AppImage"
```

The exact filename may change between versions. Your desktop environment must support a system tray/status notifier for the tray menu to be accessible.

### Windows

Double-click the downloaded portable `.exe`. If you launch it from PowerShell, the command looks like this:

```powershell
.\'arRPC Tray 3.8.0.exe'
```

The actual filename depends on the release version and architecture.

## Build from source

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run check
npm test
npm run start:tray
```

Create a distributable on the matching operating-system runner:

```sh
npm run dist:linux
npm run dist:win
npm run dist:mac
```

Electron packaging is platform-specific, so each package is built on its corresponding GitHub Actions runner. To publish a release, push a version tag after the build configuration has been validated:

```sh
git tag v3.8.0
git push origin v3.8.0
```

## What it does

- Scans running processes against Discord's detectable-game database.
- Starts the existing arRPC IPC and WebSocket RPC services.
- Forwards activity events to the embedded Discord Web session over a loopback-only WebSocket.
- Provides a tray menu, persistent Discord Web session, optional startup-at-login, and a local log file.
- Builds Linux, Windows, and macOS packages through GitHub Actions.

## Limitations and privacy

- **Not an official Rich Presence API.** The bridge interacts with internal Discord Web modules. Discord may change them at any time, and activity publication can stop working without notice.
- **Push notifications are not guaranteed.** Keeping Discord Web hidden is not the same as having no active Discord session. This app does not guarantee that all notifications arrive immediately or exclusively on an Android phone.
- **Game detection is not universal.** Only supported entries from the detectable-game database are recognized automatically. Launchers, renamed executables, and unsupported games may not appear.
- **Discord Web is still running.** The window may be hidden, but Electron keeps the session alive to process the client-side Rich Presence updates.
- **Network exposure is limited.** The arRPC Tray bridge listens on loopback instead of exposing its WebSocket server to the local network.
- **Session data stays local to Electron's profile.** Keep your operating-system account protected. Use the app's tray menu to quit when you no longer need it.

If Rich Presence stops updating after a Discord Web update, first try **Reload Discord** from the tray menu. If it still fails, inspect the app log and open an issue with your OS, architecture, and relevant error lines. Do not include tokens, cookies, or other authentication secrets in issue reports.

## Credits

arRPC Tray builds on [arRPC](https://github.com/OpenAsar/arrpc), an open implementation of Discord's local RPC servers, and retains its MIT-licensed code and detectable-game scanning approach. This fork adds a tray-oriented Electron shell and packaging workflows.

- Upstream project: [OpenAsar/arRPC](https://github.com/OpenAsar/arrpc)
- License: [MIT](LICENSE)

