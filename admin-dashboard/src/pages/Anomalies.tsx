import React, { useEffect, useState } from 'react';
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { AnomalyRule, AnomalyAlert } from '../types';

export const Anomalies: React.FC = () => {
  const [rules, setRules] = useState<AnomalyRule[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('HIGH_AMOUNT');
  const [threshold, setThreshold] = useState('10000.00');
  const [severity, setSeverity] = useState('HIGH');

  const fetchData = async () => {
    try {
      const [r, a] = await Promise.all([
        api.getAnomalyRules(),
        api.getAnomalyAlerts()
      ]);
      setRules(r);
      setAlerts(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAnomalyRule({
        name: ruleName,
        rule_type: ruleType,
        threshold,
        severity,
        is_active: true
      });
      setShowAddRule(false);
      setRuleName('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveAlert = async (id: string, newStatus: string) => {
    try {
      await api.resolveAnomalyAlert(id, newStatus);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Risk & Anomaly Detection Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configurable rule-based detection for velocity surges, high-value transfers, and automated incident escalation
          </p>
        </div>
        <button
          onClick={() => setShowAddRule(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Detection Rule</span>
        </button>
      </div>

      {/* Rules Overview */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Configured Detection Rules ({rules.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder flex items-center justify-between text-xs font-mono"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Type: {r.rule_type} | Threshold: {r.threshold}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                r.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {r.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Triggered Alerts Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Triggered Risk Alerts ({alerts.length})</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-datacore-darkBorder text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Alert Title</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No active anomaly alerts detected. Engine operating within risk parameters.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-500">{new Date(a.created_at).toLocaleTimeString()}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{a.title}</div>
                      <div className="text-[10px] text-slate-400">{JSON.stringify(a.details)}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        a.status === 'OPEN' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {a.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleResolveAlert(a.id, 'RESOLVED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-semibold"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveAlert(a.id, 'FALSE_POSITIVE')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-datacore-darkBorder pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Create Detection Rule</h3>
              <button onClick={() => setShowAddRule(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-medium">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Unusual High Value Transfer"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-medium">Rule Type</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                >
                  <option value="HIGH_AMOUNT">High Transaction Amount Ceiling</option>
                  <option value="RAPID_TRANSACTIONS">Velocity Frequency Surge (Txs/min)</option>
                  <option value="REPEATED_FAILURES">Repeated Failure Threshold</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-medium">Trigger Threshold</label>
                <input
                  type="text"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-medium">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                Save Detection Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
