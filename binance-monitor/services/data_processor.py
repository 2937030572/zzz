import pandas as pd
import numpy as np

class DataProcessor:
    def __init__(self):
        pass
    
    def process_klines(self, klines):
        """处理K线数据"""
        # 转换为DataFrame
        df = pd.DataFrame(klines, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ])
        
        # 转换数据类型
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)
        
        # 设置时间戳为索引
        df.set_index('timestamp', inplace=True)
        
        return df
    
    def calculate_volatility(self, prices, window=20):
        """计算波动率"""
        returns = np.log(prices / prices.shift(1))
        volatility = returns.rolling(window=window).std() * np.sqrt(24 * 365)
        return volatility
