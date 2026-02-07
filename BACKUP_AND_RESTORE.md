# 数据备份与恢复指南

本文档说明如何备份和恢复交易记录数据。

## 方法 1: 通过 Web 界面（推荐）

### 备份数据

1. 在浏览器中访问应用
2. 点击右上角的"导出数据"按钮
3. 数据将自动下载为 JSON 文件，格式为：`trade-backup-YYYY-MM-DD.json`

### 恢复数据

**注意：此功能目前需要在后端手动实现，暂未在前端界面中提供。**

## 方法 2: 通过命令行脚本

### 备份数据

```bash
# 备份当前数据
cd /workspace/projects
chmod +x scripts/backup-data.sh
./scripts/backup-data.sh
```

备份文件将保存在 `backups/trade-backup-YYYYMMDD_HHMMSS.json`

### 恢复数据

```bash
# 从最新备份恢复
./scripts/restore-data.sh

# 从指定备份文件恢复
./scripts/restore-data.sh backups/trade-backup-20260207_120000.json
```

### 导出 SQL 脚本

```bash
# 生成 SQL 导入脚本
chmod +x scripts/export-sql.sh
./scripts/export-sql.sh
```

SQL 脚本将保存在 `backups/trade-import-YYYYMMDD_HHMMSS.sql`

## 方法 3: 通过 API

### 备份数据

```bash
# 通过 API 备份数据
curl -O http://localhost:5000/api/data/backup
```

### 恢复数据

```bash
# 通过 API 恢复数据
curl -X POST http://localhost:5000/api/data/restore \
  -H "Content-Type: application/json" \
  -d @backup-file.json
```

## 方法 4: 部署环境数据迁移

### 准备数据

1. 在开发环境备份数据：
```bash
./scripts/backup-data.sh
```

2. 将备份文件复制到部署环境

### 部署时自动导入

有以下几种方式在部署时自动导入数据：

#### 方式 A: 使用 SQL 脚本（推荐用于生产环境）

1. 生成 SQL 导入脚本：
```bash
./scripts/export-sql.sh
```

2. 将生成的 SQL 文件包含在部署包中

3. 在部署完成后，通过数据库管理工具执行 SQL 脚本

#### 方式 B: 使用 API（推荐用于简单部署）

1. 备份数据：
```bash
curl -O http://localhost:5000/api/data/backup
```

2. 在部署后的环境中执行：
```bash
curl -X POST http://your-deployed-url/api/data/restore \
  -H "Content-Type: application/json" \
  -d @trade-backup-YYYY-MM-DD.json
```

## 备份文件格式

备份文件是 JSON 格式，包含以下信息：

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-07T12:00:00.000Z",
  "environment": "development",
  "data": {
    "balance": {
      "id": "uuid",
      "amount": "1000.00",
      "withdrawalAmount": "200.00",
      "createdAt": "2026-02-01T00:00:00.000Z",
      "updatedAt": "2026-02-07T12:00:00.000Z"
    },
    "trades": [
      {
        "id": "uuid",
        "symbol": "ETH2600看涨期权",
        "direction": "买入",
        "entryPrice": "0.00000000",
        "exitPrice": null,
        "quantity": "1.00000000",
        "strategySummary": "boll突破策略",
        "tradeLevel": "A",
        "positionSize": "10%",
        "profitLoss": "60.00",
        "exitReason": "正常止盈",
        "entryTime": "2026-02-01T10:00:00.000Z",
        "exitTime": null,
        "notes": null,
        "isClosed": true,
        "createdAt": "2026-02-01T10:00:00.000Z",
        "updatedAt": null
      }
    ]
  },
  "summary": {
    "totalTrades": 5,
    "closedTrades": 3,
    "openTrades": 2,
    "hasBalance": true
  }
}
```

## 注意事项

1. **数据安全**：
   - 定期备份数据
   - 将备份文件保存在安全的位置
   - 不要将包含敏感信息的备份文件提交到版本控制系统

2. **数据一致性**：
   - 恢复数据前，建议先备份现有数据
   - 恢复操作会覆盖相同 ID 的记录
   - 建议在非生产环境中先测试恢复流程

3. **部署流程**：
   - 在部署前创建完整备份
   - 部署后验证数据完整性
   - 保留原始备份文件直到验证成功

4. **时间戳**：
   - 所有时间戳都是 UTC 时间
   - 导入时会保留原始时间戳

## 故障排除

### 问题 1: 备份文件无法读取

**解决方案**：
```bash
# 验证 JSON 格式
python3 -m json.tool backup-file.json
```

### 问题 2: 恢复失败

**解决方案**：
- 检查 API 是否正常运行
- 验证备份文件格式是否正确
- 查看服务器日志获取详细错误信息

### 问题 3: 数据不完整

**解决方案**：
- 确认备份时服务正常运行
- 检查是否有数据权限问题
- 重新执行备份操作

## 当前数据统计

要查看当前数据统计信息：

```bash
# 查看交易数量
curl -s http://localhost:5000/api/trades | python3 -c "import sys, json; print(f'总交易数: {len(json.load(sys.stdin))}')"

# 查看资产余额
curl -s http://localhost:5000/api/balance

# 查看统计信息
curl -s http://localhost:5000/api/trades/stats
```

## 联系支持

如果遇到问题，请提供以下信息：
1. 错误消息
2. 备份文件（去除敏感信息）
3. 服务器日志
4. 操作系统版本
