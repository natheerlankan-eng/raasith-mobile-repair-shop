import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  X,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Clock,
  Smartphone,
  User,
  Phone,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { RepairJob } from '../types';

export interface RecallRepairJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: RepairJob[];
  onSelectJob: (job: RepairJob) => void;
  currency?: string;
}

/**
 * Helper to determine if a job order is already delivered, completed, or closed.
 * Delivered jobs have already been collected, fully paid, and invoiced,
 * so they are completely excluded from the POS recall window.
 */
export const isJobDelivered = (
  statusOrJob: string | RepairJob | null | undefined
): boolean => {
  if (!statusOrJob) return false;
  const statusStr =
    typeof statusOrJob === 'string' ? statusOrJob : statusOrJob.status || '';
  const s = statusStr.toLowerCase().trim();

  return (
    s === 'delivered' ||
    s === 'completed' ||
    s === 'closed'
  );
};

/**
 * Strict validation rule for repair job recall into POS bill.
 * Permitted: Explicitly 'Ready for Pickup', 'Ready to Pick Up', 'Ready to Collect', or 'Ready'
 * Blocked: Anything else ('Received', 'Pending', 'In Repair', 'In Progress', 'Waiting for Parts', 'Cancelled', 'Delivered', etc.)
 */
export const isJobReadyForPickup = (
  statusOrJob: string | RepairJob | null | undefined
): boolean => {
  if (!statusOrJob) return false;
  const statusStr =
    typeof statusOrJob === 'string' ? statusOrJob : statusOrJob.status || '';
  const s = statusStr.toLowerCase().trim();

  // Delivered jobs are already closed and never eligible for POS bill recall
  if (isJobDelivered(statusStr)) return false;

  return (
    s === 'ready for pickup' ||
    s === 'ready to pick up' ||
    s === 'ready to collect' ||
    s === 'ready'
  );
};

