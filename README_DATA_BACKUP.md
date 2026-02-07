# 数据备份与恢复 - 快速开始

## 当前数据备份

已为您创建以下备份文件：

### 1. JSON 格式备份
- **文件路径**: `/workspace/projects/backups/trade-backup-20260207_143132.json`
- **最新备份**: `/workspace/projects/backups/trade-backup-latest.json`
- **内容**: 完整的交易记录和资产余额数据
- **用途**: API 恢复、手动查看

### 2. SQL 导入脚本
- **文件路径**: `/workspace/projects/backups/trade-import-20260207_143225.sql`
- **最新脚本**: `/workspace/projects/backups/trade-import-latest.sql`
- **内容**: 可直接在数据库中执行的 SQL 语句
- **用途**: 数据库直接导入、生产环境部署

## 数据内容

### 资产余额
- 本金: $70.00
- 提现金额: $43.00
- 可用余额: $27.00

### 交易记录
- 总交易数: 5 笔
- 已平仓: 5 笔
- 持仓中: 0 笔
- 总盈亏: $53.00

## 部署时数据迁移

### 方法 1: 使用 API 恢复（最简单）

1. **下载备份文件**
```bash
# 开发环境
cp /workspace/projects/backups/trade-backup-latest.json ./my-backup.json
```

2. **部署后恢复**
```bash
# 在生产环境执行
curl -X POST https://your-deployed-app.com/api/data/restore \
  -H "Content-Type: application/json" \
  -d @my-backup.json
```

### 方法 2: 使用 SQL 脚本（推荐生产环境）

1. **下载 SQL 脚本**
```bash
# 开发环境
cp /workspace/projects/backups/trade-import-latest.sql ./my-import.sql
```

2. **在数据库中执行**
```sql
-- 使用数据库管理工具或命令行执行
psql -h your-db-host -U your-user -d your-database -f my-import.sql
```

## 常用命令

### 备份数据
```bash
# 创建新的备份
./scripts/backup-data.sh

# 生成 SQL 脚本
python3 scripts/generate-sql.py

# 通过 API 下载备份
curl -O http://localhost:5000/api/data/backup
```

### 查看数据
```bash
# 查看交易记录
curl http://localhost:5000/api/trades | python3 -m json.tool | head -30

# 查看资产余额
curl http://localhost:5000/api/balance | python3 -m json.tool

# 查看统计数据
curl http://localhost:5000/api/trades/stats | python3 -m json.tool
```

### 验证备份
```bash
# 验证 JSON 格式
python3 -m json.tool backups/trade-backup-latest.json > /dev/null && echo "格式正确"

# 查看 SQL 内容
head -50 backups/trade-import-latest.sql
```

## 部署检查清单

在部署前，请确认：

- [ ] 已创建数据备份
- [ ] 备份文件已验证
- [ ] 备份文件已传输到部署环境
- [ ] 部署环境数据库已准备
- [ ] API 端点可访问

## 详细文档

- **数据备份与恢复**: [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md)
- **部署数据迁移**: [DEPLOYMENT_MIGRATION.md](./DEPLOYMENT_MIGRATION.md)

## 注意事项

1. **备份文件安全**: 不要将包含真实数据的备份文件提交到版本控制系统
2. **定期备份**: 建议定期创建备份，特别是在重大更新前
3. **验证数据**: 恢复后务必验证数据完整性
4. **保留备份**: 保留原始备份文件直到验证成功

## 获取帮助

如果遇到问题：

1. 查看详细文档
2. 检查 API 日志
3. 验证备份文件格式
4. 尝试不同的恢复方法

## 数据统计

当前数据库中的数据统计：

```bash
curl -s http://localhost:5000/api/trades/stats | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'总交易: {data[\"totalTrades\"]}'); print(f'已平仓: {data[\"closedTrades\"]}'); print(f'持仓中: {data[\"openTrades\"]}'); print(f'盈利: {data[\"winningTrades\"]}'); print(f'亏损: {data[\"losingTrades\"]}'); print(f'总盈亏: ${data[\"totalProfitLoss\"]}')"
```

输出：
```
总交易: 5
已平仓: 5
持仓中: 0
盈利: 2
亏损: 3
总盈亏: $53
```
