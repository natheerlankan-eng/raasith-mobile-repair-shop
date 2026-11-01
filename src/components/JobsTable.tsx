import React from 'react';
import { RepairJob, JobStatus, AccessoriesInfo } from '../types.ts';
import { StatusSelector } from './StatusBadge.tsx';
import { parseJobIssues, formatWhatsAppPhone, generateReceivedMessage, generateReadyMessage, openWhatsAppMessage, generateHealthPassportWhatsApp } from '../utils/whatsapp.ts';
import { generateReceivedSMS, generateReadySMS, openCarrierSMS } from '../utils/sms.ts';
import {
  Printer,
  MessageCircle,
  MessageSquare,
  Check,
  History,
  Smartphone,
  User,
  DollarSign,
  AlertCircle,
  Cpu,
  ShieldCheck,
  MapPin,
  Edit3,
  Eye
} from 'lucide-react';

interface JobsTableProps {
  jobs: RepairJob[];
  onStatusChange: (job: RepairJob, newStatus: JobStatus) => void;
  onUpdateMessageSent: (jobId: number, type: 'received' | 'ready' | 'sms_received' | 'sms_ready', sent: boolean) => void;
  onPrintJob: (job: RepairJob) => void;
  onViewCustomerHistory: (phone: string, name: string, address?: string | null) => void;
  onManageSpareParts: (job: RepairJob) => void;
  onManageAdvance?: (job: RepairJob) => void;
  onEditJob?: (job: RepairJob) => void;
  onViewJob?: (job: RepairJob) => void;
  onOpenPassport?: (job: RepairJob) => void;
  countryCode: string;
  shopName: string;
  staffUser?: any;
}

