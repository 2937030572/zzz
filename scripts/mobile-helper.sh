#!/bin/bash

echo "=========================================="
echo "  交易记录 APP - 移动端打包助手"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未安装 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ pnpm 版本: $(pnpm -v)"
echo ""

# 询问用户选择
echo "请选择操作："
echo "1) 同步 Capacitor 项目"
echo "2) 打开 Android Studio（打包 Android APK）"
echo "3) 打开 Xcode（打包 iOS App）"
echo "4) 构建生产版本"
echo "5) 查看快速开始指南"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔄 正在同步 Capacitor 项目..."
        pnpm run cap:sync
        echo "✅ 同步完成！"
        ;;
    2)
        echo ""
        echo "📱 正在打开 Android Studio..."
        pnpm run cap:android
        ;;
    3)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo ""
            echo "🍎 正在打开 Xcode..."
            pnpm run cap:ios
        else
            echo "❌ iOS 开发需要 macOS 系统"
            exit 1
        fi
        ;;
    4)
        echo ""
        echo "🏗️  正在构建生产版本..."
        pnpm run build
        echo "✅ 构建完成！"
        echo ""
        echo "📦 下一步："
        echo "   运行: pnpm run cap:sync"
        echo "   然后: pnpm run cap:android (Android) 或 pnpm run cap:ios (iOS)"
        ;;
    5)
        echo ""
        echo "📖 快速开始指南："
        echo ""
        cat QUICK_START.md
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "✨ 完成！"
