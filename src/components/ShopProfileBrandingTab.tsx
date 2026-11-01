import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sparkles,
  Save,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Receipt,
  MessageSquare,
  Wrench,
  ExternalLink,
  ShieldCheck,
  Globe,
  Tag
} from 'lucide-react';
import { useShop, ShopProfile, DEFAULT_SHOP_PROFILE } from '../context/ShopContext.tsx';
import { generateReceivedMessage, generateThankYouWhatsApp } from '../utils/whatsapp.ts';

interface ShopProfileBrandingTabProps {
  token?: string | null;
  onSavedNotice?: (msg: string) => void;
}

// Preset multi-brand templates for one-click testing & tenant demonstration
const BRAND_PRESETS: Array<{ name: string; profile: Partial<ShopProfile> }> = [
  {
    name: 'Raasith Mobile (Default)',
    profile: {
      appTitle: 'RAASITH MOBILE · POS & Repair Shop',
      shopName: 'RAASITH MOBILE',
      branch: 'MAIN OUTLET AKKARAIPATTU',
      outletName: 'Professional Mobile Phone Repairing Centre',
      phone: '0672277996, 0752834443',
      address: 'Main Street, Akkaraipattu.',
      currency: 'Rs',
      logoUrl: '/images/raasith_logo.png',
      bannerUrl: '/src/assets/images/raasith_desk_banner_1791308361536.jpg',
    },
  },
  {
    name: 'RM Tech Solutions',
    profile: {
      appTitle: 'RM TECH · Advanced Mobile Care & POS',
      shopName: 'RM TECH SOLUTIONS',
      branch: 'Colombo 03 Flagship Hub',
      outletName: 'Smart Devices Repair & Certified Diagnostics',
      phone: '+94 11 234 5678, +94 77 123 4567',
      address: 'No 45 Galle Road, Bambalapitiya, Colombo 03.',
      currency: 'LKR',
      logoUrl: '/images/raasith_logo.png',
      bannerUrl: '/src/assets/images/raasith_desk_banner_1791308361536.jpg',
    },
  },
  {
    name: 'Y2K Apple Store & Repair',
    profile: {
      appTitle: 'FixFlow POS Pro · Y2K Care',
      shopName: 'Y2K APPLE STORE & REPAIR',
      branch: 'Kandy City Center Arcade',
      outletName: 'Apple & Premium Smartphone Specialist',
      phone: '081 223 9988, 071 889 0011',
      address: 'Level 2, Kandy City Centre, Dalada Veediya, Kandy.',
      currency: 'Rs',
      logoUrl: '/images/raasith_logo.png',
      bannerUrl: '/src/assets/images/raasith_desk_banner_1791308361536.jpg',
    },
  },
  {
    name: 'Apex Mobile Lab',
    profile: {
      appTitle: 'Apex Lab Enterprise POS',
      shopName: 'APEX MOBILE LAB',
      branch: 'Galle Fort Tech Zone',
      outletName: 'Chip-Level Board Micro-Soldering & Display Lab',
      phone: '091 445 2211, 070 334 1100',
      address: '78 Commercial Road, Galle.',
      currency: 'Rs',
      logoUrl: '/images/raasith_logo.png',
      bannerUrl: '/src/assets/images/raasith_desk_banner_1791308361536.jpg',
    },
  },
];

