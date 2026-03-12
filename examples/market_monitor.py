#!/usr/bin/env python
"""
行情监控与报警示例

此脚本展示如何使用python-binance库监控Binance交易所的行情数据，并设置自定义指标报警。
"""

import asyncio
import json
import time
from datetime import datetime
from binance import AsyncClient, BinanceSocketManager

class MarketMonitor:
    def __init__(self, symbol, api_key=None, api_secret=None):
        """
        初始化行情监控器
        
        :param symbol: 要监控的交易对，例如 'BTCUSDT'
        :param api_key: Binance API 密钥
        :param api_secret: Binance API 密钥密码
        """
        self.symbol = symbol
        self.api_key = api_key
        self.api_secret = api_secret
        self.client = None
        self.bsm = None
        self.last_price = None
        self.price_history = []  # 用于计算移动平均线
        self.moving_average_period = 20  # 20周期移动平均线
        self.price_change_threshold = 2.0  # 价格变动阈值（百分比）
        self.volume_threshold = 1000000  # 成交量阈值（USDT）
        
    async def initialize(self):
        """
        初始化客户端和WebSocket管理器
        """
        self.client = await AsyncClient.create(self.api_key, self.api_secret)
        self.bsm = BinanceSocketManager(self.client)
        print(f"已连接到Binance API，开始监控 {self.symbol}")
    
    async def start_monitoring(self):
        """
        开始监控行情
        """
        # 创建K线数据WebSocket连接
        async with self.bsm.kline_socket(symbol=self.symbol) as stream:
            while True:
                res = await stream.recv()
                await self.process_kline_data(res)
    
    async def process_kline_data(self, data):
        """
        处理K线数据
        
        :param data: WebSocket接收到的K线数据
        """
        kline = data['k']
        is_closed = kline['x']
        
        # 只处理已完成的K线
        if is_closed:
            timestamp = kline['t']
            open_price = float(kline['o'])
            high_price = float(kline['h'])
            low_price = float(kline['l'])
            close_price = float(kline['c'])
            volume = float(kline['v'])
            quote_asset_volume = float(kline['q'])
            
            # 计算价格变化百分比
            price_change = ((close_price - open_price) / open_price) * 100
            
            # 记录价格历史
            self.price_history.append(close_price)
            if len(self.price_history) > self.moving_average_period:
                self.price_history.pop(0)
            
            # 计算移动平均线
            if len(self.price_history) == self.moving_average_period:
                moving_average = sum(self.price_history) / len(self.price_history)
                price_ma_diff = ((close_price - moving_average) / moving_average) * 100
            else:
                moving_average = None
                price_ma_diff = None
            
            # 打印行情信息
            self.print_market_data(timestamp, open_price, high_price, low_price, 
                                  close_price, volume, quote_asset_volume, 
                                  price_change, moving_average, price_ma_diff)
            
            # 检查报警条件
            await self.check_alert_conditions(close_price, price_change, quote_asset_volume, 
                                           price_ma_diff)
            
            # 更新最后价格
            self.last_price = close_price
    
    def print_market_data(self, timestamp, open_price, high_price, low_price, 
                         close_price, volume, quote_asset_volume, 
                         price_change, moving_average, price_ma_diff):
        """
        打印行情数据
        """
        time_str = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d %H:%M:%S')
        print(f"\n{time_str} {self.symbol} K线结束:")
        print(f"开盘: {open_price:.2f}, 最高: {high_price:.2f}, 最低: {low_price:.2f}, 收盘: {close_price:.2f}")
        print(f"成交量: {volume:.2f}, 成交额: {quote_asset_volume:.2f} USDT")
        print(f"价格变化: {price_change:.2f}%")
        if moving_average:
            print(f"{self.moving_average_period}周期移动平均: {moving_average:.2f}")
            print(f"价格与移动平均差异: {price_ma_diff:.2f}%")
    
    async def check_alert_conditions(self, close_price, price_change, quote_asset_volume, 
                                   price_ma_diff):
        """
        检查报警条件
        """
        # 价格变动报警
        if abs(price_change) >= self.price_change_threshold:
            direction = "上涨" if price_change > 0 else "下跌"
            self.alert(f"价格{direction}报警: {self.symbol} 在过去K线周期内{direction}了 {abs(price_change):.2f}%")
        
        # 成交量报警
        if quote_asset_volume >= self.volume_threshold:
            self.alert(f"成交量报警: {self.symbol} 成交额达到 {quote_asset_volume:.2f} USDT，超过阈值 {self.volume_threshold} USDT")
        
        # 价格与移动平均线偏离报警
        if price_ma_diff and abs(price_ma_diff) >= 3.0:
            direction = "高于" if price_ma_diff > 0 else "低于"
            self.alert(f"移动平均线偏离报警: {self.symbol} 价格{direction}20周期移动平均线 {abs(price_ma_diff):.2f}%")
        
        # 价格突破历史新高报警
        if self.last_price and close_price > self.last_price * 1.03:
            self.alert(f"价格突破报警: {self.symbol} 价格突破3%，达到 {close_price:.2f}")
    
    def alert(self, message):
        """
        触发报警
        
        :param message: 报警信息
        """
        alert_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"\n[ALERT] {alert_time} - {message}")
        # 这里可以添加其他报警方式，如发送邮件、短信或推送通知
    
    async def close(self):
        """
        关闭连接
        """
        if self.client:
            await self.client.close_connection()
            print("已关闭Binance API连接")

async def main():
    """
    主函数
    """
    # 配置参数
    symbol = "BTCUSDT"  # 要监控的交易对
    api_key = None  # 可选：如果需要访问私有API
    api_secret = None  # 可选：如果需要访问私有API
    
    print(f"正在启动行情监控器，监控交易对: {symbol}")
    
    try:
        # 创建并初始化监控器
        monitor = MarketMonitor(symbol, api_key, api_secret)
        await monitor.initialize()
        
        try:
            # 开始监控
            print("开始接收WebSocket数据...")
            await monitor.start_monitoring()
        except KeyboardInterrupt:
            print("\n监控已手动停止")
        finally:
            # 关闭连接
            await monitor.close()
    except Exception as e:
        print(f"发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())