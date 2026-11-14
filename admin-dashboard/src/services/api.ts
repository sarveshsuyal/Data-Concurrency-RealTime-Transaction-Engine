import axios from 'axios';
import {
  OverviewResponse,
  Transaction,
  ConcurrencyExperiment,
  TransactionEvent,
  AuditLog,
  IdempotencyKeyRecord,
  User,
  UserDetail
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://datacore-backend-wktd.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('datacore_admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('datacore_admin_token');
      localStorage.removeItem('datacore_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Public Health / Connectivity
  checkHealth: async () => {
    const response = await apiClient.get('/health/');
    return response.data;
  },

  // Authentication
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login/', { email, password });
    return response.data;
  },

  logout: async (refresh: string) => {
    return apiClient.post('/api/auth/logout/', { refresh });
  },

  // Admin Dashboard Services
  getOverview: async (): Promise<OverviewResponse> => {
    const response = await apiClient.get<OverviewResponse>('/api/admin/overview/');
    return response.data;
  },

  getTransactions: async (params?: { status?: string; strategy?: string; page?: number }): Promise<any> => {
    const response = await apiClient.get('/api/admin/transactions/', { params });
    return response.data;
  },

  getTransactionDetail: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/api/transactions/${id}/`);
    return response.data;
  },

  getMetrics: async () => {
    const response = await apiClient.get('/api/admin/metrics/');
    return response.data;
  },

  getConcurrencyEvents: async (): Promise<TransactionEvent[]> => {
    const response = await apiClient.get<TransactionEvent[]>('/api/admin/concurrency/');
    return response.data;
  },

  getExperiments: async (): Promise<ConcurrencyExperiment[]> => {
    const response = await apiClient.get<ConcurrencyExperiment[]>('/api/admin/experiments/');
    return response.data;
  },

  runExperiment: async (payload: {
    strategy: string;
    initial_balance: number;
    withdrawals: number[];
  }): Promise<ConcurrencyExperiment> => {
    const response = await apiClient.post<ConcurrencyExperiment>('/api/admin/experiments/', payload);
    return response.data;
  },

  getUsers: async (params?: {
    search?: string;
    role?: string;
    is_active?: boolean | string;
    min_balance?: string;
    max_balance?: string;
    page?: number;
    page_size?: number;
  }): Promise<any> => {
    const response = await apiClient.get('/api/admin/users/', { params });
    return response.data;
  },

  getUserDetail: async (userId: string): Promise<UserDetail> => {
    const response = await apiClient.get<UserDetail>(`/api/admin/users/${userId}/`);
    return response.data;
  },

  suspendUser: async (userId: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/api/admin/users/${userId}/suspend/`, { reason });
    return response.data;
  },

  reactivateUser: async (userId: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/api/admin/users/${userId}/reactivate/`, { reason });
    return response.data;
  },

  deactivateUser: async (userId: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/api/admin/users/${userId}/deactivate/`, { reason, confirm: true });
    return response.data;
  },

  adjustAccountBalance: async (
    accountId: string,
    payload: {
      operation: 'credit' | 'debit';
      amount: string;
      currency: string;
      reason_code: string;
      admin_note: string;
    },
    idempotencyKey?: string
  ): Promise<any> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const response = await apiClient.post(`/api/admin/accounts/${accountId}/adjustments/`, payload, { headers });
    return response.data;
  },

  getReconciliation: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/reconciliation/');
    return response.data;
  },

  getAuditLogs: async (action?: string): Promise<any> => {
    const response = await apiClient.get('/api/admin/audit-logs/', { params: { action } });
    return response.data;
  },

  getDuplicates: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/duplicates/');
    return response.data;
  },
};
