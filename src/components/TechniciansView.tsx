import React, { useState, useEffect } from 'react';
import { Technician, TechnicianCommissionSummary } from '../types.ts';
import {
  Users,
  DollarSign,
  Plus,
  Percent,
  Calendar,
  CheckCircle2,
  Cpu,
  Printer,
  TrendingUp,
  UserCheck,
  Search,
  Phone,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface TechniciansViewProps {
  token: string | null;
  shopName: string;
}

export const TechniciansView: React.FC<TechniciansViewProps> = ({ token, shopName }) => {
  const [activeTab, setActiveTab] = useState<'commission' | 'list'>('commission');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [commissionReports, setCommissionReports] = useState<TechnicianCommissionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Add Tech Form State
  const [isAddingTech, setIsAddingTech] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechRate, setNewTechRate] = useState<number>(40);
  const [newTechRole, setNewTechRole] = useState('Technician');
  const [addError, setAddError] = useState<string | null>(null);

  const fetchTechs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/technicians', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTechnicians(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCommissionReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let query = '';
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        query += `startDate=${todayStr}&endDate=${todayStr}`;
      } else if (dateFilter === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        query += `startDate=${d.toISOString().split('T')[0]}`;
      } else if (dateFilter === 'month') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        query += `startDate=${d.toISOString().split('T')[0]}`;
      }

      if (selectedTech !== 'all') {
        query += (query ? '&' : '') + `techName=${encodeURIComponent(selectedTech)}`;
      }

      const res = await fetch(`/api/reports/commission${query ? '?' + query : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCommissionReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechs();
  }, [token]);

  useEffect(() => {
    fetchCommissionReport();
  }, [token, selectedTech, dateFilter]);

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim()) return;
    setAddError(null);

    try {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newTechName.trim(),
          phone: newTechPhone.trim(),
          commissionRate: Number(newTechRate) || 40,
          role: newTechRole.trim() || 'Technician',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create technician');

      setNewTechName('');
      setNewTechPhone('');
      setNewTechRate(40);
      setIsAddingTech(false);
      fetchTechs();
      fetchCommissionReport();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add technician');
    }
  };

  const handleDeleteTech = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/technicians/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTechs();
      fetchCommissionReport();
    } catch (err) {
      console.error(err);
    }
  };

  // Grand totals
  const totalCommissionAll = commissionReports.reduce((sum, r) => sum + r.commissionEarned, 0);
  const totalCompletedJobs = commissionReports.reduce((sum, r) => sum + r.completedJobs, 0);
  const totalPartsCostAll = commissionReports.reduce((sum, r) => sum + r.totalPartsCost, 0);
  const totalLaborProfitAll = commissionReports.reduce((sum, r) => sum + r.netLaborProfit, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-[#f8f7f4]">
      {/* Header & Sub-Tabs */}
      <div className="bg-[#1c1c1e] p-5 sm:p-6 rounded-xl border border-[rgba(248,247,244,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-[#f8f7f4]">
              Technicians & Commission
            </h2>
            <span className="font-mono-jb px-2.5 py-0.5 rounded text-xs font-bold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
              {technicians.length} Technicians
            </span>
          </div>
          <p className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)] mt-0.5">
            Manage repair technicians and calculate net labor commission payouts
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-[#111113] p-1 rounded-lg border border-[rgba(248,247,244,0.1)] font-mono-jb">
          <button
            onClick={() => setActiveTab('commission')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'commission'
                ? 'bg-[#ef4444] text-white shadow-xs'
                : 'text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4]'
            }`}
          >
            Commission Report
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-[#ef4444] text-white shadow-xs'
                : 'text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4]'
            }`}
          >
            Manage Technicians
          </button>
        </div>
      </div>

      {activeTab === 'commission' ? (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[rgba(248,247,244,0.1)] flex flex-wrap items-center justify-between gap-3 font-mono-jb">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[rgba(248,247,244,0.5)] uppercase tracking-wider">Date:</span>
              {(['all', 'today', 'week', 'month'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === d
                      ? 'bg-[#ef4444] text-white'
                      : 'bg-[#111113] text-[rgba(248,247,244,0.6)] hover:bg-[#252528]'
                  }`}
                >
                  {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[rgba(248,247,244,0.5)] uppercase tracking-wider">Technician:</span>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="px-3 py-1.5 bg-[#111113] border border-[rgba(248,247,244,0.1)] rounded-lg text-xs font-bold text-[#f8f7f4] outline-none cursor-pointer"
              >
                <option value="all">All Technicians</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.commissionRate}%)
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-[#111113] hover:bg-[#252528] text-[#f8f7f4] border border-[rgba(248,247,244,0.1)] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111113] p-5 rounded-xl border border-emerald-500/30">
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                Total Commission Payout
              </span>
              <div className="font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4] mt-1">
                LKR {totalCommissionAll.toLocaleString()}
              </div>
              <p className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.4)] mt-2">
                Payable based on technician rates
              </p>
            </div>

            <div className="bg-[#111113] p-5 rounded-xl border border-[rgba(248,247,244,0.1)]">
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[rgba(248,247,244,0.5)] font-bold block">
                Completed Repairs
              </span>
              <div className="font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4] mt-1">
                {totalCompletedJobs}
              </div>
              <p className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.4)] mt-2">
                Delivered phones repaired
              </p>
            </div>

            <div className="bg-[#111113] p-5 rounded-xl border border-[rgba(248,247,244,0.1)]">
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[#ef4444] font-bold block">
                Spare Parts Cost Used
              </span>
              <div className="font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4] mt-1">
                LKR {totalPartsCostAll.toLocaleString()}
              </div>
              <p className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.4)] mt-2">
                Deducted from gross repair revenue
              </p>
            </div>

            <div className="bg-[#111113] p-5 rounded-xl border border-[rgba(248,247,244,0.1)]">
              <span className="font-mono-jb text-[10px] uppercase tracking-wider text-[rgba(248,247,244,0.5)] font-bold block">
                Net Labor Profit
              </span>
              <div className="font-mono-jb text-2xl sm:text-3xl font-black text-[#f8f7f4] mt-1">
                LKR {totalLaborProfitAll.toLocaleString()}
              </div>
              <p className="font-mono-jb text-[10px] text-[rgba(248,247,244,0.4)] mt-2">
                (Gross Price minus Spare Parts)
              </p>
            </div>
          </div>

          {/* Commission Table per Technician */}
          <div className="bg-[#1c1c1e] rounded-xl border border-[rgba(248,247,244,0.1)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[rgba(248,247,244,0.1)] flex items-center justify-between">
              <h3 className="font-oswald text-base font-bold uppercase tracking-wider text-[#f8f7f4]">
                Technician Earnings & Performance Breakdown
              </h3>
              <span className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)]">
                Formula: (Job Price - Parts Cost) &times; Commission %
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#111113] border-b border-[rgba(248,247,244,0.1)] text-[rgba(248,247,244,0.5)] uppercase font-mono-jb font-bold tracking-wider">
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4">Completed Jobs</th>
                    <th className="py-3 px-4">Job Revenue</th>
                    <th className="py-3 px-4">Parts Cost</th>
                    <th className="py-3 px-4">Net Labor Profit</th>
                    <th className="py-3 px-4 text-right">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(248,247,244,0.06)] font-mono-jb">
                  {commissionReports.map((report) => (
                    <tr key={report.technician.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#f8f7f4] text-sm">
                        {report.technician.name}
                      </td>
                      <td className="py-3.5 px-4 text-[rgba(248,247,244,0.6)]">
                        {report.technician.role}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-bold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                          {report.technician.commissionRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#f8f7f4]">
                        {report.completedJobs} / {report.totalJobs}
                      </td>
                      <td className="py-3.5 px-4 text-[rgba(248,247,244,0.85)]">
                        LKR {report.totalJobRevenue.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#ef4444]">
                        LKR {report.totalPartsCost.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#f8f7f4]">
                        LKR {report.netLaborProfit.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-emerald-400 text-sm">
                          LKR {report.commissionEarned.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Manage Technicians */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-oswald text-lg font-bold uppercase tracking-wider text-[#f8f7f4]">Registered Repair Technicians</h3>
            <button
              onClick={() => setIsAddingTech(true)}
              className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-xs font-oswald uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Technician</span>
            </button>
          </div>

          {/* Add Technician Form Modal / Panel */}
          {isAddingTech && (
            <form
              onSubmit={handleCreateTechnician}
              className="bg-[#1c1c1e] p-5 rounded-xl border border-[rgba(248,247,244,0.1)] space-y-4 max-w-xl font-mono-jb"
            >
              <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.1)] pb-2">
                <h4 className="font-oswald text-sm uppercase tracking-wider font-bold text-[#f8f7f4]">Add Technician Profile</h4>
                <button
                  type="button"
                  onClick={() => setIsAddingTech(false)}
                  className="text-[rgba(248,247,244,0.5)] hover:text-[#f8f7f4] p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {addError && (
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[rgba(248,247,244,0.5)] block mb-1">Technician Name *</label>
                  <input
                    type="text"
                    value={newTechName}
                    onChange={(e) => setNewTechName(e.target.value)}
                    placeholder="e.g. Raasith or Tech 3"
                    className="w-full px-3 py-2 bg-[#111113] border border-[rgba(248,247,244,0.1)] rounded-lg outline-none font-bold text-[#f8f7f4] focus:border-[#ef4444]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[rgba(248,247,244,0.5)] block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newTechPhone}
                    onChange={(e) => setNewTechPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full px-3 py-2 bg-[#111113] border border-[rgba(248,247,244,0.1)] rounded-lg outline-none font-bold text-[#f8f7f4] focus:border-[#ef4444]"
                  />
                </div>
                <div>
                  <label className="text-[rgba(248,247,244,0.5)] block mb-1">Commission Rate (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTechRate}
                    onChange={(e) => setNewTechRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#111113] border border-[rgba(248,247,244,0.1)] rounded-lg outline-none font-bold text-sm text-[#f8f7f4] focus:border-[#ef4444]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[rgba(248,247,244,0.5)] block mb-1">Specialty / Role</label>
                  <input
                    type="text"
                    value={newTechRole}
                    onChange={(e) => setNewTechRole(e.target.value)}
                    placeholder="e.g. Hardware / Display"
                    className="w-full px-3 py-2 bg-[#111113] border border-[rgba(248,247,244,0.1)] rounded-lg outline-none font-bold text-[#f8f7f4] focus:border-[#ef4444]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTech(false)}
                  className="px-3.5 py-2 border border-[rgba(248,247,244,0.1)] rounded-lg text-xs font-bold text-[rgba(248,247,244,0.6)] cursor-pointer hover:bg-[#111113]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Technician
                </button>
              </div>
            </form>
          )}

          {/* Technicians List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicians.map((t) => (
              <div
                key={t.id}
                className="bg-[#1c1c1e] p-5 rounded-xl border border-[rgba(248,247,244,0.1)] space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center font-bold border border-[#ef4444]/30">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-[#f8f7f4]">{t.name}</h4>
                        <span className="text-xs font-mono-jb text-[rgba(248,247,244,0.5)]">{t.role}</span>
                      </div>
                    </div>
                    <span className="font-mono-jb px-2.5 py-1 rounded text-xs font-bold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                      {t.commissionRate}%
                    </span>
                  </div>

                  {t.phone && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-mono-jb text-[rgba(248,247,244,0.6)]">
                      <Phone className="w-3.5 h-3.5 text-[rgba(248,247,244,0.4)]" />
                      <span>{t.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[rgba(248,247,244,0.1)] flex items-center justify-between text-xs font-mono-jb">
                  <span className="text-[rgba(248,247,244,0.4)] text-[11px]">Active Staff</span>
                  <button
                    onClick={() => handleDeleteTech(t.id)}
                    className="text-[rgba(248,247,244,0.4)] hover:text-[#ef4444] transition-colors p-1 cursor-pointer"
                    title="Delete technician"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
