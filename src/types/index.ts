// 交易记录类型
export interface Trade {
  id: string;
  symbol: string; // 交易品种
  strategy: string; // 入场策略
  position: number; // 仓位
  openAmount: number; // 开仓金额
  openTime: string; // 开仓时间
  closeReason: 'profit' | 'loss' | 'other'; // 平仓原因
  remark?: string; // 备注
  profitLoss: number; // 盈亏金额
  date: string; // 交易日期
  isClosed: boolean; // 是否已平仓
  accountId?: number; // 账户ID
  createdAt?: string; // 创建时间
  updatedAt?: string; // 更新时间
}

// 资金记录类型
export interface FundRecord {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  accountId?: number;
  createdAt?: string;
}

// 资产历史类型
export interface EquityHistory {
  id: string;
  date: string;
  value: number;
  createdAt?: string;
}

// 账户类型
export interface Account {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

// 仓位选项类型
export type PositionType = 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50;