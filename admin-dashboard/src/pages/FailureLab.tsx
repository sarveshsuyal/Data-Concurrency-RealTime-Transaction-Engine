import React, { useState } from 'react';
import {
  Zap,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export const FailureLab: React.FC = () => {
  const [strategy, setStrategy] = useState('EXPONENTIAL_JITTER');
  const [attempts, setAttempts] = useState(5);
  const [retryResult, setRetryResult] = useState<any>(null);
  const [cbThreshold, setCbThreshold] = useState(3);
  const [cbResult, setCbResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runRetrySim = async () => {
    setLoading(true);
    try {
      const res = await api.simulateFailureLab({
        experiment_type: 'RETRY_BACKOFF',
        strategy,
        attempts: Number(attempts)
      });
      setRetryResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runCbSim = async () => {
    setLoading(true);
    try {
      const res = await api.simulateFailureLab({
        experiment_type: 'CIRCUIT_BREAKER',
        failure_threshold: Number(cbThreshold)
      });
      setCbResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Distributed Systems Failure Laboratory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Simulate retry storms, exponential backoff with full jitter, circuit breaker tripping, and cascading failure prevention
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Request Retry & Jitter Demonstrator */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Retry Storm & Backoff Jitter Simulator</h3>
              <p className="text-xs text-slate-400">Examines latency and thundering-herd avoidance</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block mb-1 font-medium">Backoff Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
              >
                <option value="EXPONENTIAL_JITTER">Exponential Backoff with Full Jitter (Recommended)</option>
                <option value="EXPONENTIAL">Standard Exponential Backoff</option>
                <option value="FIXED">Fixed Interval Retry</option>
                <option value="IMMEDIATE">Immediate Retry (Retry Storm Vulnerability)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-1 font-medium">Retry Attempts Before Resolution</label>
              <input
                type="number"
                min="2"
                max="8"
                value={attempts}
                onChange={(e) => setAttempts(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>

            <button
              onClick={runRetrySim}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Simulate Retry Backoff</span>
            </button>
          </div>

          {retryResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder space-y-3 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Total Backoff Latency:</span>
                <span className="font-bold text-brand-600 dark:text-brand-300">{retryResult.total_latency_ms} ms</span>
              </div>
              <div className="space-y-1.5 font-mono">
                {retryResult.timeline?.map((item: any) => (
                  <div key={item.attempt} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1a1829] border border-slate-200 dark:border-datacore-darkBorder text-[11px]">
                    <span className="text-slate-500">Attempt #{item.attempt} (+{item.delay_ms} ms)</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      item.outcome === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {item.outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Module 2: Circuit Breaker State Machine */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Circuit Breaker Pattern Simulator</h3>
              <p className="text-xs text-slate-400">CLOSED → OPEN → HALF-OPEN state progression</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block mb-1 font-medium">Failure Threshold Before Tripping</label>
              <input
                type="number"
                min="2"
                max="5"
                value={cbThreshold}
                onChange={(e) => setCbThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>

            <button
              onClick={runCbSim}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Simulate Circuit Breaker Sequence</span>
            </button>
          </div>

          {cbResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder space-y-3 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Final Circuit State:</span>
                <span className="font-bold text-emerald-500">{cbResult.final_state}</span>
              </div>
              <div className="space-y-1.5 font-mono">
                {cbResult.history?.map((h: any) => (
                  <div key={h.request_index} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1a1829] border border-slate-200 dark:border-datacore-darkBorder text-[11px]">
                    <span className="text-slate-500">Req #{h.request_index} [{h.circuit_state}]</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      h.outcome.includes('SUCCESS')
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : h.outcome.includes('SHORT')
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {h.outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
