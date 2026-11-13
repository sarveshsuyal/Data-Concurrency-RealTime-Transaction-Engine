import React, { useEffect, useState } from 'react';
import {
  Radio,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { Transaction } from '../types';

export const TransactionTrace: React.FC = () => {
  const [queryId, setQueryId] = useState('');
  const [traceData, setTraceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);
  const [reversalMessage, setReversalMessage] = useState<string | null>(null);

  const fetchTrace = async (id?: string) => {
    setLoading(true);
    setError(null);
    setReversalMessage(null);
    try {
      const data = await api.getTransactionTrace({ id: id || undefined });
      setTraceData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to locate transaction trace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
  }, []);

  const handleReverse = async () => {
    if (!traceData?.transaction?.id) return;
    setReversing(true);
    try {
      await api.reverseTransaction(traceData.transaction.id, 'Investigation reversal');
      setReversalMessage('Transaction successfully reversed with paired compensating ledger entries.');
      fetchTrace(traceData.transaction.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Reversal failed.');
    } finally {
      setReversing(false);
    }
  };

  const tx: Transaction | undefined = traceData?.transaction;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Transaction Intelligence & Trace Explorer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            End-to-end correlation tracing, 9-stage lifecycle latency, and dependency graph inspection
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex items-center space-x-3">
        <Search className="w-5 h-5 text-brand-500 shrink-0" />
        <input
          type="text"
          placeholder="Enter Transaction UUID or Correlation ID..."
          value={queryId}
          onChange={(e) => setQueryId(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
        />
        <button
          onClick={() => fetchTrace(queryId)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold hover:opacity-90 transition-opacity"
        >
          Inspect Trace
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reversalMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reversalMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span>Tracing execution stages across database...</span>
        </div>
      ) : tx ? (
        <div className="space-y-6">
          {/* Transaction Metadata Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-datacore-darkBorder pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Transaction Identifier</span>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 break-all">{tx.id}</p>
                <span className="text-[10px] font-mono text-brand-500">Correlation ID: {traceData.correlation_id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono uppercase ${
                  tx.status === 'COMPLETED' || tx.status === 'SUCCESS'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : tx.status === 'REVERSED'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                }`}>
                  {tx.status}
                </span>
                {tx.status === 'COMPLETED' && (
                  <button
                    onClick={handleReverse}
                    disabled={reversing}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{reversing ? 'Reversing...' : 'Compensating Reversal'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Sender Account</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tx.sender_account_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Receiver Account</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tx.receiver_account_number}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Amount & Currency</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono text-sm">{tx.currency} {tx.amount}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Lock Strategy</span>
                <p className="font-semibold text-brand-600 dark:text-brand-300 mt-0.5 font-mono">{tx.concurrency_strategy}</p>
              </div>
            </div>
          </div>

          {/* 9-Stage Documented Lifecycle */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Documented Lifecycle Stages (1 to 9)</span>
            </h3>

            <div className="space-y-3">
              {traceData?.stages?.map((st: any) => (
                <div
                  key={st.stage}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold font-mono flex items-center justify-center text-xs">
                      {st.stage}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{st.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-[11px] font-mono text-slate-400">{st.duration_ms} ms</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                      {st.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ledger Records Created */}
          {tx.ledger_entries && tx.ledger_entries.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Associated Double-Entry Ledger Postings</span>
              </h3>
              <div className="space-y-2">
                {tx.ledger_entries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.entry_type === 'DEBIT' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {entry.entry_type}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{entry.account_number}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-400">Post Balance: ₹{entry.balance_after}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">₹{entry.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
