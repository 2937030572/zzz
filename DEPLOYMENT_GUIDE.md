# 部署指南：python-binance 库

## 项目性质

python-binance 是一个 Python 客户端库，用于与 Binance 交易所 API 进行交互。它不是一个 Web 应用或 API 服务，而是一个供开发者在其应用中使用的库。

## 部署说明

### 为什么不适合直接部署到 Vercel

Vercel 主要用于部署以下类型的项目：
- 前端应用（React、Next.js、Vue 等）
- 静态网站
- Serverless 函数

而 python-binance 是一个 Python 库，其设计目的是被其他 Python 应用导入和使用，而不是作为独立服务部署。

### 正确使用方法

1. **安装库**：
   ```bash
   pip install python-binance
   ```

2. **在您的 Python 应用中使用**：
   ```python
   from binance import Client
   
   # 初始化客户端
   client = Client(api_key, api_secret)
   
   # 使用客户端进行操作
   depth = client.get_order_book(symbol='BNBBTC')
   prices = client.get_all_tickers()
   ```

### 如何将 python-binance 与 Vercel 结合使用

如果您想在 Vercel 上部署一个使用 python-binance 的应用，您可以：

1. **创建一个 Serverless 函数**：
   - 在项目中创建一个 `api` 目录
   - 在该目录中创建 Python 函数文件，例如 `get_prices.py`
   - 使用 python-binance 库实现所需功能

2. **配置 Vercel**：
   - 确保您的项目有 `vercel.json` 配置文件
   - 配置 Python 运行时和依赖

3. **部署到 Vercel**：
   - 连接您的代码仓库到 Vercel
   - 配置部署参数
   - 部署应用

## 示例：创建使用 python-binance 的 Vercel Serverless 函数

### 1. 创建项目结构

```
my-binance-app/
├── api/
│   ├── get_prices.py
│   └── requirements.txt
└── vercel.json
```

### 2. 配置文件

**api/requirements.txt**：
```
python-binance
```

**api/get_prices.py**：
```python
from binance import Client
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def get_prices():
    # 注意：在生产环境中，应使用环境变量存储 API 密钥
    client = Client('your_api_key', 'your_api_secret')
    prices = client.get_all_tickers()
    return jsonify(prices)

if __name__ == '__main__':
    app.run()
```

**vercel.json**：
```json
{
  "builds": [
    {
      "src": "api/get_prices.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/get-prices",
      "dest": "api/get_prices.py"
    }
  ]
}
```

### 3. 部署到 Vercel

1. 登录 Vercel 账户
2. 连接您的代码仓库
3. 配置部署参数
4. 部署应用

## 总结

python-binance 是一个强大的 Python 库，用于与 Binance API 交互，但它本身不是一个可直接部署的应用。要在 Vercel 上使用它，您需要创建一个包含 Serverless 函数的应用，该函数使用 python-binance 库来实现所需功能。