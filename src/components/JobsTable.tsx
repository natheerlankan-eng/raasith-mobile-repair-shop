import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Phone,
  User,
  Smartphone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Edit,
  Printer,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface JobsTableProps {
  token?: string | null;
  currency?: string;
  jobs?: any[];
  onRecallJobToPOS?: (job: any) => void;
  onOpenJobSheet?: (jobId: number) => void;
  onOpenNewJob?: () => void;
}

export const JobsTable: React.FC<JobsTableProps> = ({
  token,
  currency = 'Rs',
  jobs = [],
  onRecallJobToPOS,
  onOpenJobSheet,
  onOpenNewJob,
}) => {
  const [jobList, setJobList] = useState<any[]>(jobs || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/repair-jobs', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setJobList(data);
        }
      }
    } catch (err) {
      setErrorNotice('Failed to load repair jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobs || jobs.length === 0) {
      fetchJobs();
    } else {
      setJobList(jobs);
    }
  }, [jobs, token]);

  const filteredJobs = jobList.filter((j) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const jobNumMatch = (j.jobNumber || '').toLowerCase().includes(q);
      const nameMatch = (j.customerName || '').toLowerCase().includes(q);
      const phoneMatch = (j.phoneNumber || '').toLowerCase().includes(q);
      const brandMatch = (j.deviceBrand || '').toLowerCase().includes(q);
      const modelMatch = (j.deviceModel || '').toLowerCase().includes(q);
      if (!jobNumMatch && !nameMatch && !phoneMatch && !brandMatch && !modelMatch) return false;
    }
    if (filterStatus !== 'All' && j.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden select-none font-mono-jb">
      
      {/* 1. TOP HEADER SECTION - SILVER THEME (INVENTORY STYLE) */}
      <div className="bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 border-b border-slate-400 p-3.5 sm:px-6 shrink-0 shadow-lg space-y-3 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-500 flex items-center justify-center shadow-inner">
              <Wrench className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                  REPAIR JOBS & SERVICE BENCH
                </h1>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                  TECH WORKSHOP & JOBS
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-bold uppercase">
                DEVICE REPAIRS &bull; JOB TICKETS &bull; SPARE PARTS & STATUS TRACKING
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewJob && (
              <button
                onClick={onOpenNewJob}
                className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ New Repair Job</span>
              </button>
            )}

            <button
              onClick={fetchJobs}
              title="Refresh repair jobs"
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Total Jobs</span>
              <span className="text-lg font-black text-slate-900">{jobList.length}</span>
            </div>
            <Wrench className="w-5 h-5 text-slate-800 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Pending / In Progress</span>
              <span className="text-lg font-black text-amber-600">
                {jobList.filter((j) => j.status !== 'Delivered' && j.status !== 'Completed').length}
              </span>
            </div>
            <Clock className="w-5 h-5 text-amber-600 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Ready for Pickup</span>
              <span className="text-lg font-black text-emerald-600">
                {jobList.filter((j) => j.status === 'Ready' || j.status === 'Completed').length}
              </span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Delivered Jobs</span>
              <span className="text-lg font-black text-blue-600">
                {jobList.filter((j) => j.status === 'Delivered').length}
              </span>
            </div>
            <Smartphone className="w-5 h-5 text-blue-600 opacity-80" />
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="bg-white border-b border-slate-300 p-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Job Number, Customer Name, Phone, Model..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-500 shadow-inner"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Status:</span>
          {['All', 'Pending', 'In Progress', 'Ready', 'Completed', 'Delivered'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-500'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {errorNotice && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* REPAIR TABLE SECTION */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-100 font-pos-table">
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-slate-900">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-200 text-slate-800 uppercase text-xs font-bold tracking-wider border-b border-slate-300">
                <th className="py-3 px-4 text-center w-14 border-r border-slate-300">#</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">JOB NUMBER</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">CUSTOMER DETAILS</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">DEVICE & ISSUE</th>
                <th className="py-3 px-4 text-center border-r border-slate-300 w-28">STATUS</th>
                <th className="py-3 px-4 text-right border-r border-slate-300 w-32">ESTIMATED / DUE</th>
                <th className="py-3 px-4 text-center w-36">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-700 mb-2" />
                    <span>Loading repair jobs...</span>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500 font-bold">
                    No repair jobs found matching your search.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const estPrice = Number(job.estimatedPrice) || 0;
                  const advPaid = Number(job.advancePaid) || 0;
                  const due = Math.max(0, estPrice - advPaid);

                  return (
                    <tr key={job.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300">
                          {job.jobNumber || `#${job.id}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          <span>{job.customerName || 'Walk-in'}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{job.phoneNumber || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 border-r border-slate-200">
                        <div className="font-bold text-slate-900">
                          {job.deviceBrand} {job.deviceModel}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {job.reportedIssue || job.issueDescription || 'No description'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center border-r border-slate-200">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          job.status === 'Delivered'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : job.status === 'Ready' || job.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {job.status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold border-r border-slate-200">
                        <div className="text-slate-900">{currency} {estPrice.toLocaleString()}</div>
                        {due > 0 && <div className="text-[10px] text-rose-600 font-black">Due: {currency} {due.toLocaleString()}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onOpenJobSheet && (
                            <button
                              type="button"
                              onClick={() => onOpenJobSheet(job.id)}
                              title="Print Job Ticket / Slip"
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-800 hover:text-white border border-slate-300 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onRecallJobToPOS && (
                            <button
                              type="button"
                              onClick={() => onRecallJobToPOS(job)}
                              title="Recall Job into POS Bill"
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-colors cursor-pointer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};