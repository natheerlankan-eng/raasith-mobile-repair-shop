import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Plus,
  Filter,
  CreditCard,
  Building,
  Wallet,
  PieChart,
  Tag,
  MapPin,
  FileText,
  Clock,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Landmark,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRightLeft
} from 'lucide-react';
import { ExpenseRecord, INITIAL_EXPENSES } from '../data/posData.ts';

export interface FinanceOverviewData {
  totalExpenses: number;
  totalInvestments: number;
  totalOtherIncome: number;
  totalProfitOut: number;
  totalBankBalance: number;
  totalEwalletBalance: number;
  netCashFlow: number;
  expenseCategories: { name: string; value: number; count?: number }[];
  investmentTypes: { name: string; value: number }[];
  otherIncomeSources: { name: string; value: number }[];
}

export interface InvestmentRecord {
  id: number;
  investorName: string;
  investmentType: string;
  amount: number;
  location: string;
  locationId?: string;
  userId?: number;
  userName?: string;
  accountId?: number;
  accountName?: string;
  payType: string;
  date: string;
  notes?: string;
  createdAt?: string;
}

export interface OtherIncomeRecord {
  id: number;
  source: string;
  receivedFrom: string;
  amount: number;
  location: string;
  locationId?: string;
  userId?: number;
  userName?: string;
  accountId?: number;
  accountName?: string;
  payType: string;
  date: string;
  remark?: string;
  createdAt?: string;
}

export interface ProfitOutRecord {
  id: number;
  recipient: string;
  distributionType: string;
  amount: number;
  location: string;
  locationId?: string;
  userId?: number;
  userName?: string;
  accountId?: number;
  accountName?: string;
  payType: string;
  date: string;
  notes?: string;
  createdAt?: string;
}

export interface BankAccountRecord {
  id: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  balance: number;
  isDefault: boolean;
  locationId?: string;
  createdAt?: string;
}

export interface BankTransactionRecord {
  id: number;
  bankAccountId: number;
  bankAccountName: string;
  date: string;
  type: string;
  amount: number;
  refNo?: string;
  description?: string;
  locationId?: string;
  userId?: number;
  createdAt?: string;
}

export interface EwalletAccountRecord {
  id: number;
  walletName: string;
  provider: string;
  accountNumber: string;
  merchantId?: string;
  balance: number;
  isDefault: boolean;
  locationId?: string;
  createdAt?: string;
}

export interface EwalletTransactionRecord {
  id: number;
  ewalletAccountId: number;
  walletName: string;
  date: string;
  type: string;
  amount: number;
  refNo?: string;
  description?: string;
  locationId?: string;
  userId?: number;
  createdAt?: string;
}

