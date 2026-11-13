import React, { useEffect, useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { SettlementBatch } from '../types';

export const Settlement: React.FC = () => {
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  const fetchBatches = async () => {
    try {
      const data = await api.getSettlementBatches();
      setBatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    setSettling(true);
    try {
      await api.createSettlementBatch();
      fetchBatches();
    } catch (err) {
      console.error(err);
    } finally {
      setSettling(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Operations & Settlement Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Internal ledger settlement batching, net obligations calculation, and accounting audit batches
          </p>
        </div>
        <button
          onClick={handleSettle}
          disabled={settling}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-2 shrink-0"
        >
          {settling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{settling ? 'Settling Ledger...' : 'Execute Settlement Batch'}</span>
        </button>
      </div>

      {/* Settlement Batches Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <FileCheck className="w-4 h-4 text-brand-500" />
          <span>Settlement Batch History</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-datacore-darkBorder text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Batch Number</th>
                <th className="py-2.5 px-3">Transactions</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3">Settled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{b.batch_number}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{b.transaction_count} txs</td>
                  <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                    {b.currency} {b.total_amount}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{new Date(b.created_at).toLocaleTimeString()}</td>
                  <td className="py-3 px-3 text-slate-500">
                    {b.settled_at ? new Date(b.settled_at).toLocaleTimeString() : 'In Progress'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
