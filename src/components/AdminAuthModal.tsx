import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, X, Check, Key, AlertCircle } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  actionDescription?: string;
  token?: string | null;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Admin Authorization Required',
  actionDescription = 'This transactional reversal or deletion requires verified Administrator authorization for strict ledger auditing.',
  token,
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setLoading(false);
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Please enter the Admin PIN or password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/auth/verify-admin-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.authorized) {
        throw new Error(data.error || 'Invalid Admin PIN. Authorization rejected.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authorization rejected. Incorrect PIN.');
      pinInputRef.current?.select();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickKey = (num: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-mono-jb">
      <div className="bg-[#081335] border-2 border-rose-500/50 rounded-3xl w-full max-w-md shadow-2xl shadow-rose-950/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#170a24] to-[#0a1538] border-b border-rose-500/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-white">
                {title}
              </h3>
              <p className="text-[10px] text-rose-300/80 uppercase font-bold">
                Audited Ledger Protection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-300 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs leading-relaxed">
            {actionDescription}
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-blue-200 font-bold block mb-1">
              Enter Admin PIN / Password:
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={pinInputRef}
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="••••"
                className="w-full bg-[#050c22] border-2 border-rose-500/40 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg font-bold tracking-widest text-white outline-none focus:border-rose-400"
              />
            </div>
            <p className="text-[9px] text-blue-300/50 mt-1 text-center">
              System Admin Default: 7788 or Admin Account Password
            </p>
          </div>

          {/* Quick Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleQuickKey(digit)}
                className="py-2.5 bg-[#0a1844] hover:bg-blue-600/30 border border-blue-500/20 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-2.5 bg-[#140b20] hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleQuickKey('0')}
              className="py-2.5 bg-[#0a1844] hover:bg-blue-600/30 border border-blue-500/20 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => prev.slice(0, -1))}
              className="py-2.5 bg-[#0a1844] hover:bg-blue-600/30 border border-blue-500/20 text-blue-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#0e1d48] hover:bg-[#14265c] text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !pin.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-oswald"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Authorize Action</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
