# 🚀 快速打包指南

## 最简单的方法（3分钟完成）

### 方案 1: 使用 PWA（推荐，无需打包）

**步骤：**
1. 部署应用到服务器（如 Vercel）
2. 在手机浏览器打开应用
3. 点击"添加到主屏幕"

**部署到 Vercel:**
```bash
pnpm add -g vercel
vercel login
vercel
```

---

### 方案 2: 打包成 Android APK

**步骤：**
```bash
# 1. 同步 Capacitor
pnpm run cap:sync

# 2. 打开 Android Studio
pnpm run cap:android

# 3. 在 Android Studio 中：
#    - 等待同步完成
#    - 点击 Build > Build Bundle(s) / APK(s) > Build APK(s)
#    - APK 文件在 android/app/build/outputs/apk/debug/
```

**安装到手机：**
```bash
# 使用 adb 安装（需要开启 USB 调试）
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 方案 3: 打包成 iOS App

**要求：** macOS + Xcode

**步骤：**
```bash
# 1. 同步 Capacitor
pnpm run cap:sync

# 2. 打开 Xcode
pnpm run cap:ios

# 3. 在 Xcode 中：
#    - 选择设备
#    - 点击 Product > Run（Cmd + R）
```

---

## ⚠️ 重要提示

### 数据库连接问题

**当前应用使用本地数据库，移动应用无法访问！**

**解决方案：**

1. **部署到云端服务器（推荐）**
   ```bash
   # 使用 Vercel 部署（免费）
   vercel --prod
   ```

2. **修改 API 基础路径**
   - 在代码中找到 `/api/trades`
   - 替换为服务器地址，如 `https://your-app.vercel.app/api/trades`

3. **使用网络数据库**
   - 配置数据库可通过公网访问
   - 使用环境变量管理数据库连接字符串

---

## 🎨 自定义应用信息

编辑 `capacitor.config.ts`:

```typescript
{
  appId: 'com.tracker.traderecords',  // 包名
  appName: '交易记录',                    // 应用名称
}
```

---

## 📱 测试应用

### 使用 PWA 测试
1. 在浏览器打开 `http://localhost:5000`
2. 检查响应式布局
3. 测试所有功能

### 使用 Android 模拟器测试
```bash
# 启动模拟器
pnpm run cap:android

# 在模拟器中运行
# Android Studio > Run > Run app
```

---

## 🔧 常见问题

**Q: APK 构建失败？**
- A: 确保安装了 Android SDK 和 Java JDK

**Q: iOS 需要付费账号？**
- A: 测试不需要，只需个人 Apple ID。发布到 App Store 需要 $99/年

**Q: 应用无法连接数据库？**
- A: 必须部署到服务器，手机无法访问 localhost 数据库

**Q: PWA 无法安装？**
- A: 确保使用 HTTPS，并在浏览器中点击"添加到主屏幕"

---

## 📚 详细文档

查看 `MOBILE_APP_GUIDE.md` 获取完整指南。

---

## 💡 推荐方案

**个人使用：** PWA（部署到 Vercel）
**分享给朋友：** Android APK
**发布到商店：** 完整的 Android/iOS 应用
