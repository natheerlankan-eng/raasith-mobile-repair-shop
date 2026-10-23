import React from 'react';
import { JobStatus } from '../types.ts';
import { ChevronDown } from 'lucide-react';

export const STATUS_CONFIG: Record<
  JobStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  Received: {
    label: 'Received',
    bg: 'bg-sky-500/10 hover:bg-sky-500/20',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
  },
  'In Repair': {
    label: 'In Repair',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  'Waiting for Parts': {
    label: 'Waiting for Parts',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
  },
  'Ready for Pickup': {
    label: 'Ready for Pickup',
    bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
    text: 'text-emerald-400 font-extrabold ring-1 ring-emerald-500/40',
    border: 'border-emerald-500/40',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  },
  Delivered: {
    label: 'Delivered',
    bg: 'bg-zinc-800/80 hover:bg-zinc-800',
    text: 'text-zinc-300',
    border: 'border-zinc-700/60',
    dot: 'bg-zinc-400',
  },
  Cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
  },
};

export const ALL_STATUSES: JobStatus[] = [
  'Received',
  'In Repair',
  'Waiting for Parts',
  'Ready for Pickup',
  'Delivered',
  'Cancelled',
];

interface StatusSelectorProps {
  currentStatus: JobStatus;
  onStatusChange: (status: JobStatus) => void;
  disabled?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Received;

  return (
    <div className="relative inline-block text-left">
      <select
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as JobStatus)}
        disabled={disabled}
        className={`appearance-none font-bold text-xs pl-7 pr-8 py-1.5 rounded-lg border ${config.bg} ${config.text} ${config.border} cursor-pointer transition-all focus:outline-hidden focus:ring-1 focus:ring-[#ef4444] disabled:opacity-60 bg-[#1c1c1e]`}
      >
        {ALL_STATUSES.map((status) => (
          <option key={status} value={status} className="bg-[#1c1c1e] text-[#f8f7f4] font-semibold py-1">
            {status}
          </option>
        ))}
      </select>

      {/* Status Dot */}
      <span
        className={`w-2 h-2 rounded-full ${config.dot} absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none`}
      />

      {/* Dropdown Chevron */}
      <ChevronDown
        className={`w-3.5 h-3.5 ${config.text} absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-80`}
      />
    </div>
  );
};

export const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Received;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

