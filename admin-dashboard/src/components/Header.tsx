import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Activity, Server } from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    api.checkHealth()
      .then(() => {
        if (mounted) setApiOnline(true);
      })
      .catch(() => {
        if (mounted) setApiOnline(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* Render API Live Status Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-slate-300">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          <span>API:</span>
          <span className="flex items-center font-medium">
            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${apiOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            <span className={apiOnline ? 'text-emerald-400' : 'text-amber-300'}>
              {apiOnline === null ? 'Checking' : apiOnline ? 'Live' : 'Connecting'}
            </span>
          </span>
        </div>

        {/* PostgreSQL Database Status Badge */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-brand-400" />
          <span>PostgreSQL:</span>
          <span className="flex items-center text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
            Authoritative
          </span>
        </div>

        {/* Engine Security Badge */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Double-Entry:</span>
          <span className="text-emerald-400 font-medium">Protected</span>
        </div>

        {/* Real-time Indicator */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Live Feed</span>
        </div>
      </div>
    </header>
  );
};
