# arRPC Lite

A lightweight, experimental bridge that adds game Rich Presence to **Discord Web in your existing default browser**. It does not bundle Chromium, Electron, or a separate browser window.

The release ZIP is a source package, not a standalone executable. The target is **under 1 MiB**, and CI rejects the package if it reaches 1 MiB. You need Node.js 22 or newer and a browser bridge installed in the browser profile that opens Discord.

> arRPC Lite is not an official Discord product. Discord has no public HTTP API for setting Rich Presence on a personal account. This project uses Discord Web's internal client modules, which may change without notice.

## Install

1. Install [Node.js 22 or newer](https://nodejs.org/).
2. Download `arRPC-Lite-v*.zip` from [GitHub Releases](https://github.com/flessan/arrpc-bin/releases) and extract it.
3. Install the browser bridge:
   - **Chrome / Edge / Brave / Chromium:** open the browser's extensions page, enable developer mode, choose **Load unpacked**, and select the extracted `browser-extension` folder.
   - **Firefox or other browsers:** install a userscript manager such as Violentmonkey, then open the [arRPC Lite userscript](https://raw.githubusercontent.com/flessan/arrpc-bin/main/browser-extension/arRPC-Lite.user.js) and confirm installation.
4. Open a terminal in the extracted folder and run:

   ```sh
   npm install --omit=dev
   npm run start:lite
   ```

5. The companion opens Discord Web in your default browser. Sign in normally and keep the terminal process running while you want Rich Presence. No Discord token needs to be copied or pasted.

To start the local companion without automatically opening another browser tab:

```sh
npm run start:lite -- --no-open
```

## How it works

- A small Node.js process scans running processes against the arRPC detectable-game database.
- It hosts the local RPC and IPC services needed by games that use Discord's local RPC protocol.
- The browser bridge runs inside Discord Web and receives activity updates from `127.0.0.1:1337`.
- The local browser bridge binds to the loopback interface, not the LAN.

The bridge uses the default browser's existing profile and login. The companion does not embed a browser or manage browser cookies itself.

## Limitations

- **Experimental compatibility:** Discord may change its private Web client internals at any time.
- **A local process is required:** browsers cannot independently inspect running desktop game processes or provide the local IPC service; Node.js must keep running.
- **Browser bridge required:** installing the extension/userscript is necessary for updates to reach Discord Web.
- **Game detection is not universal:** automatic detection depends on the included database and the executable names reported by the operating system.
- **Notifications are not guaranteed:** running Discord Web in a browser does not guarantee immediate or exclusive push delivery to a phone.

## Development

Requirements: Node.js 22+.

```sh
npm install --omit=dev
npm run check
npm test
npm run start:lite
```

The project intentionally does not build or distribute bundled Electron apps. This keeps the download small and lets Discord Web run in the browser the user already has.

## Privacy and security

arRPC Lite does not request your Discord password or token. It forwards local game activity to the Discord Web page through a loopback-only WebSocket. Do not share logs if they contain personal information.

## Credits

Built on the MIT-licensed [OpenAsar/arRPC](https://github.com/OpenAsar/arrpc) project and its detectable-game database.