export const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  onStatusChange,
  onUpdateMessageSent,
  onPrintJob,
  onViewCustomerHistory,
  onManageSpareParts,
  onManageAdvance,
  onEditJob,
  onViewJob,
  onOpenPassport,
  countryCode,
  shopName,
  staffUser,
}) => {
  const handleSendReceivedWA = (job: RepairJob) => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    const message = generateReceivedMessage(job, shopName);
    openWhatsAppMessage(formattedPhone, message);
    onUpdateMessageSent(job.id, 'received', true);
  };

  const handleSendReadyWA = (job: RepairJob) => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    const message = generateReadyMessage(job, shopName);
    openWhatsAppMessage(formattedPhone, message);
    onUpdateMessageSent(job.id, 'ready', true);
  };

  const handleSendReceivedSMS = (job: RepairJob) => {
    const message = generateReceivedSMS(job, shopName);
    openCarrierSMS(job.phoneNumber, message, countryCode);
    onUpdateMessageSent(job.id, 'sms_received', true);
  };

  const handleSendReadySMS = (job: RepairJob) => {
    const message = generateReadySMS(job, shopName);
    openCarrierSMS(job.phoneNumber, message, countryCode);
    onUpdateMessageSent(job.id, 'sms_ready', true);
  };

  const handleSendPassportWA = (job: RepairJob) => {
    if (onOpenPassport) {
      onOpenPassport(job);
      return;
    }
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    const message = generateHealthPassportWhatsApp(job, shopName);
    openWhatsAppMessage(formattedPhone, message);
  };

  const parseAccessories = (job: RepairJob): AccessoriesInfo | null => {
    if (!job.accessories) return null;
    try {
      return JSON.parse(job.accessories);
    } catch {
      return null;
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] p-12 text-center max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-xl bg-[#111113] text-[#ef4444] border border-[rgba(248,247,244,0.1)] flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-6 h-6" />
        </div>
        <h3 className="font-oswald text-lg uppercase tracking-wider font-semibold text-[#f8f7f4]">
          No Repair Jobs Found
        </h3>
        <p className="font-mono-jb text-[rgba(248,247,244,0.5)] text-xs mt-1">
          No records match your active query or selected filter.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Desktop Table - Industrial Workbench */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] shadow-xs overflow-hidden">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#111113] shadow-xs">
              <tr className="border-b border-[rgba(248,247,244,0.12)] text-[rgba(248,247,244,0.6)] font-mono-jb text-[10px] uppercase tracking-wider">
                <th className="py-2 px-3">Job ID</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Customer & Items</th>
                <th className="py-2 px-3">Device</th>
                <th className="py-2 px-3">Problem & Parts</th>
                <th className="py-2 px-3">Price & Advance</th>
                <th className="py-2 px-3">Tech</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-center">Messaging</th>
                <th className="py-2 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(248,247,244,0.06)] text-xs">
              {jobs.map((job) => {
                const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
                const totalAmount = job.estimatedPrice + partsCost;
                const balance = Math.max(0, totalAmount - job.advancePaid);
                const issuesText = parseJobIssues(job);
                const acc = parseAccessories(job);

                return (
                  <tr
                    key={job.id}
                    className="hover:bg-[#111113]/70 transition-colors group"
                  >
                    {/* Job ID */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono-jb font-bold text-[#f8f7f4]">
                      <button
                        type="button"
                        onClick={() => onViewJob ? onViewJob(job) : onPrintJob(job)}
                        className="px-2 py-0.5 rounded bg-[#111113] hover:border-[#ef4444] text-[#f8f7f4] border border-[rgba(248,247,244,0.12)] transition-colors cursor-pointer text-left inline-flex items-center gap-1.5 text-xs"
                        title="Click to view complete Job Order details"
                      >
                        <Eye className="w-3 h-3 text-[#ef4444]" />
                        <span>{job.jobNumber}</span>
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-2 px-3 whitespace-nowrap text-[rgba(248,247,244,0.6)] font-mono-jb text-[11px]">
                      {job.date}
                    </td>

                    {/* Customer & Accessories */}
                    <td className="py-2 px-3">
                      <div className="font-bold text-[#f8f7f4] text-xs leading-tight">
                        {job.customerName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.5)]">
                          {job.phoneNumber}
                        </span>
                        <button
                          onClick={() => onViewCustomerHistory(job.phoneNumber, job.customerName, job.customerAddress)}
                          title="View customer repair history"
                          className="text-[9px] font-mono-jb text-[#ef4444] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <History className="w-2.5 h-2.5" />
                          <span>History</span>
                        </button>
                      </div>

                      {/* Customer Address Badge if available */}
                      {job.customerAddress && (
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-[rgba(248,247,244,0.4)] truncate max-w-[180px]" title={job.customerAddress}>
                          <MapPin className="w-2.5 h-2.5 text-[#ef4444] shrink-0" />
                          <span className="truncate">{job.customerAddress}</span>
                        </div>
                      )}

                      {/* Accessories Pills */}
                      {acc && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap font-mono-jb">
                          {acc.sim && (
                            <span className="text-[8px] px-1 py-0 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                              SIM
                            </span>
                          )}
                          {acc.backCover && (
                            <span className="text-[8px] px-1 py-0 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                              COVER
                            </span>
                          )}
                          {acc.battery && (
                            <span className="text-[8px] px-1 py-0 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                              BATT
                            </span>
                          )}
                          {acc.other && (
                            <span className="text-[8px] text-[rgba(248,247,244,0.4)] truncate max-w-[80px]" title={acc.other}>
                              +{acc.other}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Device */}
                    <td className="py-2 px-3">
                      <div className="font-bold text-[#f8f7f4] text-xs">
                        {job.deviceBrand}
                      </div>
                      <div className="text-[10px] text-[rgba(248,247,244,0.6)]">
                        {job.deviceModel}
                      </div>
                    </td>

                    {/* Problem & Spare Parts */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <div
                        className="text-[11px] text-[rgba(248,247,244,0.85)] line-clamp-1 leading-snug"
                        title={issuesText}
                      >
                        {issuesText}
                      </div>
                      {partsCost > 0 && (
                        <div className="mt-0.5 inline-flex items-center gap-1 px-1 py-0 bg-amber-500/10 text-amber-400 rounded border border-amber-500/30 text-[9px] font-mono-jb font-bold">
                          <Cpu className="w-2.5 h-2.5 text-amber-400" />
                          <span>Parts: LKR {partsCost.toLocaleString()}</span>
                        </div>
                      )}
                    </td>

                    {/* Price & Advance */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono-jb text-xs">
                      <div className="text-[#f8f7f4] font-semibold text-[11px]">
                        Base: LKR {job.estimatedPrice.toLocaleString()}
                      </div>
                      {partsCost > 0 && (
                        <div className="text-[10px] text-amber-400">
                          Parts: +LKR {partsCost.toLocaleString()}
                        </div>
                      )}
                      <div className="text-[10px] text-[rgba(248,247,244,0.5)]">
                        Adv: LKR {job.advancePaid.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-bold mt-0.5">
                        {balance > 0 ? (
                          <span className="text-[#ef4444]">
                            Due: LKR {balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            Paid In Full
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Technician */}
                    <td className="py-2 px-3 whitespace-nowrap text-[11px] font-mono-jb">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[rgba(248,247,244,0.8)] font-semibold">{job.technicianName}</span>
                        {staffUser?.name && job.technicianName?.toLowerCase() === staffUser.name.toLowerCase() && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                            You
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 1-Click Status Selector */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusSelector
                        currentStatus={job.status}
                        onStatusChange={(newStatus) => onStatusChange(job, newStatus)}
                      />
                    </td>

                    {/* Messaging: WhatsApp & Carrier SMS */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 items-center justify-center font-mono-jb">
                        {/* Received row */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSendReceivedWA(job)}
                            className={`w-18 py-0.5 px-1 rounded text-[9px] font-semibold flex items-center justify-between border cursor-pointer ${
                              job.receivedMsgSent
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                            }`}
                            title="WhatsApp Received"
                          >
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="w-2.5 h-2.5 text-sky-400" />
                              <span>WA Rec</span>
                            </span>
                            {job.receivedMsgSent && <Check className="w-2 h-2 text-sky-400 stroke-[3]" />}
                          </button>

                          <button
                            onClick={() => handleSendReceivedSMS(job)}
                            className={`w-18 py-0.5 px-1 rounded text-[9px] font-semibold flex items-center justify-between border cursor-pointer ${
                              job.smsReceivedSent
                                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                                : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                            }`}
                            title="SMS Received"
                          >
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5 text-indigo-400" />
                              <span>SMS Rec</span>
                            </span>
                            {job.smsReceivedSent && <Check className="w-2 h-2 text-indigo-400 stroke-[3]" />}
                          </button>
                        </div>

                        {/* Ready row */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSendReadyWA(job)}
                            className={`w-18 py-0.5 px-1 rounded text-[9px] font-semibold flex items-center justify-between border cursor-pointer ${
                              job.readyMsgSent
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                            }`}
                            title="WhatsApp Ready"
                          >
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="w-2.5 h-2.5 text-emerald-400" />
                              <span>WA Rdy</span>
                            </span>
                            {job.readyMsgSent && <Check className="w-2 h-2 text-emerald-400 stroke-[3]" />}
                          </button>

                          <button
                            onClick={() => handleSendReadySMS(job)}
                            className={`w-18 py-0.5 px-1 rounded text-[9px] font-semibold flex items-center justify-between border cursor-pointer ${
                              job.smsReadySent
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)] hover:bg-[#252528]'
                            }`}
                            title="Carrier SMS Ready"
                          >
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                              <span>SMS Rdy</span>
                            </span>
                            {job.smsReadySent && <Check className="w-2 h-2 text-emerald-400 stroke-[3]" />}
                          </button>
                        </div>

                        {/* Health Passport row */}
                        <button
                          onClick={() => handleSendPassportWA(job)}
                          className="w-full py-0.5 px-1.5 rounded text-[9px] font-semibold flex items-center justify-center gap-1 border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white cursor-pointer mt-0.5 transition-colors"
                          title="Open & Send Phone Health Passport via WhatsApp"
                        >
                          <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                          <span>WA Passport</span>
                        </button>
                      </div>
                    </td>

                    {/* View Details Only */}
                    <td className="py-2 px-3 whitespace-nowrap text-right">
                      {onViewJob && (
                        <button
                          onClick={() => onViewJob(job)}
                          title="View complete Job Order details & payment breakdown"
                          className="px-2 py-1 bg-[#111113] hover:bg-[#252528] text-[#f8f7f4] hover:text-white border border-[rgba(248,247,244,0.12)] hover:border-[#ef4444]/40 rounded-md transition-all inline-flex items-center gap-1 text-[10px] font-mono-jb cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#ef4444]" />
                          <span>View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto space-y-2.5 p-1">
        {jobs.map((job) => {
          const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
          const totalAmount = job.estimatedPrice + partsCost;
          const balance = Math.max(0, totalAmount - job.advancePaid);
          const issuesText = parseJobIssues(job);
          const acc = parseAccessories(job);

          return (
            <div
              key={job.id}
              className="bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] p-4 space-y-3 text-xs"
            >
              {/* Header: Job ID & 1-Click Status */}
              <div className="flex items-center justify-between gap-2 border-b border-[rgba(248,247,244,0.08)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-jb font-bold text-[#f8f7f4] px-2 py-0.5 rounded bg-[#111113] border border-[rgba(248,247,244,0.12)]">
                    {job.jobNumber}
                  </span>
                  <span className="text-[11px] text-[rgba(248,247,244,0.5)] font-mono-jb">{job.date}</span>
                </div>
                <StatusSelector
                  currentStatus={job.status}
                  onStatusChange={(newStatus) => onStatusChange(job, newStatus)}
                />
              </div>

              {/* Customer & Device */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.4)] uppercase">Customer</span>
                  <div className="font-bold text-[#f8f7f4] text-sm mt-0.5">{job.customerName}</div>
                  <div className="font-mono-jb text-[11px] text-[rgba(248,247,244,0.5)]">{job.phoneNumber}</div>
                  {job.customerAddress && (
                    <div className="flex items-center gap-1 text-[10px] text-[rgba(248,247,244,0.4)] mt-0.5 truncate max-w-[140px]" title={job.customerAddress}>
                      <MapPin className="w-2.5 h-2.5 text-[#ef4444] shrink-0" />
                      <span className="truncate">{job.customerAddress}</span>
                    </div>
                  )}
                  <button
                    onClick={() => onViewCustomerHistory(job.phoneNumber, job.customerName, job.customerAddress)}
                    className="text-[11px] text-[#ef4444] font-mono-jb hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <History className="w-2.5 h-2.5" />
                    <span>View Old Repairs</span>
                  </button>

                  {/* Accessories */}
                  {acc && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap font-mono-jb text-[9px]">
                      {acc.sim && <span className="px-1 py-0.2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">SIM</span>}
                      {acc.backCover && <span className="px-1 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">Cover</span>}
                      {acc.battery && <span className="px-1 py-0.2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Batt</span>}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono-jb text-[rgba(248,247,244,0.4)] uppercase">Device</span>
                  <div className="font-bold text-[#f8f7f4] mt-0.5">{job.deviceBrand}</div>
                  <div className="text-[11px] text-[rgba(248,247,244,0.7)]">{job.deviceModel}</div>
                  <div className="text-[11px] font-mono-jb text-[rgba(248,247,244,0.5)] mt-1">Tech: <span className="text-[#f8f7f4]">{job.technicianName}</span></div>
                </div>
              </div>

              {/* Issues & Parts */}
              <div className="bg-[#111113] p-2.5 rounded-lg border border-[rgba(248,247,244,0.08)]">
                <span className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.4)] uppercase block mb-0.5">Reported Issue:</span>
                <span className="text-[#f8f7f4] font-medium">{issuesText}</span>
                {partsCost > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[rgba(248,247,244,0.08)] text-amber-400 font-mono-jb font-bold flex items-center gap-1 text-[11px]">
                    <Cpu className="w-3 h-3 text-amber-400" />
                    <span>Spare Parts: LKR {partsCost.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Price & Balance */}
              <div className="flex items-center justify-between bg-[#111113] p-2.5 rounded-lg border border-[rgba(248,247,244,0.08)] font-mono-jb">
                <div>
                  <span className="text-[rgba(248,247,244,0.4)] block text-[10px] uppercase">Base / Parts / Adv</span>
                  <span className="text-[#f8f7f4] font-bold">
                    LKR {job.estimatedPrice} {partsCost > 0 && <span className="text-amber-400">(+{partsCost})</span>} <span className="text-[rgba(248,247,244,0.4)] font-normal">/ Adv: {job.advancePaid}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[rgba(248,247,244,0.4)] block text-[10px] uppercase">Balance</span>
                  <span className={`text-sm font-black ${balance > 0 ? 'text-[#ef4444]' : 'text-emerald-400'}`}>
                    LKR {balance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Messaging Buttons Grid: WA & SMS */}
              <div className="grid grid-cols-2 gap-1.5 font-mono-jb text-[11px]">
                <button
                  onClick={() => handleSendReceivedWA(job)}
                  className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                    job.receivedMsgSent ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)]'
                  }`}
                >
                  <MessageCircle className="w-3 h-3 text-sky-400" />
                  <span>WA Rec</span>
                  {job.receivedMsgSent && <Check className="w-3 h-3 text-sky-400 stroke-[3]" />}
                </button>

                <button
                  onClick={() => handleSendReadyWA(job)}
                  className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                    job.readyMsgSent ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)]'
                  }`}
                >
                  <MessageCircle className="w-3 h-3 text-emerald-400" />
                  <span>WA Rdy</span>
                  {job.readyMsgSent && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                </button>

                <button
                  onClick={() => handleSendReceivedSMS(job)}
                  className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                    job.smsReceivedSent ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)]'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 text-indigo-400" />
                  <span>SMS Rec</span>
                  {job.smsReceivedSent && <Check className="w-3 h-3 text-indigo-400 stroke-[3]" />}
                </button>

                <button
                  onClick={() => handleSendReadySMS(job)}
                  className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                    job.smsReadySent ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-[#111113] text-[rgba(248,247,244,0.7)] border-[rgba(248,247,244,0.1)]'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                  <span>SMS Rdy</span>
                  {job.smsReadySent && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                </button>
              </div>

              {/* Health Passport Button */}
              <div className="font-mono-jb">
                <button
                  type="button"
                  onClick={() => handleSendPassportWA(job)}
                  className="w-full py-2 px-3 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors text-xs"
                  title="Send Phone Health Passport via WhatsApp"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Send Health Passport via WhatsApp</span>
                </button>
              </div>

              {/* Essential Action: View Order Details */}
              {onViewJob && (
                <div className="pt-1 font-mono-jb">
                  <button
                    onClick={() => onViewJob(job)}
                    className="w-full py-2 bg-[#111113] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.15)] hover:border-[#ef4444]/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>View Job Details</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
