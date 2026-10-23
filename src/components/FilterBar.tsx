import React from 'react';
import { Search, X, Layers, Clock, CheckCircle2 } from 'lucide-react';

export type FilterTab = 'all' | 'pending' | 'completed' | 'my_jobs';

interface FilterBarProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  counts: {
    all: number;
    pending: number;
    completed: number;
    myJobs?: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  counts,
}) => {
  return (
    <div className="bg-[#1c1c1e] border-b border-[rgba(248,247,244,0.1)] px-4 sm:px-8 py-3.5 no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => onTabChange('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider font-oswald transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#ef4444] text-white shadow-md shadow-red-600/30'
                : 'bg-[#111113] text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4] border border-[rgba(248,247,244,0.08)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Jobs</span>
            <span
              className={`px-1.5 py-0.2 rounded font-mono-jb text-[11px] font-bold ${
                activeTab === 'all' ? 'bg-black/30 text-white' : 'bg-[#1c1c1e] text-[rgba(248,247,244,0.8)]'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => onTabChange('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider font-oswald transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-[#111113] text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4] border border-[rgba(248,247,244,0.08)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            <span
              className={`px-1.5 py-0.2 rounded font-mono-jb text-[11px] font-bold ${
                activeTab === 'pending' ? 'bg-black/30 text-white' : 'bg-[#1c1c1e] text-amber-400'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => onTabChange('completed')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider font-oswald transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-[#111113] text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4] border border-[rgba(248,247,244,0.08)]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
            <span
              className={`px-1.5 py-0.2 rounded font-mono-jb text-[11px] font-bold ${
                activeTab === 'completed' ? 'bg-black/30 text-white' : 'bg-[#1c1c1e] text-emerald-400'
              }`}
            >
              {counts.completed}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Job ID, name, or phone..."
            className="w-full pl-9 pr-9 py-2 bg-white border-2 border-slate-300 rounded-lg text-black text-xs font-bold placeholder:text-slate-500 focus:border-blue-600 focus:outline-hidden transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
