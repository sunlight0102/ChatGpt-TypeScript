const share: any = (global as any).share;
// const ipcMain: any = share.ipcMain;
const http: any = share.http;
const autoUpdater = share.autoUpdater;

import {IpcMessage} from "../models/electron.ipc.model";

console.log(`AutoUpdate - Knowledge Canvas Version ${autoUpdater.currentVersion.version} - Initializing...`);

autoUpdater.on('checking-for-update', () => {
    let kcMainWindow: any = share.BrowserWindow.getAllWindows()[0];

    let message: IpcMessage = {
        error: undefined,
        success: {
            data: 'Auto updater checking for update...'
        }
    }

    kcMainWindow.webContents.send('electron-auto-update', message);
});

autoUpdater.on('update-available', (info: any) => {
    let kcMainWindow: any = share.BrowserWindow.getAllWindows()[0];

    let message: IpcMessage = {
        error: undefined,
        success: {
            data: info,
            message: 'Auto updater found new update...'
        }
    }
    kcMainWindow.webContents.send('electron-auto-update', message);
});

autoUpdater.on('update-not-available', (info: any) => {
    let kcMainWindow: any = share.BrowserWindow.getAllWindows()[0];

    let message: IpcMessage = {
        error: undefined,
        success: {
            data: info,
            message: 'No updates available...'
        }
    }
    kcMainWindow.webContents.send('electron-auto-update', message);
});

autoUpdater.on('error', (err: any) => {
    let kcMainWindow: any = share.BrowserWindow.getAllWindows()[0];

    let message: IpcMessage = {
        error: {
            code: 501,
            label: http.STATUS_CODES['501'],
            message: err
        },
        success: undefined
    }
    kcMainWindow.webContents.send('electron-auto-update', message);
});

autoUpdater.on('download-progress', (progressObj: any) => {
    let kcMainWindow: any = share.BrowserWindow.getAllWindows()[0];

    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';

    let message: IpcMessage = {
        error: undefined,
        success: {
            message: log_message
        }
    }
    kcMainWindow.webContents.send('electron-auto-update', log_message);
});

autoUpdater.on('update-downloaded', (info: any) => {
    let kcMainWindow: any = share.BrowserWindow.getAllWindows()[0];

    let message: IpcMessage = {
        error: undefined,
        success: {
            data: info,
            message: 'Update finished downloading...'
        }
    }
    kcMainWindow.webContents.send('electron-auto-update', 'Update downloaded');
});
