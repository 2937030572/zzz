# 📱 如何获取 APK 安装包

由于当前环境缺少 Android SDK，你需要在你的电脑上构建 APK。以下是详细的步骤：

## 🎯 方法 1: 在你的电脑上构建（推荐）

### 前置要求

在开始之前，你需要安装：

1. **Java Development Kit (JDK)**
   - 下载: https://www.oracle.com/java/technologies/downloads/
   - 推荐版本: JDK 11 或 17
   - 安装后设置环境变量 `JAVA_HOME`

2. **Android Studio**
   - 下载: https://developer.android.com/studio
   - 安装时会自动安装 Android SDK

3. **Node.js 和 pnpm**
   - 确保已安装 Node.js (v18+)
   - 安装 pnpm: `npm install -g pnpm`

---

## 🚀 详细构建步骤

### 步骤 1: 下载项目代码

将整个项目文件夹复制到你的电脑。

### 步骤 2: 安装依赖

在项目根目录运行：

```bash
pnpm install
```

### 步骤 3: 同步 Capacitor

```bash
pnpm run cap:sync
```

### 步骤 4: 打开 Android Studio

```bash
pnpm run cap:android
```

这会自动打开 Android Studio 并加载项目。

### 步骤 5: 在 Android Studio 中构建 APK

1. 等待 Gradle 同步完成（首次需要几分钟）
2. 点击顶部菜单：**Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
3. 等待构建完成（首次可能需要 5-10 分钟）
4. 构建成功后会弹出通知，点击 **locate**
5. APK 文件位置：`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🎯 方法 2: 使用命令行构建（高级）

如果你已经配置好了环境变量，也可以使用命令行：

```bash
# 进入项目目录
cd /path/to/your/project

# 进入 Android 目录
cd android

# 构建 Debug APK
./gradlew assembleDebug

# APK 位置
ls android/app/build/outputs/apk/debug/
```

---

## 📥 如何下载到手机

### 方案 A: USB 数据线

1. **在手机上开启 USB 调试**
   - 设置 > 关于手机 > 连续点击"版本号" 7 次
   - 返回设置 > 开发者选项 > 开启 USB 调试

2. **通过 ADB 安装**
   ```bash
   # 连接手机到电脑
   adb devices  # 确认设备已连接

   # 安装 APK
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### 方案 B: 文件传输

1. 将 APK 文件复制到手机存储
2. 在手机文件管理器中找到 APK 文件
3. 点击安装（需要允许安装未知来源应用）

### 方案 C: 在线传输

1. 上传 APK 到云盘（如百度网盘、Google Drive）
2. 在手机上下载并安装

---

## ⚠️ 重要提示

### 数据库连接问题

**当前应用使用本地数据库，APK 无法直接使用！**

你必须先：

1. **部署应用到服务器**
   ```bash
   # 使用 Vercel 部署（推荐）
   vercel --prod

   # 或者部署到你自己的服务器
   ```

2. **修改 Capacitor 配置**

   编辑 `capacitor.config.ts`:

   ```typescript
   server: {
     url: 'https://your-app.vercel.app', // 替换为你的服务器地址
     androidScheme: 'https',
   }
   ```

3. **重新构建 APK**
   ```bash
   pnpm run cap:sync
   # 然后在 Android Studio 中重新构建
   ```

---

## 🎯 方法 3: 使用在线构建服务

如果你不想安装 Android Studio，可以使用以下服务：

### 1. GitHub Actions（推荐）

在你的 GitHub 仓库中创建 `.github/workflows/build-android.yml`:

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install pnpm
      run: npm install -g pnpm

    - name: Install dependencies
      run: pnpm install

    - name: Build project
      run: pnpm run build

    - name: Sync Capacitor
      run: pnpm run cap:sync

    - name: Build APK
      working-directory: ./android
      run: ./gradlew assembleDebug

    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: app-debug
        path: android/app/build/outputs/apk/debug/app-debug.apk
```

### 2. Expo Application Services

- 网站: https://expo.dev/
- 可以从 Web 项目构建 APK
- 每月有免费额度

### 3. AppCenter

- 网站: https://appcenter.ms/
- 微软提供的构建服务
- 支持自动构建

---

## 📋 检查清单

在下载 APK 之前，确保：

- [ ] 应用已部署到服务器（非本地）
- [ ] Capacitor 配置中的服务器地址正确
- [ ] 数据库可通过公网访问
- [ ] 已测试 Web 版本功能正常

---

## 🔧 常见问题

**Q: 构建失败，提示缺少 SDK？**
- A: 打开 Android Studio，SDK Manager，安装所需 SDK

**Q: APK 安装后无法连接数据库？**
- A: 必须先部署到服务器，APK 无法访问 localhost

**Q: 没有 Mac，能构建 iOS 吗？**
- A: iOS 构建必须使用 Mac 和 Xcode

**Q: 可以直接分享 APK 吗？**
- A: 可以，但需要先解决数据库连接问题

---

## 💡 推荐方案

**最快的方式（5分钟）：**
1. 部署到 Vercel
2. 使用 PWA（添加到手机主屏幕）

**最完整的方式（1小时）：**
1. 在电脑上安装 Android Studio
2. 按照"方法 1"构建 APK
3. 部署应用到服务器
4. 重新构建 APK

**最省心的方式：**
1. 将代码推送到 GitHub
2. 使用 GitHub Actions 自动构建
3. 从构建 artifacts 下载 APK

---

## 📞 需要帮助？

1. 查看 `MOBILE_APP_GUIDE.md` 获取完整教程
2. 查看 `QUICK_START.md` 快速上手
3. 如果遇到问题，可以尝试使用 PWA 方式

---

## 🎯 立即开始

**最快使用方式（不需要 APK）：**
```bash
# 部署到 Vercel
vercel --prod

# 在手机浏览器打开 URL
# 添加到主屏幕即可
```
