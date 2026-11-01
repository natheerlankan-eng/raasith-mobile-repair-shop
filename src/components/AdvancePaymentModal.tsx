import React, { useState, useEffect } from 'react';
import { X, DollarSign, Plus, CheckCircle, ArrowDownCircle, RotateCcw, AlertCircle, FileText, Check, ShieldCheck } from 'lucide-react';
import { RepairJob, AdvancePayment, AdvanceApplication } from '../types.ts';

interface AdvancePaymentModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onRefreshJob?: () => void;
  onRefreshDaily?: () => void;
  // If job is null, modal acts as generic "Receive Customer Advance Deposit"
  defaultDate?: string;
  allJobs?: RepairJob[];
}

export const AdvancePaymentModal: React.FC<AdvancePaymentModalProps> = ({
  job,
  isOpen,
  onClose,
  token,
  onRefreshJob,
  onRefreshDaily,
  defaultDate,
  allJobs = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [appliedAdvances, setAppliedAdvances] = useState<(AdvanceApplication & { advance: AdvancePayment | null })[]>([]);
  const [availableAdvances, setAvailableAdvances] = useState<AdvancePayment[]>([]);

  // Apply advance form state
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<number | null>(null);
  const [applyAmount, setApplyAmount] = useState<number | ''>('');

  // Record new advance form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newAdvAmount, setNewAdvAmount] = useState<number | ''>('');
  const [newAdvDate, setNewAdvDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [newAdvNotes, setNewAdvNotes] = useState('');
  const [targetJobId, setTargetJobId] = useState<number | ''>(job ? job.id : '');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobAdvances = async () => {
    if (!token || !job) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/advances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedAdvances(data.applied || []);
        setAvailableAdvances(data.available || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFeedbackMsg(null);
      setSelectedAdvanceId(null);
      setApplyAmount('');
      if (job) {
        setNewCustName(job.customerName);
        setNewCustPhone(job.phoneNumber);
        setTargetJobId(job.id);
        fetchJobAdvances();
      } else {
        setNewCustName('');
        setNewCustPhone('');
        setTargetJobId('');
        setAppliedAdvances([]);
        setAvailableAdvances([]);
      }
      setNewAdvAmount('');
      setNewAdvDate(defaultDate || new Date().toISOString().split('T')[0]);
      setNewAdvNotes('');
    }
  }, [isOpen, job, defaultDate]);

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Apply existing advance to job
  const handleApplyAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !job || !selectedAdvanceId || !applyAmount) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply-advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          advanceId: selectedAdvanceId,
          amount: Number(applyAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply advance');

      showFeedback('success', `LKR ${applyAmount} advance applied successfully to invoice ${job.jobNumber}!`);
      setSelectedAdvanceId(null);
      setApplyAmount('');
      await fetchJobAdvances();
      onRefreshJob?.();
      onRefreshDaily?.();
    } catch (err: any) {
      showFeedback('error', err.message || 'Error applying advance payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Unapply advance from job
  const handleUnapplyAdvance = async (advanceId: number, amount?: number) => {
    if (!token || !job) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/unapply-advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          advanceId,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unapply advance');

      showFeedback('success', `Advance removed from invoice ${job.jobNumber}. Remaining advance restored in Daily Summary.`);
      await fetchJobAdvances();
      onRefreshJob?.();
      onRefreshDaily?.();
    } catch (err: any) {
      showFeedback('error', err.message || 'Error unapplying advance payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Record a new advance payment (either standalone or directly applied to job)
  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCustName.trim() || !newCustPhone.trim() || !newAdvAmount) return;

    setActionLoading(true);
    try {
      const payload: Record<string, any> = {
        customerName: newCustName.trim(),
        phoneNumber: newCustPhone.trim(),
        amount: Number(newAdvAmount),
        date: newAdvDate,
        notes: newAdvNotes.trim() || undefined,
      };

      if (targetJobId) {
        payload.applyToJobId = Number(targetJobId);
        payload.applyAmount = Number(newAdvAmount);
      }

      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record advance payment');

      showFeedback(
        'success',
        targetJobId
          ? `Advance of LKR ${newAdvAmount} recorded & applied to invoice reference!`
          : `Advance deposit of LKR ${newAdvAmount} recorded in Daily Summary as Available!`
      );

      setNewAdvAmount('');
      setNewAdvNotes('');
      if (job) {
        await fetchJobAdvances();
      } else {
        setTimeout(() => onClose(), 800);
      }
      onRefreshJob?.();
      onRefreshDaily?.();
    } catch (err: any) {
      showFeedback('error', err.message || 'Error recording advance payment');
    } finally {
      setActionLoading(false);
    }
  };

  const partsCost = job ? (job.sparePartsAmount ?? job.totalPartsCost ?? 0) : 0;
  const totalAmount = job ? job.estimatedPrice + partsCost : 0;
  const dueAmount = job ? Math.max(0, totalAmount - job.advancePaid) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <DollarSign className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">
                  {job ? `Advance Management • Slip ${job.jobNumber}` : 'Receive Advance Payment / Deposit'}
                </h3>
              </div>
              <p className="text-xs text-rose-100">
                {job
                  ? `${job.customerName} (${job.phoneNumber}) • ${job.deviceBrand} ${job.deviceModel}`
                  : 'Counter customer advance tracker • Automatic Daily Summary update'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-3.5 mx-5 mt-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Slip Financials Overview (When opened from a job) */}
          {job && (
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[10px]">Base Service</span>
                <span className="font-extrabold text-slate-900 text-sm">Rs. {job.estimatedPrice}</span>
              </div>
              <div>
                <span className="text-amber-800 font-bold uppercase block text-[10px]">Spare Parts</span>
                <span className="font-extrabold text-amber-900 text-sm">+ Rs. {partsCost}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[10px]">Advance Applied</span>
                <span className="font-extrabold text-slate-800 text-sm">Rs. {job.advancePaid}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[10px]">Balance Due</span>
                <span className={`font-black text-sm ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Rs. {dueAmount}
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: Advances Already Applied to This Slip */}
          {job && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Advances Applied to This Slip ({appliedAdvances.length})</span>
                </span>
                <span className="text-slate-500 font-semibold">Total: Rs. {job.advancePaid}</span>
              </div>

              {appliedAdvances.length === 0 ? (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs text-center">
                  No advance payments have been applied to this repair slip yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {appliedAdvances.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {app.advance?.receiptNumber || `ADV-${app.advanceId}`}
                          </span>
                          <span className="font-bold text-emerald-700">Applied: Rs. {app.amount}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Original: Rs. {app.advance?.originalAmount ?? app.amount} &bull; Remaining: Rs.{' '}
                          {app.advance?.remainingAmount ?? 0} &bull; Status:{' '}
                          <span className="font-semibold text-slate-700">{app.advance?.status || 'Applied'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUnapplyAdvance(app.advanceId, app.amount)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Remove advance from this slip and restore amount in Daily Summary"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Unapply</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Customer's Available Advance Deposits (If Any) */}
          {job && availableAdvances.length > 0 && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4 text-amber-600" />
                  <span>Customer Has Available Deposit(s) ({availableAdvances.length})</span>
                </span>
                <span className="text-[11px] font-bold text-amber-900">
                  Total Available: Rs.{' '}
                  {availableAdvances.reduce((sum, a) => sum + a.remainingAmount, 0).toLocaleString()}
                </span>
              </div>

              <form onSubmit={handleApplyAdvance} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <select
                      value={selectedAdvanceId || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedAdvanceId(id || null);
                        const adv = availableAdvances.find((a) => a.id === id);
                        if (adv) {
                          setApplyAmount(Math.min(adv.remainingAmount, dueAmount));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    >
                      <option value="">-- Choose Available Advance Deposit --</option>
                      {availableAdvances.map((adv) => (
                        <option key={adv.id} value={adv.id}>
                          {adv.receiptNumber} ({adv.date}) - Avail: Rs. {adv.remainingAmount} (Orig: Rs.{adv.originalAmount})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={applyAmount}
                      onChange={(e) => setApplyAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Amount (Rs.)"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={actionLoading || !selectedAdvanceId || !applyAmount}
                      className="w-full h-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 3: Record New Advance Payment */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>+ Record Customer Cash Advance Deposit</span>
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">Updates Daily Summary</span>
            </div>

            <form onSubmit={handleCreateAdvance} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 077 549 6969"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-semibold outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Advance Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newAdvAmount}
                    onChange={(e) => setNewAdvAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Receipt Date
                  </label>
                  <input
                    type="date"
                    value={newAdvDate}
                    onChange={(e) => setNewAdvDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Optional Target Invoice Reference
                  </label>
                  {job ? (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 font-semibold text-xs flex items-center justify-between">
                      <span>Applying directly to slip: <strong>{job.jobNumber}</strong></span>
                      <span className="text-[11px] text-blue-700 font-mono">Invoice Reference Linked</span>
                    </div>
                  ) : (
                    <select
                      value={targetJobId}
                      onChange={(e) => setTargetJobId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Leave Unapplied (Hold in Daily Summary as Available Deposit)</option>
                      {allJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          Apply to {j.jobNumber} - {j.customerName} ({j.deviceBrand} {j.deviceModel})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAdvNotes}
                    onChange={(e) => setNewAdvNotes(e.target.value)}
                    placeholder="e.g. Counter deposit for display replacement, cash received"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{targetJobId ? 'Record & Apply Advance' : 'Save Advance in Daily Summary'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
