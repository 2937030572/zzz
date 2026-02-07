#!/usr/bin/env python3
"""
生成 SQL 导入脚本
从当前数据库导出数据为 SQL 格式
"""

import json
import subprocess
import sys
from datetime import datetime
import os

# 获取数据
def get_balance():
    try:
        result = subprocess.run(
            ['curl', '-s', 'http://localhost:5000/api/balance'],
            capture_output=True,
            text=True
        )
        return json.loads(result.stdout)
    except:
        return None

def get_trades():
    try:
        result = subprocess.run(
            ['curl', '-s', 'http://localhost:5000/api/trades'],
            capture_output=True,
            text=True
        )
        return json.loads(result.stdout)
    except:
        return []

# 生成 SQL
def generate_sql():
    balance_data = get_balance()
    trades_data = get_trades()

    sql_lines = []

    # 头部注释
    sql_lines.append("-- 交易记录数据导入脚本")
    sql_lines.append(f"-- 生成时间: {datetime.utcnow().isoformat()}")
    sql_lines.append("-- 环境信息:")
    sql_lines.append("--   数据库: PostgreSQL")
    sql_lines.append("--   集成: coze-coding-dev-sdk")
    sql_lines.append("")
    sql_lines.append("BEGIN;")  # 开始事务

    # 资产余额
    sql_lines.append("")
    sql_lines.append("-- 插入/更新资产余额")
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
        sql_lines.append(sql.strip())
    else:
        sql_lines.append("-- 没有资产余额数据")

    # 交易记录
    sql_lines.append("")
    sql_lines.append("-- 插入交易记录")
    if trades_data:
        for trade in trades_data:
            id_val = trade.get('id', '')
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
            sql_lines.append(sql.strip())
    else:
        sql_lines.append("-- 没有交易记录数据")

    # 提交事务
    sql_lines.append("")
    sql_lines.append("COMMIT;")

    # 验证查询
    sql_lines.append("")
    sql_lines.append("-- 导入完成验证")
    sql_lines.append("SELECT COUNT(*) as total_trades FROM trades;")
    sql_lines.append("SELECT COUNT(*) as total_balance FROM balance;")

    return '\n'.join(sql_lines)

if __name__ == '__main__':
    print("开始生成 SQL 导入脚本...")

    sql_content = generate_sql()

    # 创建备份目录
    backup_dir = '/workspace/projects/backups'
    os.makedirs(backup_dir, exist_ok=True)

    # 保存到文件
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    sql_file = f'{backup_dir}/trade-import-{timestamp}.sql'

    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(sql_content)

    print(f"SQL 导入脚本生成完成！")
    print(f"SQL 文件: {sql_file}")
    print("")
    print("预览:")
    print("-" * 60)
    print('\n'.join(sql_content.split('\n')[:30]))
    print("...")
    print("-" * 60)
    print(f"完整 SQL 脚本请查看: {sql_file}")

    # 创建最新 SQL 的符号链接
    latest_link = f'{backup_dir}/trade-import-latest.sql'
    if os.path.exists(latest_link):
        os.remove(latest_link)
    os.symlink(sql_file, latest_link)
    print(f"已创建最新 SQL 链接: {latest_link}")
