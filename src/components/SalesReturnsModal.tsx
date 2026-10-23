import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Printer,
  ShieldAlert
} from 'lucide-react';
import { PosItem } from '../data/posData.ts';
import { AdminAuthModal } from './AdminAuthModal.tsx';

interface SalesReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  catalog: PosItem[];
  onReturnComplete: (msg: string) => void;
}

export const SalesReturnsModal: React.FC<SalesReturnsModalProps> = ({
  isOpen,
  onClose,
  currency,
  catalog,
  onReturnComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'WITH_BILL' | 'WITHOUT_BILL'>('WITH_BILL');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: Return With Bill State
  const [searchBillQuery, setSearchBillQuery] = useState('');
  const [searchingBills, setSearchingBills] = useState(false);
  const [foundBills, setFoundBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; returnQty: number; condition: string }>
  >({});
  const [withBillRefundType, setWithBillRefundType] = useState<'Cash Refund' | 'Credit Note' | 'Exchange Adjustment'>('Cash Refund');
  const [withBillReason, setWithBillReason] = useState('Customer Request / Item Exchange');
  const [withBillRestock, setWithBillRestock] = useState(true);

  // Tab 2: Return Without Bill State
  const [withoutItemQuery, setWithoutItemQuery] = useState('');
  const [withoutSelectedItem, setWithoutSelectedItem] = useState<PosItem | null>(null);
  const [withoutQty, setWithoutQty] = useState(1);
  const [withoutPrice, setWithoutPrice] = useState(0);
  const [withoutCondition, setWithoutCondition] = useState('Good / Resellable');
  const [withoutCustomerName, setWithoutCustomerName] = useState('Walk-in Customer');
  const [withoutCustomerPhone, setWithoutCustomerPhone] = useState('');
  const [withoutRefundType, setWithoutRefundType] = useState<'Cash Refund' | 'Credit Note'>('Cash Refund');
  const [withoutReason, setWithoutReason] = useState('No receipt provided / Counter exchange');
  const [withoutRestock, setWithoutRestock] = useState(true);

  // Admin PIN Authorization Modal State for Bill Reversal
  const [adminAuthModal, setAdminAuthModal] = useState<{
    isOpen: boolean;
    title?: string;
    actionDescription?: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: 'Admin Authorization Required',
    actionDescription: '',
    onSuccess: () => {},
  });

  const getAuthToken = () => {
    return localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';
  };

  // Search bills for Return WITH Bill
  const handleSearchBills = async () => {
    if (!searchBillQuery.trim()) return;
    setSearchingBills(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pos/bills/search?q=${encodeURIComponent(searchBillQuery.trim())}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFoundBills(data);
        if (data.length === 0) {
          setErrorMsg(`No bills found matching "${searchBillQuery}". Try another bill number or phone.`);
        }
      } else {
        setErrorMsg('Failed to query bill registry');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error searching bills');
    } finally {
      setSearchingBills(false);
    }
  };

  const handleSelectBill = (bill: any) => {
    setSelectedBill(bill);
    const initialSelected: Record<string, { selected: boolean; returnQty: number; condition: string }> = {};
    if (bill.items && Array.isArray(bill.items)) {
      bill.items.forEach((it: any) => {
        initialSelected[it.itemCode] = {
          selected: true,
          returnQty: Math.min(1, it.qty),
          condition: 'Good / Resellable',
        };
      });
    }
    setSelectedItems(initialSelected);
  };

  // Calculate total return amount for With Bill
  const withBillTotal = React.useMemo(() => {
    if (!selectedBill || !selectedBill.items) return 0;
    return selectedBill.items.reduce((sum: number, it: any) => {
      const cfg = selectedItems[it.itemCode];
      if (cfg && cfg.selected) {
        return sum + (it.price || 0) * (cfg.returnQty || 1);
      }
      return sum;
    }, 0);
  }, [selectedBill, selectedItems]);

  // Submit Return WITH Bill
  const handleSubmitReturnWithBill = async () => {
    if (!selectedBill) {
      setErrorMsg('Please select an original bill first');
      return;
    }

    const itemsToReturn = selectedBill.items
      .filter((it: any) => selectedItems[it.itemCode]?.selected)
      .map((it: any) => {
        const cfg = selectedItems[it.itemCode];
        return {
          itemCode: it.itemCode,
          itemName: it.itemName,
          qty: cfg.returnQty,
          price: it.price,
          condition: cfg.condition,
        };
      });

    if (itemsToReturn.length === 0) {
      setErrorMsg('Please select at least one item to return');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/pos/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          returnType: 'WITH_BILL',
          originalBillNo: selectedBill.billNo,
          customerName: selectedBill.customerName,
          customerPhone: selectedBill.customerPhone,
          items: itemsToReturn,
          refundType: withBillRefundType,
          reason: withBillReason,
          restocked: withBillRestock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process return');
      }

      onReturnComplete(
        `Return ${data.salesReturn?.returnNumber || ''} processed! Refund: ${currency} ${withBillTotal.toLocaleString()} (${withBillRefundType}). Inventory restocked.`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit return');
    } finally {
      setLoading(false);
    }
  };

  // Submit Return WITHOUT Bill
  const handleSubmitReturnWithoutBill = async () => {
    if (!withoutSelectedItem) {
      setErrorMsg('Please search and select an inventory item to return');
      return;
    }

    if (withoutQty <= 0) {
      setErrorMsg('Quantity must be at least 1');
      return;
    }

    if (withoutPrice <= 0) {
      setErrorMsg('Please enter a valid unit return price');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/pos/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          returnType: 'WITHOUT_BILL',
          customerName: withoutCustomerName || 'Walk-in Customer',
          customerPhone: withoutCustomerPhone || '0770000000',
          items: [
            {
              itemCode: withoutSelectedItem.code,
              itemName: withoutSelectedItem.name,
              qty: withoutQty,
              price: withoutPrice,
              condition: withoutCondition,
            },
          ],
          refundType: withoutRefundType,
          reason: withoutReason,
          restocked: withoutRestock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process return');
      }

      const total = withoutQty * withoutPrice;
      onReturnComplete(
        `Direct Return ${data.salesReturn?.returnNumber || ''} processed! Restocked ${withoutQty}x ${withoutSelectedItem.name}. Refund: ${currency} ${total.toLocaleString()}`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit return');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#081335] border-2 border-rose-500/50 rounded-3xl w-full max-w-3xl shadow-2xl shadow-rose-950/80 overflow-hidden flex flex-col font-mono-jb max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#200c14] via-[#140b2b] to-[#0a1844] border-b border-rose-500/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                Dual-Mode Sales Returns System
              </h3>
              <p className="text-[11px] text-blue-200/70">
                Restock inventory, update customer accounts & reconcile financial ledgers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-blue-500/20 bg-[#060e28] px-6">
          <button
            onClick={() => {
              setActiveTab('WITH_BILL');
              setErrorMsg(null);
            }}
            className={`py-3 px-5 font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'WITH_BILL'
                ? 'border-rose-400 text-rose-300 bg-rose-500/10'
                : 'border-transparent text-blue-200/60 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Return WITH Bill (Recommended)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('WITHOUT_BILL');
              setErrorMsg(null);
            }}
            className={`py-3 px-5 font-oswald text-xs sm:text-sm uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'WITHOUT_BILL'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-blue-200/60 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Return WITHOUT Bill (Direct)</span>
          </button>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-6 py-2.5 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'WITH_BILL' ? (
            /* TAB 1: RETURN WITH BILL */
            <div className="space-y-4">
              {/* Search Invoice */}
              <div className="bg-[#0c183d] p-4 rounded-2xl border border-blue-500/25 space-y-3">
                <label className="text-xs uppercase text-cyan-300 font-bold block">
                  Find Original Invoice
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchBillQuery}
                      onChange={(e) => setSearchBillQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchBills()}
                      placeholder="Search Bill No (e.g. INV000001), Customer Name, Phone..."
                      className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchBills}
                    disabled={searchingBills}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {searchingBills ? 'Searching...' : 'Search Bill'}
                  </button>
                </div>

                {/* Found Bills Dropdown */}
                {foundBills.length > 0 && !selectedBill && (
                  <div className="bg-[#08102a] border border-blue-500/30 rounded-xl max-h-48 overflow-y-auto divide-y divide-blue-500/10 mt-2">
                    {foundBills.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBill(b)}
                        className="p-3 hover:bg-blue-600/20 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-2">
                            <span>{b.billNo}</span>
                            <span className="text-[10px] text-blue-300 font-normal">({b.date})</span>
                          </div>
                          <div className="text-[11px] text-blue-200/70">
                            {b.customerName} &bull; {b.customerPhone || 'No phone'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-400">
                            {currency} {Number(b.netTotal || 0).toLocaleString()}
                          </div>
                          <span className="text-[10px] text-cyan-300 underline font-bold">Select Bill &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Bill Items View */}
              {selectedBill && (
                <div className="bg-[#0c183d] p-4 rounded-2xl border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <div>
                      <span className="text-xs font-black text-rose-300">
                        ORIGINAL INVOICE: {selectedBill.billNo}
                      </span>
                      <p className="text-[11px] text-blue-200/60">
                        Date: {selectedBill.date} &bull; Customer: <strong>{selectedBill.customerName}</strong> ({selectedBill.customerPhone})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminAuthModal({
                            isOpen: true,
                            title: `Admin Authorization: Void Bill ${selectedBill.billNo}`,
                            actionDescription: `Administrator authentication is strictly required to void and reverse transaction ${selectedBill.billNo}. This restores inventory stock and reconciles ledger balances.`,
                            onSuccess: async () => {
                              try {
                                const res = await fetch(`/api/pos/bills/${selectedBill.billNo}/reverse`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${getAuthToken()}`,
                                  },
                                  body: JSON.stringify({ adminPin: '7788', reason: 'Admin transaction reversal' }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed to reverse bill');
                                onReturnComplete(`Bill ${selectedBill.billNo} successfully reversed by Administrator. Stock restored & ledgers adjusted.`);
                                onClose();
                              } catch (err: any) {
                                setErrorMsg(err.message || 'Error reversing bill');
                              }
                            },
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 border border-rose-500/50 text-rose-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Void / Reverse entire transaction with Admin authorization"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Void / Reverse Bill</span>
                      </button>
                      <button
                        onClick={() => setSelectedBill(null)}
                        className="text-xs text-blue-300 underline hover:text-white"
                      >
                        Change Bill
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-cyan-300 uppercase block">
                      Select Items to Return:
                    </span>
                    <div className="divide-y divide-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden bg-[#08102a]">
                      {selectedBill.items?.map((it: any) => {
                        const cfg = selectedItems[it.itemCode] || {
                          selected: false,
                          returnQty: 1,
                          condition: 'Good / Resellable',
                        };
                        return (
                          <div key={it.itemCode} className="p-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={cfg.selected}
                                onChange={(e) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [it.itemCode]: { ...cfg, selected: e.target.checked },
                                  }))
                                }
                                className="w-4 h-4 accent-rose-500"
                              />
                              <div>
                                <div className="text-xs font-bold text-white">{it.itemName}</div>
                                <div className="text-[10px] text-blue-300/70">
                                  Code: {it.itemCode} &bull; Billed Qty: {it.qty} &bull; Price: {currency} {it.price.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {cfg.selected && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-blue-300">Return Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={it.qty}
                                    value={cfg.returnQty}
                                    onChange={(e) => {
                                      const val = Math.min(it.qty, Math.max(1, parseInt(e.target.value, 10) || 1));
                                      setSelectedItems((prev) => ({
                                        ...prev,
                                        [it.itemCode]: { ...cfg, returnQty: val },
                                      }));
                                    }}
                                    className="w-12 bg-[#0c183d] border border-blue-500/30 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white"
                                  />
                                </div>

                                <select
                                  value={cfg.condition}
                                  onChange={(e) =>
                                    setSelectedItems((prev) => ({
                                      ...prev,
                                      [it.itemCode]: { ...cfg, condition: e.target.value },
                                    }))
                                  }
                                  className="bg-[#0c183d] border border-blue-500/30 rounded px-2 py-0.5 text-[10px] text-white"
                                >
                                  <option value="Good / Resellable">Good / Resellable</option>
                                  <option value="Defective / Damaged">Defective / Damaged</option>
                                  <option value="Open Box">Open Box</option>
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                        Refund Method
                      </label>
                      <select
                        value={withBillRefundType}
                        onChange={(e: any) => setWithBillRefundType(e.target.value)}
                        className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="Cash Refund">Cash Refund (Counter Payout)</option>
                        <option value="Credit Note">Credit Note (Add to Customer Balance)</option>
                        <option value="Exchange Adjustment">Exchange Adjustment</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                        Return Reason
                      </label>
                      <input
                        type="text"
                        value={withBillReason}
                        onChange={(e) => setWithBillReason(e.target.value)}
                        placeholder="e.g. Wrong accessory model purchased"
                        className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="restockCheckWithBill"
                      checked={withBillRestock}
                      onChange={(e) => setWithBillRestock(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <label htmlFor="restockCheckWithBill" className="text-xs text-blue-200">
                      Restock returned item(s) directly into live active inventory
                    </label>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#050c24] p-3 rounded-xl border border-rose-500/25 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-300 uppercase">Total Refund Amount:</span>
                      <div className="text-xl font-black text-rose-400">
                        {currency} {withBillTotal.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading || withBillTotal <= 0}
                      onClick={handleSubmitReturnWithBill}
                      className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-oswald uppercase tracking-wider font-extrabold shadow-lg shadow-rose-600/30 cursor-pointer"
                    >
                      {loading ? 'Processing...' : 'Confirm Return With Bill'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: RETURN WITHOUT BILL */
            <div className="space-y-4">
              <div className="bg-[#0c183d] p-4 rounded-2xl border border-amber-500/25 space-y-3">
                <span className="text-xs font-bold text-amber-300 uppercase block">
                  Select Item From Catalog
                </span>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={withoutItemQuery}
                    onChange={(e) => setWithoutItemQuery(e.target.value)}
                    placeholder="Search item code, barcode or name..."
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 shadow-sm"
                  />
                </div>

                {withoutItemQuery && (
                  <div className="bg-[#08102a] border border-amber-500/30 rounded-xl max-h-40 overflow-y-auto divide-y divide-amber-500/10">
                    {catalog
                      .filter(
                        (i) =>
                          i.name.toLowerCase().includes(withoutItemQuery.toLowerCase()) ||
                          i.code.toLowerCase().includes(withoutItemQuery.toLowerCase()) ||
                          i.barcode.includes(withoutItemQuery)
                      )
                      .slice(0, 6)
                      .map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setWithoutSelectedItem(item);
                            setWithoutPrice(item.sellingPrice);
                            setWithoutItemQuery('');
                          }}
                          className="p-2.5 hover:bg-amber-500/20 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-blue-300/70">{item.code}</div>
                          </div>
                          <div className="text-xs font-bold text-emerald-400">
                            {currency} {item.sellingPrice.toLocaleString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {withoutSelectedItem && (
                  <div className="bg-[#08102a] p-3 rounded-xl border border-amber-500/40 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white">{withoutSelectedItem.name}</div>
                      <div className="text-[10px] text-amber-300">Code: {withoutSelectedItem.code}</div>
                    </div>
                    <button
                      onClick={() => setWithoutSelectedItem(null)}
                      className="text-xs text-rose-400 hover:text-white"
                    >
                      Change Item
                    </button>
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Quantity Returned
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={withoutQty}
                      onChange={(e) => setWithoutQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Unit Return Price ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={withoutPrice}
                      onChange={(e) => setWithoutPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={withoutCustomerName}
                      onChange={(e) => setWithoutCustomerName(e.target.value)}
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Customer Phone #
                    </label>
                    <input
                      type="text"
                      value={withoutCustomerPhone}
                      onChange={(e) => setWithoutCustomerPhone(e.target.value)}
                      placeholder="0771234567"
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Refund Mode
                    </label>
                    <select
                      value={withoutRefundType}
                      onChange={(e: any) => setWithoutRefundType(e.target.value)}
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Cash Refund">Cash Refund</option>
                      <option value="Credit Note">Credit Note (Store Account Credit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                      Item Condition
                    </label>
                    <select
                      value={withoutCondition}
                      onChange={(e) => setWithoutCondition(e.target.value)}
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Good / Resellable">Good / Resellable</option>
                      <option value="Defective / Damaged">Defective / Damaged</option>
                      <option value="Open Box">Open Box</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Return Reason
                  </label>
                  <input
                    type="text"
                    value={withoutReason}
                    onChange={(e) => setWithoutReason(e.target.value)}
                    className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="restockCheckWithoutBill"
                    checked={withoutRestock}
                    onChange={(e) => setWithoutRestock(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <label htmlFor="restockCheckWithoutBill" className="text-xs text-blue-200">
                    Restock item directly into live active inventory
                  </label>
                </div>

                {/* Summary */}
                <div className="bg-[#050c24] p-3 rounded-xl border border-amber-500/25 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-blue-300 uppercase">Total Refund Amount:</span>
                    <div className="text-xl font-black text-amber-400">
                      {currency} {(withoutQty * withoutPrice).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading || !withoutSelectedItem || withoutQty <= 0 || withoutPrice <= 0}
                    onClick={handleSubmitReturnWithoutBill}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 text-white rounded-xl text-xs font-oswald uppercase tracking-wider font-extrabold shadow-lg shadow-amber-600/30 cursor-pointer"
                  >
                    {loading ? 'Processing...' : 'Confirm Direct Return'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN DELETION / REVERSAL AUTHORIZATION MODAL */}
      <AdminAuthModal
        isOpen={adminAuthModal.isOpen}
        onClose={() => setAdminAuthModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={adminAuthModal.onSuccess}
        title={adminAuthModal.title}
        actionDescription={adminAuthModal.actionDescription}
      />
    </div>
  );
};
