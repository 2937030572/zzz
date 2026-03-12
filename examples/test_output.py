#!/usr/bin/env python
"""
测试输出写入文件
"""

import asyncio
from binance import AsyncClient

async def main():
    with open('test_output.txt', 'w') as f:
        f.write("开始测试\n")
        
        try:
            f.write("正在连接到Binance API...\n")
            # 创建客户端
            client = await AsyncClient.create()
            f.write("连接成功！\n")
            
            # 测试获取市场数据
            f.write("获取BTCUSDT价格...\n")
            ticker = await client.get_symbol_ticker(symbol="BTCUSDT")
            f.write(f"BTCUSDT价格: {ticker['price']}\n")
            
            # 关闭连接
            await client.close_connection()
            f.write("连接已关闭\n")
        except Exception as e:
            f.write(f"错误: {e}\n")
            import traceback
            traceback.print_exc(file=f)
        finally:
            f.write("测试完成\n")

if __name__ == "__main__":
    asyncio.run(main())