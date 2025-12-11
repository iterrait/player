import { app, ipcMain } from 'electron';

const path = require('path');
const fs = require('fs');
const https = require('https');

export default class MediaBuilder {
  basePath = path.join(app.getPath('userData'), 'media');

  constructor() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    }

    this.initMedia();
  }

  public downloadBulkMedia(mediaList) {
    if (!mediaList.length) return;

    for (const media of mediaList) {
      this.downloadMedia(media.url, media.fileName, media.type);
    }
  }

  public checkExists(path) {
    return fs.existsSync(path);
  }

  private downloadMedia(url, fileName, type) {
    const downloadPath = path.join(this.basePath, `${fileName}.${type}`);

    if (this.checkExists(downloadPath)) {
      return;
    }

    const file = fs.createWriteStream(downloadPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
      });
    }).on('error', (err) => {
      fs.unlink(downloadPath, () => {
      });
    });
  }

  private initMedia() {
    ipcMain.handle('getLocalPath', async () => {
      return this.basePath;
    });

    ipcMain.handle('checkLocalMedia', async (event, name) => {
      const filePath = path.join(this.basePath, name);
      return this.checkExists(filePath)
        ? Buffer.from(fs.readFileSync(filePath)).toString('base64')
        : false
    });
  }
}
