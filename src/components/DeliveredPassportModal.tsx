import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  Wrench,
  Award,
  Copy,
  Check,
  FileText,
  Printer,
  Send,
  Calendar,
  Sparkles,
  Heart
} from 'lucide-react';
import { RepairJob, PhoneHealthPassportData } from '../types.ts';
import {
  formatWhatsAppPhone,
  generateHealthPassportWhatsApp,
  generateThankYouWhatsApp,
  generateDeliveredAndThankYouCombinedWhatsApp,
  openWhatsAppMessage,
  parseJobIssues
} from '../utils/whatsapp.ts';
import { openCarrierSMS, generateThankYouSMS } from '../utils/sms.ts';
import { useShop } from '../context/ShopContext.tsx';

interface DeliveredPassportModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onViewPassportDetails?: (job: RepairJob) => void;
  token?: string | null;
  countryCode?: string;
  shopName?: string;
}

export const DeliveredPassportModal: React.FC<DeliveredPassportModalProps> = ({
  job,
  isOpen,
  onClose,
  onViewPassportDetails,
  token,
  countryCode = '+94',
  shopName = 'Raasith Mobile',
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';

  const [historyCount, setHistoryCount] = useState<number>(0);
  const [lastServiceDate, setLastServiceDate] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'combined' | 'passport' | 'thankyou'>('combined');
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus on primary button when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Fetch previous repair history for this customer phone
  useEffect(() => {
    if (isOpen && job?.phoneNumber && token) {
      fetch(`/api/customers/history/${encodeURIComponent(job.phoneNumber.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const previous = data.filter((j: any) => j.id !== job.id);
            setHistoryCount(previous.length);
            if (previous.length > 0) {
              setLastServiceDate(previous[0].date);
            } else {
              setLastServiceDate(job.date || 'Initial Service Record');
            }
          }
        })
        .catch((err) => console.error('Failed to query history in Delivered modal:', err));
    } else {
      setHistoryCount(0);
      setLastServiceDate(job?.date || 'Initial Service Record');
    }
  }, [isOpen, job, token]);

  const passportData: PhoneHealthPassportData = useMemo(() => {
    if (job?.healthPassport) {
      try {
        return JSON.parse(job.healthPassport) || {};
      } catch {
        // ignore
      }
    }
    return {};
  }, [job]);

  const passportMessage = useMemo(() => {
    if (!job) return '';
    return generateHealthPassportWhatsApp(job, activeShopName, {
      historyCount,
      lastServiceDate,
      passportData,
    });
  }, [job, activeShopName, historyCount, lastServiceDate, passportData]);

  const thankYouMessage = useMemo(() => {
    if (!job) return '';
    return generateThankYouWhatsApp(job.customerName, activeShopName);
  }, [job, activeShopName]);

  const combinedMessage = useMemo(() => {
    if (!job) return '';
    return generateDeliveredAndThankYouCombinedWhatsApp(job, activeShopName, {
      historyCount,
      lastServiceDate,
      passportData,
    });
  }, [job, activeShopName, historyCount, lastServiceDate, passportData]);

  const passportSms = useMemo(() => {
    if (!job) return '';
    const dev = `${job.deviceBrand} ${job.deviceModel}`.trim();
    const warranty = passportData.warrantyPeriod || '30 Days Warranty';
    return `[${activeShopName}] Job #${job.jobNumber} Delivered! ${dev} repair complete. Warranty: ${warranty}. Digital Health Passport: Quality Verified. Thank you!`;
  }, [job, activeShopName, passportData]);

  const thankYouSms = useMemo(() => {
    if (!job) return '';
    return generateThankYouSMS(job.customerName, activeShopName);
  }, [job, activeShopName]);

  const currentMessageText =
    activeTab === 'combined' ? combinedMessage : activeTab === 'passport' ? passportMessage : thankYouMessage;
  const currentSmsText = activeTab === 'thankyou' ? thankYouSms : passportSms;

  if (!isOpen || !job) return null;

  const handleSendCombined = () => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    openWhatsAppMessage(formattedPhone, combinedMessage);
    onClose();
  };

  const handleSendWhatsApp = () => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    openWhatsAppMessage(formattedPhone, currentMessageText);
    onClose();
  };

  const handleSendDirectThankYou = () => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    openWhatsAppMessage(formattedPhone, thankYouMessage);
    onClose();
  };

  const handleSendSMS = () => {
    openCarrierSMS(job.phoneNumber, currentSmsText, countryCode);
    onClose();
  };

  const handlePrintPassport = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const issues = parseJobIssues(job);

  // Replaced parts text
  let replacedPartsStr = passportData.partsReplacedText?.trim() || '';
  if (!replacedPartsStr && job.spareParts) {
    try {
      const parts = JSON.parse(job.spareParts);
      if (Array.isArray(parts) && parts.length > 0) {
        replacedPartsStr = parts.map((p: any) => `${p.name}${p.qty > 1 ? ` (x${p.qty})` : ''}`).join(', ');
      }
    } catch {
      // ignore
    }
  }

  const warrantyStr = passportData.warrantyPeriod?.trim() || '30 Days Service Warranty';

  return (
    <div
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 font-mono-jb"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-[#1c1c1e] text-[#f8f7f4] rounded-2xl sm:rounded-3xl shadow-2xl border border-[rgba(248,247,244,0.15)] w-full max-w-xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Celebration Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white stroke-[2.2]" />
          </div>

          <h3 className="font-oswald text-2xl font-bold uppercase tracking-wider">
            POS Settle & Job Delivered!
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
            Job #{job.jobNumber} marked as <strong className="text-white uppercase">Delivered</strong> at Counter
          </p>

          {/* Mode Tabs: Combined vs Health Passport vs Thank You */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('combined')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'combined'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black shadow-md ring-1 ring-amber-300'
                  : 'bg-emerald-900/50 text-white hover:bg-white/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Combined (Passport + Thank You)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('passport')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'passport'
                  ? 'bg-white text-emerald-900 shadow-md ring-1 ring-white'
                  : 'bg-emerald-900/50 text-white hover:bg-white/20'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>2. Health Passport Only</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('thankyou')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'thankyou'
                  ? 'bg-white text-rose-800 shadow-md ring-1 ring-white'
                  : 'bg-emerald-900/50 text-white hover:bg-white/20'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>3. Thank You Only</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Health Passport Summary Card */}
          <div className="bg-[#111113] p-4 rounded-xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Phone Health Passport Summary</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Quality Passed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#18181b] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer</span>
                <strong className="text-white text-sm block truncate">{job.customerName}</strong>
                <span className="text-slate-400 block text-[11px]">{job.phoneNumber}</span>
              </div>
              <div className="bg-[#18181b] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Device & Issue</span>
                <strong className="text-white text-sm block truncate">{device}</strong>
                <span className="text-emerald-400 block text-[11px] truncate">{issues}</span>
              </div>
            </div>

            {/* Repair history, Replaced parts & Warranty Details */}
            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
              <div className="bg-[#18181b]/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Repair History</span>
                <span className="font-bold text-white text-xs">{historyCount > 0 ? `${historyCount} Prior Services` : 'First Service'}</span>
                <span className="text-[9px] text-slate-400 block truncate">{lastServiceDate}</span>
              </div>
              <div className="bg-[#18181b]/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Replaced Parts</span>
                <span className="font-bold text-indigo-300 text-xs block truncate" title={replacedPartsStr || 'Labor servicing'}>
                  {replacedPartsStr || 'No parts replaced'}
                </span>
                <span className="text-[9px] text-slate-400 block">Inventory Appended</span>
              </div>
              <div className="bg-[#18181b]/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Warranty Period</span>
                <span className="font-bold text-emerald-300 text-xs block truncate">{warrantyStr}</span>
                <span className="text-[9px] text-slate-400 block">Verified Stamp</span>
              </div>
            </div>
          </div>

          {/* Quick Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {activeTab === 'combined'
                    ? 'Combined Passport & Thank You WhatsApp Preview:'
                    : activeTab === 'passport'
                    ? 'Health Passport WhatsApp Preview:'
                    : 'Thank You Message WhatsApp Preview:'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto p-3 bg-[#0b141a] rounded-xl border border-[#2a3942] text-xs text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">
              {currentMessageText}
            </div>
          </div>

          {/* Action Buttons: WhatsApp, Thank You, SMS, Print, Close */}
          <div className="space-y-2 pt-1">
            {/* Primary Combined Single Button */}
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={handleSendCombined}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer ring-2 ring-emerald-400/50"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span>Send Delivered & Thank You Message Together (1-Click)</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="py-2.5 px-3 bg-emerald-700/60 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send {activeTab === 'passport' ? 'Passport Only' : activeTab === 'thankyou' ? 'Thank You Only' : 'Current Tab Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendDirectThankYou}
                className="py-2.5 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Send automated Thank You message on WhatsApp"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Send Thank You Note</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSendSMS}
                className="py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Send via Carrier SMS"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send SMS</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPassport}
                className="py-2.5 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Print Health Passport / Receipt"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Passport</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 bg-[#111113] hover:bg-[#252528] text-slate-400 hover:text-white border border-[rgba(248,247,244,0.1)] font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Close / Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
