#!/bin/bash
set -e

echo "======================================"
echo "   构建 Electron 桌面应用"
echo "======================================"
echo ""
echo "🔨 开始构建..."
echo ""

# 检查是否需要构建 Next.js
if [ ! -d "out" ] || [ "$1" = "--force" ]; then
  echo "📦 构建 Next.js 应用..."
  pnpm run build
fi

# 编译 Electron TypeScript 文件
echo "⚙️  编译 Electron TypeScript..."
tsc -p tsconfig.electron.json

# 构建 Electron 应用
echo "🏗️  构建 Electron 应用..."
pnpm run electron:dist

echo ""
echo "======================================"
echo "   构建完成！"
echo "======================================"
echo ""
echo "安装包位置："
echo "  - Windows: dist/*.exe"
echo "  - macOS: dist/*.dmg"
echo "  - Linux: dist/*.AppImage"
echo ""
echo "======================================"
