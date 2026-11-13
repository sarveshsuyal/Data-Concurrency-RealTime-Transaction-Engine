import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Gauge,
  Flame,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { ReliabilityObjective } from '../types';

export const Reliability: React.FC = () => {
  const [objectives, setObjectives] = useState<ReliabilityObjective[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchObjectives = async () => {
    try {
      const data = await api.getReliabilityObjectives();
      setObjectives(data.objectives || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectives();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          SLO, SLA & Reliability Center
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Operational reliability monitoring, Service Level Objectives (SLO), and error budget burn rate tracking
        </p>
      </div>

      {/* Global Reliability Score Card */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-100 to-purple-100 dark:from-brand-950 dark:to-purple-950 text-brand-600 dark:text-brand-300">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">Global Service Health</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">99.96%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">All Core Production Services Complying With Objectives</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            Error Budget: Healthy
          </span>
        </div>
      </div>

      {/* Objectives List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {objectives.map((obj) => (
          <div key={obj.id} className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{obj.name}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                {obj.time_window}
              </span>
            </div>

            <div className="flex items-baseline justify-between font-mono">
              <div>
                <span className="text-[10px] text-slate-400">Current</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{obj.current_value}%</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Target</span>
                <p className="text-sm font-bold text-slate-500">{obj.target_percentage}%</p>
              </div>
            </div>

            {/* Error budget burn bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Error Budget Consumed</span>
                <span className="font-bold text-brand-500">{obj.error_budget_consumed}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    obj.error_budget_consumed > 80 ? 'bg-rose-500' :
                    obj.error_budget_consumed > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(obj.error_budget_consumed, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Status</span>
              <span className="text-emerald-500 font-bold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Compliant
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
