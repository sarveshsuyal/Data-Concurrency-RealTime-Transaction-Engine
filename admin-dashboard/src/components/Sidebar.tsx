import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Radio,
  Cpu,
  FlaskConical,
  Server,
  Zap,
  Gauge,
  CreditCard,
  Scale,
  FileSpreadsheet,
  Layers,
  Flame,
  LifeBuoy,
  ShieldAlert,
  Code2,
  Webhook,
  Users,
  Settings,
  Smartphone,
  LogOut,
  ChevronRight,
  ChevronDown,
  Activity,
  Menu,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  userEmail?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ userEmail }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('datacore_admin_token');
    localStorage.removeItem('datacore_admin_user');
    navigate('/login');
  };

  const navGroups = [
    {
      group: 'Core Observability',
      items: [
        { to: '/', label: 'Command Center', icon: LayoutDashboard },
        { to: '/transactions', label: 'Live Transactions', icon: ArrowLeftRight },
        { to: '/intelligence', label: 'Transaction Trace', icon: Radio },
        { to: '/concurrency', label: 'Concurrency Monitor', icon: Cpu },
        { to: '/race-lab', label: 'Race-Condition Lab', icon: FlaskConical },
      ]
    },
    {
      group: 'Database Engineering',
      items: [
        { to: '/observatory', label: 'DB Observatory', icon: Server },
        { to: '/failure-lab', label: 'Distributed Systems Lab', icon: Zap },
        { to: '/benchmarks', label: 'Benchmarks & Latency', icon: Gauge },
      ]
    },
    {
      group: 'Financial Systems',
      items: [
        { to: '/accounts', label: 'Accounts & Statements', icon: CreditCard },
        { to: '/consistency', label: 'Consistency Ledger', icon: Scale },
        { to: '/reconciliation', label: 'Reconciliation', icon: FileSpreadsheet },
        { to: '/settlement', label: 'Settlement Batches', icon: Layers },
      ]
    },
    {
      group: 'Risk & Safety',
      items: [
        { to: '/anomalies', label: 'Risk & Anomaly Engine', icon: Flame },
        { to: '/incidents', label: 'Incident Management', icon: LifeBuoy },
        { to: '/reliability', label: 'SLO & Reliability', icon: Activity },
        { to: '/audit-logs', label: 'Audit Trail & Chaining', icon: ShieldAlert },
      ]
    },
    {
      group: 'Developer & Platform',
      items: [
        { to: '/developer', label: 'Developer Platform', icon: Code2 },
        { to: '/webhooks', label: 'Webhooks & HMAC', icon: Webhook },
        { to: '/users', label: 'User & Role Access', icon: Users },
        { to: '/workspaces', label: 'Workspaces & Tenants', icon: ShieldCheck },
        { to: '/settings', label: 'Settings & Theme', icon: Settings },
        { to: '/customer-app', label: 'Customer Mobile App', icon: Smartphone, highlight: true },
      ]
    }
  ];

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-datacore-warmWhite dark:bg-[#0f0e17] border-r border-brand-200/50 dark:border-datacore-darkBorder flex flex-col h-screen sticky top-0 transition-all duration-200 z-30 select-none`}>
      {/* Brand Header */}
      <div className="p-4 border-b border-brand-200/50 dark:border-datacore-darkBorder flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F8C4DB] via-[#DCC5FA] to-[#BFA1F5] flex items-center justify-between p-2 shadow-md shadow-brand-400/20 shrink-0">
            <Zap className="w-6 h-6 text-[#30283C] fill-[#30283C]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base text-slate-800 dark:text-white tracking-tight">DataCore</h1>
              <p className="text-[10px] font-mono text-brand-600 dark:text-brand-300 font-semibold tracking-wider uppercase">Enterprise v2.0</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-mono">
                {grp.group}
              </div>
            )}
            {grp.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-500/20 to-purple-500/20 text-brand-700 dark:text-brand-300 border border-brand-400/30 shadow-sm'
                        : item.highlight
                        ? 'text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-purple-500 animate-pulse' : ''}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.highlight && (
                    <span className="ml-auto text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                      Live
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-brand-200/50 dark:border-datacore-darkBorder bg-slate-50/50 dark:bg-[#151322]">
        {!collapsed ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="overflow-hidden">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Active Operator</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{userEmail || 'admin@datacore.io'}</p>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded font-mono">
                ADMIN
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
