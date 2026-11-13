export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  date_joined: string;
  last_heartbeat: string;
  accounts?: Array<{
    account_number: string;
    balance: string;
    currency: string;
  }>;
  total_transactions?: number;
}

export interface Account {
  id: string;
  account_number: string;
  user_email: string;
  user_name: string;
  balance: string;
  currency: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string | null;
  account_number: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: string;
  balance_after: string;
  description: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  correlation_id?: string;
  sender_account: string | null;
  sender_account_number: string;
  sender_email: string;
  receiver_account: string;
  receiver_account_number: string;
  receiver_email: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK' | 'REVERSED';
  concurrency_strategy: 'PESSIMISTIC' | 'OPTIMISTIC' | 'ATOMIC_CONDITIONAL' | 'UNSAFE_BASELINE';
  idempotency_key: string | null;
  description: string;
  failure_reason: string;
  latency_ms: number;
  created_at: string;
  completed_at: string | null;
  ledger_entries?: LedgerEntry[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  organization?: string;
  name: string;
  slug: string;
  environment: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  secret_token?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_url?: string;
  event_type: string;
  payload: any;
  status: string;
  status_code: number;
  duration_ms: number;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  affected_service: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AnomalyRule {
  id: string;
  name: string;
  rule_type: string;
  threshold: string;
  severity: string;
  is_active: boolean;
  created_at: string;
}

export interface AnomalyAlert {
  id: string;
  rule_name?: string;
  title: string;
  details: any;
  status: 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE';
  created_at: string;
}

export interface ReliabilityObjective {
  id: string;
  name: string;
  target_percentage: number;
  current_value: number;
  error_budget_consumed: number;
  time_window: string;
  updated_at: string;
}

export interface SettlementBatch {
  id: string;
  batch_number: string;
  total_amount: string;
  currency: string;
  transaction_count: number;
  status: string;
  created_at: string;
  settled_at: string | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

export interface BenchmarkRecord {
  id: string;
  workload_type: string;
  strategy: string;
  worker_count: number;
  iterations: number;
  tps: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  conflict_rate: number;
  created_at: string;
}

export interface DatabaseTelemetry {
  engine: string;
  is_postgres: boolean;
  connection_status: string;
  active_connections: number;
  idle_connections: number;
  max_connections_limit: number;
  connection_utilization_pct: number;
  active_locks_count: number;
  waiting_queries_count: number;
  deadlocks_detected_24h: number;
  total_transactions_processed: number;
  average_latency_ms: number;
  database_size_bytes: number;
  database_size_human: string;
  table_statistics: Array<{
    table: string;
    row_count: number;
    seq_scan: number;
    idx_scan: number;
  }>;
}

export interface OverviewMetrics {
  total_users: number;
  active_users: number;
  total_transactions: number;
  completed_transactions: number;
  failed_transactions: number;
  duplicate_requests_handled: number;
  throughput_last_hour: number;
  average_latency_ms: number;
}

export interface FinancialConsistency {
  total_system_balance: string;
  total_ledger_debits: string;
  total_ledger_credits: string;
  ledger_invariants_balanced: boolean;
}

export interface OverviewResponse {
  metrics: OverviewMetrics;
  financial_consistency: FinancialConsistency;
}

export interface ConcurrencyExperiment {
  id: string;
  experiment_name: string;
  strategy: string;
  initial_balance: string;
  concurrent_requests_count: number;
  successful_count: number;
  failed_count: number;
  final_balance: string;
  expected_balance: string;
  invariants_preserved: boolean;
  duration_ms: number;
  logs: Array<{
    thread: number;
    requested_amount: string;
    status: string;
    message?: string;
    timestamp: string;
  }>;
  created_at: string;
}

export interface TransactionEvent {
  id: string;
  transaction_id: string | null;
  event_type: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_email: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string;
  details: Record<string, any>;
  previous_hash?: string;
  current_hash?: string;
  timestamp: string;
}

export interface IdempotencyKeyRecord {
  id: string;
  key: string;
  user_email: string;
  request_path: string;
  request_hash: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  response_code: number | null;
  response_body: any;
  created_at: string;
  updated_at: string;
}
