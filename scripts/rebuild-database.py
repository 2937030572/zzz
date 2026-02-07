#!/usr/bin/env python3
"""
重建数据库脚本
清除所有数据并重置数据库
"""

import subprocess
import json
import sys

def execute_sql(sql):
    """执行 SQL 命令"""
    try:
        # 通过 API 删除所有数据
        print(f"执行: {sql}")
        # 这里需要根据实际的数据库集成方式来实现
        # 目前我们使用 API 来删除数据
        pass
    except Exception as e:
        print(f"错误: {e}")
        return False
    return True

def clear_all_data():
    """清除所有数据"""
    print("开始清除数据库...")

    # 方法 1: 通过 API 删除所有交易
    try:
        # 获取所有交易
        result = subprocess.run(
            ['curl', '-s', 'http://localhost:5000/api/trades'],
            capture_output=True,
            text=True
        )
        trades = json.loads(result.stdout)

        print(f"找到 {len(trades)} 条交易记录")

        # 删除每条交易
        for trade in trades:
            trade_id = trade.get('id')
            if trade_id:
                print(f"删除交易: {trade_id}")
                subprocess.run(
                    ['curl', '-X', 'DELETE', f'http://localhost:5000/api/trades/{trade_id}'],
                    capture_output=True
                )

        print("✓ 所有交易记录已删除")

    except Exception as e:
        print(f"✗ 删除交易失败: {e}")
        return False

    # 方法 2: 重置资产余额
    try:
        # 获取当前资产余额
        result = subprocess.run(
            ['curl', '-s', 'http://localhost:5000/api/balance'],
            capture_output=True,
            text=True
        )
        balance_data = json.loads(result.stdout)

        if balance_data and balance_data.get('id'):
            balance_id = balance_data['id']
            print(f"删除资产余额: {balance_id}")

            # 注意: 这个 API 可能不存在，我们需要通过其他方式处理
            # 或者我们只是设置余额为 0
            print("设置资产余额为 0")

            # 更新余额为 0
            update_data = {
                'amount': '0',
                'withdrawalAmount': '0'
            }
            subprocess.run(
                ['curl', '-X', 'POST', 'http://localhost:5000/api/balance',
                 '-H', 'Content-Type: application/json',
                 '-d', json.dumps(update_data)],
                capture_output=True
            )

            print("✓ 资产余额已重置")

    except Exception as e:
        print(f"✗ 重置资产余额失败: {e}")
        return False

    print("\n数据库重建完成！")
    return True

if __name__ == '__main__':
    confirm = input("确认要清除所有数据吗？这将删除所有交易记录和资产余额！(yes/no): ")

    if confirm.lower() != 'yes':
        print("已取消操作")
        sys.exit(0)

    print("\n⚠️  警告: 此操作不可逆！")
    print("建议在执行前先备份数据\n")

    success = clear_all_data()

    if success:
        print("\n✓ 数据库重建成功")
        print("现在可以使用备份文件恢复数据")
    else:
        print("\n✗ 数据库重建失败")
        sys.exit(1)
