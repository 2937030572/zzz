# 📥 下载安装包

由于当前环境缺少 Android 开发工具，无法直接生成 APK 文件。请选择以下方式之一：

## 🚀 最快方式：使用 PWA（5分钟，无需下载）

```bash
# 1. 部署到 Vercel（免费）
vercel --prod

# 2. 在手机浏览器打开 URL
# 3. 点击"添加到主屏幕"
```

**优点：**
- ✅ 无需下载安装包
- ✅ 即用即走
- ✅ 自动更新
- ✅ 省存储空间

---

## 📦 方式 1: 在你的电脑上构建 APK

### 步骤：

1. **下载项目代码**
   - 复制整个项目到你的电脑

2. **安装必要工具**
   - [下载 JDK 11+](https://www.oracle.com/java/technologies/downloads/)
   - [下载 Android Studio](https://developer.android.com/studio)

3. **运行构建脚本**
   ```bash
   # 在项目根目录
   ./scripts/build-apk.sh
   ```

4. **找到 APK 文件**
   - 位置：`android/app/build/outputs/apk/debug/app-debug.apk`

5. **安装到手机**
   ```bash
   # 使用 ADB（需要 USB 调试）
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
   - 或者复制 APK 到手机存储手动安装

**⚠️ 重要：**
- 必须先部署应用到服务器（APK 无法访问本地数据库）
- 修改 `capacitor.config.ts` 中的服务器地址
- 重新构建 APK

查看详细指南：`BUILD_APK_GUIDE.md`

---

## 🔗 方式 2: 使用在线构建服务

### GitHub Actions（自动化）

1. 将代码推送到 GitHub
2. 创建 `.github/workflows/build-android.yml`（见 `BUILD_APK_GUIDE.md`）
3. 自动构建后从 artifacts 下载 APK

### 其他服务
- [Expo Application Services](https://expo.dev/)
- [AppCenter](https://appcenter.ms/)

---

## 🍎 iOS App

需要 Mac + Xcode：

```bash
pnpm run cap:ios
# 在 Xcode 中运行或打包
```

---

## 📚 文档

- **构建指南**: `BUILD_APK_GUIDE.md` - 详细构建步骤
- **移动端指南**: `MOBILE_APP_GUIDE.md` - 完整移动端教程
- **快速开始**: `QUICK_START.md` - 3分钟快速上手
- **下载页面**: `DOWNLOAD.html` - 图文版下载说明

---

## 💡 推荐流程

**个人使用：** PWA（部署到 Vercel）
**分享给朋友：** 在电脑上构建 APK
**自动构建：** GitHub Actions
**发布到商店：** 完整的签名 APK/IPA

---

## ⚠️ 重要提醒

**当前应用使用本地数据库，APK 无法直接使用！**

必须先部署到服务器：

```bash
# 1. 部署应用
vercel --prod

# 2. 修改 capacitor.config.ts
# server.url = "https://your-app.vercel.app"

# 3. 重新构建 APK
pnpm run cap:sync
```

---

## 🎯 立即开始

**最快（5分钟）：**
```bash
vercel --prod
# 然后在手机浏览器打开 URL
```

**最完整（1小时）：**
```bash
./scripts/build-apk.sh
```

---

## 📞 需要帮助？

查看 `BUILD_APK_GUIDE.md` 获取详细步骤和故障排除。
