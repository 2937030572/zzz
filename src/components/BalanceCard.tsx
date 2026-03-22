import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
  fundRecords: any[];
  onAddFund: (type: 'deposit' | 'withdraw', amount: number) => void;
  onDeleteFundRecord: (id: string) => void;
  totalDeposit: number;
  totalWithdraw: number;
  fundAmount: string;
  setFundAmount: (value: string) => void;
  isDepositDialogOpen: boolean;
  setIsDepositDialogOpen: (open: boolean) => void;
  isWithdrawDialogOpen: boolean;
  setIsWithdrawDialogOpen: (open: boolean) => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  fundRecords,
  onAddFund,
  onDeleteFundRecord,
  totalDeposit,
  totalWithdraw,
  fundAmount,
  setFundAmount,
  isDepositDialogOpen,
  setIsDepositDialogOpen,
  isWithdrawDialogOpen,
  setIsWithdrawDialogOpen
}) => {
  return (
    <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-cyan-400">资产余额</CardTitle>
        <CardDescription className="text-cyan-500/60">当前账户总余额</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            ${(balance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex gap-2">
            <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">入金</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>入金</DialogTitle>
                  <DialogDescription>请输入入金金额</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">金额</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="请输入金额"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700" 
                    onClick={() => onAddFund('deposit', Number(fundAmount))}
                  >
                    确认入金
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">出金</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>出金</DialogTitle>
                  <DialogDescription>请输入出金金额</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">金额</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="请输入金额"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="destructive" 
                    className="bg-red-600 hover:bg-red-700" 
                    onClick={() => onAddFund('withdraw', Number(fundAmount))}
                  >
                    确认出金
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* 累计入金和出金 */}
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-center">
              <div className="text-xs text-green-400/70">累计入金</div>
              <div className="text-sm font-semibold text-green-400">
                ${(totalDeposit || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-center">
              <div className="text-xs text-red-400/70">累计出金</div>
              <div className="text-sm font-semibold text-red-400">
                ${(totalWithdraw || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          
          {/* 最近3条出入金记录 */}
          {fundRecords.length > 0 && (
            <div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2">
              <div className="text-xs text-cyan-400/70 mb-2">最近记录（最新3条）</div>
              <div className="space-y-1">
                {fundRecords.slice(0, 3).map((record) => (
                  <div key={record.id} className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${record.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {record.type === 'deposit' ? '入金' : '出金'}
                      </span>
                      <span className="text-xs text-white">
                        ${(record.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {record.date}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => onDeleteFundRecord(record.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};