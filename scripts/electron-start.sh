#!/bin/bash
set -e

echo "======================================"
echo "   交易记录 - Electron 桌面应用"
echo "======================================"
echo ""
echo "🚀 启动 Electron 桌面应用..."
echo ""
echo "注意："
echo "1. 应用将自动启动 Next.js 开发服务器（端口 5000）"
echo "2. 请确保数据库服务正常运行"
echo "3. 如果遇到问题，请检查日志文件"
echo ""
echo "======================================"
echo ""

# 启动 Electron 开发模式
pnpm run electron:dev
