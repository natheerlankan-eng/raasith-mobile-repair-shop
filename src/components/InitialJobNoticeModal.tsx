import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  MessageCircle,
  MessageSquare,
  Printer,
  X,
  Smartphone,
  Calendar,
  CreditCard,
  Wrench,
  DollarSign
} from 'lucide-react';
import { RepairJob } from '../types.ts';
import {
  formatWhatsAppPhone,
  openWhatsAppMessage,
  generateInitialIntakeReceiptWhatsApp,
  parseJobIssues
} from '../utils/whatsapp.ts';
import { openCarrierSMS, generateInitialIntakeReceiptSMS } from '../utils/sms.ts';
import { useShop } from '../context/ShopContext.tsx';

interface InitialJobNoticeModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintJob?: (job: RepairJob) => void;
  countryCode?: string;
  shopName?: string;
}

export const InitialJobNoticeModal: React.FC<InitialJobNoticeModalProps> = ({
  job,
  isOpen,
  onClose,
  onPrintJob,
  countryCode = '+94',
  shopName = 'Raasith Mobile',
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';

  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => primaryButtonRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
  const waMessage = generateInitialIntakeReceiptWhatsApp(job, activeShopName);
  const smsMessage = generateInitialIntakeReceiptSMS(job, activeShopName);
  const issues = parseJobIssues(job);

  const handleSendWhatsApp = () => {
    openWhatsAppMessage(formattedPhone, waMessage);
    onClose();
  };

  const handleSendSMS = () => {
    openCarrierSMS(job.phoneNumber, smsMessage, countryCode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-[#1c1c1e] text-[#f8f7f4] rounded-2xl sm:rounded-3xl shadow-2xl border border-[rgba(248,247,244,0.15)] w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 sm:p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-white stroke-[2.2]" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 font-mono-jb text-[10px] font-bold uppercase tracking-wider">
            Job Intake & Advance Recorded
          </span>

          <h3 className="font-oswald text-2xl font-bold uppercase tracking-wider mt-1">
            Job #{job.jobNumber} Confirmed!
          </h3>
          <p className="text-blue-200 text-xs mt-0.5 font-mono-jb">
            Device booked for inspection & servicing
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 font-mono-jb">
          {/* Summary Card */}
          <div className="bg-[#111113] p-4 rounded-xl border border-blue-500/25 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#18181b] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer</span>
                <strong className="text-white text-sm block truncate">{job.customerName}</strong>
                <span className="text-cyan-300 block text-[11px]">{job.phoneNumber}</span>
              </div>
              <div className="bg-[#18181b] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Device</span>
                <strong className="text-white text-sm block truncate">{job.deviceBrand} {job.deviceModel}</strong>
                <span className="text-amber-300 block text-[11px] truncate">{issues}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/80">
              <div className="bg-[#18181b] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estimated Labor</span>
                <strong className="text-emerald-400 text-sm block">
                  LKR {job.estimatedPrice.toLocaleString()}
                </strong>
                <span className="text-[9px] text-slate-400 block">Parts added at POS</span>
              </div>
              <div className="bg-[#18181b] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Advance Deposit</span>
                <strong className="text-yellow-400 text-sm block">
                  LKR {job.advancePaid.toLocaleString()}
                </strong>
                <span className="text-[9px] text-slate-400 block">Deducted from final bill</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Send WhatsApp Confirmation & Receipt (Enter ↵)</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSendSMS}
                className="py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Send SMS Intake Confirmation"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send SMS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onPrintJob) onPrintJob(job);
                  onClose();
                }}
                className="py-2.5 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Print Repair Slip"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 bg-[#111113] hover:bg-[#252528] text-slate-400 hover:text-white border border-[rgba(248,247,244,0.1)] font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Close / Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
