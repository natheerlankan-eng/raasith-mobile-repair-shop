import React from 'react';
import {
  X,
  Printer,
  Shield,
  Lock,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Phone,
  Receipt,
  RotateCcw,
  Tag,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { PosBill, PosBillItem } from '../data/posData.ts';
import { useShop } from '../context/ShopContext.tsx';

interface ViewOnlyInvoiceModalProps {
  invoice: (PosBill & { items?: PosBillItem[] }) | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  shopName?: string;
  onUnlockInvoice?: (invoice: PosBill) => void;
}

export const ViewOnlyInvoiceModal: React.FC<ViewOnlyInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  currency = 'LKR',
  shopName = 'Raasith Mobile',
  onUnlockInvoice,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';
  const activeBranch = shopProfile?.branch || 'MAIN OUTLET';
  const activePhone = shopProfile?.phone || '0672277996, 0752834443';

  if (!isOpen || !invoice) return null;

  const isLocked = invoice.status === 'Locked';
  const items = invoice.items || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none no-print"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
      <div className="bg-[#081335] border-2 border-cyan-500/50 rounded-3xl w-full max-w-2xl shadow-2xl shadow-cyan-950/90 overflow-hidden flex flex-col font-mono-jb max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1844] to-[#0c1f54] border-b border-blue-500/30 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-md ${
                isLocked
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {isLocked ? <Lock className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  {invoice.billNo}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    isLocked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isLocked ? 'Locked / Parked' : 'Completed Invoice'}
                </span>
                <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span>VIEW-ONLY MODE</span>
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                {activeShopName} &bull; Cashier: {invoice.cashierName || 'Counter Cashier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Notice Banner */}
        <div className="bg-blue-950/60 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-cyan-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Strict Read-Only Mode: Historical invoices cannot be edited or modified directly.</span>
          </span>
          <span className="text-[10px] text-blue-300/60">Press [Esc] to close</span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-[#050c24] p-2.5 rounded-xl border border-blue-500/20">
              <span className="text-[10px] uppercase text-blue-300/60 font-bold block mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>Date & Time</span>
              </span>
              <strong className="text-white block truncate">{invoice.date}</strong>
              <span className="text-[10px] text-blue-300/80">{invoice.time || 'Counter Session'}</span>
            </div>

            <div className="bg-[#050c24] p-2.5 rounded-xl border border-blue-500/20">
              <span className="text-[10px] uppercase text-blue-300/60 font-bold block mb-0.5 flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-400" />
                <span>Customer</span>
              </span>
              <strong className="text-white block truncate">{invoice.customerName || 'Walk-in Customer'}</strong>
              <span className="text-[10px] text-cyan-300/80 block truncate">
                {invoice.customerPhone || 'No Phone'}
              </span>
            </div>

            <div className="bg-[#050c24] p-2.5 rounded-xl border border-blue-500/20">
              <span className="text-[10px] uppercase text-blue-300/60 font-bold block mb-0.5 flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>Payment Mode</span>
              </span>
              <strong className="text-amber-300 block">{invoice.paymentTerm} Terms</strong>
              <span className="text-[10px] text-blue-300/80">{invoice.paymentMethod}</span>
            </div>

            <div className="bg-[#050c24] p-2.5 rounded-xl border border-blue-500/20">
              <span className="text-[10px] uppercase text-blue-300/60 font-bold block mb-0.5 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-indigo-400" />
                <span>Linked Job</span>
              </span>
              <strong className="text-indigo-300 block truncate">
                {invoice.linkedJobNumber ? `Job #${invoice.linkedJobNumber}` : 'Direct Retail'}
              </strong>
              <span className="text-[10px] text-blue-300/80 truncate">
                {invoice.deviceInfo || 'Standard Sale'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-[#050c24] rounded-2xl border border-blue-500/25 overflow-hidden shadow-inner">
            <div className="p-2.5 bg-[#08102a] border-b border-blue-500/20 flex items-center justify-between text-xs font-bold text-cyan-300">
              <span>INVOICE LINE ITEMS ({items.length})</span>
              <span className="text-[10px] text-blue-300/60 font-normal">All rates fixed at sale</span>
            </div>
            <div className="overflow-x-auto max-h-56 divide-y divide-blue-500/10">
              <table className="w-full text-left text-xs font-mono-jb">
                <thead className="bg-[#0a1638] text-blue-200 text-[11px] uppercase sticky top-0">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Disc</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10 text-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-blue-300/50">
                        No line items recorded for this invoice.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-blue-600/10">
                        <td className="py-2 px-3 text-blue-300/60">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-white">{it.name || it.itemName}</div>
                          <span className="text-[10px] font-mono-jb text-blue-400">
                            {it.code || it.itemCode || 'ITEM'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{it.qty}</td>
                        <td className="py-2 px-3 text-right text-blue-200">
                          {currency} {(it.price || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-300">
                          {it.discount ? `-${currency} ${it.discount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-cyan-300">
                          {currency} {(it.total || (it.price || 0) * (it.qty || 1)).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Summary Cards */}
          <div className="bg-[#0c183d] rounded-2xl p-4 border border-blue-500/25 space-y-2 text-xs">
            <div className="flex items-center justify-between text-blue-200/80">
              <span>Gross Subtotal:</span>
              <strong className="text-white">{currency} {(invoice.subtotal || invoice.netTotal || 0).toLocaleString()}</strong>
            </div>

            {invoice.discount ? (
              <div className="flex items-center justify-between text-amber-300">
                <span>Discount Applied:</span>
                <strong>-{currency} {invoice.discount.toLocaleString()}</strong>
              </div>
            ) : null}

            {invoice.returns ? (
              <div className="flex items-center justify-between text-rose-300">
                <span>Sales Returns Deducted:</span>
                <strong>-{currency} {invoice.returns.toLocaleString()}</strong>
              </div>
            ) : null}

            {invoice.advancePaid ? (
              <div className="flex items-center justify-between text-emerald-300">
                <span>Job Advance Deposited:</span>
                <strong>-{currency} {invoice.advancePaid.toLocaleString()}</strong>
              </div>
            ) : null}

            {invoice.advanceApplied ? (
              <div className="flex items-center justify-between text-cyan-300">
                <span>Customer Advance Applied:</span>
                <strong>-{currency} {invoice.advanceApplied.toLocaleString()}</strong>
              </div>
            ) : null}

            <div className="pt-2 border-t border-blue-500/25 flex items-center justify-between text-sm sm:text-base font-bold">
              <span className="uppercase text-yellow-300 tracking-wider">Net Amount:</span>
              <span className="font-black text-yellow-400 text-xl font-mono-jb">
                {currency} {invoice.netTotal.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-blue-300/80 pt-1 border-t border-blue-500/15">
              <span>Amount Paid / Tendered:</span>
              <strong className="text-emerald-400">{currency} {(invoice.paidAmount || invoice.netTotal || 0).toLocaleString()}</strong>
            </div>

            {invoice.balanceDue ? (
              <div className="flex items-center justify-between text-xs text-rose-300">
                <span>Credit Balance Due:</span>
                <strong className="text-rose-400">{currency} {invoice.balanceDue.toLocaleString()}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#050c24] border-t border-blue-500/30 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {isLocked && onUnlockInvoice && (
              <button
                type="button"
                onClick={() => {
                  onUnlockInvoice(invoice);
                  onClose();
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-oswald text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Unlock & Resume in POS</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-4 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 hover:text-white font-oswald text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal Copy</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-[#0f1d46] hover:bg-[#1a2d68] text-white border border-blue-500/30 font-oswald text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    {/* Dedicated Printable 80mm Thermal Receipt */}
    <div className="print-only print-thermal-receipt">
      <div style={{ maxWidth: '80mm', margin: '0 auto', color: '#000000', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.35, padding: '4px' }}>
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
            {activeShopName}
          </h2>
          <p style={{ margin: '0 0 2px 0', fontSize: '10px' }}>{activeBranch}</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '10px' }}>TEL: {activePhone}</p>
          <div style={{ borderTop: '1px dotted #000', paddingTop: '4px', marginTop: '4px', fontSize: '10px' }}>
            <div><strong>INVOICE:</strong> {invoice.billNo} {isLocked ? '(LOCKED/PARKED)' : ''}</div>
            <div><strong>DATE:</strong> {invoice.date} {invoice.time || ''}</div>
            <div><strong>CUSTOMER:</strong> {invoice.customerName} {invoice.customerPhone ? `(${invoice.customerPhone})` : ''}</div>
            <div><strong>CASHIER:</strong> {invoice.cashierName || 'Counter Cashier'}</div>
          </div>
        </div>

        {/* Itemized Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '8px' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000', textAlign: 'left' }}>
              <th style={{ padding: '2px 0' }}>Item Description</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                <td style={{ padding: '2px 0' }}>{it.name}</td>
                <td style={{ textAlign: 'center' }}>{it.qty}</td>
                <td style={{ textAlign: 'right' }}>{(it.price || 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{(it.total || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '11px', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Gross Subtotal:</span>
            <span>{currency} {(invoice.subtotal || 0).toLocaleString()}</span>
          </div>
          {(invoice.discount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount:</span>
              <span>-{currency} {invoice.discount?.toLocaleString()}</span>
            </div>
          )}
          {(invoice.returns || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Returns Deduction:</span>
              <span>-{currency} {invoice.returns?.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '12px', padding: '2px 0', margin: '3px 0' }}>
            <span>NET TOTAL:</span>
            <span>{currency} {(invoice.netTotal || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Method:</span>
            <span>{invoice.paymentMethod || 'Cash'} ({invoice.paymentTerm || 'Cash'})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Amount Paid:</span>
            <span>{currency} {(invoice.paidAmount || invoice.netTotal || 0).toLocaleString()}</span>
          </div>
          {(invoice.balanceDue || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#000' }}>
              <span>Credit Balance Due:</span>
              <span>{currency} {invoice.balanceDue?.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '6px', marginTop: '10px', fontSize: '9px' }}>
          <p style={{ margin: '0 0 2px 0' }}>Warranty valid only with original invoice slip.</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Thank You! Visit Again!</p>
        </div>
      </div>
    </div>
  </>
);
};
