#!/usr/bin/env python
"""
测试Binance API连接
"""

import asyncio
from binance import AsyncClient

async def main():
    print("正在连接到Binance API...")
    try:
        # 创建客户端
        client = await AsyncClient.create()
        print("连接成功！")
        
        # 测试获取市场数据
        print("获取BTCUSDT价格...")
        ticker = await client.get_symbol_ticker(symbol="BTCUSDT")
        print(f"BTCUSDT价格: {ticker['price']}")
        
        # 关闭连接
        await client.close_connection()
        print("连接已关闭")
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())