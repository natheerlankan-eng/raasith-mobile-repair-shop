import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Wrench,
  DollarSign,
  Smartphone,
  User,
  Calendar,
  AlertCircle,
  Sparkles,
  Check,
  Clock,
} from 'lucide-react';
import { RepairJob, Technician } from '../types.ts';
import { COMMON_BRANDS } from '../data/issues.ts';

interface EditJobModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveJob: (jobId: number, updateData: any) => Promise<void>;
  technicians?: Technician[];
}

export const EditJobModal: React.FC<EditJobModalProps> = ({
  job,
  isOpen,
  onClose,
  onSaveJob,
  technicians = [],
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState<number | ''>('');
  const [sparePartsAmount, setSparePartsAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [status, setStatus] = useState<string>('Received');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && job) {
      setCustomerName(job.customerName);
      setPhoneNumber(job.phoneNumber);
      setCustomerAddress(job.customerAddress || '');
      setDeviceBrand(job.deviceBrand);
      setDeviceModel(job.deviceModel);
      setImei(job.imei || '');
      setEstimatedPrice(job.estimatedPrice);
      setSparePartsAmount(job.sparePartsAmount ?? job.totalPartsCost ?? 0);
      setNotes(job.notes || '');
      setTechnicianName(job.technicianName);
      setStatus(job.status);
      setExpectedDeliveryDate(job.expectedDeliveryDate || '');
      setExpectedDeliveryTime(job.expectedDeliveryTime || '');
      setError(null);
    }
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const basePriceNum = Number(estimatedPrice) || 0;
  const partsAmountNum = Number(sparePartsAmount) || 0;
  const advanceNum = job.advancePaid || 0;
  const totalAmount = basePriceNum + partsAmountNum;
  const newTotalDue = Math.max(0, totalAmount - advanceNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      setError('Customer name and phone number are required.');
      return;
    }
    if (!deviceBrand.trim() || !deviceModel.trim()) {
      setError('Device brand and model are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaveJob(job.id, {
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        customerAddress: customerAddress.trim() || undefined,
        deviceBrand: deviceBrand.trim(),
        deviceModel: deviceModel.trim(),
        imei: imei.trim() || undefined,
        estimatedPrice: basePriceNum,
        sparePartsAmount: partsAmountNum,
        notes: notes.trim() || undefined,
        technicianName: technicianName.trim(),
        status,
        expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.trim() : null,
        expectedDeliveryTime: expectedDeliveryTime ? expectedDeliveryTime.trim() : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update repair job.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#070e28] flex flex-col p-2 sm:p-3 text-[#f8fafc] font-mono-jb select-none animate-fadeIn">
      {/* 1. TOP HEADER (Compact, Zero Scroll Header) */}
      <div className="h-12 shrink-0 bg-[#0a1538] border border-blue-500/30 rounded-xl px-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-oswald text-base sm:text-lg font-black uppercase tracking-wider text-white">
              Edit Job Order Slip
            </h1>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono">
              {job.jobNumber}
            </span>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-lg text-xs font-bold">
              {status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-blue-200/80 bg-[#060d24] px-2.5 py-1 rounded-lg border border-blue-500/20">
            <span className="text-slate-400">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-cyan-300 outline-none text-xs font-bold cursor-pointer"
            >
              <option value="Received" className="bg-[#0a1538]">Received</option>
              <option value="In Repair" className="bg-[#0a1538]">In Repair</option>
              <option value="Waiting for Parts" className="bg-[#0a1538]">Waiting for Parts</option>
              <option value="Ready for Pickup" className="bg-[#0a1538]">Ready for Pickup</option>
              <option value="Delivered" className="bg-[#0a1538]">Delivered</option>
              <option value="Cancelled" className="bg-[#0a1538]">Cancelled</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg bg-[#0e1d48] hover:bg-rose-600/30 text-blue-300 hover:text-rose-300 border border-blue-500/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mt-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN 3-COLUMN HIGH-DENSITY DASHBOARD (Zero Vertical Scroll) */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-12 gap-2 my-2 overflow-hidden">
        {/* ========================================================================= */}
        {/* COLUMN 1: CUSTOMER & CONTACT (Cols 1-4) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-xl p-3 flex flex-col gap-2 shadow-lg flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              1. Customer Information
            </span>

            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Phone Number *</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Customer Address / Area</label>
              <input
                type="text"
                placeholder="Akkaraipattu area..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs text-blue-100 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-auto pt-2 border-t border-blue-500/20">
              <span className="text-[10px] text-blue-200/50 block">Assigned Technician:</span>
              <select
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full mt-1 bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-300 outline-none"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.name} className="bg-[#0a1538]">
                    {t.name} ({t.commissionRate}%)
                  </option>
                ))}
                <option value="Raasith" className="bg-[#0a1538]">Raasith</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: DEVICE DIAGNOSTICS & NOTES (Cols 5-8) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-xl p-3 flex flex-col gap-2 shadow-lg flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              2. Device Diagnostics
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Brand *</label>
                <input
                  type="text"
                  required
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Model *</label>
                <input
                  type="text"
                  required
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">IMEI / Serial</label>
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">
                Technician / Bench Observations & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Hardware diagnosis remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full flex-1 bg-[#050c22] border border-blue-500/30 rounded-lg p-2 text-xs text-blue-100 outline-none focus:border-emerald-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: FINANCIALS & RECALCULATED DUES (Cols 9-12) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="bg-[#0a1538] border-2 border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2 shadow-2xl flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 border-b border-emerald-500/20 pb-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              3. Service Charges & Balance Due
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">
                  Labor / Service Charge (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-400 text-right font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-amber-300 font-bold block mb-0.5">
                  Spare Parts (POS Billed)
                </label>
                <div className="w-full bg-[#050c22] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-400 font-mono flex items-center justify-between">
                  <span className="text-[10px] text-amber-200/60 font-sans">Counter Billed:</span>
                  <span>LKR {partsAmountNum.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="text-[9px] text-blue-200/50 font-sans italic">
              * Spare parts & accessories are selected from inventory and billed at POS Cashier Terminal upon collection.
            </div>

            <div className="bg-[#050c22] p-2.5 rounded-xl border border-blue-500/20 space-y-1.5 text-xs">
              <div className="flex justify-between text-blue-200/70">
                <span>Total Bill (Labor + Parts):</span>
                <span className="font-bold text-white font-mono">LKR {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-cyan-300">
                <span>Advance Already Paid:</span>
                <span className="font-bold font-mono">LKR {advanceNum.toLocaleString()}</span>
              </div>
            </div>

            {/* Expected Delivery Date & Time */}
            <div className="bg-[#050c22] p-2.5 rounded-xl border border-cyan-500/30 space-y-1.5 text-xs">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-1">
                <span className="text-[10px] uppercase font-bold text-cyan-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Expected Delivery Schedule</span>
                </span>
                <span className="text-[9px] text-blue-300/60 font-mono">Target Promise</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase text-blue-200/70 font-bold block mb-0.5">Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full bg-[#081335] border border-blue-500/30 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase text-blue-200/70 font-bold block mb-0.5">Delivery Time</label>
                  <input
                    type="time"
                    value={expectedDeliveryTime}
                    onChange={(e) => setExpectedDeliveryTime(e.target.value)}
                    className="w-full bg-[#081335] border border-blue-500/30 rounded-lg px-2 py-1 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Glowing Net Balance Bar */}
            <div className="mt-auto bg-gradient-to-r from-[#05112f] to-[#081a4a] border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">
                  New Balance Due
                </span>
                <span className="text-xs text-blue-200/60 font-mono">
                  Formula: (Labor + Parts) - Advance
                </span>
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono tracking-tight animate-pulse">
                LKR {newTotalDue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 3. ACTION FOOTER (Always Visible, Zero Scroll) */}
      <div className="h-12 shrink-0 bg-[#0a1538] border border-blue-500/30 rounded-xl px-4 flex items-center justify-between shadow-xl">
        <div className="text-[11px] text-blue-200/50 hidden sm:flex items-center gap-4">
          <span>Keyboard:</span>
          <span className="bg-[#050c22] px-2 py-0.5 rounded text-blue-300 font-mono">Esc: Cancel</span>
          <span className="bg-[#050c22] px-2 py-0.5 rounded text-blue-300 font-mono">Ctrl+Enter: Save</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-blue-500/30 text-blue-200 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-oswald text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer ring-2 ring-blue-400 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Slip...' : `Save Changes (${job.jobNumber})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
