import React, { useState, useEffect } from 'react';
import {
  Home,
  CreditCard,
  Package,
  Truck,
  CircleDollarSign,
  FileBarChart,
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  LogOut,
  Plus,
  Download,
  Search,
  X,
  Smartphone,
  Wrench,
  Printer,
  ShoppingBag,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Barcode,
  Phone,
  Tag,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  Users,
  Power,
  TrendingUp,
} from 'lucide-react';
import {
  AppIconHome,
  AppIconDashboard,
  AppIconPos,
  AppIconInventory,
  AppIconCustomers,
  AppIconSuppliers,
  AppIconFinance,
  AppIconReports,
  AppIconRepairs,
  AppIconSettings,
  AppIconDoorLogout,
} from './AppIcons.tsx';
import { StaffUser, RepairJob } from '../types.ts';
import { NotificationCenter } from './NotificationCenter.tsx';
import { useShop } from '../context/ShopContext.tsx';

export const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col items-end px-3 py-1 bg-[#09153a] rounded-xl border border-[rgba(96,165,250,0.25)] font-mono-jb shrink-0 select-none shadow-md shadow-blue-900/20 text-right">
      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-cyan-300 tracking-tight">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span>{timeStr}</span>
      </div>
      <div className="text-[10px] text-blue-200/70 uppercase tracking-wider font-bold">
        {dateStr}
      </div>
    </div>
  );
};

export type AppViewId =
  | 'home'
  | 'pos'
  | 'inventory'
  | 'suppliers'
  | 'finance'
  | 'reports'
  | 'jobs'
  | 'settings'
  | 'profile'
  | 'summary'
  | 'technicians'
  | 'customers';

export interface NavRailProps {
  currentView: AppViewId;
  onViewChange: (view: AppViewId) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  staffUser: StaffUser | null;
  shopName: string;
  onOpenPOS?: () => void;
  onOpenAdminPermissions?: () => void;
  isDayOpen?: boolean;
  onStartDayClick?: () => void;
  onEndDayClick?: () => void;
}

