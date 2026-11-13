import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';

import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Transactions } from './pages/Transactions';
import { TransactionTrace } from './pages/TransactionTrace';
import { Concurrency } from './pages/Concurrency';
import { RaceLab } from './pages/RaceLab';
import { DatabaseObservatory } from './pages/DatabaseObservatory';
import { FailureLab } from './pages/FailureLab';
import { Benchmarks } from './pages/Benchmarks';
import { Accounts } from './pages/Accounts';
import { Consistency } from './pages/Consistency';
import { Reconciliation } from './pages/Reconciliation';
import { Settlement } from './pages/Settlement';
import { Anomalies } from './pages/Anomalies';
import { Incidents } from './pages/Incidents';
import { Reliability } from './pages/Reliability';
import { DuplicateDetection } from './pages/DuplicateDetection';
import { AuditLogs } from './pages/AuditLogs';
import { DeveloperPlatform } from './pages/DeveloperPlatform';
import { Webhooks } from './pages/Webhooks';
import { Users } from './pages/Users';
import { Workspaces } from './pages/Workspaces';
import { Settings } from './pages/Settings';
import { CustomerSimulator } from './pages/CustomerSimulator';

const ProtectedLayout: React.FC = () => {
  const token = localStorage.getItem('datacore_admin_token');
  const userJson = localStorage.getItem('datacore_admin_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const [cmdOpen, setCmdOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-datacore-softGray dark:bg-datacore-darkBg text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar userEmail={user?.email} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title="DataCore Administration"
          subtitle="Real-Time Concurrency Observability & Financial Infrastructure"
          onOpenCommandPalette={() => setCmdOpen(true)}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/intelligence" element={<TransactionTrace />} />
            <Route path="/trace" element={<TransactionTrace />} />
            <Route path="/concurrency" element={<Concurrency />} />
            <Route path="/race-lab" element={<RaceLab />} />
            <Route path="/observatory" element={<DatabaseObservatory />} />
            <Route path="/failure-lab" element={<FailureLab />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/consistency" element={<Consistency />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/reliability" element={<Reliability />} />
            <Route path="/duplicates" element={<DuplicateDetection />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/developer" element={<DeveloperPlatform />} />
            <Route path="/playground" element={<DeveloperPlatform />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="/users" element={<Users />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/customer-app" element={<CustomerSimulator />} />
          </Route>

          {/* Standalone Direct Customer View */}
          <Route path="/customer" element={<CustomerSimulator />} />
          <Route path="/app" element={<CustomerSimulator />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
