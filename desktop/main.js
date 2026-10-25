import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const appName = 'arRPC Tray';
const trayIcon = nativeImage.createFromBuffer(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAsklEQVR4nO2XwQ2AIAxFq3edTwfQoXQAnU8H0IPBKCBIbStG/oWkJP0vvxwKwN+VuS6rZlqojMa+tHpZi5TGPpBc0tzWP3ddhmroimAII4Gn5nchDADu6HUpP7IEsEIDhEZNCoCdNxkApdgBfCmxAtwZ1TdGQPXiUQCULx4FwK0EkAC8AHU7n86nNV37fia9DwBs+2H8IxADuNrbuaT84kkAQC6Fo4+RADeE3v/1v+HrWgGxO0VvkklGjwAAAABJRU5ErkJggg==',
  'base64'
));

let mainWindow;
let tray;
let rpcServer;
let bridge;
let currentGame = null;
let rpcStatus = 'starting';
let quitting = false;
let logFile;

const isAutoStartSupported = ['win32', 'darwin', 'linux'].includes(process.platform);
let linuxAutostartFile;

function log() {
  const line = '[arRPC Tray] ' + Array.from(arguments).map(value => {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  }).join(' ');
  console.log(line);
  if (logFile) {
    try { appendFileSync(logFile, new Date().toISOString() + ' ' + line + '\n'); } catch {}
  }
}

function isDiscordUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowedHost = host === 'discord.com' ||
      host.endsWith('.discord.com') ||
      host === 'discordapp.com' ||
      host.endsWith('.discordapp.com') ||
      host === 'discord.gg';
    return url.protocol === 'https:' && allowedHost;
  } catch {
    return false;
  }
}

function showDiscord() {
  if (!mainWindow || mainWindow.isDestroyed()) createDiscordWindow(true);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  refreshTrayMenu();
}

function toggleDiscord() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    showDiscord();
  } else {
    mainWindow.hide();
    refreshTrayMenu();
  }
}

function refreshTrayMenu() {
  if (!tray || tray.isDestroyed()) return;

  const isVisible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  const startupEnabled = isAutoStartSupported ? getAutoStartEnabled() : false;
  const gameLabel = currentGame
    ? 'Game: ' + currentGame.slice(0, 90)
    : 'No supported game detected';

  tray.setToolTip(currentGame ? appName + ' | ' + currentGame : appName + ' | waiting for a game');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: appName, enabled: false },
    { label: 'RPC service: ' + rpcStatus, enabled: false },
    { label: gameLabel, enabled: false },
    { type: 'separator' },
    { label: isVisible ? 'Hide Discord window' : 'Show Discord window', click: toggleDiscord },
    { label: 'Reload Discord', click: () => mainWindow?.webContents.reload() },
    { type: 'separator' },
    {
      label: 'Start at login',
      type: 'checkbox',
      checked: startupEnabled,
      enabled: isAutoStartSupported,
      click: item => {
        setAutoStart(item.checked);
      }
    },
    {
      label: 'Open log file',
      click: async () => {
        if (!logFile) return;
        const error = await shell.openPath(logFile);
        if (error) log('Could not open log file:', error);
      }
    },
    { type: 'separator' },
    { label: 'Quit arRPC Tray', click: () => { quitting = true; app.quit(); } }
  ]));
}

function getAutoStartEnabled() {
  if (process.platform === 'linux') return existsSync(linuxAutostartFile);
  return Boolean(app.getLoginItemSettings().openAtLogin);
}

function quoteDesktopExec(value) {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%') + '"';
}

function setAutoStart(enabled) {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  } else if (process.platform === 'linux') {
    if (enabled) {
      const executable = process.env.APPIMAGE;
      const command = executable
        ? quoteDesktopExec(executable) + ' --hidden'
        : quoteDesktopExec(process.execPath) + ' ' + quoteDesktopExec(app.getAppPath()) + ' --hidden';
      mkdirSync(dirname(linuxAutostartFile), { recursive: true });
      writeFileSync(linuxAutostartFile, [
        '[Desktop Entry]',
        'Type=Application',
        'Name=arRPC Tray',
        'Comment=Game Rich Presence relay for Discord Web',
        'Exec=' + command,
        'Terminal=false',
        'X-GNOME-Autostart-enabled=true',
        ''
      ].join('\n'));
    } else {
      rmSync(linuxAutostartFile, { force: true });
    }
  }
  refreshTrayMenu();
}

