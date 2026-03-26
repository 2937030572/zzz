import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Account {
  id: number;
  name: string;
}

interface AccountManagerProps {
  accounts: Account[];
  currentAccountId: number;
  setCurrentAccountId: (id: number) => void;
  onCreateAccount: (name: string) => Promise<void>;
  onUpdateAccount: (account: Account, name: string) => Promise<void>;
  onDeleteAccount: (id: number) => Promise<void>;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  currentAccountId,
  setCurrentAccountId,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  const handleCreate = async () => {
    await onCreateAccount(newAccountName);
    setNewAccountName('');
  };

  const handleUpdate = async (account: Account) => {
    await onUpdateAccount(account, editAccountName);
    setEditingAccount(null);
    setEditAccountName('');
  };

  const startEdit = (account: Account) => {
    setEditingAccount(account);
    setEditAccountName(account.name);
  };

  const cancelEdit = () => {
    setEditingAccount(null);
    setEditAccountName('');
  };

  return (
    <div className="flex items-center gap-2">
      {/* 账户选择 */}
      <Select value={String(currentAccountId)} onValueChange={(v) => setCurrentAccountId(Number(v))}>
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
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} className="bg-purple-500 hover:bg-purple-600 text-white font-semibold">
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
                          if (e.key === 'Enter') handleUpdate(account);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button size="sm" onClick={() => handleUpdate(account)} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2 text-xs">
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 px-2 text-xs text-gray-400">
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
                          className="h-7 px-2 text-xs text-purple-400 hover:bg-purple-500/10"
                          onClick={() => startEdit(account)}
                        >
                          编辑
                        </Button>
                        {account.id !== 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10"
                            onClick={() => onDeleteAccount(account.id)}
                          >
                            删除
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
