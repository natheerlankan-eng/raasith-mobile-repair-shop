import React, { useState, useEffect, useMemo } from 'react';
import { AuthScreen } from './components/AuthScreen.tsx';
import { NavRail, Header, AppViewId } from './components/Navbar.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { FilterBar, FilterTab } from './components/FilterBar.tsx';
import { JobsTable } from './components/JobsTable.tsx';
import { NewJobModal } from './components/NewJobModal.tsx';
import { JobSlipModal } from './components/JobSlipModal.tsx';
import { ReadyPromptModal } from './components/ReadyPromptModal.tsx';
import { DeliveredPassportModal } from './components/DeliveredPassportModal.tsx';
import { CustomerHistoryModal } from './components/CustomerHistoryModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { DailySummaryDashboard } from './components/DailySummaryDashboard.tsx';
import { TechniciansView } from './components/TechniciansView.tsx';
import { SparePartsModal } from './components/SparePartsModal.tsx';
import { EditJobModal } from './components/EditJobModal.tsx';
import { AdvancePaymentModal } from './components/AdvancePaymentModal.tsx';
import { JobOrderDetailModal } from './components/JobOrderDetailModal.tsx';
import { PosCheckoutModal } from './components/PosCheckoutModal.tsx';
import { PosTerminalView } from './components/PosTerminalView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { SuppliersView } from './components/SuppliersView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { ReportsCentreView } from './components/ReportsCentreView.tsx';
import { SettingsConsoleView } from './components/SettingsConsoleView.tsx';
import { ThermalReceipt80mm } from './components/ThermalReceipt80mm.tsx';
import { DayStartModal } from './components/DayStartModal.tsx';
import { EodClosingModal } from './components/EodClosingModal.tsx';
import { INITIAL_POS_SYSTEM_CONFIG, PosSystemConfig, PosBill } from './data/posData.ts';
import { RepairJob, JobStatus, StaffUser, AppSettings, DailySummary, Technician, SparePart } from './types.ts';
import { exportJobsToCSV } from './utils/csv.ts';
import { RefreshCw, AlertCircle, PlusCircle, CheckCircle2, DollarSign, ArrowRight, ShieldCheck, User, Search, X, Wrench } from 'lucide-react';
import { auth } from './lib/firebase.ts';
import { onIdTokenChanged } from 'firebase/auth';
import { useShop } from './context/ShopContext.tsx';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('raasith_staff_token'));
  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('raasith_staff_user');
    return saved ? JSON.parse(saved) : null;
  });

  const { shopProfile, updateShopProfile } = useShop();
  const [currentView, setCurrentView] = useState<AppViewId>('home');
  const [posConfig, setPosConfig] = useState<PosSystemConfig>(() => {
    const saved = localStorage.getItem('raasith_pos_config');
    if (saved) {
      try {
        return { ...INITIAL_POS_SYSTEM_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_POS_SYSTEM_CONFIG;
  });

  // Synchronize posConfig & settings whenever shopProfile changes
  useEffect(() => {
    if (shopProfile) {
      setPosConfig((prev) => ({
        ...prev,
        shopName: shopProfile.shopName || prev.shopName,
        outletName: shopProfile.branch || shopProfile.outletName || prev.outletName,
        address: shopProfile.address || prev.address,
        phone: shopProfile.phone || prev.phone,
        logoUrl: shopProfile.logoUrl || prev.logoUrl,
        currency: shopProfile.currency || prev.currency,
      }));
      setSettings((prev) => ({
        ...prev,
        shop_name: shopProfile.shopName || prev.shop_name,
      }));
    }
  }, [shopProfile]);
  const [activePrintBill, setActivePrintBill] = useState<PosBill | null>(null);
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily Summary State
  const todayStr = new Date().toISOString().split('T')[0];
  const [summaryDate, setSummaryDate] = useState<string>(todayStr);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    country_code: '+94',
    shop_name: 'Raasith Mobile',
  });

  // Filters & Search
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slipJob, setSlipJob] = useState<RepairJob | null>(null);
  const [readyPromptJob, setReadyPromptJob] = useState<RepairJob | null>(null);
  const [deliveredPassportJob, setDeliveredPassportJob] = useState<RepairJob | null>(null);
  const [sparePartsJob, setSparePartsJob] = useState<RepairJob | null>(null);
  const [editJob, setEditJob] = useState<RepairJob | null>(null);
  const [advanceJob, setAdvanceJob] = useState<RepairJob | null>(null);
  const [isReceiveAdvanceOpen, setIsReceiveAdvanceOpen] = useState(false);
  const [viewDetailJob, setViewDetailJob] = useState<RepairJob | null>(null);
  const [detailModalInitialTab, setDetailModalInitialTab] = useState<'overview' | 'passport'>('overview');
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [recalledJobForPos, setRecalledJobForPos] = useState<RepairJob | null>(null);
  const [posInitialItemToAdd, setPosInitialItemToAdd] = useState<any | null>(null);
  const [posRecalledCustomer, setPosRecalledCustomer] = useState<{ phoneNumber: string; customerName: string; creditDue?: number; advanceBalance?: number } | null>(null);
  const [selectedSupplierCode, setSelectedSupplierCode] = useState<string | null>(null);

  // Business Day Lifecycle State (Day Open / Day Close EOD)
  const [isDayOpen, setIsDayOpen] = useState(true);
  const [businessDayDate, setBusinessDayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDayStartModalOpen, setIsDayStartModalOpen] = useState(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState(false);

  // Customer History Modal
  const [historyTarget, setHistoryTarget] = useState<{ phone: string; name: string; address?: string | null } | null>(null);

  // Auth handler
  const handleLoginSuccess = (newToken: string, user: StaffUser) => {
    setToken(newToken);
    setStaffUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('raasith_staff_token');
    localStorage.removeItem('raasith_staff_user');
    setToken(null);
    setStaffUser(null);
  };

  // Synchronize Firebase auth state and auto-refresh expired tokens
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const freshToken = await firebaseUser.getIdToken();
          setToken(freshToken);
          localStorage.setItem('raasith_staff_token', freshToken);
          setStaffUser((prev) => {
            const updated = {
              email: firebaseUser.email || prev?.email || 'staff@raasithmobile.com',
              name: firebaseUser.displayName || prev?.name || 'Staff User',
              role: prev?.role || 'staff',
            };
            localStorage.setItem('raasith_staff_user', JSON.stringify(updated));
            return updated;
          });
        } catch (err) {
          console.warn('Could not auto-refresh Firebase token:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Global Keyboard Shortcuts (Enter, Escape, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl + P or Cmd + P -> Structured Print
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (slipJob) {
          window.print();
          return;
        }
        if (viewDetailJob) {
          setSlipJob(viewDetailJob);
          setTimeout(() => window.print(), 120);
          return;
        }
        const printBtn = document.querySelector<HTMLButtonElement>('[data-primary-action="true"]');
        if (printBtn) {
          printBtn.click();
          return;
        }
        if (jobs.length > 0) {
          setSlipJob(jobs[0]);
          setTimeout(() => window.print(), 120);
        } else {
          window.print();
        }
        return;
      }

      // 2. Escape Key -> Back or Cancel action
      if (e.key === 'Escape') {
        e.preventDefault();
        if (slipJob) { setSlipJob(null); return; }
        if (readyPromptJob) { setReadyPromptJob(null); return; }
        if (isPosOpen) { setIsPosOpen(false); return; }
        if (isNewJobOpen) { setIsNewJobOpen(false); return; }
        if (viewDetailJob) { setViewDetailJob(null); return; }
        if (editJob) { setEditJob(null); return; }
        if (sparePartsJob) { setSparePartsJob(null); return; }
        if (advanceJob || isReceiveAdvanceOpen) {
          setAdvanceJob(null);
          setIsReceiveAdvanceOpen(false);
          return;
        }
        if (historyTarget) { setHistoryTarget(null); return; }
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }

        if (searchQuery) {
          setSearchQuery('');
          return;
        }
        if (currentView !== 'home') {
          setCurrentView('home');
          return;
        }
        return;
      }

      // 3. Enter Key -> Next or Primary confirmation action
      if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl instanceof HTMLTextAreaElement) return;
        if (activeEl instanceof HTMLInputElement && activeEl.form) return;

        const primaryBtn = document.querySelector<HTMLButtonElement>('[data-primary-action="true"]');
        if (primaryBtn) {
          e.preventDefault();
          primaryBtn.click();
          return;
        }

        if (slipJob) {
          e.preventDefault();
          window.print();
          return;
        }
        if (currentView === 'home' && (!activeEl || activeEl === document.body)) {
          setCurrentView('pos');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    slipJob,
    viewDetailJob,
    isPosOpen,
    isNewJobOpen,
    editJob,
    sparePartsJob,
    advanceJob,
    isReceiveAdvanceOpen,
    historyTarget,
    isSettingsOpen,
    searchQuery,
    currentView,
    jobs
  ]);

  // Robust authenticated fetch helper that handles token expiration transparently
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = token;

    // If using Firebase and current user is available, check/get fresh token
    if (auth.currentUser && currentToken && !currentToken.startsWith('staff-session:')) {
      try {
        currentToken = await auth.currentUser.getIdToken();
        if (currentToken !== token) {
          setToken(currentToken);
          localStorage.setItem('raasith_staff_token', currentToken);
        }
      } catch {
        // Fall back to current in-memory token
      }
    }

    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    let response = await fetch(url, { ...options, headers });

    // Handle 401 token expiration with automatic retry
    if (response.status === 401 && auth.currentUser) {
      try {
        const refreshedToken = await auth.currentUser.getIdToken(true);
        if (refreshedToken) {
          setToken(refreshedToken);
          localStorage.setItem('raasith_staff_token', refreshedToken);
          headers.set('Authorization', `Bearer ${refreshedToken}`);
          response = await fetch(url, { ...options, headers });
        }
      } catch (refreshErr) {
        console.warn('Failed to refresh Firebase token on 401:', refreshErr);
      }
    }

    if (response.status === 401) {
      handleLogout();
    }

    return response;
  };

  // Fetch jobs, technicians, and settings when logged in
  const fetchJobs = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/jobs');
      if (res.status === 401) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load jobs');
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading repair jobs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    if (!token) return;
    try {
      const res = await authFetch('/api/technicians');
      if (res.ok) {
        const data = await res.json();
        setTechnicians(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load technicians:', err);
    }
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await authFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          country_code: data.country_code || '+94',
          shop_name: data.shop_name || 'Raasith Mobile',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchDailySummary = async (dateStr: string) => {
    if (!token) return;
    setSummaryLoading(true);
    try {
      const res = await authFetch(`/api/reports/daily?date=${encodeURIComponent(dateStr)}`);
      if (res.ok) {
        const data = await res.json();
        setDailySummary(data);
      }
    } catch (err) {
      console.error('Failed to load daily summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchBusinessDayStatus = async () => {
    if (!token) return;
    try {
      const res = await authFetch('/api/pos/day/status');
      if (res.ok) {
        const data = await res.json();
        setIsDayOpen(data.isOpen ?? data.status === 'Open');
        if (data.currentDate) {
          setBusinessDayDate(data.currentDate);
        }
      }
    } catch (err) {
      console.warn('Could not load day status:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchJobs();
      fetchTechnicians();
      fetchSettings();
      fetchDailySummary(summaryDate);
      fetchBusinessDayStatus();
    }
  }, [token, summaryDate]);

  const isTechnician = staffUser?.role?.toLowerCase() === 'technician';

  // Automatically enforce view and default tab for Technician role
  useEffect(() => {
    if (isTechnician) {
      if (currentView !== 'jobs') {
        setCurrentView('jobs');
      }
      setActiveTab('my_jobs');
    }
  }, [isTechnician]);

  const handleSwitchRole = (newRole: string) => {
    setStaffUser((prev) => {
      const updated: StaffUser = {
        email: prev?.email || `${newRole.toLowerCase()}@raasithmobile.com`,
        name:
          newRole.toLowerCase() === 'technician'
            ? 'Alex Rivera (Technician)'
            : newRole.toLowerCase() === 'cashier'
            ? 'Fatima (Cashier)'
            : 'Mohamed Raasith (Admin)',
        role: newRole,
      };
      try {
        localStorage.setItem('raasith_staff_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (newRole.toLowerCase() === 'technician') {
      setCurrentView('jobs');
      setActiveTab('my_jobs');
    } else if (newRole.toLowerCase() === 'cashier') {
      setCurrentView('pos');
    }
  };

  // Tab Filtering & Counts
  // Pending = Received, In Repair, Waiting for Parts, Ready for Pickup
  // Completed = Delivered
  // Cancelled jobs show ONLY under All
  const counts = useMemo(() => {
    const pendingCount = jobs.filter((j) =>
      ['Received', 'In Repair', 'Waiting for Parts', 'Ready for Pickup'].includes(j.status)
    ).length;
    const completedCount = jobs.filter((j) => j.status === 'Delivered').length;
    const myJobsCount = jobs.filter(
      (j) => staffUser?.name && j.technicianName?.toLowerCase() === staffUser.name.toLowerCase()
    ).length;
    return {
      all: jobs.length,
      pending: pendingCount,
      completed: completedCount,
      myJobs: myJobsCount,
    };
  }, [jobs, staffUser?.name]);

  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Apply Tab filter
    if (activeTab === 'my_jobs') {
      result = result.filter(
        (j) => staffUser?.name && j.technicianName?.toLowerCase() === staffUser.name.toLowerCase()
      );
    } else if (activeTab === 'pending') {
      result = result.filter((j) =>
        ['Received', 'In Repair', 'Waiting for Parts', 'Ready for Pickup'].includes(j.status)
      );
    } else if (activeTab === 'completed') {
      result = result.filter((j) => j.status === 'Delivered');
    }
    // 'all' includes all jobs including Cancelled

    // Apply Search filter (by Job ID, customer name, phone number, or address)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (j) =>
          j.jobNumber.toLowerCase().includes(q) ||
          j.customerName.toLowerCase().includes(q) ||
          j.phoneNumber.includes(q) ||
          (j.customerAddress && j.customerAddress.toLowerCase().includes(q)) ||
          j.deviceBrand.toLowerCase().includes(q) ||
          j.deviceModel.toLowerCase().includes(q)
      );
    }

    return result;
  }, [jobs, activeTab, searchQuery, staffUser?.name]);

  // One-Click Status Change
  const handleStatusChange = async (job: RepairJob, newStatus: JobStatus) => {
    if (!token) return;

    // Optimistic UI update
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
    );

    try {
      const res = await authFetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }

      const updated = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
      fetchDailySummary(summaryDate);

      // If status changed to "Ready for Pickup", show prompt modal: "Send ready message now?"
      if (newStatus === 'Ready for Pickup') {
        setReadyPromptJob(updated);
      }

      // If status changed to "Delivered", automatically trigger Phone Health Passport WhatsApp popup!
      if (newStatus === 'Delivered') {
        setDeliveredPassportJob(updated);
      }
    } catch (err: any) {
      console.error(err);
      fetchJobs(); // rollback
    }
  };

  // WhatsApp & SMS Message Sent status update
  const handleUpdateMessageSent = async (
    jobId: number,
    type: 'received' | 'ready' | 'sms_received' | 'sms_ready',
    sent: boolean
  ) => {
    if (!token) return;

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              receivedMsgSent: type === 'received' ? sent : j.receivedMsgSent,
              readyMsgSent: type === 'ready' ? sent : j.readyMsgSent,
              smsReceivedSent: type === 'sms_received' ? sent : j.smsReceivedSent,
              smsReadySent: type === 'sms_ready' ? sent : j.smsReadySent,
            }
          : j
      )
    );

    try {
      await authFetch(`/api/jobs/${jobId}/message`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, sent }),
      });
    } catch (err) {
      console.error('Failed to update message flag:', err);
    }
  };

  // Save Spare Parts used on repair
  const handleSaveSpareParts = async (jobId: number, parts: SparePart[], sparePartsAmount?: number) => {
    if (!token) return;
    const res = await authFetch(`/api/jobs/${jobId}/spare-parts`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spareParts: parts,
        sparePartsAmount: sparePartsAmount ?? parts.reduce((sum, p) => sum + (p.cost * p.qty), 0),
      }),
    });

    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Failed to save spare parts');

    setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    setSparePartsJob(null);
    if (slipJob && slipJob.id === jobId) setSlipJob(updated);
    fetchDailySummary(summaryDate);
  };

  // Edit Job Slip
  const handleSaveEditJob = async (jobId: number, updateData: any) => {
    if (!token) return;
    const res = await authFetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Failed to update repair slip');

    setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    if (slipJob && slipJob.id === jobId) setSlipJob(updated);
    fetchDailySummary(summaryDate);
  };

  // Create Job
  const handleCreateJob = async (jobData: any) => {
    if (!token) return;
    const res = await authFetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create job');
    }

    setJobs((prev) => [data, ...prev]);
    fetchDailySummary(summaryDate);
  };

  // Save Settings
  const handleSaveSettings = async (newCountryCode: string, newShopName: string) => {
    await updateShopProfile({
      shopName: newShopName,
      appTitle: `${newShopName} · POS & Repair Shop`,
    });
    if (!token) return;
    await authFetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: 'country_code', value: newCountryCode }),
    });

    await authFetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: 'shop_name', value: newShopName }),
    });

    setSettings({
      country_code: newCountryCode,
      shop_name: newShopName,
    });
  };

  // Calculate next preview Job ID
  const nextJobNumber = useMemo(() => {
    if (jobs.length === 0) return 'RM-1001';
    const maxId = Math.max(...jobs.map((j) => j.id), 0);
    return `RM-${maxId + 1001}`;
  }, [jobs]);

  // Export CSV
  const handleExportCSV = () => {
    exportJobsToCSV(jobs, settings.shop_name);
  };

  // If user is not logged in, render the login screen
  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#070e28] via-[#09153a] to-[#0c1a45] text-[#f8fafc] flex flex-col md:grid md:grid-cols-[92px_1fr]">
      {/* 92px Navigation Rail (Left on desktop, bottom bar on mobile) */}
      <NavRail
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSettings={() => setCurrentView('settings')}
        onLogout={handleLogout}
        staffUser={staffUser}
        shopName={posConfig.shopName}
        onOpenPOS={() => setCurrentView('pos')}
        isDayOpen={isDayOpen}
        onStartDayClick={() => setIsDayStartModalOpen(true)}
        onEndDayClick={() => setIsEodModalOpen(true)}
      />

      {/* Main Container */}
      <div className="main-container flex flex-col h-screen overflow-hidden bg-transparent">
        {/* 80px Top Header */}
        <Header
          currentView={currentView}
          shopName={posConfig.shopName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewJob={() => setIsNewJobOpen(true)}
          onExportCSV={handleExportCSV}
          staffUser={staffUser}
          onOpenSettings={() => setCurrentView('settings')}
          onLogout={handleLogout}
          onOpenPOS={() => setCurrentView('pos')}
          jobs={jobs}
          onRecallJobToPOS={(job) => {
            setRecalledJobForPos(job);
            setCurrentView('pos');
          }}
          onRecallCustomerToPOS={(customer) => {
            setPosRecalledCustomer(customer);
            setCurrentView('pos');
          }}
          onAddInventoryItemToPOS={(item) => {
            setPosInitialItemToAdd(item);
            setCurrentView('pos');
          }}
          onSelectSupplier={(supplier) => {
            setSelectedSupplierCode(supplier.code);
            setCurrentView('suppliers');
          }}
          token={token}
          onOpenJobSheet={(jobId) => {
            const job = jobs.find((j) => j.id === jobId);
            if (job) setViewDetailJob(job);
          }}
          onSwitchRole={handleSwitchRole}
          isDayOpen={isDayOpen}
          onStartDayClick={() => setIsDayStartModalOpen(true)}
          onEndDayClick={() => setIsEodModalOpen(true)}
        />

        {/* Main Content View Area */}
        <div className={`flex-1 min-h-0 ${currentView === 'jobs' ? 'overflow-hidden flex flex-col h-full' : 'overflow-y-auto'}`}>
          {currentView === 'jobs' ? (
            <main className="h-full flex flex-col min-h-0 overflow-hidden px-3 py-1.5 space-y-1.5 no-print select-none">
              {/* 1. Top Metrics Bar (Ultra Compact) */}
              <div className="bg-[#1c1c1e] rounded-xl px-3 py-1.5 text-[#f8f7f4] border border-[rgba(248,247,244,0.1)] flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-5 font-mono-jb">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-[rgba(248,247,244,0.5)] leading-none block">
                        Today's Repairs Completed
                      </span>
                      <div className="flex items-center gap-1 leading-tight">
                        <span className="text-sm font-black text-[#f8f7f4]">
                          {dailySummary?.totalCompletedRepairs ?? 0}
                        </span>
                        <span className="text-[9px] text-[rgba(248,247,244,0.5)]">Repairs</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-5 w-px bg-[rgba(248,247,244,0.1)] hidden sm:block" />

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                      <DollarSign className="w-3 h-3 text-[#ef4444] stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-[rgba(248,247,244,0.5)] leading-none block">
                        Advances Collected Today
                      </span>
                      <div className="flex items-center gap-1 leading-tight">
                        <span className="text-sm font-black text-[#ef4444]">
                          LKR {(dailySummary?.totalAdvanceRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentView('summary')}
                  className="bg-[#ef4444] hover:bg-[#dc2626] text-white px-3 py-1 rounded-lg font-oswald text-[11px] uppercase tracking-wider font-bold flex items-center gap-1 shadow-sm shadow-red-600/30 transition-all cursor-pointer shrink-0"
                >
                  <span>Open Daily Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 2. Action Header: Inline Title, Count, Tabs, Search Filter, Refresh & + New Job */}
              <div className="bg-[#1c1c1e] rounded-xl px-3 py-1.5 border border-[rgba(248,247,244,0.1)] flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xs">
                {/* Left: Title & Count */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-oswald text-sm sm:text-base font-bold text-[#f8f7f4] uppercase tracking-wider leading-none">
                      {activeTab === 'my_jobs'
                        ? `${staffUser?.name || 'Technician'}'s Assigned Bench`
                        : activeTab === 'all'
                        ? 'All Repair Jobs'
                        : activeTab === 'pending'
                        ? 'Pending Active Repairs'
                        : 'Delivered / Completed Jobs'}
                    </h1>
                    <span className="font-mono-jb text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#111113] text-[#f8f7f4] border border-[rgba(248,247,244,0.12)]">
                      {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
                    </span>
                  </div>
                </div>

                {/* Center: Inline Tabs & Search Filter */}
                <div className="flex items-center gap-2 flex-1 max-w-xl justify-center">
                  <div className="flex items-center gap-0.5 bg-[#111113] p-0.5 rounded-lg border border-[rgba(248,247,244,0.08)]">
                    {(isTechnician || (counts.myJobs ?? 0) > 0) && (
                      <button
                        onClick={() => setActiveTab('my_jobs')}
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider font-oswald transition-all cursor-pointer flex items-center gap-1 ${
                          activeTab === 'my_jobs'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4]'
                        }`}
                      >
                        <Wrench className="w-2.5 h-2.5" />
                        <span>My Assigned ({counts.myJobs ?? 0})</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider font-oswald transition-all cursor-pointer ${
                        activeTab === 'all'
                          ? 'bg-[#ef4444] text-white shadow-xs'
                          : 'text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4]'
                      }`}
                    >
                      All ({counts.all})
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider font-oswald transition-all cursor-pointer ${
                        activeTab === 'pending'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4]'
                      }`}
                    >
                      Pending ({counts.pending})
                    </button>
                    <button
                      onClick={() => setActiveTab('completed')}
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider font-oswald transition-all cursor-pointer ${
                        activeTab === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4]'
                      }`}
                    >
                      Completed ({counts.completed})
                    </button>
                  </div>

                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Job ID, name, or phone..."
                      className="w-full pl-8 pr-7 py-1 bg-white border border-slate-300 rounded-lg text-black text-xs font-bold placeholder:text-slate-500 focus:border-blue-600 focus:outline-hidden transition-all shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Refresh button and + New Job button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={fetchJobs}
                    disabled={loading}
                    title="Refresh repair jobs"
                    className="p-1 rounded-lg border border-[rgba(248,247,244,0.1)] text-[rgba(248,247,244,0.7)] hover:text-[#f8f7f4] hover:bg-[#252528] transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#ef4444]' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsNewJobOpen(true)}
                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-oswald uppercase tracking-wider text-[11px] px-3 py-1 rounded-lg shadow-sm shadow-red-600/30 flex items-center gap-1 transition-all cursor-pointer font-bold"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+ New Job</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono-jb flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={fetchJobs}
                    className="text-xs underline font-bold hover:text-rose-300 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* 3. Data Table Viewport: Locked full height with internal row scrolling */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <JobsTable
                  jobs={filteredJobs}
                  onStatusChange={handleStatusChange}
                  onUpdateMessageSent={handleUpdateMessageSent}
                  onPrintJob={(job) => setSlipJob(job)}
                  onViewCustomerHistory={(phone, name, address) => setHistoryTarget({ phone, name, address })}
                  onManageSpareParts={(job) => setSparePartsJob(job)}
                  onManageAdvance={(job) => setAdvanceJob(job)}
                  onEditJob={(job) => setEditJob(job)}
                  onViewJob={(job) => {
                    setDetailModalInitialTab('overview');
                    setViewDetailJob(job);
                  }}
                  onOpenPassport={(job) => {
                    setDetailModalInitialTab('passport');
                    setViewDetailJob(job);
                  }}
                  countryCode={settings.country_code}
                  shopName={settings.shop_name}
                  staffUser={staffUser}
                />
              </div>
            </main>
          ) : currentView === 'pos' ? (
            <main className="h-full">
              <PosTerminalView
                config={posConfig}
                token={token}
                onPrintThermalBill={(bill) => {
                  setActivePrintBill(bill);
                  setTimeout(() => window.print(), 100);
                }}
                staffName={staffUser?.name || 'Mohamed Raasith'}
                onOpenNewRepairJob={() => setIsNewJobOpen(true)}
                jobs={jobs}
                recalledJob={recalledJobForPos}
                onClearRecalledJob={() => setRecalledJobForPos(null)}
                initialItemToAdd={posInitialItemToAdd}
                onClearInitialItemToAdd={() => setPosInitialItemToAdd(null)}
                recalledCustomer={posRecalledCustomer}
                onClearRecalledCustomer={() => setPosRecalledCustomer(null)}
                onUpdateJobStatus={handleStatusChange}
                onTriggerDeliveredPassport={(job) => setDeliveredPassportJob(job)}
              />
            </main>
          ) : currentView === 'inventory' ? (
            <main className="h-full">
              <InventoryView
                currency={posConfig.currency}
                shopName={posConfig.shopName}
                token={token}
                onNewRepairJob={() => setIsNewJobOpen(true)}
              />
            </main>
          ) : currentView === 'suppliers' ? (
            <main className="h-full">
              <SuppliersView
                currency={posConfig.currency}
                selectedSupplierCode={selectedSupplierCode}
                onClearSelectedSupplierCode={() => setSelectedSupplierCode(null)}
              />
            </main>
          ) : currentView === 'finance' ? (
            <main className="h-full">
              <FinanceView currency={posConfig.currency} token={token} />
            </main>
          ) : currentView === 'reports' ? (
            <main className="h-full">
              <ReportsCentreView
                shopName={posConfig.shopName}
                currency={posConfig.currency}
                token={token}
              />
            </main>
          ) : currentView === 'settings' ? (
            <main className="h-full">
              <SettingsConsoleView
                initialConfig={posConfig}
                token={token}
                onSaveConfig={(newCfg) => {
                  setPosConfig(newCfg);
                  updateShopProfile({
                    shopName: newCfg.shopName,
                    branch: newCfg.outletName,
                    outletName: newCfg.outletName,
                    address: newCfg.address,
                    phone: newCfg.phone,
                    logoUrl: newCfg.logoUrl,
                    currency: newCfg.currency,
                    appTitle: `${newCfg.shopName} · POS & Repair Shop`,
                  });
                  handleSaveSettings(settings.country_code, newCfg.shopName);
                }}
              />
            </main>
          ) : currentView === 'profile' ? (
            <main className="pb-24 md:pb-12 no-print max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="bg-[#0c183d] rounded-3xl border border-blue-500/20 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-500/20 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-blue-600/30">
                      {staffUser?.name ? staffUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white font-oswald uppercase tracking-wider">
                        {staffUser?.name || 'Staff User'}
                      </h2>
                      <p className="text-xs font-mono-jb text-blue-200/70">{staffUser?.email || 'Logged In'}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-mono-jb text-blue-300/80 font-bold uppercase">Role:</span>
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('Cashier')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono-jb font-bold transition-all cursor-pointer ${
                            staffUser?.role?.toLowerCase() === 'cashier'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-blue-950/60 text-blue-300 hover:bg-blue-900/60'
                          }`}
                        >
                          👤 Cashier / Front Desk
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('Technician')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono-jb font-bold transition-all cursor-pointer ${
                            staffUser?.role?.toLowerCase() === 'technician'
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-purple-950/60 text-purple-300 hover:bg-purple-900/60'
                          }`}
                        >
                          🔧 Technician / Bench
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('Admin')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono-jb font-bold transition-all cursor-pointer ${
                            staffUser?.role?.toLowerCase() === 'admin'
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60'
                          }`}
                        >
                          🛡️ Admin / Owner
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 font-mono-jb text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    Sign Out Session
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-jb">
                  <div className="bg-[#08102a] p-4 rounded-2xl border border-blue-500/20 space-y-2">
                    <span className="text-[10px] text-blue-300 uppercase font-bold block">Assigned Outlet</span>
                    <strong className="text-white text-sm block">Main Outlet Akkaraipattu</strong>
                    <p className="text-[11px] text-blue-200/60">No. 142 Main Street, Akkaraipattu 02, Eastern Province</p>
                  </div>

                  <div className="bg-[#08102a] p-4 rounded-2xl border border-blue-500/20 space-y-2">
                    <span className="text-[10px] text-blue-300 uppercase font-bold block">Security & RBAC Privileges</span>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Full Operational Terminal Access Authorized</span>
                    </div>
                    <p className="text-[11px] text-blue-200/60">POS Billing, Inventory adjustments, Cashbook, and repair intake.</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-500/20">
                  <button
                    onClick={() => setCurrentView('pos')}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    Open POS Terminal
                  </button>
                  <button
                    onClick={() => setCurrentView('home')}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </main>
          ) : currentView === 'home' ? (
            <main className="pb-10 md:pb-6 no-print">
              <HomeScreen
                jobs={jobs}
                dailySummary={dailySummary}
                onOpenNewJob={() => setIsNewJobOpen(true)}
                onNavigate={(view) => setCurrentView(view as any)}
                onStatusChange={handleStatusChange}
                onUpdateMessageSent={handleUpdateMessageSent}
                onPrintJob={(job) => setSlipJob(job)}
                onManageSpareParts={(job) => setSparePartsJob(job)}
                onViewJob={(job) => {
                  setDetailModalInitialTab('overview');
                  setViewDetailJob(job);
                }}
                onOpenPassport={(job) => {
                  setDetailModalInitialTab('passport');
                  setViewDetailJob(job);
                }}
                onSearchQuery={(q) => {
                  setSearchQuery(q);
                  setCurrentView('jobs');
                }}
                countryCode={settings.country_code}
                shopName={posConfig.shopName}
              />
            </main>
          ) : currentView === 'summary' ? (
            <main className="pb-24 md:pb-12 no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <DailySummaryDashboard
                summary={dailySummary}
                selectedDate={summaryDate}
                onDateChange={setSummaryDate}
                loading={summaryLoading}
                shopName={posConfig.shopName}
                onOpenReceiveAdvance={() => setIsReceiveAdvanceOpen(true)}
              />
            </main>
          ) : currentView === 'technicians' ? (
            <main className="pb-24 md:pb-12 no-print">
              <TechniciansView token={token} shopName={posConfig.shopName} />
            </main>
          ) : currentView === 'customers' ? (
            <main className="h-full no-print">
              <CustomersView
                token={token}
                currency={posConfig.currency}
                onSelectCustomerForPOS={(cust) => {
                  setPosRecalledCustomer(cust);
                  setCurrentView('pos');
                }}
                onViewCustomerHistory={(phone, name, address) => setHistoryTarget({ phone, name, address })}
              />
            </main>
          ) : null}
        </div>
      </div>

      {/* New Job Modal */}
      <NewJobModal
        isOpen={isNewJobOpen}
        onClose={() => setIsNewJobOpen(false)}
        onSubmit={handleCreateJob}
        nextJobNumber={nextJobNumber}
        allJobs={jobs}
        technicians={technicians}
      />

      {/* Spare Parts Management Modal */}
      <SparePartsModal
        job={sparePartsJob}
        isOpen={Boolean(sparePartsJob)}
        onClose={() => setSparePartsJob(null)}
        onSaveParts={handleSaveSpareParts}
      />

      {/* Print Job Slip Modal */}
      <JobSlipModal
        job={slipJob}
        isOpen={Boolean(slipJob)}
        onClose={() => setSlipJob(null)}
        shopName={settings.shop_name}
      />

      {/* Prompt "Send ready message now?" when status changed to "Ready for Pickup" */}
      <ReadyPromptModal
        job={readyPromptJob}
        isOpen={Boolean(readyPromptJob)}
        onClose={() => setReadyPromptJob(null)}
        onConfirmSend={(job) => {
          handleUpdateMessageSent(job.id, 'ready', true);
        }}
        countryCode={settings.country_code}
        shopName={settings.shop_name}
      />

      {/* Prompt / WhatsApp Delivery Passport when status changed to "Delivered" */}
      <DeliveredPassportModal
        job={deliveredPassportJob}
        isOpen={Boolean(deliveredPassportJob)}
        onClose={() => setDeliveredPassportJob(null)}
        onViewPassportDetails={(job) => {
          setDetailModalInitialTab('passport');
          setViewDetailJob(job);
        }}
        token={token}
        countryCode={settings.country_code}
        shopName={settings.shop_name}
      />

      {/* Customer Repair History Modal */}
      <CustomerHistoryModal
        phoneNumber={historyTarget?.phone || null}
        customerName={historyTarget?.name || null}
        customerAddress={historyTarget?.address || null}
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        token={token}
      />

      {/* Edit Job Slip Modal */}
      <EditJobModal
        job={editJob}
        isOpen={Boolean(editJob)}
        onClose={() => setEditJob(null)}
        onSaveJob={handleSaveEditJob}
        technicians={technicians}
      />

      {/* Advance Payments Management Modal */}
      <AdvancePaymentModal
        job={advanceJob}
        isOpen={Boolean(advanceJob) || isReceiveAdvanceOpen}
        onClose={() => {
          setAdvanceJob(null);
          setIsReceiveAdvanceOpen(false);
        }}
        token={token}
        onRefreshJob={fetchJobs}
        onRefreshDaily={() => fetchDailySummary(summaryDate)}
        defaultDate={summaryDate}
        allJobs={jobs}
      />

      {/* Job Order Detail & POS Payment Modal */}
      <JobOrderDetailModal
        job={viewDetailJob}
        isOpen={Boolean(viewDetailJob)}
        onClose={() => setViewDetailJob(null)}
        token={token}
        countryCode={settings.country_code}
        shopName={settings.shop_name}
        initialTab={detailModalInitialTab}
        isTechnician={isTechnician}
        onRecallToPOS={(job) => {
          setRecalledJobForPos(job);
          setCurrentView('pos');
        }}
        onJobUpdated={(updatedJob) => {
          setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
          if (viewDetailJob && viewDetailJob.id === updatedJob.id) {
            setViewDetailJob(updatedJob);
          }
          fetchDailySummary(summaryDate);
        }}
        onPrintJob={(job) => setSlipJob(job)}
      />

      {/* POS Point of Sale Checkout Modal */}
      <PosCheckoutModal
        isOpen={isPosOpen}
        onClose={() => setIsPosOpen(false)}
        jobs={jobs}
        token={token}
        countryCode={settings.country_code}
        shopName={settings.shop_name}
        onJobUpdated={(updatedJob) => {
          setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
          if (viewDetailJob && viewDetailJob.id === updatedJob.id) {
            setViewDetailJob(updatedJob);
          }
          fetchDailySummary(summaryDate);
        }}
        onPrintSlip={(job) => setSlipJob(job)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        countryCode={settings.country_code}
        shopName={settings.shop_name}
        onSaveSettings={handleSaveSettings}
      />

      {/* Global Day Start Modal (Prompts Date Confirmation) */}
      <DayStartModal
        isOpen={isDayStartModalOpen}
        onClose={() => setIsDayStartModalOpen(false)}
        token={token}
        currentDate={businessDayDate}
        onDayOpened={(openedDate) => {
          setIsDayOpen(true);
          setBusinessDayDate(openedDate);
          fetchDailySummary(openedDate);
          fetchBusinessDayStatus();
        }}
      />

      {/* Global End of Day (EOD) Closing & Financial Reports Modal */}
      <EodClosingModal
        isOpen={isEodModalOpen}
        onClose={() => setIsEodModalOpen(false)}
        token={token}
        currency={posConfig.currency}
        shopName={posConfig.shopName}
        onEodClosed={() => {
          setIsDayOpen(false);
          fetchBusinessDayStatus();
          fetchDailySummary(businessDayDate);
        }}
      />

      {/* 80mm POS Thermal Receipt Print Container matching customized template */}
      {activePrintBill && (
        <div className="print-only print-thermal-receipt">
          <ThermalReceipt80mm config={posConfig} bill={activePrintBill} />
        </div>
      )}
    </div>
  );
}
