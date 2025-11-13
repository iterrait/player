import {
  Menu,
  BrowserWindow,
} from 'electron';

interface Params {
  window: BrowserWindow;
  mainWindow?: BrowserWindow;
  title: string;
  icon: string;
  path: string;
  width?: number;
  height?: number;
}

export default class MenuBuilder {
  aboutWindow: BrowserWindow;
  configWindow: BrowserWindow;
  mainWindow: BrowserWindow;
  baseUrl: string;

  constructor(
    aboutWindow: BrowserWindow,
    configWindow: BrowserWindow,
    mainWindow: BrowserWindow,
    baseUrl: string,
  ) {
    this.aboutWindow = aboutWindow;
    this.configWindow = configWindow;
    this.mainWindow = mainWindow;
    this.baseUrl = baseUrl;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template = this.buildDefaultTemplate();
    const menu = Menu.buildFromTemplate(template);

    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: 'Параметры',
        submenu: [
          {
            label: 'Настройки',
            click: () => {
              const params: Params = {
                path: 'settings',
                window: this.configWindow,
                title: 'Настройки',
                icon: './build/icon.ico',
              };
              this.createModalWindow(params);
            }
          },
          {
            label: 'О приложении',
            click: () => {
              const params: Params = {
                path: 'about',
                window: this.aboutWindow,
                title: 'О приложении',
                icon: './build/icon.ico',
              };
              this.createModalWindow(params);
            },
          },
        ],
      }
    ];

    return templateDefault;
  }

  createModalWindow(params: Params) {
    params.window = new BrowserWindow({
      width: params?.width ?? 700,
      height: params?.width ?? 700,
      parent: params?.mainWindow ?? this.mainWindow,
      title: params.title,
      modal: true,
      icon: params.icon,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    params.window.loadURL(`${this.baseUrl}#${params.path}`);
    params.window.setMenu(null);
  }
}
