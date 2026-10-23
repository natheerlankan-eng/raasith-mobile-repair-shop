import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  User,
  Phone,
  Calendar,
  Wrench,
  Cpu,
  DollarSign,
  Printer,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessageSquare,
  Heart,
  Copy,
  Check,
  Plus,
  CreditCard,
  Receipt,
  ShieldCheck,
  ChevronDown,
  Hash,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Lock
} from 'lucide-react';
import { RepairJob, SparePart, AccessoriesInfo, UnifiedPaymentItem } from '../types.ts';
import { parseJobIssues, formatWhatsAppPhone, openWhatsAppMessage, generateJobOrderWhatsApp, generateThankYouWhatsApp } from '../utils/whatsapp.ts';
import { openCarrierSMS, generateJobOrderSMS, generateThankYouSMS } from '../utils/sms.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { PhoneHealthPassportTab } from './PhoneHealthPassportTab.tsx';
import { isJobReadyForPickup } from './RecallRepairJobModal.tsx';

interface JobOrderDetailModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  countryCode: string;
  shopName: string;
  onJobUpdated?: (updatedJob: RepairJob) => void;
  onPrintJob?: (job: RepairJob) => void;
  initialTab?: 'overview' | 'passport';
  isTechnician?: boolean;
  onRecallToPOS?: (job: RepairJob) => void;
}

