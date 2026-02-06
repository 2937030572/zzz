# 交易记录 APP 打包指南

本指南将帮助你将交易记录应用打包成 Android 和 iOS 移动应用。

## 📱 前置要求

### Android 打包
- Android Studio（最新版本）
- Android SDK（API Level 33+）
- Java Development Kit (JDK) 11 或更高版本
- Android 设备或模拟器用于测试

### iOS 打包
- macOS 系统
- Xcode 14 或更高版本
- CocoaPods（`gem install cocoapods`）
- iOS 设备或模拟器用于测试

## 🚀 快速开始

### 步骤 1: 同步 Capacitor

在项目根目录运行：

```bash
pnpm run cap:sync
```

这将会：
- 创建 `android` 和 `ios` 目录（如果不存在）
- 将 Web 资源复制到原生项目
- 配置原生项目设置

### 步骤 2: 打开原生项目

**Android:**
```bash
pnpm run cap:android
```

**iOS:**
```bash
pnpm run cap:ios
```

这会在 Android Studio 或 Xcode 中打开项目。

## 📦 Android 打包详细步骤

### 1. 使用 Android Studio

1. 运行 `pnpm run cap:android` 打开 Android Studio
2. 等待 Gradle 同步完成
3. 选择 `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. 构建完成后，点击通知中的 "locate" 链接找到 APK 文件
5. APK 文件位置：`android/app/build/outputs/apk/debug/app-debug.apk`

### 2. 生成签名的 APK（用于发布）

1. 在 Android Studio 中：`Build > Generate Signed Bundle / APK`
2. 选择 "APK"，点击 Next
3. 创建新的密钥库文件（.jks）或使用现有的：
   - Key store path: 选择保存路径
   - Passwords: 设置密钥库和密钥密码
   - Key alias: 输入别名
4. 选择 "release" 构建变体
5. 点击 Finish
6. 签名的 APK 将生成在 `android/app/build/outputs/apk/release/`

### 3. 使用命令行构建

```bash
# 进入 Android 目录
cd android

# 构建 Debug APK
./gradlew assembleDebug

# 构建 Release APK（需要先配置签名）
./gradlew assembleRelease

# 返回项目根目录
cd ..
```

## 🍎 iOS 打包详细步骤

### 1. 使用 Xcode

1. 运行 `pnpm run cap:ios` 打开 Xcode
2. 选择目标设备（模拟器或真机）
3. 点击 Product > Run（Cmd + R）运行应用
4. 点击 Product > Archive（Cmd + Shift + B）创建归档

### 2. 分发应用

1. 归档完成后，Xcode Organizer 会自动打开
2. 选择你的归档
3. 点击 "Distribute App"
4. 选择分发方式：
   - **App Store Connect**: 上传到 App Store
   - **Ad Hoc**: 用于内部测试
   - **Enterprise**: 企业分发
   - **Development**: 开发测试

### 3. 安装测试

使用 Xcode 直接安装到设备：
1. 连接 iPhone/iPad
2. 在 Xcode 中选择设备
3. 点击 Product > Run
4. 首次需要信任开发者证书：设置 > 通用 > VPN与设备管理 > 信任

## 🎨 自定义应用

### 修改应用名称和图标

1. **应用名称**: 编辑 `capacitor.config.ts` 中的 `appName`
2. **应用ID**: 编辑 `capacitor.config.ts` 中的 `appId`
3. **应用图标**:
   - 准备一个 1024x1024 像素的 PNG 图标
   - 使用工具生成不同尺寸：https://icon.kitchen/
   - 替换 `android/app/src/main/res/` 下的图标文件
   - 在 Xcode 中替换 iOS 的 AppIcon 资源

### 修改启动画面

编辑 `capacitor.config.ts` 中的 `SplashScreen` 配置：

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 3000,
    launchAutoHide: true,
    backgroundColor: '#0f172a',
    showSpinner: false,
    spinnerColor: '#ffffff',
  },
}
```

## 🔧 常见问题

### 1. 构建失败：缺少 Android SDK

**解决方案：**
- 打开 Android Studio
- SDK Manager > SDK Platforms > 安装 Android 13.0 (API 33)
- SDK Manager > SDK Tools > 安装 Android SDK Build-Tools

### 2. iOS 构建失败：签名问题

**解决方案：**
- Xcode > 选择项目 > Signing & Capabilities
- 勾选 "Automatically manage signing"
- 选择你的开发团队

### 3. 应用无法连接数据库

**解决方案：**
- 应用使用相对路径 `/api/trades`
- 确保应用在本地服务器上运行（localhost:5000）
- 如果部署到服务器，需要修改 API 基础路径
- 在移动设备上，需要使用服务器的公网地址

### 4. 数据库连接配置

当前应用使用 PostgreSQL 数据库，需要：

1. **部署到云服务器**（推荐）:
   - 将应用部署到 Vercel、Netlify 或自己的服务器
   - 确保数据库可通过网络访问
   - 在生产环境中使用环境变量配置数据库连接

2. **使用本地数据库**（仅限局域网）:
   - 确保手机和开发电脑在同一网络
   - 使用电脑的局域网 IP 地址访问 API
   - 配置防火墙允许数据库端口访问

## 🌐 部署到服务器

为了让移动应用可以访问，建议将应用部署到云服务器：

### Vercel 部署（免费）

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

### 其他云服务

- **Netlify**: 免费托管静态网站
- **Railway**: 支持数据库的托管平台
- **Supabase**: 提供 PostgreSQL 和 API 托管

## 📝 注意事项

1. **数据库连接**: 移动应用无法直接访问本地数据库，必须部署到服务器
2. **API 路径**: 部署后可能需要修改 API 的基础 URL
3. **环境变量**: 确保数据库连接字符串在部署环境中正确配置
4. **HTTPS**: 生产环境必须使用 HTTPS 以保护数据安全

## 🆚 两种方案对比

### 方案 A: PWA（渐进式 Web 应用）

**优点：**
- 无需应用商店审核
- 跨平台兼容
- 更新即时
- 开发成本低

**缺点：**
- 功能受限（无法访问某些原生功能）
- 用户体验不如原生应用
- 需要网络连接

**使用方法：**
1. 将应用部署到服务器
2. 在手机浏览器中打开网站
3. 点击"添加到主屏幕"

### 方案 B: 原生应用（Capacitor）

**优点：**
- 完整的原生体验
- 可访问设备功能
- 可在应用商店分发

**缺点：**
- 需要应用商店审核
- 开发和部署成本高
- 更新需要审核流程

## 📚 参考资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 开发指南](https://developer.android.com/docs)
- [iOS 开发指南](https://developer.apple.com/documentation/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)

## 🎯 推荐流程

对于个人使用或内部测试：

1. ✅ 使用 PWA 方案（最简单）
2. ✅ 部署到 Vercel（免费）
3. ✅ 在手机浏览器中使用

准备发布到应用商店：

1. ✅ 配置应用图标和启动画面
2. ✅ 生成签名的 APK/IPA
3. ✅ 准备应用商店素材
4. ✅ 提交审核

## 💡 提示

- 首次打包建议先测试 Debug 版本
- 在真机上测试所有功能
- 准备多尺寸的应用图标
- 测试不同屏幕尺寸的显示效果
- 确保网络请求在移动网络下正常工作

## 📞 获取帮助

遇到问题可以：
1. 查看 Capacitor 文档
2. 搜索 Stack Overflow
3. 检查 Android/iOS 构建日志
