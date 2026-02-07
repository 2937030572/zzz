#!/bin/bash
set -Eeuo pipefail

# 重建数据库脚本
# 清除所有数据

FORCE=false

# 检查命令行参数
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
  FORCE=true
fi

echo "======================================"
echo "   数据库重建脚本"
echo "======================================"
echo ""
echo "⚠️  警告: 此操作将清除所有数据！"
echo ""

# 确认操作（除非使用 --force）
if [ "$FORCE" != true ]; then
  read -p "确认要清除所有数据吗？(yes/no): " confirm
  if [ "${confirm}" != "yes" ]; then
    echo "已取消操作"
    exit 0
  fi
fi

echo ""
echo "开始清除数据库..."
echo ""

# 1. 删除所有交易记录
echo "1. 获取交易列表..."
TRADES=$(curl -s http://localhost:5000/api/trades)
TRADE_COUNT=$(echo "${TRADES}" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "   找到 ${TRADE_COUNT} 条交易记录"

if [ "${TRADE_COUNT}" -gt 0 ]; then
  echo "   开始删除交易记录..."

  # 逐条删除交易
  echo "${TRADES}" | python3 -c "
import sys, json
trades = json.load(sys.stdin)
for trade in trades:
    trade_id = trade.get('id')
    if trade_id:
        print(trade_id)
" | while read -r trade_id; do
    echo "   - 删除交易: ${trade_id}"
    curl -s -X DELETE "http://localhost:5000/api/trades/${trade_id}" > /dev/null
  done

  echo "   ✓ 所有交易记录已删除"
else
  echo "   ✓ 没有交易记录需要删除"
fi

echo ""

# 2. 重置资产余额
echo "2. 重置资产余额..."
curl -s -X POST http://localhost:5000/api/balance \
  -H "Content-Type: application/json" \
  -d '{"amount":"0","withdrawalAmount":"0"}' > /dev/null

echo "   ✓ 资产余额已重置为 0"

echo ""
echo "======================================"
echo "   数据库重建完成！"
echo "======================================"
echo ""
echo "下一步: 使用备份文件恢复数据"
echo ""
echo "恢复命令:"
echo "  curl -X POST http://localhost:5000/api/data/restore \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d @backups/trade-backup-latest.json"
