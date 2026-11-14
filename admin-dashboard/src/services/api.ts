import axios from 'axios';
import {
  OverviewResponse,
  Transaction,
  ConcurrencyExperiment,
  TransactionEvent,
  AuditLog,
  IdempotencyKeyRecord,
  User
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

  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/admin/users/');
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

  // Additional Enterprise Services
  getConsistencyReport: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/consistency/');
    return response.data;
  },

  getDatabaseObservatory: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/observatory/');
    return response.data;
  },

  explainQuery: async (query_type: string): Promise<any> => {
    const response = await apiClient.post('/api/admin/explain/', { query_type });
    return response.data;
  },

  simulateDeadlock: async (): Promise<any> => {
    const response = await apiClient.post('/api/admin/deadlock/');
    return response.data;
  },

  simulateFailureLab: async (payload: { experiment_type: string; strategy?: string; attempts?: number; failure_threshold?: number }): Promise<any> => {
    const response = await apiClient.post('/api/admin/failure-lab/', payload);
    return response.data;
  },

  getBenchmarks: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/benchmarks/');
    return response.data;
  },

  runBenchmark: async (payload: { strategy: string; workers: number; iterations: number }): Promise<any> => {
    const response = await apiClient.post('/api/admin/benchmarks/', payload);
    return response.data;
  },

  getTransactionTrace: async (params: { id?: string; correlation_id?: string }): Promise<any> => {
    const response = await apiClient.get('/api/transactions/trace/', { params });
    return response.data;
  },

  reverseTransaction: async (id: string, reason?: string): Promise<any> => {
    const response = await apiClient.post(`/api/transactions/${id}/reverse/`, { reason });
    return response.data;
  },

  getAnomalyRules: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/anomaly-rules/');
    return response.data;
  },

  createAnomalyRule: async (data: any): Promise<any> => {
    const response = await apiClient.post('/api/admin/anomaly-rules/', data);
    return response.data;
  },

  getAnomalyAlerts: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/anomaly-alerts/');
    return response.data;
  },

  resolveAnomalyAlert: async (id: string, status = 'RESOLVED'): Promise<any> => {
    const response = await apiClient.patch(`/api/admin/anomaly-alerts/${id}/`, { status });
    return response.data;
  },

  getIncidents: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/incidents/');
    return response.data;
  },

  createIncident: async (data: any): Promise<any> => {
    const response = await apiClient.post('/api/admin/incidents/', data);
    return response.data;
  },

  updateIncidentStatus: async (id: string, status: string): Promise<any> => {
    const response = await apiClient.patch(`/api/admin/incidents/${id}/`, { status });
    return response.data;
  },

  getApiEndpoints: async (): Promise<any> => {
    const response = await apiClient.get('/api/developer/endpoints/');
    return response.data;
  },

  getApiKeys: async (): Promise<any> => {
    const response = await apiClient.get('/api/developer/keys/');
    return response.data;
  },

  createApiKey: async (name: string, scopes: string[]): Promise<any> => {
    const response = await apiClient.post('/api/developer/keys/', { name, scopes });
    return response.data;
  },

  getWebhooks: async (): Promise<any> => {
    const response = await apiClient.get('/api/developer/webhooks/');
    return response.data;
  },

  createWebhook: async (url: string, events: string[]): Promise<any> => {
    const response = await apiClient.post('/api/developer/webhooks/', { url, events });
    return response.data;
  },

  testWebhookPing: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/api/developer/webhooks/${id}/test/`);
    return response.data;
  },

  getWorkspaces: async (): Promise<any> => {
    const response = await apiClient.get('/api/workspaces/');
    return response.data;
  },

  createWorkspace: async (name: string, environment = 'Production'): Promise<any> => {
    const response = await apiClient.post('/api/workspaces/', { name, environment });
    return response.data;
  },

  getNotifications: async (): Promise<any> => {
    const response = await apiClient.get('/api/notifications/');
    return response.data;
  },

  markAllNotificationsRead: async (): Promise<any> => {
    const response = await apiClient.post('/api/notifications/');
    return response.data;
  },

  getReliabilityObjectives: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/reliability/');
    return response.data;
  },

  getSettlementBatches: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/settlement/');
    return response.data;
  },

  createSettlementBatch: async (): Promise<any> => {
    const response = await apiClient.post('/api/admin/settlement/');
    return response.data;
  },

  getAccountStatement: async (accountId: string): Promise<any> => {
    const response = await apiClient.get(`/api/accounts/${accountId}/statement/`);
    return response.data;
  },

  getAccounts: async (): Promise<any> => {
    const response = await apiClient.get('/api/accounts/');
    return response.data;
  },

  executeTransfer: async (payload: {
    receiver_identifier: string;
    amount: string;
    description?: string;
    concurrency_strategy?: string;
    idempotency_key?: string;
  }): Promise<any> => {
    const headers: Record<string, string> = {};
    if (payload.idempotency_key) {
      headers['Idempotency-Key'] = payload.idempotency_key;
    }
    const response = await apiClient.post('/api/transactions/', payload, { headers });
    return response.data;
  },
};
