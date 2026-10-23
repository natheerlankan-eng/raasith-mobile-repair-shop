import React, { useMemo } from 'react';
import { RepairJob, JobStatus, DailySummary } from '../types.ts';
import { StatusSelector } from './StatusBadge.tsx';
import { isJobReadyForPickup } from './RecallRepairJobModal.tsx';
import {
  parseJobIssues,
  formatWhatsAppPhone,
  generateReceivedMessage,
  generateReadyMessage,
  openWhatsAppMessage,
  generateHealthPassportWhatsApp,
} from '../utils/whatsapp.ts';
import { generateReceivedSMS, generateReadySMS, openCarrierSMS } from '../utils/sms.ts';
import {
  Smartphone,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  MessageCircle,
  MessageSquare,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Check,
  MapPin,
  Eye,
  Calendar,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

interface HomeScreenProps {
  jobs: RepairJob[];
  dailySummary: DailySummary | null;
  onOpenNewJob: () => void;
  onNavigate: (view: 'jobs' | 'summary' | 'customers' | 'technicians') => void;
  onStatusChange: (job: RepairJob, newStatus: JobStatus) => void;
  onUpdateMessageSent: (
    jobId: number,
    type: 'received' | 'ready' | 'sms_received' | 'sms_ready',
    sent: boolean
  ) => void;
  onPrintJob: (job: RepairJob) => void;
  onManageSpareParts: (job: RepairJob) => void;
  onViewJob?: (job: RepairJob) => void;
  onOpenPassport?: (job: RepairJob) => void;
  onSearchQuery: (query: string) => void;
  countryCode: string;
  shopName: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  jobs = [],
  dailySummary,
  onOpenNewJob,
  onNavigate,
  onStatusChange,
  onUpdateMessageSent,
  onPrintJob,
  onViewJob,
  onOpenPassport,
  countryCode,
  shopName,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';
  const activeLogoUrl = shopProfile?.logoUrl || '/images/raasith_logo.png';
  const activeBranch = shopProfile?.branch || 'Management Desk';

  // Pending active in-shop jobs
  const pendingJobs = useMemo(() => {
    return jobs.filter((j) =>
      ['Received', 'In Repair', 'Waiting for Parts', 'Ready for Pickup'].includes(j.status)
    );
  }, [jobs]);

  // Requirement 2: Strict "Ready for Pickup" only for Collection Queue
  // Received, Pending, In Progress, Waiting for Parts, Delivered, and Cancelled are completely excluded
  const readyJobs = useMemo(() => {
    return jobs.filter((j) => isJobReadyForPickup(j));
  }, [jobs]);

  // Requirement 3: Strictly limited to Today and Yesterday (current date and previous day)
  const recentJobsTodayYesterday = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    // Local string representations (YYYY-MM-DD)
    const localToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const localYesterday = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`;

    // UTC string representations in case timestamps are in UTC
    const utcToday = now.toISOString().split('T')[0];
    const utcYesterday = yesterdayDate.toISOString().split('T')[0];

    return jobs.filter((job) => {
      const d = (job.date || '').trim().substring(0, 10);
      const c = (job.createdAt || '').trim().substring(0, 10);

      const isToday = d === localToday || d === utcToday || c === localToday || c === utcToday;
      const isYesterday = d === localYesterday || d === utcYesterday || c === localYesterday || c === utcYesterday;

      return isToday || isYesterday;
    });
  }, [jobs]);

  // Helper to get day indicator (Today vs Yesterday)
  const getJobDayInfo = (job: RepairJob) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const utcToday = now.toISOString().split('T')[0];

    const d = (job.date || '').trim().substring(0, 10);
    const c = (job.createdAt || '').trim().substring(0, 10);

    if (d === localToday || d === utcToday || c === localToday || c === utcToday) {
      return { label: 'TODAY', className: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40' };
    }
    return { label: 'YESTERDAY', className: 'text-amber-400 bg-amber-950/80 border-amber-500/40' };
  };

  const handleSendWA = (job: RepairJob, type: 'received' | 'ready') => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    const msg =
      type === 'received'
        ? generateReceivedMessage(job, activeShopName)
        : generateReadyMessage(job, activeShopName);
    openWhatsAppMessage(formattedPhone, msg);
    onUpdateMessageSent(job.id, type, true);
  };

  const handleSendSMS = (job: RepairJob, type: 'received' | 'ready') => {
    const msg =
      type === 'received'
        ? generateReceivedSMS(job, activeShopName)
        : generateReadySMS(job, activeShopName);
    openCarrierSMS(job.phoneNumber, msg, countryCode);
    onUpdateMessageSent(job.id, type === 'received' ? 'sms_received' : 'sms_ready', true);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4 space-y-3.5 sm:space-y-4">
      {/* 1. COMPACT HERO BANNER: Management Desk */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl border border-red-950/40 text-white min-h-0">
        {/* Background Image from signboard design */}
        <img
          src={shopProfile?.bannerUrl || "/src/assets/images/raasith_desk_banner_1791308361536.jpg"}
          alt={`${activeShopName} Management Desk Signboard`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.45] contrast-[1.15]"
        />

        {/* Ambient Dark Tech Glow & Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-red-950/80 to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-red-950/30" />

        {/* Compact Content Row */}
        <div className="relative z-10 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Main Brand & Emblem */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-950 p-0.5 border-2 border-red-500 shadow-lg shadow-red-600/40 flex items-center justify-center shrink-0 relative overflow-hidden ring-2 ring-red-500/20">
              <img
                src={activeLogoUrl}
                alt={activeShopName}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
                }}
              />
            </div>

            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white flex flex-wrap items-center gap-1.5 drop-shadow-md">
                <span>{activeShopName}</span>
                <span className="text-xs sm:text-sm text-slate-300 font-semibold tracking-normal px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-xs ml-1">
                  {activeBranch}
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-300/80 font-medium leading-tight mt-0.5 hidden sm:block">
                {shopProfile?.address ? `${shopProfile.address}${shopProfile.phone ? ` • Tel: ${shopProfile.phone}` : ''}` : 'Counter intake, live status tracking, technician commissions & instant notifications.'}
              </p>
            </div>
          </div>

          {/* Quick Intake Actions inside Banner (Eliminates dead space) */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={onOpenNewJob}
              className="px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-oswald text-xs uppercase tracking-wider font-bold rounded-xl shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ New Repair Intake</span>
            </button>
            <button
              onClick={() => onNavigate('jobs')}
              className="px-3 py-1.5 sm:py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white font-mono-jb text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              title="Open complete repair jobs registry"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Jobs Registry</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME KPI STATS GRID (Expanded Spacing & Clear Typography) */}
      <div className="stats-strip grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Active Jobs */}
        <div
          onClick={() => onNavigate('jobs')}
          className="stat-card bg-[#1c1c1e] p-4 sm:p-4.5 rounded-2xl border border-[rgba(248,247,244,0.12)] hover:border-[#ef4444]/50 transition-all cursor-pointer group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="label font-mono-jb text-xs sm:text-sm font-bold uppercase tracking-wider text-[rgba(248,247,244,0.7)]">
              Active Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="value font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4] group-hover:text-[#ef4444] transition-colors">
              {pendingJobs.length}
            </span>
            <span className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.5)] uppercase font-semibold">In Shop</span>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div
          onClick={() => onNavigate('jobs')}
          className="stat-card bg-[#1c1c1e] p-4 sm:p-4.5 rounded-2xl border border-[rgba(248,247,244,0.12)] hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="label font-mono-jb text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400">
              Ready for Pickup
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="value font-mono-jb text-2xl sm:text-3xl font-black text-emerald-400">
              {readyJobs.length}
            </span>
            <span className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.5)] uppercase font-semibold">Collection Queue</span>
          </div>
        </div>

        {/* Today's Completed */}
        <div
          onClick={() => onNavigate('summary')}
          className="stat-card bg-[#1c1c1e] p-4 sm:p-4.5 rounded-2xl border border-[rgba(248,247,244,0.12)] hover:border-[#ef4444]/50 transition-all cursor-pointer group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="label font-mono-jb text-xs sm:text-sm font-bold uppercase tracking-wider text-[rgba(248,247,244,0.7)]">
              Delivered Today
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="value font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4]">
              {dailySummary?.totalCompletedRepairs ?? 0}
            </span>
            <span className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.5)] uppercase font-semibold">Completed</span>
          </div>
        </div>

        {/* Today's Advance Revenue */}
        <div
          onClick={() => onNavigate('summary')}
          className="stat-card bg-[#1c1c1e] p-4 sm:p-4.5 rounded-2xl border border-[rgba(248,247,244,0.12)] hover:border-[#ef4444]/50 transition-all cursor-pointer group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="label font-mono-jb text-xs sm:text-sm font-bold uppercase tracking-wider text-[rgba(248,247,244,0.7)]">
              Advances Today
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="value font-mono-jb text-lg sm:text-xl font-black text-[#f8f7f4]">
              LKR {(dailySummary?.totalAdvanceRevenue ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. QUICK NAVIGATION SHORTCUTS (Compact Horizontal Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
        <button
          onClick={() => onNavigate('jobs')}
          className="p-2.5 sm:p-3 bg-[#1c1c1e] hover:bg-[#252528] rounded-xl border border-[rgba(248,247,244,0.1)] text-left transition-all cursor-pointer group flex items-center gap-2.5 shadow-xs"
        >
          <div className="w-8 h-8 rounded-lg bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-oswald uppercase tracking-wider text-xs font-semibold text-[#f8f7f4] truncate">
              All Repair Jobs
            </div>
            <div className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.5)] truncate">
              Filter, search &amp; status
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('summary')}
          className="p-2.5 sm:p-3 bg-[#1c1c1e] hover:bg-[#252528] rounded-xl border border-[rgba(248,247,244,0.1)] text-left transition-all cursor-pointer group flex items-center gap-2.5 shadow-xs"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-oswald uppercase tracking-wider text-xs font-semibold text-[#f8f7f4] truncate">
              Daily Summary
            </div>
            <div className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.5)] truncate">
              Cash closing &amp; revenue
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('technicians')}
          className="p-2.5 sm:p-3 bg-[#1c1c1e] hover:bg-[#252528] rounded-xl border border-[rgba(248,247,244,0.1)] text-left transition-all cursor-pointer group flex items-center gap-2.5 shadow-xs"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-oswald uppercase tracking-wider text-xs font-semibold text-[#f8f7f4] truncate">
              Technicians
            </div>
            <div className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.5)] truncate">
              Staff list &amp; workload
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('customers')}
          className="p-2.5 sm:p-3 bg-[#1c1c1e] hover:bg-[#252528] rounded-xl border border-[rgba(248,247,244,0.1)] text-left transition-all cursor-pointer group flex items-center gap-2.5 shadow-xs"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-oswald uppercase tracking-wider text-xs font-semibold text-[#f8f7f4] truncate">
              Client Directory
            </div>
            <div className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.5)] truncate">
              History &amp; past repairs
            </div>
          </div>
        </button>
      </div>

      {/* 4. READY FOR PICKUP / COLLECTION QUEUE (Strictly 'Ready for Pickup' only) */}
      <div className="bg-[#1c1c1e] rounded-xl border border-emerald-500/30 p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <h3 className="font-oswald text-sm sm:text-base uppercase tracking-wider font-bold text-[#f8f7f4]">
              READY FOR PICKUP / COLLECTION QUEUE
            </h3>
            <span className="font-mono-jb text-[10px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              {readyJobs.length} {readyJobs.length === 1 ? 'Device' : 'Devices'}
            </span>
          </div>
          <span className="font-mono-jb text-[10px] text-emerald-400/80 uppercase tracking-wider hidden sm:inline">
            Awaiting Customer Collection
          </span>
        </div>

        {readyJobs.length === 0 ? (
          <div className="bg-[#111113] p-4 rounded-xl border border-slate-800/80 text-center text-xs font-mono-jb text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
            <span>Collection queue is clear. No devices currently marked as &ldquo;Ready for Pickup&rdquo;.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {readyJobs.map((job) => {
              const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
              const balance =
                job.dueAmount !== undefined
                  ? job.dueAmount
                  : Math.max(0, job.estimatedPrice + partsCost - job.advancePaid);

              return (
                <div
                  key={job.id}
                  className="bg-[#111113] p-3 sm:p-3.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 space-y-2.5 flex flex-col justify-between transition-all shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => (onViewJob ? onViewJob(job) : onPrintJob(job))}
                        className="font-mono-jb font-bold text-[#f8f7f4] hover:text-[#ef4444] text-xs px-2 py-0.5 bg-[#1c1c1e] border border-[rgba(248,247,244,0.12)] rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="View complete Job Order details & payment breakdown"
                      >
                        <Eye className="w-3 h-3 text-[rgba(248,247,244,0.5)]" />
                        <span>{job.jobNumber}</span>
                      </button>
                      <span className="font-mono-jb font-bold text-[#ef4444] text-xs">
                        Due: LKR {balance.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="font-bold text-[#f8f7f4] text-sm">{job.customerName}</div>
                      <div className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)]">
                        {job.phoneNumber}
                      </div>
                      {job.customerAddress && (
                        <div className="text-[11px] text-[rgba(248,247,244,0.5)] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[rgba(248,247,244,0.4)] shrink-0" />
                          <span className="truncate">{job.customerAddress}</span>
                        </div>
                      )}
                      <div className="font-medium text-xs text-[rgba(248,247,244,0.8)] mt-1">
                        {job.deviceBrand} {job.deviceModel}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[rgba(248,247,244,0.08)]">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                      <button
                        onClick={() => handleSendWA(job, 'ready')}
                        className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 border cursor-pointer font-mono-jb ${
                          job.readyMsgSent
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-[#1c1c1e] text-[rgba(248,247,244,0.8)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WA Ready</span>
                        {job.readyMsgSent && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                      </button>

                      <button
                        onClick={() => handleSendSMS(job, 'ready')}
                        className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 border cursor-pointer font-mono-jb ${
                          job.smsReadySent
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-[#1c1c1e] text-[rgba(248,247,244,0.8)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>Carrier SMS</span>
                        {job.smsReadySent && <Check className="w-3 h-3 text-sky-400 stroke-[3]" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      {onViewJob && (
                        <button
                          type="button"
                          onClick={() => onViewJob(job)}
                          className="py-1.5 bg-[#1c1c1e] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.1)] font-mono-jb text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[rgba(248,247,244,0.5)]" />
                          <span>View Details</span>
                        </button>
                      )}
                      <button
                        onClick={() => onStatusChange(job, 'Delivered')}
                        className={`py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-oswald uppercase tracking-wider text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs ${
                          onViewJob ? '' : 'col-span-2'
                        }`}
                      >
                        Deliver (LKR {balance.toLocaleString()})
                      </button>
                    </div>

                    {/* Send Phone Health Passport via WhatsApp Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenPassport) {
                          onOpenPassport(job);
                        } else {
                          const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
                          const message = generateHealthPassportWhatsApp(job, activeShopName);
                          openWhatsAppMessage(formattedPhone, message);
                        }
                      }}
                      className="w-full mt-1.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 font-mono-jb text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      title="Send Phone Health Passport via WhatsApp"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Send Phone Health Passport via WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. RECENT REPAIR JOBS PANEL: Strictly Today & Yesterday Activity */}
      <div className="jobs-panel bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="panel-header flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-oswald text-sm sm:text-base uppercase tracking-wider font-semibold text-[#f8f7f4]">
                Recent Repair Jobs (Today &amp; Yesterday)
              </h3>
              <span className="font-mono-jb text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                {recentJobsTodayYesterday.length} {recentJobsTodayYesterday.length === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>
            <p className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.5)] uppercase">
              Immediate short-term workbench intake &amp; dispatch activity
            </p>
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            className="text-xs font-mono-jb text-[#ef4444] hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <span>View All Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentJobsTodayYesterday.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-mono-jb bg-[#111113] rounded-xl border border-[rgba(248,247,244,0.08)] space-y-1">
            <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-1" />
            <p className="font-semibold text-slate-300">No repair jobs recorded for Today or Yesterday.</p>
            <p className="text-[11px] text-slate-500">New intakes logged on counter will immediately appear here.</p>
          </div>
        ) : (
          <div className="job-list max-h-[380px] overflow-y-auto pr-1 space-y-2">
            {recentJobsTodayYesterday.map((job) => {
              const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
              const balance =
                job.dueAmount !== undefined
                  ? job.dueAmount
                  : Math.max(0, job.estimatedPrice + partsCost - job.advancePaid);
              const issuesText = parseJobIssues(job);
              const dayInfo = getJobDayInfo(job);

              return (
                <div
                  key={job.id}
                  className="p-3 bg-[#111113] hover:bg-[#18181b] rounded-lg border border-[rgba(248,247,244,0.08)] hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => (onViewJob ? onViewJob(job) : onPrintJob(job))}
                        className="font-mono-jb font-bold text-[#f8f7f4] hover:text-[#ef4444] px-2 py-0.5 bg-[#1c1c1e] rounded border border-[rgba(248,247,244,0.12)] transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                        title="View complete Job Order details"
                      >
                        <Eye className="w-3 h-3 text-[rgba(248,247,244,0.5)]" />
                        <span>{job.jobNumber}</span>
                      </button>

                      {/* Day Label (Today / Yesterday) */}
                      <span
                        className={`text-[9px] font-mono-jb font-black px-1.5 py-0.5 rounded border uppercase ${dayInfo.className}`}
                      >
                        {dayInfo.label}
                      </span>

                      <span className="font-bold text-[#f8f7f4] text-xs sm:text-sm">{job.customerName}</span>
                      <span className="font-mono-jb text-[rgba(248,247,244,0.5)] text-xs">
                        ({job.phoneNumber})
                      </span>
                      {job.customerAddress && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[rgba(248,247,244,0.5)] bg-[#1c1c1e] px-1.5 py-0.5 rounded font-mono-jb">
                          <MapPin className="w-3 h-3 text-[rgba(248,247,244,0.4)] shrink-0" />
                          <span className="truncate max-w-[120px]">{job.customerAddress}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[rgba(248,247,244,0.85)]">
                      <span className="font-semibold text-white">
                        {job.deviceBrand} {job.deviceModel}
                      </span>{' '}
                      &bull; <span className="text-[rgba(248,247,244,0.6)]">{issuesText}</span>
                    </div>

                    <div className="text-[rgba(248,247,244,0.5)] font-mono-jb text-[11px] flex items-center gap-2 flex-wrap">
                      <span>Est: LKR {job.estimatedPrice.toLocaleString()}</span>
                      <span>|</span>
                      <span>Adv: LKR {job.advancePaid.toLocaleString()}</span>
                      <span>|</span>
                      <span className="font-bold text-[#ef4444]">Due: LKR {balance.toLocaleString()}</span>
                      <span>&bull;</span>
                      <span className="text-slate-400">Tech: {job.technicianName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <StatusSelector
                      currentStatus={job.status}
                      onStatusChange={(newStatus) => onStatusChange(job, newStatus)}
                    />

                    <button
                      onClick={() => {
                        if (onOpenPassport) {
                          onOpenPassport(job);
                        } else {
                          const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
                          const message = generateHealthPassportWhatsApp(job, activeShopName);
                          openWhatsAppMessage(formattedPhone, message);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-lg font-mono-jb text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Send Phone Health Passport via WhatsApp"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>WA Passport</span>
                    </button>

                    {onViewJob && (
                      <button
                        onClick={() => onViewJob(job)}
                        className="px-2.5 py-1.5 bg-[#1c1c1e] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.12)] rounded-lg font-mono-jb text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="View complete Job Order details & payment breakdown"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#ef4444]" />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
