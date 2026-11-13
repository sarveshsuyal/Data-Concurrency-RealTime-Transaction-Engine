import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { api } from '../services/api';
import { ConcurrencyExperiment } from '../types';

export const RaceLab: React.FC = () => {
  const [strategy, setStrategy] = useState<string>('PESSIMISTIC');
  const [initialBalance, setInitialBalance] = useState<number>(1000);
  const [withdrawalA, setWithdrawalA] = useState<number>(700);
  const [withdrawalB, setWithdrawalB] = useState<number>(500);
  const [running, setRunning] = useState<boolean>(false);
  const [activeExperiment, setActiveExperiment] = useState<ConcurrencyExperiment | null>(null);
  const [pastExperiments, setPastExperiments] = useState<ConcurrencyExperiment[]>([]);

  const loadPastExperiments = async () => {
    try {
      const data = await api.getExperiments();
      setPastExperiments(data);
      if (!activeExperiment && data.length > 0) {
        setActiveExperiment(data[0]);
      }
    } catch (err) {
      console.error('Failed to load past experiments', err);
    }
  };

  useEffect(() => {
    loadPastExperiments();
  }, []);

  const handleRunExperiment = async () => {
    setRunning(true);
    try {
      const exp = await api.runExperiment({
        strategy,
        initial_balance: initialBalance,
        withdrawals: [withdrawalA, withdrawalB]
      });
      setActiveExperiment(exp);
      loadPastExperiments();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run experiment.');
    } finally {
      setRunning(false);
    }
  };

  const strategiesInfo = {
    PESSIMISTIC: {
      name: 'Pessimistic Row Locking (SELECT FOR UPDATE)',
      description: 'Acquires exclusive DB row locks in canonical order. One thread executes while the other waits, preserving non-negative balances.',
      safe: true,
    },
    OPTIMISTIC: {
      name: 'Optimistic Locking (Version Check)',
      description: 'Reads current account version; updates only if version has not changed. Concurrency collisions are cleanly detected and aborted.',
      safe: true,
    },
    ATOMIC_CONDITIONAL: {
      name: 'Atomic Conditional (F() expressions & WHERE)',
      description: 'Executes UPDATE ... WHERE balance >= amount atomically in DB engine, completely avoiding application-level race windows.',
      safe: true,
    },
    UNSAFE_BASELINE: {
      name: 'Unsafe Baseline (Isolated Lab Demonstration Only)',
      description: 'Check-then-act with artificial race latency. Demonstrates double-spending and invariant breakdown (negative balances).',
      safe: false,
    },
  };

  const currentInfo = strategiesInfo[strategy as keyof typeof strategiesInfo] || strategiesInfo.PESSIMISTIC;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <FlaskConical className="w-6 h-6 text-brand-400" />
          <span>Race-Condition Laboratory</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Execute multi-threaded concurrency attacks in an isolated test environment to evaluate database lock mechanics
        </p>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-start space-x-3 text-xs text-brand-300">
        <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-brand-200">Isolated Sandbox Guarantee: </span>
          All laboratory experiments execute exclusively against temporary, isolated test accounts. Production user balances are never exposed to unsafe operations.
        </div>
      </div>

      {/* Experiment Setup Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Configure Experiment
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Concurrency Strategy
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="PESSIMISTIC">Pessimistic Locking (SELECT FOR UPDATE)</option>
              <option value="OPTIMISTIC">Optimistic Locking (Version Number)</option>
              <option value="ATOMIC_CONDITIONAL">Atomic Conditional Update</option>
              <option value="UNSAFE_BASELINE">Unsafe Baseline (Vulnerable Demo)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-2">{currentInfo.description}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Initial Sender Balance (₹)
            </label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Thread 1 (₹)
              </label>
              <input
                type="number"
                value={withdrawalA}
                onChange={(e) => setWithdrawalA(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Thread 2 (₹)
              </label>
              <input
                type="number"
                value={withdrawalB}
                onChange={(e) => setWithdrawalB(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
            Total Withdrawal: <span className="font-bold text-slate-200">₹{withdrawalA + withdrawalB}</span>
            <br />
            Initial Balance: <span className="font-bold text-slate-200">₹{initialBalance}</span>
            <br />
            <span className="text-amber-400">Potential Overdraft: ₹{withdrawalA + withdrawalB - initialBalance}</span>
          </div>

          <button
            onClick={handleRunExperiment}
            disabled={running}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition-all shadow-lg ${
              strategy === 'UNSAFE_BASELINE'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/30'
            } disabled:opacity-50`}
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Concurrent Threads...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Launch Concurrent Race Attack</span>
              </>
            )}
          </button>
        </div>

        {/* Experiment Results Viewer */}
        <div className="lg:col-span-2 space-y-6">
          {activeExperiment ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{activeExperiment.experiment_name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Duration: {activeExperiment.duration_ms} ms | Executed at: {new Date(activeExperiment.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    activeExperiment.invariants_preserved
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {activeExperiment.invariants_preserved ? 'INVARIANTS PRESERVED' : 'INVARIANTS VIOLATED'}
                </span>
              </div>

              {/* Invariant Comparison Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Initial Balance</span>
                  <div className="text-lg font-bold text-slate-100 mt-1">₹{activeExperiment.initial_balance}</div>
                  <span className="text-[10px] text-slate-500">Before operations</span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Final Persisted Balance</span>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      Number(activeExperiment.final_balance) < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    ₹{activeExperiment.final_balance}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {Number(activeExperiment.final_balance) < 0 ? 'Illegal Negative Balance!' : 'Protected non-negative'}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Thread Outcome</span>
                  <div className="text-lg font-bold text-slate-100 mt-1">
                    {activeExperiment.successful_count} OK / {activeExperiment.failed_count} Blocked
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {activeExperiment.invariants_preserved ? 'Conflict resolved safely' : 'Double spend permitted'}
                  </span>
                </div>
              </div>

              {/* Thread Execution Logs */}
              <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
                Live Thread Execution Logs
              </h4>

              <div className="space-y-2 font-mono text-xs">
                {activeExperiment.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>Thread {log.thread}: Requested ₹{log.requested_amount}</span>
                    </div>
                    <span className="text-[11px]">{log.message || log.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              No experiment selected. Launch an experiment above to view execution traces.
            </div>
          )}

          {/* Past Experiments History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-4">
              Experiment History
            </h3>
            <div className="space-y-2">
              {pastExperiments.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setActiveExperiment(exp)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    activeExperiment?.id === exp.id
                      ? 'bg-slate-800 border-brand-500 text-slate-100'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-200">{exp.strategy}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      ₹{exp.initial_balance} &rarr; ₹{exp.final_balance}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      exp.invariants_preserved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {exp.invariants_preserved ? 'PASSED' : 'VIOLATED'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlock & Cyclic Lock Contention Simulator */}
          <DeadlockCard />
        </div>
      </div>
    </div>
  );
};

const DeadlockCard: React.FC = () => {
  const [deadlockResult, setDeadlockResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const handleRunDeadlock = async () => {
    setRunning(true);
    try {
      const res = await api.simulateDeadlock();
      setDeadlockResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Deadlock & Cyclic Dependency Simulator</h3>
          <p className="text-xs text-slate-400">Demonstrates why reverse row-locking produces circular wait deadlocks</p>
        </div>
        <button
          onClick={handleRunDeadlock}
          disabled={running}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs hover:opacity-90 flex items-center space-x-1.5"
        >
          {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
          <span>Simulate Deadlock</span>
        </button>
      </div>

      {deadlockResult && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Deadlock State Detected:</span>
            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
              deadlockResult.deadlock_detected ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {deadlockResult.deadlock_detected ? 'Deadlock / Conflict Triggered' : 'Clean'}
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            {deadlockResult.worker_1?.events?.map((ev: string, i: number) => (
              <p key={i}>• {ev}</p>
            ))}
            {deadlockResult.worker_2?.events?.map((ev: string, i: number) => (
              <p key={i}>• {ev}</p>
            ))}
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-[11px] font-sans">
            <strong>DataCore Invariant:</strong> {deadlockResult.resolution}
          </div>
        </div>
      )}
    </div>
  );
};
