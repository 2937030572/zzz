-- 交易记录数据导入脚本
-- 生成时间: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
-- 环境信息:
--   数据库: PostgreSQL
--   集成: coze-coding-dev-sdk

-- 清空现有数据（可选，取消注释以删除现有数据）
-- DELETE FROM trades;
-- DELETE FROM balance;

-- 开始事务
BEGIN;

-- 插入/更新资产余额
