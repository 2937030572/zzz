from binance.client import Client
import os

class BinanceAPI:
    def __init__(self):
        # 从环境变量获取API密钥
        api_key = os.getenv('BINANCE_API_KEY', '')
        api_secret = os.getenv('BINANCE_API_SECRET', '')
        
        # 初始化客户端
        self.client = Client(api_key, api_secret)
    
    def get_ticker(self, symbol):
        """获取交易对的当前价格"""
        ticker = self.client.get_symbol_ticker(symbol=symbol)
        return ticker
    
    def get_klines(self, symbol, interval, limit=100):
        """获取K线数据"""
        klines = self.client.get_klines(symbol=symbol, interval=interval, limit=limit)
        return klines
    
    def get_order_book(self, symbol, limit=10):
        """获取订单簿数据"""
        order_book = self.client.get_order_book(symbol=symbol, limit=limit)
        return order_book
