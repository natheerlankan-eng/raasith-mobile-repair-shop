import React, { useState } from 'react';
import { DailySummary, RepairJob } from '../types.ts';
import { parseJobIssues } from '../utils/whatsapp.ts';
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Smartphone,
  Printer,
  ChevronDown,
  Layers,
  ArrowUpRight,
  FileCheck,
  Plus
} from 'lucide-react';

interface DailySummaryDashboardProps {
  summary: DailySummary | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  loading: boolean;
  shopName: string;
  onOpenReceiveAdvance?: () => void;
}

export const DailySummaryDashboard: React.FC<DailySummaryDashboardProps> = ({
  summary,
  selectedDate,
  onDateChange,
  loading,
  shopName,
  onOpenReceiveAdvance,
}) => {
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [showAdvanceList, setShowAdvanceList] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handlePrintDailySlip = () => {
    window.print();
  };

  const completedCount = summary?.totalCompletedRepairs ?? 0;
  const advanceRevenue = summary?.totalAdvanceRevenue ?? 0;
  const jobsReceived = summary?.totalJobsReceivedToday ?? 0;
  const estimatedTotal = summary?.totalEstimatedRevenueToday ?? 0;

  return (
    <div className="bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] p-5 sm:p-7 space-y-6 text-[#f8f7f4]">
      {/* Dashboard Top Header & Date Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(248,247,244,0.1)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-[#f8f7f4]">
              Daily Summary Dashboard
            </h2>
            {isToday && (
              <span className="font-mono-jb px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Today's Live Report
              </span>
            )}
          </div>
          <p className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)] mt-0.5">
            Counter repair completions & cash advance payments tracker
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-[#111113] rounded-lg p-1 border border-[rgba(248,247,244,0.1)]">
            <button
              onClick={handlePrevDay}
              title="Previous Day"
              className="p-1.5 rounded hover:bg-[#1c1c1e] text-[rgba(248,247,244,0.7)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative px-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent font-mono-jb font-bold text-xs text-[#f8f7f4] outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              title="Next Day"
              className="p-1.5 rounded hover:bg-[#1c1c1e] text-[rgba(248,247,244,0.7)] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={() => onDateChange(todayStr)}
              className="px-3 py-2 bg-[#111113] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.1)] rounded-lg text-xs font-mono-jb font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
          )}

          <button
            onClick={handlePrintDailySlip}
            title="Print Daily Summary Closing Slip"
            className="px-3.5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-xs font-oswald uppercase tracking-wider font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/30"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Repairs Completed */}
        <div className="bg-[#111113] rounded-xl border border-[rgba(248,247,244,0.1)] p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                Repairs Completed
              </span>
              <div className="font-mono-jb text-3xl sm:text-4xl font-black text-[#f8f7f4] mt-1">
                {loading ? '...' : completedCount}
              </div>
            </div>
            <div className="w-11 h-11 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(248,247,244,0.1)] flex items-center justify-between text-xs font-mono-jb">
            <span className="text-[rgba(248,247,244,0.5)]">
              Delivered to customers
            </span>
            {completedCount > 0 && (
              <button
                onClick={() => setShowCompletedList(!showCompletedList)}
                className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>{showCompletedList ? 'Hide' : 'View'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCompletedList ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* KPI 2: Total Advance Payments Revenue (Remaining) */}
        <div className="bg-[#111113] rounded-xl border border-[rgba(248,247,244,0.1)] p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[#ef4444] font-bold block">
                Remaining Advance Deposits
              </span>
              <div className="font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4] mt-1">
                {loading ? '...' : `LKR ${advanceRevenue.toLocaleString()}`}
              </div>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center border border-[#ef4444]/30">
              <DollarSign className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(248,247,244,0.1)] flex items-center justify-between text-xs gap-2 font-mono-jb">
            {onOpenReceiveAdvance ? (
              <button
                type="button"
                onClick={onOpenReceiveAdvance}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ef4444] hover:bg-[#dc2626] text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Receive Advance</span>
              </button>
            ) : (
              <span className="text-[rgba(248,247,244,0.5)] text-[11px]">
                Active cash deposits
              </span>
            )}

            {summary && ((summary.advancePayments && summary.advancePayments.length > 0) || summary.advanceJobs.length > 0) && (
              <button
                onClick={() => setShowAdvanceList(!showAdvanceList)}
                className="text-[#ef4444] font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer text-xs"
              >
                <span>{showAdvanceList ? 'Hide' : 'View'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanceList ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* KPI 3: Jobs Received Today */}
        <div className="bg-[#111113] rounded-xl border border-[rgba(248,247,244,0.1)] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[rgba(248,247,244,0.5)] font-bold block">
                Jobs Received
              </span>
              <div className="font-mono-jb text-3xl font-black text-[#f8f7f4] mt-1">
                {loading ? '...' : jobsReceived}
              </div>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#1c1c1e] text-[rgba(248,247,244,0.6)] flex items-center justify-center border border-[rgba(248,247,244,0.1)]">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(248,247,244,0.1)] text-xs text-[rgba(248,247,244,0.5)] font-mono-jb">
            New intake phones on {selectedDate}
          </div>
        </div>

        {/* KPI 4: Total Estimated Revenue */}
        <div className="bg-[#111113] rounded-xl border border-[rgba(248,247,244,0.1)] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[rgba(248,247,244,0.5)] font-bold block">
                Total Estimated Value
              </span>
              <div className="font-mono-jb text-2xl font-black text-[#f8f7f4] mt-1">
                {loading ? '...' : `LKR ${estimatedTotal.toLocaleString()}`}
              </div>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#1c1c1e] text-[rgba(248,247,244,0.6)] flex items-center justify-center border border-[rgba(248,247,244,0.1)]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(248,247,244,0.1)] text-xs text-[rgba(248,247,244,0.5)] font-mono-jb">
            Quoted value of intake repairs
          </div>
        </div>
      </div>

      {/* Expandable Section 1: Completed Repairs List */}
      {showCompletedList && summary && summary.completedJobs.length > 0 && (
        <div className="bg-[#111113] rounded-xl border border-emerald-500/30 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Repairs Completed on {selectedDate} ({summary.completedJobs.length})</span>
            </h4>
            <span className="font-mono-jb text-xs font-bold text-emerald-400">Delivered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
            {summary.completedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-[#1c1c1e] p-3 rounded-lg border border-[rgba(248,247,244,0.08)] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-jb font-bold text-[#ef4444]">{job.jobNumber}</span>
                    <span className="font-bold text-[#f8f7f4]">{job.customerName}</span>
                  </div>
                  <div className="text-[rgba(248,247,244,0.6)] mt-0.5">
                    {job.deviceBrand} {job.deviceModel} &bull; Tech: {job.technicianName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-jb font-black text-[#f8f7f4]">LKR {job.estimatedPrice}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">Delivered</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Section 2: Advance Payments Breakdown */}
      {showAdvanceList && summary && (
        <div className="bg-[#111113] rounded-xl border border-[#ef4444]/30 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-[#ef4444] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#ef4444]" />
              <span>
                Advance Payments on {selectedDate} ({summary.advancePayments?.length ?? summary.advanceJobs.length} records)
              </span>
            </h4>
            <span className="font-mono-jb text-xs font-bold text-[#f8f7f4]">
              Remaining: LKR {advanceRevenue.toLocaleString()}
            </span>
          </div>

          {summary.advancePayments && summary.advancePayments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {summary.advancePayments.map((adv) => (
                <div
                  key={adv.id}
                  className="bg-[#1c1c1e] p-3.5 rounded-lg border border-[rgba(248,247,244,0.08)] flex flex-col justify-between text-xs gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-jb font-bold text-[#ef4444] px-2 py-0.5 rounded bg-[#111113] border border-[rgba(248,247,244,0.1)]">
                          {adv.receiptNumber}
                        </span>
                        <span className="font-bold text-[#f8f7f4]">{adv.customerName}</span>
                      </div>
                      <div className="font-mono-jb text-[11px] text-[rgba(248,247,244,0.5)] mt-0.5">{adv.phoneNumber}</div>
                    </div>

                    <span
                      className={`font-mono-jb text-[10px] font-bold px-2 py-0.5 rounded border ${
                        adv.status === 'Fully Applied'
                          ? 'bg-[#111113] text-[rgba(248,247,244,0.5)] border-[rgba(248,247,244,0.1)]'
                          : adv.status === 'Partially Applied'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {adv.status}
                    </span>
                  </div>

                  <div className="bg-[#111113] p-2 rounded-lg border border-[rgba(248,247,244,0.08)] grid grid-cols-3 gap-1 text-center text-[11px] font-mono-jb">
                    <div>
                      <span className="text-[rgba(248,247,244,0.4)] block text-[9px] uppercase font-bold">Original</span>
                      <span className="font-bold text-[#f8f7f4]">LKR {adv.originalAmount}</span>
                    </div>
                    <div>
                      <span className="text-[rgba(248,247,244,0.4)] block text-[9px] uppercase font-bold">Used</span>
                      <span className="font-bold text-[#f8f7f4]">LKR {adv.usedAmount}</span>
                    </div>
                    <div>
                      <span className="text-[rgba(248,247,244,0.4)] block text-[9px] uppercase font-bold">Remaining</span>
                      <span className={`font-black ${adv.remainingAmount > 0 ? 'text-emerald-400' : 'text-[rgba(248,247,244,0.4)]'}`}>
                        LKR {adv.remainingAmount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[rgba(248,247,244,0.08)] font-mono-jb">
                    <span className="text-[rgba(248,247,244,0.4)]">
                      Invoice Reference:
                    </span>
                    <span className="font-bold text-[#f8f7f4]">
                      {adv.invoiceReference || 'None (Available)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
              {summary.advanceJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-[#1c1c1e] p-3 rounded-lg border border-[rgba(248,247,244,0.08)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-jb font-bold text-[#ef4444]">{job.jobNumber}</span>
                      <span className="font-bold text-[#f8f7f4]">{job.customerName}</span>
                    </div>
                    <div className="text-[rgba(248,247,244,0.6)] mt-0.5">
                      {job.deviceBrand} {job.deviceModel}
                    </div>
                  </div>
                  <div className="text-right font-mono-jb">
                    <div className="font-black text-[#ef4444] text-sm">
                      LKR {job.advancePaid}
                    </div>
                    <div className="text-[10px] text-[rgba(248,247,244,0.4)]">
                      Est: LKR {job.estimatedPrice}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Printable Daily Closing Slip (Visible only in print) */}
      <div className="print-only">
        <div style={{ maxWidth: '380px', margin: '0 auto', fontFamily: 'monospace', padding: '10px' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{shopName}</h1>
            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>DAILY REPAIR & CASH SUMMARY</p>
            <p style={{ fontSize: '11px', margin: '4px 0 0 0' }}>Date: {selectedDate}</p>
          </div>

          <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Repairs Completed:</span>
              <strong>{completedCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Advance Payments Collected:</span>
              <strong>Rs. {advanceRevenue}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Jobs Received:</span>
              <strong>{jobsReceived}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Intake Job Value:</span>
              <strong>Rs. {estimatedTotal}</strong>
            </div>
          </div>

          {summary && summary.completedJobs.length > 0 && (
            <div style={{ borderTop: '1px dashed black', paddingTop: '8px', marginTop: '8px', fontSize: '11px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Completed Devices:</p>
              {summary.completedJobs.map((j) => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{j.jobNumber} - {j.deviceBrand} {j.deviceModel}</span>
                  <span>Rs. {j.estimatedPrice}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '16px', borderTop: '1px solid black', paddingTop: '6px' }}>
            <p style={{ margin: 0 }}>Cashier Register End of Day Closing</p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{shopName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
