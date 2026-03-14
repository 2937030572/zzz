#!/usr/bin/env python
"""
测试币安API连接
"""

from binance import Client

print("正在连接到币安API...")
try:
    # 创建客户端
    client = Client()
    print("连接成功！")
    
    # 测试获取市场数据
    print("获取BTCUSDT价格...")
    ticker = client.get_symbol_ticker(symbol="BTCUSDT")
    print(f"BTCUSDT价格: {ticker['price']}")
    
    # 测试获取24小时数据
    print("获取BTCUSDT 24小时数据...")
    ticker_24h = client.get_ticker(symbol="BTCUSDT")
    print(f"24小时价格变化: {ticker_24h['priceChange']}")
    print(f"24小时价格变化百分比: {ticker_24h['priceChangePercent']}%")
    print(f"24小时成交量: {ticker_24h['volume']}")
    
    print("\nAPI连接测试成功！")
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
