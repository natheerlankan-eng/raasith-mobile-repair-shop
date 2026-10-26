import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Building2,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  ShieldAlert,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface SuppliersViewProps {
  token?: string | null;
  currency?: string;
  onSelectSupplier?: (supplier: any) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  token,
  currency = 'Rs',
  onSelectSupplier,
}) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/suppliers', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuppliers(data);
        }
      }
    } catch (err) {
      setErrorNotice('Failed to load supplier accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (s.name || '').toLowerCase().includes(q);
    const codeMatch = (s.code || '').toLowerCase().includes(q);
    const phoneMatch = (s.contactNumber || '').toLowerCase().includes(q);
    return nameMatch || codeMatch || phoneMatch;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden select-none">
      
      {/* TOP HEADER SECTION - 100% SILVER THEME */}
      <div className="bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 border-b border-slate-400 p-3.5 sm:px-6 shrink-0 shadow-lg space-y-3 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-500 flex items-center justify-center shadow-inner">
              <Truck className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                  SUPPLIER DIRECTORY & LEDGERS
                </h1>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold font-mono-jb">
                  VENDOR PROFILES & PAYABLES
                </span>
              </div>
              <p className="font-mono-jb text-[11px] text-slate-700 font-bold uppercase">
                DISTRIBUTORS &bull; VENDOR ACCOUNTS &bull; BALANCE PAYABLES
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSuppliers}
              title="Refresh suppliers"
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono-jb">
          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Total Suppliers</span>
              <span className="text-lg font-black text-slate-900">{suppliers.length}</span>
            </div>
            <Truck className="w-5 h-5 text-slate-800 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Total Payable Due</span>
              <span className="text-lg font-black text-slate-900">
                {currency} {suppliers.reduce((acc, s) => acc + (Number(s.balancePay) || 0), 0).toLocaleString()}
              </span>
            </div>
            <FileText className="w-5 h-5 text-slate-800 opacity-80" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR SECTION */}
      <div className="bg-white border-b border-slate-300 p-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs shadow-xs font-mono-jb">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplier name, code, phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-500 shadow-inner"
            />
          </div>
        </div>
        <button
          onClick={fetchSuppliers}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-oswald text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      {/* SUPPLIER TABLE SECTION - INVENTORY EXACT FONT & DESIGN */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-100 font-pos-table">
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-slate-900">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-200 text-slate-800 uppercase text-xs font-bold tracking-wider border-b border-slate-300">
                <th className="py-3 px-4 text-center w-14 border-r border-slate-300">#</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">SUPPLIER CODE</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">SUPPLIER NAME</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">CONTACT NUMBER</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">ADDRESS / DETAILS</th>
                <th className="py-3 px-4 text-right border-r border-slate-300">BALANCE PAYABLE</th>
                <th className="py-3 px-4 text-center w-28">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-700 mb-2" />
                    <span>Loading supplier accounts...</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500 font-bold">
                    No supplier accounts found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supp, idx) => {
                  const balancePay = Number(supp.balancePay) || 0;

                  return (
                    <tr key={supp.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 border-r border-slate-200">
                        {supp.code || '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-700" />
                          <span>{supp.name || 'Unnamed Supplier'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{supp.contactNumber || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 border-r border-slate-200">
                        <span className="truncate max-w-[220px]">{supp.address || 'No Address'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold border-r border-slate-200">
                        <span className={balancePay > 0 ? 'text-rose-600 font-black' : 'text-slate-700'}>
                          {currency} {balancePay.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onSelectSupplier && (
                          <button
                            onClick={() => onSelectSupplier(supp)}
                            title="Select Supplier"
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-800 text-slate-800 hover:text-white rounded-lg font-bold text-[10px] uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
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