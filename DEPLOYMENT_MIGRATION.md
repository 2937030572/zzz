# 部署数据迁移指南

本指南说明如何将开发环境的数据迁移到生产环境。

## 准备工作

### 1. 备份当前数据

在部署前，首先确保数据已备份：

```bash
cd /workspace/projects

# 方法 1: 使用备份脚本
./scripts/backup-data.sh

# 方法 2: 使用 API
curl -O http://localhost:5000/api/data/backup

# 方法 3: 生成 SQL 脚本
python3 scripts/generate-sql.py
```

### 2. 验证备份文件

```bash
# 查看备份文件
ls -lh backups/

# 验证 JSON 格式
python3 -m json.tool backups/trade-backup-latest.json | head -20

# 验证 SQL 格式
head -50 backups/trade-import-latest.sql
```

### 3. 数据备份文件位置

所有备份文件保存在 `/workspace/projects/backups/` 目录：

- `trade-backup-YYYYMMDD_HHMMSS.json` - JSON 格式备份
- `trade-backup-latest.json` - 最新 JSON 备份（符号链接）
- `trade-import-YYYYMMDD_HHMMSS.sql` - SQL 导入脚本
- `trade-import-latest.sql` - 最新 SQL 脚本（符号链接）

## 数据迁移方法

### 方法 1: 使用 API 恢复（推荐用于简单部署）

这是最简单的方法，适用于大多数部署场景。

#### 步骤：

1. **在开发环境备份数据**
```bash
cd /workspace/projects
./scripts/backup-data.sh
```

2. **将备份文件传输到部署环境**
```bash
# 复制备份文件到部署服务器
scp backups/trade-backup-latest.json user@deploy-server:/path/to/backup/
```

3. **在部署环境恢复数据**
```bash
# 替换为你的部署 URL
curl -X POST https://your-deployed-app.com/api/data/restore \
  -H "Content-Type: application/json" \
  -d @trade-backup-latest.json
```

4. **验证数据恢复**
```bash
# 检查交易记录
curl https://your-deployed-app.com/api/trades | python3 -m json.tool | head -20

# 检查资产余额
curl https://your-deployed-app.com/api/balance

# 检查统计数据
curl https://your-deployed-app.com/api/trades/stats
```

### 方法 2: 使用 SQL 脚本（推荐用于生产环境）

适用于需要更严格控制数据迁移的生产环境。

#### 步骤：

1. **生成 SQL 导入脚本**
```bash
cd /workspace/projects
python3 scripts/generate-sql.py
```

2. **将 SQL 文件传输到部署环境**
```bash
scp backups/trade-import-latest.sql user@deploy-server:/path/to/backup/
```

3. **在部署环境执行 SQL 脚本**

**注意**: 需要数据库管理员权限，具体步骤取决于部署平台：

```bash
# 如果使用 PostgreSQL 命令行
psql -h your-db-host -U your-db-user -d your-db-name -f trade-import-latest.sql

# 如果使用数据库管理工具
# 在管理工具中打开 SQL 文件并执行
```

4. **验证数据导入**
```sql
-- 检查交易记录数
SELECT COUNT(*) FROM trades;

-- 检查资产余额
SELECT * FROM balance;

-- 检查最新交易记录
SELECT * FROM trades ORDER BY created_at DESC LIMIT 5;
```

### 方法 3: 通过数据库集成（平台特定）

如果使用特定的数据库集成服务，请参考该平台的文档：

1. 查看集成服务的文档
2. 使用平台提供的数据迁移工具
3. 导入 SQL 脚本或使用 API 恢复

## 当前数据统计

查看当前数据库中的数据：

```bash
# 统计信息
curl -s http://localhost:5000/api/trades/stats | python3 -m json.tool

# 交易数量
curl -s http://localhost:5000/api/trades | python3 -c "import sys, json; trades=json.load(sys.stdin); print(f'总交易数: {len(trades)}'); print(f'已平仓: {sum(1 for t in trades if t[\"isClosed\"])}'); print(f'持仓中: {sum(1 for t in trades if not t[\"isClosed\"])}')"

# 资产余额
curl -s http://localhost:5000/api/balance | python3 -m json.tool
```

## 部署清单

在部署前，请确认以下事项：

### 数据备份
- [ ] 已创建最新数据备份
- [ ] 验证备份文件格式正确
- [ ] 备份文件已安全保存
- [ ] 备份文件已传输到部署环境

### 数据验证
- [ ] 验证交易记录数量正确
- [ ] 验证资产余额正确
- [ ] 验证统计数据一致
- [ ] 检查是否有异常数据

### 部署准备
- [ ] 确认部署环境已准备就绪
- [ ] 确认数据库连接正常
- [ ] 确认 API 端点可访问
- [ ] 准备回滚计划

### 部署后验证
- [ ] 验证交易记录已正确导入
- [ ] 验证资产余额已正确导入
- [ ] 验证统计数据正确
- [ ] 测试应用功能正常
- [ ] 保留原始备份文件

## 常见问题

### Q1: 数据恢复后显示数量不对

**A**: 检查是否有重复记录或被过滤的数据。使用以下命令检查：

```bash
# 检查重复记录
curl -s http://localhost:5000/api/trades | python3 -c "import sys, json; trades=json.load(sys.stdin); ids=[t['id'] for t in trades]; print('重复记录:', len(ids) - len(set(ids))) if len(ids) != len(set(ids)) else '无重复记录')"
```

### Q2: 恢复失败怎么办

**A**: 
1. 检查 API 是否正常运行
2. 验证备份文件格式
3. 查看服务器日志
4. 尝试使用 SQL 脚本导入

### Q3: 如何验证数据完整性

**A**: 使用以下方法验证：

```bash
# 对比开发和生产环境的数据数量
# 开发环境
curl -s http://localhost:5000/api/trades | python3 -c "import sys, json; print('开发环境交易数:', len(json.load(sys.stdin)))"

# 生产环境
curl -s https://your-deployed-app.com/api/trades | python3 -c "import sys, json; print('生产环境交易数:', len(json.load(sys.stdin)))"
```

### Q4: 能否增量更新数据

**A**: 当前恢复逻辑会覆盖相同 ID 的记录。如果需要增量更新：

1. 使用不同的 ID
2. 手动合并数据
3. 使用数据库工具进行精细控制

## 回滚计划

如果部署出现问题，需要回滚：

### 方法 1: 从备份重新恢复

```bash
# 使用最新的备份文件重新恢复
curl -X POST https://your-deployed-app.com/api/data/restore \
  -H "Content-Type: application/json" \
  -d @trade-backup-latest.json
```

### 方法 2: 清空并重新导入

```bash
# 警告：这会删除所有数据
curl -X POST https://your-deployed-app.com/api/trades/export -o /dev/null

# 然后重新恢复
curl -X POST https://your-deployed-app.com/api/data/restore \
  -H "Content-Type: application/json" \
  -d @trade-backup-latest.json
```

## 联系支持

如果遇到问题，请提供以下信息：

1. 错误消息
2. 备份文件（去除敏感信息）
3. 服务器日志
4. 操作系统版本
5. 部署平台信息

## 附录：快速命令参考

```bash
# 备份数据
./scripts/backup-data.sh

# 生成 SQL
python3 scripts/generate-sql.py

# 恢复数据（API）
curl -X POST URL/api/data/restore -H "Content-Type: application/json" -d @backup.json

# 查看统计
curl URL/api/trades/stats

# 查看交易
curl URL/api/trades | python3 -m json.tool

# 查看余额
curl URL/api/balance
```
