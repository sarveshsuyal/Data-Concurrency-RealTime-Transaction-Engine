import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Activity,
  Sun,
  Moon,
  Laptop,
  Command,
  Bell,
  ChevronDown,
  Layers,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useTheme } from './ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onOpenCommandPalette }) => {
  const { theme, setTheme, isDark } = useTheme();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState('Production High-Throughput');
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Double-entry audit verified', time: '2m ago', read: false },
    { id: 2, title: 'Sample transfer Alice -> Bob committed', time: '12m ago', read: true },
    { id: 3, title: 'Idempotency key duplicate suppressed', time: '28m ago', read: true },
  ];

  return (
    <header className="h-16 border-b border-brand-200/50 dark:border-datacore-darkBorder bg-white/80 dark:bg-[#12101e]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center space-x-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
              Live
            </span>
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Workspace Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1c192d] border border-slate-200 dark:border-datacore-darkBorder text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-400 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-brand-500" />
            <span className="max-w-[140px] truncate">{currentWorkspace}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a1829] border border-slate-200 dark:border-datacore-darkBorder rounded-xl shadow-xl py-1 z-30">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Workspace
              </div>
              {['Production High-Throughput', 'Staging Concurrency Sandbox', 'Disaster Recovery Warm Standby'].map((ws) => (
                <button
                  key={ws}
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setShowWorkspaceMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
                    currentWorkspace === ws ? 'text-brand-600 dark:text-brand-300 font-semibold' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{ws}</span>
                  {currentWorkspace === ws && <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search / Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1c192d] border border-slate-200 dark:border-datacore-darkBorder text-xs text-slate-500 dark:text-slate-400 hover:border-brand-400 transition-colors"
        >
          <Command className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search / Cmds</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-semibold">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle (Light / Dark / System) */}
        <button
          onClick={() => {
            if (theme === 'dark') setTheme('light');
            else if (theme === 'light') setTheme('system');
            else setTheme('dark');
          }}
          title={`Current Theme: ${theme}`}
          className="p-2 rounded-xl bg-slate-100 dark:bg-[#1c192d] border border-slate-200 dark:border-datacore-darkBorder text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-brand-400" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Laptop className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#1c192d] border border-slate-200 dark:border-datacore-darkBorder text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1a1829] border border-slate-200 dark:border-datacore-darkBorder rounded-xl shadow-xl p-3 z-30">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications</span>
                <span className="text-[10px] text-brand-500 font-medium">3 events</span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                    <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{n.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PostgreSQL Database Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-brand-50/60 dark:bg-[#1c192d] border border-brand-200/50 dark:border-datacore-darkBorder rounded-full text-xs text-slate-600 dark:text-slate-300">
          <Database className="w-3.5 h-3.5 text-brand-500" />
          <span>PostgreSQL:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Authoritative</span>
        </div>
      </div>
    </header>
  );
};
