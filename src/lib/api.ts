// API 客户端，用于简化与后端的通信

const API_BASE = '/api';

export const api = {
  // Balance APIs
  balance: {
    get: async () => {
      const res = await fetch(`${API_BASE}/balance`);
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    update: async (amount: number) => {
      const res = await fetch(`${API_BASE}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error('Failed to update balance');
      return res.json();
    },
  },

  // Trades APIs
  trades: {
    getAll: async (params?: { startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams();
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      
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
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/trades?id=${id}`, {
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
    getAll: async (limit?: number) => {
      const res = await fetch(`${API_BASE}/fund-records?limit=${limit || 10}`);
      if (!res.ok) throw new Error('Failed to fetch fund records');
      return res.json();
    },
    getByType: async (type: 'deposit' | 'withdraw') => {
      const res = await fetch(`${API_BASE}/fund-records?type=${type}`);
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
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/fund-records?id=${id}`, {
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
