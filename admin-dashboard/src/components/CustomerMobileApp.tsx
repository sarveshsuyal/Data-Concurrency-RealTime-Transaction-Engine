import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Smartphone,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  Check,
  User,
  History,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Battery,
  ShieldCheck,
  Zap,
  ArrowLeft
} from 'lucide-react';

interface AccountData {
  id: string;
  account_number: string;
  user_email: string;
  user_name: string;
  balance: string;
  currency: string;
  version: number;
}

interface TransactionData {
  id: string;
  sender_account_number: string;
  receiver_account_number: string;
  sender_email: string;
  receiver_email: string;
  amount: string;
  currency: string;
  status: string;
  concurrency_strategy: string;
  idempotency_key: string;
  description: string;
  created_at: string;
}

export const CustomerMobileApp: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('datacore_customer_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('datacore_customer_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<'home' | 'transfer' | 'history' | 'profile'>('home');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Auth Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Account State
  const [account, setAccount] = useState<AccountData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [copied, setCopied] = useState(false);

  // Transfer Form State
  const [recipient, setRecipient] = useState('bob@datacore.io');
  const [amount, setAmount] = useState('250.00');
  const [note, setNote] = useState('Coffee split');
  const [strategy, setStrategy] = useState('PESSIMISTIC');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Re-generate Idempotency Key
  const refreshKey = () => setIdempotencyKey(crypto.randomUUID());

  // Fetch Accounts & Transactions
  const fetchCustomerData = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoadingData(true);
    try {
      const headers = { Authorization: `Bearer ${activeToken}` };
      const accRes = await axios.get('/api/accounts/', { headers });
      const accList = Array.isArray(accRes.data) ? accRes.data : accRes.data.results || [];
      if (accList.length > 0) {
        setAccount(accList[0]);
      }

      const txRes = await axios.get('/api/transactions/', { headers });
      const txList = Array.isArray(txRes.data) ? txRes.data : txRes.data.results || [];
      setTransactions(txList);
    } catch (err: any) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCustomerData();
    }
  }, [token]);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const email = customEmail || loginEmail;
      const res = await axios.post('/api/auth/login/', {
        email,
        password: loginPassword,
      });

      const { access, user: userData } = res.data;
      localStorage.setItem('datacore_customer_token', access);
      localStorage.setItem('datacore_customer_user', JSON.stringify(userData));
      setToken(access);
      setUser(userData);
      fetchCustomerData(access);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await axios.post('/api/auth/register/', {
        full_name: regName,
        email: regEmail,
        password: regPassword,
        confirm_password: regPassword,
      });

      const { access, user: userData } = res.data;
      localStorage.setItem('datacore_customer_token', access);
      localStorage.setItem('datacore_customer_user', JSON.stringify(userData));
      setToken(access);
      setUser(userData);
      fetchCustomerData(access);
    } catch (err: any) {
      setAuthError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('datacore_customer_token');
    localStorage.removeItem('datacore_customer_user');
    setToken(null);
    setUser(null);
    setAccount(null);
    setTransactions([]);
    setCurrentScreen('home');
  };

  const copyAccountNumber = () => {
    if (account) {
      navigator.clipboard.writeText(account.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTransferSubmit = async () => {
    if (!account) return;
    setTransferLoading(true);
    setTransferFeedback(null);

    try {
      const res = await axios.post(
        '/api/transactions/',
        {
          sender_account_id: account.id,
          receiver_identifier: recipient.trim(),
          amount: parseFloat(amount).toFixed(2),
          description: note.trim(),
          concurrency_strategy: strategy,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      setShowConfirmModal(false);
      setTransferFeedback({
        success: true,
        message: `Transferred ₹${amount} successfully! Latency: ${res.data.latency_ms || 12}ms`,
      });

      // Generate next idempotency key
      refreshKey();
      fetchCustomerData();
      setTimeout(() => {
        setCurrentScreen('home');
        setTransferFeedback(null);
      }, 1800);
    } catch (err: any) {
      setShowConfirmModal(false);
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Transfer failed.';
      setTransferFeedback({ success: false, message: detail });
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {/* Mobile Phone Mockup Container */}
      <div className="relative w-[380px] h-[780px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-4 border-slate-700/80 ring-1 ring-slate-800">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-800 rounded-full mr-2"></div>
          <div className="w-2 h-2 bg-blue-500/40 rounded-full"></div>
        </div>

        {/* Screen Display */}
        <div className="w-full h-full bg-slate-950 rounded-[40px] overflow-hidden flex flex-col relative text-slate-100 font-sans border border-slate-800/80">
          {/* Status Bar */}
          <div className="h-10 pt-2 px-6 flex items-center justify-between text-[11px] text-slate-300 select-none z-40 bg-slate-950/80 backdrop-blur-sm">
            <span className="font-semibold tracking-wider">09:41</span>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1">
            {!token ? (
              /* Auth Screens */
              <div className="pt-6 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center space-x-2.5 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">DataCore Pay</h2>
                      <p className="text-[11px] text-slate-400">Customer Mobile Wallet</p>
                    </div>
                  </div>


                  {authError && (
                    <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {!isRegisterMode ? (
                    <form onSubmit={handleLogin} className="space-y-3.5">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Email Address</label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Password</label>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                      >
                        {authLoading ? 'Signing in...' : 'Sign In to Wallet'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Full Name</label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Email Address</label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Password</label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                      >
                        {authLoading ? 'Creating Account...' : 'Register & Claim ₹10,000'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setAuthError(null);
                    }}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              </div>
            ) : (
              /* Authenticated Customer Views */
              <div>
                {/* Header User Row */}
                <div className="flex items-center justify-between mb-4 pt-1">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center font-bold text-blue-400 text-xs">
                      {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{user?.full_name || 'Customer'}</p>
                      <p className="text-[10px] text-slate-400">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchCustomerData()}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 transition"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                </div>

                {/* Feedback Toast */}
                {transferFeedback && (
                  <div
                    className={`mb-3 p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                      transferFeedback.success
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {transferFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-[11px]">{transferFeedback.message}</span>
                  </div>
                )}

                {/* Sub-view: HOME */}
                {currentScreen === 'home' && (
                  <div className="space-y-4">
                    {/* Gradient Balance Card */}
                    <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-900/30 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] tracking-wider uppercase text-blue-200/80 font-medium">
                          Authoritative Balance
                        </span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-medium">
                          {account?.currency || 'INR'}
                        </span>
                      </div>

                      <div className="text-2xl font-black tracking-tight mb-3">
                        ₹{parseFloat(account?.balance || '0.00').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                        <span className="font-mono text-blue-100/90 text-[11px]">
                          {account?.account_number || 'Loading...'}
                        </span>
                        <button
                          onClick={copyAccountNumber}
                          className="flex items-center space-x-1 text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded transition"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Action Tiles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setCurrentScreen('transfer')}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 rounded-xl transition group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
                          <Send className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-white">Transfer</span>
                        <span className="text-[10px] text-slate-400">Send money</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('history')}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 rounded-xl transition group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
                          <History className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-white">History</span>
                        <span className="text-[10px] text-slate-400">Recent logs</span>
                      </button>
                    </div>

                    {/* Recent Transactions List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300">Recent Transactions</span>
                        <button
                          onClick={() => setCurrentScreen('history')}
                          className="text-[11px] text-blue-400 hover:underline"
                        >
                          See All
                        </button>
                      </div>

                      {transactions.length === 0 ? (
                        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                          No transactions yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {transactions.slice(0, 4).map((tx) => {
                            const isDebit = tx.sender_account_number === account?.account_number;
                            return (
                              <div
                                key={tx.id}
                                className="p-2.5 bg-slate-900/80 border border-slate-800/90 rounded-xl flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                      isDebit ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                                    }`}
                                  >
                                    {isDebit ? (
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    ) : (
                                      <ArrowDownLeft className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-white text-[11px] leading-tight">
                                      {isDebit ? `To ${tx.receiver_email}` : `From ${tx.sender_email}`}
                                    </p>
                                    <p className="text-[9px] text-slate-400">{tx.description || 'Fund Transfer'}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p
                                    className={`font-bold font-mono text-[11px] ${
                                      isDebit ? 'text-rose-400' : 'text-emerald-400'
                                    }`}
                                  >
                                    {isDebit ? '-' : '+'}₹{parseFloat(tx.amount).toFixed(2)}
                                  </p>
                                  <span className="text-[9px] text-slate-500 block">
                                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-view: TRANSFER */}
                {currentScreen === 'transfer' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={() => setCurrentScreen('home')}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-white">Send Funds</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Recipient (Email or Account ID)</label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        placeholder="bob@datacore.io or DC-1234-5678"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-base focus:outline-none focus:border-blue-500"
                      />
                      {/* Fast amount chips */}
                      <div className="flex gap-1.5 mt-1.5">
                        {['100.00', '250.00', '500.00', '1000.00'].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setAmount(chip)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                          >
                            ₹{parseInt(chip)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Transfer Note</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Lunch split"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Concurrency Protection</label>
                      <select
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="PESSIMISTIC">Pessimistic Locking (SELECT FOR UPDATE)</option>
                        <option value="OPTIMISTIC">Optimistic Locking (Version Check)</option>
                        <option value="ATOMIC_CONDITIONAL">Atomic Conditional Update</option>
                      </select>
                    </div>

                    {/* Idempotency Key Badge */}
                    <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Client Idempotency-Key:</span>
                        </span>
                        <button onClick={refreshKey} className="text-blue-400 hover:underline">
                          New Key
                        </button>
                      </div>
                      <p className="font-mono text-slate-300 truncate">{idempotencyKey}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition mt-2"
                    >
                      Review & Send ₹{amount}
                    </button>
                  </div>
                )}

                {/* Sub-view: HISTORY */}
                {currentScreen === 'history' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={() => setCurrentScreen('home')}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-white">Transaction Ledger</span>
                    </div>

                    {transactions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No transaction records found.</p>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map((tx) => {
                          const isDebit = tx.sender_account_number === account?.account_number;
                          return (
                            <div
                              key={tx.id}
                              className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-white text-[11px]">
                                  {isDebit ? `To: ${tx.receiver_email}` : `From: ${tx.sender_email}`}
                                </span>
                                <span
                                  className={`font-mono font-bold text-[11px] ${
                                    isDebit ? 'text-rose-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {isDebit ? '-' : '+'}₹{parseFloat(tx.amount).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/80">
                                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                                  {tx.concurrency_strategy}
                                </span>
                                <span>{new Date(tx.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-view: PROFILE */}
                {currentScreen === 'profile' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                      <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-lg flex items-center justify-center mb-2">
                        {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                      </div>
                      <h3 className="font-bold text-white text-sm">{user?.full_name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
                      <span className="mt-2 text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                        Active Customer
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Number:</span>
                        <span className="font-mono text-white">{account?.account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Version:</span>
                        <span className="font-mono text-white">v{account?.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Currency:</span>
                        <span className="font-mono text-white">{account?.currency}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out Customer</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom App Navigation (When authenticated) */}
          {token && (
            <div className="absolute bottom-2 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 z-40">
              <button
                onClick={() => setCurrentScreen('home')}
                className={`flex flex-col items-center justify-center space-y-0.5 ${
                  currentScreen === 'home' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-[10px]">Home</span>
              </button>

              <button
                onClick={() => setCurrentScreen('transfer')}
                className={`flex flex-col items-center justify-center space-y-0.5 ${
                  currentScreen === 'transfer' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="text-[10px]">Transfer</span>
              </button>

              <button
                onClick={() => setCurrentScreen('history')}
                className={`flex flex-col items-center justify-center space-y-0.5 ${
                  currentScreen === 'history' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span className="text-[10px]">Ledger</span>
              </button>

              <button
                onClick={() => setCurrentScreen('profile')}
                className={`flex flex-col items-center justify-center space-y-0.5 ${
                  currentScreen === 'profile' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-[10px]">Profile</span>
              </button>
            </div>
          )}

          {/* Bottom Home Indicator Bar */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full z-50"></div>
        </div>
      </div>

      {/* Confirmation Bottom Sheet / Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-slate-100">
            <h3 className="font-bold text-base text-white mb-3">Confirm Fund Transfer</h3>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-semibold text-white">{recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-blue-400 font-mono text-sm">₹{parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Strategy:</span>
                <span className="font-mono text-slate-300 text-[10px]">{strategy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="font-mono text-slate-300 text-[9px] truncate max-w-[140px]">{idempotencyKey}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferLoading}
                onClick={handleTransferSubmit}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
              >
                {transferLoading ? 'Processing...' : 'Authorize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
