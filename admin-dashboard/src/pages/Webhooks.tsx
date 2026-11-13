import React, { useEffect, useState } from 'react';
import {
  Webhook,
  Send,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  X,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import { WebhookEndpoint } from '../types';

export const Webhooks: React.FC = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [url, setUrl] = useState('');
  const [pingResult, setPingResult] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  const fetchWebhooks = async () => {
    try {
      const data = await api.getWebhooks();
      setEndpoints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWebhook(url, ['transaction.completed', 'transaction.failed', 'anomaly.detected']);
      setShowRegister(false);
      setUrl('');
      fetchWebhooks();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePing = async (id: string) => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await api.testWebhookPing(id);
      setPingResult(res);
    } catch (err: any) {
      setPingResult({ error: err?.response?.data?.detail || 'Ping failed' });
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Webhook Management Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time HTTP event dispatching with HMAC-SHA256 signature verification and delivery tracking
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Endpoint</span>
        </button>
      </div>

      {/* Webhook Endpoints Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Webhook className="w-4 h-4 text-brand-500" />
          <span>Subscribed Endpoints ({endpoints.length})</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-datacore-darkBorder text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Subscriber URL</th>
                <th className="py-2.5 px-3">Subscribed Events</th>
                <th className="py-2.5 px-3">HMAC Secret</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white break-all">{ep.url}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {ep.events?.map((ev) => (
                        <span key={ev} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{ep.secret?.substring(0, 12)}••••••••</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handlePing(ep.id)}
                      disabled={pinging}
                      className="px-3 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold text-xs transition-colors"
                    >
                      {pinging ? 'Sending...' : 'Test HMAC Ping'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ping Result Box */}
      {pingResult && (
        <div className="glass-panel p-5 rounded-2xl space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>HMAC Signature Verified & Dispatched</span>
            </span>
            <span className="text-slate-400">{pingResult.duration_ms} ms</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 text-xs overflow-x-auto">
            <pre>{JSON.stringify(pingResult, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Register Endpoint Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-datacore-darkBorder pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Register Webhook Endpoint</h3>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-medium">HTTPS Destination URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/webhooks"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-500 text-[11px]">
                A cryptographically random HMAC secret (`whsec_...`) will be generated automatically to sign deliveries.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                Save Webhook Endpoint
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
