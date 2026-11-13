import React, { useEffect, useState } from 'react';
import {
  Gauge,
  Play,
  Activity,
  Layers,
  Clock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { BenchmarkRecord } from '../types';

export const Benchmarks: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkRecord[]>([]);
  const [strategy, setStrategy] = useState('PESSIMISTIC');
  const [workers, setWorkers] = useState(4);
  const [iterations, setIterations] = useState(50);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBenchmarks = async () => {
    try {
      const data = await api.getBenchmarks();
      setBenchmarks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await api.runBenchmark({
        strategy,
        workers: Number(workers),
        iterations: Number(iterations)
      });
      fetchBenchmarks();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const latest = benchmarks[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Performance Benchmark Center
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Empirical measurements of throughput (TPS), lock contention, and latency percentiles (P95/P99) under controlled concurrency
        </p>
      </div>

      {/* Benchmark Control Bar */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-brand-500" />
          <span>Configure & Launch Live Concurrency Benchmark</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-500 block mb-1 font-medium">Concurrency Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
            >
              <option value="PESSIMISTIC">Pessimistic Row Lock (SELECT FOR UPDATE)</option>
              <option value="OPTIMISTIC">Optimistic Lock (Version Match)</option>
              <option value="ATOMIC_CONDITIONAL">Atomic Conditional (F() Expression)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-500 block mb-1 font-medium">Concurrent Workers</label>
            <select
              value={workers}
              onChange={(e) => setWorkers(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
            >
              <option value="2">2 Workers</option>
              <option value="4">4 Workers</option>
              <option value="8">8 Workers</option>
            </select>
          </div>

          <div>
            <label className="text-slate-500 block mb-1 font-medium">Total Operations</label>
            <input
              type="number"
              min="10"
              max="200"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={running}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 fill-white mr-1" />}
              <span>{running ? 'Benchmarking DB...' : 'Execute Benchmark'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Latest Benchmark Results Cards */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Throughput (TPS)</span>
            <div className="text-2xl font-black text-brand-600 dark:text-brand-300 font-mono mt-1">
              {latest.tps} ops/sec
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Workload: {latest.strategy}</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Avg Latency</span>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1">
              {latest.avg_latency_ms} ms
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">{latest.worker_count} concurrent threads</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">P95 Latency</span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-300 font-mono mt-1">
              {latest.p95_latency_ms} ms
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">95% completed below threshold</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">P99 Latency</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-300 font-mono mt-1">
              {latest.p99_latency_ms} ms
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Worst-case tail latency</span>
          </div>
        </div>
      )}

      {/* Historical Benchmark Records */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Benchmark Measurement History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-datacore-darkBorder text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Workers</th>
                <th className="py-2.5 px-3">Operations</th>
                <th className="py-2.5 px-3">Throughput (TPS)</th>
                <th className="py-2.5 px-3">P95 Latency</th>
                <th className="py-2.5 px-3">P99 Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {benchmarks.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 text-slate-500">{new Date(b.created_at).toLocaleTimeString()}</td>
                  <td className="py-3 px-3 font-semibold text-brand-600 dark:text-brand-300">{b.strategy}</td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{b.worker_count}</td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{b.iterations}</td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{b.tps}</td>
                  <td className="py-3 px-3 text-purple-600 dark:text-purple-400">{b.p95_latency_ms} ms</td>
                  <td className="py-3 px-3 text-rose-600 dark:text-rose-400">{b.p99_latency_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
