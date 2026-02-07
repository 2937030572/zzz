# Electron 桌面应用使用指南

## 📱 什么是 Electron 应用？

Electron 是一个使用 JavaScript、HTML 和 CSS 构建跨平台桌面应用的框架。它允许你将 Web 应用打包为独立的桌面应用程序。

## 🚀 快速开始

### 开发模式（推荐）

开发模式下，应用将自动启动 Next.js 开发服务器和 Electron 窗口。

```bash
# 使用脚本启动
./scripts/electron-start.sh

# 或者直接使用 npm 命令
pnpm run electron:dev
```

**注意事项：**
- 应用将在开发模式下运行，支持热更新
- Next.js 开发服务器运行在 `http://localhost:5000`
- Electron 会自动连接到开发服务器
- 需要数据库服务正常运行

### 构建生产版本

构建生产版本的 Electron 应用：

```bash
# 使用脚本构建
./scripts/electron-build.sh

# 或者直接使用 npm 命令
pnpm run electron:dist
```

**构建产物：**
- **Windows**: `dist/交易记录 Setup 0.1.0.exe`（安装程序）
- **Windows**: `dist/交易记录 0.1.0.exe`（便携版）
- **macOS**: `dist/交易记录-0.1.0.dmg`
- **Linux**: `dist/交易记录-0.1.0.AppImage`
- **Linux**: `dist/trade-tracker_0.1.0_amd64.deb`

## 📋 系统要求

### 开发环境
- Node.js 24+
- pnpm 9.0+
- 操作系统：Windows、macOS 或 Linux

### 运行环境
- Windows 10 或更高版本
- macOS 10.13 (High Sierra) 或更高版本
- Linux（支持主流发行版：Ubuntu、Fedora、Debian 等）

## ⚙️ 配置说明

### 主进程配置

文件位置：`electron/main.ts`

主要配置项：
```typescript
{
  width: 1280,        // 窗口宽度
  height: 800,        // 窗口高度
  minWidth: 1024,     // 最小宽度
  minHeight: 600,     // 最小高度
  backgroundColor: '#0f172a',  // 背景颜色
  title: '交易记录',  // 窗口标题
}
```

### 构建配置

文件位置：`package.json` 中的 `build` 字段

支持的打包格式：
- **Windows**: NSIS（安装程序）、Portable（便携版）
- **macOS**: DMG（磁盘映像）
- **Linux**: AppImage、DEB、RPM

## 🔧 常见问题

### Q1: 启动时白屏或无法加载？

**解决方案：**
1. 确保开发服务器正在运行（`http://localhost:5000`）
2. 检查控制台是否有错误信息
3. 尝试重启开发服务器：`pnpm run electron:dev`

### Q2: 数据无法保存？

**解决方案：**
1. 确保数据库服务正常运行
2. 检查数据库连接配置
3. 查看 Electron 开发者工具中的网络请求

### Q3: 构建失败？

**解决方案：**
1. 清理构建缓存：`rm -rf dist out .next`
2. 重新安装依赖：`pnpm install`
3. 检查 Node.js 版本是否符合要求

### Q4: 如何在 Electron 中调试？

**解决方案：**
1. 开发模式会自动打开开发者工具
2. 使用快捷键：
   - Windows/Linux: `Ctrl + Shift + I`
   - macOS: `Cmd + Option + I`
3. 在开发者工具中查看 Console 和 Network 标签

### Q5: 能否离线使用？

**当前状态：**
- ❌ **不能完全离线** - 应用需要连接到后端服务器和数据库
- ✅ **界面可以缓存** - 开发模式下部分界面可以离线访问

**完全离线方案：**
需要将后端迁移到 Electron 内部（使用 SQLite），这需要大量代码修改。参考 `LOCAL_APP_GUIDE.md` 中的"方案四：完全本地化"。

## 📦 分发应用

### Windows

1. **NSIS 安装程序**（推荐）
   - 文件：`dist/交易记录 Setup 0.1.0.exe`
   - 优点：包含安装向导，支持自动更新
   - 使用：双击安装，按提示完成

2. **便携版**
   - 文件：`dist/交易记录 0.1.0.exe`
   - 优点：无需安装，直接运行
   - 使用：双击运行

### macOS

1. **DMG 磁盘映像**（推荐）
   - 文件：`dist/交易记录-0.1.0.dmg`
   - 使用：双击挂载，拖拽到 Applications 文件夹

### Linux

1. **AppImage**（通用）
   - 文件：`dist/交易记录-0.1.0.AppImage`
   - 使用：添加执行权限后运行
   ```bash
   chmod +x 交易记录-0.1.0.AppImage
   ./交易记录-0.1.0.AppImage
   ```

2. **DEB 包**（Debian/Ubuntu）
   - 文件：`dist/trade-tracker_0.1.0_amd64.deb`
   - 使用：`sudo dpkg -i trade-tracker_0.1.0_amd64.deb`

3. **RPM 包**（Fedora/RHEL）
   - 文件：`dist/trade-tracker-0.1.0.x86_64.rpm`
   - 使用：`sudo rpm -i trade-tracker-0.1.0.x86_64.rpm`

## 🎨 自定义应用图标

### 准备图标文件

1. 创建 `build/` 目录
2. 添加图标文件：
   - Windows: `build/icon.ico` (256x256)
   - macOS: `build/icon.icns`
   - Linux: `build/icon.png` (512x512)

### 更新配置

在 `package.json` 的 `build` 字段中添加：
```json
{
  "build": {
    "icon": "build/icon.png",
    "win": {
      "icon": "build/icon.ico"
    },
    "mac": {
      "icon": "build/icon.icns"
    }
  }
}
```

## 🚀 部署到生产环境

### 方案一：云端部署

应用仍然需要连接到远程服务器：

1. 部署 Next.js 应用到云服务（Vercel、Railway 等）
2. 修改 `electron/main.ts` 中的加载 URL：
   ```typescript
   // 生产模式
   mainWindow.loadURL('https://your-app.vercel.app');
   ```
3. 构建并分发 Electron 应用

### 方案二：内嵌后端（高级）

将后端完全内嵌到 Electron 中：

1. 使用 Express 创建本地服务器
2. 将 PostgreSQL 改为 SQLite
3. 修改所有 API 调用为本地地址
4. 打包时包含所有依赖

⚠️ **此方案需要大量代码修改**，参考 `LOCAL_APP_GUIDE.md`。

## 📞 技术支持

如遇到问题：
1. 查看开发者工具中的错误信息
2. 检查 `LOCAL_APP_GUIDE.md` 中的常见问题
3. 查看 Electron 官方文档：https://www.electronjs.org/docs

## 📝 许可证

本应用使用 MIT 许可证。
