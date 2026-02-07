#!/bin/bash
set -Eeuo pipefail

# 数据备份脚本
# 备份交易记录和资产余额数据

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
BACKUP_DIR="${COZE_WORKSPACE_PATH}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/trade-backup-${TIMESTAMP}.json"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

echo "开始备份数据..."

# 获取交易数据
TRADES=$(curl -s http://localhost:5000/api/trades)
echo "已获取交易数据"

# 获取资产余额
BALANCE=$(curl -s http://localhost:5000/api/balance)
echo "已获取资产余额数据"

# 创建备份数据
cat > "${BACKUP_FILE}" << EOF
{
  "version": "1.0",
  "exportedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "development",
  "data": {
    "balance": ${BALANCE},
    "trades": ${TRADES}
  },
  "summary": {
    "totalTrades": $(echo "${TRADES}" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0"),
    "backupFile": "${BACKUP_FILE}"
  }
}
EOF

echo "备份完成！"
echo "备份文件: ${BACKUP_FILE}"
echo ""

# 显示备份信息
python3 -m json.tool "${BACKUP_FILE}" | head -30
echo "..."
echo "完整备份信息请查看: ${BACKUP_FILE}"

# 创建最新备份的符号链接
ln -sf "${BACKUP_FILE}" "${BACKUP_DIR}/trade-backup-latest.json"
echo "已创建最新备份链接: ${BACKUP_DIR}/trade-backup-latest.json"
