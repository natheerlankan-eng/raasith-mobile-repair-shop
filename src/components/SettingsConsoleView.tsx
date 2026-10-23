import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  ShieldCheck,
  Save,
  Barcode,
  Receipt,
  Plus,
  Trash2,
  Check,
  Building,
  Phone,
  MapPin,
  DollarSign,
  Printer,
  Upload,
  CheckCircle2,
  Lock,
  FileText,
  Image,
  RefreshCw,
  X,
  Palette,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  Building2
} from 'lucide-react';
import { AdminUserRecord, PosSystemConfig, INITIAL_ADMIN_USERS, INITIAL_POS_SYSTEM_CONFIG } from '../data/posData.ts';
import { ThermalReceipt80mm } from './ThermalReceipt80mm.tsx';
import { ThemeSettings } from './ThemeSettings.tsx';
import { DatabaseBackupTab } from './DatabaseBackupTab.tsx';
import { ShopProfileBrandingTab } from './ShopProfileBrandingTab.tsx';
import { useShop } from '../context/ShopContext.tsx';

interface SettingsConsoleViewProps {
  initialConfig?: PosSystemConfig;
  onSaveConfig?: (newConfig: PosSystemConfig) => void;
  token?: string | null;
}

export const SettingsConsoleView: React.FC<SettingsConsoleViewProps> = ({
  initialConfig = INITIAL_POS_SYSTEM_CONFIG,
  onSaveConfig,
  token,
}) => {
  const { shopProfile, updateShopProfile } = useShop();
  const [config, setConfig] = useState<PosSystemConfig>(() => ({
    ...initialConfig,
    shopName: shopProfile?.shopName || initialConfig.shopName,
    outletName: shopProfile?.branch || shopProfile?.outletName || initialConfig.outletName,
    address: shopProfile?.address || initialConfig.address,
    phone: shopProfile?.phone || initialConfig.phone,
    logoUrl: shopProfile?.logoUrl || initialConfig.logoUrl,
    currency: shopProfile?.currency || initialConfig.currency,
  }));

  useEffect(() => {
    if (shopProfile) {
      setConfig((prev) => ({
        ...prev,
        shopName: shopProfile.shopName || prev.shopName,
        outletName: shopProfile.branch || shopProfile.outletName || prev.outletName,
        address: shopProfile.address || prev.address,
        phone: shopProfile.phone || prev.phone,
        logoUrl: shopProfile.logoUrl !== undefined ? shopProfile.logoUrl : prev.logoUrl,
        currency: shopProfile.currency || prev.currency,
      }));
    }
  }, [shopProfile]);

  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
  const [activeTab, setActiveTab] = useState<'branding' | 'receipt' | 'users' | 'barcode' | 'themes' | 'backup'>('branding');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Staff user management state
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userPassword, setUserPassword] = useState('raasith2026');
  const [showPassword, setShowPassword] = useState(false);

  // Reset password modal state
  const [resetUser, setResetUser] = useState<AdminUserRecord | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // New user modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<AdminUserRecord>>({
    name: '',
    type: 'Cashier',
    username: '',
    location: 'Front Counter Desk',
    series: 'RM-C02',
    accessRate: false,
    accessOffPercent: true,
    accessOffRs: false,
    accessBillDiscount: true,
  });

  const getAuthToken = () => {
    return token || localStorage.getItem('raasith_staff_token') || '';
  };

  const fetchStaffUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/staff-users', {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: AdminUserRecord[] = data.map((u: any) => ({
            id: String(u.id),
            name: u.name,
            type: u.role || 'Cashier',
            username: u.username || u.email?.split('@')[0],
            email: u.email,
            location: u.location || 'Main Counter',
            series: u.series || 'RM-C01',
            accessRate: !!u.permissions?.accessRate || !!u.permissions?.process_payments,
            accessOffPercent: u.permissions?.accessOffPercent ?? true,
            accessOffRs: !!u.permissions?.accessOffRs || !!u.permissions?.edit_jobs,
            accessBillDiscount: u.permissions?.accessBillDiscount ?? true,
            permissions: u.permissions,
          }));
          setUsers(mapped);
        }
      }
    } catch (err) {
      console.warn('Failed to load staff users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchStaffUsers();
    }
  }, [activeTab]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setConfig((prev) => ({ ...prev, logoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setConfig((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleToggleUserPermission = async (
    userId: string,
    field: 'accessRate' | 'accessOffPercent' | 'accessOffRs' | 'accessBillDiscount'
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextVal = !target[field];

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, [field]: nextVal } : u))
    );

    const numId = Number(userId);
    if (!isNaN(numId) && numId > 0) {
      try {
        const updatedPerms = {
          ...(typeof target.permissions === 'object' ? target.permissions : {}),
          [field]: nextVal,
        };
        await fetch(`/api/staff-users/${numId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ permissions: updatedPerms }),
        });
      } catch (e) {
        console.warn('Failed to persist permission toggle:', e);
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name?.trim() || !userForm.username?.trim()) {
      setUserError('Staff Name and Username are mandatory.');
      return;
    }

    setSavingUser(true);
    setUserError(null);

    const cleanUsername = userForm.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanName = userForm.name.trim();
    const cleanPassword = userPassword.trim() || 'raasith2026';
    const cleanRole = userForm.type || 'Cashier';

    try {
      const res = await fetch('/api/staff-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          name: cleanName,
          username: cleanUsername,
          password: cleanPassword,
          email: `${cleanUsername}@raasithmobile.com`,
          role: cleanRole,
          location: userForm.location || 'Main Counter',
          series: userForm.series || 'RM-C01',
          permissions: {
            create_jobs: true,
            process_payments: true,
            send_messages: true,
            edit_jobs: cleanRole !== 'Cashier',
            view_reports: cleanRole === 'Admin' || cleanRole === 'Manager',
            accessRate: !!userForm.accessRate,
            accessOffPercent: !!userForm.accessOffPercent,
            accessOffRs: !!userForm.accessOffRs,
            accessBillDiscount: !!userForm.accessBillDiscount,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account');
      }

      setSaveSuccessNotice(`Staff user "${cleanUsername}" created successfully! Credentials saved to database.`);
      setShowAddUserModal(false);
      setUserPassword('raasith2026');
      setUserForm({
        name: '',
        type: 'Cashier',
        username: '',
        location: 'Front Counter Desk',
        series: 'RM-C02',
        accessRate: false,
        accessOffPercent: true,
        accessOffRs: false,
        accessBillDiscount: true,
      });
      fetchStaffUsers();
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err: any) {
      setUserError(err.message || 'Error saving user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff user account?')) return;
    const numId = Number(id);
    if (!isNaN(numId) && numId > 0) {
      try {
        const res = await fetch(`/api/staff-users/${numId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error || 'Failed to delete staff user');
          return;
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete staff user');
        return;
      }
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSaveSuccessNotice('Staff user account deleted successfully.');
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPasswordVal.trim()) return;

    setSavingPassword(true);
    try {
      const numId = Number(resetUser.id);
      const res = await fetch(`/api/staff-users/${numId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ password: newPasswordVal.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update password');
      }
      setSaveSuccessNotice(`Password updated successfully for ${resetUser.username}!`);
      setResetUser(null);
      setNewPasswordVal('');
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveGlobalConfig = async () => {
    // 1. Immediately update global ShopContext for dynamic zero-latency sync across the app
    await updateShopProfile({
      shopName: config.shopName,
      branch: config.outletName,
      outletName: config.outletName,
      address: config.address,
      phone: config.phone,
      logoUrl: config.logoUrl,
      currency: config.currency,
      appTitle: `${config.shopName} · POS & Repair Shop`,
    });

    if (onSaveConfig) {
      onSaveConfig(config);
    }
    try {
      localStorage.setItem('raasith_pos_config', JSON.stringify(config));
    } catch (e) {
      // ignore
    }
    setSaveSuccessNotice('Bill & Thermal Receipt Settings saved successfully!');
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 3500);
  };

  return (
    <div className="flex flex-col h-full bg-[#070e24] text-[#f8fafc] overflow-hidden select-none">
      {/* TOP HEADER */}
      <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] p-4 sm:px-6 shrink-0 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
              Application Settings & Configuration
            </h1>
            <p className="text-[11px] font-mono-jb text-blue-200/60 uppercase">
              Bill & Thermal Customizer &bull; Security & Permissions &bull; Hardware Integration
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleSaveGlobalConfig}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS BAR */}
      <div className="bg-[#08112c] border-b border-blue-500/20 px-4 sm:px-6 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'receipt'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-blue-300/70 hover:text-white hover:bg-blue-600/10'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Bill & Thermal Receipt Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-blue-300/70 hover:text-white hover:bg-blue-600/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('barcode')}
          className={`px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'barcode'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-blue-300/70 hover:text-white hover:bg-blue-600/10'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Price, Barcode & Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('themes')}
          className={`px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'themes'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
              : 'text-purple-300/70 hover:text-white hover:bg-purple-600/10'
          }`}
        >
          <Palette className="w-4 h-4 text-purple-400" />
          <span>Themes & Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-amber-300/70 hover:text-white hover:bg-amber-600/10'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>Shop Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-emerald-300/70 hover:text-white hover:bg-emerald-600/10'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Database & Backup</span>
        </button>
      </div>

      {saveSuccessNotice && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2.5 flex items-center gap-2 text-emerald-300 text-xs font-mono-jb shrink-0 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* MAIN TAB CONTENT */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {activeTab === 'receipt' ? (
          /* TAB 1: BILL & THERMAL RECEIPT SETTINGS (EDITABLE FORMS + LIVE 80MM PREVIEW) */
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 max-w-7xl mx-auto items-start">
            {/* LEFT: EDITABLE FORM CONFIGURATION CARDS */}
            <div className="space-y-5">
              {/* Card 1: Header Branding */}
              <div className="bg-[#0c183d] rounded-2xl border border-blue-500/25 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                      1. Header Branding
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono-jb text-blue-300/70">Top of 80mm Receipt</span>
                </div>

                <div className="space-y-3 font-mono-jb text-xs">
                  {/* Store Logo Upload */}
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1.5">
                      Store Circular Logo (Upload or Default Emblem)
                    </label>
                    <div className="flex items-center gap-3 bg-[#070e24] border border-blue-500/30 rounded-xl p-3">
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-400/40 flex items-center justify-center overflow-hidden bg-black/40 shrink-0">
                        {config.logoUrl ? (
                          <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-center font-bold text-blue-300/80 px-1">
                            Circular Emblem
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Store Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {config.logoUrl && (
                          <button
                            type="button"
                            onClick={handleClearLogo}
                            className="ml-2 inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                        <p className="text-[10px] text-blue-200/50">
                          Recommended: Square PNG/JPEG. Falls back to stylized circular "RAASITH MOBILE AKKARAIPATTU" seal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Store Name */}
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={config.shopName}
                      onChange={(e) => setConfig({ ...config, shopName: e.target.value })}
                      placeholder="RAASITH MOBILE"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400 font-bold text-sm tracking-wide"
                    />
                  </div>

                  {/* Subtitle Tagline */}
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Subtitle Tagline
                    </label>
                    <input
                      type="text"
                      value={config.outletName}
                      onChange={(e) => setConfig({ ...config, outletName: e.target.value })}
                      placeholder="Professional Mobile Phone Repairing Centre"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Store Physical Address
                    </label>
                    <input
                      type="text"
                      value={config.address}
                      onChange={(e) => setConfig({ ...config, address: e.target.value })}
                      placeholder="Main Street, Akkaraipattu."
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Contact Numbers */}
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Contact Telephone Numbers
                    </label>
                    <input
                      type="text"
                      value={config.phone}
                      onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                      placeholder="0672277996, 0752834443"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Order Metadata */}
              <div className="bg-[#0c183d] rounded-2xl border border-blue-500/25 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                      2. Order Metadata & Capsule Pill
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono-jb text-blue-300/70">Receipt Meta Section</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-jb text-xs">
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Default Cashier
                    </label>
                    <input
                      type="text"
                      value={config.defaultCashier}
                      onChange={(e) => setConfig({ ...config, defaultCashier: e.target.value })}
                      placeholder="Admin"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Default Customer
                    </label>
                    <input
                      type="text"
                      value={config.defaultCustomer}
                      onChange={(e) => setConfig({ ...config, defaultCustomer: e.target.value })}
                      placeholder="CHEEP AND BEST"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-amber-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Invoice Prefix / Format
                    </label>
                    <input
                      type="text"
                      value={config.invoicePrefix}
                      onChange={(e) => setConfig({ ...config, invoicePrefix: e.target.value })}
                      placeholder="INV000010"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-cyan-300"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Return Policy & Terms Text */}
              <div className="bg-[#0c183d] rounded-2xl border border-blue-500/25 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                      3. Return Policy & Terms Text
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono-jb text-blue-300/70">Footer Disclaimer</span>
                </div>

                <div className="space-y-3 font-mono-jb text-xs">
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Custom Return / Warranty Policy Notice
                    </label>
                    <textarea
                      rows={3}
                      value={config.returnPolicy}
                      onChange={(e) => setConfig({ ...config, returnPolicy: e.target.value })}
                      placeholder="We do not accept Return / Defective items after 7 days. Please submit original INVOICE for Return or Defective Claim."
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-amber-400 resize-none leading-relaxed text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Footer Message & Software Branding */}
              <div className="bg-[#0c183d] rounded-2xl border border-blue-500/25 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-400" />
                    <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                      4. Footer Message & Software Credits
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono-jb text-blue-300/70">Final Bottom Lines</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono-jb text-xs">
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Footer Message
                    </label>
                    <input
                      type="text"
                      value={config.footerMessage}
                      onChange={(e) => setConfig({ ...config, footerMessage: e.target.value })}
                      placeholder="** Thank You for Shopping With Us! **"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-purple-400 font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Software Credit / Branding
                    </label>
                    <input
                      type="text"
                      value={config.softwareCredit}
                      onChange={(e) => setConfig({ ...config, softwareCredit: e.target.value })}
                      placeholder="Software: Syntaks Shopman | www.syntaks.lk"
                      className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-purple-400 text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE INTERACTIVE 80MM THERMAL INVOICE PREVIEW */}
            <div className="sticky top-4 space-y-4">
              <div className="bg-[#091334] rounded-2xl border-2 border-blue-500/30 p-4 shadow-2xl flex flex-col items-center">
                <div className="w-full flex items-center justify-between border-b border-blue-500/20 pb-2.5 mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-oswald text-sm font-bold uppercase tracking-wider text-white">
                      80mm Thermal Receipt Layout (Live Preview)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-jb px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-bold">
                    80mm &times; Auto
                  </span>
                </div>

                {/* The Exact Thermal Receipt Component matching sample */}
                <ThermalReceipt80mm
                  config={config}
                  sampleMode={true}
                  showPrintButton={true}
                  onPrint={() => window.print()}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          /* TAB 2: USERS & PERMISSION MATRIX */
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-[#0c183d] rounded-2xl border border-blue-500/20 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                    Users & Permission Matrix
                  </h3>
                  <span className="text-[10px] font-mono-jb px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-bold">
                    {users.length} Active Staff
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchStaffUsers}
                    disabled={loadingUsers}
                    className="px-2.5 py-1.5 bg-[#070e24] hover:bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-mono-jb font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Reload users from database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserError(null);
                      setUserPassword('raasith2026');
                      setShowAddUserModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono-jb font-bold flex items-center gap-1 shadow-md cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>

              {/* User Table with granular toggles */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-jb border-collapse">
                  <thead className="bg-[#091436] text-blue-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Name & Login ID</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Series</th>
                      <th className="py-2.5 px-3 text-center" title="Access Rate Change">Rate</th>
                      <th className="py-2.5 px-3 text-center" title="Off Percentage">Off %</th>
                      <th className="py-2.5 px-3 text-center" title="Off Rupees">Off Rs</th>
                      <th className="py-2.5 px-3 text-center" title="Bill Discount Privilege">Bill Disc</th>
                      <th className="py-2.5 px-3 text-center">Password</th>
                      <th className="py-2.5 px-3 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/10 text-white">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-blue-600/10 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                          </div>
                          <div className="text-[10px] text-cyan-400 font-mono">
                            Username: <strong>{u.username}</strong>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.type === 'Admin'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : u.type === 'Cashier'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {u.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-blue-300/80">{u.series}</td>

                        {/* Toggles */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={u.accessRate}
                            onChange={() => handleToggleUserPermission(u.id, 'accessRate')}
                            className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={u.accessOffPercent}
                            onChange={() => handleToggleUserPermission(u.id, 'accessOffPercent')}
                            className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={u.accessOffRs}
                            onChange={() => handleToggleUserPermission(u.id, 'accessOffRs')}
                            className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={u.accessBillDiscount}
                            onChange={() => handleToggleUserPermission(u.id, 'accessBillDiscount')}
                            className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setResetUser(u);
                              setNewPasswordVal('');
                            }}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 rounded border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Reset staff login password"
                          >
                            <Key className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {u.username !== 'natheerlankan' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-rose-400 hover:text-white p-1 rounded hover:bg-rose-500/20 cursor-pointer transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'barcode' ? (
          /* TAB 3: PRICE, BARCODE & GRN PARAMETERS */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0c183d] rounded-2xl border border-blue-500/20 p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-500/20 pb-3">
                <Barcode className="w-4 h-4 text-cyan-400" />
                <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                  Price, Barcode & GRN Parameters
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-jb text-xs">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={config.currency}
                    onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Quantity Decimals / Digits
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={config.qtyDigits}
                    onChange={(e) => setConfig({ ...config, qtyDigits: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Barcode Digits Length
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="16"
                    value={config.barcodeDigits}
                    onChange={(e) => setConfig({ ...config, barcodeDigits: parseInt(e.target.value, 10) || 12 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Barcode Sticker Columns
                  </label>
                  <select
                    value={config.stickerColumns}
                    onChange={(e) => setConfig({ ...config, stickerColumns: parseInt(e.target.value, 10) || 2 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  >
                    <option value={1}>1 Column Roll</option>
                    <option value={2}>2 Column Sticker Roll</option>
                    <option value={3}>3 Column Thermal Sheet</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-center justify-between p-3 bg-[#08102a] border border-blue-500/20 rounded-xl">
                  <div>
                    <div className="text-white font-bold">GRN Auto-Update Selling Prices</div>
                    <div className="text-[10px] text-blue-300/50">
                      Automatically recalculate retail prices upon Goods Received Note entry.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.grnAutoUpdate}
                    onChange={(e) => setConfig({ ...config, grnAutoUpdate: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'themes' ? (
          /* TAB 4: THEMES & VISUAL CUSTOMIZATION */
          <div className="max-w-4xl mx-auto">
            <ThemeSettings token={token} />
          </div>
        ) : activeTab === 'branding' ? (
          /* TAB 5: SHOP PROFILE & BRANDING */
          <ShopProfileBrandingTab
            token={token}
            onSavedNotice={(msg) => {
              setSaveSuccessNotice(msg);
              setTimeout(() => setSaveSuccessNotice(null), 4000);
            }}
          />
        ) : activeTab === 'backup' ? (
          /* TAB 6: DATABASE & BACKUP SYSTEM */
          <DatabaseBackupTab token={token} />
        ) : null}
      </div>

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Add System User Account
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-blue-300/60 hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            {userError && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="p-5 space-y-3 font-mono-jb text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Full Staff Name *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="e.g. Aslam Cashier"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Login Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                    placeholder="aslam.c"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold"
                  />
                  <span className="text-[9px] text-blue-300/50 mt-0.5 block">Used to log in</span>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    User Role Type
                  </label>
                  <select
                    value={userForm.type}
                    onChange={(e) => setUserForm({ ...userForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Technician">Technician</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Enter secure password"
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[9px] text-blue-300/50 mt-0.5 block">Staff member will use this password to sign in</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Counter / Location
                  </label>
                  <input
                    type="text"
                    value={userForm.location}
                    onChange={(e) => setUserForm({ ...userForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Series Prefix
                  </label>
                  <input
                    type="text"
                    value={userForm.series}
                    onChange={(e) => setUserForm({ ...userForm, series: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Initial Permission Toggles */}
              <div className="bg-[#070e24] p-3 rounded-xl border border-blue-500/20 space-y-2">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block">
                  Initial Permissions Grant:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-blue-200">
                    <input
                      type="checkbox"
                      checked={userForm.accessRate}
                      onChange={(e) => setUserForm({ ...userForm, accessRate: e.target.checked })}
                      className="accent-blue-600 rounded"
                    />
                    <span>Rate Modification</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-blue-200">
                    <input
                      type="checkbox"
                      checked={userForm.accessOffPercent}
                      onChange={(e) => setUserForm({ ...userForm, accessOffPercent: e.target.checked })}
                      className="accent-blue-600 rounded"
                    />
                    <span>Off Percentage</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-blue-200">
                    <input
                      type="checkbox"
                      checked={userForm.accessOffRs}
                      onChange={(e) => setUserForm({ ...userForm, accessOffRs: e.target.checked })}
                      className="accent-blue-600 rounded"
                    />
                    <span>Off Rupees</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-blue-200">
                    <input
                      type="checkbox"
                      checked={userForm.accessBillDiscount}
                      onChange={(e) => setUserForm({ ...userForm, accessBillDiscount: e.target.checked })}
                      className="accent-blue-600 rounded"
                    />
                    <span>Bill Discounts</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-2 rounded-xl text-blue-300/80 hover:bg-blue-600/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  {savingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingUser ? 'Saving...' : 'Save User & Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border-2 border-amber-500/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-oswald text-base uppercase">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Reset Staff Password</span>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="text-blue-300/60 hover:text-white p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-5 space-y-4 font-mono-jb text-xs">
              <div className="bg-[#070e24] p-3 rounded-xl border border-blue-500/20 space-y-1">
                <div className="text-white font-bold">{resetUser.name}</div>
                <div className="text-[11px] text-cyan-300">Username: {resetUser.username}</div>
                <div className="text-[10px] text-blue-300/60">Role: {resetUser.type}</div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-[#070e24] border border-amber-500/40 rounded-xl text-white outline-none focus:border-amber-400 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3 py-2 rounded-xl text-blue-300/80 hover:bg-blue-600/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/30 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
