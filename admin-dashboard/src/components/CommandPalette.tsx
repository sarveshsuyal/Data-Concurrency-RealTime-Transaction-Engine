import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  Cpu,
  FlaskConical,
  Scale,
  Users,
  ShieldAlert,
  Server,
  Zap,
  Flame,
  Gauge,
  LifeBuoy,
  Code2,
  Webhook,
  Layers,
  Settings,
  X,
  CreditCard,
  Radio,
  FileSpreadsheet
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const items = [
    { label: 'Executive Command Center', path: '/', category: 'Core', icon: LayoutDashboard },
    { label: 'Live Transactions Monitor', path: '/transactions', category: 'Core', icon: ArrowLeftRight },
    { label: 'Transaction Intelligence & Trace', path: '/intelligence', category: 'Core', icon: Radio },
    { label: 'Concurrency Engine Monitor', path: '/concurrency', category: 'Concurrency', icon: Cpu },
    { label: 'Race-Condition Laboratory', path: '/race-lab', category: 'Concurrency', icon: FlaskConical },
    { label: 'Database Observatory', path: '/observatory', category: 'Database', icon: Server },
    { label: 'Distributed Systems Failure Lab', path: '/failure-lab', category: 'Database', icon: Zap },
    { label: 'Performance Benchmarks', path: '/benchmarks', category: 'Database', icon: Gauge },
    { label: 'Accounts & Statements', path: '/accounts', category: 'Financial', icon: CreditCard },
    { label: 'Consistency Ledger & Invariants', path: '/consistency', category: 'Financial', icon: Scale },
    { label: 'Reconciliation Center', path: '/reconciliation', category: 'Financial', icon: FileSpreadsheet },
    { label: 'Settlement Center', path: '/settlement', category: 'Financial', icon: Layers },
    { label: 'Risk & Anomaly Detection', path: '/anomalies', category: 'Safety', icon: Flame },
    { label: 'Incident Management Board', path: '/incidents', category: 'Safety', icon: LifeBuoy },
    { label: 'Audit Trail & Hash Chaining', path: '/audit-logs', category: 'Safety', icon: ShieldAlert },
    { label: 'Developer Platform & Playground', path: '/developer', category: 'Developer', icon: Code2 },
    { label: 'Webhook Management', path: '/webhooks', category: 'Developer', icon: Webhook },
    { label: 'User & Role Management', path: '/users', category: 'Enterprise', icon: Users },
    { label: 'Workspaces & Tenancy', path: '/workspaces', category: 'Enterprise', icon: Layers },
    { label: 'Settings & Appearance', path: '/settings', category: 'Settings', icon: Settings },
  ];

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      } else if (isOpen) {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            navigate(filteredItems[selectedIndex].path);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-datacore-darkBorder">
          <Search className="w-5 h-5 text-brand-500 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Type a command, module name, or destination... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-base"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No matching modules or actions found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-500/15 to-purple-500/15 text-brand-700 dark:text-brand-300 font-medium border border-brand-400/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-brand-500/20 text-brand-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Quick Helper Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-datacore-darkBorder bg-slate-50 dark:bg-[#151322] flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">↓</kbd></span>
          <span>Open with <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};
