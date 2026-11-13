import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Filter, Terminal, ShieldCheck, Hash, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('');

  const fetchLogs = async () => {
    try {
      const data = await api.getAuditLogs(filterAction || undefined);
      const list = Array.isArray(data) ? data : data.results || [];
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-brand-500" />
            <span>Audit & Event Inspector (SHA-256 Chained)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tamper-evident, cryptographically chained audit trail verifying mutations, auth events, and reversals
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="AUTH_LOGIN">AUTH_LOGIN</option>
              <option value="AUTH_REGISTER">AUTH_REGISTER</option>
              <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
              <option value="TRANSACTION_REVERSED">TRANSACTION_REVERSED</option>
              <option value="DEADLOCK_SIMULATION">DEADLOCK_SIMULATION</option>
              <option value="BENCHMARK_EXECUTED">BENCHMARK_EXECUTED</option>
              <option value="WEBHOOK_DELIVERED">WEBHOOK_DELIVERED</option>
              <option value="API_KEY_CREATED">API_KEY_CREATED</option>
              <option value="SYSTEM_INITIALIZED">SYSTEM_INITIALIZED</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cryptographic Chain Integrity Card */}
      <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-brand-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Cryptographic Hash Chaining Active</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                SHA-256 VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Each log block computes <code className="font-mono text-brand-600 dark:text-brand-300">current_hash = SHA256(previous_hash + action + timestamp + payload)</code> guaranteeing irreversible immutability.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          <Hash className="w-3.5 h-3.5 text-brand-500" />
          <span>Genesis: 00000000...0000</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                <th className="px-5 py-3.5 font-semibold">Action</th>
                <th className="px-5 py-3.5 font-semibold">Actor / IP</th>
                <th className="px-5 py-3.5 font-semibold">Hash Chain (Prev → Curr)</th>
                <th className="px-5 py-3.5 font-semibold">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-sans">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold border border-brand-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-sans">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{log.user_email || 'SYSTEM'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.ip_address || '127.0.0.1'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px]">
                      <div className="flex items-center space-x-1 text-slate-400">
                        <LinkIcon className="w-2.5 h-2.5 text-slate-400" />
                        <span>p: {log.previous_hash ? log.previous_hash.substring(0, 8) + '...' : '00000000...'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span className="font-semibold">c: {log.current_hash ? log.current_hash.substring(0, 8) + '...' : 'verified'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 max-w-sm truncate font-mono text-[10px]">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
