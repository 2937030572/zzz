#!/bin/bash
set -Eeuo pipefail

# 导出 SQL 插入脚本（简化版）
# 生成可以直接在数据库中执行的 SQL 语句

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
BACKUP_DIR="${COZE_WORKSPACE_PATH}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SQL_FILE="${BACKUP_DIR}/trade-import-${TIMESTAMP}.sql"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

echo "开始生成 SQL 导入脚本..."

# 生成 SQL 文件
cat > "${SQL_FILE}" << 'EOF'
-- 交易记录数据导入脚本
-- 生成时间: 自动
-- 环境信息:
--   数据库: PostgreSQL
--   集成: coze-coding-dev-sdk

-- 开始事务
BEGIN;

-- 插入/更新资产余额
EOF

# 添加资产余额的 INSERT 语句
curl -s http://localhost:5000/api/balance | python3 << 'PYTHON_SCRIPT'
import sys
import json

balance_data = json.load(sys.stdin)

if balance_data and balance_data.get('id'):
    amount = balance_data.get('amount', '0')
    withdrawal = balance_data.get('withdrawalAmount', '0')
    created_at = balance_data.get('createdAt', 'NOW()')
    updated_at = balance_data.get('updatedAt', 'NOW()')

    sql = f"""
INSERT INTO balance (id, amount, withdrawal_amount, created_at, updated_at)
VALUES (
  '{balance_data['id']}',
  {amount},
  {withdrawal},
  '{created_at}',
  '{updated_at}'
)
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  withdrawal_amount = EXCLUDED.withdrawal_amount,
  updated_at = EXCLUDED.updated_at;
"""
    print(sql)
else:
    print("-- 没有资产余额数据")
PYTHON_SCRIPT >> "${SQL_FILE}"

echo "" >> "${SQL_FILE}"
echo "-- 插入交易记录" >> "${SQL_FILE}"

# 添加交易记录的 INSERT 语句
curl -s http://localhost:5000/api/trades | python3 << 'PYTHON_SCRIPT'
import sys
import json
import uuid

trades_data = json.load(sys.stdin)

if trades_data:
    for trade in trades_data:
        id_val = trade.get('id', str(uuid.uuid4()))
        symbol = trade.get('symbol', '').replace("'", "''")
        direction = trade.get('direction', '').replace("'", "''")
        entry_price = trade.get('entryPrice', '0')
        exit_price = trade.get('exitPrice')
        quantity = trade.get('quantity', '0')
        strategy = trade.get('strategySummary', '').replace("'", "''")
        trade_level = trade.get('tradeLevel', 'A')
        position_size = trade.get('positionSize', '10%').replace("'", "''")
        profit_loss = trade.get('profitLoss')
        exit_reason = trade.get('exitReason')
        entry_time = trade.get('entryTime', 'NOW()')
        exit_time = trade.get('exitTime')
        notes = trade.get('notes')
        is_closed = trade.get('isClosed', False)
        created_at = trade.get('createdAt', 'NOW()')
        updated_at = trade.get('updatedAt')

        exit_price_str = f"'{exit_price}'" if exit_price and exit_price != 'null' else 'NULL'
        profit_loss_str = f"'{profit_loss}'" if profit_loss and profit_loss != 'null' else 'NULL'
        exit_time_str = f"'{exit_time}'" if exit_time and exit_time != 'null' else 'NULL'
        exit_reason_str = f"'{exit_reason}'" if exit_reason and exit_reason != 'null' else 'NULL'
        notes_str = f"'{notes}'" if notes and notes != 'null' else 'NULL'
        updated_at_str = f"'{updated_at}'" if updated_at and updated_at != 'null' else 'NULL'

        sql = f"""
INSERT INTO trades (
  id, symbol, direction, entry_price, exit_price, quantity,
  strategy_summary, trade_level, position_size, profit_loss,
  exit_reason, entry_time, exit_time, notes, is_closed,
  created_at, updated_at
) VALUES (
  '{id_val}',
  '{symbol}',
  '{direction}',
  {entry_price},
  {exit_price_str},
  {quantity},
  '{strategy}',
  '{trade_level}',
  '{position_size}',
  {profit_loss_str},
  {exit_reason_str},
  '{entry_time}',
  {exit_time_str},
  {notes_str},
  {str(is_closed).lower()},
  '{created_at}',
  {updated_at_str}
)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  direction = EXCLUDED.direction,
  entry_price = EXCLUDED.entry_price,
  exit_price = EXCLUDED.exit_price,
  quantity = EXCLUDED.quantity,
  strategy_summary = EXCLUDED.strategy_summary,
  trade_level = EXCLUDED.trade_level,
  position_size = EXCLUDED.position_size,
  profit_loss = EXCLUDED.profit_loss,
  exit_reason = EXCLUDED.exit_reason,
  entry_time = EXCLUDED.entry_time,
  exit_time = EXCLUDED.exit_time,
  notes = EXCLUDED.notes,
  is_closed = EXCLUDED.is_closed,
  updated_at = EXCLUDED.updated_at;
"""
        print(sql)
else:
    print("-- 没有交易记录数据")
PYTHON_SCRIPT >> "${SQL_FILE}"

echo "" >> "${SQL_FILE}"
echo "-- 提交事务" >> "${SQL_FILE}"
echo "COMMIT;" >> "${SQL_FILE}"

echo "" >> "${SQL_FILE}"
echo "-- 导入完成验证" >> "${SQL_FILE}"
echo "SELECT COUNT(*) as total_trades FROM trades;" >> "${SQL_FILE}"
echo "SELECT COUNT(*) as total_balance FROM balance;" >> "${SQL_FILE}"

echo "SQL 导入脚本生成完成！"
echo "SQL 文件: ${SQL_FILE}"
echo ""

# 显示部分内容
head -30 "${SQL_FILE}"
echo "..."
echo "完整 SQL 脚本请查看: ${SQL_FILE}"

# 创建最新 SQL 的符号链接
ln -sf "${SQL_FILE}" "${BACKUP_DIR}/trade-import-latest.sql"
echo "已创建最新 SQL 链接: ${BACKUP_DIR}/trade-import-latest.sql"
