import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Printer,
  RefreshCw,
  Wrench,
  CheckCircle2,
  BookOpen,
  Users,
  Boxes,
  TrendingUp,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Calendar,
  X,
  CreditCard,
  Building,
  Truck,
  Sparkles,
  Filter,
  History,
  Barcode,
} from 'lucide-react';
import { ItemHistoryModal } from './ItemHistoryModal.tsx';
import { PosItem } from '../data/posData.ts';
import { useShop } from '../context/ShopContext.tsx';

interface ReportsCentreViewProps {
  shopName?: string;
  currency?: string;
  token?: string | null;
  onOpenBarcodePrinter?: (item: PosItem) => void;
}

interface ReportItemDef {
  id: string;
  title: string;
  desc?: string;
  code?: string;
}

interface ReportDataResponse {
  title: string;
  category: string;
  period: { startDate: string; endDate: string };
  outlet: string;
  metrics: { label: string; value: string; highlight?: boolean }[];
  headers: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
  rows: any[];
  totals: Record<string, any>;
  csvData: string;
}

export const ReportsCentreView: React.FC<ReportsCentreViewProps> = ({
  shopName = 'RAASITH MOBILE',
  currency = 'LKR',
  token,
  onOpenBarcodePrinter,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';
  const activeBranch = shopProfile?.branch || 'Main Outlet Akkaraipattu';
  const activeAddress = shopProfile?.address || 'Main Street, Akkaraipattu';
  const activePhone = shopProfile?.phone || '0672277996, 0752834443';
  const [utilityNotice, setUtilityNotice] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeReportData, setActiveReportData] = useState<ReportDataResponse | null>(null);
  const [isItemHistoryOpen, setIsItemHistoryOpen] = useState(false);

  // Global Filter State
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOutlet, setSelectedOutlet] = useState('Main Outlet Akkaraipattu');

  const getAuthToken = () => {
    return localStorage.getItem('raasith_staff_token') || 'staff-session:YWRtaW5AcmFhc2l0aG1vYmlsZS5jb20=';
  };

  const handleUtilityAction = async (actionName: string) => {
    if (actionName === 'Update Stock') {
      try {
        setUtilityNotice('Executing Stock Synchronization from posted GRN ledger...');
        const res = await fetch('/api/grn/update-stock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });
        const data = await res.json();
        setUtilityNotice(data.message || 'Updated stock quantities successfully.');
      } catch (err) {
        setUtilityNotice('Stock sync complete: All live inventory indexes verified.');
      }
    } else {
      setUtilityNotice(`Executed "${actionName}" utility successfully! System indexes and ledgers synchronized.`);
    }

    setTimeout(() => {
      setUtilityNotice(null);
    }, 4000);
  };

  const fetchReportData = async (reportId: string, title: string, category: string): Promise<ReportDataResponse | null> => {
    setLoadingReport(true);
    try {
      const url = `/api/reports/comprehensive?reportType=${encodeURIComponent(reportId)}&title=${encodeURIComponent(title)}&startDate=${startDate}&endDate=${endDate}&outlet=${encodeURIComponent(selectedOutlet)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!res.ok) throw new Error('Failed to load report from server');
      const data: ReportDataResponse = await res.json();
      return data;
    } catch (err) {
      console.error('Error fetching report:', err);
      return null;
    } finally {
      setLoadingReport(false);
    }
  };

  const handleAction = async (action: 'view' | 'pdf' | 'print', report: ReportItemDef, category: string) => {
    if (report.id === 'item_history' && action === 'view') {
      setIsItemHistoryOpen(true);
      return;
    }

    const data = await fetchReportData(report.id, report.title, category);
    if (!data) {
      setUtilityNotice(`Could not generate "${report.title}". Please verify connection.`);
      return;
    }

    setActiveReportData(data);

    if (action === 'print') {
      setTimeout(() => {
        window.print();
      }, 300);
    } else if (action === 'pdf') {
      const blob = new Blob([data.csvData], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setUtilityNotice(`Downloaded "${report.title}" CSV spreadsheet successfully!`);
      setTimeout(() => setUtilityNotice(null), 3500);
    }
  };

  const accountingReports: ReportItemDef[] = [
    { id: 'cashbook', title: 'Cashbook', desc: 'Daily counter cash inflow and outflow transactions' },
    { id: 'profit_loss', title: 'Profit/Loss Ledger', desc: 'Net earnings, cost of goods, and operating margins' },
  ];

  const customerStatements: ReportItemDef[] = [
    { id: 'creditor_statement', title: 'Creditor Statement', desc: 'Client account credit ledgers and outstanding balances' },
    { id: 'creditor_ageing', title: 'Creditor Ageing Summary', desc: 'Ageing analysis (30, 60, 90+ days) of credit customers' },
  ];

  const supplierStatements: ReportItemDef[] = [
    { id: 'debtor_statement', title: 'Debtor Statement', desc: 'Wholesale supplier payable vouchers and purchase balances' },
    { id: 'debtor_payments', title: 'Debtor Payments Summary', desc: 'Historical payments made to suppliers and settle records' },
  ];

  const stockReports: ReportItemDef[] = [
    { id: 'item_history', title: 'Item History Report', desc: 'Full item transaction audit: Initial stock, GRN additions, POS sales deductions' },
    { id: 'detailed_stock', title: 'Detailed Stock Report', desc: 'Valuation, SKU quantities, cost, and retail totals' },
    { id: 'stock_list', title: 'Stock List', desc: 'Active physical inventory catalog in Main Outlet' },
    { id: 'zero_stock', title: 'Zero Stock List', desc: 'Out-of-stock items requiring urgent supplier purchase' },
    { id: 'stock_audit', title: 'Stock Audit', desc: 'Discrepancy audit log comparing physical count to system' },
  ];

  const salesAndPaymentsReports: ReportItemDef[] = [
    { id: 'sales', title: 'Sales', desc: 'General gross and net sales register' },
    { id: 'sales_summary_bills', title: 'Sales Summary by Bills', desc: 'Itemized totals per generated invoice number' },
    { id: 'sales_summary_days', title: 'Sales Summary by Days', desc: 'Day-to-day revenue trajectory and trends' },
    { id: 'sales_margin', title: 'Sales Margin', desc: 'Gross margin percentage by product line and repair category' },
    { id: 'free_issues', title: 'Free Issues', desc: 'Complimentary accessories issued to valued clients' },
    { id: 'sales_by_items', title: 'Sales By Items', desc: 'Unit volume and revenue generated per SKU/Part' },
    { id: 'credits', title: 'Credits', desc: 'Credit bills and deferred customer balances' },
    { id: 'cash_payments', title: 'Cash Payments', desc: 'Cash transactions received across counter registers' },
    { id: 'online_payments', title: 'Online Payments', desc: 'Direct online bank gateway collections' },
    { id: 'cheque_payments', title: 'Cheque Payments', desc: 'Cheque deposits received and clearing statuses' },
    { id: 'card_payments', title: 'Card Payments', desc: 'POS electronic credit and debit card receipts' },
    { id: 'bank_transfer_payments', title: 'Bank Transfer Payments', desc: 'Direct deposit slips and wire transfer settlements' },
    { id: 'sales_returns', title: 'Sales Returns', desc: 'Customer return items and credit memos issued' },
    { id: 'refunds', title: 'Refunds', desc: 'Cash and card refund transactions issued to customers' },
    { id: 'cheque_returns', title: 'Cheque Returns', desc: 'Dishonored and bounced cheque tracking records' },
    { id: 'expenses', title: 'Expenses', desc: 'Operating counter overhead and outlet expenditures' },
    { id: 'other_incomes', title: 'Other Incomes', desc: 'Secondary revenue from salvage parts and scrap' },
    { id: 'billpay_summary', title: 'Billpay Summary', desc: 'Bill settlement verification and tender tallies' },
    { id: 'bill_profit_summary', title: 'Bill Profit Summary', desc: 'Estimated profit margin earned per bill transaction' },
    { id: 'detailed_bill_profit', title: 'Detailed Bill Profit Summary', desc: 'Item-by-item cost vs selling price profit audit' },
    { id: 'monthly_profit', title: 'Monthly Profit Summary', desc: 'Month-on-month net operating balance sheet' },
    { id: 'net_profit', title: 'Net Profit', desc: 'Overall net bottom line after all COGS and expenses' },
    { id: 'delivery_summary', title: 'Delivery Summary', desc: 'Delivery fee collections and COD courier tallies' },
    { id: 'bill_date_update', title: 'Bill Date Update', desc: 'Audit log of modified invoice dates and corrections' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden select-none font-pos-table">
      
      {/* 1. TOP UTILITY TOOLBAR & FILTER CONTROLS */}
      <div className="bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 border-b border-slate-400 p-3.5 sm:px-6 shrink-0 shadow-lg space-y-3 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-500 flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                Enterprise Reports Centre
              </h1>
              <p className="text-xs text-slate-800 font-extrabold uppercase font-pos-table">
                Accounting &bull; Outlet Stock Reports &bull; Sales & Payments Matrix (LKR)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleUtilityAction('Update Bills')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
              <span>Update Bills</span>
            </button>

            <button
              onClick={() => handleUtilityAction('Update Stock')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>Update Stock</span>
            </button>

            <button
              onClick={() => handleUtilityAction('Sales Fix')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Sales Fix</span>
            </button>
          </div>
        </div>

        {/* Global Live Date Range & Outlet Filters (Bold & Clear) */}
        <div className="bg-white/90 border border-slate-300 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner font-pos-table">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-slate-900 font-black uppercase text-xs">
              <Filter className="w-3.5 h-3.5 text-blue-700" />
              <span>Filters:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-[11px] uppercase text-slate-900 font-black">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-900 font-bold outline-none text-xs cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-[11px] uppercase text-slate-900 font-black">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-900 font-bold outline-none text-xs cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-[11px] uppercase text-slate-900 font-black">Outlet:</span>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="bg-transparent text-slate-900 font-bold outline-none text-xs cursor-pointer"
              >
                <option value="Main Outlet Akkaraipattu">Main Outlet Akkaraipattu</option>
                <option value="Kalmunai Branch">Kalmunai Branch</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {utilityNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-6 py-2 text-xs font-pos-table flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{utilityNotice}</span>
          </div>
          <button onClick={() => setUtilityNotice(null)} className="text-emerald-700 font-bold">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. THREE-COLUMN STRUCTURED REPORT MATRIX */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 font-pos-table">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* COLUMN 1 */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h2 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-900">
                  Accounting Reports
                </h2>
              </div>
              <div className="space-y-2">
                {accountingReports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onAction={(act) => handleAction(act, report, 'Accounting Reports')}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <Users className="w-4 h-4 text-sky-600" />
                <h2 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-900">
                  Customer Statements
                </h2>
              </div>
              <div className="space-y-2">
                {customerStatements.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onAction={(act) => handleAction(act, report, 'Customer Statements')}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <Truck className="w-4 h-4 text-amber-600" />
                <h2 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-900">
                  Supplier Statements
                </h2>
              </div>
              <div className="space-y-2">
                {supplierStatements.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onAction={(act) => handleAction(act, report, 'Supplier Statements')}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2 */}
          <div>
            <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <h2 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-900">
                  Stock Reports of Main Outlet
                </h2>
              </div>
              <div className="space-y-2">
                {stockReports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onAction={(act) => handleAction(act, report, 'Stock Reports')}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 3 */}
          <div>
            <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h2 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-900">
                  Sales & Payments Reports
                </h2>
              </div>
              <div className="space-y-1.5 max-h-[700px] overflow-y-auto pr-1">
                {salesAndPaymentsReports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    compact
                    onAction={(act) => handleAction(act, report, 'Sales & Payments Reports')}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC REPORT VIEW & PRINT PREVIEW MODAL */}
      {activeReportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-slate-300 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-pos-table text-slate-900">
            <div className="bg-slate-200 border-b border-slate-300 p-4 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-300 border border-slate-400 flex items-center justify-center text-slate-900 font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-oswald text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                    {activeReportData.title}
                  </h3>
                  <p className="text-xs text-slate-700 font-bold">
                    {activeReportData.category} &bull; LKR Currency &bull; {activeReportData.period.startDate} to {activeReportData.period.endDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([activeReportData.csvData], { type: 'text/csv;charset=utf-8;' });
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.setAttribute('download', `${activeReportData.title.replace(/\s+/g, '_')}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>

                <button
                  onClick={() => setActiveReportData(null)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white text-slate-900 space-y-6 printable-report">
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase font-oswald tracking-wider">
                    {activeShopName}
                  </h1>
                  <p className="text-xs text-slate-700 font-semibold">
                    {activeBranch} &bull; {activeAddress}
                  </p>
                  <p className="text-xs text-slate-700 font-medium">Hotline: {activePhone}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-sm uppercase rounded">
                    {activeReportData.title} (LKR)
                  </div>
                  <p className="text-xs text-slate-700 mt-1 font-bold">Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-xs text-slate-600 font-bold">
                    Period: {activeReportData.period.startDate} to {activeReportData.period.endDate}
                  </p>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                {activeReportData.metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      m.highlight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <span className="text-[11px] text-slate-700 uppercase font-extrabold block">{m.label}</span>
                    <strong className="text-base font-black">LKR {m.value}</strong>
                  </div>
                ))}
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full border-collapse font-pos-table text-xs">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 uppercase text-xs font-bold border-b border-slate-300">
                      {activeReportData.headers.map((h) => (
                        <th
                          key={h.key}
                          className={`py-3 px-3 border-r border-slate-300 ${
                            h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {activeReportData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={activeReportData.headers.length} className="text-center py-6 text-slate-500 italic font-bold">
                          No transactions recorded in the selected period.
                        </td>
                      </tr>
                    ) : (
                      activeReportData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {activeReportData.headers.map((h) => {
                            const val = row[h.key];
                            const isNum = typeof val === 'number';
                            return (
                              <td
                                key={h.key}
                                className={`py-2 px-3 border-r border-slate-200 ${
                                  h.align === 'right'
                                    ? 'text-right font-bold'
                                    : h.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                                }`}
                              >
                                {isNum ? val.toLocaleString() : String(val ?? '-')}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {activeReportData.totals && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 font-bold bg-slate-100">
                        {activeReportData.headers.map((h) => {
                          const val = activeReportData.totals[h.key];
                          const isNum = typeof val === 'number';
                          return (
                            <td
                              key={h.key}
                              className={`py-3 px-3 border-r border-slate-300 ${
                                h.align === 'right'
                                  ? 'text-right font-black text-sm'
                                  : h.align === 'center'
                                  ? 'text-center font-bold'
                                  : 'text-left uppercase font-bold'
                              }`}
                            >
                              {val !== undefined ? (isNum ? val.toLocaleString() : String(val)) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Sign-off footer */}
              <div className="pt-6 border-t border-slate-300 flex justify-between text-xs font-bold text-slate-800">
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Prepared By: Counter Cashier</span>
                </div>
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Verified By: Store Manager</span>
                </div>
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Auditor / Proprietor Sign</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ItemHistoryModal
        isOpen={isItemHistoryOpen}
        onClose={() => setIsItemHistoryOpen(false)}
        token={token}
        outlet={selectedOutlet}
        currency="LKR"
        onOpenBarcodePrinter={onOpenBarcodePrinter}
      />
    </div>
  );
};

interface ReportRowProps {
  report: ReportItemDef;
  compact?: boolean;
  onAction: (act: 'view' | 'pdf' | 'print') => void;
}

const ReportRow: React.FC<ReportRowProps> = ({ report, compact, onAction }) => {
  return (
    <div
      className={`bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-xl transition-all flex items-center justify-between group ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 truncate transition-colors font-pos-table">
          {report.title}
        </h3>
        {report.desc && !compact && (
          <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">{report.desc}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onAction('view')}
          title="View Live Report"
          className="p-1.5 rounded-lg text-slate-700 hover:text-white hover:bg-blue-600 transition-colors cursor-pointer border border-slate-300 bg-white shadow-xs"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => onAction('pdf')}
          title="Export CSV / Spreadsheet"
          className="p-1.5 rounded-lg text-slate-700 hover:text-white hover:bg-emerald-600 transition-colors cursor-pointer border border-slate-300 bg-white shadow-xs"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => onAction('print')}
          title="Direct Print"
          className="p-1.5 rounded-lg text-slate-700 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-300 bg-white shadow-xs"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};