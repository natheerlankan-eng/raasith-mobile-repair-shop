import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  X,
  FileText,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Building,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

export type PaperSize = '80mm' | 'a4' | 'a3';
export type ReportScope = 'both' | 'report1' | 'report2';
export type PageOrientation = 'portrait' | 'landscape';

interface EODPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  eodSummaryData: any;
  shopName?: string;
  currentDate?: string;
  nextDate?: string;
  currency?: string;
}

export const EODPrintPreviewModal: React.FC<EODPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  eodSummaryData,
  shopName = 'RAASITH MOBILE',
  currentDate = new Date().toISOString().split('T')[0],
  nextDate,
  currency = 'LKR',
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';
  const activeLogoUrl = shopProfile?.logoUrl || '/images/raasith_logo.png';

  const STORAGE_KEY = 'raasith_eod_print_config';

  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (['80mm', 'a4', 'a3'].includes(parsed.paperSize)) return parsed.paperSize;
      }
    } catch {}
    return 'a4';
  });

  const [reportScope, setReportScope] = useState<ReportScope>('both');

  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedPrinter) return parsed.selectedPrinter;
      }
    } catch {}
    return 'default';
  });

  const [orientation, setOrientation] = useState<PageOrientation>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (['portrait', 'landscape'].includes(parsed.orientation)) return parsed.orientation;
      }
    } catch {}
    return 'portrait';
  });

  const [zoomLevel, setZoomLevel] = useState<number>(() => (paperSize === '80mm' ? 110 : paperSize === 'a3' ? 80 : 100));
  const [copies, setCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Persist preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ paperSize, selectedPrinter, orientation })
      );
    } catch {}
  }, [paperSize, selectedPrinter, orientation]);

  // Auto-switch orientation default when changing paper size if not manually overridden
  useEffect(() => {
    if (paperSize === '80mm') {
      setOrientation('portrait');
      setZoomLevel(110);
    } else if (paperSize === 'a3') {
      setOrientation('landscape');
      setZoomLevel(80);
    } else {
      setZoomLevel(100);
    }
  }, [paperSize]);

  if (!isOpen || !eodSummaryData) return null;

  const r1 = eodSummaryData.report1CashFlow;
  const r2 = eodSummaryData.report2Detailed;

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(180, Math.max(50, prev + delta)));
  };

  const handleTriggerPrint = () => {
    setIsPrinting(true);

    // Apply dynamic page-size style tag to override browser @page rules for 80mm vs A4 vs A3
    const styleId = 'eod-dynamic-page-print-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let pageRule = '';
    if (paperSize === '80mm') {
      pageRule = '@page { size: 80mm auto; margin: 2mm; }';
    } else if (paperSize === 'a4') {
      pageRule = orientation === 'landscape'
        ? '@page { size: A4 landscape; margin: 8mm; }'
        : '@page { size: A4 portrait; margin: 8mm; }';
    } else if (paperSize === 'a3') {
      pageRule = orientation === 'landscape'
        ? '@page { size: A3 landscape; margin: 10mm; }'
        : '@page { size: A3 portrait; margin: 10mm; }';
    }

    styleEl.innerHTML = `@media print { ${pageRule} }`;

    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  const printTimestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#050b1f]/95 backdrop-blur-md select-none font-mono-jb"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP CONFIGURATION TOOLBAR (Screen Only)                                 */}
      {/* ========================================================================= */}
      <header className="bg-[#081235] border-b border-blue-500/30 px-4 py-3 shrink-0 shadow-xl flex items-center justify-between gap-3 flex-wrap no-print">
        {/* Left: Branding & Modal Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 border border-cyan-400/50 flex items-center justify-center text-white shadow-md shadow-cyan-600/30">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-oswald text-base sm:text-lg font-black uppercase tracking-wider text-white">
                EOD AUDIT REPORT &bull; PRINT PREVIEW
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                {currentDate}
              </span>
            </div>
            <p className="text-[10px] text-blue-300/70 font-sans hidden sm:block">
              Select paper size, target output, and inspect formatting before sending to printer.
            </p>
          </div>
        </div>

        {/* Center: Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Paper Size Selector */}
          <div className="flex items-center gap-1.5 bg-[#040a1f] border border-blue-500/30 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-blue-300/70">Paper:</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="80mm" className="bg-[#081235] text-white">80mm Thermal Roll</option>
              <option value="a4" className="bg-[#081235] text-white">A4 Sheet (Standard)</option>
              <option value="a3" className="bg-[#081235] text-white">A3 Format (Wide Ledger)</option>
            </select>
          </div>

          {/* Report Scope Selector */}
          <div className="flex items-center gap-1.5 bg-[#040a1f] border border-blue-500/30 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-blue-300/70">Sections:</span>
            <select
              value={reportScope}
              onChange={(e) => setReportScope(e.target.value as ReportScope)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="both" className="bg-[#081235] text-white">All Reports (1 &amp; 2 Combined)</option>
              <option value="report1" className="bg-[#081235] text-white">Report 1: Cash Flow Summary</option>
              <option value="report2" className="bg-[#081235] text-white">Report 2: Transactions &amp; Credit</option>
            </select>
          </div>

          {/* Printer Target Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#040a1f] border border-blue-500/30 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-blue-300/70">Target:</span>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs max-w-[170px] truncate"
            >
              <option value="default" className="bg-[#081235] text-white">System Default / Dialog</option>
              <option value="thermal80" className="bg-[#081235] text-white">80mm POS Thermal Printer</option>
              <option value="laser" className="bg-[#081235] text-white">Office Laser / Inkjet A4</option>
              <option value="pdf" className="bg-[#081235] text-white">Save as PDF / Document</option>
            </select>
          </div>

          {/* Orientation (For A4/A3) */}
          {paperSize !== '80mm' && (
            <div className="hidden lg:flex items-center gap-1 bg-[#040a1f] border border-blue-500/30 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  orientation === 'portrait' ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-white'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  orientation === 'landscape' ? 'bg-blue-600 text-white' : 'text-blue-300/60 hover:text-white'
                }`}
              >
                Landscape
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-[#040a1f] border border-blue-500/30 rounded-xl px-2 py-1 text-xs">
            <button
              type="button"
              onClick={() => handleZoom(-10)}
              title="Zoom out"
              className="text-blue-300 hover:text-white px-1 font-bold"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-cyan-300 font-bold min-w-[36px] text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(10)}
              title="Zoom in"
              className="text-blue-300 hover:text-white px-1 font-bold"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 sm:px-4 bg-[#0a1538] hover:bg-[#102052] border border-blue-500/30 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            disabled={isPrinting}
            onClick={handleTriggerPrint}
            className="py-2 px-4 sm:px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>{isPrinting ? 'Printing...' : 'Proceed to Print'}</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN PREVIEW CANVAS WORKSPACE                                          */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-[#040714] relative">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Realistic Paper Sheet Container */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className={`bg-white text-black shadow-2xl rounded-sm transition-all relative border border-slate-300/50 print-preview-sheet ${
            paperSize === '80mm'
              ? 'w-[80mm] max-w-[80mm] p-[4mm] text-[10px] leading-tight font-mono'
              : paperSize === 'a3'
              ? 'w-[420mm] max-w-[420mm] min-h-[297mm] p-[12mm] text-xs leading-normal font-sans'
              : orientation === 'landscape'
              ? 'w-[297mm] max-w-[297mm] min-h-[210mm] p-[10mm] text-xs leading-normal font-sans'
              : 'w-[210mm] max-w-[210mm] min-h-[297mm] p-[10mm] text-xs leading-normal font-sans'
          }`}
        >
          {/* Paper Dimension Badge indicator (screen only) */}
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[8px] text-slate-500 font-mono no-print">
            {paperSize.toUpperCase()} {paperSize !== '80mm' ? `(${orientation})` : '(Continuous Roll)'}
          </div>

          {/* =================================================================== */}
          {/* DOCUMENT HEADER                                                     */}
          {/* =================================================================== */}
          <div className="border-b-2 border-black pb-3 mb-4 text-center">
            {/* Logo Badge in 80mm & A4 */}
            <div className="flex justify-center mb-1">
              <img
                src={activeLogoUrl}
                alt={activeShopName}
                className={`rounded-full object-cover border border-black ${
                  paperSize === '80mm' ? 'w-8 h-8' : 'w-11 h-11'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
                }}
              />
            </div>
            <h1
              className={`font-black uppercase tracking-tight text-black m-0 ${
                paperSize === '80mm' ? 'text-sm' : 'text-xl'
              }`}
            >
              {activeShopName}
            </h1>
            <p className="font-bold text-[9px] uppercase tracking-wider text-slate-700 m-0">
              Sales &bull; Service Bench &bull; Spare Parts &bull; Accessories
            </p>
            <p
              className={`font-black uppercase tracking-wide border-t border-b border-black py-1 my-1.5 ${
                paperSize === '80mm' ? 'text-[9px]' : 'text-xs'
              }`}
            >
              End of Day (EOD) Financial Closing &amp; Reconciliation Audit
            </p>

            {/* Metadata Bar */}
            <div
              className={`flex justify-between items-center text-slate-800 font-mono ${
                paperSize === '80mm' ? 'flex-col gap-0.5 text-[8px]' : 'text-[10px] mt-2'
              }`}
            >
              <span>
                <strong>Operating Date:</strong> {currentDate}
              </span>
              <span>
                <strong>Audited Generated:</strong> {printTimestamp}
              </span>
              <span>
                <strong>Next Operating Date:</strong> {nextDate || 'N/A'}
              </span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* SECTION 1: REPORT 1 - CASH FLOW SUMMARY & DRAWER RECONCILIATION     */}
          {/* =================================================================== */}
          {(reportScope === 'both' || reportScope === 'report1') && r1 && (
            <section className="mb-5">
              <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-black">
                  1. Cash Flow &amp; Physical Drawer Reconciliation
                </h3>
                <span className="text-[9px] font-mono font-bold text-slate-600">
                  REF: EOD-CF-{currentDate.replace(/-/g, '')}
                </span>
              </div>

              {/* Drawer Balance Table */}
              <table className="w-full border-collapse text-[10px] mb-3">
                <tbody>
                  <tr className="border-b border-dotted border-slate-300">
                    <td className="py-1">Cash Received from POS Retail Sales:</td>
                    <td className="text-right font-bold">
                      +{currency} {(r1.totalCashSales || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-dotted border-slate-300">
                    <td className="py-1">Customer Advance Deposits Collected:</td>
                    <td className="text-right font-bold">
                      +{currency} {(r1.totalCustomerAdvances || 0).toLocaleString()}
                    </td>
                  </tr>
                  {r1.totalJobCashPayments > 0 && (
                    <tr className="border-b border-dotted border-slate-300">
                      <td className="py-1">Direct Repair Job Cash Payments:</td>
                      <td className="text-right font-bold">
                        +{currency} {(r1.totalJobCashPayments || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-black font-bold bg-slate-50">
                    <td className="py-1 text-slate-900">TOTAL CASH INFLOWS COLLECTED:</td>
                    <td className="text-right text-emerald-800">
                      +{currency} {(r1.totalCashIn || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-dotted border-slate-300">
                    <td className="py-1">Operating Cash Expenses Deducted:</td>
                    <td className="text-right font-bold text-rose-800">
                      -{currency} {(r1.totalCashExpenses || 0).toLocaleString()}
                    </td>
                  </tr>
                  {/* Highlighted Net Drawer Balance */}
                  <tr className="border-t-2 border-b-2 border-black font-black bg-slate-100 text-xs">
                    <td className="py-1.5 uppercase">
                      NET PHYSICAL CASH DRAWER BALANCE (EXPECTED IN TILL):
                    </td>
                    <td className="text-right text-sm font-mono font-black">
                      {currency} {(r1.netCashDrawer || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Sales Revenue Breakdown Sub-Table */}
              <div className="bg-slate-50 p-2 border border-slate-300 rounded mb-3">
                <div className="font-bold text-[9px] uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-1 text-slate-700">
                  Daily Sales Revenue Recognition
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] font-mono">
                  <div>
                    <span className="text-slate-500 block">Gross Sales:</span>
                    <strong>{currency} {(r1.totalGrossSales || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Discounts:</span>
                    <strong className="text-rose-700">-{currency} {(r1.totalDiscount || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Returns:</span>
                    <strong className="text-rose-700">-{currency} {(r1.totalReturns || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Net Daily Sales:</span>
                    <strong className="text-blue-900">{currency} {(r1.totalDailySales || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =================================================================== */}
          {/* SECTION 2: REPORT 2 - DETAILED TRANSACTIONS, EXPENSES & CREDIT      */}
          {/* =================================================================== */}
          {(reportScope === 'both' || reportScope === 'report2') && r2 && (
            <section className="mb-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-black">
                  2. Detailed Transactions, Expenses &amp; Customer Credit Balances
                </h3>
                <span className="text-[9px] font-mono font-bold text-slate-600">
                  REF: EOD-TX-{currentDate.replace(/-/g, '')}
                </span>
              </div>

              {/* Side-by-side Outflows vs Inflows Summary */}
              <div
                className={`grid gap-3 mb-3 ${
                  paperSize === '80mm' ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {/* Outflows Box */}
                <div className="border border-black p-2 bg-slate-50">
                  <div className="font-bold text-[10px] uppercase border-b border-black pb-0.5 mb-1 flex justify-between">
                    <span>Outflows &amp; Expenditures</span>
                    <span>{currency} {(r2.outflows?.totalOutflows || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>GRN Stock Purchases:</span>
                      <strong>{currency} {(r2.outflows?.totalPurchases || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Itemized Operating Expenses:</span>
                      <strong>{currency} {(r2.outflows?.totalExpenses || 0).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Expense Items List */}
                  {r2.outflows?.expenses && r2.outflows.expenses.length > 0 && (
                    <div className="mt-2 pt-1 border-t border-slate-300 space-y-0.5 text-[8px]">
                      {r2.outflows.expenses.slice(0, 8).map((exp: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="truncate max-w-[140px]">{exp.title || exp.category} ({exp.paymentMethod}):</span>
                          <span>{currency} {(exp.amount || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inflows Box */}
                <div className="border border-black p-2 bg-slate-50">
                  <div className="font-bold text-[10px] uppercase border-b border-black pb-0.5 mb-1 flex justify-between">
                    <span>Inflows &amp; Tender Methods</span>
                    <span>{currency} {(r2.inflows?.totalInflows || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cash Inflow:</span>
                      <strong>{currency} {(r2.inflows?.totalCashSales || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Card POS Terminals:</span>
                      <strong>{currency} {(r2.inflows?.totalCardSales || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank Transfers:</span>
                      <strong>{currency} {(r2.inflows?.totalBankSales || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Credit Invoices Issued:</span>
                      <strong>{currency} {(r2.inflows?.totalCreditSales || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEMIZED CREDIT SALES & TOTAL CUMULATIVE DUE INTEGRATION */}
              <div className="mb-4">
                <div className="font-bold text-[10px] uppercase tracking-wider border-b border-black pb-0.5 mb-1 flex justify-between">
                  <span>Credit Customers &amp; Cumulative Outstanding Due Schedule</span>
                  <span>Total Today: {currency} {(r2.inflows?.totalCreditSales || 0).toLocaleString()}</span>
                </div>

                {r2.inflows?.creditSalesItems && r2.inflows.creditSalesItems.length > 0 ? (
                  <table className="w-full border-collapse text-[9px] mb-2">
                    <thead>
                      <tr className="border-b border-black text-left font-bold bg-slate-100">
                        <th className="py-1 px-1">Customer Name</th>
                        <th className="px-1">Phone</th>
                        <th className="px-1">Bill #</th>
                        <th className="px-1 text-right">Today's Credit</th>
                        <th className="px-1 text-right font-black">Total Outstanding Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r2.inflows.creditSalesItems.map((c: any, idx: number) => (
                        <tr key={idx} className="border-b border-dotted border-slate-300">
                          <td className="py-1 px-1 font-bold">{c.customerName}</td>
                          <td className="px-1 text-slate-600 font-mono">{c.customerPhone || 'N/A'}</td>
                          <td className="px-1 font-mono">{c.billNo}</td>
                          <td className="px-1 text-right">{currency} {(c.creditAmount || 0).toLocaleString()}</td>
                          <td className="px-1 text-right font-bold font-mono">
                            {currency} {(c.cumulativeDue || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[9px] italic text-slate-500 my-1">
                    No credit sales issued for this business day.
                  </p>
                )}

                {/* Total Active Debtors Schedule Summary */}
                {r2.inflows?.outstandingCreditCustomers && r2.inflows.outstandingCreditCustomers.length > 0 && (
                  <div className="border border-slate-300 p-2 bg-slate-50 flex justify-between items-center text-[9px] font-bold">
                    <span>
                      Total Active Customer Debtors Ledger ({r2.inflows.outstandingCreditCustomers.length} accounts):
                    </span>
                    <span className="text-xs font-mono font-black">
                      {currency} {(r2.inflows.totalDebtorsBalance || 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =================================================================== */}
          {/* VERIFICATION SIGNATURES & AUDIT BLOCK                               */}
          {/* =================================================================== */}
          <div className="mt-6 pt-3 border-t-2 border-dashed border-black">
            <div className="flex justify-between items-end text-[9px] text-center font-mono">
              <div className="w-[42%]">
                <div className="border-b border-black h-8 mb-1" />
                <span className="font-bold uppercase block text-black">Cashier / Operator Signature</span>
                <span className="text-[8px] text-slate-500">Prepared &amp; Reconciled</span>
              </div>
              <div className="w-[42%]">
                <div className="border-b border-black h-8 mb-1" />
                <span className="font-bold uppercase block text-black">Branch Manager / Auditor</span>
                <span className="text-[8px] text-slate-500">Reviewed &amp; Certified Safe</span>
              </div>
            </div>

            <div className="mt-3 text-center text-[8px] text-slate-500 border-t border-slate-200 pt-1">
              <span>{shopName} Management ERP &bull; Official Closing Audit Sheet &bull; Page 1 of 1</span>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. DEDICATED PRINT CONTAINER (Triggered on window.print())                 */}
      {/* ========================================================================= */}
      <div className={`print-only print-eod-report paper-size-${paperSize}`}>
        <div style={{ color: '#000000', fontFamily: paperSize === '80mm' ? 'monospace' : 'sans-serif' }}>
          {/* Print Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '10px' }}>
            <h1 style={{ fontSize: paperSize === '80mm' ? '15px' : '20px', fontWeight: 'bold', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
              {shopName}
            </h1>
            <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 'bold' }}>
              END OF DAY (EOD) FINANCIAL RECONCILIATION &amp; AUDIT REPORT
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '4px' }}>
              <span><strong>Date:</strong> {currentDate}</span>
              <span><strong>Generated:</strong> {printTimestamp}</span>
              <span><strong>Next Day:</strong> {nextDate || 'N/A'}</span>
            </div>
          </div>

          {/* Report 1: Cash Flow & Drawer Balance */}
          {(reportScope === 'both' || reportScope === 'report1') && r1 && (
            <div style={{ marginBottom: '12px', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                1. Cash Flow &amp; Drawer Balance Reconciliation
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ padding: '2px 0' }}>Cash Received from POS Sales:</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{currency} {(r1.totalCashSales || 0).toLocaleString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ padding: '2px 0' }}>Customer Advances &amp; Deposits:</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{currency} {(r1.totalCustomerAdvances || 0).toLocaleString()}</td>
                  </tr>
                  {r1.totalJobCashPayments > 0 && (
                    <tr style={{ borderBottom: '1px dotted #ccc' }}>
                      <td style={{ padding: '2px 0' }}>Direct Job Cash Payments:</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{currency} {(r1.totalJobCashPayments || 0).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #000', fontWeight: 'bold' }}>
                    <td style={{ padding: '3px 0' }}>TOTAL CASH INFLOWS:</td>
                    <td style={{ textAlign: 'right' }}>+{currency} {(r1.totalCashIn || 0).toLocaleString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ padding: '2px 0' }}>Operating Cash Expenses Paid:</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>-{currency} {(r1.totalCashExpenses || 0).toLocaleString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '1px solid #000', fontWeight: 'bold', fontSize: '11px' }}>
                    <td style={{ padding: '4px 0' }}>NET PHYSICAL CASH DRAWER BALANCE:</td>
                    <td style={{ textAlign: 'right' }}>{currency} {(r1.netCashDrawer || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Sales Summary */}
              <div style={{ marginTop: '6px', fontSize: '9px', borderTop: '1px dotted #ccc', paddingTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Sales: {currency} {(r1.totalGrossSales || 0).toLocaleString()}</span>
                  <span>Discounts: -{currency} {(r1.totalDiscount || 0).toLocaleString()}</span>
                  <span>Returns: -{currency} {(r1.totalReturns || 0).toLocaleString()}</span>
                  <span><strong>Net Sales: {currency} {(r1.totalDailySales || 0).toLocaleString()}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Report 2: Outflows vs Inflows & Itemized Credit */}
          {(reportScope === 'both' || reportScope === 'report2') && r2 && (
            <div style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                2. Outflows, Inflows &amp; Credit Customer Ledger
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '6px' }}>
                <div>
                  <strong>Outflows:</strong> GRN {currency} {(r2.outflows?.totalPurchases || 0).toLocaleString()} | Expenses {currency} {(r2.outflows?.totalExpenses || 0).toLocaleString()} | <strong>Total {currency} {(r2.outflows?.totalOutflows || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <strong>Inflows:</strong> Cash {currency} {(r2.inflows?.totalCashSales || 0).toLocaleString()} | Card/Bank {currency} {((r2.inflows?.totalCardSales || 0) + (r2.inflows?.totalBankSales || 0)).toLocaleString()} | Credit {currency} {(r2.inflows?.totalCreditSales || 0).toLocaleString()}
                </div>
              </div>

              {/* Credit Sales Items */}
              {r2.inflows?.creditSalesItems && r2.inflows.creditSalesItems.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                        <th style={{ padding: '2px 0' }}>Customer</th>
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
                </div>
              )}

              {/* Total Active Debtors */}
              {r2.inflows?.outstandingCreditCustomers && r2.inflows.outstandingCreditCustomers.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '3px', marginTop: '5px', fontSize: '9px', fontWeight: 'bold' }}>
                  <span>Cumulative Active Customer Debtors ({r2.inflows.outstandingCreditCustomers.length} Accounts):</span>
                  <span>{currency} {(r2.inflows.totalDebtorsBalance || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Signatures */}
          <div style={{ marginTop: '24px', paddingTop: '10px', borderTop: '1px dashed #000', display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '2px' }} />
              <span>Cashier / Operator Signature</span>
            </div>
            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '2px' }} />
              <span>Branch Manager / Auditor Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
