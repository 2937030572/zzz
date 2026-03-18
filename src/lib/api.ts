// API 客户端，用于简化与后端的通信

const API_BASE = '/api';

export const api = {
  // Account APIs
  accounts: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/accounts`);
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    },
    create: async (name: string) => {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create account');
      }
      return res.json();
    },
    update: async (id: number, name: string) => {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update account');
      }
      return res.json();
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/accounts?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete account');
      }
      return res.json();
    },
  },

  // Balance APIs
  balance: {
    get: async (accountId?: number) => {
      const query = accountId ? `?accountId=${accountId}` : '';
      const res = await fetch(`${API_BASE}/balance${query}`);
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    update: async (amount: number, accountId?: number) => {
      const res = await fetch(`${API_BASE}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, accountId }),
      });
      if (!res.ok) throw new Error('Failed to update balance');
      return res.json();
    },
  },

  // Trades APIs
  trades: {
    getAll: async (params?: { startDate?: string; endDate?: string; accountId?: number }) => {
      const query = new URLSearchParams();
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.accountId) query.append('accountId', String(params.accountId));
      
      const res = await fetch(`${API_BASE}/trades?${query}`);
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create trade');
      }
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE}/trades`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update trade');
      }
      return res.json();
    },
    delete: async (id: string, accountId?: number) => {
      const query = accountId ? `?id=${id}&accountId=${accountId}` : `?id=${id}`;
      const res = await fetch(`${API_BASE}/trades${query}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete trade');
      }
      return res.json();
    },
  },

  // Fund Records APIs
  fundRecords: {
    getAll: async (limit?: number, accountId?: number) => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', String(limit));
      if (accountId) params.append('accountId', String(accountId));
      const res = await fetch(`${API_BASE}/fund-records?${params}`);
      if (!res.ok) throw new Error('Failed to fetch fund records');
      return res.json();
    },
    getByType: async (type: 'deposit' | 'withdraw', accountId?: number) => {
      const params = new URLSearchParams();
      params.append('type', type);
      if (accountId) params.append('accountId', String(accountId));
      const res = await fetch(`${API_BASE}/fund-records?${params}`);
      if (!res.ok) throw new Error('Failed to fetch fund records');
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/fund-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create fund record');
      }
      return res.json();
    },
    delete: async (id: string, accountId?: number) => {
      const query = accountId ? `?id=${id}&accountId=${accountId}` : `?id=${id}`;
      const res = await fetch(`${API_BASE}/fund-records${query}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete fund record');
      }
      return res.json();
    },
  },

  // Equity History APIs
  equityHistory: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/equity-history`);
      if (!res.ok) throw new Error('Failed to fetch equity history');
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/equity-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create equity history');
      return res.json();
    },
    clear: async () => {
      const res = await fetch(`${API_BASE}/equity-history`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear equity history');
      return res.json();
    },
  },
};
