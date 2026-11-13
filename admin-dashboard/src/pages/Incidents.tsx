import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  X,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createIncident({
        title,
        description: desc,
        severity,
        status: 'DETECTED',
        affected_service: 'Transaction Engine'
      });
      setShowCreate(false);
      setTitle('');
      setDesc('');
      fetchIncidents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateIncidentStatus(id, newStatus);
      fetchIncidents();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const columns = ['DETECTED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Incident Management & Response Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Production incident progression: Detected → Acknowledged → Investigating → Resolved → Closed
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Declare Incident</span>
        </button>
      </div>

      {/* Incident Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colIncidents = incidents.filter(inc => inc.status === col);
          return (
            <div key={col} className="glass-panel p-4 rounded-2xl flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-datacore-darkBorder">
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{col}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {colIncidents.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {colIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-[#1a1829] border border-slate-200 dark:border-datacore-darkBorder shadow-sm space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                        inc.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' :
                        inc.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(inc.created_at).toLocaleTimeString()}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{inc.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{inc.description}</p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">{inc.affected_service}</span>
                      {col === 'DETECTED' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, 'ACKNOWLEDGED')}
                          className="text-[10px] font-bold text-brand-600 hover:underline"
                        >
                          Acknowledge →
                        </button>
                      )}
                      {col === 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, 'INVESTIGATING')}
                          className="text-[10px] font-bold text-purple-600 hover:underline"
                        >
                          Investigate →
                        </button>
                      )}
                      {col === 'INVESTIGATING' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                          className="text-[10px] font-bold text-emerald-600 hover:underline"
                        >
                          Resolve →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Declare Incident Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-datacore-darkBorder pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Declare Incident</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-medium">Incident Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Heightened Latency on High-Value Transfers"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-medium">Severity</label>
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

              <div>
                <label className="text-slate-500 block mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Document initial symptoms and affected subsystems..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                Publish Incident
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
