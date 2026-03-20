import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AccountManagerProps {
  accounts: any[];
  currentAccountId: number;
  setCurrentAccountId: (id: number) => void;
  onCreateAccount: (name: string) => Promise<void>;
  onUpdateAccount: (account: any, name: string) => Promise<void>;
  onDeleteAccount: (id: number) => Promise<void>;
  editingAccount: any | null;
  setEditingAccount: (account: any | null) => void;
  editAccountName: string;
  setEditAccountName: (name: string) => void;
  newAccountName: string;
  setNewAccountName: (name: string) => void;
  isAccountDialogOpen: boolean;
  setIsAccountDialogOpen: (open: boolean) => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  currentAccountId,
  setCurrentAccountId,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  editingAccount,
  setEditingAccount,
  editAccountName,
  setEditAccountName,
  newAccountName,
  setNewAccountName,
  isAccountDialogOpen,
  setIsAccountDialogOpen
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* 账户选择 */}
      <Select value={String(currentAccountId)} onValueChange={(value) => setCurrentAccountId(Number(value))}>
        <SelectTrigger className="w-32 border-amber-500/30 bg-gray-800 text-white text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-amber-500/30 bg-gray-800">
          {accounts.map((account) => (
            <SelectItem key={account.id} value={String(account.id)} className="text-white hover:bg-gray-700">
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* 账户管理按钮 */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 h-8 px-2">
            管理
          </Button>
        </DialogTrigger>
        <DialogContent className="border-purple-500/30 bg-gray-900 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">账户管理</DialogTitle>
            <DialogDescription className="text-purple-500/60">创建、编辑或删除账户</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* 添加新账户 */}
            <div className="flex gap-2">
              <Input
                placeholder="新账户名称"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="border-purple-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-purple-500"
                onKeyDown={(e) => e.key === 'Enter' && onCreateAccount(newAccountName)}
              />
              <Button onClick={() => onCreateAccount(newAccountName)} className="bg-purple-500 hover:bg-purple-600 text-white font-semibold">
                添加
              </Button>
            </div>
            {/* 账户列表 */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-2 rounded-lg border border-purple-500/20 bg-gray-800/50">
                  {editingAccount?.id === account.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        className="border-purple-500/30 bg-gray-700 text-white h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onUpdateAccount(account, editAccountName);
                          if (e.key === 'Escape') {
                            setEditingAccount(null);
                            setEditAccountName('');
                          }
                        }}
                      />
                      <Button size="sm" onClick={() => onUpdateAccount(account, editAccountName)} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2 text-xs">
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingAccount(null); setEditAccountName(''); }} className="h-8 px-2 text-xs text-gray-400">
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className={`text-sm ${account.id === currentAccountId ? 'text-purple-400 font-semibold' : 'text-white'}`}>
                        {account.name}
                        {account.id === 1 && <span className="text-gray-500 text-xs ml-1">(默认)</span>}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-purple-400 hover:bg-purple-500/10"
                          onClick={() => {
                            setEditingAccount(account);
                            setEditAccountName(account.name);
                          }}
                        >
                          ✏️
                        </Button>
                        {account.id !== 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                            onClick={() => onDeleteAccount(account.id)}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