export const JobOrderDetailModal: React.FC<JobOrderDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  token,
  countryCode,
  shopName,
  onJobUpdated,
  onPrintJob,
  initialTab = 'overview',
  isTechnician = false,
  onRecallToPOS,
}) => {
  const [payments, setPayments] = useState<UnifiedPaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Tab state: 'overview' | 'passport'
  const [activeTab, setActiveTab] = useState<'overview' | 'passport'>(initialTab);

  // Thank You modal state
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // Status check warning modal when attempting to settle/recall to POS
  const [showStatusWarningModal, setShowStatusWarningModal] = useState(false);

  // Current live job state
  const [currentJob, setCurrentJob] = useState<RepairJob | null>(job);

  useEffect(() => {
    if (job) {
      setCurrentJob(job);
      setShowThankYouModal(false);
      setShowStatusWarningModal(false);
      setActiveTab(initialTab || 'overview');
      fetchPaymentHistory(job.id);
    }
  }, [job, initialTab]);

  const fetchPaymentHistory = async (jobId: number) => {
    if (!token) return;
    setLoadingPayments(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  if (!isOpen || !currentJob) return null;

  // Financial calculations
  const repairAmount = currentJob.estimatedPrice || 0;
  const sparePartsAmount = currentJob.sparePartsAmount ?? currentJob.totalPartsCost ?? 0;
  const totalAmount = repairAmount + sparePartsAmount;
  const totalPaid = currentJob.advancePaid || 0;
  const balanceToPay = Math.max(0, totalAmount - totalPaid);
  const isPaidInFull = balanceToPay === 0;

  // Separate advances from direct payments in history
  const advancePaymentsList = payments.filter((p) => p.type.toLowerCase().includes('advance'));
  const otherPaymentsList = payments.filter((p) => !p.type.toLowerCase().includes('advance'));
  const advancePaidSum = advancePaymentsList.reduce((s, p) => s + p.amount, 0);
  const otherPaymentsSum = otherPaymentsList.reduce((s, p) => s + p.amount, 0);

  // Parse Spare Parts
  let partsList: SparePart[] = [];
  if (currentJob.spareParts) {
    try {
      const p = JSON.parse(currentJob.spareParts);
      partsList = Array.isArray(p) ? p : [];
    } catch {
      partsList = [];
    }
  }

  // Parse Accessories
  let acc: AccessoriesInfo | null = null;
  if (currentJob.accessories) {
    try {
      acc = JSON.parse(currentJob.accessories);
    } catch {
      acc = null;
    }
  }

  const issues = parseJobIssues(currentJob);

  // Safe handler to initiate POS settlement
  const handleInitiatePosSettlement = () => {
    if (!currentJob) return;

    if (!isJobReadyForPickup(currentJob)) {
      setShowStatusWarningModal(true);
      return;
    }

    if (onRecallToPOS) {
      onClose();
      onRecallToPOS(currentJob);
    }
  };

  // WhatsApp Sender
  const handleSendWhatsApp = () => {
    const formattedPhone = formatWhatsAppPhone(currentJob.phoneNumber, countryCode);
    const msg = generateJobOrderWhatsApp(currentJob, shopName, {
      totalAmount,
      advancePaid: advancePaidSum || currentJob.advancePaid,
      totalPaid,
      balance: balanceToPay,
    });
    openWhatsAppMessage(formattedPhone, msg);
  };

  // SMS Sender
  const handleSendSMS = () => {
    const msg = generateJobOrderSMS(currentJob, shopName, {
      totalAmount,
      totalPaid,
      balance: balanceToPay,
    });
    openCarrierSMS(currentJob.phoneNumber, msg, countryCode);
  };

  // Thank You WhatsApp
  const handleThankYouWhatsApp = () => {
    const formattedPhone = formatWhatsAppPhone(currentJob.phoneNumber, countryCode);
    const msg = generateThankYouWhatsApp(currentJob.customerName, shopName);
    openWhatsAppMessage(formattedPhone, msg);
    setShowThankYouModal(false);
  };

  // Thank You SMS
  const handleThankYouSMS = () => {
    const msg = generateThankYouSMS(currentJob.customerName, shopName);
    openCarrierSMS(currentJob.phoneNumber, msg, countryCode);
    setShowThankYouModal(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(label);
    setTimeout(() => setCopiedNotice(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print">
      <div className="bg-[#1c1c1e] text-[#f8f7f4] rounded-2xl sm:rounded-3xl shadow-2xl border border-[rgba(248,247,244,0.1)] w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-[#111113] p-4 sm:p-6 text-[#f8f7f4] shrink-0 border-b border-[rgba(248,247,244,0.1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center border border-[#ef4444]/30 shrink-0">
                <Receipt className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-oswald text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#f8f7f4]">
                    Job Order Details
                  </h2>
                  <span className="font-mono-jb text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                    {currentJob.jobNumber}
                  </span>
                </div>
                <p className="text-xs font-mono-jb text-[rgba(248,247,244,0.5)] mt-0.5 flex items-center gap-2">
                  <span>Ref / Invoice: <strong className="text-[#f8f7f4]">{currentJob.jobNumber}</strong></span>
                  <span>&bull;</span>
                  <span>Date: <strong className="text-[#f8f7f4]">{currentJob.date}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto font-mono-jb">
              {/* Payment status badge */}
              <span
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-xs ${
                  isPaidInFull
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : totalPaid > 0
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {isPaidInFull ? '✓ Paid in Full' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid'}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-[rgba(248,247,244,0.5)] hover:text-[#f8f7f4] hover:bg-[#111113] transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Tab Switcher Bar */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-[#17171a] border-b border-[rgba(248,247,244,0.08)] font-mono-jb text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#ef4444] text-white shadow-xs'
                : 'text-[rgba(248,247,244,0.6)] hover:text-white hover:bg-[#252528]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview & Billing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('passport')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'passport'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                : 'text-[rgba(248,247,244,0.6)] hover:text-white hover:bg-[#252528]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phone Health Passport</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black">
              DIGITAL RECORD
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#111113]/90">
          {activeTab === 'passport' ? (
            <PhoneHealthPassportTab
              job={currentJob}
              token={token}
              shopName={shopName}
              countryCode={countryCode}
              onJobUpdated={(updated) => {
                setCurrentJob(updated);
                if (onJobUpdated) onJobUpdated(updated);
              }}
            />
          ) : (
            <>
              {/* Section 1: Customer & Device Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information Card */}
            <div className="bg-[#1c1c1e] p-4 sm:p-5 rounded-xl border border-[rgba(248,247,244,0.1)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-2.5">
                <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[rgba(248,247,244,0.5)] flex items-center gap-1.5 font-bold">
                  <User className="w-3.5 h-3.5 text-[rgba(248,247,244,0.4)]" />
                  <span>Customer Information</span>
                </span>
                <span className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.4)]">ID #{currentJob.id}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">Customer Name</span>
                  <span className="font-bold text-[#f8f7f4] text-sm sm:text-base">{currentJob.customerName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">Phone Number</span>
                    <a
                      href={`tel:${currentJob.phoneNumber}`}
                      className="font-mono-jb font-bold text-[#f8f7f4] text-sm hover:text-[#ef4444] transition-colors inline-flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-[rgba(248,247,244,0.4)]" />
                      <span>{currentJob.phoneNumber}</span>
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono-jb text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {currentJob.customerAddress && (
                  <div>
                    <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">Address / Area</span>
                    <span className="font-medium text-[rgba(248,247,244,0.8)]">{currentJob.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Device & Repair Details Card */}
            <div className="bg-[#1c1c1e] p-4 sm:p-5 rounded-xl border border-[rgba(248,247,244,0.1)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-2.5">
                <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[rgba(248,247,244,0.5)] flex items-center gap-1.5 font-bold">
                  <Smartphone className="w-3.5 h-3.5 text-[rgba(248,247,244,0.4)]" />
                  <span>Device & Repair Details</span>
                </span>
                <StatusBadge status={currentJob.status} />
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">Brand & Model</span>
                    <span className="font-bold text-[#f8f7f4] text-sm">
                      {currentJob.deviceBrand} {currentJob.deviceModel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">Assigned Tech</span>
                    <span className="font-semibold text-[rgba(248,247,244,0.85)] text-sm flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-[rgba(248,247,244,0.4)]" />
                      <span>{currentJob.technicianName}</span>
                    </span>
                  </div>
                </div>

                {currentJob.imei && (
                  <div>
                    <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">IMEI / Serial Number</span>
                    <span className="font-mono-jb font-bold text-[#f8f7f4] text-xs bg-[#111113] px-2 py-0.5 rounded border border-[rgba(248,247,244,0.12)]">
                      {currentJob.imei}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[rgba(248,247,244,0.4)] font-mono-jb uppercase text-[10px] block">Problem / Complaint</span>
                  <span className="font-medium text-[#f8f7f4] block mt-0.5">{issues}</span>
                  {currentJob.notes && (
                    <span className="text-[rgba(248,247,244,0.5)] italic block mt-0.5">Remarks: {currentJob.notes}</span>
                  )}
                </div>

                {acc && (
                  <div className="pt-1 text-[11px] font-mono-jb text-[rgba(248,247,244,0.6)] flex items-center gap-3">
                    <span className="text-[rgba(248,247,244,0.4)]">Accessories:</span>
                    <span>SIM: {acc.sim ? '✓' : '✗'}</span>
                    <span>Cover: {acc.backCover ? '✓' : '✗'}</span>
                    <span>Battery: {acc.battery ? '✓' : '✗'}</span>
                    {acc.other && <span>({acc.other})</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Spare Parts Breakdown (Section 5 of Brief) */}
          <div className="bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="font-oswald text-xs uppercase tracking-wider font-semibold text-[#f8f7f4]">
                  Spare Parts Used ({partsList.length})
                </h4>
              </div>
              <span className="font-mono-jb text-xs font-bold text-amber-400">
                Parts Total: LKR {sparePartsAmount.toLocaleString()}
              </span>
            </div>

            {partsList.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono-jb text-[rgba(248,247,244,0.4)] bg-[#111113] rounded-lg border border-[rgba(248,247,244,0.08)]">
                {sparePartsAmount > 0 ? (
                  <div className="flex items-center justify-between text-[#f8f7f4] font-semibold px-2">
                    <span>Spare Parts Amount on slip:</span>
                    <strong className="text-amber-400 font-mono-jb text-sm">LKR {sparePartsAmount.toLocaleString()}</strong>
                  </div>
                ) : (
                  'No spare parts replaced on this repair job.'
                )}
              </div>
            ) : (
              <div className="space-y-1.5 divide-y divide-[rgba(248,247,244,0.06)] text-xs">
                {partsList.map((p, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-[rgba(248,247,244,0.85)]">
                    <div>
                      <span className="font-bold text-[#f8f7f4]">{p.name}</span>
                      {p.qty > 1 && <span className="text-[rgba(248,247,244,0.4)] font-mono-jb ml-1.5">(x{p.qty} @ LKR {p.cost.toLocaleString()})</span>}
                    </div>
                    <span className="font-mono-jb font-bold text-[#f8f7f4]">
                      LKR {(p.cost * p.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="pt-2 flex items-center justify-between font-mono-jb font-bold text-xs text-[#f8f7f4] border-t border-[rgba(248,247,244,0.1)]">
                  <span>Spare Parts Total:</span>
                  <span className="text-amber-400 text-sm">LKR {sparePartsAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Payment History (Section 4 of Brief) */}
          <div className="bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] shadow-xs p-4 sm:p-5 space-y-3 font-mono-jb">
            <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h4 className="font-oswald text-xs uppercase tracking-wider font-semibold text-[#f8f7f4]">
                  Payment History ({payments.length} Records)
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  View-Only Ledger
                </span>
                {!isPaidInFull && (
                  <button
                    type="button"
                    onClick={handleInitiatePosSettlement}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all font-mono-jb"
                    title="Recall this Job Order into POS Terminal to settle payment"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Settle in POS Terminal &rarr;</span>
                  </button>
                )}
              </div>
            </div>

            {/* Strict Workflow Notice: Cash settlement locked in Job Details */}
            <div className="p-3 bg-[#0a1228] border border-blue-500/20 rounded-xl text-blue-200/90 text-xs font-mono-jb flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Strict POS Enforcement:</strong> Direct cash and balance settlements are completely disabled in Job Order Details. Invoices and cash-out must be executed through the POS terminal.
                </span>
              </div>
              {!isPaidInFull && (
                <button
                  type="button"
                  onClick={handleInitiatePosSettlement}
                  className="text-amber-400 hover:text-amber-300 text-[11px] font-bold uppercase underline cursor-pointer"
                >
                  Recall to POS Now
                </button>
              )}
            </div>

            {loadingPayments ? (
              <div className="p-4 text-center text-xs text-[rgba(248,247,244,0.4)]">Loading payment history...</div>
            ) : payments.length === 0 ? (
              <div className="p-4 text-center text-xs text-[rgba(248,247,244,0.4)] bg-[#111113] rounded-lg border border-dashed border-[rgba(248,247,244,0.1)]">
                No payments recorded yet for this Job Order.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[rgba(248,247,244,0.08)] text-[10px] font-bold text-[rgba(248,247,244,0.4)] uppercase tracking-wider">
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Reference</th>
                        <th className="py-2 px-2">Invoice Ref</th>
                        <th className="py-2 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(248,247,244,0.06)]">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#111113]/50 transition-colors">
                          <td className="py-2 px-2 text-[rgba(248,247,244,0.7)]">{p.date}</td>
                          <td className="py-2 px-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                p.type.toLowerCase().includes('advance')
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-[rgba(248,247,244,0.6)]">{p.reference || '-'}</td>
                          <td className="py-2 px-2 font-bold text-[#f8f7f4]">{p.invoiceReference || currentJob.jobNumber}</td>
                          <td className="py-2 px-2 font-bold text-right text-[#f8f7f4]">
                            LKR {p.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-[rgba(248,247,244,0.1)] flex items-center justify-between text-xs font-bold">
                  <span className="text-[rgba(248,247,244,0.6)]">Total Payments Recorded:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    LKR {totalPaid.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: POS PAYMENT BREAKDOWN CARD (Section 2 & 3 of Brief) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                  POS
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight text-white uppercase">Payment Summary & Settlement</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Invoice #{currentJob.jobNumber}</p>
                </div>
              </div>

              {isPaidInFull && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Paid In Full</span>
                </span>
              )}
            </div>

            {/* POS Breakdown Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Base Repair Amount:</span>
                <span className="font-mono font-bold text-white">LKR {repairAmount.toLocaleString()}</span>
              </div>

              {sparePartsAmount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Spare Parts Amount:</span>
                  <span className="font-mono font-bold">+ LKR {sparePartsAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-white pt-2 border-t border-slate-800 text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-base">LKR {totalAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/70">
                <span>Advance / Deposit Paid:</span>
                <span className="font-mono text-slate-300">
                  LKR {(advancePaidSum || currentJob.advancePaid).toLocaleString()}
                </span>
              </div>

              {otherPaymentsSum > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Additional Counter Payments:</span>
                  <span className="font-mono text-slate-300">LKR {otherPaymentsSum.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold text-emerald-400 pt-1 border-t border-slate-800 text-sm">
                <span>Total Paid:</span>
                <span className="font-mono text-base">- LKR {totalPaid.toLocaleString()}</span>
              </div>
            </div>

            {/* BIG HIGHLIGHT: BALANCE TO PAY */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isPaidInFull
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block opacity-90">
                  {isPaidInFull ? 'Final Balance' : 'Balance to Pay'}
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                  LKR {balanceToPay.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPaidInFull ? (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>PAID IN FULL</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitiatePosSettlement}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/30 transition-all font-mono-jb"
                    title="Transfer this job order to POS terminal to complete payment and print bill"
                  >
                    <Lock className="w-4 h-4 text-amber-200" />
                    <span>+ SETTLE BALANCE IN POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* POS-Only Cash Settlement Security Banner */}
            {!isPaidInFull && (
              <div className="p-3 bg-slate-900/90 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-300 font-mono-jb">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>POS Security Rule:</strong> Direct cash collection is locked here. Click &ldquo;+ SETTLE BALANCE IN POS&rdquo; to process this invoice through the POS terminal.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleInitiatePosSettlement}
                  className="text-[11px] font-bold text-amber-400 hover:underline uppercase shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Live Formula Display */}
            <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              Total Amount (LKR {totalAmount.toLocaleString()}) - Total Paid (LKR {totalPaid.toLocaleString()}) = Balance Due (LKR {balanceToPay.toLocaleString()})
            </div>
          </div>
        </>
      )}
    </div>

        {/* Modal Bottom Action Bar (Sections 6, 7, 8, 9) */}
        <div className="bg-white p-3.5 sm:p-5 border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Phone Health Passport Button */}
            <button
              type="button"
              onClick={() => setActiveTab('passport')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors font-mono-jb ${
                activeTab === 'passport'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
              title="Open Phone Health Passport Digital Record"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Health Passport</span>
            </button>

            {/* WhatsApp Button */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Open WhatsApp with Job Order & Balance Details"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            {/* SMS Button */}
            <button
              type="button"
              onClick={handleSendSMS}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Send SMS with Job Order & Balance Details"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send SMS</span>
            </button>

            {/* THANK CUSTOMER BUTTON (Visible when balance is 0 / fully paid) */}
            {isPaidInFull && (
              <button
                type="button"
                onClick={() => setShowThankYouModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 transition-all animate-pulse"
                title="Send Thank-You Message to Customer"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Thank Customer</span>
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {onPrintJob && (
              <button
                type="button"
                onClick={() => onPrintJob(currentJob)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Print repair slip"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Slip</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL: THANK CUSTOMER MESSAGE OPTIONS (Sections 8 & 9) */}
      {showThankYouModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-700 via-pink-600 to-rose-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">Thank Customer & Follow Up</h3>
                  <p className="text-xs text-rose-100">Job Order is Paid in Full</p>
                </div>
              </div>
              <button
                onClick={() => setShowThankYouModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-extrabold text-slate-500 uppercase tracking-wider block text-[10px] mb-1.5">
                  Message Preview for {currentJob.customerName} ({currentJob.phoneNumber})
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl whitespace-pre-line font-medium text-slate-800 leading-relaxed text-xs shadow-inner">
                  {generateThankYouWhatsApp(currentJob.customerName, shopName)}
                </div>
              </div>

              {copiedNotice && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{copiedNotice} copied to clipboard!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleThankYouWhatsApp}
                  className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleThankYouSMS}
                  className="py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(generateThankYouWhatsApp(currentJob.customerName, shopName), 'Thank You Message')}
                  className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy Text</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowThankYouModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CHECK WARNING POPUP: Ready to Pick Up Validation */}
      {showStatusWarningModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b132b] border-2 border-rose-500/60 rounded-3xl w-full max-w-md shadow-2xl shadow-rose-950/80 overflow-hidden text-white font-mono-jb p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-rose-300">
                  Job Recall Blocked
                </h3>
                <p className="text-[11px] text-slate-400">
                  Job Order #{currentJob.jobNumber} &bull; Status Check
                </p>
              </div>
            </div>

            {/* The exact required warning prompts */}
            <div className="bg-rose-950/60 border border-rose-500/40 p-4 rounded-2xl space-y-2.5">
              <p className="text-sm font-extrabold text-white leading-relaxed">
                &ldquo;This job order is not ready to pick up. The status must be &apos;Ready for Pickup&apos; before it can be recalled into the POS bill.&rdquo;
              </p>
              <p className="text-xs text-amber-200 font-semibold italic border-t border-rose-500/30 pt-2">
                &ldquo;It&apos;s not ready to pick up. Make it ready to pick up, then you can recall.&rdquo;
              </p>
              <div className="pt-1 text-xs text-rose-200/90 flex items-center gap-2">
                <span>Current Status:</span>
                <span className="font-bold uppercase px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40">
                  {currentJob.status}
                </span>
              </div>
              <p className="text-[11px] text-rose-300/80 pt-1">
                Technicians must complete the repair and update the status to <strong>&ldquo;Ready for Pickup&rdquo;</strong> before the cashier can recall this job to the POS terminal for final billing and settlement.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusWarningModal(false)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-rose-600/30 transition-all font-mono-jb"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const JobDetailsModal = JobOrderDetailModal;
