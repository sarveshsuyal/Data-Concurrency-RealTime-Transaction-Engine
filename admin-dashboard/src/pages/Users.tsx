import React, { useEffect, useState, useMemo } from 'react';
import {
  Users as UsersIcon,
  RefreshCw,
  Mail,
  Calendar,
  Shield,
  CreditCard,
  Search,
  Filter,
  Sliders,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Download,
  Eye,
  Lock,
  Unlock,
  Trash2,
  Activity,
  History,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { User, UserDetail, UserAccount } from '../types';

export const Users: React.FC = () => {
  // Directory State
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minBalance, setMinBalance] = useState<string>('');
  const [maxBalance, setMaxBalance] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Drawer / Modals State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<'accounts' | 'transactions' | 'adjustments' | 'audit'>('accounts');

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState<User | UserDetail | null>(null);
  const [adjustAccountId, setAdjustAccountId] = useState<string>('');
  const [adjustOperation, setAdjustOperation] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState<string>('250.00');
  const [adjustReason, setAdjustReason] = useState<string>('ADMIN_CORRECTION');
  const [adjustNote, setAdjustNote] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState<boolean>(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  // Lifecycle Action Modal State
  const [lifecycleModal, setLifecycleModal] = useState<{
    type: 'suspend' | 'reactivate' | 'deactivate';
    user: User | UserDetail;
  } | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState<string>('');
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [lifecycleLoading, setLifecycleLoading] = useState<boolean>(false);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Users from authoritative backend
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers({
        search: debouncedSearch,
        role: roleFilter,
        is_active: statusFilter !== '' ? statusFilter === 'true' : undefined,
        min_balance: minBalance || undefined,
        max_balance: maxBalance || undefined,
        page: currentPage,
        page_size: pageSize,
      });

      if (data && typeof data === 'object' && 'results' in data) {
        setUsers(data.results || []);
        setTotalCount(data.count || 0);
      } else if (Array.isArray(data)) {
        setUsers(data);
        setTotalCount(data.length);
      } else {
        setUsers([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load user directory from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, roleFilter, statusFilter, minBalance, maxBalance, currentPage]);

  // Fetch detailed user info when row is clicked
  const openUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetailTab('accounts');
    try {
      const detail = await api.getUserDetail(userId);
      setUserDetail(detail);
    } catch (err: any) {
      console.error('Failed to load user details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeUserDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  // Prepare Adjustment Modal
  const openAdjustModal = (targetUser: User | UserDetail, initialAccountId?: string) => {
    setAdjustTargetUser(targetUser);
    const accId = initialAccountId || (targetUser.accounts && targetUser.accounts.length > 0 ? targetUser.accounts[0].id : '');
    setAdjustAccountId(accId);
    setAdjustOperation('credit');
    setAdjustAmount('250.00');
    setAdjustReason('ADMIN_CORRECTION');
    setAdjustNote('');
    setAdjustError(null);
    setAdjustSuccess(null);
    setShowAdjustModal(true);
  };

  // Selected account in adjustment modal
  const selectedAdjustAccount = useMemo(() => {
    if (!adjustTargetUser || !adjustTargetUser.accounts) return null;
    return adjustTargetUser.accounts.find((a) => a.id === adjustAccountId) || adjustTargetUser.accounts[0];
  }, [adjustTargetUser, adjustAccountId]);

  // Projected resulting balance preview
  const projectedResultingBalance = useMemo(() => {
    if (!selectedAdjustAccount) return '0.00';
    const current = parseFloat(selectedAdjustAccount.balance) || 0;
    const delta = parseFloat(adjustAmount) || 0;
    if (adjustOperation === 'credit') {
      return (current + delta).toFixed(2);
    } else {
      return (current - delta).toFixed(2);
    }
  }, [selectedAdjustAccount, adjustAmount, adjustOperation]);

  // Execute Adjustment
  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAccountId) {
      setAdjustError('Please select a target account.');
      return;
    }
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      setAdjustError('Please enter a positive decimal amount.');
      return;
    }
    if (!adjustNote.trim()) {
      setAdjustError('An admin note / case reference is required for audit.');
      return;
    }

    setAdjustLoading(true);
    setAdjustError(null);

    const idempotencyKey = crypto.randomUUID();
    try {
      const receipt = await api.adjustAccountBalance(
        adjustAccountId,
        {
          operation: adjustOperation,
          amount: amt.toFixed(2),
          currency: selectedAdjustAccount?.currency || 'INR',
          reason_code: adjustReason,
          admin_note: adjustNote.trim(),
        },
        idempotencyKey
      );

      setAdjustSuccess(`Successfully executed ${receipt.operation.toUpperCase()} of ₹${receipt.amount}. New Balance: ₹${receipt.new_balance}`);

      // Refresh both table and user detail view
      fetchUsers();
      if (selectedUserId) {
        const updatedDetail = await api.getUserDetail(selectedUserId);
        setUserDetail(updatedDetail);
      }

      setTimeout(() => {
        setShowAdjustModal(false);
        setAdjustSuccess(null);
      }, 1600);
    } catch (err: any) {
      setAdjustError(err?.response?.data?.detail || 'Failed to execute adjustment.');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Execute Lifecycle Action (Suspend / Reactivate / Safe Deactivate)
  const handleExecuteLifecycleAction = async () => {
    if (!lifecycleModal) return;
    const { type, user } = lifecycleModal;

    if (type === 'deactivate' && confirmInput !== 'CONFIRM' && confirmInput !== user.email) {
      return;
    }

    setLifecycleLoading(true);
    try {
      if (type === 'suspend') {
        await api.suspendUser(user.id, lifecycleReason || 'Administrative suspension');
      } else if (type === 'reactivate') {
        await api.reactivateUser(user.id, lifecycleReason || 'Administrative reactivation');
      } else if (type === 'deactivate') {
        await api.deactivateUser(user.id, lifecycleReason || 'Customer requested deactivation');
      }

      setLifecycleModal(null);
      setLifecycleReason('');
      setConfirmInput('');
      fetchUsers();
      if (selectedUserId === user.id) {
        const updated = await api.getUserDetail(user.id);
        setUserDetail(updated);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Action failed.');
    } finally {
      setLifecycleLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setMinBalance('');
    setMaxBalance('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <UsersIcon className="w-6 h-6 text-brand-400" />
            <span>User & Account Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative directory of registered customer accounts, double-entry balances, and manual financial adjustments
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href="https://datacore-backend-wktd.onrender.com/api/admin/users/?format=csv"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition active:scale-95"
            title="Export CSV of registered users"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition active:scale-95 disabled:opacity-50"
            title="Refresh User Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, ID, or account number (e.g. DC-3896)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="md:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-400"
            >
              <option value="">All Roles</option>
              <option value="USER">Customer (USER)</option>
              <option value="ADMIN">Administrator (ADMIN)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-400"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Suspended Only</option>
            </select>
          </div>

          {/* Min Balance Filter */}
          <div className="md:col-span-2">
            <input
              type="number"
              value={minBalance}
              onChange={(e) => {
                setMinBalance(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Min Balance ₹"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={clearFilters}
              className="p-2 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition w-full"
              title="Reset all filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchUsers} className="underline hover:text-rose-300 font-bold ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Associated Account(s)</th>
                <th className="px-5 py-3.5 text-center">Transactions</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading && users.length === 0 ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-36 mb-1"></div><div className="h-3 bg-slate-800/60 rounded w-24"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-14"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-44"></div></td>
                    <td className="px-5 py-4 text-center"><div className="h-4 bg-slate-800 rounded w-8 mx-auto"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="px-5 py-4"><div className="h-6 bg-slate-800 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <UsersIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-300">No users found matching query</p>
                    <p className="text-xs text-slate-500 mt-1">Try clearing your search terms or filters.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openUserDetail(u.id)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* User Info */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors">
                        {u.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[180px]">{u.email}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(u.email, `email-${u.id}`);
                          }}
                          className="text-slate-500 hover:text-slate-300"
                          title="Copy email"
                        >
                          {copiedId === `email-${u.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Accounts */}
                    <td className="px-5 py-4">
                      {u.accounts && u.accounts.length > 0 ? (
                        <div className="space-y-1">
                          {u.accounts.map((acc) => (
                            <div key={acc.account_number} className="flex items-center space-x-2">
                              <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-mono text-slate-300">{acc.account_number}</span>
                              <span className="font-bold text-emerald-400">
                                ₹{parseFloat(acc.balance || '0.00').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">No active accounts</span>
                      )}
                    </td>

                    {/* Transactions */}
                    <td className="px-5 py-4 text-center font-bold text-slate-200">
                      {u.total_transactions ?? 0}
                    </td>

                    {/* Joined Date */}
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(u.date_joined).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span>{u.is_active ? 'Active' : 'Suspended'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openAdjustModal(u)}
                          className="px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition active:scale-95"
                          title="Adjust Balance"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Adjust</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openUserDetail(u.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{users.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalCount}</span> registered users
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-300">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={users.length < pageSize || loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          USER DETAIL DRAWER (SLIDE-OVER FROM RIGHT)
      ========================================================================= */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-base border border-brand-500/30">
                  {userDetail?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white">{userDetail?.full_name || 'Loading...'}</h2>
                    {userDetail && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          userDetail.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {userDetail.is_active ? 'Active' : 'Suspended'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{userDetail?.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {userDetail && (
                  <button
                    onClick={() => openAdjustModal(userDetail)}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition active:scale-95"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Adjust Balance</span>
                  </button>
                )}
                <button
                  onClick={closeUserDetail}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {detailLoading ? (
                <div className="py-16 text-center">
                  <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400">Fetching authoritative user ledger state...</p>
                </div>
              ) : userDetail ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Role</span>
                      <span className="font-bold text-sm text-slate-200 mt-0.5 block">{userDetail.role}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Accounts</span>
                      <span className="font-bold text-sm text-slate-200 mt-0.5 block">
                        {userDetail.accounts?.length || 0}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Transactions</span>
                      <span className="font-bold text-sm text-slate-200 mt-0.5 block">
                        {userDetail.transactions?.length || 0}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Joined</span>
                      <span className="font-bold text-xs text-slate-200 mt-1 block">
                        {new Date(userDetail.date_joined).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center space-x-1 border-b border-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setDetailTab('accounts')}
                      className={`pb-2 px-3 border-b-2 transition ${
                        detailTab === 'accounts'
                          ? 'border-brand-400 text-brand-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Linked Accounts ({userDetail.accounts?.length || 0})
                    </button>
                    <button
                      onClick={() => setDetailTab('transactions')}
                      className={`pb-2 px-3 border-b-2 transition ${
                        detailTab === 'transactions'
                          ? 'border-brand-400 text-brand-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Recent Transactions ({userDetail.transactions?.length || 0})
                    </button>
                    <button
                      onClick={() => setDetailTab('adjustments')}
                      className={`pb-2 px-3 border-b-2 transition ${
                        detailTab === 'adjustments'
                          ? 'border-brand-400 text-brand-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Adjustment History ({userDetail.adjustments?.length || 0})
                    </button>
                    <button
                      onClick={() => setDetailTab('audit')}
                      className={`pb-2 px-3 border-b-2 transition ${
                        detailTab === 'audit'
                          ? 'border-brand-400 text-brand-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Audit Activity ({userDetail.audit_logs?.length || 0})
                    </button>
                  </div>

                  {/* Tab 1: Linked Accounts */}
                  {detailTab === 'accounts' && (
                    <div className="space-y-3">
                      {userDetail.accounts?.map((acc) => (
                        <div
                          key={acc.id}
                          className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-slate-200 text-sm">{acc.account_number}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.account_number, `acc-${acc.id}`)}
                                className="text-slate-500 hover:text-slate-300"
                              >
                                {copiedId === `acc-${acc.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <span className="text-[10px] text-slate-500">v{acc.version ?? 0}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Account ID: <span className="font-mono">{acc.id}</span>
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Balance</span>
                            <span className="font-black text-emerald-400 text-base">
                              ₹{parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Recent Transactions */}
                  {detailTab === 'transactions' && (
                    <div className="space-y-2">
                      {userDetail.transactions?.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No transaction history recorded.</p>
                      ) : (
                        userDetail.transactions?.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  tx.direction === 'INBOUND'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {tx.direction === 'INBOUND' ? (
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-slate-200 block">
                                  {tx.direction === 'INBOUND'
                                    ? `From: ${tx.sender_account_number}`
                                    : `To: ${tx.receiver_account_number}`}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {tx.description || 'Fund Transfer'} • {new Date(tx.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`font-bold block ${
                                  tx.direction === 'INBOUND' ? 'text-emerald-400' : 'text-slate-200'
                                }`}
                              >
                                {tx.direction === 'INBOUND' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase">{tx.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 3: Adjustments */}
                  {detailTab === 'adjustments' && (
                    <div className="space-y-2">
                      {userDetail.adjustments?.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No manual adjustments recorded for this user.</p>
                      ) : (
                        userDetail.adjustments?.map((adj) => (
                          <div
                            key={adj.id}
                            className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  adj.operation.toUpperCase() === 'CREDIT'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {adj.operation.toUpperCase()} ₹{parseFloat(adj.amount).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(adj.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Reason: <strong className="text-white">{adj.reason_code}</strong></span>
                              <span className="text-slate-400 text-[11px]">
                                Balance: ₹{adj.previous_balance} &rarr; <strong className="text-emerald-400">₹{adj.resulting_balance}</strong>
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 italic">"{adj.admin_note}"</p>
                            <span className="text-[10px] text-slate-500 block">Actor: {adj.actor_email}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 4: Audit Logs */}
                  {detailTab === 'audit' && (
                    <div className="space-y-2">
                      {userDetail.audit_logs?.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No security audit logs recorded.</p>
                      ) : (
                        userDetail.audit_logs?.map((al) => (
                          <div key={al.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                            <div className="flex items-center justify-between text-slate-200 font-semibold">
                              <span>{al.action}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(al.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {al.ip_address && (
                              <span className="text-[10px] text-slate-500 block mt-0.5">IP: {al.ip_address}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Lifecycle Controls Drawer Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                    {userDetail.is_active ? (
                      <button
                        type="button"
                        onClick={() => setLifecycleModal({ type: 'suspend', user: userDetail })}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Suspend User</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLifecycleModal({ type: 'reactivate', user: userDetail })}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reactivate User</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setLifecycleModal({ type: 'deactivate', user: userDetail })}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Safe Deactivate</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANUAL ADJUST BALANCE MODAL
      ========================================================================= */}
      {showAdjustModal && adjustTargetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adjust Account Balance</h3>
                  <p className="text-xs text-slate-400">Target: {adjustTargetUser.full_name} ({adjustTargetUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            {adjustSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adjustSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              {/* Account Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Account
                </label>
                <select
                  value={adjustAccountId}
                  onChange={(e) => setAdjustAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium text-slate-200 focus:outline-none focus:border-brand-400"
                >
                  {adjustTargetUser.accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_number} • Current Balance: ₹{acc.balance} {acc.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operation Toggle (Credit / Debit) */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Operation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustOperation('credit')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
                      adjustOperation === 'credit'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>+ Credit Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustOperation('debit')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
                      adjustOperation === 'debit'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>- Debit Account</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Adjustment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="250.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-100 focus:outline-none focus:border-brand-400"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Projected Resulting Balance:</span>
                <span className="font-bold text-sm text-brand-400 font-mono">
                  ₹{projectedResultingBalance} {selectedAdjustAccount?.currency || 'INR'}
                </span>
              </div>

              {/* Reason Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Reason Code
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-400"
                >
                  <option value="ADMIN_CORRECTION">ADMIN_CORRECTION (System / Ledger Fix)</option>
                  <option value="CUSTOMER_COMPENSATION">CUSTOMER_COMPENSATION (Goodwill / Settlement)</option>
                  <option value="DISPUTE_RESOLUTION">DISPUTE_RESOLUTION (Chargeback / Investigation)</option>
                  <option value="CHARGEBACK_REVERSAL">CHARGEBACK_REVERSAL (Recovery)</option>
                  <option value="PROMOTIONAL_CREDIT">PROMOTIONAL_CREDIT (Test / Promotion)</option>
                </select>
              </div>

              {/* Admin Note / Case Reference */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Admin Note & Case Reference <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Approved adjustment per case reference #DC-9481"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-500/25 disabled:opacity-50 flex items-center space-x-2"
                >
                  {adjustLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIFECYCLE ACTION CONFIRMATION MODAL (SUSPEND / REACTIVATE / DEACTIVATE)
      ========================================================================= */}
      {lifecycleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white capitalize">
              {lifecycleModal.type} Account: {lifecycleModal.user.full_name}
            </h3>

            <p className="text-xs text-slate-300">
              {lifecycleModal.type === 'suspend' &&
                'Suspending this customer immediately revokes active sessions and blocks outbound transfers. Financial history and accounts remain preserved.'}
              {lifecycleModal.type === 'reactivate' &&
                'Reactivating this customer restores login privileges and transaction capability.'}
              {lifecycleModal.type === 'deactivate' &&
                'Safe deactivation soft-deactivates the user and accounts. Ledger entries, audit trails, and financial records are permanently preserved for regulatory compliance.'}
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Documented Reason <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={lifecycleReason}
                onChange={(e) => setLifecycleReason(e.target.value)}
                placeholder="Reason for audit log..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-400"
              />
            </div>

            {lifecycleModal.type === 'deactivate' && (
              <div>
                <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Type "CONFIRM" to Proceed
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full bg-slate-950 border border-rose-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setLifecycleModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteLifecycleAction}
                disabled={
                  lifecycleLoading ||
                  (lifecycleModal.type === 'deactivate' && confirmInput !== 'CONFIRM')
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 ${
                  lifecycleModal.type === 'suspend' || lifecycleModal.type === 'deactivate'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {lifecycleLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Users;
