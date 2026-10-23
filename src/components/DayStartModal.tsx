import React, { useState } from 'react';
import {
  X,
  Play,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Power
} from 'lucide-react';

interface DayStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  currentDate?: string;
  onDayOpened: (openedDate: string) => void;
}

export const DayStartModal: React.FC<DayStartModalProps> = ({
  isOpen,
  onClose,
  token,
  currentDate,
  onDayOpened,
}) => {
  const todayStr = currentDate || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [starting, setStarting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    setErrorNotice(null);

    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/pos/day/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start business day');
      }

      onDayOpened(data.currentDate || selectedDate);
      onClose();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to initialize business day');
    } finally {
      setStarting(false);
    }
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-mono-jb"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-[#081335] border-2 border-emerald-500/50 rounded-3xl w-full max-w-md shadow-2xl shadow-emerald-950/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#042017] to-[#0a1844] border-b border-emerald-500/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20 animate-pulse">
              <Power className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-white">
                  START BUSINESS DAY
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                  Day Open
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/70">
                Initialize counter session & activate POS transactions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStartDay} className="p-5 space-y-4">
          {errorNotice && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs">
              {errorNotice}
            </div>
          )}

          {/* Date Confirmation Card */}
          <div className="bg-[#050c24] border border-emerald-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Operating Business Date</span>
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{new Date().toLocaleTimeString()}</span>
              </span>
            </div>

            <div className="space-y-1">
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#08102a] border border-emerald-500/40 rounded-xl px-3 py-2 text-white font-mono-jb text-sm font-bold outline-none focus:border-emerald-400"
              />
              <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                📅 {formattedDate}
              </p>
            </div>
          </div>

          <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-200/80 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Session Activation Rules</span>
            </div>
            <p className="text-[11px]">
              &bull; Opening the business day initializes the daily sales register and unlocks POS billing.
            </p>
            <p className="text-[11px]">
              &bull; Normal cashiers are restricted from back-dating sales entries past this date.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#0c183d] hover:bg-[#142352] text-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={starting}
              className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              <Power className="w-4 h-4 text-emerald-200" />
              <span>{starting ? 'Initializing Day...' : 'Confirm & Start Business Day'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
