import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  DollarSign,
  FileText,
  RotateCcw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit,
  Trash2,
  TrendingDown,
  Building2
} from 'lucide-react';
import { SupplierItem, INITIAL_SUPPLIERS } from '../data/posData.ts';

interface SuppliersViewProps {
  currency?: string;
  selectedSupplierCode?: string | null;
  onClearSelectedSupplierCode?: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  currency = 'LKR',
  selectedSupplierCode,
  onClearSelectedSupplierCode,
}) => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(INITIAL_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState(selectedSupplierCode || '');
  const [activeTab, setActiveTab] = useState<'all' | 'debtors' | 'payments' | 'orders'>('all');

  useEffect(() => {
    if (selectedSupplierCode) {
      setSearchQuery(selectedSupplierCode);
      setCurrentPage(1);
      onClearSelectedSupplierCode?.();
    }
  }, [selectedSupplierCode]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Create Supplier Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<SupplierItem>>({
    code: '',
    name: '',
    contactNumber: '',
    email: '',
    address: '',
    totalPurchase: 0,
    paidAmount: 0,
    purchaseReturn: 0,
    balancePay: 0,
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.contactNumber.includes(q) ||
        (s.address && s.address.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (activeTab === 'debtors' && s.balancePay <= 0) return false;
      return true;
    });
  }, [suppliers, searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Overall financial sums
  const totalPurchases = suppliers.reduce((acc, s) => acc + s.totalPurchase, 0);
  const totalPaid = suppliers.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalBalancePay = suppliers.reduce((acc, s) => acc + s.balancePay, 0);

  const handleOpenCreate = () => {
    const nextCode = `SPL-${String(suppliers.length + 1).padStart(2, '0')}`;
    setSupplierForm({
      code: nextCode,
      name: '',
      contactNumber: '+94 77 ',
      email: '',
      address: '',
      totalPurchase: 0,
      paidAmount: 0,
      purchaseReturn: 0,
      balancePay: 0,
    });
    setShowCreateModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.code) return;

    const newSupplier: SupplierItem = {
      id: `SUP-${Date.now()}`,
      code: supplierForm.code,
      name: supplierForm.name,
      contactNumber: supplierForm.contactNumber || 'N/A',
      email: supplierForm.email,
      address: supplierForm.address,
      totalPurchase: Number(supplierForm.totalPurchase) || 0,
      paidAmount: Number(supplierForm.paidAmount) || 0,
      purchaseReturn: Number(supplierForm.purchaseReturn) || 0,
      balancePay: Math.max(
        0,
        (Number(supplierForm.totalPurchase) || 0) -
          (Number(supplierForm.paidAmount) || 0) -
          (Number(supplierForm.purchaseReturn) || 0)
      ),
      status: 'Active',
    };

    setSuppliers([newSupplier, ...suppliers]);
    setShowCreateModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this supplier record?')) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070e24] text-[#f8fafc] overflow-hidden select-none">
      {/* 1. TOP ACTION BAR */}
      <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] p-4 sm:px-6 shrink-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-700 to-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                Supplier & Vendor Management
              </h1>
              <p className="text-[11px] font-mono-jb text-blue-200/60 uppercase">
                Vendor Accounts &bull; Outstanding Balance Pay: {currency} {totalBalancePay.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono-jb font-bold transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[#0f1d46] text-blue-200 border border-blue-500/20 hover:bg-[#162758]'
              }`}
            >
              Payment Summary
            </button>

            <button
              onClick={() => setActiveTab('debtors')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono-jb font-bold transition-all cursor-pointer ${
                activeTab === 'debtors'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-[#0f1d46] text-amber-300 border border-amber-500/20 hover:bg-[#162758]'
              }`}
            >
              Debtor Summary
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className="px-3.5 py-2 bg-[#0f1d46] hover:bg-[#162758] text-blue-200 border border-blue-500/20 rounded-xl text-xs font-mono-jb font-bold transition-all cursor-pointer"
            >
              Purchase Return
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className="px-3.5 py-2 bg-[#0f1d46] hover:bg-[#162758] text-blue-200 border border-blue-500/20 rounded-xl text-xs font-mono-jb font-bold transition-all cursor-pointer"
            >
              Purchase Order
            </button>

            {/* Prominent Red "Create Supplier" button */}
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-oswald text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Supplier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER ROW */}
      <div className="bg-[#091333] border-b border-[rgba(96,165,250,0.18)] p-3 sm:px-6 shrink-0 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-96 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search supplier by name, code, contact, city..."
            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 shadow-sm"
          />
        </div>

        {/* Indicator summary pills */}
        <div className="flex items-center gap-3 text-xs font-mono-jb w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 font-bold">
            <span>Purchases: {currency} {totalPurchases.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-950/40 border border-pink-500/30 rounded-lg text-pink-300 font-bold">
            <span>Paid: {currency} {totalPaid.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 3. SUPPLIER LEDGER TABLE */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs font-mono-jb border-collapse">
          <thead className="sticky top-0 bg-[#091436] text-blue-200 uppercase tracking-wider border-b border-blue-500/20 text-[11px] select-none z-10">
            <tr>
              <th className="py-3 px-4 w-28">Code</th>
              <th className="py-3 px-4">Supplier Name</th>
              <th className="py-3 px-4 w-44">Contact Number</th>
              <th className="py-3 px-4 w-36 text-right">Total Purchase</th>
              <th className="py-3 px-4 w-36 text-right">Paid Amount</th>
              <th className="py-3 px-4 w-32 text-right">Purchase Return</th>
              <th className="py-3 px-4 w-36 text-right">Balance Pay</th>
              <th className="py-3 px-4 w-20 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-500/10 text-[#f8fafc]">
            {paginatedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-blue-300/50">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-400/30" />
                  <p className="text-sm font-bold">No suppliers found</p>
                  <p className="text-[11px] text-blue-200/40 mt-1">
                    Try searching with another keyword or create a new supplier account.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="hover:bg-blue-600/10 transition-colors group"
                >
                  <td className="py-3 px-4 font-bold text-blue-300">{supplier.code}</td>
                  <td className="py-3 px-4 font-semibold text-white">
                    <div>{supplier.name}</div>
                    {supplier.address && (
                      <div className="text-[10px] text-blue-300/50 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span>{supplier.address}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-blue-200">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Phone className="w-3 h-3 text-blue-400" />
                      <span>{supplier.contactNumber}</span>
                    </div>
                  </td>

                  {/* Color-coded Total Purchase (Green indicator) */}
                  <td className="py-3 px-4 text-right">
                    <span className="inline-block px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg font-bold text-emerald-300">
                      {currency} {supplier.totalPurchase.toLocaleString()}
                    </span>
                  </td>

                  {/* Color-coded Paid Amount (Pink indicator) */}
                  <td className="py-3 px-4 text-right">
                    <span className="inline-block px-2.5 py-1 bg-pink-500/15 border border-pink-500/30 rounded-lg font-bold text-pink-300">
                      {currency} {supplier.paidAmount.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right text-blue-200/80">
                    {supplier.purchaseReturn > 0
                      ? `${currency} ${supplier.purchaseReturn.toLocaleString()}`
                      : '-'}
                  </td>

                  {/* Color-coded Balance Pay */}
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                        supplier.balancePay > 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-900/20 text-blue-300/60'
                      }`}
                    >
                      {currency} {supplier.balancePay.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="p-1 rounded text-blue-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. PAGINATION CONTROLS */}
      <div className="bg-[#091333] border-t border-[rgba(96,165,250,0.18)] px-4 py-3 sm:px-6 flex items-center justify-between text-xs font-mono-jb shrink-0 text-blue-200/60">
        <div>
          Showing page <strong className="text-white">{currentPage}</strong> of{' '}
          <strong className="text-white">{totalPages}</strong> ({filteredSuppliers.length} records)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-blue-500/20 disabled:opacity-30 hover:bg-blue-600/20 text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-blue-500/20 disabled:opacity-30 hover:bg-blue-600/20 text-white cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CREATE SUPPLIER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b163a] border border-blue-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#08102a] p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Create Supplier Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-blue-300/60 hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 font-mono-jb text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierForm.code}
                    onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierForm.contactNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Supplier / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Lanka Telecom & Spares Colombo"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Physical Address / City
                </label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="e.g. Pettah, Colombo 11"
                  className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Initial Purchases ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={supplierForm.totalPurchase}
                    onChange={(e) => setSupplierForm({ ...supplierForm, totalPurchase: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Initial Paid ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={supplierForm.paidAmount}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paidAmount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#070e24] border border-blue-500/30 rounded-xl text-white outline-none focus:border-blue-400 font-bold text-pink-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-blue-500/20 text-blue-200 hover:bg-blue-600/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white rounded-xl font-bold shadow-md shadow-red-600/30 cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
