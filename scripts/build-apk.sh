#!/bin/bash

# Android APK 构建脚本
# 使用此脚本在你的电脑上构建 APK

echo "=========================================="
echo "  交易记录 APP - APK 构建脚本"
echo "=========================================="
echo ""

# 检查 Java
if ! command -v java &> /dev/null; then
    echo "❌ 错误：未安装 Java"
    echo ""
    echo "请安装 JDK:"
    echo "1. 下载: https://www.oracle.com/java/technologies/downloads/"
    echo "2. 安装 JDK 11 或 17"
    echo "3. 设置环境变量 JAVA_HOME"
    exit 1
fi

echo "✅ Java 版本: $(java -version 2>&1 | head -n 1)"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    pnpm install
fi

# 检查是否已添加 Android 平台
if [ ! -d "android" ]; then
    echo "📱 正在添加 Android 平台..."
    npx cap add android
fi

# 同步 Capacitor
echo "🔄 正在同步 Capacitor..."
pnpm run cap:sync

# 进入 Android 目录
cd android

# 构建 APK
echo "🏗️  正在构建 Debug APK..."
echo "这可能需要 5-10 分钟，请耐心等待..."
echo ""

./gradlew assembleDebug

# 检查构建结果
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo ""
    echo "✅ 构建成功！"
    echo ""
    echo "📦 APK 位置: $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📥 如何安装到手机："
    echo "   方法 1: adb install app/build/outputs/apk/debug/app-debug.apk"
    echo "   方法 2: 复制 APK 到手机存储并安装"
    echo "   方法 3: 上传到云盘下载安装"
    echo ""
    echo "⚠️  重要提示："
    echo "   当前 APK 使用本地数据库，需要先部署到服务器才能使用"
    echo "   查看 BUILD_APK_GUIDE.md 了解详情"
    echo ""
else
    echo ""
    echo "❌ 构建失败"
    echo "请检查错误信息并重试"
    exit 1
fi