export const RecallRepairJobModal: React.FC<RecallRepairJobModalProps> = ({
  isOpen,
  onClose,
  jobs = [],
  onSelectJob,
  currency = 'LKR',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'not-ready'>('all');

  // Warning Popup state for blocked recall attempts
  const [blockedJobNotice, setBlockedJobNotice] = useState<{
    isOpen: boolean;
    job: RepairJob | null;
    message: string;
  }>({
    isOpen: false,
    job: null,
    message: '',
  });

  // Requirement: Exclude "Delivered" (or completed/closed) jobs from the recall window.
  // Delivered jobs have already been paid, invoiced, and handed over to the customer.
  const activeJobs = useMemo(() => {
    return (jobs || []).filter((job) => !isJobDelivered(job));
  }, [jobs]);

  // Calculate counts based exclusively on active (non-delivered) jobs
  const readyCount = useMemo(() => {
    return activeJobs.filter((j) => isJobReadyForPickup(j)).length;
  }, [activeJobs]);

  const notReadyCount = useMemo(() => {
    return activeJobs.filter((j) => !isJobReadyForPickup(j)).length;
  }, [activeJobs]);

  // Filter and search active jobs
  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activeJobs.filter((job) => {
      // Tab filter
      const isReady = isJobReadyForPickup(job);
      if (filterTab === 'ready' && !isReady) return false;
      if (filterTab === 'not-ready' && isReady) return false;

      // Query filter
      if (!q) return true;
      const jNum = (job.jobNumber || '').toLowerCase();
      const cName = (job.customerName || '').toLowerCase();
      const phone = (job.phoneNumber || '').toLowerCase().replace(/[^0-9]/g, '');
      const rawQDigits = q.replace(/[^0-9]/g, '');
      const dBrand = (job.deviceBrand || '').toLowerCase();
      const dModel = (job.deviceModel || '').toLowerCase();
      const status = (job.status || '').toLowerCase();

      return (
        jNum.includes(q) ||
        cName.includes(q) ||
        (rawQDigits.length >= 2 && phone.includes(rawQDigits)) ||
        dBrand.includes(q) ||
        dModel.includes(q) ||
        status.includes(q)
      );
    });
  }, [activeJobs, searchQuery, filterTab]);

  // Handler for recall attempt
  const handleAttemptRecall = (job: RepairJob) => {
    if (isJobDelivered(job)) {
      setBlockedJobNotice({
        isOpen: true,
        job,
        message:
          "This job order has already been Delivered and completed. Delivered jobs cannot be recalled into the POS bill.",
      });
      return;
    }

    if (!isJobReadyForPickup(job)) {
      setBlockedJobNotice({
        isOpen: true,
        job,
        message:
          "This job order is not ready to pick up. The status must be 'Ready for Pickup' before it can be recalled into the POS bill.",
      });
      return;
    }

    // Status is strictly Ready for Pickup: Proceed with recall into POS bill
    onSelectJob(job);
    onClose();
  };

  // Keyboard Enter key in search box auto-selects if single match or exact job match
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredJobs.length === 1) {
        handleAttemptRecall(filteredJobs[0]);
      } else if (searchQuery.trim()) {
        const exact = filteredJobs.find(
          (j) => j.jobNumber.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        if (exact) {
          handleAttemptRecall(exact);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-mono-jb">
        <div className="bg-[#081335] border-2 border-cyan-500/50 rounded-3xl w-full max-w-3xl shadow-2xl shadow-cyan-950/80 overflow-hidden flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#06102e] via-[#091b48] to-[#040c24] border-b border-cyan-500/30 p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
                <Wrench className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Recall Repair Job into POS Bill
                </h3>
                <p className="text-xs text-cyan-200/70">
                  Strictly imports customer, device, advance deposit & pre-fitted parts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-cyan-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar & Filter Chips */}
          <div className="p-4 bg-[#050d28] border-b border-blue-500/20 space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search Job ID (e.g. RM-1017), customer name, phone, device model..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-xs sm:text-sm text-black font-bold placeholder:text-slate-500 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 px-1.5 py-0.5 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  filterTab === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'bg-[#081232] text-blue-200 hover:text-white border border-blue-500/30'
                }`}
              >
                <span>Active Jobs</span>
                <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded bg-black/20">
                  {activeJobs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('ready')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  filterTab === 'ready'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-[#081232] text-emerald-300 hover:text-white border border-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for Pickup</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 font-mono">
                  {readyCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('not-ready')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  filterTab === 'not-ready'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-[#081232] text-amber-300 hover:text-white border border-amber-500/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>In Progress / Pending</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 font-mono">
                  {notReadyCount}
                </span>
              </button>
            </div>
          </div>

          {/* Validation Policy Notice */}
          <div className="bg-[#03091e] border-b border-blue-500/15 px-4 py-2 flex items-center gap-2 text-[11px] text-blue-300/80 shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Validation Rule:</strong> Only jobs with status <strong>&ldquo;Ready for Pickup&rdquo;</strong> can be imported into POS for billing. Jobs still In Progress or Received are strictly locked.
            </span>
          </div>

          {/* Jobs List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-blue-500/15 space-y-1">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-blue-300/50 space-y-2">
                <Wrench className="w-10 h-10 mx-auto text-blue-400/30 stroke-1" />
                <p className="text-sm font-semibold">No repair jobs matching search criteria.</p>
                <p className="text-xs text-blue-400/40">Try searching by another Job ID or phone number.</p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isReady = isJobReadyForPickup(job);
                const balance =
                  job.dueAmount !== undefined
                    ? job.dueAmount
                    : Math.max(
                        0,
                        job.estimatedPrice +
                          (job.sparePartsAmount || job.totalPartsCost || 0) -
                          job.advancePaid
                      );

                return (
                  <div
                    key={job.id}
                    onClick={() => handleAttemptRecall(job)}
                    className={`p-3.5 sm:p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group border my-1 cursor-pointer ${
                      isReady
                        ? 'bg-[#071336]/80 hover:bg-[#0c1f55] border-cyan-500/30 hover:border-cyan-400 shadow-md'
                        : 'bg-[#091024]/60 hover:bg-[#0e1836] border-slate-700/50 opacity-90'
                    }`}
                  >
                    {/* Left: Job Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono-jb font-black text-xs sm:text-sm text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-500/40 group-hover:border-cyan-400">
                          {job.jobNumber}
                        </span>

                        {isReady ? (
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{job.status}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{job.status} (Not Ready)</span>
                          </span>
                        )}

                        <span className="text-[10px] text-blue-300/60 font-mono">
                          {job.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white truncate">
                        <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{job.customerName}</span>
                        <span className="text-blue-300 font-normal shrink-0 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-blue-400/70" />
                          {job.phoneNumber}
                        </span>
                      </div>

                      <div className="text-xs text-blue-200/80 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                          {job.deviceBrand} {job.deviceModel}
                        </span>
                        {job.imei && (
                          <span className="text-[10px] text-blue-300/50 font-mono">
                            IMEI: {job.imei}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Balance & Recall Action Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-500/10">
                      <div className="text-left sm:text-right space-y-0.5">
                        <div className="text-xs sm:text-sm font-black text-rose-300 flex items-center gap-1 justify-end">
                          <span className="text-[10px] text-blue-300 font-normal">Due:</span>
                          <span>{currency} {balance.toLocaleString()}</span>
                        </div>
                        {job.advancePaid > 0 && (
                          <div className="text-[10px] text-amber-300 font-mono">
                            Adv: {currency} {job.advancePaid.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Explicitly Styled Action Button */}
                      {isReady ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttemptRecall(job);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>RECALL INTO BILL</span>
                          <span className="font-bold">&rarr;</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttemptRecall(job);
                          }}
                          className="px-3 py-1.5 bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Click to view warning: Job is not ready for pickup"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                          <span>RECALL LOCKED</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-[#050d28] border-t border-blue-500/20 flex items-center justify-between text-xs text-blue-300/70 shrink-0">
            <div className="flex items-center gap-2">
              <span>Showing {filteredJobs.length} of {activeJobs.length} active jobs</span>
              <span className="text-[10px] bg-slate-800/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Delivered Excluded
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* STRICT STATUS VALIDATION WARNING POPUP */}
      {blockedJobNotice.isOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none font-mono-jb">
          <div className="bg-[#0b132b] border-2 border-rose-500/70 rounded-3xl w-full max-w-md shadow-2xl shadow-rose-950/80 overflow-hidden text-white p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-rose-300">
                  Job Recall Blocked
                </h3>
                <p className="text-[11px] text-slate-400">
                  {blockedJobNotice.job
                    ? `Job Order #${blockedJobNotice.job.jobNumber}`
                    : 'Status Validation Notice'}
                </p>
              </div>
            </div>

            {/* Mandatory Warning Messages */}
            <div className="bg-rose-950/60 border border-rose-500/40 p-4 rounded-2xl space-y-2.5">
              <p className="text-sm font-extrabold text-white leading-relaxed">
                &ldquo;{blockedJobNotice.message}&rdquo;
              </p>

              <p className="text-xs text-amber-200 font-semibold italic border-t border-rose-500/30 pt-2">
                &ldquo;It&apos;s not ready to pick up. Make it ready to pick up, then you can recall.&rdquo;
              </p>

              {blockedJobNotice.job && (
                <div className="pt-2 text-xs text-rose-200/90 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="font-bold uppercase px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40">
                      {blockedJobNotice.job.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Device:</span>
                    <span className="font-semibold text-white">
                      {blockedJobNotice.job.deviceBrand} {blockedJobNotice.job.deviceModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-semibold text-white">
                      {blockedJobNotice.job.customerName}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-rose-300/80 pt-1">
                To prevent unauthorized or premature billing, only jobs marked as{' '}
                <strong>&ldquo;Ready for Pickup&rdquo;</strong> can be recalled into the POS terminal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setBlockedJobNotice({ isOpen: false, job: null, message: '' })
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-rose-600/30 transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
