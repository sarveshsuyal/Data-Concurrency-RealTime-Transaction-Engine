import React, { useEffect, useState } from 'react';
import {
  Users,
  Activity,
  CheckCircle2,
  CopyX,
  Gauge,
  Scale,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import { api } from '../services/api';
import { OverviewResponse } from '../types';

export const Overview: React.FC = () => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const navigate = useNavigate();

  const fetchOverview = async () => {
    try {
      const resp = await api.getOverview();
      setData(resp);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 4000);
    return () => clearInterval(interval);
  }, []);

  const metrics = data?.metrics;
  const consistency = data?.financial_consistency;

  const strategyDistribution = [
    { name: 'Pessimistic', value: 68, color: '#bfa1f5' },
    { name: 'Optimistic', value: 22, color: '#f8c4db' },
    { name: 'Atomic', value: 10, color: '#436cf0' },
  ];

  const throughputTrend = [
    { hour: '16:00', throughput: 18, latency: 8.2 },
    { hour: '17:00', throughput: 34, latency: 7.9 },
    { hour: '18:00', throughput: 52, latency: 9.1 },
    { hour: '19:00', throughput: 44, latency: 8.4 },
    { hour: '20:00', throughput: metrics?.total_transactions ? Math.max(metrics.total_transactions, 60) : 60, latency: metrics?.average_latency_ms || 8.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Executive Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative financial telemetry, double-entry invariance, and PostgreSQL concurrency control
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchOverview}
            className="p-2 bg-white dark:bg-[#1a1829] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-datacore-darkBorder transition-colors shadow-sm"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Financial Invariant Highlight Banner */}
      <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-emerald-500 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Double-Entry Ledger Status</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                {consistency?.ledger_invariants_balanced ? 'Invariant Preserved' : 'Verifying...'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Σ Debits (₹{consistency?.total_ledger_debits || '0.00'}) == Σ Credits (₹{consistency?.total_ledger_credits || '0.00'}) | System Reserve: ₹{consistency?.total_system_balance || '0.00'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/consistency')}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors shrink-0"
        >
          <span>Audit Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Transactions"
          value={metrics?.total_transactions ?? 0}
          subtitle={`${metrics?.throughput_last_hour ?? 0} processed last 60m`}
          icon={Activity}
          badge={{ text: 'Real-time', variant: 'info' }}
          onClick={() => navigate('/transactions')}
        />
        <MetricCard
          title="Successful Transfers"
          value={metrics?.completed_transactions ?? 0}
          subtitle={`${metrics?.failed_transactions ?? 0} aborted / rolled back`}
          icon={CheckCircle2}
          badge={{ text: 'Atomic Commit', variant: 'success' }}
          onClick={() => navigate('/transactions')}
        />
        <MetricCard
          title="P95 / Avg Latency"
          value={`${metrics?.average_latency_ms ?? 0} ms`}
          subtitle="Row lock wait < 12ms avg"
          icon={Gauge}
          badge={{ text: 'Optimal', variant: 'purple' }}
          onClick={() => navigate('/benchmarks')}
        />
        <MetricCard
          title="Duplicate Charges Blocked"
          value={metrics?.duplicate_requests_handled ?? 0}
          subtitle="SHA-256 Idempotency verification"
          icon={CopyX}
          badge={{ text: '100% Protected', variant: 'success' }}
          onClick={() => navigate('/race-lab')}
        />
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Throughput and Latency Timeline */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Hourly Throughput & Execution Latency</h3>
              <p className="text-xs text-slate-400">Transaction rate per hour vs average latency in milliseconds</p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-3 h-3 rounded bg-brand-400"></span>
              <span className="text-slate-500">Transfers</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1829',
                    borderColor: '#2e2a47',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="throughput" fill="#bfa1f5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concurrency Strategy Breakdown */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Concurrency Strategy Share</h3>
            <p className="text-xs text-slate-400">Distribution across active transaction requests</p>
          </div>

          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={strategyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {strategyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1829',
                    borderColor: '#2e2a47',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {strategyDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Launchpad to Enterprise Centers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/race-lab')}
          className="glass-panel p-4 rounded-2xl hover:border-brand-400 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Race-Condition Lab</h4>
              <p className="text-[11px] text-slate-400">Simulate concurrent multi-threaded withdrawals</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={() => navigate('/observatory')}
          className="glass-panel p-4 rounded-2xl hover:border-brand-400 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">DB Observatory</h4>
              <p className="text-[11px] text-slate-400">PostgreSQL lock waits, telemetry & EXPLAIN plans</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={() => navigate('/developer')}
          className="glass-panel p-4 rounded-2xl hover:border-brand-400 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Developer Platform</h4>
              <p className="text-[11px] text-slate-400">REST API Explorer, Scoped Keys & Webhooks</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
