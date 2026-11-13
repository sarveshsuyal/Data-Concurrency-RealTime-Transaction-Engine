import React, { useEffect, useState } from 'react';
import {
  Layers,
  ShieldCheck,
  Plus,
  RefreshCw,
  Building,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Organization, Workspace } from '../types';

export const Workspaces: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsEnv, setWsEnv] = useState('Production');

  const fetchData = async () => {
    try {
      const data = await api.getWorkspaces();
      setOrgs(data.organizations || []);
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWorkspace(wsName, wsEnv);
      setShowCreate(false);
      setWsName('');
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
            Organizations & Multi-Tenant Workspaces
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise tenancy management, isolated operational environments, and workspace access scoping
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspaces List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map((ws) => (
          <div key={ws.id} className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{ws.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400">Slug: {ws.slug}</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                ws.environment === 'Production' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
              }`}>
                {ws.environment}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Data Isolated
              </span>
              <span className="font-mono text-[10px]">Created: {new Date(ws.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tenancy Isolation Info Banner */}
      <div className="glass-panel p-6 rounded-2xl space-y-2 border-l-4 border-l-brand-500">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-brand-500" />
          <span>Enforced Backend Tenant Isolation Guarantee</span>
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          In DataCore, workspaces provide strict data segregation. Account balances, transfers, double-entry ledger entries, and audit events are scoped to their respective workspace at the Django REST Framework queryset layer. Cross-tenant leakage is mathematically impossible without explicit platform administrator override.
        </p>
      </div>

      {/* Create Workspace Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-datacore-darkBorder pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Create New Workspace</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-medium">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. Asia-Pacific Settlement Hub"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-medium">Environment</label>
                <select
                  value={wsEnv}
                  onChange={(e) => setWsEnv(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Sandbox">Sandbox</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                Create Workspace
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
