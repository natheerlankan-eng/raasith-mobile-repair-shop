import React, { useState, useEffect } from 'react';
import { X, Wrench, Plus, Trash2, Save, DollarSign, Cpu, Check, AlertCircle } from 'lucide-react';
import { RepairJob, SparePart } from '../types.ts';

interface SparePartsModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveParts: (jobId: number, parts: SparePart[], sparePartsAmount?: number) => Promise<void>;
}

export const SparePartsModal: React.FC<SparePartsModalProps> = ({
  job,
  isOpen,
  onClose,
  onSaveParts,
}) => {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [partName, setPartName] = useState('');
  const [partCost, setPartCost] = useState<number | ''>('');
  const [partQty, setPartQty] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      try {
        const parsed = job.spareParts ? JSON.parse(job.spareParts) : [];
        setParts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setParts([]);
      }
      setPartName('');
      setPartCost('');
      setPartQty(1);
      setSavedSuccess(false);
    }
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) return;

    const newPart: SparePart = {
      id: Math.random().toString(36).substring(2, 9),
      name: partName.trim(),
      cost: Number(partCost) || 0,
      qty: Math.max(1, Number(partQty) || 1),
    };

    setParts([...parts, newPart]);
    setPartName('');
    setPartCost('');
    setPartQty(1);
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  const totalPartsCost = parts.reduce((sum, p) => sum + (p.cost * p.qty), 0);
  const existingDue = Math.max(0, job.estimatedPrice - job.advancePaid);
  const newTotalAmount = job.estimatedPrice + totalPartsCost;
  const newTotalDue = Math.max(0, newTotalAmount - job.advancePaid);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveParts(job.id, parts, totalPartsCost);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const COMMON_PARTS_PRESETS = [
    'Original OLED Display',
    'Incell Display Replacement',
    'Original Battery',
    'Charging Port / C/C Pin Flex',
    'Earpiece Speaker',
    'Loudspeaker Module',
    'Main Microphone Flex',
    'Power / Volume Flex Cable',
    'Back Glass / Housing',
    'Camera Glass Lens',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">Spare Parts Used</h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {job.jobNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {job.deviceBrand} {job.deviceModel} &bull; {job.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Spare parts saved successfully!</span>
            </div>
          )}

          {/* Add Part Form */}
          <form onSubmit={handleAddPart} className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block">
              + Add Spare Part Used in Repair
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Part Name (e.g. OLED Screen, Battery...)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="number"
                  min="0"
                  value={partCost}
                  onChange={(e) => setPartCost(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Cost (Rs.)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-3 flex gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                  placeholder="Qty"
                  className="w-16 px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Quick Part Presets */}
            <div className="flex flex-wrap gap-1 pt-1">
              {COMMON_PARTS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPartName(preset)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </form>

          {/* Parts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Parts Installed ({parts.length})</span>
              <span>Subtotal</span>
            </div>

            {parts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No spare parts added to this repair job yet.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {parts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemovePart(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-slate-800">{p.name}</span>
                      <span className="text-slate-400 font-medium">
                        x{p.qty} @ Rs.{p.cost}
                      </span>
                    </div>
                    <span className="font-mono font-black text-slate-900">
                      Rs. {p.cost * p.qty}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Due Amount Recalculation Summary */}
          <div className="bg-slate-100 p-4 rounded-2xl space-y-2 text-xs font-semibold border border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Existing Due Amount:</span>
              <span className="font-bold text-slate-800 text-sm">Rs. {existingDue}</span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>+ Spare Parts Amount:</span>
              <span className="font-black text-sm text-amber-900">+ Rs. {totalPartsCost}</span>
            </div>
            {job.advancePaid > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Advance Already Paid:</span>
                <span>- Rs. {job.advancePaid}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-300 text-slate-900 font-extrabold text-sm">
              <span>New Total Due:</span>
              <span className="text-rose-600 font-black text-base">Rs. {newTotalDue}</span>
            </div>
            <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-medium leading-relaxed">
              <strong>Formula:</strong> New Total Due = Existing Due (Rs. {existingDue}) + Spare Parts Amount (Rs. {totalPartsCost}) = <strong className="text-slate-900">Rs. {newTotalDue}</strong>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Spare Parts'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
