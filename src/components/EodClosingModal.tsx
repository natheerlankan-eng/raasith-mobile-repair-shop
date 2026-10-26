import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  User,
  ShoppingBag,
  Truck,
  Receipt,
  Layers,
  Sparkles,
  Power
} from 'lucide-react';
import { PosBill } from '../data/posData.ts';
import { EODPrintPreviewModal } from './EODPrintPreviewModal.tsx';
import { useShop } from '../context/ShopContext.tsx';

interface EodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  currency?: string;
  shopName?: string;
  onOpenLockedInvoice?: (invoice: PosBill) => void;
  onEodClosed?: () => void;
}

export const EodClosingModal: React.FC<EodClosingModalProps> = ({
  isOpen,
  onClose,
  token,
  currency = 'LKR',
  shopName = 'Raasith Mobile',
  onOpenLockedInvoice,
  onEodClosed,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';

  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [lockedInvoices, setLockedInvoices] = useState<any[]>([]);
  const [canClose, setCanClose] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nextDate, setNextDate] = useState<string>('');
  const [eodSummaryData, setEodSummaryData] = useState<any | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'both' | 'cashflow' | 'detailed'>('both');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isClosedSession, setIsClosedSession] = useState(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);

  // Function to handle logout and redirect to login page
  const handleLogoutAndRedirect = () => {
    localStorage.removeItem('raasith_staff_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const fetchValidationAndSummary = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/pos/eod/summary', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCanClose(Boolean(data.canClose));
        setLockedInvoices(data.lockedInvoices || []);
        setCurrentDate(data.date || new Date().toISOString().split('T')[0]);
        setNextDate(data.nextDate || '');
        setEodSummaryData(data);
      }
    } catch (err: any) {
      console.error('Failed to validate EOD and load summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessNotice(null);
      setIsClosedSession(false);
      fetchValidationAndSummary();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteEodClosing = async () => {
    if (!canClose) return;

    setClosing(true);
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/pos/eod/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete EOD closing');
      }

      setSuccessNotice(data.message || `End of Day (EOD) closing completed successfully for ${currentDate}.`);
      setIsClosedSession(true);
      onEodClosed?.();
      
      // Automatically clear session and redirect to login page after successful EOD closing
      setTimeout(() => {
        handleLogoutAndRedirect();
      }, 2000);

    } catch (err: any) {
      alert(err.message || 'EOD closing failed');
    } finally {
      setClosing(false);
    }
  };

  const handlePrintReports = () => {
    setShowPrintPreviewModal(true);
  };

  const r1 = eodSummaryData?.report1CashFlow;
  const r2 = eodSummaryData?.report2Detailed;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-mono-jb no-print"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (isClosedSession) {
              handleLogoutAndRedirect();
            } else {
              onClose();
            }
          }
        }}
      >
      <div className="bg-[#081335] border-2 border-rose-500/50 rounded-3xl w-full max-w-4xl shadow-2xl shadow-rose-950/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#21060c] via-[#0f1840] to-[#0a1844] border-b border-rose-500/30 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-lg ${
                isClosedSession
                  ? 'bg-blue-500/20 border-blue-400 text-cyan-300'
                  : canClose
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-rose-900/40 border-rose-500/60 text-rose-300'
              }`}
            >
              <Power className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  END OF DAY (EOD) CLOSING & FINANCIAL AUDIT
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    isClosedSession
                      ? 'bg-blue-500/20 text-cyan-300 border-blue-400'
                      : canClose
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isClosedSession ? 'Day Closed' : canClose ? 'Ready to Close' : 'Blocked'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                {shopName} &bull; Register Reconciliation & Automated Closing Reports
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isClosedSession) {
                handleLogoutAndRedirect();
              } else {
                onClose();
              }
            }}
            className="text-blue-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(92vh-140px)]">
          {loading && !eodSummaryData ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-cyan-300">
              <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
              <span className="text-xs font-bold">Auditing transactions, locked bills & financial ledgers...</span>
            </div>
          ) : !canClose ? (
            /* 1. BLOCKED STATE: Locked or open unsettled invoices exist */
            <div className="space-y-4">
              <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>EOD Closing Blocked: Unsettled Invoices Detected</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  The system detected <strong>{lockedInvoices.length} locked or parked invoice(s)</strong>.
                  Before performing End of Day closing, all locked transactions must be either settled in POS
                  or unlocked/cleared to ensure financial books balance.
                </p>
              </div>

              {/* Locked Invoices List */}
              <div className="bg-[#050c24] rounded-2xl border border-rose-500/30 overflow-hidden">
                <div className="p-3 bg-[#0a1438] border-b border-rose-500/20 flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>LOCKED INVOICES PENDING SETTLEMENT ({lockedInvoices.length})</span>
                  </span>
                  <button
                    onClick={fetchValidationAndSummary}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-audit</span>
                  </button>
                </div>

                <div className="divide-y divide-blue-500/10 max-h-56 overflow-y-auto">
                  {lockedInvoices.map((inv) => (
                    <div
                      key={inv.id || inv.billNo}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-blue-600/10 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{inv.billNo}</span>
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.2 rounded font-bold">
                            LOCKED
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-200/70">
                          {inv.customerName} ({inv.customerPhone || 'Walk-in'})
                        </div>
                        <div className="text-[10px] text-blue-300/50">
                          Date: {inv.date} &bull; Time: {inv.time}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div className="font-black text-yellow-400 text-xs sm:text-sm">
                          {currency} {(inv.netTotal || 0).toLocaleString()}
                        </div>
                        {onOpenLockedInvoice && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenLockedInvoice(inv);
                              onClose();
                            }}
                            className="py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 rounded-lg border border-amber-500/40 text-[10px] uppercase font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Resume</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 2. READY OR CLOSED STATE: Displays Date Confirmation & Two Primary Reports */
            <div className="space-y-5">
              {/* Date Details & Status Confirmation Card */}
              <div className="bg-[#050c24] border border-blue-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-blue-300/80 font-bold uppercase tracking-wider">
                      Operating Business Day Reconciliation
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Current Date: <strong className="text-cyan-300 font-mono-jb">{currentDate}</strong></span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                      <span>Next Date: <strong className="text-emerald-400 font-mono-jb">{nextDate || 'Next Day'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>0 Locked Invoices (Audit Clean)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handlePrintReports}
                    className="py-1.5 px-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Reports</span>
                  </button>
                </div>
              </div>

              {successNotice && (
                <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{successNotice} Redirecting to login page...</span>
                </div>
              )}

              {/* REPORT TABS SELECTOR */}
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveReportTab('both')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeReportTab === 'both'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-[#0a1538] text-blue-200/70 hover:text-white'
                    }`}
                  >
                    All Reports (Combined View)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReportTab('cashflow')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeReportTab === 'cashflow'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[#0a1538] text-blue-200/70 hover:text-white'
                    }`}
                  >
                    Report 1: Cash Flow Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReportTab('detailed')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeReportTab === 'detailed'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-[#0a1538] text-blue-200/70 hover:text-white'
                    }`}
                  >
                    Report 2: Transactions & Credit
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* REPORT 1: CASH FLOW SUMMARY REPORT                        */}
              {/* ========================================================= */}
              {(activeReportTab === 'both' || activeReportTab === 'cashflow') && r1 && (
                <div className="bg-[#050c24] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
                          REPORT 1: CASH FLOW & DRAWER SUMMARY REPORT
                        </h4>
                        <p className="text-[10px] text-emerald-300/80">
                          Daily Sales, Cash Inflows, Cash Expenses & Closing Drawer Balance
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                      {currentDate}
                    </span>
                  </div>

                  {/* 4 Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Total Cash In */}
                    <div className="bg-[#072418] border border-emerald-500/40 rounded-xl p-3">
                      <span className="text-[10px] uppercase text-emerald-300/80 font-bold block">Total Cash In</span>
                      <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono-jb mt-0.5">
                        {currency} {(r1.totalCashIn || 0).toLocaleString()}
                      </div>
                      <span className="text-[9px] text-emerald-300/60 font-semibold">Cash Sales + Advances</span>
                    </div>

                    {/* Total Cash Out */}
                    <div className="bg-[#240c0f] border border-rose-500/40 rounded-xl p-3">
                      <span className="text-[10px] uppercase text-rose-300/80 font-bold block">Total Cash Out</span>
                      <div className="text-lg sm:text-xl font-black text-rose-400 font-mono-jb mt-0.5">
                        {currency} {(r1.totalCashOut || 0).toLocaleString()}
                      </div>
                      <span className="text-[9px] text-rose-300/60 font-semibold">Operating Cash Expenses</span>
                    </div>

                    {/* Net Cash Drawer Balance */}
                    <div className="bg-[#1f1a04] border border-yellow-400/50 rounded-xl p-3">
                      <span className="text-[10px] uppercase text-yellow-300/80 font-bold block">Net Drawer Balance</span>
                      <div className="text-lg sm:text-xl font-black text-yellow-400 font-mono-jb mt-0.5">
                        {currency} {(r1.netCashDrawer || 0).toLocaleString()}
                      </div>
                      <span className="text-[9px] text-yellow-200/60 font-semibold">Physical Cash Expected</span>
                    </div>

                    {/* Overall Daily Sales */}
                    <div className="bg-[#0b1b42] border border-cyan-500/40 rounded-xl p-3">
                      <span className="text-[10px] uppercase text-cyan-300/80 font-bold block">Total Daily Sales</span>
                      <div className="text-lg sm:text-xl font-black text-cyan-400 font-mono-jb mt-0.5">
                        {currency} {(r1.totalDailySales || 0).toLocaleString()}
                      </div>
                      <span className="text-[9px] text-cyan-300/60 font-semibold">Net Recognized Revenue</span>
                    </div>
                  </div>

                  {/* Cash Flow Breakdown Table */}
                  <div className="bg-[#08102a] rounded-xl border border-blue-500/20 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-300 border-b border-blue-500/10 pb-1.5">
                      <span>Cash Tendered from POS Sales:</span>
                      <strong className="text-emerald-400 font-mono-jb">+{currency} {(r1.totalCashSales || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 border-b border-blue-500/10 pb-1.5">
                      <span>Customer Advances / Job Deposits Received:</span>
                      <strong className="text-emerald-400 font-mono-jb">+{currency} {(r1.totalCustomerAdvances || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 border-b border-blue-500/10 pb-1.5">
                      <span>Cash Paid for Operating Expenses:</span>
                      <strong className="text-rose-400 font-mono-jb">-{currency} {(r1.totalCashExpenses || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-white font-bold pt-1">
                      <span className="uppercase text-yellow-300">Net Cash Drawer Reconciliation:</span>
                      <strong className="text-yellow-400 text-sm font-mono-jb">{currency} {(r1.netCashDrawer || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* REPORT 2: DETAILED DAILY CLOSING & TRANSACTION REPORT     */}
              {/* ========================================================= */}
              {(activeReportTab === 'both' || activeReportTab === 'detailed') && r2 && (
                <div className="bg-[#050c24] border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
                          REPORT 2: DETAILED DAILY CLOSING & TRANSACTION REPORT
                        </h4>
                        <p className="text-[10px] text-cyan-300/80">
                          Structured Outflows/Expenses (Left) vs Inflows, Sales & Itemized Customer Dues (Right)
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                      {currentDate}
                    </span>
                  </div>

                  {/* Two-Column Structured Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LEFT SIDE: OUTFLOWS & EXPENSES */}
                    <div className="bg-[#07102e] border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between border-b border-rose-500/30 pb-2 mb-3">
                          <span className="font-oswald text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                            <span>LEFT SIDE: OUTFLOWS & EXPENSES</span>
                          </span>
                          <span className="text-xs font-bold text-rose-400 font-mono-jb">
                            {currency} {(r2.outflows?.totalOutflows || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* 1. Purchases / Stock Received Notes (GRN) */}
                        <div className="space-y-2 mb-3">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-400" />
                            <span>Purchases & Stock Receipts (GRN)</span>
                          </span>
                          {r2.outflows?.purchases?.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No GRN stock purchases posted today.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {r2.outflows.purchases.map((p: any, idx: number) => (
                                <div key={idx} className="bg-[#050b20] p-2 rounded-lg flex justify-between items-center text-xs border border-blue-500/10">
                                  <div>
                                    <div className="font-bold text-white text-[11px]">{p.grnNumber} &bull; {p.supplierName}</div>
                                    <div className="text-[10px] text-slate-400">Ref: {p.invoiceRef || 'N/A'}</div>
                                  </div>
                                  <span className="font-bold text-rose-300 font-mono-jb">
                                    {currency} {(p.totalCost || 0).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. Operating & Business Expenses */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-rose-400" />
                            <span>Operating & Business Expenses</span>
                          </span>
                          {r2.outflows?.expenses?.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No operating expenses recorded today.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {r2.outflows.expenses.map((exp: any, idx: number) => (
                                <div key={idx} className="bg-[#050b20] p-2 rounded-lg flex justify-between items-center text-xs border border-blue-500/10">
                                  <div>
                                    <div className="font-bold text-white text-[11px]">{exp.title}</div>
                                    <div className="text-[10px] text-slate-400">{exp.category} &bull; {exp.paymentMethod}</div>
                                  </div>
                                  <span className="font-bold text-rose-300 font-mono-jb">
                                    {currency} {(exp.amount || 0).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Outflows Summary Bar */}
                      <div className="bg-rose-950/40 border-t border-rose-500/30 pt-2 flex justify-between items-center text-xs font-bold text-rose-300">
                        <span>Total Outflows & Expenses:</span>
                        <span className="text-sm text-rose-400 font-mono-jb">
                          {currency} {(r2.outflows?.totalOutflows || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT SIDE: INFLOWS, SALES & ITEMIZED CREDIT WITH CUSTOMER DUES */}
                    <div className="bg-[#07102e] border border-cyan-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-3">
                          <span className="font-oswald text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-cyan-400" />
                            <span>RIGHT SIDE: INFLOWS & SALES</span>
                          </span>
                          <span className="text-xs font-bold text-cyan-400 font-mono-jb">
                            {currency} {(r2.inflows?.totalInflows || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Revenue Breakdown */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className="bg-[#050b20] p-2 rounded-lg border border-blue-500/10">
                            <span className="text-[10px] text-slate-400 block uppercase">Cash Sales:</span>
                            <strong className="text-emerald-400 font-mono-jb">
                              {currency} {(r2.inflows?.totalCashSales || 0).toLocaleString()}
                            </strong>
                          </div>
                          <div className="bg-[#050b20] p-2 rounded-lg border border-blue-500/10">
                            <span className="text-[10px] text-slate-400 block uppercase">Card & Bank Sales:</span>
                            <strong className="text-blue-300 font-mono-jb">
                              {currency} {((r2.inflows?.totalCardSales || 0) + (r2.inflows?.totalBankSales || 0)).toLocaleString()}
                            </strong>
                          </div>
                        </div>

                        {/* ITEMIZED CREDIT SALES & CUSTOMER TOTAL DUE INTEGRATION */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-yellow-300 flex items-center gap-1">
                              <Receipt className="w-3 h-3 text-yellow-400" />
                              <span>Itemized Credit Sales & Customer Dues</span>
                            </span>
                            <span className="text-[10px] font-bold text-yellow-400 font-mono-jb">
                              Total Credit: {currency} {(r2.inflows?.totalCreditSales || 0).toLocaleString()}
                            </span>
                          </div>

                          {r2.inflows?.creditSalesItems?.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No credit sales issued today.</p>
                          ) : (
                            <div className="space-y-2 max-h-52 overflow-y-auto">
                              {r2.inflows.creditSalesItems.map((c: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-[#04091a] p-2.5 rounded-xl border border-yellow-500/30 space-y-1 hover:border-yellow-400 transition-colors"
                                >
                                  {/* Line 1: Customer Name and Today's Credit Sales */}
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-white flex items-center gap-1">
                                      <User className="w-3 h-3 text-yellow-400" />
                                      <span>{c.customerName}</span>
                                      {c.customerPhone && (
                                        <span className="text-[10px] text-slate-400 font-normal">({c.customerPhone})</span>
                                      )}
                                    </span>
                                    <span className="font-black text-yellow-400 font-mono-jb">
                                      Sales: {currency} {(c.creditAmount || 0).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Line 2: Customer Due Integration (Total Cumulative Due beneath name) */}
                                  <div className="flex justify-between items-center pt-1 border-t border-yellow-500/15 text-[10px]">
                                    <span className="text-rose-300 font-bold uppercase tracking-wider">
                                      Total Cumulative Due / Outstanding Balance:
                                    </span>
                                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-black font-mono-jb">
                                      {currency} {(c.cumulativeDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* All Active Credit Debtors Schedule */}
                          {r2.inflows?.outstandingCreditCustomers && r2.inflows.outstandingCreditCustomers.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-blue-500/20 space-y-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold uppercase tracking-wider text-rose-300">
                                  Cumulative Outstanding Debtors ({r2.inflows.outstandingCreditCustomers.length} Accounts):
                                </span>
                                <span className="font-bold text-rose-400 font-mono-jb">
                                  Total Due: {currency} {(r2.inflows.totalDebtorsBalance || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {r2.inflows.outstandingCreditCustomers.map((debtor: any) => (
                                  <div
                                    key={debtor.id}
                                    className="bg-[#04091a] px-2 py-1.5 rounded-lg border border-rose-500/20 flex justify-between items-center text-[10px]"
                                  >
                                    <div>
                                      <span className="font-bold text-white">{debtor.customerName}</span>
                                      <span className="text-slate-400 ml-1.5">({debtor.phoneNumber})</span>
                                    </div>
                                    <span className="font-bold text-rose-400 font-mono-jb">
                                      {currency} {(debtor.creditDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Inflows Summary Bar */}
                      <div className="bg-cyan-950/40 border-t border-cyan-500/30 pt-2 flex justify-between items-center text-xs font-bold text-cyan-300">
                        <span>Total Inflows (Daily Net Sales):</span>
                        <span className="text-sm text-cyan-400 font-mono-jb">
                          {currency} {(r2.inflows?.totalInflows || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#050c24] border-t border-blue-500/30 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isClosedSession) {
                  handleLogoutAndRedirect();
                } else {
                  onClose();
                }
              }}
              className="py-2.5 px-4 bg-[#0c183d] hover:bg-[#142352] text-blue-200 rounded-xl font-oswald text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
            >
              {isClosedSession ? 'Exit & Login' : 'Cancel'}
            </button>

            {eodSummaryData && (
              <button
                type="button"
                onClick={handlePrintReports}
                className="py-2.5 px-4 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 hover:text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Both Reports</span>
              </button>
            )}
          </div>

          {!isClosedSession && canClose && (
            <button
              type="button"
              disabled={closing || loading}
              onClick={handleExecuteEodClosing}
              className="py-2.5 px-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-60"
            >
              <Power className="w-4 h-4 text-rose-200" />
              <span>{closing ? 'Closing Register & Generating Reports...' : 'Confirm & Complete EOD Closing'}</span>
            </button>
          )}
        </div>
      </div>
    </div>

    {/* ========================================================================= */}
    {/* DEDICATED PRINTABLE EOD AUDIT REPORTS (Active only during window.print())  */}
    {/* ========================================================================= */}
    {!showPrintPreviewModal && (
      <div className="print-only print-eod-report">
      <div style={{ maxWidth: '190mm', margin: '0 auto', color: '#000000', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.4 }}>
        {/* Report Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
            {shopName}
          </h2>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold' }}>
            END OF DAY (EOD) FINANCIAL RECONCILIATION & AUDIT REPORT
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '6px' }}>
            <span><strong>Operating Date:</strong> {currentDate}</span>
            <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
            <span><strong>Next Business Date:</strong> {nextDate || 'N/A'}</span>
          </div>
        </div>

        {/* 1. CASH FLOW & DRAWER RECONCILIATION TABLE */}
        {r1 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              1. Cash Flow & Drawer Balance Reconciliation
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '3px 0' }}>Cash Received from POS Sales:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{currency} {(r1.totalCashSales || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '3px 0' }}>Customer Advances & Job Deposits:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{currency} {(r1.totalCustomerAdvances || 0).toLocaleString()}</td>
                </tr>
                {r1.totalJobCashPayments > 0 && (
                  <tr style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ padding: '3px 0' }}>Direct Repair Job Cash Payments:</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{currency} {(r1.totalJobCashPayments || 0).toLocaleString()}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #000', fontWeight: 'bold' }}>
                  <td style={{ padding: '4px 0' }}>TOTAL CASH INFLOWS:</td>
                  <td style={{ textAlign: 'right' }}>+{currency} {(r1.totalCashIn || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '3px 0' }}>Operating Cash Expenses Paid:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>-{currency} {(r1.totalCashExpenses || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid #000', fontWeight: 'bold', fontSize: '11px' }}>
                  <td style={{ padding: '5px 0' }}>NET CASH DRAWER BALANCE (EXPECTED PHYSICAL CASH):</td>
                  <td style={{ textAlign: 'right' }}>{currency} {(r1.netCashDrawer || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 2. REVENUE & REVENUE RECOGNITION */}
        {r1 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              2. Daily Sales & Revenue Breakdown
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '3px 0' }}>Gross Sales:</td>
                  <td style={{ textAlign: 'right' }}>{currency} {(r1.totalGrossSales || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '3px 0' }}>Discounts Allowed:</td>
                  <td style={{ textAlign: 'right' }}>-{currency} {(r1.totalDiscount || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '3px 0' }}>Returns / Adjustments:</td>
                  <td style={{ textAlign: 'right' }}>-{currency} {(r1.totalReturns || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #000', fontWeight: 'bold' }}>
                  <td style={{ padding: '4px 0' }}>NET DAILY SALES REVENUE:</td>
                  <td style={{ textAlign: 'right' }}>{currency} {(r1.totalDailySales || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3. ITEMIZATION: OUTFLOWS VS INFLOWS */}
        {r2 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              3. Outflows & Inflows Itemization
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <strong style={{ fontSize: '10px', textDecoration: 'underline' }}>Outflows & Expenses:</strong>
                <p style={{ margin: '3px 0', fontSize: '10px' }}>
                  Total Purchases (GRN): {currency} {(r2.outflows?.totalPurchases || 0).toLocaleString()}
                </p>
                <p style={{ margin: '3px 0', fontSize: '10px' }}>
                  Operating Expenses: {currency} {(r2.outflows?.totalExpenses || 0).toLocaleString()}
                </p>
                <p style={{ margin: '3px 0', fontSize: '10px', fontWeight: 'bold' }}>
                  Total Outflows: {currency} {(r2.outflows?.totalOutflows || 0).toLocaleString()}
                </p>
              </div>

              <div>
                <strong style={{ fontSize: '10px', textDecoration: 'underline' }}>Tender Breakdown:</strong>
                <p style={{ margin: '3px 0', fontSize: '10px' }}>
                  Cash Sales: {currency} {(r2.inflows?.totalCashSales || 0).toLocaleString()}
                </p>
                <p style={{ margin: '3px 0', fontSize: '10px' }}>
                  Card & Bank: {currency} {((r2.inflows?.totalCardSales || 0) + (r2.inflows?.totalBankSales || 0)).toLocaleString()}
                </p>
                <p style={{ margin: '3px 0', fontSize: '10px' }}>
                  Credit Sales: {currency} {(r2.inflows?.totalCreditSales || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. CREDIT CUSTOMERS & CUMULATIVE OUTSTANDING DUES */}
        {r2 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              4. Credit Customers & Outstanding Due Schedule
            </h3>
            {r2.inflows?.creditSalesItems && r2.inflows.creditSalesItems.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '8px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                    <th style={{ padding: '3px 0' }}>Customer</th>
                    <th>Phone</th>
                    <th>Bill #</th>
                    <th style={{ textAlign: 'right' }}>Today's Credit</th>
                    <th style={{ textAlign: 'right' }}>Total Outstanding Due</th>
                  </tr>
                </thead>
                <tbody>
                  {r2.inflows.creditSalesItems.map((c: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                      <td style={{ padding: '2px 0', fontWeight: 'bold' }}>{c.customerName}</td>
                      <td>{c.customerPhone || 'N/A'}</td>
                      <td>{c.billNo}</td>
                      <td style={{ textAlign: 'right' }}>{currency} {(c.creditAmount || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{currency} {(c.cumulativeDue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '4px 0' }}>No credit sales billed today.</p>
            )}

            {/* Total Cumulative Debtors */}
            {r2.inflows?.outstandingCreditCustomers && r2.inflows.outstandingCreditCustomers.length > 0 && (
              <div style={{ marginTop: '8px', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px' }}>
                  <span>Total Cumulative Customer Debtors Portfolio ({r2.inflows.outstandingCreditCustomers.length} accounts):</span>
                  <span>{currency} {(r2.inflows.totalDebtorsBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Signatures */}
        <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px dashed #000', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ borderBottom: '1px solid #000', height: '24px', marginBottom: '4px' }} />
            <span>Cashier / Operator Signature</span>
          </div>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ borderBottom: '1px solid #000', height: '24px', marginBottom: '4px' }} />
            <span>Branch Manager / Auditor Signature</span>
          </div>
        </div>
      </div>
    </div>
    )}

    {/* Advanced EOD Print Preview Modal */}
    {showPrintPreviewModal && (
      <EODPrintPreviewModal
        isOpen={showPrintPreviewModal}
        onClose={() => setShowPrintPreviewModal(false)}
        eodSummaryData={eodSummaryData}
        shopName={activeShopName}
        currentDate={currentDate}
        nextDate={nextDate}
        currency={currency}
      />
    )}
  </>
);
};