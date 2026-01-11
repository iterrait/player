import axios from 'axios';
import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain,  screen, session } from 'electron';
import * as fs from 'fs';
import { join } from 'path';
import { format } from 'url';

import { ElectronService } from './services/electron.service';
import MenuBuilder from './menu';
import PlayerStore from './store';
import MediaBuilder from './media';

import SourcesOptions = Electron.SourcesOptions;

const { autoUpdater } = require('electron-updater');
const schedule = require('node-schedule');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

let aboutWindow,
    configWindow,
    linkDescriptionWindow,
    mainWindow,
    menuBuilder,
    playerStore,
    electronService;
const gotTheLock = app.requestSingleInstanceLock();
const SCREENSHOT_DIR = path.join(os.tmpdir(), 'electron-screenshots');
const LOKI_URL = 'https://loki.iterra.world/loki/api/v1/push';

const ALLOWED_DOMAINS = {
  'default-src': `'self' 'unsafe-inline'`,
  'connect-src': `'self' https://player.iterra.world https://player.dosaaf.world https://player.iterra.space https://player.dosaaf.website https://video.dsi.ru/ https://video1.dsi.ru:8091/ https://video2.dsi.ru:8091/ https://api.iterra.world/`,
  'img-src': `'self' https://iterra.world/ https://dev.iterra.world/ https://minio.iterra.world/ data:`,
  'style-src': `'self' 'unsafe-inline' https://fonts.googleapis.com`,
  'font-src': `'self' https://fonts.gstatic.com`,
};

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('ready', async () => {
  const baseUrl = !(process.env['NODE_ENV']||'').startsWith('dev')
    ? format({
      pathname: join(__dirname, `/../dist/player/browser/index.html`),
      protocol: 'file:',
      slashes: true
    })
    : 'https://localhost:4200';

  initServices();
  initMedia();
  initPlayerStore();
  checkAccess();

  if (!(process.env['NODE_ENV'] || '').startsWith('dev')) {
    checkMainWindow(baseUrl);
  } else {
    app.commandLine.appendSwitch('ignore-certificate-errors');
    app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

    setTimeout(() => {
      checkMainWindow(baseUrl);
    }, 1000);
  }

  // запрет на переход по ссылкам, кроме перехода на сайт
  app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl)

      if (parsedUrl.origin !== 'https://iterra.world') {
        event.preventDefault()
      }
    })
  })

  globalShortcut.register('Escape', function () {
    app.quit();
  });

  globalShortcut.register('Alt+E', () => {
    const params = {
      window: linkDescriptionWindow,
      title: 'Информация о плеере',
      icon: './build/icon.ico',
      path: 'settings',
      width: 700,
      height: 700,
    };
    menuBuilder.createModalWindow(params);
    linkDescriptionWindow = params.window;
  });

  globalShortcut.register('Alt+B', () => {
    menuBuilder.setupDevelopmentEnvironment();
  });

  globalShortcut.register('Alt+R', () => {
    takeScreenshotAndUpload('working', true);
  });

  globalShortcut.register('Alt+T', () => {
    playerStore.clearSettings();
    reloadApp();
  });
});

function checkMainWindow(baseUrl) {
  createWindow(baseUrl);

  mainWindow.on('ready-to-show', () => {
    setTimeout(() => {
      mainWindow.webContents.send('getPlayerInfo', playerStore.get('playerId'))
    }, 1000);
    mainWindow.show();
    openLinkDescriptionModal();
  });
}

function openLinkDescriptionModal() {
  const size = playerStore.get('playerId') ? 500 : 700;
  const params = {
    window: linkDescriptionWindow,
    title: 'Информация о плеере',
    icon: './build/icon.ico',
    path: 'link-description',
    width: size,
    height: size,
  };
  menuBuilder.createModalWindow(params);
  linkDescriptionWindow = params.window;
}

function checkAccess() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: Object.assign({
        "Content-Security-Policy": [
          `connect-src ${ALLOWED_DOMAINS['connect-src']}
           default-src: ${ALLOWED_DOMAINS['default-src']} 
           img-src: ${ALLOWED_DOMAINS['img-src']} 
           style-src: ${ALLOWED_DOMAINS['style-src']} 
           font-src: ${ALLOWED_DOMAINS['font-src']}`,
        ]
      }, details.responseHeaders)
    });
  });
}

function initServices() {
  electronService = new ElectronService();
}

function initMedia() {
  const mediaBuilder = new MediaBuilder;

  ipcMain.addListener('downloadMedia', async (event, data) => {
    await mediaBuilder.downloadBulkMedia(data.mediaList)
  });
}

