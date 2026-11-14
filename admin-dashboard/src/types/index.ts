export interface UserAccount {
  id: string;
  account_number: string;
  balance: string;
  currency: string;
  version?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface UserAdjustment {
  id: string;
  account_number: string;
  operation: 'CREDIT' | 'DEBIT' | 'credit' | 'debit';
  amount: string;
  currency: string;
  previous_balance: string;
  resulting_balance: string;
  reason_code: string;
  admin_note: string;
  actor_email?: string;
  created_at: string;
}

export interface UserTransaction {
  id: string;
  sender_account_number: string;
  receiver_account_number: string;
  amount: string;
  currency: string;
  status: string;
  direction: 'INBOUND' | 'OUTBOUND';
  concurrency_strategy: string;
  description: string;
  created_at: string;
}

export interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  date_joined: string;
  last_heartbeat: string | null;
  accounts: UserAccount[];
  transactions: UserTransaction[];
  adjustments: UserAdjustment[];
  audit_logs: AuditLog[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  date_joined: string;
  last_heartbeat: string | null;
  accounts?: UserAccount[];
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
  sender_account: string | null;
  sender_account_number: string;
  sender_email: string;
  receiver_account: string;
  receiver_account_number: string;
  receiver_email: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  concurrency_strategy: 'PESSIMISTIC' | 'OPTIMISTIC' | 'ATOMIC_CONDITIONAL' | 'UNSAFE_BASELINE';
  idempotency_key: string | null;
  description: string;
  failure_reason: string;
  latency_ms: number;
  created_at: string;
  completed_at: string | null;
  ledger_entries?: LedgerEntry[];
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
