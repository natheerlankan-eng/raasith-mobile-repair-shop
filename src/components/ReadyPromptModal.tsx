import React, { useEffect, useRef } from 'react';
import { MessageCircle, MessageSquare, CheckCircle2, X, Smartphone, ArrowRight } from 'lucide-react';
import { RepairJob } from '../types.ts';
import { formatWhatsAppPhone, generateReadyMessage, openWhatsAppMessage } from '../utils/whatsapp.ts';
import { openCarrierSMS, generateReadySMS } from '../utils/sms.ts';
import { useShop } from '../context/ShopContext.tsx';

interface ReadyPromptModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: (job: RepairJob) => void;
  countryCode: string;
  shopName?: string;
}

export const ReadyPromptModal: React.FC<ReadyPromptModalProps> = ({
  job,
  isOpen,
  onClose,
  onConfirmSend,
  countryCode,
  shopName,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName;
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => primaryButtonRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  const balance = Math.max(0, job.estimatedPrice - job.advancePaid);

  const handleSendWhatsApp = () => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    const message = generateReadyMessage(job, activeShopName);
    openWhatsAppMessage(formattedPhone, message);
    onConfirmSend(job);
    onClose();
  };

  const handleSendSMS = () => {
    const sms = generateReadySMS(job, activeShopName);
    openCarrierSMS(job.phoneNumber, sms, countryCode);
    onConfirmSend(job);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono-jb"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-[#1c1c1e] text-[#f8f7f4] rounded-2xl sm:rounded-3xl shadow-2xl border border-[rgba(248,247,244,0.15)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 border border-white/30 backdrop-blur-xs shadow-inner">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
            Technical Work Completed
          </span>
          <h3 className="text-xl font-black font-oswald uppercase tracking-wider mt-1">
            Status: Ready to Collect
          </h3>
          <p className="text-emerald-100 text-xs mt-1 font-mono-jb">
            Job #{job.jobNumber} is ready for customer collection & counter billing
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#111113] p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="font-bold text-white">{job.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Device:</span>
              <span className="font-semibold text-white">{job.deviceBrand} {job.deviceModel}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Labor Charge:</span>
              <span className="font-mono text-cyan-300 font-bold">LKR {job.estimatedPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Advance Paid:</span>
              <span className="font-mono text-amber-400 font-bold">LKR {job.advancePaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-bold">Estimated Balance:</span>
              <span className="font-mono text-emerald-400 font-black text-sm">LKR {balance.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans italic pt-1">
              * Spare parts and final settlement will be calculated at POS counter.
            </div>
          </div>

          <p className="text-center text-slate-300 font-bold text-xs uppercase tracking-wider">
            Notify customer that phone is ready?
          </p>

          <div className="space-y-2.5 pt-1">
            <button
              ref={primaryButtonRef}
              onClick={handleSendWhatsApp}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Send WhatsApp Ready Notification (Enter ↵)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSendSMS}
                className="py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send via SMS</span>
              </button>

              <button
                onClick={onClose}
                className="py-2.5 px-3 bg-[#111113] hover:bg-[#252528] text-slate-400 hover:text-white border border-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Not Now / Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
