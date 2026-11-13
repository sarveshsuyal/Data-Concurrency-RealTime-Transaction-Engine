import React, { useEffect, useState } from 'react';
import {
  Code2,
  Key,
  Copy,
  CheckCircle2,
  Play,
  Layers,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { ApiKey } from '../types';

export const DeveloperPlatform: React.FC = () => {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Playground state
  const [testEndpoint, setTestEndpoint] = useState('/api/admin/overview/');
  const [testMethod, setTestMethod] = useState('GET');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [eps, keys] = await Promise.all([
        api.getApiEndpoints(),
        api.getApiKeys()
      ]);
      setEndpoints(eps);
      setApiKeys(keys);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createApiKey(keyName, ['read:transactions', 'write:transfers']);
      setCreatedSecret(res.secret_token);
      setKeyName('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaygroundSend = async () => {
    setPlaygroundLoading(true);
    const start = performance.now();
    try {
      let res;
      if (testEndpoint === '/api/admin/overview/') {
        res = await api.getOverview();
      } else if (testEndpoint === '/api/admin/consistency/') {
        res = await api.getConsistencyReport();
      } else if (testEndpoint === '/api/admin/observatory/') {
        res = await api.getDatabaseObservatory();
      } else {
        res = await api.getOverview();
      }
      const dur = Math.round(performance.now() - start);
      setPlaygroundResponse({ status: 200, duration_ms: dur, body: res });
    } catch (err: any) {
      const dur = Math.round(performance.now() - start);
      setPlaygroundResponse({ status: err?.response?.status || 400, duration_ms: dur, body: err?.response?.data || { error: err.message } });
    } finally {
      setPlaygroundLoading(false);
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
            Developer Platform & API Explorer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            OpenAPI endpoint directory, scoped API key provisioning, and interactive live request sandbox
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateKey(true);
            setCreatedSecret(null);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision API Key</span>
        </button>
      </div>

      {/* Scoped API Keys Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Key className="w-4 h-4 text-brand-500" />
          <span>Scoped Developer API Keys ({apiKeys.length})</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-datacore-darkBorder text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Key Prefix</th>
                <th className="py-2.5 px-3">Scopes</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{k.name}</td>
                  <td className="py-3 px-3 text-brand-600 dark:text-brand-300">{k.prefix}••••••••</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes?.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{new Date(k.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive API Playground */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
          <span>Interactive Sandbox Playground</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={testMethod}
            onChange={(e) => setTestMethod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono text-xs font-bold"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>

          <select
            value={testEndpoint}
            onChange={(e) => setTestEndpoint(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200 font-mono text-xs"
          >
            <option value="/api/admin/overview/">/api/admin/overview/ (Command Center Metrics)</option>
            <option value="/api/admin/consistency/">/api/admin/consistency/ (Ledger Audit)</option>
            <option value="/api/admin/observatory/">/api/admin/observatory/ (DB Telemetry)</option>
          </select>

          <button
            onClick={handlePlaygroundSend}
            disabled={playgroundLoading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
          >
            {playgroundLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute Request</span>
          </button>
        </div>

        {playgroundResponse && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Response Status: <strong className="text-emerald-500">{playgroundResponse.status} OK</strong></span>
              <span className="text-slate-400">Latency: <strong className="text-brand-500">{playgroundResponse.duration_ms} ms</strong></span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs max-h-60 overflow-y-auto">
              <pre>{JSON.stringify(playgroundResponse.body, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Endpoint Directory Catalog */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-purple-500" />
          <span>Endpoint Directory</span>
        </h3>

        <div className="space-y-4">
          {endpoints.map((group) => (
            <div key={group.group} className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">{group.group}</h4>
              <div className="space-y-1.5">
                {group.endpoints.map((ep: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        ep.method === 'GET' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{ep.path}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-400 hidden sm:inline">{ep.description}</span>
                      <span className="text-[10px] text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {ep.auth}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provision API Key Modal */}
      {showCreateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-datacore-darkBorder pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Provision Developer API Key</h3>
              <button onClick={() => setShowCreateKey(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdSecret ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                  <strong>Important:</strong> Copy your secret API key now. It will never be displayed again for security!
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono text-xs">
                  <span className="truncate mr-2 text-slate-900 dark:text-slate-100">{createdSecret}</span>
                  <button
                    onClick={() => handleCopy(createdSecret)}
                    className="p-1.5 rounded-lg bg-brand-500 text-white shrink-0 hover:bg-brand-600"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => setShowCreateKey(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1 font-medium">Key Name</label>
                  <input
                    type="text"
                    required
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Accounting Settlement Service"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity"
                >
                  Generate Key
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
