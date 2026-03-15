from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 创建Flask应用并配置模板和静态文件路径
app = Flask(__name__, 
            template_folder='ui',
            static_folder='ui')

# 导入模块
from api.binance_api import BinanceAPI
from services.data_processor import DataProcessor
from services.indicator_calculator import IndicatorCalculator
from services.alert_system import AlertSystem

# 初始化服务
binance_api = BinanceAPI()
data_processor = DataProcessor()
indicator_calculator = IndicatorCalculator()
alert_system = AlertSystem()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/ticker', methods=['GET'])
def get_ticker():
    symbol = request.args.get('symbol', 'ETHUSDT')
    try:
        data = binance_api.get_ticker(symbol)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/klines', methods=['GET'])
def get_klines():
    symbol = request.args.get('symbol', 'ETHUSDT')
    interval = request.args.get('interval', '15m')
    limit = request.args.get('limit', 100, type=int)
    try:
        data = binance_api.get_klines(symbol, interval, limit)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/indicators', methods=['POST'])
def calculate_indicators():
    data = request.json
    try:
        result = indicator_calculator.calculate(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/set_alert', methods=['POST'])
def set_alert():
    data = request.json
    try:
        result = alert_system.set_alert(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
