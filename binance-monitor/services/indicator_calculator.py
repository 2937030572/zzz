import numpy as np
import pandas as pd

class IndicatorCalculator:
    def __init__(self):
        pass
    
    def calculate(self, data):
        """计算技术指标"""
        try:
            indicator_type = data.get('indicator_type')
            prices = np.array(data.get('prices'))
            params = data.get('params', {})
            
            if indicator_type == 'bollinger_bands':
                return self.calculate_bollinger_bands(prices, **params)
            elif indicator_type == 'rsi':
                return self.calculate_rsi(prices, **params)
            elif indicator_type == 'macd':
                return self.calculate_macd(prices, **params)
            else:
                raise ValueError(f"Unsupported indicator type: {indicator_type}")
        except Exception as e:
            print(f"Error calculating indicator: {str(e)}")
            raise
    
    def calculate_bollinger_bands(self, prices, period=20, std_dev=2):
        """计算布林带"""
        df = pd.DataFrame({'close': prices})
        
        # 使用简单移动平均计算基础值
        df['sma'] = df['close'].rolling(window=period).mean()
        
        # 计算标准差和布林带
        df['std'] = df['close'].rolling(window=period).std()
        df['upper'] = df['sma'] + (df['std'] * std_dev)
        df['lower'] = df['sma'] - (df['std'] * std_dev)
        
        # 计算布林带宽度（按照Pine Script逻辑：(上轨 - 下轨) / 中轨 * 100）
        df['bandwidth'] = (df['upper'] - df['lower']) / df['sma'] * 100
        
        # 处理NaN值
        def handle_nan(values):
            return [float(v) if not pd.isna(v) else None for v in values]
        
        return {
            'sma': handle_nan(df['sma'].values),
            'upper': handle_nan(df['upper'].values),
            'lower': handle_nan(df['lower'].values),
            'bandwidth': handle_nan(df['bandwidth'].values)
        }
    
    def calculate_rsi(self, prices, period=14):
        """计算RSI"""
        df = pd.DataFrame({'close': prices})
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # 处理NaN值
        def handle_nan(values):
            return [float(v) if not pd.isna(v) else None for v in values]
        
        return {
            'rsi': handle_nan(rsi.values)
        }
    
    def calculate_macd(self, prices, fast_period=12, slow_period=26, signal_period=9):
        """计算MACD"""
        df = pd.DataFrame({'close': prices})
        df['ema_fast'] = df['close'].ewm(span=fast_period, adjust=False).mean()
        df['ema_slow'] = df['close'].ewm(span=slow_period, adjust=False).mean()
        df['macd'] = df['ema_fast'] - df['ema_slow']
        df['signal'] = df['macd'].ewm(span=signal_period, adjust=False).mean()
        df['histogram'] = df['macd'] - df['signal']
        
        # 处理NaN值
        def handle_nan(values):
            return [float(v) if not pd.isna(v) else None for v in values]
        
        return {
            'macd': handle_nan(df['macd'].values),
            'signal': handle_nan(df['signal'].values),
            'histogram': handle_nan(df['histogram'].values)
        }
