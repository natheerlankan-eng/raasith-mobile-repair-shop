import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Package,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Printer,
  Download,
  X,
  Calendar,
  CheckCircle2,
  Barcode,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import { PosItem } from '../data/posData.ts';

interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemCode?: string | null;
  items?: PosItem[];
  currency?: string;
  token?: string | null;
  outlet?: string;
  onOpenBarcodePrinter?: (item: PosItem) => void;
}

interface StockMovement {
  id: number;
  date: string;
  time: string;
  itemCode: string;
  barcode?: string;
  itemName: string;
  movementType: string;
  refNo: string;
  qtyChange: number;
  balanceAfter: number;
  costPrice: number;
  sellingPrice: number;
  user: string;
  outlet: string;
  notes?: string;
}

export const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({
  isOpen,
  onClose,
  initialItemCode = null,
  items: passedItems = [],
  currency = 'LKR',
  token,
  outlet = 'Main Outlet Akkaraipattu',
  onOpenBarcodePrinter,
}) => {
  const [catalogItems, setCatalogItems] = useState<PosItem[]>(passedItems);
  const [selectedItemCode, setSelectedItemCode] = useState<string>(initialItemCode || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch catalog if needed
  useEffect(() => {
    if (passedItems && passedItems.length > 0) {
      setCatalogItems(passedItems);
      if (!selectedItemCode) {
        setSelectedItemCode(passedItems[0].code);
      }
    } else if (isOpen) {
      const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin';
      fetch('/api/inventory/items', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCatalogItems(data);
            if (!selectedItemCode) {
              setSelectedItemCode(data[0].code);
            }
          }
        })
        .catch((err) => console.error('Failed to load items catalog:', err));
    }
  }, [isOpen, passedItems, token]);

  useEffect(() => {
    if (initialItemCode) {
      setSelectedItemCode(initialItemCode);
    }
  }, [initialItemCode]);

  // Selected item object
  const selectedItem = useMemo(() => {
    return catalogItems.find((i) => i.code === selectedItemCode) || catalogItems[0] || null;
  }, [catalogItems, selectedItemCode]);

  // Fetch movements for selected item
  useEffect(() => {
    if (!isOpen || !selectedItem) return;

    setLoading(true);
    const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin';
    fetch(`/api/inventory/item-history?itemCode=${encodeURIComponent(selectedItem.code)}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.movements)) {
          setMovements(data.movements);
        } else {
          setMovements([]);
        }
      })
      .catch((err) => {
        console.error('Failed to query item movements:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, selectedItem, token]);

  // Filtered dropdown items
  const filteredSearchItems = useMemo(() => {
    if (!searchQuery.trim()) return catalogItems.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return catalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [catalogItems, searchQuery]);

  // Aggregations
  const initialStock = useMemo(() => {
    const init = movements.find((m) => m.movementType === 'Initial Stock');
    return init ? init.qtyChange : 0;
  }, [movements]);

  const grnAdditions = useMemo(() => {
    return movements
      .filter((m) => m.movementType === 'GRN Intake' || m.movementType === 'Bulk Import')
      .reduce((sum, m) => sum + (m.qtyChange > 0 ? m.qtyChange : 0), 0);
  }, [movements]);

  const posSalesDeductions = useMemo(() => {
    return movements
      .filter((m) => m.movementType === 'POS Sale')
      .reduce((sum, m) => sum + Math.abs(m.qtyChange), 0);
  }, [movements]);

  const returnsReversals = useMemo(() => {
    return movements
      .filter((m) => m.movementType === 'Sales Return' || m.movementType === 'Reversal')
      .reduce((sum, m) => sum + (m.qtyChange > 0 ? m.qtyChange : 0), 0);
  }, [movements]);

  const onHandBalance = selectedItem ? selectedItem.qty : (movements[0]?.balanceAfter || 0);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!selectedItem) return;
    const header = 'Date,Time,Reference,Movement Type,Qty Change,Balance After,Cost Price,Selling Price,User,Notes\n';
    const body = movements
      .map(
        (m) =>
          `"${m.date}","${m.time}","${m.refNo}","${m.movementType}",${m.qtyChange},${m.balanceAfter},${m.costPrice},${m.sellingPrice},"${m.user}","${m.notes || ''}"`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Item_History_${selectedItem.code}_${selectedItem.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none font-mono-jb">
      <div className="bg-[#081335] text-[#f8fafc] border-2 border-emerald-500/50 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1844] via-[#0d2a54] to-[#0a1844] border-b border-emerald-500/30 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Item History & Transaction Ledger
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  LIVE SQL AUDIT
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                {outlet} &bull; Initial Stock, GRN Intakes, POS Sales, Returns & On-Hand Balances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-[#0e1d48] hover:bg-[#162a63] border border-blue-500/30 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Export complete item ledger as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-emerald-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-blue-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Item Picker Toolbar */}
        <div className="bg-[#050c24] border-b border-blue-500/20 p-4 sm:px-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase text-emerald-400 font-bold whitespace-nowrap">
                Select Item:
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={selectedItem ? `${selectedItem.name} (${selectedItem.code})` : 'Search SKU Name or Code...'}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 shadow-sm"
                />

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-[#081335] border-2 border-emerald-500/50 rounded-xl shadow-2xl z-50 divide-y divide-blue-500/15">
                    {filteredSearchItems.map((item) => (
                      <div
                        key={item.id || item.code}
                        onClick={() => {
                          setSelectedItemCode(item.code);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`p-2.5 hover:bg-emerald-500/15 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                          selectedItem?.code === item.code ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-blue-100'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 rounded">
                              {item.code}
                            </span>
                          </div>
                          <div className="text-[10px] text-blue-300/60 flex items-center gap-2 mt-0.5">
                            <span>Cat: {item.category}</span>
                            <span>&bull;</span>
                            <span>Stock: {item.qty} pcs</span>
                          </div>
                        </div>
                        <div className="text-right font-black text-emerald-400">
                          {currency} {item.sellingPrice.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedItem && onOpenBarcodePrinter && (
            <button
              onClick={() => onOpenBarcodePrinter(selectedItem)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors shrink-0"
              title="Print barcode stickers for this SKU"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Print Barcodes</span>
            </button>
          )}
        </div>

        {/* KPI Summary Cards */}
        {selectedItem && (
          <div className="bg-[#07102e] p-4 sm:px-6 border-b border-blue-500/20 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-[#050c24] border border-blue-500/30 rounded-xl p-3">
                <span className="text-[10px] uppercase text-blue-300 font-bold block">1. Initial Stock</span>
                <strong className="text-base text-white">{initialStock} Units</strong>
                <span className="text-[9px] text-blue-300/60 block mt-0.5">Opening Catalog</span>
              </div>

              <div className="bg-[#050c24] border border-emerald-500/30 rounded-xl p-3">
                <span className="text-[10px] uppercase text-emerald-300 font-bold block flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  <span>2. GRN Intake</span>
                </span>
                <strong className="text-base text-emerald-400">+{grnAdditions} Units</strong>
                <span className="text-[9px] text-emerald-300/60 block mt-0.5">Wholesale Additions</span>
              </div>

              <div className="bg-[#050c24] border border-rose-500/30 rounded-xl p-3">
                <span className="text-[10px] uppercase text-rose-300 font-bold block flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-400" />
                  <span>3. POS Sales</span>
                </span>
                <strong className="text-base text-rose-400">-{posSalesDeductions} Units</strong>
                <span className="text-[9px] text-rose-300/60 block mt-0.5">Retail Deductions</span>
              </div>

              <div className="bg-[#050c24] border border-amber-500/30 rounded-xl p-3">
                <span className="text-[10px] uppercase text-amber-300 font-bold block">4. Returns / Reversals</span>
                <strong className="text-base text-amber-300">+{returnsReversals} Units</strong>
                <span className="text-[9px] text-amber-300/60 block mt-0.5">Customer Restocks</span>
              </div>

              <div className="bg-emerald-950/40 border-2 border-emerald-400 rounded-xl p-3 col-span-2 sm:col-span-1 shadow-lg shadow-emerald-500/10">
                <span className="text-[10px] uppercase text-emerald-300 font-black block">5. Current On-Hand</span>
                <strong className="text-xl text-white font-mono">{onHandBalance} Units</strong>
                <span className="text-[9px] text-emerald-200 block mt-0.5 font-bold">
                  {selectedItem.availability}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ledger Transaction Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <div className="bg-[#050c24] rounded-2xl border border-blue-500/30 overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0a1844] text-[10px] uppercase text-emerald-300 font-mono-jb border-b border-blue-500/30">
                <tr>
                  <th className="py-2.5 px-3 text-center">Date & Time</th>
                  <th className="py-2.5 px-3">Reference / Bill</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3 text-center">Change Qty</th>
                  <th className="py-2.5 px-3 text-center">Balance After</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3">User / Cashier</th>
                  <th className="py-2.5 px-3">Particulars / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/15 font-mono-jb text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-blue-300/60">
                      Querying live stock movement ledger...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-blue-300/60">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-400" />
                      <p className="text-sm font-bold text-white">No historical movement logs recorded yet for this item.</p>
                      <p className="text-xs text-blue-300/60 mt-1">
                        Future GRN receipts, POS checkouts, returns, and adjustments will append here automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  movements.map((m, idx) => (
                    <tr key={`${m.id || idx}`} className="hover:bg-blue-600/10 transition-colors">
                      <td className="py-2 px-3 text-center text-blue-200/70 whitespace-nowrap">
                        {m.date} <span className="text-[10px] text-blue-400/50">{m.time}</span>
                      </td>
                      <td className="py-2 px-3 font-bold text-cyan-300">{m.refNo}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.movementType === 'Initial Stock'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : m.movementType === 'GRN Intake' || m.movementType === 'Bulk Import'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : m.movementType === 'POS Sale'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : m.movementType === 'Sales Return'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-black">
                        <span className={m.qtyChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-white bg-blue-950/30">
                        {m.balanceAfter}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-200/70">
                        {currency} {m.costPrice.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-300">
                        {currency} {m.sellingPrice.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-blue-200">{m.user}</td>
                      <td className="py-2 px-3 text-blue-300/70 max-w-[200px] truncate" title={m.notes || ''}>
                        {m.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#050c24] border-t border-emerald-500/30 p-3.5 sm:px-6 flex items-center justify-between text-xs text-blue-200/70 shrink-0">
          <div>
            <span>Item: <strong>{selectedItem?.name}</strong></span>
            <span className="mx-2">&bull;</span>
            <span>SKU Code: <strong>{selectedItem?.code}</strong></span>
            <span className="mx-2">&bull;</span>
            <span>Barcode: <strong>{selectedItem?.barcode || 'N/A'}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0e1d48] hover:bg-[#162a63] text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