export const ShopProfileBrandingTab: React.FC<ShopProfileBrandingTabProps> = ({
  token,
  onSavedNotice,
}) => {
  const { shopProfile, updateShopProfile, resetToDefaults } = useShop();

  const [formData, setFormData] = useState<ShopProfile>(shopProfile);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'receipt' | 'banner' | 'whatsapp' | 'slip'>('receipt');

  // Sync internal state when external shopProfile changes
  useEffect(() => {
    setFormData(shopProfile);
  }, [shopProfile]);

  const handleInputChange = (field: keyof ShopProfile, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB. Please select a smaller image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('File size exceeds 3MB. Please select a smaller image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, bannerUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyPreset = (preset: (typeof BRAND_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      ...preset.profile,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    try {
      await updateShopProfile(formData);
      const notice = `Shop branding for "${formData.shopName}" updated and synchronized globally!`;
      setSuccessMsg(notice);
      if (onSavedNotice) onSavedNotice(notice);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to save shop branding: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all shop branding back to default Raasith Mobile configuration?')) {
      setSaving(true);
      try {
        await resetToDefaults();
        setFormData(DEFAULT_SHOP_PROFILE);
        const notice = 'Shop branding reset to factory defaults.';
        setSuccessMsg(notice);
        if (onSavedNotice) onSavedNotice(notice);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: any) {
        alert('Failed to reset: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* SECTION BANNER / TOP CONTROL BAR */}
      <div className="bg-gradient-to-r from-[#0d1a42] via-[#09153a] to-[#07112d] border border-blue-500/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0 ring-2 ring-amber-400/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-oswald text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
                Shop Profile & Branding
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-jb uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                Multi-Tenant Engine
              </span>
            </div>
            <p className="text-xs font-mono-jb text-blue-200/70 mt-0.5">
              Customize shop identity, title, branch, and logo across Dashboard, POS Receipts, Job Slips & WhatsApp
            </p>
          </div>
        </div>

        {/* Global Save & Reset Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-mono-jb text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Reset to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Branding</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-4 py-3 flex items-center gap-2.5 text-emerald-300 text-xs font-mono-jb animate-fadeIn shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* QUICK PRESET SELECTORS */}
      <div className="bg-[#0a1538] border border-blue-500/20 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-oswald uppercase tracking-wider font-bold text-blue-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick-Load Sample Brand Presets (Click to Test Multi-Tenancy)</span>
          </span>
          <span className="text-[10px] font-mono-jb text-blue-300/50 hidden sm:inline">
            Applies preview values instantly without overwriting until saved
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {BRAND_PRESETS.map((preset) => {
            const isMatch = formData.shopName === preset.profile.shopName;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer font-mono-jb ${
                  isMatch
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-[#060d24] border-blue-500/20 text-slate-300 hover:border-blue-400/50 hover:bg-[#081232]'
                }`}
              >
                <div className="text-xs font-bold truncate text-white">{preset.name}</div>
                <div className="text-[10px] text-blue-300/60 truncate mt-0.5">
                  {preset.profile.branch}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TWO COLUMN GRID: FORM INPUTS + LIVE MULTI-TENANT PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
        {/* LEFT COLUMN: BRANDING FORM */}
        <div className="space-y-5">
          {/* Card 1: Core Shop Identity */}
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-500/20 pb-3">
              <Tag className="w-4 h-4 text-cyan-400" />
              <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                1. Core Shop & Application Identity
              </h3>
            </div>

            <div className="space-y-4 font-mono-jb text-xs">
              {/* Application / Software Title */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Application / Software Title (Appears in Browser Tab & Header)
                </label>
                <input
                  type="text"
                  value={formData.appTitle}
                  onChange={(e) => handleInputChange('appTitle', e.target.value)}
                  placeholder="e.g. FixFlow POS Pro"
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
                <span className="text-[10px] text-blue-300/50 mt-1 block">
                  Dynamically syncs browser &lt;title&gt; and desktop window header
                </span>
              </div>

              {/* Shop / Business Name */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Shop / Business Name (Primary Brand Heading)
                </label>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => handleInputChange('shopName', e.target.value)}
                  placeholder="e.g. Raasith Mobile, RM Tech, or Y2K Apple Store"
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
              </div>

              {/* Branch / Location */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Branch / Outlet Location Tag
                </label>
                <input
                  type="text"
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  placeholder="e.g. Main Branch - Akkaraipattu"
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
              </div>

              {/* Subtitle / Outlet Description */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Business Description / Secondary Tagline
                </label>
                <input
                  type="text"
                  value={formData.outletName}
                  onChange={(e) => handleInputChange('outletName', e.target.value)}
                  placeholder="e.g. Professional Mobile Phone Repairing Centre"
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contact, Address & Currency */}
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-500/20 pb-3">
              <Phone className="w-4 h-4 text-emerald-400" />
              <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                2. Contact Details & Physical Location
              </h3>
            </div>

            <div className="space-y-4 font-mono-jb text-xs">
              {/* Phone Numbers */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Phone Numbers & Helpline (Comma Separated)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="e.g. 0672277996, 0752834443"
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
              </div>

              {/* Physical Address */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Physical Store Address (Printed on Invoices & Job Slips)
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. Main Street, Akkaraipattu."
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors resize-none"
                />
              </div>

              {/* Currency Symbol */}
              <div className="w-1/2">
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Currency Symbol / Prefix
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  placeholder="e.g. Rs, LKR, $, ₹"
                  className="w-full bg-[#060d24] border border-blue-500/30 rounded-xl px-3.5 py-2 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Brand Logo & Media Assets */}
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-500/20 pb-3">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <h3 className="font-oswald text-base uppercase tracking-wider font-bold text-white">
                3. Store Emblem & Media Assets
              </h3>
            </div>

            <div className="space-y-4 font-mono-jb text-xs">
              {/* Store Logo */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1.5">
                  Store Circular Logo (Upload File or Enter Direct URL)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#060d24] border border-blue-500/30 rounded-xl p-3">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-400/40 flex items-center justify-center overflow-hidden bg-black/60 shrink-0 shadow-inner">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
                        }}
                      />
                    ) : (
                      <span className="text-[9px] text-center font-bold text-amber-300/80 px-1">
                        No Logo
                      </span>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => handleInputChange('logoUrl', '')}
                          className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-200 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Clear Logo</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                      placeholder="Or paste image URL (e.g. /images/shop_logo.png)"
                      className="w-full bg-[#040817] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Store Banner */}
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1.5">
                  Dashboard Hero Banner & Signboard Image
                </label>
                <div className="bg-[#060d24] border border-blue-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Banner Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>

                    {formData.bannerUrl && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('bannerUrl', '')}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-200 px-2 py-1 rounded bg-rose-500/10 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear Banner</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={formData.bannerUrl || ''}
                    onChange={(e) => handleInputChange('bannerUrl', e.target.value)}
                    placeholder="Or paste banner image URL"
                    className="w-full bg-[#040817] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE MULTI-TENANT PREVIEW */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="bg-[#0a1538] border border-blue-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-oswald text-sm uppercase tracking-wider font-bold text-white">
                  Real-Time Branding Preview
                </h4>
              </div>
              <div className="flex items-center gap-1 bg-[#050b1c] p-1 rounded-lg border border-blue-500/20">
                <button
                  type="button"
                  onClick={() => setPreviewTab('receipt')}
                  className={`px-2 py-1 rounded text-[10px] font-mono-jb uppercase font-bold cursor-pointer transition-colors ${
                    previewTab === 'receipt' ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-white'
                  }`}
                >
                  Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('banner')}
                  className={`px-2 py-1 rounded text-[10px] font-mono-jb uppercase font-bold cursor-pointer transition-colors ${
                    previewTab === 'banner' ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-white'
                  }`}
                >
                  Banner
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('whatsapp')}
                  className={`px-2 py-1 rounded text-[10px] font-mono-jb uppercase font-bold cursor-pointer transition-colors ${
                    previewTab === 'whatsapp' ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-white'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('slip')}
                  className={`px-2 py-1 rounded text-[10px] font-mono-jb uppercase font-bold cursor-pointer transition-colors ${
                    previewTab === 'slip' ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-white'
                  }`}
                >
                  Job Slip
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            {previewTab === 'receipt' && (
              <div className="bg-white text-black p-4 rounded-xl shadow-inner font-mono text-[11px] leading-snug border border-slate-300">
                <div className="text-center space-y-1 border-b border-dashed border-black pb-3">
                  {formData.logoUrl && (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-10 h-10 rounded-full mx-auto object-cover border border-slate-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="font-extrabold text-sm uppercase tracking-wide">
                    {formData.shopName || 'SHOP NAME'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-700">
                    {formData.outletName || 'REPAIR & POS CENTRE'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-900">
                    {formData.branch || 'MAIN BRANCH'}
                  </div>
                  <div className="text-[9px] text-slate-600">{formData.address || 'Address'}</div>
                  <div className="text-[9px] text-slate-800 font-bold">
                    TEL: {formData.phone || '0000000000'}
                  </div>
                </div>

                <div className="py-2.5 border-b border-dashed border-black text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>INV: INV-2026-0042</span>
                    <span>19-10-2026 11:15</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier: Admin</span>
                    <span>Customer: WALK-IN</span>
                  </div>
                </div>

                <div className="py-2 border-b border-black text-[10px] space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>iPhone 13 OLED Display</span>
                    <span>{formData.currency || 'Rs'} 14,500.00</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>9D Tempered Glass Pro</span>
                    <span>{formData.currency || 'Rs'} 450.00</span>
                  </div>
                </div>

                <div className="pt-2 text-right text-xs font-black">
                  NET TOTAL: {formData.currency || 'Rs'} 14,950.00
                </div>

                <div className="text-center text-[9px] text-slate-500 pt-3 border-t border-dashed border-slate-300 mt-2">
                  Thank you for shopping at {formData.shopName || 'our shop'}!
                </div>
              </div>
            )}

            {previewTab === 'banner' && (
              <div className="rounded-xl overflow-hidden border border-red-950/40 relative min-h-[140px] text-white p-3.5 flex flex-col justify-end">
                <img
                  src={formData.bannerUrl || '/src/assets/images/raasith_desk_banner_1791308361536.jpg'}
                  alt="Banner"
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] contrast-[1.15]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-red-950/80 to-slate-950/90" />
                <div className="relative z-10 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-950 p-0.5 border-2 border-red-500 shrink-0 overflow-hidden">
                    <img
                      src={formData.logoUrl || '/images/raasith_logo.png'}
                      alt="Logo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                      <span>{formData.shopName}</span>
                      <span className="text-[10px] text-slate-300 font-semibold px-1.5 py-0.5 rounded bg-white/10">
                        {formData.branch}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-300/80 line-clamp-1">
                      {formData.address} • Tel: {formData.phone}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'whatsapp' && (
              <div className="bg-[#0b141a] text-slate-100 p-3.5 rounded-xl border border-emerald-900/40 font-sans text-xs space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/30 text-emerald-400 font-bold text-[11px]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Customer WhatsApp Alert Preview</span>
                </div>
                <div className="bg-[#1f2c34] p-3 rounded-lg text-[11px] leading-relaxed space-y-1.5 border-l-4 border-emerald-500">
                  <p className="font-bold text-emerald-300">
                    📱 *REPAIR JOB INTAKE* - {(formData.shopName || 'RAASITH MOBILE').toUpperCase()}
                  </p>
                  <p>Dear Customer, your device iPhone 13 is received for repair.</p>
                  <p>• *Job Slip:* #JOB-8841</p>
                  <p>• *Fault:* Display Replacement</p>
                  <p>• *Est:* {formData.currency || 'Rs'} 14,500</p>
                  <p className="text-slate-300 pt-1">
                    Thank you for choosing *{formData.shopName}*!
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    📍 {formData.branch || formData.address}
                  </p>
                </div>
              </div>
            )}

            {previewTab === 'slip' && (
              <div className="bg-white text-black p-3.5 rounded-xl border border-slate-300 font-mono text-[10px] space-y-2">
                <div className="text-center border-b-2 border-black pb-2">
                  <div className="font-bold text-xs uppercase">{formData.shopName}</div>
                  <div className="text-[9px]">{formData.branch}</div>
                  <div className="text-[9px]">TEL: {formData.phone}</div>
                  <div className="text-[11px] font-bold mt-1">JOB SLIP: #JOB-8841</div>
                </div>
                <div className="space-y-1 text-[9px]">
                  <div>Date: 19-10-2026 | Customer: Mohamed Rizwan</div>
                  <div>Device: Samsung Galaxy A52 | Tech: Master Lab</div>
                </div>
                <div className="border-t border-dashed border-black pt-1 flex justify-between font-bold">
                  <span>Balance Due:</span>
                  <span>{formData.currency || 'Rs'} 4,500.00</span>
                </div>
                <div className="text-center text-[8px] text-slate-600 pt-1 border-t border-slate-200">
                  Bring this slip to collect your mobile.
                </div>
              </div>
            )}

            {/* SYNC INDICATOR BADGES */}
            <div className="mt-4 pt-3 border-t border-blue-500/20 grid grid-cols-2 gap-2 text-[10px] font-mono-jb">
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Firestore Synced</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Multi-Tenant Zero Reload</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