function initPlayerStore() {
  playerStore = new PlayerStore({
    configName: 'user-preferences',
    defaults: {},
  });

  ipcMain.handle('getPlayerId', async () => {
    return playerStore.get('playerId');
  });

  ipcMain.handle('getIsPlayerLinked', async () => {
    return playerStore.get('isPlayerLinked');
  });

  ipcMain.addListener('setPlayerData', async (event, player) => {
    setPlayerStoreData(player);
  });

  ipcMain.addListener('closeLinkDescriptionModal', async () => {
    if (linkDescriptionWindow) {
      linkDescriptionWindow.close();
    }
  });

  ipcMain.addListener('setPlayerDataWithReload', async (event, player) => {
    setPlayerStoreData(player);
    reloadApp();
  });

  ipcMain.addListener('setStatus', async (event, status) => {
    await takeScreenshotAndUpload(status);
  });
}

function setPlayerStoreData(player): void {
  playerStore.set('playerId', player.id);
  playerStore.set('playerName', player.name);
  playerStore.set('startTime', player.startTime);
  playerStore.set('endTime', player.endTime);
  playerStore.set('screenResolution', player.screenResolution);

  if (player.hasOwnProperty('isPlayerLinked')) {
    playerStore.set('isPlayerLinked', !!player?.isPlayerLinked);
  }

  if (player?.project?.domain) {
    playerStore.set('domain', player.project.domain);
  }

  setSchedule();
}

function setSchedule() {
  if (!playerStore.get('playerId') || !playerStore.get('startTime') || !playerStore.get('endTime')) {
    mainWindow.webContents.send('playerInfo');
    return;
  }

  const currentDate = new Date();

  const startTimeSettings = playerStore.get('startTime').split(':');
  const startTime = new Date();
  startTime.setHours(startTimeSettings[0]);
  startTime.setMinutes(startTimeSettings[1]);

  const endTimeSettings = playerStore.get('endTime').split(':');
  const endTime = new Date();
  endTime.setHours(endTimeSettings[0]);
  endTime.setMinutes(endTimeSettings[1]);

  const currentTime = currentDate.getTime();
  const ruleStart = getScheduleRule(startTime);
  const ruleEnd = getScheduleRule(endTime);

  checkForUpdate();

  if (currentTime >= startTime.getTime() && currentTime < endTime.getTime()) {
    setTimeout(() => takeScreenshotAndUpload('running'), 1000);
    mainWindow.webContents.send('playerStart');
  } else {
    takeScreenshotAndUpload('sleeping').then();
    mainWindow.webContents.send('playerStop');
  }

  for (const job in schedule.scheduledJobs) {
    schedule.cancelJob(job);
  }

  schedule.scheduleJob(ruleStart, function () {
    checkForUpdate();
    setTimeout(() => takeScreenshotAndUpload('awake'), 1000);
    mainWindow.webContents.send('playerStart');
  });

  schedule.scheduleJob(ruleEnd, function () {
    checkForUpdate();
    takeScreenshotAndUpload('sleeping').then();
    mainWindow.webContents.send('playerStop');
  });
}

function checkForUpdate() {
  autoUpdater.checkForUpdates().catch();

  autoUpdater.on('update-downloaded', () => {
    takeScreenshotAndUpload('updated').then();
    autoUpdater.quitAndInstall();
  });
}

function getScheduleRule(dateAt) {
  const rule = new schedule.RecurrenceRule();
  rule.hour = Number(dateAt.getHours()) || 0;
  rule.minute = Number(dateAt.getMinutes()) || 0;

  return rule;
}

function reloadApp(): void {
  app.quit();
  app.exit();
  app.relaunch();
}

function createWindow(baseUrl) {
  const screenResolution = playerStore.get('screenResolution') ?? null;

  const params: Record<string, any> = {
    center: true,
    autoHideMenuBar: true,
    type: 'toolbar',
    frame: 0,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    }
  };

  if (screenResolution?.length) {
    const screen = screenResolution.split(':');

    params.width = Number(screen[0]);
    params.height = Number(screen[1]);
  } else {
    params.fullscreen = true;
  }

  mainWindow = new BrowserWindow(params);
  mainWindow.loadURL(baseUrl);

  menuBuilder = new MenuBuilder(aboutWindow, configWindow, mainWindow, baseUrl);
  menuBuilder.buildMenu();
}

