import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CreditCard,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  User,
  DollarSign,
  Cpu,
  Printer,
  MessageCircle,
  Check,
  Receipt,
  ArrowRight,
  Sparkles,
  Calendar,
  Wrench,
  Clock,
  RotateCcw
} from 'lucide-react';
import { RepairJob, SparePart, UnifiedPaymentItem } from '../types.ts';
import { parseJobIssues, formatWhatsAppPhone, openWhatsAppMessage } from '../utils/whatsapp.ts';
import { openCarrierSMS } from '../utils/sms.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { useShop } from '../context/ShopContext.tsx';

interface PosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: RepairJob[];
  token: string | null;
  countryCode: string;
  shopName: string;
  onJobUpdated: (updatedJob: RepairJob) => void;
  onPrintSlip?: (job: RepairJob) => void;
  initialJobId?: string | null;
}

export const PosCheckoutModal: React.FC<PosCheckoutModalProps> = ({
  isOpen,
  onClose,
  jobs,
  token,
  countryCode,
  shopName,
  onJobUpdated,
  onPrintSlip,
  initialJobId,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';
  const activeBranch = shopProfile?.branch || 'Akkaraipattu';

  const [searchJobQuery, setSearchJobQuery] = useState(initialJobId || '');
  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);
  const [payments, setPayments] = useState<UnifiedPaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Settlement Form State
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [tenderedAmount, setTenderedAmount] = useState<number | ''>('');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [transactionClosed, setTransactionClosed] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessNotice(null);
      setTransactionClosed(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
        if (initialJobId) {
          lookupJob(initialJobId);
        }
      }, 100);
    }
  }, [isOpen, initialJobId]);

  // Lookup job by query
  const lookupJob = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSelectedJob(null);
      return;
    }

    // Try exact or formatted matching:
    // 1. exact jobNumber e.g. "RM-1001"
    // 2. numeric suffix e.g. "1001"
    // 3. customer phone
    // 4. customer name
    const match = jobs.find((j) => {
      const jNum = j.jobNumber.toLowerCase();
      if (jNum === q || jNum === `rm-${q}`) return true;
      if (j.id.toString() === q) return true;
      if (j.phoneNumber.replace(/\D/g, '') === q.replace(/\D/g, '')) return true;
      return false;
    }) || jobs.find((j) => j.customerName.toLowerCase().includes(q));

    if (match) {
      selectJob(match);
    }
  };

  const selectJob = (job: RepairJob) => {
    setSelectedJob(job);
    setSearchJobQuery(job.jobNumber);
    setErrorMsg(null);
    setSuccessNotice(null);
    setTransactionClosed(job.status === 'Delivered');

    // Default payment amount to remaining balance due
    const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
    const totalAmount = job.estimatedPrice + partsCost;
    const balance = Math.max(0, totalAmount - job.advancePaid);
    setPayAmount(balance > 0 ? balance : '');
    setTenderedAmount(balance > 0 ? balance : '');
    setPayRef('');
    setPayNotes('');

    fetchJobPayments(job.id);
  };

  const fetchJobPayments = async (jobId: number) => {
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
      console.error('Failed to load payments for POS checkout:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Autocomplete suggestions based on query
  const matchingSuggestions = useMemo(() => {
    if (!searchJobQuery.trim() || selectedJob?.jobNumber.toLowerCase() === searchJobQuery.trim().toLowerCase()) {
      return [];
    }
    const q = searchJobQuery.trim().toLowerCase();
    return jobs
      .filter((j) => {
        return (
          j.jobNumber.toLowerCase().includes(q) ||
          j.customerName.toLowerCase().includes(q) ||
          j.phoneNumber.includes(q) ||
          j.deviceModel.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [searchJobQuery, jobs, selectedJob]);

  // Quick ready jobs chips (ready for customer pickup)
  const readyForPickupJobs = useMemo(() => {
    return jobs.filter((j) => j.status === 'Ready for Pickup').slice(0, 4);
  }, [jobs]);

  if (!isOpen) return null;

  // Selected job computations
  const partsCost = selectedJob ? (selectedJob.sparePartsAmount ?? selectedJob.totalPartsCost ?? 0) : 0;
  const totalAmount = selectedJob ? selectedJob.estimatedPrice + partsCost : 0;
  const totalPaid = selectedJob ? selectedJob.advancePaid : 0;
  const balance = selectedJob ? Math.max(0, totalAmount - totalPaid) : 0;
  const isPaidInFull = balance === 0;

  // Change computation if cash tendered > payAmount
  const currentPayAmt = typeof payAmount === 'number' ? payAmount : 0;
  const currentTendered = typeof tenderedAmount === 'number' ? tenderedAmount : currentPayAmt;
  const changeDue = Math.max(0, currentTendered - currentPayAmt);

  // Parse spare parts
  const parsedParts: SparePart[] = (() => {
    if (!selectedJob?.spareParts) return [];
    try {
      const parsed = JSON.parse(selectedJob.spareParts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  // Handle "Close Transaction" / "Complete Payment"
  const handleCloseTransaction = async () => {
    if (!selectedJob || !token) return;
    setErrorMsg(null);
    setProcessingPayment(true);

    try {
      let updatedJobRecord = selectedJob;

      // 1. If there's an amount to collect, record the payment transaction
      if (currentPayAmt > 0) {
        const payRes = await fetch(`/api/jobs/${selectedJob.id}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: currentPayAmt,
            paymentType: payMethod,
            reference: payRef.trim() || `POS-${payMethod.toUpperCase()}`,
            notes: payNotes.trim() || `POS Checkout settlement (${payMethod})`,
            date: new Date().toISOString().split('T')[0],
          }),
        });

        if (!payRes.ok) {
          const errData = await payRes.json();
          throw new Error(errData.error || 'Failed to record payment transaction');
        }

        const payData = await payRes.json();
        updatedJobRecord = payData.job;
      }

      // 2. Mark the job as Completed / Delivered (or keep status if cancelled)
      if (updatedJobRecord.status !== 'Delivered') {
        const statusRes = await fetch(`/api/jobs/${selectedJob.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'Delivered' }),
        });

        if (!statusRes.ok) {
          const errData = await statusRes.json();
          throw new Error(errData.error || 'Failed to update job status to Delivered');
        }

        updatedJobRecord = await statusRes.json();
      }

      // 3. Update parent state
      setSelectedJob(updatedJobRecord);
      onJobUpdated(updatedJobRecord);
      fetchJobPayments(updatedJobRecord.id);

      setTransactionClosed(true);
      setSuccessNotice(`Transaction successfully closed! Slip ${updatedJobRecord.jobNumber} marked as Delivered / Completed.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while closing POS transaction.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // WhatsApp thank you message
  const handleSendThankYouWhatsApp = () => {
    if (!selectedJob) return;
    const formattedPhone = formatWhatsAppPhone(selectedJob.phoneNumber, countryCode);
    const msg = `*${shopName} · PAYMENT RECEIPT*\n\n` +
      `Dear ${selectedJob.customerName},\n` +
      `Thank you for repairing your ${selectedJob.deviceBrand} ${selectedJob.deviceModel} with us!\n\n` +
      `Invoice: *${selectedJob.jobNumber}*\n` +
      `Total Bill: *LKR ${totalAmount.toLocaleString()}*\n` +
      `Total Paid: *LKR ${(totalPaid + currentPayAmt).toLocaleString()}*\n` +
      `Status: *PAID IN FULL / COMPLETED*\n\n` +
      `We appreciate your business! Please keep your slip for 30-day service warranty.\n` +
      `${shopName}`;
    openWhatsAppMessage(formattedPhone, msg);
  };

  // Carrier SMS thank you
  const handleSendThankYouSMS = () => {
    if (!selectedJob) return;
    const msg = `${shopName}: Thank you ${selectedJob.customerName}! Payment received for ${selectedJob.jobNumber}. Total LKR ${totalAmount.toLocaleString()} Paid in Full. Warranty applicable.`;
    openCarrierSMS(selectedJob.phoneNumber, msg, countryCode);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#1c1c1e] text-[#f8f7f4] rounded-2xl shadow-2xl border border-[rgba(248,247,244,0.15)] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* POS Header Bar */}
        <div className="px-5 sm:px-7 py-4 bg-[#111113] border-b border-[rgba(248,247,244,0.1)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-oswald text-lg sm:text-xl uppercase tracking-wider font-bold text-[#f8f7f4]">
                  POINT OF SALE CHECKOUT
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono-jb uppercase tracking-wider border border-emerald-500/30 font-bold">
                  TERMINAL
                </span>
              </div>
              <p className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)]">
                {shopName} &bull; Instant Job Lookup & Final Settlement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#1c1c1e] text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4] hover:bg-[#252528] flex items-center justify-center transition-colors cursor-pointer border border-[rgba(248,247,244,0.1)]"
            title="Close POS"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* POS Search & Job Lookup Strip */}
        <div className="p-4 sm:p-6 bg-[#18181a] border-b border-[rgba(248,247,244,0.1)] space-y-3 shrink-0">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[rgba(248,247,244,0.4)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchJobQuery}
                  onChange={(e) => {
                    setSearchJobQuery(e.target.value);
                    lookupJob(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      lookupJob(searchJobQuery);
                    }
                  }}
                  placeholder="Scan Barcode or Type Job ID (e.g. RM-1001, 1001, phone, customer name)..."
                  className="w-full pl-10 pr-10 py-3 bg-[#111113] border border-[rgba(248,247,244,0.15)] focus:border-emerald-500 rounded-xl text-sm font-mono-jb text-[#f8f7f4] placeholder:text-[rgba(248,247,244,0.35)] outline-none transition-colors"
                />
                {searchJobQuery && (
                  <button
                    onClick={() => {
                      setSearchJobQuery('');
                      setSelectedJob(null);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(248,247,244,0.4)] hover:text-[#f8f7f4] p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => lookupJob(searchJobQuery)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-oswald uppercase tracking-wider text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>Find Job</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Autocomplete Dropdown List */}
            {matchingSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#1c1c1e] border border-[rgba(248,247,244,0.2)] rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-[rgba(248,247,244,0.06)]">
                {matchingSuggestions.map((j) => {
                  const pCost = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
                  const bal = Math.max(0, (j.estimatedPrice + pCost) - j.advancePaid);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => selectJob(j)}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#252528] flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono-jb font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {j.jobNumber}
                        </span>
                        <span className="font-bold text-[#f8f7f4]">{j.customerName}</span>
                        <span className="text-[rgba(248,247,244,0.5)] font-mono-jb">({j.phoneNumber})</span>
                        <span className="text-[rgba(248,247,244,0.7)] hidden sm:inline">&bull; {j.deviceBrand} {j.deviceModel}</span>
                      </div>
                      <div className="text-right font-mono-jb shrink-0">
                        <span className="text-[rgba(248,247,244,0.5)]">Due: </span>
                        <span className={`font-bold ${bal > 0 ? 'text-[#ef4444]' : 'text-emerald-400'}`}>
                          LKR {bal.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Ready For Pickup Chips */}
          {readyForPickupJobs.length > 0 && !selectedJob && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Ready for Pickup:</span>
              </span>
              {readyForPickupJobs.map((rj) => (
                <button
                  key={rj.id}
                  onClick={() => selectJob(rj)}
                  className="px-2.5 py-1 bg-[#111113] hover:bg-[#252528] text-xs font-mono-jb rounded-lg border border-[rgba(248,247,244,0.12)] hover:border-emerald-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-400">{rj.jobNumber}</span>
                  <span className="text-[rgba(248,247,244,0.6)]">({rj.customerName})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable POS Details & Checkout Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{successNotice}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendThankYouWhatsApp}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono-jb text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </button>
                {onPrintSlip && selectedJob && (
                  <button
                    onClick={() => onPrintSlip(selectedJob)}
                    className="px-2.5 py-1.5 bg-[#111113] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.2)] rounded-lg font-mono-jb text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {!selectedJob ? (
            /* Empty State */
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#111113] border border-[rgba(248,247,244,0.1)] text-emerald-400 flex items-center justify-center mx-auto">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-oswald text-lg uppercase tracking-wider font-bold text-[#f8f7f4]">
                  Scan or Type a Job ID to Begin Checkout
                </h3>
                <p className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)] mt-1">
                  Type any Job Number (e.g. RM-1001), phone number, or scan the slip barcode to load billing details and process counter checkout.
                </p>
              </div>
            </div>
          ) : (
            /* Selected Job Information & POS Workspace */
            <div className="space-y-6">
              {/* Job Identification Banner */}
              <div className="bg-[#111113] rounded-xl p-4 sm:p-5 border border-[rgba(248,247,244,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1c1c1e] border border-[rgba(248,247,244,0.15)] flex flex-col items-center justify-center font-mono-jb shrink-0">
                    <span className="text-[9px] text-[rgba(248,247,244,0.4)]">SLIP</span>
                    <span className="text-sm font-black text-emerald-400">ID</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-mono-jb text-xl sm:text-2xl font-black text-[#f8f7f4]">
                        {selectedJob.jobNumber}
                      </h3>
                      <StatusBadge status={selectedJob.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[rgba(248,247,244,0.5)] font-mono-jb mt-0.5">
                      <span>Date: {selectedJob.date}</span>
                      <span>&bull;</span>
                      <span>Tech: {selectedJob.technicianName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onPrintSlip && (
                    <button
                      type="button"
                      onClick={() => onPrintSlip(selectedJob)}
                      className="px-3 py-2 bg-[#1c1c1e] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.15)] rounded-lg text-xs font-mono-jb flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[rgba(248,247,244,0.7)]" />
                      <span>Print Slip</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJob(null);
                      setSearchJobQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="px-3 py-2 bg-[#1c1c1e] hover:bg-[#252528] text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4] border border-[rgba(248,247,244,0.1)] rounded-lg text-xs font-mono-jb flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Change Job</span>
                  </button>
                </div>
              </div>

              {/* Customer & Device Dual Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Details Card */}
                <div className="bg-[#111113] rounded-xl p-4 border border-[rgba(248,247,244,0.08)] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.06)] pb-2">
                    <span className="text-[10px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Customer Details</span>
                    </span>
                    <span className="text-[11px] font-mono-jb text-emerald-400">{selectedJob.phoneNumber}</span>
                  </div>

                  <div>
                    <div className="text-base font-bold text-[#f8f7f4]">{selectedJob.customerName}</div>
                    {selectedJob.customerAddress && (
                      <div className="text-xs text-[rgba(248,247,244,0.6)] mt-0.5">
                        {selectedJob.customerAddress}
                      </div>
                    )}
                  </div>
                </div>

                {/* Device & Problem Details Card */}
                <div className="bg-[#111113] rounded-xl p-4 border border-[rgba(248,247,244,0.08)] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.06)] pb-2">
                    <span className="text-[10px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Device & Problem</span>
                    </span>
                    {selectedJob.imei && (
                      <span className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.4)]">
                        IMEI: {selectedJob.imei}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-base font-bold text-[#f8f7f4]">
                      {selectedJob.deviceBrand} {selectedJob.deviceModel}
                    </div>
                    <div className="text-xs text-[rgba(248,247,244,0.7)] mt-0.5 line-clamp-2">
                      <span className="text-[rgba(248,247,244,0.4)]">Issue: </span>
                      {parseJobIssues(selectedJob)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Spare Parts Breakdown (if any) */}
              {parsedParts.length > 0 && (
                <div className="bg-[#111113] rounded-xl p-4 border border-[rgba(248,247,244,0.08)] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.06)] pb-2">
                    <span className="text-[10px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      <span>Spare Parts Installed ({parsedParts.length})</span>
                    </span>
                    <span className="text-xs font-mono-jb font-bold text-amber-400">
                      Total Parts: LKR {partsCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="divide-y divide-[rgba(248,247,244,0.04)] text-xs font-mono-jb">
                    {parsedParts.map((p, idx) => (
                      <div key={p.id || idx} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[#f8f7f4] font-medium">{p.name}</span>
                          <span className="text-[rgba(248,247,244,0.4)] text-[11px]">&times; {p.qty}</span>
                        </div>
                        <span className="text-[rgba(248,247,244,0.8)]">
                          LKR {(p.cost * p.qty).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial POS Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-jb">
                <div className="bg-[#111113] p-3.5 rounded-xl border border-[rgba(248,247,244,0.08)]">
                  <span className="text-[10px] text-[rgba(248,247,244,0.5)] uppercase block font-bold">Base Repair</span>
                  <div className="text-lg font-bold text-[#f8f7f4] mt-1">
                    LKR {selectedJob.estimatedPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-[#111113] p-3.5 rounded-xl border border-[rgba(248,247,244,0.08)]">
                  <span className="text-[10px] text-[rgba(248,247,244,0.5)] uppercase block font-bold">Spare Parts</span>
                  <div className="text-lg font-bold text-amber-400 mt-1">
                    +LKR {partsCost.toLocaleString()}
                  </div>
                </div>

                <div className="bg-[#111113] p-3.5 rounded-xl border border-[rgba(248,247,244,0.08)]">
                  <span className="text-[10px] text-[rgba(248,247,244,0.5)] uppercase block font-bold">Advance / Paid</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    -LKR {totalPaid.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border ${balance > 0 ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <span className="text-[10px] uppercase block font-bold tracking-wider text-[rgba(248,247,244,0.7)]">
                    {balance > 0 ? 'Balance Due' : 'Status'}
                  </span>
                  <div className={`text-lg font-black mt-1 ${balance > 0 ? 'text-[#ef4444]' : 'text-emerald-400'}`}>
                    {balance > 0 ? `LKR ${balance.toLocaleString()}` : 'PAID IN FULL'}
                  </div>
                </div>
              </div>

              {/* POS Payment Collection & Checkout Action Box */}
              <div className="bg-[#111113] rounded-2xl border-2 border-emerald-500/30 p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(248,247,244,0.08)] pb-4">
                  <div>
                    <h4 className="font-oswald text-base uppercase tracking-wider font-bold text-[#f8f7f4] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <span>{balance > 0 ? 'Settle Final Payment' : 'Transaction Status & Fulfillment'}</span>
                    </h4>
                    <p className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)]">
                      {balance > 0
                        ? 'Collect remaining balance from customer and close repair slip'
                        : 'Job is fully settled. Mark delivered and thank customer.'}
                    </p>
                  </div>

                  {isPaidInFull && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono-jb text-xs font-bold self-start sm:self-auto">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Paid in Full</span>
                    </div>
                  )}
                </div>

                {balance > 0 && (
                  <div className="space-y-4">
                    {/* Payment Method Selector */}
                    <div>
                      <label className="block text-[11px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold mb-2">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Cash', 'Card', 'Bank Transfer'] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPayMethod(method)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-mono-jb font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              payMethod === method
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                                : 'bg-[#1c1c1e] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                            }`}
                          >
                            <span>{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount & Cash Tendered */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Amount to collect */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold">
                            Amount to Pay (LKR)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setPayAmount(balance);
                              setTenderedAmount(balance);
                            }}
                            className="text-[10px] font-mono-jb text-emerald-400 hover:underline cursor-pointer"
                          >
                            Exact Balance: {balance.toLocaleString()}
                          </button>
                        </div>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setPayAmount(val);
                            if (typeof val === 'number') setTenderedAmount(val);
                          }}
                          className="w-full px-4 py-2.5 bg-[#1c1c1e] border border-[rgba(248,247,244,0.15)] focus:border-emerald-500 rounded-xl text-base font-mono-jb font-bold text-[#f8f7f4] outline-none"
                        />
                      </div>

                      {/* Cash Tendered & Change (Visible if Cash) */}
                      {payMethod === 'Cash' ? (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold">
                              Cash Received / Tendered (LKR)
                            </label>
                            {changeDue > 0 && (
                              <span className="text-[11px] font-mono-jb font-bold text-emerald-400">
                                Return Change: LKR {changeDue.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            value={tenderedAmount}
                            onChange={(e) => setTenderedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-4 py-2.5 bg-[#1c1c1e] border border-[rgba(248,247,244,0.15)] focus:border-emerald-500 rounded-xl text-base font-mono-jb font-bold text-[#f8f7f4] outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold mb-1.5">
                            Reference / Auth Code
                          </label>
                          <input
                            type="text"
                            value={payRef}
                            onChange={(e) => setPayRef(e.target.value)}
                            placeholder="e.g. Card Slip / Transfer Ref"
                            className="w-full px-4 py-2.5 bg-[#1c1c1e] border border-[rgba(248,247,244,0.15)] focus:border-emerald-500 rounded-xl text-xs font-mono-jb text-[#f8f7f4] outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quick Cash Presets */}
                    {payMethod === 'Cash' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.4)] mr-1 uppercase">Quick:</span>
                        {[balance, 1000, 2000, 5000, 10000].filter((val, i, arr) => arr.indexOf(val) === i && val >= balance).slice(0, 4).map((cashPreset) => (
                          <button
                            key={cashPreset}
                            type="button"
                            onClick={() => setTenderedAmount(cashPreset)}
                            className="px-2.5 py-1 bg-[#1c1c1e] hover:bg-[#252528] rounded border border-[rgba(248,247,244,0.1)] text-xs font-mono-jb text-[rgba(248,247,244,0.8)] cursor-pointer"
                          >
                            LKR {cashPreset.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Action Button: Close Transaction & Save */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs font-mono-jb text-[rgba(248,247,244,0.5)]">
                    {transactionClosed ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>Transaction Closed & Status Saved</span>
                      </span>
                    ) : (
                      <span>Closing transaction saves payment record and marks job as Completed / Delivered.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {isPaidInFull && (
                      <button
                        type="button"
                        onClick={handleSendThankYouWhatsApp}
                        className="flex-1 sm:flex-none px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-oswald uppercase tracking-wider text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Thank Customer</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={processingPayment}
                      onClick={handleCloseTransaction}
                      className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-oswald uppercase tracking-wider text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      {processingPayment ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                          <span>
                            {balance > 0
                              ? `Complete Payment & Close Transaction (LKR ${currentPayAmt.toLocaleString()})`
                              : 'Close Transaction & Mark Delivered'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Records Ledger History */}
              {payments.length > 0 && (
                <div className="bg-[#111113] rounded-xl p-4 border border-[rgba(248,247,244,0.08)] space-y-2">
                  <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.06)] pb-2">
                    <span className="text-[10px] font-mono-jb uppercase text-[rgba(248,247,244,0.5)] font-bold">
                      Payment History on Record ({payments.length})
                    </span>
                    <span className="text-xs font-mono-jb text-[rgba(248,247,244,0.6)]">
                      Total Paid: LKR {totalPaid.toLocaleString()}
                    </span>
                  </div>

                  <div className="divide-y divide-[rgba(248,247,244,0.04)] text-xs font-mono-jb">
                    {payments.map((p) => (
                      <div key={p.id} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="text-[#f8f7f4] font-semibold flex items-center gap-2">
                            <span>{p.type}</span>
                            {p.reference && (
                              <span className="text-[10px] text-[rgba(248,247,244,0.4)]">
                                Ref: {p.reference}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[rgba(248,247,244,0.4)]">{p.date}</div>
                        </div>
                        <div className="text-emerald-400 font-bold">
                          LKR {p.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 sm:px-7 py-3 bg-[#111113] border-t border-[rgba(248,247,244,0.1)] flex items-center justify-between text-xs font-mono-jb text-[rgba(248,247,244,0.4)] shrink-0">
          <div>
            <span>Point of Sale v2.4</span> &bull; <span>{activeShopName} {activeBranch ? `(${activeBranch})` : ''}</span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-[#f8f7f4] cursor-pointer"
          >
            Esc or Close
          </button>
        </div>
      </div>
    </div>
  );
};
