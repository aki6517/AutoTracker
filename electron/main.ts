import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { initializeIpcHandlers } from './ipc/index.js';
import { initializeDatabase } from './database/index.js';
import { setTrackingEngineMainWindow } from './services/tracking-engine.service.js';
import { getBackupService } from './services/backup.service.js';
import { getNetworkMonitor } from './services/network-monitor.service.js';
import { getLogger } from './services/logger.service.js';

// Electronのメインプロセスでのパス解決
const getMainDir = () => {
  // アプリのパスからdist-electronディレクトリを取得
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'dist-electron')
    : path.join(app.getAppPath(), 'dist-electron');
};

// 開発環境かどうか
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const mainDir = getMainDir();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0D0D0D',
    webPreferences: {
      preload: path.join(mainDir, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  // ウィンドウが準備できたら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // トラッキングエンジンにメインウィンドウを設定
    if (mainWindow) {
      setTrackingEngineMainWindow(mainWindow);
    }
  });

  // 開発環境ではViteの開発サーバー、本番環境ではビルド済みファイルを読み込む
  if (isDev) {
    // vite-plugin-electronが設定するVITE_DEV_SERVER_URLを使用
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// アプリケーションの準備ができたらウィンドウを作成
app.whenReady().then(async () => {
  try {
    // 起動時リカバリを実行
    const backupService = getBackupService();
    await backupService.performStartupRecovery();

    // データベースの初期化
    await initializeDatabase();

    // 自動バックアップを開始
    backupService.startAutoBackup();

    // ネットワークモニターを開始
    const networkMonitor = getNetworkMonitor();
    networkMonitor.startMonitoring();

    // ロガーを初期化
    const logger = getLogger();
    logger.info('App', 'AutoTracker started', { version: app.getVersion() });

    // IPCハンドラーの初期化
    initializeIpcHandlers();

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

// すべてのウィンドウが閉じられたら終了（macOSを除く）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリ終了時にサービスを停止
app.on('before-quit', () => {
  const backupService = getBackupService();
  backupService.stopAutoBackup();

  const networkMonitor = getNetworkMonitor();
  networkMonitor.stopMonitoring();

  const logger = getLogger();
  logger.info('App', 'AutoTracker shutting down');
  logger.close();
});

// セキュリティ: 新しいウィンドウの作成を制限
app.on('web-contents-created', (_event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});

