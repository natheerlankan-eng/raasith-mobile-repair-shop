import React, { useEffect, useState } from 'react';
import { X, History, Smartphone, Calendar, Phone, DollarSign, CheckCircle, Clock, MapPin } from 'lucide-react';
import { RepairJob } from '../types.ts';
import { parseJobIssues } from '../utils/whatsapp.ts';
import { STATUS_CONFIG } from './StatusBadge.tsx';

interface CustomerHistoryModalProps {
  phoneNumber: string | null;
  customerName: string | null;
  customerAddress?: string | null;
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  phoneNumber,
  customerName,
  customerAddress,
  isOpen,
  onClose,
  token,
}) => {
  const [history, setHistory] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && phoneNumber && token) {
      setLoading(true);
      fetch(`/api/customers/history/${encodeURIComponent(phoneNumber)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setHistory(data);
          }
        })
        .catch((err) => console.error('Failed to load customer history:', err))
        .finally(() => setLoading(false));
    } else {
      setHistory([]);
    }
  }, [isOpen, phoneNumber, token]);

  if (!isOpen || !phoneNumber) return null;

  const resolvedAddress = customerAddress || history.find((j) => j.customerAddress)?.customerAddress || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/30 flex items-center justify-center border border-red-400/40">
              <History className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-black">Customer Repair History</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-0.5">
                <span className="font-bold text-white text-sm">{customerName || 'Customer'}</span>
                <span>&bull;</span>
                <span className="font-mono text-red-300 font-semibold">{phoneNumber}</span>
              </div>
              {resolvedAddress ? (
                <div className="flex items-center gap-1.5 text-xs text-red-200 mt-1.5 font-medium bg-red-950/70 px-2.5 py-1 rounded-lg w-fit border border-red-500/30">
                  <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Customer Address: <strong className="text-white font-bold">{resolvedAddress}</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>No address on record</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading repair history...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No previous repairs found for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
                <span>{history.length} Total Service Record(s)</span>
                <span>Chronological Order</span>
              </div>

              {history.map((job) => {
                const issues = parseJobIssues(job);
                const statusStyle = STATUS_CONFIG[job.status] || STATUS_CONFIG.Received;
                const balance = Math.max(0, job.estimatedPrice - job.advancePaid);

                return (
                  <div
                    key={job.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 hover:bg-white hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-xs">
                          {job.jobNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {job.date}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-red-600" />
                      <span>{job.deviceBrand} {job.deviceModel}</span>
                      <span className="text-xs text-slate-500 font-normal ml-2">
                        Tech: {job.technicianName}
                      </span>
                    </div>

                    {job.customerAddress && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-red-50/50 p-2 rounded-xl border border-red-100">
                        <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Address on intake: <strong className="text-slate-800">{job.customerAddress}</strong></span>
                      </div>
                    )}

                    <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 mr-1">Reported Issue:</span>
                      <span className="font-semibold">{issues}</span>
                      {job.notes && (
                        <div className="text-slate-500 italic mt-1">Note: {job.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 text-slate-600">
                      <div>
                        Est. Price: <span className="font-bold text-slate-900">Rs. {job.estimatedPrice}</span> | Advance: <span className="font-bold text-slate-900">Rs. {job.advancePaid}</span>
                      </div>
                      <div className="font-bold">
                        {balance > 0 ? (
                          <span className="text-rose-600">Due: Rs. {balance}</span>
                        ) : (
                          <span className="text-emerald-600">Paid in Full</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
