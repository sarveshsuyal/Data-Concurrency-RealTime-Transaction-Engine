import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Account } from '../types';

export const Accounts: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [statement, setStatement] = useState<any | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const fetchUsersAndAccounts = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (accId: string, accNumber: string) => {
    setStatementLoading(true);
    setSelectedAccount(accNumber);
    try {
      // Find account ID from users
      let foundId = accId;
      if (!foundId) {
        for (const u of users) {
          const a = u.accounts?.find((x: any) => x.account_number === accNumber);
          if (a?.id) foundId = a.id;
        }
      }
      const data = await api.getAccountStatement(foundId);
      setStatement(data);
    } catch (err) {
      console.error('Failed to load statement', err);
    } finally {
      setStatementLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndAccounts();
  }, []);

  const allAccounts: any[] = [];
  users.forEach(u => {
    u.accounts?.forEach((acc: any) => {
      allAccounts.push({
        ...acc,
        user_email: u.email,
        user_name: u.full_name,
        user_id: u.id
      });
    });
  });

  const filtered = allAccounts.filter(a =>
    a.account_number?.toLowerCase().includes(search.toLowerCase()) ||
    a.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Account Management & Statements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative ledger accounts, real-time balances, version tracking, and itemized statement audit
          </p>
        </div>
        <button
          onClick={fetchUsersAndAccounts}
          className="p-2 bg-white dark:bg-[#1a1829] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-datacore-darkBorder transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-panel p-4 rounded-2xl flex items-center space-x-3">
        <Search className="w-5 h-5 text-brand-500 shrink-0" />
        <input
          type="text"
          placeholder="Search by Account Number (e.g. DC-6812) or Customer Email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
        />
      </div>

      {/* Accounts Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-datacore-darkBorder text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Account Number</th>
                <th className="py-2.5 px-3">Account Holder</th>
                <th className="py-2.5 px-3">Current Balance</th>
                <th className="py-2.5 px-3">Currency</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((acc) => (
                <tr key={acc.account_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{acc.account_number}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{acc.user_name}</div>
                    <div className="text-[10px] text-slate-400">{acc.user_email}</div>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white font-mono text-sm">
                    ₹{acc.balance}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{acc.currency || 'INR'}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase font-mono">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => loadStatement(acc.id, acc.account_number)}
                      className="px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold text-xs transition-colors"
                    >
                      Statement
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Statement Drawer / Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1a1829] border border-brand-300/40 dark:border-datacore-darkBorder rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-datacore-darkBorder pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  Statement: {selectedAccount}
                </h3>
                <p className="text-xs text-slate-400">Authoritative balance breakdown and ledger history</p>
              </div>
              <button
                onClick={() => setSelectedAccount(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statementLoading ? (
              <div className="py-12 flex items-center justify-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span>Generating itemized statement from ledger...</span>
              </div>
            ) : statement ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Total Credits</span>
                    <p className="text-sm font-bold text-emerald-500 mt-0.5">+₹{statement.total_credits}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Total Debits</span>
                    <p className="text-sm font-bold text-rose-500 mt-0.5">-₹{statement.total_debits}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Closing Balance</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">₹{statement.current_balance}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Itemized Ledger Postings ({statement.ledger_entries_count})</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {statement.statement_entries?.map((e: any) => (
                      <div
                        key={e.id}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            e.entry_type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {e.entry_type}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{e.description || 'Transfer'}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</span>
                          <span className="font-bold text-slate-900 dark:text-white">₹{e.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