async function sendLogToLoki(logData) {
  const logEntry = {
    streams: [{
      stream: {
        domain: playerStore.get('domain'),
        playerId: playerStore.get('playerId'),
        playerName: playerStore.get('playerName'),
        environment: (process.env['NODE_ENV'] || '').startsWith('dev') ? 'develop' : 'production',
        level: logData.level ?? 'info',
      },
      values: [
        [
          Date.now().toString() + '000000', // наносекунды
          JSON.stringify(logData.message)
        ]
      ]
    }]
  };

  try {
    const response = await fetch(LOKI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry)
    });
  } catch (error) {
    throw error;
  }
}

// перевод из base64 to blob
function base64ToBlob(base64, mimeType = '') {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

async function takeScreenshotAndUpload(status, isSendNotice = false) {
  if ((process.env['NODE_ENV'] || '').startsWith('dev')) {
    return;
  }

  const domain = playerStore.get('domain');
  const playerId = playerStore.get('playerId');

  if (!domain || !playerId) return;

  try {
    const primaryDisplay = screen.getPrimaryDisplay();

    const options: SourcesOptions = {
      types: ['screen'],
      thumbnailSize: primaryDisplay.size
    };

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

    const sources = await desktopCapturer.getSources(options);
    const timestamp = Date.now();
    const tempFilePath = path.join(SCREENSHOT_DIR, `screenshot-${timestamp}.png`);
    const compressedFilePath = path.join(SCREENSHOT_DIR, `screenshot-${timestamp}-compressed.jpg`);

    // Сохраняем оригинал
    const screenshot = sources[0];
    const pngBuffer = screenshot.thumbnail.toPNG();

    // Сохраняем напрямую через sharp
    if (typeof tempFilePath === "string") {
      await sharp(pngBuffer)
        .png()
        .toFile(tempFilePath);
    }

    // Сжимаем изображение
    await compressImage(tempFilePath, compressedFilePath);

    // Отправляем на сервер
    await sendToServer(compressedFilePath, status, domain, playerId, isSendNotice);

    // Удаляем временные файлы
    try {
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(compressedFilePath);
    } catch (message) {
      await sendLogToLoki({
        message,
        level: 'error',
      });
    }
  } catch (message) {
    await sendLogToLoki({
      message,
      level: 'error',
    });
    throw message;
  }
}

// Функция сжатия изображения
async function compressImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .jpeg({
        quality: 70, // Качество от 0 до 100
        progressive: true
      })
      .resize(1920, 1080, { // Опционально: изменение размера
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);

    return outputPath;
  } catch (error) {
    throw error;
  }
}

// Функция отправки на сервер
async function sendToServer(filePath, status, domain, playerId, isSendNotice) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileBase64 = fileBuffer.toString('base64');

  const form = new FormData();

  form.append('file', base64ToBlob(fileBase64), 'screen.jpg');
  form.append('data', JSON.stringify({
    status,
    'status_at': new Date(),
    'time_zone': getIANATimezone(),
  }));

  try {
    const response = await axios.post(
      `https://player.${domain}/v1/statuses/${playerId}/`,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${electronService.authToken}`,
        },
      }
    );

    if (isSendNotice) {
      mainWindow.webContents.send('showNotice', { status: 'success', message: 'Скриншот отправлен успешно' });
    }
    await sendLogToLoki({
      message: 'Статус успешно отправлен',
      level: 'success',
    });
  } catch (message) {
    mainWindow.webContents.send('showNotice', { status: 'error', message: 'Ошибка при отправке скриншота' });
    await sendLogToLoki({
      message,
      level: 'error',
    });
    throw message;
  }
}

function getIANATimezone() {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone || guessTimezoneByOffset();
  } catch {
    return guessTimezoneByOffset();
  }
}

function guessTimezoneByOffset() {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  const offsetMap = {
    '-12': 'Etc/GMT+12', '-11': 'Pacific/Midway', '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage', '-8': 'America/Los_Angeles', '-7': 'America/Denver',
    '-6': 'America/Chicago', '-5': 'America/New_York', '-4': 'America/Caracas',
    '-3': 'America/Sao_Paulo', '-2': 'Atlantic/South_Georgia', '-1': 'Atlantic/Azores',
    '0': 'UTC', '1': 'Europe/London', '2': 'Europe/Berlin', '3': 'Europe/Moscow',
    '4': 'Asia/Dubai', '5': 'Asia/Karachi', '6': 'Asia/Dhaka', '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai', '9': 'Asia/Tokyo', '10': 'Australia/Sydney',
    '11': 'Pacific/Guadalcanal', '12': 'Pacific/Auckland', '13': 'Pacific/Apia'
  };
  return offsetMap[offsetHours.toString()] || 'UTC';
}
