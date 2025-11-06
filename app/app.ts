import axios from 'axios';
import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, session } from 'electron';
import { join } from 'path';
import { format } from 'url';

import { ElectronService } from './services/electron.service';
import MenuBuilder from './menu';
import PlayerStore from './store';
import MediaBuilder from './media';

const { autoUpdater } = require('electron-updater');
const schedule = require('node-schedule');

let aboutWindow,
    configWindow,
    mainWindow,
    playerStore,
    electronService;

const ALLOWED_DOMAINS = {
  'default-src': `'self' 'unsafe-inline'`,
  'connect-src': `'self' https://player.iterra.world https://player.dosaaf.world https://player.iterra.space https://player.dosaaf.website https://video.dsi.ru/ https://video1.dsi.ru:8091/ https://video2.dsi.ru:8091/ https://api.iterra.world/`,
  'img-src': `'self' https://iterra.world/ https://dev.iterra.world/ https://minio.iterra.world/ data:`,
  'style-src': `'self' 'unsafe-inline' https://fonts.googleapis.com`,
  'font-src': `'self' https://fonts.gstatic.com`,
};

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
  initPLayerStore();
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
});

function checkMainWindow(baseUrl) {
  createWindow(baseUrl);

  mainWindow.on('ready-to-show', () => {
    setTimeout(() => {
      mainWindow.webContents.send('getPlayerInfo', playerStore.get('playerId'))
    }, 1000);
    mainWindow.show();
  })
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

function initPLayerStore() {
  playerStore = new PlayerStore({
    configName: 'user-preferences',
    defaults: {},
  });

  ipcMain.handle('getPLayerId', async () => {
    return playerStore.get('playerId');
  });

  ipcMain.addListener('setPlayerData', async (event, player) => {
    playerStore.set('playerId', player.id);
    playerStore.set('startAt', player.startAt);
    playerStore.set('endAt', player.endAt);
    playerStore.set('domain', player.project.domain);

    setSchedule();
  });

  ipcMain.addListener('setStatus', async (event, status) => {
    sendScreenshot(status);
  });
}

function setSchedule() {
  if (!playerStore.get('playerId') || !playerStore.get('startAt') || !playerStore.get('endAt')) {
    mainWindow.webContents.send('playerInfo');
    return;
  }

  const currentDate = new Date();

  const startAtSettings = new Date(playerStore.get('startAt'));
  const startAt = new Date();
  startAt.setHours(startAtSettings.getHours());
  startAt.setMinutes(startAtSettings.getMinutes());

  const endAtSettings = new Date(playerStore.get('endAt'));
  const endAt = new Date();
  endAt.setHours(endAtSettings.getHours());
  endAt.setMinutes(endAtSettings.getMinutes());

  const currentTime = currentDate.getTime();
  const ruleStart = getScheduleRule(startAt);
  const ruleEnd = getScheduleRule(endAt);

  if (currentTime >= startAt.getTime() && currentTime < endAt.getTime()) {
    checkForUpdate();
    setTimeout(() => sendScreenshot('running'), 1000);
    mainWindow.webContents.send('playerStart');
  } else {
    sendScreenshot('sleeping');
    mainWindow.webContents.send('playerStop');
  }

  for (const job in schedule.scheduledJobs) {
    schedule.cancelJob(job);
  }

  schedule.scheduleJob(ruleStart, function () {
    checkForUpdate();
    setTimeout(() => sendScreenshot('running'), 1000);
    mainWindow.webContents.send('playerStart');
  });

  schedule.scheduleJob(ruleEnd, function () {
    checkForUpdate();
    sendScreenshot('sleeping');
    mainWindow.webContents.send('playerStop');
  });
}

function checkForUpdate() {
  sendScreenshot('updated');
  autoUpdater.checkForUpdates().catch();
}

function getScheduleRule(dateAt) {
  const rule = new schedule.RecurrenceRule();
  rule.hour = Number(dateAt.getHours()) || 0;
  rule.minute = Number(dateAt.getMinutes()) || 0;

  return rule;
}

function createWindow(baseUrl) {
  mainWindow = new BrowserWindow({
    center: true,
    width: 1500,
    height: 1800,
    autoHideMenuBar: true,
    fullscreen: true,
    type: 'toolbar',
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    }
  });

  mainWindow.loadURL(baseUrl);

  const menuBuilder = new MenuBuilder(aboutWindow, configWindow, mainWindow, baseUrl);
  menuBuilder.buildMenu();
}

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const byteString = atob(dataURI.split(',')[1]);
  // separate out the mime component
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  // write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);
  // create a view into the buffer
  const ia = new Uint8Array(ab);
  // set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  // write the ArrayBuffer to a blob, and you're done
  const blob = new Blob([ab], {type: mimeString});

  return blob;
}

function sendScreenshot(status) {
  if ((process.env['NODE_ENV'] || '').startsWith('dev')) {
    return;
  }

  const domain = playerStore.get('domain');
  const playerId = playerStore.get('playerId');

  if (!domain || !playerId) return;

  desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      height: 700,
      width: 700,
    }
  }).then(async sources => {
    const form = new FormData();
    const file = sources[0].thumbnail.toDataURL();

    form.append('file', dataURItoBlob(file), 'screen.jpg');
    form.append('data', JSON.stringify({
      status,
      'status_at': new Date().toISOString(),
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
    } catch (error) {}
  });
}
