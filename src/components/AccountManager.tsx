'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account } from '@/lib/schema';
import { DEFAULT_ACCOUNT_ID } from '@/lib/schema';

interface Props {
  accounts: Account[];
  currentAccountId: number;
  onSelect: (id: number) => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function AccountManager({
  accounts,
  currentAccountId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  // 成功返回 true；失败时上层已 toast，这里只负责吞掉错误并重置 busy
  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={String(currentAccountId)} onValueChange={(v) => onSelect(Number(v))}>
        <SelectTrigger className="h-8 w-[132px] text-sm">
          <SelectValue placeholder="选择账户" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              {a.name}
              {a.id === DEFAULT_ACCOUNT_ID && (
                <span className="ml-1 text-xs text-muted-foreground">默认</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            账户管理
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>账户管理</DialogTitle>
            <DialogDescription>创建、重命名或删除账户。删除账户会一并清除其全部记录。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="新账户名称"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    void run(async () => {
                      await onCreate(newName);
                    }).then((ok) => {
                      if (ok) setNewName('');
                    });
                  }
                }}
              />
              <Button
                variant="secondary"
                disabled={busy || !newName.trim()}
                onClick={() =>
                  void run(async () => {
                    await onCreate(newName);
                  }).then((ok) => {
                    if (ok) setNewName('');
                  })
                }
              >
                添加
              </Button>
            </div>

            <div className="max-h-[280px] space-y-1 overflow-y-auto">
              {accounts.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">暂无账户</p>
              )}
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  {editing?.id === account.id ? (
                    <>
                      <Input
                        autoFocus
                        className="h-8"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editName.trim()) {
                            void run(async () => {
                              await onUpdate(account.id, editName);
                            }).then((ok) => {
                              if (ok) setEditing(null);
                            });
                          }
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={busy || !editName.trim()}
                          onClick={() =>
                            void run(async () => {
                              await onUpdate(account.id, editName);
                            }).then((ok) => {
                              if (ok) setEditing(null);
                            })
                          }
                        >
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setEditing(null)}
                        >
                          取消
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="truncate text-sm">
                        {account.name}
                        {account.id === DEFAULT_ACCOUNT_ID && (
                          <span className="ml-1 text-xs text-muted-foreground">默认</span>
                        )}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditing(account);
                            setEditName(account.name);
                          }}
                        >
                          重命名
                        </Button>
                        {account.id !== DEFAULT_ACCOUNT_ID && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-down hover:text-down"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `删除账户「${account.name}」？该账户下的交易与出入金记录都会被清除。`
                                )
                              ) {
                                void run(() => onDelete(account.id));
                              }
                            }}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
