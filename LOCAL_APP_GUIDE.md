# 本地应用部署指南

本应用是一个基于 Next.js 的交易记录管理应用，需要后端服务器和数据库支持。以下是将其打包为本地应用的几种方案：

## 📱 方案一：PWA（渐进式 Web 应用）- 推荐

### 优点
- ✅ 无需额外配置，应用已支持 PWA
- ✅ 可安装到手机主屏幕
- ✅ 支持离线访问界面
- ✅ 跨平台（iOS、Android、桌面）

### 安装步骤

#### Android 设备
1. 使用 Chrome 浏览器访问应用
2. 点击右上角菜单（三个点）
3. 选择"添加到主屏幕"或"安装应用"
4. 确认安装

#### iOS 设备
1. 使用 Safari 浏览器访问应用
2. 点击底部分享按钮（方框加箭头）
3. 向下滚动，选择"添加到主屏幕"
4. 点击"添加"确认

#### 桌面设备（Chrome/Edge）
1. 点击地址栏右侧的安装图标（+）
2. 或者点击右上角菜单 → "安装应用"
3. 确认安装

### 限制
- ⚠️ 需要在线连接才能访问后端 API 和数据库
- ⚠️ 离线时只能查看缓存的界面

---

## 💻 方案二：Electron 桌面应用

### 优点
- ✅ 完全离线运行
- ✅ 可以使用本地数据库
- ✅ 更好的性能和用户体验

### 需要的改动
1. 集成 Electron
2. 配置本地数据库（SQLite）
3. 修改所有 API 调用为本地函数调用

### 配置步骤（如需要）

#### 1. 安装 Electron
```bash
pnpm add -D electron electron-builder
```

#### 2. 创建 Electron 主进程
创建 `electron/main.ts`:
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL('http://localhost:5000');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

#### 3. 更新 package.json
```json
{
  "main": "electron/main.ts",
  "scripts": {
    "electron": "electron .",
    "build:electron": "electron-builder"
  }
}
```

---

## 📲 方案三：Capacitor Android 应用（需要后端服务器）

### 注意事项
- ⚠️ 应用需要连接到远程服务器（不是完全本地）
- ⚠️ 需要部署后端到云服务（如 Vercel、Railway 等）

### 构建步骤

#### 1. 构建静态版本
```bash
pnpm run build
```

#### 2. 同步到 Capacitor
```bash
npx cap sync android
```

#### 3. 构建 APK
```bash
cd android
./gradlew assembleDebug
```

#### 4. 生成的 APK 位置
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 修改 API 地址
需要将应用中的所有 API 调用改为指向远程服务器：

在应用中使用环境变量配置 API 地址：
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://your-server.com';
const response = await fetch(`${API_BASE}/api/trades`);
```

---

## 🚀 方案四：完全本地化（推荐用于个人使用）

### 架构
- 前端：Next.js（打包为 Electron 应用）
- 后端：Node.js Express（内嵌在 Electron 中）
- 数据库：SQLite（本地文件数据库）

### 优点
- ✅ 完全离线运行
- ✅ 数据存储在本地
- ✅ 无需云服务器
- ✅ 数据完全私有

### 实现步骤（概要）

#### 1. 修改数据库连接
将 PostgreSQL 改为 SQLite：
```bash
pnpm add better-sqlite3
```

#### 2. 创建本地 API
创建 `electron/server.js`:
```javascript
const express = require('express');
const Database = require('better-sqlite3');
const app = express();
const db = new Database('trades.db');

// 复用现有的 API 路由逻辑
app.use(express.json());
// ... 添加所有 API 路由

app.listen(3000, () => {
  console.log('Local server running on http://localhost:3000');
});
```

#### 3. 修改前端 API 地址
将所有 API 调用改为本地地址：
```typescript
const response = await fetch('http://localhost:3000/api/trades');
```

#### 4. 打包
```bash
pnpm run build
pnpm run build:electron
```

---

## 📝 当前推荐方案

### 快速方案（无需修改代码）
**使用 PWA** - 应用已支持，直接在浏览器中安装即可

### 完整本地化方案
**Electron + SQLite** - 需要进行以下工作：
1. 安装 Electron 和 SQLite
2. 修改数据库连接代码
3. 创建本地服务器
4. 测试并打包

### 如果只需要 Android 应用
**Capacitor + 云部署** - 需要部署后端到云服务

---

## 🛠️ 立即可用的操作

### 1. 安装为 PWA（推荐）
按照上方"方案一"的步骤操作即可

### 2. 测试 Electron 桌面应用
如果需要我帮你配置 Electron，请告诉我

### 3. 构建 Android APK
如果需要我帮你构建 APK，请确保：
- 应用已部署到云服务
- 或者接受应用需要连接到本地开发服务器的限制

---

## ❓ 常见问题

### Q: 为什么不能直接打包为本地应用？
A: 因为应用依赖后端服务器和数据库，需要连接才能使用。完全本地化需要修改架构。

### Q: 我的数据安全吗？
A:
- PWA: 数据存储在远程服务器，取决于服务器的安全性
- Electron 本地化: 数据存储在本地，完全私有

### Q: 如何选择方案？
A:
- 只想快速在手机上使用 → PWA
- 需要离线使用 → Electron 本地化
- 需要分享给他人 → Capacitor + 云部署

---

需要我帮你实现哪个方案？请告诉我你的具体需求。
