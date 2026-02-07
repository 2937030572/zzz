import { contextBridge } from 'electron';

// 向渲染进程暴露一些有用的 API
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: process.versions,
  isElectron: true,
});

// 禁用某些 Electron 特定功能的警告
window.addEventListener('error', (e) => {
  if (e.message?.includes('Electron')) {
    e.preventDefault();
  }
});

console.log('Electron preload script loaded');