interface FinanceViewProps {
  currency?: string;
  token?: string | null;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  currency = 'LKR',
  token,
}) => {
  const [activeSubModule, setActiveSubModule] = useState<
    'Expenses' | 'Investments' | 'Other Incomes' | 'Profit Out' | 'Bank Accounts' | 'e-Wallet Accounts'
  >('Expenses');

  // Overview Data from live SQL calculations
  const [overview, setOverview] = useState<FinanceOverviewData>({
    totalExpenses: 0,
    totalInvestments: 0,
    totalOtherIncome: 0,
    totalProfitOut: 0,
    totalBankBalance: 0,
    totalEwalletBalance: 0,
    netCashFlow: 0,
    expenseCategories: [],
    investmentTypes: [],
    otherIncomeSources: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sub-Module Data States
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [investmentsList, setInvestmentsList] = useState<InvestmentRecord[]>([]);
  const [otherIncomesList, setOtherIncomesList] = useState<OtherIncomeRecord[]>([]);
  const [profitOutList, setProfitOutList] = useState<ProfitOutRecord[]>([]);
  const [bankAccountsList, setBankAccountsList] = useState<BankAccountRecord[]>([]);
  const [bankTransactionsList, setBankTransactionsList] = useState<BankTransactionRecord[]>([]);
  const [ewalletAccountsList, setEwalletAccountsList] = useState<EwalletAccountRecord[]>([]);
  const [ewalletTransactionsList, setEwalletTransactionsList] = useState<EwalletTransactionRecord[]>([]);

  // Filter Controls
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterExpenseType, setFilterExpenseType] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('2026-10-01');
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
  const [showTypeManagerModal, setShowTypeManagerModal] = useState(false);
  const [showCreateInvestmentModal, setShowCreateInvestmentModal] = useState(false);
  const [showCreateOtherIncomeModal, setShowCreateOtherIncomeModal] = useState(false);
  const [showCreateProfitOutModal, setShowCreateProfitOutModal] = useState(false);
  const [showCreateBankModal, setShowCreateBankModal] = useState(false);
  const [showBankTxModal, setShowBankTxModal] = useState(false);
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
  const [showWalletTxModal, setShowWalletTxModal] = useState(false);
  const [selectedBankForTx, setSelectedBankForTx] = useState<BankAccountRecord | null>(null);
  const [selectedWalletForTx, setSelectedWalletForTx] = useState<EwalletAccountRecord | null>(null);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    location: 'Main Outlet Akkaraipattu',
    locationId: 'LOC-AKK-01',
    expenseType: 'Shop Rent',
    paidTo: '',
    remark: '',
    payType: 'Cash',
    payInfo: 'Counter Cash Voucher',
    date: new Date().toISOString().split('T')[0],
    amount: 1500,
    accountId: '',
  });

  const [investmentForm, setInvestmentForm] = useState({
    investorName: '',
    investmentType: 'Capital Injection',
    amount: 100000,
    location: 'Main Outlet Akkaraipattu',
    payType: 'Bank Transfer',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [otherIncomeForm, setOtherIncomeForm] = useState({
    source: 'Scrap / E-Waste Disposal',
    receivedFrom: '',
    amount: 5000,
    location: 'Main Outlet Akkaraipattu',
    payType: 'Cash',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    remark: '',
  });

  const [profitOutForm, setProfitOutForm] = useState({
    recipient: 'Mohamed Raasith (Owner Draw)',
    distributionType: 'Owner Draw',
    amount: 50000,
    location: 'Main Outlet Akkaraipattu',
    payType: 'Bank Transfer',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [bankAccountForm, setBankAccountForm] = useState({
    accountName: '',
    bankName: 'Commercial Bank of Ceylon',
    accountNumber: '',
    branch: 'Akkaraipattu',
    balance: 50000,
    isDefault: false,
  });

  const [bankTxForm, setBankTxForm] = useState({
    type: 'Deposit In',
    amount: 25000,
    refNo: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [walletForm, setWalletForm] = useState({
    walletName: '',
    provider: 'e-Z Cash',
    accountNumber: '',
    merchantId: '',
    balance: 20000,
    isDefault: false,
  });

  const [walletTxForm, setWalletTxForm] = useState({
    type: 'Topup In',
    amount: 10000,
    refNo: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [customExpenseTypes, setCustomExpenseTypes] = useState<string[]>([
    'Shop Rent',
    'Electricity Bill',
    'Tooling & Consumables',
    'Staff Welfare & Tea',
    'Courier & Shipping',
    'Water & Utilities',
    'Internet & Telecom',
    'Marketing & Banners',
  ]);
  const [newTypeName, setNewTypeName] = useState('');

  // Headers helper
  const getAuthHeaders = () => {
    const activeToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
    };
  };

  // Helper for safe JSON fetching that prevents HTML/SPA parsing syntax errors
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return null;
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  };

  // Live SQL Aggregation & Data Loader
  const loadFinanceData = async () => {
    setIsRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        startDate: filterStartDate,
        endDate: filterEndDate,
      });

      // 1. Fetch Live SQL Overview
      const overviewData = await safeFetchJson(`/api/finance/overview?${params.toString()}`, { headers });
      if (overviewData) {
        setOverview(overviewData);
      }

      // 2. Fetch Expenses
      const expData = await safeFetchJson(`/api/finance/expenses?${params.toString()}`, { headers });
      if (Array.isArray(expData)) {
        setExpensesList(expData);
      }

      // 3. Fetch Investments
      const invData = await safeFetchJson('/api/finance/investments', { headers });
      if (Array.isArray(invData)) {
        setInvestmentsList(invData);
      }

      // 4. Fetch Other Incomes
      const incData = await safeFetchJson('/api/finance/other-incomes', { headers });
      if (Array.isArray(incData)) {
        setOtherIncomesList(incData);
      }

      // 5. Fetch Profit Out
      const poData = await safeFetchJson('/api/finance/profit-out', { headers });
      if (Array.isArray(poData)) {
        setProfitOutList(poData);
      }

      // 6. Fetch Bank Accounts & Transactions
      const bankData = await safeFetchJson('/api/finance/bank-accounts', { headers });
      if (Array.isArray(bankData)) {
        setBankAccountsList(bankData);
      }
      const bankTxData = await safeFetchJson('/api/finance/bank-transactions', { headers });
      if (Array.isArray(bankTxData)) {
        setBankTransactionsList(bankTxData);
      }

      // 7. Fetch e-Wallet Accounts & Transactions
      const walletData = await safeFetchJson('/api/finance/ewallet-accounts', { headers });
      if (Array.isArray(walletData)) {
        setEwalletAccountsList(walletData);
      }
      const walletTxData = await safeFetchJson('/api/finance/ewallet-transactions', { headers });
      if (Array.isArray(walletTxData)) {
        setEwalletTransactionsList(walletTxData);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [filterStartDate, filterEndDate]);

  // Sub-module Handlers
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.paidTo) return;
    try {
      const selectedBank = bankAccountsList.find((b) => String(b.id) === String(expenseForm.accountId));
      const selectedWallet = ewalletAccountsList.find((w) => String(w.id) === String(expenseForm.accountId));
      const accountName = selectedBank?.accountName || selectedWallet?.walletName || undefined;

      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...expenseForm,
          accountName,
        }),
      });
      if (res.ok) {
        setShowCreateExpenseModal(false);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Save expense error:', err);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      const res = await fetch(`/api/finance/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setExpensesList(expensesList.filter((e) => e.id !== id));
        loadFinanceData();
      }
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investmentForm.amount || !investmentForm.investorName) return;
    try {
      const selectedBank = bankAccountsList.find((b) => String(b.id) === String(investmentForm.accountId));
      const res = await fetch('/api/finance/investments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...investmentForm,
          accountName: selectedBank?.accountName,
        }),
      });
      if (res.ok) {
        setShowCreateInvestmentModal(false);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Save investment error:', err);
    }
  };

  const handleDeleteInvestment = async (id: number) => {
    if (!window.confirm('Delete this investment record?')) return;
    try {
      const res = await fetch(`/api/finance/investments/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setInvestmentsList(investmentsList.filter((i) => i.id !== id));
        loadFinanceData();
      }
    } catch (err) {
      console.error('Delete investment error:', err);
    }
  };

  const handleSaveOtherIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherIncomeForm.amount || !otherIncomeForm.receivedFrom) return;
    try {
      const selectedBank = bankAccountsList.find((b) => String(b.id) === String(otherIncomeForm.accountId));
      const res = await fetch('/api/finance/other-incomes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...otherIncomeForm,
          accountName: selectedBank?.accountName,
        }),
      });
      if (res.ok) {
        setShowCreateOtherIncomeModal(false);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Save other income error:', err);
    }
  };

  const handleDeleteOtherIncome = async (id: number) => {
    if (!window.confirm('Delete this other income record?')) return;
    try {
      const res = await fetch(`/api/finance/other-incomes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setOtherIncomesList(otherIncomesList.filter((o) => o.id !== id));
        loadFinanceData();
      }
    } catch (err) {
      console.error('Delete other income error:', err);
    }
  };

  const handleSaveProfitOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profitOutForm.amount || !profitOutForm.recipient) return;
    try {
      const selectedBank = bankAccountsList.find((b) => String(b.id) === String(profitOutForm.accountId));
      const res = await fetch('/api/finance/profit-out', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...profitOutForm,
          accountName: selectedBank?.accountName,
        }),
      });
      if (res.ok) {
        setShowCreateProfitOutModal(false);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Save profit out error:', err);
    }
  };

  const handleDeleteProfitOut = async (id: number) => {
    if (!window.confirm('Delete this profit distribution entry?')) return;
    try {
      const res = await fetch(`/api/finance/profit-out/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setProfitOutList(profitOutList.filter((p) => p.id !== id));
        loadFinanceData();
      }
    } catch (err) {
      console.error('Delete profit out error:', err);
    }
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountForm.accountName || !bankAccountForm.accountNumber) return;
    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(bankAccountForm),
      });
      if (res.ok) {
        setShowCreateBankModal(false);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Save bank account error:', err);
    }
  };

  const handleSaveBankTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankForTx || !bankTxForm.amount) return;
    try {
      const res = await fetch('/api/finance/bank-transactions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          bankAccountId: selectedBankForTx.id,
          ...bankTxForm,
        }),
      });
      if (res.ok) {
        setShowBankTxModal(false);
        setSelectedBankForTx(null);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Record bank transaction error:', err);
    }
  };

  const handleSaveWalletAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletForm.walletName || !walletForm.accountNumber) return;
    try {
      const res = await fetch('/api/finance/ewallet-accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(walletForm),
      });
      if (res.ok) {
        setShowCreateWalletModal(false);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Save ewallet error:', err);
    }
  };

  const handleSaveWalletTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForTx || !walletTxForm.amount) return;
    try {
      const res = await fetch('/api/finance/ewallet-transactions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ewalletAccountId: selectedWalletForTx.id,
          ...walletTxForm,
        }),
      });
      if (res.ok) {
        setShowWalletTxModal(false);
        setSelectedWalletForTx(null);
        loadFinanceData();
      }
    } catch (err) {
      console.error('Record ewallet transaction error:', err);
    }
  };

  // Filtered Expenses for view
  const displayExpenses = useMemo(() => {
    return expensesList.filter((exp) => {
      if (filterLocation !== 'All' && exp.location !== filterLocation) return false;
      if (filterExpenseType !== 'All' && exp.expenseType !== filterExpenseType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          exp.expenseType?.toLowerCase().includes(q) ||
          exp.paidTo?.toLowerCase().includes(q) ||
          exp.remark?.toLowerCase().includes(q) ||
          exp.payType?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expensesList, filterLocation, filterExpenseType, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#070e24] text-[#f8fafc] overflow-hidden select-none">
      {/* 1. TOP FINANCIAL NAVIGATION & LIVE SQL METRICS BAR */}
      <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] px-4 py-2.5 sm:px-6 shrink-0 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-700 flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
              <DollarSign className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  Finance & Expense Management
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-blue-900/50 border border-blue-400/30 text-[10px] font-mono-jb text-cyan-300 font-bold">
                  POSTGRESQL RELATIONAL ENGINE
                </span>
              </div>
              <p className="text-[11px] font-mono-jb text-blue-200/60 uppercase">
                General Ledger &bull; Incurred Period Expenses: {currency} {overview.totalExpenses.toLocaleString()} &bull; Net Cash Flow: {currency} {overview.netCashFlow.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={loadFinanceData}
              disabled={isRefreshing}
              title="Refresh live SQL aggregations"
              className="px-3 py-1.5 rounded-xl bg-[#0f1d46] hover:bg-[#162758] border border-blue-500/20 text-blue-200 font-mono-jb text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Live SQL Sync</span>
            </button>

            {/* Contextual Action Button based on active tab */}
            {activeSubModule === 'Expenses' && (
              <>
                <button
                  onClick={() => setShowTypeManagerModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#0f1d46] hover:bg-[#162758] border border-blue-500/20 text-blue-200 font-mono-jb text-xs font-bold transition-all cursor-pointer"
                >
                  Categories
                </button>
                <button
                  onClick={() => setShowCreateExpenseModal(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Log Expense</span>
                </button>
              </>
            )}

            {activeSubModule === 'Investments' && (
              <button
                onClick={() => setShowCreateInvestmentModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Capital Injection</span>
              </button>
            )}

            {activeSubModule === 'Other Incomes' && (
              <button
                onClick={() => setShowCreateOtherIncomeModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Log Other Revenue</span>
              </button>
            )}

            {activeSubModule === 'Profit Out' && (
              <button
                onClick={() => setShowCreateProfitOutModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Owner Draw / Dividend</span>
              </button>
            )}

            {activeSubModule === 'Bank Accounts' && (
              <button
                onClick={() => setShowCreateBankModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add Bank Account</span>
              </button>
            )}

            {activeSubModule === 'e-Wallet Accounts' && (
              <button
                onClick={() => setShowCreateWalletModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-violet-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add e-Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Metric Tiles with SQL SUMs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-2 font-mono-jb">
          <div className="bg-[#081230] p-2 rounded-xl border border-blue-500/20">
            <span className="text-[9px] uppercase text-blue-300 font-bold block">Incurred Expenses</span>
            <div className="text-xs sm:text-sm font-black text-rose-400">
              {currency} {overview.totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#081230] p-2 rounded-xl border border-blue-500/20">
            <span className="text-[9px] uppercase text-blue-300 font-bold block">Investments In</span>
            <div className="text-xs sm:text-sm font-black text-emerald-400">
              {currency} {overview.totalInvestments.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#081230] p-2 rounded-xl border border-blue-500/20">
            <span className="text-[9px] uppercase text-blue-300 font-bold block">Other Incomes</span>
            <div className="text-xs sm:text-sm font-black text-cyan-300">
              {currency} {overview.totalOtherIncome.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#081230] p-2 rounded-xl border border-blue-500/20">
            <span className="text-[9px] uppercase text-blue-300 font-bold block">Profit Out / Draws</span>
            <div className="text-xs sm:text-sm font-black text-amber-400">
              {currency} {overview.totalProfitOut.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#081230] p-2 rounded-xl border border-blue-500/20">
            <span className="text-[9px] uppercase text-blue-300 font-bold block">Bank Reserves</span>
            <div className="text-xs sm:text-sm font-black text-indigo-300">
              {currency} {overview.totalBankBalance.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#081230] p-2 rounded-xl border border-blue-500/20">
            <span className="text-[9px] uppercase text-blue-300 font-bold block">Digital e-Wallets</span>
            <div className="text-xs sm:text-sm font-black text-purple-300">
              {currency} {overview.totalEwalletBalance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 6 Sub-module Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs font-mono-jb">
          {(
            [
              'Expenses',
              'Investments',
              'Other Incomes',
              'Profit Out',
              'Bank Accounts',
              'e-Wallet Accounts',
            ] as const
          ).map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveSubModule(mod)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubModule === mod
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                  : 'bg-[#0c183d] text-blue-200/70 hover:text-white border border-blue-500/10'
              }`}
            >
              {mod === 'Expenses' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              {mod === 'Investments' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              {mod === 'Other Incomes' && <DollarSign className="w-3.5 h-3.5 text-cyan-400" />}
              {mod === 'Profit Out' && <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />}
              {mod === 'Bank Accounts' && <Landmark className="w-3.5 h-3.5 text-indigo-400" />}
              {mod === 'e-Wallet Accounts' && <Smartphone className="w-3.5 h-3.5 text-purple-400" />}
              <span>{mod}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. SUB-MODULE CONTROLS & FILTER ROW */}
      <div className="bg-[#091333] border-b border-[rgba(96,165,250,0.18)] p-2.5 sm:px-6 shrink-0 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono-jb">
          {/* Outlet Location */}
          <div>
            <label className="text-[9px] text-blue-300 uppercase font-bold block mb-0.5">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#070e24] border border-blue-500/20 rounded-lg text-white outline-none focus:border-blue-400 text-xs"
            >
              <option value="All">All Locations</option>
              <option value="Main Outlet Akkaraipattu">Main Outlet Akkaraipattu</option>
              <option value="Workshop Bench #1">Workshop Bench #1</option>
              <option value="Transport & Freight">Transport & Freight</option>
            </select>
          </div>

          {/* Category Filter for Expenses / Classification for others */}
          <div>
            <label className="text-[9px] text-blue-300 uppercase font-bold block mb-0.5">Category Filter</label>
            <select
              value={filterExpenseType}
              onChange={(e) => setFilterExpenseType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#070e24] border border-blue-500/20 rounded-lg text-white outline-none focus:border-blue-400 text-xs"
            >
              <option value="All">All Classifications</option>
              {customExpenseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[9px] text-blue-300 uppercase font-bold block mb-0.5">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#070e24] border border-blue-500/20 rounded-lg text-white outline-none focus:border-blue-400"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[9px] text-blue-300 uppercase font-bold block mb-0.5">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#070e24] border border-blue-500/20 rounded-lg text-white outline-none focus:border-blue-400"
            />
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[9px] text-blue-300 uppercase font-bold block mb-0.5">Quick Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search remark, payee, bank..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-black font-bold outline-none focus:border-blue-600 text-xs placeholder:text-slate-500 shadow-sm"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. DEDICATED SUB-MODULE CONTENT AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* SUB-MODULE 1: EXPENSES */}
        {activeSubModule === 'Expenses' && (
          <table className="w-full text-left text-xs font-mono-jb border-collapse">
            <thead className="sticky top-0 bg-[#091436] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[11px] select-none z-10">
              <tr>
                <th className="py-2.5 px-3 w-40">Location</th>
                <th className="py-2.5 px-3 w-44">Expense Type</th>
                <th className="py-2.5 px-3 w-44">Paid To</th>
                <th className="py-2.5 px-3">Remark / Purpose</th>
                <th className="py-2.5 px-3 w-28">Pay Method</th>
                <th className="py-2.5 px-3 w-40">Linked Account</th>
                <th className="py-2.5 px-3 w-28">Date</th>
                <th className="py-2.5 px-3 w-32 text-right">Amount</th>
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
              {displayExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-blue-300/50">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 text-rose-400/40" />
                    <p className="text-sm font-bold">No expense records found for this period</p>
                    <p className="text-[11px] text-blue-200/40 mt-1">
                      Click "+ Log Expense" to log rent, electricity, courier, or staff welfare.
                    </p>
                  </td>
                </tr>
              ) : (
                displayExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-blue-600/10 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-blue-200">{exp.location}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <span className="px-2 py-0.5 rounded bg-blue-900/40 border border-blue-500/20 text-[10px]">
                        {exp.expenseType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{exp.paidTo}</td>
                    <td className="py-2.5 px-3 text-blue-200/70">{exp.remark || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          exp.payType === 'Cash'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : exp.payType === 'Bank Transfer'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {exp.payType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-blue-200/60 truncate max-w-[150px]">
                      {exp.accountName || exp.payInfo || 'Counter Cash'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-300">{exp.date}</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-400 text-sm">
                      {currency} {Number(exp.amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded text-blue-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete expense entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* SUB-MODULE 2: INVESTMENTS */}
        {activeSubModule === 'Investments' && (
          <table className="w-full text-left text-xs font-mono-jb border-collapse">
            <thead className="sticky top-0 bg-[#091436] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[11px] select-none z-10">
              <tr>
                <th className="py-2.5 px-3 w-48">Investor / Partner</th>
                <th className="py-2.5 px-3 w-40">Investment Type</th>
                <th className="py-2.5 px-3 w-44">Deposited Account</th>
                <th className="py-2.5 px-3">Notes & Equity Purpose</th>
                <th className="py-2.5 px-3 w-28">Pay Mode</th>
                <th className="py-2.5 px-3 w-28">Date</th>
                <th className="py-2.5 px-3 w-36 text-right">Injected Capital</th>
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
              {investmentsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-blue-300/50">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-400/40" />
                    <p className="text-sm font-bold">No capital investments recorded</p>
                    <p className="text-[11px] text-blue-200/40 mt-1">
                      Click "+ Capital Injection" to record partner equity, equipment funding, or working capital.
                    </p>
                  </td>
                </tr>
              ) : (
                investmentsList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-600/10 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">{inv.investorName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                        {inv.investmentType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-200">{inv.accountName || 'Counter Treasury'}</td>
                    <td className="py-2.5 px-3 text-blue-200/70">{inv.notes || '-'}</td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{inv.payType}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-300">{inv.date}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-400 text-sm">
                      {currency} {Number(inv.amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteInvestment(inv.id)}
                        className="p-1 rounded text-blue-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete investment entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* SUB-MODULE 3: OTHER INCOMES */}
        {activeSubModule === 'Other Incomes' && (
          <table className="w-full text-left text-xs font-mono-jb border-collapse">
            <thead className="sticky top-0 bg-[#091436] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[11px] select-none z-10">
              <tr>
                <th className="py-2.5 px-3 w-48">Revenue Source</th>
                <th className="py-2.5 px-3 w-44">Received From</th>
                <th className="py-2.5 px-3 w-40">Received Into</th>
                <th className="py-2.5 px-3">Description / Remarks</th>
                <th className="py-2.5 px-3 w-28">Pay Type</th>
                <th className="py-2.5 px-3 w-28">Date</th>
                <th className="py-2.5 px-3 w-32 text-right">Amount</th>
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
              {otherIncomesList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-blue-300/50">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-cyan-400/40" />
                    <p className="text-sm font-bold">No non-sales other income recorded</p>
                    <p className="text-[11px] text-blue-200/40 mt-1">
                      Click "+ Log Other Revenue" to record trade-in commissions, e-waste scrap, or royalties.
                    </p>
                  </td>
                </tr>
              ) : (
                otherIncomesList.map((inc) => (
                  <tr key={inc.id} className="hover:bg-blue-600/10 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-cyan-300">{inc.source}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{inc.receivedFrom}</td>
                    <td className="py-2.5 px-3 text-blue-200">{inc.accountName || 'Cash In Hand'}</td>
                    <td className="py-2.5 px-3 text-blue-200/70">{inc.remark || '-'}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{inc.payType}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-300">{inc.date}</td>
                    <td className="py-2.5 px-3 text-right font-black text-cyan-300 text-sm">
                      {currency} {Number(inc.amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteOtherIncome(inc.id)}
                        className="p-1 rounded text-blue-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete income record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* SUB-MODULE 4: PROFIT OUT (OWNER DRAWS & DIVIDENDS) */}
        {activeSubModule === 'Profit Out' && (
          <table className="w-full text-left text-xs font-mono-jb border-collapse">
            <thead className="sticky top-0 bg-[#091436] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[11px] select-none z-10">
              <tr>
                <th className="py-2.5 px-3 w-48">Recipient / Owner</th>
                <th className="py-2.5 px-3 w-40">Distribution Type</th>
                <th className="py-2.5 px-3 w-44">Disbursed From</th>
                <th className="py-2.5 px-3">Audit Notes</th>
                <th className="py-2.5 px-3 w-28">Pay Type</th>
                <th className="py-2.5 px-3 w-28">Date</th>
                <th className="py-2.5 px-3 w-32 text-right">Draw Amount</th>
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
              {profitOutList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-blue-300/50">
                    <ArrowDownRight className="w-8 h-8 mx-auto mb-2 text-amber-400/40" />
                    <p className="text-sm font-bold">No profit distributions logged</p>
                    <p className="text-[11px] text-blue-200/40 mt-1">
                      Click "+ Owner Draw / Dividend" to log founder equity drawings or dividend payouts.
                    </p>
                  </td>
                </tr>
              ) : (
                profitOutList.map((po) => (
                  <tr key={po.id} className="hover:bg-blue-600/10 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">{po.recipient}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-900/40 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                        {po.distributionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-blue-200">{po.accountName || 'Cash In Hand'}</td>
                    <td className="py-2.5 px-3 text-blue-200/70">{po.notes || '-'}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{po.payType}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-300">{po.date}</td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-400 text-sm">
                      {currency} {Number(po.amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteProfitOut(po.id)}
                        className="p-1 rounded text-blue-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete drawing entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* SUB-MODULE 5: BANK ACCOUNTS & TRANSACTIONS */}
        {activeSubModule === 'Bank Accounts' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bankAccountsList.map((bank) => (
                <div
                  key={bank.id}
                  className="bg-[#0b163a] rounded-2xl border border-blue-500/20 p-4 shadow-lg hover:border-blue-400/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-bold text-white text-xs truncate max-w-[180px]">{bank.bankName}</h4>
                      </div>
                      {bank.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                          POS Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-blue-100">{bank.accountName}</p>
                    <p className="text-[11px] font-mono-jb text-blue-300/60 mt-1">Acc: {bank.accountNumber} &bull; {bank.branch}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-blue-300 uppercase font-bold block">Current Balance</span>
                      <strong className="text-base font-black text-emerald-400 font-mono-jb">
                        {currency} {Number(bank.balance).toLocaleString()}
                      </strong>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedBankForTx(bank);
                        setShowBankTxModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold font-mono-jb cursor-pointer flex items-center gap-1 shadow-md shadow-blue-600/30"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Adjust / Deposit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bank Recent Transactions Ledger */}
            <div className="bg-[#081230] rounded-2xl border border-blue-500/20 overflow-hidden shadow-xl mt-4">
              <div className="bg-[#0a1744] px-4 py-2.5 border-b border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    Synchronized Bank Ledger Transactions ({bankTransactionsList.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono-jb text-blue-200/60">POS Card & Transfer Settlements Auto-Posted</span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono-jb border-collapse">
                  <thead className="sticky top-0 bg-[#09153a] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Bank Account</th>
                      <th className="py-2 px-3">Transaction Type</th>
                      <th className="py-2 px-3">Ref No</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
                    {bankTransactionsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-blue-300/40">
                          No bank transactions logged yet
                        </td>
                      </tr>
                    ) : (
                      bankTransactionsList.map((tx) => (
                        <tr key={tx.id} className="hover:bg-blue-600/10">
                          <td className="py-2 px-3 text-blue-300">{tx.date}</td>
                          <td className="py-2 px-3 font-semibold text-white">{tx.bankAccountName}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-900/40 text-[10px] font-bold text-cyan-300 border border-blue-500/20">
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-blue-200">{tx.refNo || '-'}</td>
                          <td className="py-2 px-3 text-blue-200/70">{tx.description || '-'}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-400">
                            {currency} {Number(tx.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODULE 6: E-WALLET ACCOUNTS & RECONCILIATION */}
        {activeSubModule === 'e-Wallet Accounts' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ewalletAccountsList.map((w) => (
                <div
                  key={w.id}
                  className="bg-[#0b163a] rounded-2xl border border-blue-500/20 p-4 shadow-lg hover:border-purple-400/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-400" />
                        <h4 className="font-bold text-white text-xs">{w.provider}</h4>
                      </div>
                      {w.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                          QR Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-blue-100">{w.walletName}</p>
                    <p className="text-[11px] font-mono-jb text-blue-300/60 mt-1">ID: {w.accountNumber} {w.merchantId ? `(${w.merchantId})` : ''}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-blue-300 uppercase font-bold block">Current Balance</span>
                      <strong className="text-base font-black text-purple-300 font-mono-jb">
                        {currency} {Number(w.balance).toLocaleString()}
                      </strong>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedWalletForTx(w);
                        setShowWalletTxModal(true);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold font-mono-jb cursor-pointer flex items-center gap-1 shadow-md shadow-purple-600/30"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Adjust / Payout</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* e-Wallet Transactions Ledger */}
            <div className="bg-[#081230] rounded-2xl border border-blue-500/20 overflow-hidden shadow-xl mt-4">
              <div className="bg-[#0a1744] px-4 py-2.5 border-b border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <h3 className="font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    Synchronized e-Wallet Ledger Transactions ({ewalletTransactionsList.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono-jb text-blue-200/60">Dialog e-Z Cash, FriMi & Genie Dynamic Settlements</span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono-jb border-collapse">
                  <thead className="sticky top-0 bg-[#09153a] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">e-Wallet Terminal</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Ref No</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
                    {ewalletTransactionsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-blue-300/40">
                          No digital wallet transactions logged yet
                        </td>
                      </tr>
                    ) : (
                      ewalletTransactionsList.map((tx) => (
                        <tr key={tx.id} className="hover:bg-blue-600/10">
                          <td className="py-2 px-3 text-blue-300">{tx.date}</td>
                          <td className="py-2 px-3 font-semibold text-white">{tx.walletName}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-purple-900/40 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-blue-200">{tx.refNo || '-'}</td>
                          <td className="py-2 px-3 text-blue-200/70">{tx.description || '-'}</td>
                          <td className="py-2 px-3 text-right font-black text-purple-300">
                            {currency} {Number(tx.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE EXPENSE */}
      {showCreateExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Log New Expense Record
              </h3>
              <button onClick={() => setShowCreateExpenseModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Outlet / Location</label>
                  <select
                    value={expenseForm.location}
                    onChange={(e) => setExpenseForm({ ...expenseForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Main Outlet Akkaraipattu">Main Outlet Akkaraipattu</option>
                    <option value="Workshop Bench #1">Workshop Bench #1</option>
                    <option value="Transport & Freight">Transport & Freight</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Expense Type</label>
                  <select
                    value={expenseForm.expenseType}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    {customExpenseTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Paid To / Recipient</label>
                  <input
                    type="text"
                    required
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                    placeholder="e.g. CEB / Building Owner"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Expense Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Remark / Purpose</label>
                <input
                  type="text"
                  value={expenseForm.remark}
                  onChange={(e) => setExpenseForm({ ...expenseForm, remark: e.target.value })}
                  placeholder="e.g. October shop rental settlement"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Payment Method</label>
                  <select
                    value={expenseForm.payType}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="e-Wallet">e-Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {expenseForm.payType === 'Bank Transfer' && (
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Debit from Corporate Bank Account
                  </label>
                  <select
                    value={expenseForm.accountId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="">Select Bank Account...</option>
                    {bankAccountsList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountName} (Bal: LKR {b.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {expenseForm.payType === 'e-Wallet' && (
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Debit from Digital e-Wallet
                  </label>
                  <select
                    value={expenseForm.accountId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="">Select e-Wallet Account...</option>
                    {ewalletAccountsList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.provider} - {w.walletName} (Bal: LKR {w.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white rounded-xl font-bold shadow-md shadow-red-600/30 cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE INVESTMENT */}
      {showCreateInvestmentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Record Capital Investment / Equity
              </h3>
              <button onClick={() => setShowCreateInvestmentModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Investor / Partner Name</label>
                  <input
                    type="text"
                    required
                    value={investmentForm.investorName}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, investorName: e.target.value })}
                    placeholder="e.g. Mohamed Raasith"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Investment Type</label>
                  <select
                    value={investmentForm.investmentType}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, investmentType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Capital Injection">Capital Injection</option>
                    <option value="Partner Equity">Partner Equity</option>
                    <option value="Working Capital">Working Capital</option>
                    <option value="External Loan">External Loan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={investmentForm.amount}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={investmentForm.date}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Deposited Bank Account</label>
                <select
                  value={investmentForm.accountId}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, accountId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                >
                  <option value="">Select Bank Account...</option>
                  {bankAccountsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Notes & Details</label>
                <input
                  type="text"
                  value={investmentForm.notes}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, notes: e.target.value })}
                  placeholder="e.g. Additional technician bench setup fund"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInvestmentModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Save Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE OTHER INCOME */}
      {showCreateOtherIncomeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Log Non-Sales Other Income
              </h3>
              <button onClick={() => setShowCreateOtherIncomeModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveOtherIncome} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Income Source</label>
                  <select
                    value={otherIncomeForm.source}
                    onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, source: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Scrap / E-Waste Disposal">Scrap / E-Waste Disposal</option>
                    <option value="Device Trade-in Margin">Device Trade-in Margin</option>
                    <option value="Franchise Royalty">Franchise Royalty</option>
                    <option value="Rental Sublet">Rental Sublet</option>
                    <option value="Commission">Commission</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Received From</label>
                  <input
                    type="text"
                    required
                    value={otherIncomeForm.receivedFrom}
                    onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, receivedFrom: e.target.value })}
                    placeholder="e.g. Colombo Scrap Buyers"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={otherIncomeForm.amount}
                    onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-cyan-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={otherIncomeForm.date}
                    onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Remarks</label>
                <input
                  type="text"
                  value={otherIncomeForm.remark}
                  onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, remark: e.target.value })}
                  placeholder="e.g. Sale of discarded damaged displays"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOtherIncomeModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-xl font-bold shadow-md shadow-cyan-600/30 cursor-pointer"
                >
                  Save Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE PROFIT OUT */}
      {showCreateProfitOutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Record Profit Out / Owner Draw
              </h3>
              <button onClick={() => setShowCreateProfitOutModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProfitOut} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={profitOutForm.recipient}
                    onChange={(e) => setProfitOutForm({ ...profitOutForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Distribution Type</label>
                  <select
                    value={profitOutForm.distributionType}
                    onChange={(e) => setProfitOutForm({ ...profitOutForm, distributionType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Owner Draw">Owner Draw</option>
                    <option value="Dividend Payout">Dividend Payout</option>
                    <option value="Profit Distribution">Profit Distribution</option>
                    <option value="Partner Share">Partner Share</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Draw Amount ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={profitOutForm.amount}
                    onChange={(e) => setProfitOutForm({ ...profitOutForm, amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={profitOutForm.date}
                    onChange={(e) => setProfitOutForm({ ...profitOutForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Disbursed From Bank Account</label>
                <select
                  value={profitOutForm.accountId}
                  onChange={(e) => setProfitOutForm({ ...profitOutForm, accountId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                >
                  <option value="">Select Bank Account...</option>
                  {bankAccountsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (Bal: LKR {b.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Notes</label>
                <input
                  type="text"
                  value={profitOutForm.notes}
                  onChange={(e) => setProfitOutForm({ ...profitOutForm, notes: e.target.value })}
                  placeholder="e.g. October monthly profit distribution"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProfitOutModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white rounded-xl font-bold shadow-md shadow-amber-600/30 cursor-pointer"
                >
                  Record Distribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE BANK ACCOUNT */}
      {showCreateBankModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Add Corporate Bank Registry
              </h3>
              <button onClick={() => setShowCreateBankModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="p-5 space-y-3 font-mono-jb text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankAccountForm.bankName}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                  placeholder="e.g. Commercial Bank of Ceylon"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Account Name / Purpose</label>
                <input
                  type="text"
                  required
                  value={bankAccountForm.accountName}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountName: e.target.value })}
                  placeholder="e.g. Main Counter POS Terminal Settlement"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankAccountForm.accountNumber}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                    placeholder="e.g. 8004928172"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Branch</label>
                  <input
                    type="text"
                    value={bankAccountForm.branch}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, branch: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Opening Balance ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={bankAccountForm.balance}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, balance: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-emerald-400"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bankAccountForm.isDefault}
                      onChange={(e) => setBankAccountForm({ ...bankAccountForm, isDefault: e.target.checked })}
                      className="rounded border-blue-500/30"
                    />
                    <span className="text-white text-[11px] font-bold">Set as Default POS Settlement</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBankModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: BANK TRANSACTION ADJUSTMENT */}
      {showBankTxModal && selectedBankForTx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <div>
                <h3 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
                  Post Bank Transaction
                </h3>
                <p className="text-[10px] text-blue-200/60 font-mono-jb">
                  {selectedBankForTx.bankName} - {selectedBankForTx.accountName}
                </p>
              </div>
              <button onClick={() => setShowBankTxModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBankTransaction} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Transaction Type</label>
                  <select
                    value={bankTxForm.type}
                    onChange={(e) => setBankTxForm({ ...bankTxForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Deposit In">Deposit In (+)</option>
                    <option value="Withdrawal Out">Withdrawal Out (-)</option>
                    <option value="Bank Charge Out">Bank Charge Out (-)</option>
                    <option value="Interest Earned In">Interest Earned In (+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bankTxForm.amount}
                    onChange={(e) => setBankTxForm({ ...bankTxForm, amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Ref / Voucher Number</label>
                <input
                  type="text"
                  value={bankTxForm.refNo}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, refNo: e.target.value })}
                  placeholder="e.g. SLIP-99212"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Description</label>
                <input
                  type="text"
                  value={bankTxForm.description}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, description: e.target.value })}
                  placeholder="e.g. Counter cash deposit into branch"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankTxModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATE E-WALLET */}
      {showCreateWalletModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Add Digital e-Wallet Account
              </h3>
              <button onClick={() => setShowCreateWalletModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveWalletAccount} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Provider</label>
                  <select
                    value={walletForm.provider}
                    onChange={(e) => setWalletForm({ ...walletForm, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="e-Z Cash">Dialog e-Z Cash</option>
                    <option value="FriMi">Nations Trust FriMi</option>
                    <option value="Genie">Dialog Genie</option>
                    <option value="Koko">Koko Pay BNPL</option>
                    <option value="Helapay">Helapay QR</option>
                    <option value="Other">Other Digital Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Wallet Name</label>
                  <input
                    type="text"
                    required
                    value={walletForm.walletName}
                    onChange={(e) => setWalletForm({ ...walletForm, walletName: e.target.value })}
                    placeholder="e.g. Counter QR Merchant Terminal"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Account / Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={walletForm.accountNumber}
                    onChange={(e) => setWalletForm({ ...walletForm, accountNumber: e.target.value })}
                    placeholder="e.g. 0777123901"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Merchant ID (Optional)</label>
                  <input
                    type="text"
                    value={walletForm.merchantId}
                    onChange={(e) => setWalletForm({ ...walletForm, merchantId: e.target.value })}
                    placeholder="e.g. MCH-9921"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Initial Balance ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={walletForm.balance}
                    onChange={(e) => setWalletForm({ ...walletForm, balance: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-purple-300"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={walletForm.isDefault}
                      onChange={(e) => setWalletForm({ ...walletForm, isDefault: e.target.checked })}
                      className="rounded border-blue-500/30"
                    />
                    <span className="text-white text-[11px] font-bold">Default POS QR Gateway</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWalletModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 text-white rounded-xl font-bold shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  Save e-Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: E-WALLET TRANSACTION ADJUSTMENT */}
      {showWalletTxModal && selectedWalletForTx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <div>
                <h3 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
                  Post e-Wallet Transaction
                </h3>
                <p className="text-[10px] text-blue-200/60 font-mono-jb">
                  {selectedWalletForTx.provider} - {selectedWalletForTx.walletName}
                </p>
              </div>
              <button onClick={() => setShowWalletTxModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveWalletTransaction} className="p-5 space-y-3 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Transaction Type</label>
                  <select
                    value={walletTxForm.type}
                    onChange={(e) => setWalletTxForm({ ...walletTxForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value="Topup In">Topup In (+)</option>
                    <option value="Withdrawal to Bank">Withdrawal to Bank (-)</option>
                    <option value="Vendor Payout">Vendor Payout (-)</option>
                    <option value="Adjustment In">Adjustment (+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={walletTxForm.amount}
                    onChange={(e) => setWalletTxForm({ ...walletTxForm, amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-purple-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Ref / Transaction ID</label>
                <input
                  type="text"
                  value={walletTxForm.refNo}
                  onChange={(e) => setWalletTxForm({ ...walletTxForm, refNo: e.target.value })}
                  placeholder="e.g. TXN-99812"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Description</label>
                <input
                  type="text"
                  value={walletTxForm.description}
                  onChange={(e) => setWalletTxForm({ ...walletTxForm, description: e.target.value })}
                  placeholder="e.g. Wallet sweep settlement to Commercial Bank"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalletTxModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: EXPENSE TYPES MANAGER */}
      {showTypeManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Expense Categories & Types
              </h3>
              <button onClick={() => setShowTypeManagerModal(false)} className="text-blue-300/60 hover:text-white p-1">
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono-jb text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="New expense category..."
                  className="flex-1 px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    if (newTypeName.trim() && !customExpenseTypes.includes(newTypeName.trim())) {
                      setCustomExpenseTypes([...customExpenseTypes, newTypeName.trim()]);
                      setNewTypeName('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-blue-500/10 border border-blue-500/20 rounded-xl bg-[#08102a]">
                {customExpenseTypes.map((type) => (
                  <div key={type} className="p-2.5 flex items-center justify-between">
                    <span className="font-bold text-white">{type}</span>
                    <button
                      onClick={() => setCustomExpenseTypes(customExpenseTypes.filter((t) => t !== type))}
                      className="text-rose-400 hover:text-white text-xs"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowTypeManagerModal(false)}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
