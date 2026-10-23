import React, { useEffect } from 'react';
import {
  Layers,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PosItem, ItemBatch } from '../data/posData.ts';

interface BatchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PosItem | null;
  qty?: number;
  batches: ItemBatch[];
  currency?: string;
  onSelectBatch: (batch: ItemBatch) => void;
}

export const BatchSelectionModal: React.FC<BatchSelectionModalProps> = ({
  isOpen,
  onClose,
  item,
  qty = 1,
  batches,
  currency = 'Rs',
  onSelectBatch,
}) => {
  // Listen for keyboard shortcuts (1, 2, 3... or Esc) for zero-mouse cashier flow
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Check numeric keys 1..9
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= batches.length) {
        e.preventDefault();
        const selected = batches[num - 1];
        if (selected) {
          onSelectBatch(selected);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, batches, onSelectBatch, onClose]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono-jb animate-fadeIn select-none">
      <div className="bg-[#091333] border-2 border-cyan-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#060c22] border-b border-cyan-500/20 p-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-xl uppercase tracking-wider font-extrabold text-white">
                  Select Pricing Batch
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase">
                  Batch-Wise Margin Protection
                </span>
              </div>
              <p className="text-xs text-blue-200/70 mt-0.5">
                {item.name} &bull; SKU: <span className="text-cyan-300 font-bold">{item.code}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-300 hover:text-white p-2 rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guidance Notice */}
        <div className="bg-[#0b173e] px-6 py-3 border-b border-blue-500/20 flex items-center gap-2.5 text-xs text-blue-200/90 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Multiple active stock intake batches found. Select the batch you are dispensing from to bill with exact FIFO cost and secure target profit margins.
          </span>
        </div>

        {/* Batch Selection Cards */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {batches.map((batch, index) => {
            const marginAmount = Math.max(0, batch.sellingPrice - batch.costPrice);
            const marginPercent =
              batch.sellingPrice > 0 ? Math.round((marginAmount / batch.sellingPrice) * 100) : 0;
            const isSufficient = batch.remainingQty >= qty;

            return (
              <div
                key={batch.id || batch.batchNumber}
                onClick={() => isSufficient && onSelectBatch(batch)}
                className={`rounded-2xl border transition-all p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group ${
                  isSufficient
                    ? 'bg-[#08102a] hover:bg-[#0c1840] border-blue-500/30 hover:border-cyan-400 shadow-md hover:shadow-cyan-500/20'
                    : 'bg-[#060b1e]/60 border-red-500/20 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Left Column: Batch & Purchase Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-cyan-600/30 border border-cyan-400/40 text-cyan-300 font-black text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                      {batch.batchNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-900/50 border border-blue-400/30 text-[10px] text-cyan-200 font-semibold">
                      GRN: {batch.grnNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-blue-200/70 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Purchased: {batch.purchaseDate}</span>
                    </span>
                    {batch.supplierName && (
                      <span className="text-blue-300/80">&bull; Supplier: {batch.supplierName}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-blue-300/80">Batch Stock Remaining:</span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded ${
                        batch.remainingQty > 5
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {batch.remainingQty} units available
                    </span>
                  </div>
                </div>

                {/* Right Column: Pricing & Margin Details */}
                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 border-blue-500/20 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right space-y-0.5">
                    <div className="text-[10px] uppercase text-blue-300/60 font-semibold">
                      Cost: {currency} {batch.costPrice.toLocaleString()}
                    </div>
                    <div className="font-oswald text-xl sm:text-2xl font-black text-emerald-400">
                      {currency} {batch.sellingPrice.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-emerald-300/90 font-bold flex items-center sm:justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>+{marginPercent}% Margin (+{currency} {marginAmount.toLocaleString()})</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isSufficient}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSufficient) onSelectBatch(batch);
                    }}
                    className={`py-2 px-3.5 rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      isSufficient
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30 group-hover:scale-105'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Bill Batch</span>
                    <kbd className="hidden sm:inline-block bg-cyan-900/80 px-1.5 py-0.5 rounded text-[10px] font-mono border border-cyan-400/40">
                      {index + 1}
                    </kbd>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#060c22] border-t border-cyan-500/20 px-6 py-3.5 flex items-center justify-between text-xs text-blue-300/70 shrink-0">
          <div className="flex items-center gap-2">
            <kbd className="bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-400/30 text-white font-bold text-[10px]">
              1..{batches.length}
            </kbd>
            <span>Quick Select Number</span>
            <span>&bull;</span>
            <kbd className="bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-400/30 text-white font-bold text-[10px]">
              Esc
            </kbd>
            <span>Cancel</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-blue-300 hover:text-white hover:bg-white/10 font-bold cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
