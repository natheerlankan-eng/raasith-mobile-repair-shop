import React, { useState, useEffect } from 'react';
import { X, Settings, Globe, Store, Check, Save } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryCode: string;
  shopName: string;
  onSaveSettings: (countryCode: string, shopName: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  countryCode,
  shopName,
  onSaveSettings,
}) => {
  const { shopProfile, updateShopProfile } = useShop();
  const [code, setCode] = useState(countryCode);
  const [name, setName] = useState(shopProfile?.shopName || shopName);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (shopProfile?.shopName) {
      setName(shopProfile.shopName);
    }
  }, [shopProfile?.shopName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await updateShopProfile({
        shopName: name.trim(),
        appTitle: `${name.trim()} · POS & Repair Shop`,
      });
      await onSaveSettings(code.trim(), name.trim());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-red-400" />
            <h3 className="font-extrabold text-lg">Shop & Message Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          {/* Country Code Setting */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Default WhatsApp Country Code
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="+94"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Set your country calling code (e.g. +94 for Sri Lanka, +91 for India, +1 for US/Canada, +971 for UAE).
              Numbers entered without a country code will automatically use this.
            </p>

            {/* Quick Country Code presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: 'Sri Lanka (+94)', val: '+94' },
                { label: 'India (+91)', val: '+91' },
                { label: 'UAE (+971)', val: '+971' },
                { label: 'UK (+44)', val: '+44' },
                { label: 'US/CA (+1)', val: '+1' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setCode(p.val)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                    code === p.val
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shop Name */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Shop Name
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Raasith Mobile"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Displayed on job slips, header, and in WhatsApp customer messages.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
