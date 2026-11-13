import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Scale,
  RotateCcw,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction } from '../types';

export const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [strategyFilter, setStrategyFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      const data = await api.getTransactions({
        status: statusFilter || undefined,
        strategy: strategyFilter || undefined
      });
      const list = Array.isArray(data) ? data : data.results || [];
      setTransactions(list);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, strategyFilter]);

  const inspectTransaction = async (id: string) => {
    try {
      const detail = await api.getTransactionDetail(id);
      setSelectedTx(detail);
    } catch (err) {
      console.error('Failed to fetch tx detail', err);
    }
  };

  const handleReverse = async (txId: string) => {
    if (!window.confirm(`Initiate double-entry compensating reversal for transaction ${txId.substring(0, 8)}?`)) {
      return;
    }
    setReversingId(txId);
    try {
      const res = await api.reverseTransaction(txId, 'Administrative manual compensation trigger');
      setActionMessage(`Transaction ${txId.substring(0, 8)} reversed successfully. Reversal ID: ${res.reversal_transaction_id.substring(0, 8)}`);
      await fetchTransactions();
      if (selectedTx?.id === txId) {
        setSelectedTx(null);
      }
    } catch (err: any) {
      setActionMessage(`Reversal failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setReversingId(null);
      setTimeout(() => setActionMessage(null), 6000);
    }
  };

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ID', 'Correlation ID', 'Sender', 'Receiver', 'Amount', 'Strategy', 'Status', 'Latency MS', 'Created At'];
    const rows = transactions.map(t => [
      t.id,
      t.correlation_id || '',
      t.sender_account_number,
      t.receiver_account_number,
      t.amount,
      t.concurrency_strategy,
      t.status,
      t.latency_ms,
      t.created_at
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `datacore_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'REVERSED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3 h-3" />
            <span>Reversed</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'ROLLED_BACK':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Scale className="w-3 h-3" />
            <span>Rolled Back</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Clock className="w-3 h-3" />
            <span>{status || 'Pending'}</span>
          </span>
        );
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.id.toLowerCase().includes(term) ||
      (tx.correlation_id && tx.correlation_id.toLowerCase().includes(term)) ||
      tx.sender_account_number.toLowerCase().includes(term) ||
      tx.receiver_account_number.toLowerCase().includes(term) ||
      tx.amount.toString().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <ArrowLeftRight className="w-6 h-6 text-brand-500" />
            <span>Transaction Management & Lifecycle</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise PostgreSQL transaction events, double-entry ledgers, latencies, and compensating reversals
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchTransactions}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="glass-panel p-3.5 rounded-xl border-l-4 border-l-brand-500 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Transaction ID, Correlation ID, Account Number, Amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="REVERSED">Reversed</option>
              <option value="FAILED">Failed</option>
              <option value="ROLLED_BACK">Rolled Back</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Strategies</option>
              <option value="PESSIMISTIC">Pessimistic</option>
              <option value="OPTIMISTIC">Optimistic</option>
              <option value="ATOMIC_CONDITIONAL">Atomic Conditional</option>
              <option value="UNSAFE_BASELINE">Unsafe Baseline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Transaction ID / Correlation</th>
                <th className="px-5 py-3.5 font-semibold">Sender</th>
                <th className="px-5 py-3.5 font-semibold">Receiver</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Strategy</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Latency</th>
                <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-semibold text-brand-600 dark:text-brand-300">
                        {tx.id.substring(0, 8)}...
                      </div>
                      {tx.correlation_id && (
                        <button
                          onClick={() => navigate(`/trace?id=${tx.id}`)}
                          className="text-[10px] text-slate-400 hover:text-brand-500 font-mono flex items-center space-x-1 mt-0.5"
                        >
                          <span>corr: {tx.correlation_id.substring(0, 8)}...</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{tx.sender_account_number}</div>
                      <div className="text-[10px] text-slate-500">{tx.sender_email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{tx.receiver_account_number}</div>
                      <div className="text-[10px] text-slate-500">{tx.receiver_email}</div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      ₹{tx.amount}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tx.concurrency_strategy}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(tx.status)}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {tx.latency_ms} ms
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => inspectTransaction(tx.id)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => navigate(`/trace?id=${tx.id}`)}
                        className="px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg border border-brand-500/20 text-[11px] font-medium transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Trace</span>
                      </button>
                      {tx.status === 'COMPLETED' && (
                        <button
                          disabled={reversingId === tx.id}
                          onClick={() => handleReverse(tx.id)}
                          className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20 text-[11px] font-medium transition-colors inline-flex items-center space-x-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{reversingId === tx.id ? 'Reversing...' : 'Reverse'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Modal Inspector */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-brand-500" />
                  <span>Double-Entry Ledger Audit & Reversal</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">TX: {selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Status</span>
                <div className="mt-1">{getStatusBadge(selectedTx.status)}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Strategy</span>
                <div className="mt-1 font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedTx.concurrency_strategy}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Amount</span>
                <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">₹{selectedTx.amount}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Latency</span>
                <div className="mt-1 font-mono text-slate-800 dark:text-slate-200">{selectedTx.latency_ms} ms</div>
              </div>
            </div>

            <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              Immutable Ledger Entries
            </h4>

            <div className="space-y-2 mb-6">
              {selectedTx.ledger_entries && selectedTx.ledger_entries.length > 0 ? (
                selectedTx.ledger_entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span
                        className={`font-bold mr-2 ${
                          entry.entry_type === 'DEBIT' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        [{entry.entry_type}]
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-300">{entry.account_number}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-slate-100">₹{entry.amount}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Balance: ₹{entry.balance_after}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 p-4 text-center bg-slate-50 dark:bg-slate-950 rounded-xl">
                  No ledger entries recorded (transaction failed or rolled back).
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {selectedTx.status === 'COMPLETED' && (
                <button
                  disabled={reversingId === selectedTx.id}
                  onClick={() => handleReverse(selectedTx.id)}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{reversingId === selectedTx.id ? 'Reversing...' : 'Execute Reversal'}</span>
                </button>
              )}
              <button
                onClick={() => {
                  const id = selectedTx.id;
                  setSelectedTx(null);
                  navigate(`/trace?id=${id}`);
                }}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Transaction Trace</span>
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
