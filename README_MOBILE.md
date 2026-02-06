# 📱 交易记录 APP - 移动端版本

您的交易记录应用现在已经支持移动端！

## ✨ 新增功能

### 📲 移动端优化
- ✅ 响应式设计，完美适配手机屏幕
- ✅ 触摸友好的交互界面
- ✅ 移动端优化的交易卡片布局
- ✅ 底部悬浮的快速添加按钮
- ✅ 侧边抽屉式的表单（移动端）
- ✅ 更紧凑的统计卡片

### 🎨 PWA 支持
- ✅ 可添加到主屏幕
- ✅ 离线缓存能力
- ✅ 类似原生应用的体验
- ✅ 应用图标和启动画面

### 📦 原生应用支持
- ✅ Android APK 打包
- ✅ iOS App 打包
- ✅ 使用 Capacitor 框架
- ✅ 完整的原生应用体验

---

## 🚀 快速开始

### 方案 1: 使用 PWA（最简单，3分钟）

```bash
# 部署到 Vercel
pnpm add -g vercel
vercel login
vercel

# 在手机浏览器打开，然后"添加到主屏幕"
```

### 方案 2: 打包 Android APK

```bash
# 同步项目
pnpm run cap:sync

# 打开 Android Studio
pnpm run cap:android

# 在 Android Studio 中构建 APK
```

### 方案 3: 打包 iOS App

```bash
# 同步项目
pnpm run cap:sync

# 打开 Xcode
pnpm run cap:ios

# 在 Xcode 中运行
```

---

## 📱 在手机上使用

### PWA 方式
1. 在手机浏览器打开应用 URL
2. 点击浏览器菜单
3. 选择"添加到主屏幕"或"安装应用"
4. 应用图标会出现在主屏幕

### 原生应用方式
1. 构建 APK 或 IPA 文件
2. 传输到手机并安装
3. 像普通应用一样使用

---

## ⚠️ 重要提示

### 数据库连接

**当前应用使用本地数据库，移动应用无法直接访问！**

必须先将应用部署到服务器：

```bash
# 部署到 Vercel（免费）
vercel --prod
```

然后修改 Capacitor 配置中的服务器地址：

```typescript
// capacitor.config.ts
server: {
  url: 'https://your-app.vercel.app',
  androidScheme: 'https',
}
```

---

## 🛠️ 自定义应用

### 修改应用名称和图标

编辑 `capacitor.config.ts`:

```typescript
{
  appId: 'com.tracker.traderecords',  // 包名
  appName: '交易记录',                    // 应用名称
}
```

### 准备应用图标

1. 创建 1024x1024 像素的 PNG 图标
2. 使用工具生成多尺寸图标：https://icon.kitchen/
3. 替换项目中的图标文件

---

## 📚 详细文档

- **快速开始**: 查看 `QUICK_START.md`
- **完整指南**: 查看 `MOBILE_APP_GUIDE.md`
- **配置助手**: 运行 `./scripts/mobile-helper.sh`

---

## 🎯 推荐使用流程

### 个人使用
1. ✅ 部署到 Vercel
2. ✅ 使用 PWA（添加到主屏幕）

### 分享给朋友
1. ✅ 打包成 Android APK
2. ✅ 传输给朋友安装

### 发布到应用商店
1. ✅ 配置应用图标和信息
2. ✅ 生成签名的 APK/IPA
3. ✅ 提交到 Google Play / App Store

---

## 🔧 技术栈

- **框架**: Next.js 16 + React 19
- **移动端**: Capacitor 8
- **UI 组件**: shadcn/ui
- **样式**: Tailwind CSS 4
- **数据库**: PostgreSQL + Drizzle ORM

---

## 📞 需要帮助？

1. 查看 `MOBILE_APP_GUIDE.md` 获取详细教程
2. 查看 `QUICK_START.md` 快速上手
3. 运行 `./scripts/mobile-helper.sh` 获取交互式帮助

---

## ✨ 移动端截图预览

- **首页**: 显示交易统计和列表
- **添加交易**: 侧边抽屉式表单
- **交易卡片**: 紧凑的移动端布局
- **底部按钮**: 快速添加按钮

---

## 🎉 开始使用

```bash
# 查看快速开始指南
cat QUICK_START.md

# 使用配置助手
./scripts/mobile-helper.sh

# 同步 Capacitor
pnpm run cap:sync
```

**享受您的交易记录移动应用！** 📱💰