async function injectDiscordBridge() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const pageUrl = mainWindow.webContents.getURL();
  if (!isDiscordUrl(pageUrl)) return;

  try {
    const bridgeFile = join(here, 'discord-bridge.js');
    const source = readFileSync(bridgeFile, 'utf8');
    const bridgePort = bridge?.getPort?.() ?? process.env.ARRPC_BRIDGE_PORT ?? '1338';
    await mainWindow.webContents.executeJavaScript(
      source.replaceAll('__ARRPC_BRIDGE_PORT__', bridgePort),
      true
    );
    log('Rich Presence bridge injected into Discord Web.');
  } catch (error) {
    log('Could not inject the Rich Presence bridge:', error);
  }
}

function createDiscordWindow(showOnStart = false) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (showOnStart) showDiscord();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: appName,
    backgroundColor: '#202225',
    webPreferences: {
      partition: 'persist:discord',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isDiscordUrl(url)) return { action: 'allow' };
    shell.openExternal(url).catch(error => log('Could not open external link:', error));
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isDiscordUrl(url)) {
      event.preventDefault();
      shell.openExternal(url).catch(error => log('Could not open external link:', error));
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    injectDiscordBridge();
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) log('Discord Web failed to load:', code, description, url);
  });

  mainWindow.on('ready-to-show', () => {
    if (showOnStart) mainWindow?.show();
    refreshTrayMenu();
  });

  mainWindow.on('close', event => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
      refreshTrayMenu();
      log('Discord window hidden to tray.');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    refreshTrayMenu();
  });

  mainWindow.loadURL('https://discord.com/app').catch(error => {
    log('Could not open Discord Web:', error);
  });

  refreshTrayMenu();
}

async function startRpcService() {
  process.env.ARRPC_BRIDGE_PORT = process.env.ARRPC_BRIDGE_PORT || '0';

  bridge = await import('../src/bridge.js');
  await bridge.ready;
  const { default: RPCServer } = await import('../src/server.js');
  rpcServer = await new RPCServer();
  rpcServer.on('activity', payload => {
    bridge.send(payload);
    const detectedGame = payload?.activity?.name || null;
    if (detectedGame !== currentGame) {
      currentGame = detectedGame;
      refreshTrayMenu();
      log(currentGame ? 'Detected game:' : 'No supported game is active.', currentGame || '');
    }
  });

  rpcStatus = 'running';
  refreshTrayMenu();
  log('RPC service started. Bridge port:', bridge.getPort());
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => showDiscord());

  app.whenReady().then(async () => {
    app.setAppUserModelId('cc.thio.arrpc');
    logFile = join(app.getPath('userData'), 'arrpc-tray.log');
    linuxAutostartFile = join(app.getPath('home'), '.config', 'autostart', 'arrpc-tray.desktop');

    tray = new Tray(trayIcon);
    tray.setToolTip(appName);
    tray.on('click', toggleDiscord);
    refreshTrayMenu();

    const wasStartedAtLogin = process.argv.includes('--hidden') ||
      (process.platform !== 'linux' && Boolean(app.getLoginItemSettings().wasOpenedAtLogin));
    try {
      await startRpcService();
    } catch (error) {
      rpcStatus = 'error';
      log('Could not start the RPC service:', error);
      refreshTrayMenu();
    }

    createDiscordWindow(!wasStartedAtLogin);
  });

  app.on('activate', () => showDiscord());
  app.on('before-quit', () => {
    quitting = true;
    if (tray && !tray.isDestroyed()) tray.destroy();
  });
  app.on('window-all-closed', () => {
    // The tray process intentionally remains alive until the user selects Quit.
  });

  process.on('uncaughtException', error => log('Uncaught exception:', error));
  process.on('unhandledRejection', error => log('Unhandled rejection:', error));
}
