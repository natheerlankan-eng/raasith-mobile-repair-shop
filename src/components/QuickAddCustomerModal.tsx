import React, { useState } from 'react';
import {
  X,
  UserPlus,
  User,
  Phone,
  MapPin,
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  currency?: string;
  onCustomerAdded: (customer: {
    customerName: string;
    phoneNumber: string;
    address?: string | null;
    creditLimit?: number;
    advanceBalance?: number;
    creditDue?: number;
  }) => void;
}

export const QuickAddCustomerModal: React.FC<QuickAddCustomerModalProps> = ({
  isOpen,
  onClose,
  token,
  currency = 'LKR',
  onCustomerAdded,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'None' | 'Advance' | 'Credit'>('None');
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorNotice('Customer Name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorNotice('Customer Phone Number is required.');
      return;
    }

    setLoading(true);
    setErrorNotice(null);

    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          address: address.trim() || undefined,
          creditLimit,
          openingBalance,
          openingBalanceType: openingBalanceType === 'None' ? undefined : openingBalanceType,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      onCustomerAdded({
        customerName: data.customerName || customerName.trim(),
        phoneNumber: data.phoneNumber || phoneNumber.trim(),
        address: data.address || address.trim(),
        creditLimit: data.creditLimit || creditLimit,
        advanceBalance: data.advanceBalance || (openingBalanceType === 'Advance' ? openingBalance : 0),
        creditDue: data.creditDue || (openingBalanceType === 'Credit' ? openingBalance : 0),
      });

      onClose();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to register customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-mono-jb"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-[#081335] border-2 border-blue-500/50 rounded-3xl w-full max-w-lg shadow-2xl shadow-blue-950/90 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1844] to-[#0c1f54] border-b border-blue-500/30 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-cyan-300 shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                Quick Add New Customer
              </h3>
              <p className="text-[11px] text-blue-200/70">
                Saves to database & auto-selects for current bill
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-blue-200/70 block mb-1">
              Customer Full Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Mohamed Ashik"
                className="w-full pl-9 pr-3 py-2 bg-[#050c24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-blue-200/70 block mb-1">
              Phone Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0771234567"
                className="w-full pl-9 pr-3 py-2 bg-[#050c24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-blue-200/70 block mb-1">
              Address / Town (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Main Street, Akkaraipattu"
                className="w-full pl-9 pr-3 py-2 bg-[#050c24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] uppercase font-bold text-blue-200/70 block mb-1">
                Credit Line Limit ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#050c24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-blue-200/70 block mb-1">
                Opening Balance
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={openingBalance || ''}
                  onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2 py-2 bg-[#050c24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-cyan-400"
                />
                <select
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                  className="bg-[#050c24] border border-blue-500/30 rounded-xl text-[10px] text-cyan-300 px-2 outline-none"
                >
                  <option value="None">None</option>
                  <option value="Advance">Advance (+)</option>
                  <option value="Credit">Credit (-)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-blue-500/25 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#0c183d] hover:bg-[#142352] text-blue-200 rounded-xl font-oswald text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-extrabold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Saving Customer...' : 'Save & Select for Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
