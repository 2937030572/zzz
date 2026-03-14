from flask import Flask, request, jsonify, render_template
from binance import Client
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/price')
def get_price():
    # 获取查询参数中的交易对符号
    symbol = request.args.get('symbol', 'BTCUSDT')
    
    try:
        # 创建Binance客户端
        client = Client()
        
        # 获取交易对价格
        ticker = client.get_symbol_ticker(symbol=symbol)
        
        # 构建响应
        response = {
            'symbol': symbol,
            'price': ticker['price'],
            'timestamp': ticker.get('time', None)
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/market-monitor')
def market_monitor():
    # 获取查询参数
    symbol = request.args.get('symbol', 'BTCUSDT')
    
    try:
        # 创建Binance客户端
        client = Client()
        
        # 获取当前价格
        ticker = client.get_symbol_ticker(symbol=symbol)
        current_price = float(ticker['price'])
        
        # 获取24小时价格变化
        ticker_24h = client.get_ticker(symbol=symbol)
        price_change = float(ticker_24h['priceChange'])
        price_change_percent = float(ticker_24h['priceChangePercent'])
        
        # 获取成交量
        volume = float(ticker_24h['volume'])
        quote_volume = float(ticker_24h['quoteVolume'])
        
        # 获取K线数据（用于计算移动平均线）
        klines = client.get_klines(symbol=symbol, interval=Client.KLINE_INTERVAL_15MINUTE, limit=20)
        
        # 计算20周期移动平均线
        close_prices = [float(kline[4]) for kline in klines]
        moving_average = sum(close_prices) / len(close_prices) if close_prices else 0
        price_ma_diff = ((current_price - moving_average) / moving_average * 100) if moving_average else 0
        
        # 检查报警条件
        alerts = []
        
        # 价格变动报警（±2%）
        if abs(price_change_percent) >= 2.0:
            direction = "上涨" if price_change_percent > 0 else "下跌"
            alerts.append(f"价格{direction}报警: {symbol} 在过去24小时内{direction}了 {abs(price_change_percent):.2f}%")
        
        # 成交量报警（100万USDT）
        if quote_volume >= 1000000:
            alerts.append(f"成交量报警: {symbol} 24小时成交额达到 {quote_volume:.2f} USDT，超过阈值 1000000 USDT")
        
        # 移动平均线偏离报警（±3%）
        if abs(price_ma_diff) >= 3.0:
            direction = "高于" if price_ma_diff > 0 else "低于"
            alerts.append(f"移动平均线偏离报警: {symbol} 价格{direction}20周期移动平均线 {abs(price_ma_diff):.2f}%")
        
        # 构建响应
        response = {
            'symbol': symbol,
            'current_price': current_price,
            'price_change_24h': price_change,
            'price_change_percent_24h': price_change_percent,
            'volume_24h': volume,
            'quote_volume_24h': quote_volume,
            'moving_average_20': moving_average,
            'price_ma_diff_percent': price_ma_diff,
            'alerts': alerts,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)