export const NavRail: React.FC<NavRailProps> = ({
  currentView,
  onViewChange,
  onOpenSettings,
  onLogout,
  staffUser,
  shopName,
  onOpenPOS,
  onOpenAdminPermissions,
  isDayOpen,
  onStartDayClick,
  onEndDayClick,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName;
  const activeLogoUrl = shopProfile?.logoUrl || '/images/raasith_logo.png';

  const role = staffUser?.role?.toLowerCase() || 'cashier';
  const isAdmin = role === 'admin';
  const isTechnician = role === 'technician';
  const isCashier = role === 'cashier';

  // Persistent sidebar app-style modules with uniform filled icons and colorful modern ecosystem palettes
  const navItems: {
    id: AppViewId;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    badge?: string;
    iconBg: string;
    activeIndicator: string;
    shadowColor: string;
  }[] = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: AppIconDashboard,
      iconBg: 'bg-blue-600 text-white',
      activeIndicator: 'bg-blue-600',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      id: 'pos',
      label: 'POS Sales',
      icon: AppIconPos,
      badge: 'HOT',
      iconBg: 'bg-emerald-600 text-white',
      activeIndicator: 'bg-emerald-600',
      shadowColor: 'shadow-emerald-500/30',
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: AppIconInventory,
      iconBg: 'bg-green-600 text-white',
      activeIndicator: 'bg-green-600',
      shadowColor: 'shadow-green-500/30',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: AppIconCustomers,
      iconBg: 'bg-indigo-600 text-white',
      activeIndicator: 'bg-indigo-600',
      shadowColor: 'shadow-indigo-500/30',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: AppIconSuppliers,
      iconBg: 'bg-purple-600 text-white',
      activeIndicator: 'bg-purple-600',
      shadowColor: 'shadow-purple-500/30',
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: AppIconFinance,
      iconBg: 'bg-teal-600 text-white',
      activeIndicator: 'bg-teal-600',
      shadowColor: 'shadow-teal-500/30',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: AppIconReports,
      iconBg: 'bg-orange-500 text-white',
      activeIndicator: 'bg-orange-500',
      shadowColor: 'shadow-orange-500/30',
    },
    {
      id: 'jobs',
      label: 'Repairs',
      icon: AppIconRepairs,
      iconBg: 'bg-slate-700 text-white',
      activeIndicator: 'bg-slate-700',
      shadowColor: 'shadow-slate-500/30',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: AppIconSettings,
      iconBg: 'bg-slate-600 text-white',
      activeIndicator: 'bg-slate-600',
      shadowColor: 'shadow-slate-500/30',
    },
  ];

  // RBAC Filtering: Technician is restricted strictly ONLY to Repair Module
  const visibleNavItems = navItems.filter((item) => {
    if (isTechnician) {
      return item.id === 'jobs';
    }
    if (isCashier) {
      return item.id !== 'finance' && item.id !== 'reports';
    }
    return true;
  });

  return (
    <>
      {/* Desktop App-Style Left Sidebar (w-[92px]) with Solid White Background & Modern Mobile-App Rhythm */}
      <aside className="nav-rail hidden md:flex flex-col items-center justify-between w-[92px] bg-white border-r border-slate-200/90 py-2.5 z-40 shrink-0 select-none h-screen no-print shadow-[2px_0_10px_rgba(0,0,0,0.03)] overflow-y-auto no-scrollbar">
        {/* Top Section: Distinct Home Anchor + Navigation List */}
        <div className="flex flex-col items-center gap-1 w-full flex-1 justify-start">
          {/* Top Home Anchor Button (Primary Blue) */}
          <button
            type="button"
            onClick={() => onViewChange('home')}
            title="Home"
            aria-label="Home"
            className={`group relative w-[82px] min-h-[50px] py-1 px-1 rounded-xl flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
              currentView === 'home'
                ? 'bg-slate-100/90 shadow-xs ring-1 ring-slate-200/90'
                : 'hover:bg-slate-50 text-gray-700 hover:text-gray-900'
            }`}
          >
            {/* Active Left Indicator Bar */}
            {currentView === 'home' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />
            )}

            {/* Filled App-Style Icon Squircle */}
            <div
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 bg-blue-600 text-white ${
                currentView === 'home' ? 'shadow-md shadow-blue-500/30' : 'opacity-90 group-hover:opacity-100 shadow-xs'
              }`}
            >
              <AppIconHome className="w-4.5 h-4.5" />
            </div>
            <span
              className={`font-sans text-[10px] sm:text-[10.5px] leading-tight mt-1 truncate max-w-[76px] text-center ${
                currentView === 'home' ? 'text-gray-900 font-bold' : 'text-gray-700 font-semibold group-hover:text-gray-900'
              }`}
            >
              Home
            </span>
          </button>

          {/* Navigation Items (Grid-like App Rhythm with Spacious Clickable Tiles) */}
          <nav className="flex flex-col items-center gap-1 w-full px-1 flex-1 justify-center my-0.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`nav-item group relative w-[82px] min-h-[50px] py-1 px-1 rounded-xl flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-slate-100/90 shadow-xs ring-1 ring-slate-200/90'
                      : 'hover:bg-slate-50 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {/* Left Indicator Bar on Active State */}
                  {isActive && (
                    <span
                      className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${item.activeIndicator}`}
                    />
                  )}

                  {/* Uniform App-Style Icon Squircle with Dedicated Color Coding */}
                  <div
                    className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${item.iconBg} ${
                      isActive ? `shadow-md ${item.shadowColor}` : 'opacity-90 group-hover:opacity-100 shadow-xs'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Clean Modern Typography in Dark Gray */}
                  <span
                    className={`font-sans text-[10px] sm:text-[10.5px] leading-tight mt-1 truncate max-w-[76px] text-center ${
                      isActive
                        ? 'text-gray-900 font-bold'
                        : 'text-gray-700 font-semibold group-hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge && (
                    <span className="absolute top-0.5 right-1 bg-rose-500 text-white text-[7px] font-black px-1 rounded-full shadow-xs animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Admin RBAC, Profile Avatar ('M') & Neutral Logout */}
        <div className="flex flex-col items-center gap-1.5 w-full border-t border-slate-200/90 pt-2 shrink-0">
          {/* Admin RBAC Permissions */}
          {isAdmin && onOpenAdminPermissions && (
            <button
              onClick={onOpenAdminPermissions}
              title="Admin Permissions (RBAC)"
              aria-label="Admin Permissions"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
            </button>
          )}

          {/* User Profile Avatar ('M') in Clean Modern Theme */}
          <button
            onClick={() => onViewChange('profile')}
            title={staffUser ? `${staffUser.name} (${staffUser.role})` : 'User Profile'}
            aria-label="User Profile"
            className="w-8.5 h-8.5 rounded-full bg-slate-100 border-2 border-slate-300 hover:border-blue-500 hover:bg-white flex items-center justify-center text-xs font-sans font-bold text-gray-900 shadow-xs transition-all cursor-pointer"
          >
            {staffUser?.name ? staffUser.name.charAt(0).toUpperCase() : 'M'}
          </button>

          {/* Neutral Clean Door Logout Icon */}
          <button
            onClick={onLogout}
            title="Sign Out"
            aria-label="Sign Out"
            className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <AppIconDoorLogout className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< md) with Solid White Theme */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around no-print shadow-xl">
        {visibleNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive ? 'bg-slate-100 ring-1 ring-slate-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-[8px] flex items-center justify-center ${item.iconBg} ${
                  isActive ? 'shadow-xs' : 'opacity-85'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[9px] font-sans mt-0.5 ${
                  isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        {!isTechnician && (
          <button
            onClick={() => onViewChange('settings')}
            className="flex flex-col items-center justify-center py-1 px-2 text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center bg-slate-600 text-white">
              <AppIconSettings className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-sans font-medium mt-0.5">Settings</span>
          </button>
        )}
      </nav>
    </>
  );
};

export interface HeaderProps {
  currentView: AppViewId;
  shopName: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenNewJob: () => void;
  onOpenPOS: () => void;
  onExportCSV: () => void;
  staffUser: StaffUser | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onOpenAdminPermissions?: () => void;
  jobs?: RepairJob[];
  onRecallJobToPOS?: (job: RepairJob) => void;
  onRecallCustomerToPOS?: (customer: { phoneNumber: string; customerName: string; creditDue?: number; advanceBalance?: number }) => void;
  onAddInventoryItemToPOS?: (item: any) => void;
  onSelectSupplier?: (supplier: any) => void;
  token?: string | null;
  onOpenJobSheet?: (jobId: number) => void;
  onSwitchRole?: (role: string) => void;
  isDayOpen?: boolean;
  onStartDayClick?: () => void;
  onEndDayClick?: () => void;
}

type SearchCategoryType = 'job' | 'item' | 'supplier' | 'customer';

interface SearchResultEntry {
  type: SearchCategoryType;
  categoryLabel: string;
  id: string | number;
  data: any;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  shopName,
  searchQuery = '',
  onSearchChange,
  onOpenNewJob,
  onOpenPOS,
  onExportCSV,
  staffUser,
  onOpenSettings,
  onLogout,
  jobs = [],
  onRecallJobToPOS,
  onRecallCustomerToPOS,
  onAddInventoryItemToPOS,
  onSelectSupplier,
  token,
  onOpenJobSheet,
  onSwitchRole,
  isDayOpen,
  onStartDayClick,
  onEndDayClick,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName;
  const activeBranch = shopProfile?.branch || 'MAIN OUTLET AKKARAIPATTU';
  const activeLogoUrl = shopProfile?.logoUrl || '/images/raasith_logo.png';

  const isAdmin = staffUser?.role?.toLowerCase() === 'admin';
  const isTechnician = staffUser?.role?.toLowerCase() === 'technician';
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const handleToggleDayShift = () => {
    if (isDayOpen) {
      if (onEndDayClick) onEndDayClick();
    } else {
      if (onStartDayClick) onStartDayClick();
    }
  };
  const [searchResults, setSearchResults] = useState<{
    jobs: RepairJob[];
    items: any[];
    suppliers: any[];
    customers: any[];
  }>({
    jobs: [],
    items: [],
    suppliers: [],
    customers: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  // Live real-time multi-entity search querying database
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults({ jobs: [], items: [], suppliers: [], customers: [] });
      setHighlightedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token');
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setHighlightedIndex(0);
        }
      } catch (err) {
        console.warn('Real-time search error, falling back to local jobs:', err);
        const lowQ = q.toLowerCase();
        const fallbackJobs = (jobs || []).filter(
          (j) =>
            j.jobNumber.toLowerCase().includes(lowQ) ||
            j.customerName.toLowerCase().includes(lowQ) ||
            j.phoneNumber.includes(lowQ)
        ).slice(0, 6);
        setSearchResults({ jobs: fallbackJobs, items: [], suppliers: [], customers: [] });
      } finally {
        setIsSearching(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, token, jobs]);

  // Flattened results for keyboard navigation (Arrow Up / Down / Enter)
  const flattenedResults = React.useMemo<SearchResultEntry[]>(() => {
    const list: SearchResultEntry[] = [];
    (searchResults.jobs || []).forEach((j) => {
      list.push({ type: 'job', categoryLabel: 'Job Orders', id: `job-${j.id}`, data: j });
    });
    (searchResults.items || []).forEach((i) => {
      list.push({ type: 'item', categoryLabel: 'Inventory Items', id: `item-${i.id}`, data: i });
    });
    (searchResults.suppliers || []).forEach((s) => {
      list.push({ type: 'supplier', categoryLabel: 'Suppliers', id: `supplier-${s.code}`, data: s });
    });
    (searchResults.customers || []).forEach((c) => {
      list.push({ type: 'customer', categoryLabel: 'Customers', id: `customer-${c.phoneNumber}`, data: c });
    });
    return list;
  }, [searchResults]);

  const viewTitles: Partial<Record<AppViewId, { title: string; subtitle: string }>> = {
    home: { title: `${shopName} · DASHBOARD`, subtitle: 'OPERATIONS & REPAIR BENCH' },
    pos: { title: 'FAST POS / RETAIL CHECKOUT', subtitle: 'HIGH-SPEED BARCODE BILLING' },
    inventory: { title: 'INVENTORY & STOCK REGISTRY', subtitle: 'SKU CATALOG & REORDER ALERTS' },
    suppliers: { title: 'SUPPLIER & VENDOR LEDGERS', subtitle: 'ACCOUNTS PAYABLE & CREDITOR LEDGER' },
    finance: { title: 'FINANCE & EXPENSE CONSOLE', subtitle: 'OPERATING LEDGER & CASHBOOK' },
    reports: { title: 'ENTERPRISE REPORTS CENTRE', subtitle: 'STATEMENTS, VALUATION & TAX AUDITS' },
    jobs: { title: 'JOB ORDER SERVICE REGISTRY', subtitle: 'HARDWARE REPAIR SLIPS & STATUSES' },
    settings: { title: 'SYSTEM CONFIGURATION CONSOLE', subtitle: 'USERS, BARCODES & THERMAL CUSTOMIZER' },
    profile: { title: 'USER PROFILE & SECURITY', subtitle: 'STAFF SESSION CREDENTIALS' },
    summary: { title: 'DAILY CASH & REVENUE SUMMARY', subtitle: 'COUNTER CLOSING & AUDIT' },
    technicians: { title: 'TECHNICIAN ROSTER & WORKLOAD', subtitle: 'STAFF PERFORMANCE & COMMISSIONS' },
    customers: { title: 'CUSTOMER DIRECTORY & REPAIR HISTORY', subtitle: 'CLIENT PROFILES & REPAIRS' },
  };

  const currentInfo = viewTitles[currentView] || {
    title: shopName.toUpperCase(),
    subtitle: 'REPAIR & RETAIL MANAGEMENT',
  };

  const handleSelectEntry = (entry: SearchResultEntry) => {
    if (entry.type === 'job') {
      if (onRecallJobToPOS) onRecallJobToPOS(entry.data);
    } else if (entry.type === 'item') {
      if (onAddInventoryItemToPOS) {
        onAddInventoryItemToPOS(entry.data);
      }
    } else if (entry.type === 'supplier') {
      if (onSelectSupplier) {
        onSelectSupplier(entry.data);
      }
    } else if (entry.type === 'customer') {
      if (onRecallCustomerToPOS) {
        onRecallCustomerToPOS(entry.data);
      }
    }

    if (onSearchChange) onSearchChange('');
    setIsSearchFocused(false);
  };

  return (
    <header className="header h-20 px-4 sm:px-6 bg-gradient-to-r from-[#070e28] via-[#0a1742] to-[#0d1e56] border-b border-[rgba(96,165,250,0.2)] flex items-center justify-between shrink-0 z-30 select-none text-[#f8fafc] no-print shadow-md">
      {/* Left: Single Clean Logo on Far Left & Single-Line Prominent Branding */}
      <div className="flex items-center gap-3.5 sm:gap-4 shrink-0">
        {/* Only one single, clean logo on the far left */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#09153a] border-2 border-blue-400/40 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-blue-950/60 overflow-hidden">
          <img
            src={activeLogoUrl}
            alt={activeShopName}
            className="w-full h-full object-contain rounded-xl hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Outlet Details: Prominent single line + Branch directly underneath */}
        <div className="flex flex-col justify-center">
          {/* Display "RAASITH MOBILE" in a single prominent line next to the logo */}
          <h1 className="font-oswald text-xl sm:text-2xl lg:text-3xl uppercase tracking-wider text-white font-black leading-tight drop-shadow-sm whitespace-nowrap">
            {activeShopName || 'RAASITH MOBILE'}
          </h1>
          {/* Move the branch details ("MAIN OUTLET AKKARAIPATTU") directly underneath the "RAASITH MOBILE" title */}
          <p className="font-mono-jb text-xs sm:text-sm font-extrabold text-cyan-300 uppercase tracking-wider leading-tight mt-0.5 whitespace-nowrap">
            {activeBranch || 'MAIN OUTLET AKKARAIPATTU'}
          </p>
        </div>
      </div>

      {/* Center: Search Bar & Dynamic Autocomplete Dropdown */}
      <div className="hidden lg:flex items-center gap-3 relative">
        {onSearchChange && (
          <div className="relative">
            <div className="search-bar bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 flex items-center w-72 xl:w-96 focus-within:border-blue-600 shadow-sm">
              <Search className={`w-4 h-4 text-slate-500 shrink-0 ${isSearching ? 'animate-pulse text-blue-600' : ''}`} />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (flattenedResults.length > 0) {
                      setHighlightedIndex((prev) => (prev + 1) % flattenedResults.length);
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (flattenedResults.length > 0) {
                      setHighlightedIndex((prev) => (prev - 1 + flattenedResults.length) % flattenedResults.length);
                    }
                  } else if (e.key === 'Enter') {
                    if (flattenedResults.length > 0) {
                      e.preventDefault();
                      const selected = flattenedResults[highlightedIndex] || flattenedResults[0];
                      handleSelectEntry(selected);
                    }
                  } else if (e.key === 'Escape') {
                    setIsSearchFocused(false);
                  }
                }}
                placeholder="Search Job ID, Barcode, Phone, Supplier..."
                className="bg-white border-none text-black font-bold w-full ml-3 outline-none text-xs placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="text-slate-400 hover:text-black p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* FLOATING REAL-TIME CATEGORIZED AUTOCOMPLETE DROPDOWN */}
            {isSearchFocused && searchQuery.trim() && flattenedResults.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-[480px] bg-[#081335] border border-cyan-400/60 rounded-2xl shadow-2xl shadow-blue-950/90 z-50 overflow-hidden divide-y divide-blue-500/20 backdrop-blur-md animate-fadeIn">
                {/* Header Hint Bar */}
                <div className="p-2.5 bg-[#0b1b4b] border-b border-cyan-500/20 flex items-center justify-between text-[10px] font-mono-jb font-bold text-cyan-300 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    <span>{flattenedResults.length} Matches Found</span>
                  </div>
                  <span className="text-blue-300/70">[↑/↓] Navigate • [Enter] Select • [Esc] Close</span>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-blue-500/15">
                  {/* CATEGORY 1: Job Orders */}
                  {searchResults.jobs && searchResults.jobs.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 bg-[#09153d] text-[10px] font-mono-jb font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench className="w-3 h-3 text-blue-400" />
                        <span>Job Orders ({searchResults.jobs.length})</span>
                      </div>
                      {searchResults.jobs.map((job) => {
                        const flatIdx = flattenedResults.findIndex((r) => r.type === 'job' && r.data.id === job.id);
                        const isHighlighted = flatIdx === highlightedIndex;
                        const balance = job.dueAmount !== undefined ? job.dueAmount : Math.max(0, (job.estimatedPrice + (job.sparePartsAmount || job.totalPartsCost || 0)) - job.advancePaid);

                        return (
                          <div
                            key={`job-${job.id}`}
                            onClick={() => handleSelectEntry({ type: 'job', categoryLabel: 'Job Orders', id: job.id, data: job })}
                            onMouseEnter={() => setHighlightedIndex(flatIdx)}
                            className={`p-2.5 transition-all cursor-pointer group flex flex-col gap-1 ${
                              isHighlighted ? 'bg-blue-600/35 ring-1 ring-inset ring-cyan-400' : 'hover:bg-blue-600/15'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono-jb font-black text-xs text-white bg-blue-600/40 px-2 py-0.5 rounded border border-blue-400/40">
                                  {job.jobNumber}
                                </span>
                                <span className="text-[10px] font-mono-jb font-bold text-emerald-300">
                                  {job.status}
                                </span>
                              </div>
                              <span className="text-xs font-mono-jb font-black text-rose-400">
                                Due: LKR {balance.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono-jb text-blue-100">
                              <span className="font-bold">{job.customerName}</span>
                              <span className="text-blue-300/80 text-[11px]">{job.phoneNumber}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono-jb text-blue-200/70">
                              <span className="truncate max-w-[220px]">{job.deviceBrand} {job.deviceModel}</span>
                              <span className="text-cyan-300 font-bold text-[10px] flex items-center gap-1 group-hover:underline">
                                <span>Recall into POS Bill</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CATEGORY 2: Inventory Items */}
                  {searchResults.items && searchResults.items.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 bg-[#09153d] text-[10px] font-mono-jb font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Barcode className="w-3 h-3 text-emerald-400" />
                        <span>Inventory Items ({searchResults.items.length})</span>
                      </div>
                      {searchResults.items.map((item) => {
                        const flatIdx = flattenedResults.findIndex((r) => r.type === 'item' && r.data.id === item.id);
                        const isHighlighted = flatIdx === highlightedIndex;

                        return (
                          <div
                            key={`item-${item.id}`}
                            onClick={() => handleSelectEntry({ type: 'item', categoryLabel: 'Inventory Items', id: item.id, data: item })}
                            onMouseEnter={() => setHighlightedIndex(flatIdx)}
                            className={`p-2.5 transition-all cursor-pointer group flex flex-col gap-1 ${
                              isHighlighted ? 'bg-blue-600/35 ring-1 ring-inset ring-cyan-400' : 'hover:bg-blue-600/15'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono-jb font-bold text-xs text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                  {item.barcode || item.itemCode}
                                </span>
                                <span className="text-[10px] font-mono-jb text-blue-300/70">
                                  {item.category}
                                </span>
                              </div>
                              <span className="text-xs font-mono-jb font-black text-amber-300">
                                LKR {(item.unitPrice || item.retailPrice || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono-jb text-white">
                              <span className="font-bold truncate max-w-[280px]">{item.name}</span>
                              <span className="text-[10px] text-blue-200/70">
                                Stock: <strong className="text-emerald-400">{item.stockQty ?? item.stock ?? 0}</strong>
                              </span>
                            </div>
                            <div className="flex items-center justify-end pt-0.5">
                              <span className="text-emerald-300 font-bold text-[10px] flex items-center gap-1 group-hover:underline">
                                <span>Add to POS Bill & Focus Qty</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CATEGORY 3: Suppliers */}
                  {searchResults.suppliers && searchResults.suppliers.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 bg-[#09153d] text-[10px] font-mono-jb font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-purple-400" />
                        <span>Suppliers ({searchResults.suppliers.length})</span>
                      </div>
                      {searchResults.suppliers.map((supplier) => {
                        const flatIdx = flattenedResults.findIndex((r) => r.type === 'supplier' && r.data.code === supplier.code);
                        const isHighlighted = flatIdx === highlightedIndex;

                        return (
                          <div
                            key={`supplier-${supplier.code}`}
                            onClick={() => handleSelectEntry({ type: 'supplier', categoryLabel: 'Suppliers', id: supplier.code, data: supplier })}
                            onMouseEnter={() => setHighlightedIndex(flatIdx)}
                            className={`p-2.5 transition-all cursor-pointer group flex flex-col gap-1 ${
                              isHighlighted ? 'bg-blue-600/35 ring-1 ring-inset ring-cyan-400' : 'hover:bg-blue-600/15'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono-jb font-bold text-xs text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                                {supplier.code}
                              </span>
                              <span className="text-xs font-mono-jb font-black text-rose-300">
                                Pay Due: LKR {(supplier.balancePay || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono-jb text-white">
                              <span className="font-bold">{supplier.name}</span>
                              <span className="text-blue-300/80 text-[11px]">{supplier.contactNumber}</span>
                            </div>
                            <div className="flex items-center justify-end pt-0.5">
                              <span className="text-purple-300 font-bold text-[10px] flex items-center gap-1 group-hover:underline">
                                <span>Open Supplier Ledger</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CATEGORY 4: Customers */}
                  {searchResults.customers && searchResults.customers.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 bg-[#09153d] text-[10px] font-mono-jb font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3 h-3 text-cyan-400" />
                        <span>Customers ({searchResults.customers.length})</span>
                      </div>
                      {searchResults.customers.map((cust) => {
                        const flatIdx = flattenedResults.findIndex((r) => r.type === 'customer' && r.data.phoneNumber === cust.phoneNumber);
                        const isHighlighted = flatIdx === highlightedIndex;

                        return (
                          <div
                            key={`customer-${cust.phoneNumber}`}
                            onClick={() => handleSelectEntry({ type: 'customer', categoryLabel: 'Customers', id: cust.phoneNumber, data: cust })}
                            onMouseEnter={() => setHighlightedIndex(flatIdx)}
                            className={`p-2.5 transition-all cursor-pointer group flex flex-col gap-1 ${
                              isHighlighted ? 'bg-blue-600/35 ring-1 ring-inset ring-cyan-400' : 'hover:bg-blue-600/15'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono-jb font-bold text-xs text-white">
                                {cust.customerName}
                              </span>
                              <span className="font-mono-jb font-bold text-xs text-cyan-300">
                                {cust.phoneNumber}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono-jb text-blue-200/70">
                              <span>Advance: <strong className="text-amber-300">LKR {(cust.advanceBalance || 0).toLocaleString()}</strong></span>
                              <span>Credit Due: <strong className="text-rose-400">LKR {(cust.creditDue || 0).toLocaleString()}</strong></span>
                            </div>
                            <div className="flex items-center justify-end pt-0.5">
                              <span className="text-cyan-300 font-bold text-[10px] flex items-center gap-1 group-hover:underline">
                                <span>Load Customer into POS Bill</span>
                                <ArrowRight className="w-3 h-3" />
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
          </div>
        )}
      </div>

      {/* Right Actions: Header Actions, Single Username Badge, Time Display & Extreme Right Power Button */}
      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        {/* Real-time Notification Center Bell & Dropdown */}
        <NotificationCenter
          staffUser={staffUser}
          token={token}
          jobs={jobs}
          onRecallJobToPOS={(jobId) => {
            const targetJob = jobs.find((j) => j.id === jobId);
            if (targetJob && onRecallJobToPOS) {
              onRecallJobToPOS(targetJob);
            } else if (onOpenPOS) {
              onOpenPOS();
            }
          }}
          onOpenJobSheet={(jobId) => {
            if (onOpenJobSheet) {
              onOpenJobSheet(jobId);
            }
          }}
        />

        {/* + New Repair Job Button (Cashier / Admin intake only; Technician has bench badge) */}
        {!isTechnician ? (
          <button
            onClick={onOpenNewJob}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white px-3 sm:px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer font-bold shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">+ New Job</span>
            <span className="sm:hidden">+ Job</span>
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-purple-950/50 border border-purple-500/40 rounded-xl text-purple-300 font-mono-jb text-xs font-bold shadow-inner shrink-0">
            <Wrench className="w-3.5 h-3.5 text-purple-400" />
            <span>Technician Portal</span>
          </div>
        )}

        {/* Single Username Reference near time/status area with 1-Click Role Switcher */}
        <div className="relative hidden xl:block shrink-0">
          <button
            type="button"
            onClick={() => setShowRoleMenu((prev) => !prev)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#09153a] hover:bg-[#12225a] border border-blue-500/25 rounded-xl transition-all cursor-pointer text-left shadow-inner"
            title="Click to Switch Role (RBAC: Admin / Cashier / Technician)"
          >
            <div className="text-right">
              <div className="text-xs sm:text-sm font-extrabold text-white font-mono-jb leading-tight">
                {staffUser?.name || 'Mohamed Raasith'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-blue-300 font-mono-jb font-semibold flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{staffUser?.role || 'Admin'} Session</span>
                <ChevronDown className="w-3 h-3 text-cyan-300 ml-0.5" />
              </div>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-12 z-50 w-60 bg-[#0d1636] border border-blue-500/30 rounded-2xl shadow-2xl p-2 text-xs font-mono-jb space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold text-cyan-300 uppercase tracking-wider border-b border-blue-500/20 flex items-center justify-between">
                <span>Switch Active Role (RBAC)</span>
                <span className="text-[9px] text-blue-300/60 font-normal">Test live</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('Cashier');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  staffUser?.role?.toLowerCase() === 'cashier'
                    ? 'bg-blue-600/30 border border-blue-500/40 text-white font-bold'
                    : 'text-blue-200 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>👤 Cashier / Front Desk</span>
                  </div>
                  <div className="text-[10px] text-blue-300/70 font-sans">Full POS, Billing & Job Intake</div>
                </div>
                {staffUser?.role?.toLowerCase() === 'cashier' && <Check className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('Technician');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  staffUser?.role?.toLowerCase() === 'technician'
                    ? 'bg-purple-600/30 border border-purple-500/40 text-white font-bold'
                    : 'text-purple-200 hover:bg-purple-600/20 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-purple-300">
                    <span>🔧 Technician / Bench</span>
                  </div>
                  <div className="text-[10px] text-purple-300/70 font-sans">Repair Module & Status Only</div>
                </div>
                {staffUser?.role?.toLowerCase() === 'technician' && <Check className="w-4 h-4 text-purple-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('Admin');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  staffUser?.role?.toLowerCase() === 'admin'
                    ? 'bg-amber-600/30 border border-amber-500/40 text-white font-bold'
                    : 'text-amber-200 hover:bg-amber-600/20 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <span>🛡️ Admin / Store Owner</span>
                  </div>
                  <div className="text-[10px] text-amber-300/70 font-sans">Full Shop Management Access</div>
                </div>
                {staffUser?.role?.toLowerCase() === 'admin' && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Time Display and Day Status Tag aligned appropriately near the Power Button */}
        <div className="flex items-center gap-2 shrink-0">
          <LiveClock />

          <span
            className={`hidden 2xl:flex px-2.5 py-1 rounded-xl text-[10px] font-mono-jb font-black uppercase tracking-wider border transition-colors items-center gap-1.5 shrink-0 ${
              isDayOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isDayOpen ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-rose-500'}`} />
            <span>{isDayOpen ? 'DAY ON' : 'DAY CLOSE'}</span>
          </span>
        </div>

        {/* Extreme Right Corner: Larger, Clearly Visible Glowing Day Status Power Button */}
        <button
          type="button"
          onClick={handleToggleDayShift}
          title={
            isDayOpen
              ? 'Business Day Active (Day On) — Click to initiate End of Day (EOD) Closing & Shift Audit'
              : 'Business Day Closed (Day Close) — Click to Start Day & Open Day Shift'
          }
          aria-label={isDayOpen ? 'Close business day shift' : 'Open business day shift'}
          className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 cursor-pointer active:scale-95 shadow-2xl select-none ml-1 ${
            isDayOpen
              ? 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-green-400 border-emerald-200 text-white shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:shadow-[0_0_42px_rgba(16,185,129,1)] hover:scale-105'
              : 'bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 border-rose-300 text-white shadow-[0_0_28px_rgba(244,63,94,0.85)] hover:shadow-[0_0_38px_rgba(244,63,94,1)] hover:scale-105'
          }`}
        >
          <Power className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3] transition-transform group-hover:scale-110 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />

          {/* Vibrant pulsing glow ring when Day On */}
          {isDayOpen && (
            <span className="absolute inset-0 rounded-full border-2 border-emerald-300 opacity-75 animate-ping pointer-events-none" />
          )}

          <span className="sr-only">{isDayOpen ? 'Day On' : 'Day Close'}</span>
        </button>
      </div>
    </header>
  );
};

