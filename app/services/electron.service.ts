import { app, ipcMain } from "electron";

const crypto = require('crypto');
const si = require('systeminformation');

export class ElectronService {
  private static instance: ElectronService;
  private token: string = '';

  public get authToken() {
    return this.token;
  }

  public get instance() {
    return ElectronService.instance;
  }

  constructor() {
    if (ElectronService.instance) {
      return ElectronService.instance;
    }

    ElectronService.instance = this;

    this.init();
  }

  private generateToken(){
    Promise.all([si.osInfo(), si.baseboard()]).then((values) => {
      const data = [values[0].serial, values[1].model];
      const info = data.join(',');
      const token = crypto.createHash('sha1')
        .update(info)
        .digest('hex');

      if (token) {
        this.token = token;
      }
    });
  }

  private init() {
    this.generateToken();

    ipcMain.handle('getAuthToken', async () => {
      return this.token;
    });

    ipcMain.handle('getVersion', async () => {
      return app.getVersion();
    });
  }
}
