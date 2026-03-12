from flask import Flask, request, jsonify
from binance import Client

app = Flask(__name__)

@app.route('/')
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

if __name__ == '__main__':
    app.run(debug=True)
