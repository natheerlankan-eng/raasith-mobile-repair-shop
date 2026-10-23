import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Barcode as BarcodeIcon,
  Printer,
  Search,
  X,
  Check,
  Tag,
  Copy,
  Layers,
  Sparkles,
  Sliders,
  AlertCircle,
  Package,
  RotateCcw
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { PosItem } from '../data/posData.ts';
import { useShop } from '../context/ShopContext.tsx';

interface BarcodePrintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: PosItem | null;
  items?: PosItem[];
  currency?: string;
  shopName?: string;
  token?: string | null;
}

export type LabelSize = '38x25' | '40x30' | '50x25' | '50x30' | '80x50';

export const BarcodePrintingModal: React.FC<BarcodePrintingModalProps> = ({
  isOpen,
  onClose,
  initialItem = null,
  items: passedItems = [],
  currency = 'LKR',
  shopName = 'RAASITH MOBILE',
  token,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';

  const [catalogItems, setCatalogItems] = useState<PosItem[]>(passedItems);
  const [selectedItem, setSelectedItem] = useState<PosItem | null>(initialItem);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Label Configuration
  const [labelSize, setLabelSize] = useState<LabelSize>('38x25');
  const [quantity, setQuantity] = useState<number>(4);
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [storeNameText, setStoreNameText] = useState<string>(activeShopName);
  const [showItemName, setShowItemName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);
  const [customPriceOverride, setCustomPriceOverride] = useState<string>('');

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Fetch items if catalog not supplied
  useEffect(() => {
    if (passedItems && passedItems.length > 0) {
      setCatalogItems(passedItems);
    } else if (isOpen) {
      const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin';
      fetch('/api/inventory/items', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCatalogItems(data);
            if (!selectedItem) {
              setSelectedItem(data[0]);
            }
          }
        })
        .catch((err) => console.error('Failed to load items for barcode printing:', err));
    }
  }, [isOpen, passedItems, token]);

  useEffect(() => {
    if (initialItem) {
      setSelectedItem(initialItem);
    } else if (!selectedItem && catalogItems.length > 0) {
      setSelectedItem(catalogItems[0]);
    }
  }, [initialItem, catalogItems]);

  // Filtered items for live search
  const filteredSearchItems = useMemo(() => {
    if (!searchQuery.trim()) return catalogItems.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return catalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [catalogItems, searchQuery]);

  // Barcode string calculation
  const barcodeValue = useMemo(() => {
    if (!selectedItem) return '000000000000';
    if (selectedItem.barcode && selectedItem.barcode.trim()) {
      return selectedItem.barcode.trim();
    }
    return `890${String(selectedItem.code).padStart(9, '0')}`;
  }, [selectedItem]);

  // Generate SVG barcode
  useEffect(() => {
    if (barcodeSvgRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeValue, {
          format: 'CODE128',
          width: labelSize === '80x50' ? 2 : 1.3,
          height: labelSize === '38x25' ? 24 : labelSize === '50x25' ? 24 : 32,
          displayValue: false,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('JsBarcode rendering error:', err);
      }
    }
  }, [barcodeValue, labelSize]);

  if (!isOpen) return null;

  const currentPrice = customPriceOverride.trim() !== ''
    ? Number(customPriceOverride) || 0
    : (selectedItem?.sellingPrice || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none font-mono-jb">
      {/* Hidden Thermal Print Sheet (Rendered during window.print()) */}
      <div id="barcode-thermal-print-area" className="hidden print:block">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${
                  labelSize === '38x25' ? '38mm 25mm' :
                  labelSize === '40x30' ? '40mm 30mm' :
                  labelSize === '50x25' ? '50mm 25mm' :
                  labelSize === '50x30' ? '50mm 30mm' : '80mm 50mm'
                };
                margin: 0mm;
              }
              body * {
                visibility: hidden !important;
              }
              #barcode-thermal-print-area, #barcode-thermal-print-area * {
                visibility: visible !important;
              }
              #barcode-thermal-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
              }
              .barcode-label-sticker {
                page-break-after: always;
                break-after: page;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                box-sizing: border-box;
                padding: 1.5mm;
                width: ${
                  labelSize === '38x25' ? '38mm' :
                  labelSize === '40x30' ? '40mm' :
                  labelSize === '50x25' ? '50mm' :
                  labelSize === '50x30' ? '50mm' : '80mm'
                };
                height: ${
                  labelSize === '38x25' ? '25mm' :
                  labelSize === '40x30' ? '30mm' :
                  labelSize === '50x25' ? '25mm' :
                  labelSize === '50x30' ? '30mm' : '50mm'
                };
                overflow: hidden;
                font-family: monospace, sans-serif;
                color: #000;
              }
            }
          `
        }} />

        {Array.from({ length: Math.max(1, quantity) }).map((_, idx) => (
          <div key={`print-label-${idx}`} className="barcode-label-sticker">
            {showStoreName && (
              <div style={{ fontSize: '7pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {storeNameText}
              </div>
            )}
            {showItemName && selectedItem && (
              <div style={{ fontSize: '6.5pt', fontWeight: 700, maxHeight: '14px', overflow: 'hidden', lineHeight: '1.1', margin: '1px 0' }}>
                {selectedItem.name}
              </div>
            )}
            <svg
              ref={(el) => {
                if (el && barcodeValue) {
                  try {
                    JsBarcode(el, barcodeValue, {
                      format: 'CODE128',
                      width: labelSize === '80x50' ? 2 : 1.25,
                      height: labelSize === '38x25' ? 22 : labelSize === '50x25' ? 22 : 28,
                      displayValue: false,
                      margin: 0,
                      background: 'transparent',
                      lineColor: '#000000',
                    });
                  } catch (e) {}
                }
              }}
              style={{ maxWidth: '92%', height: 'auto', display: 'block', margin: '1px auto' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '92%', alignItems: 'center', marginTop: '1px' }}>
              {showBarcodeText && (
                <span style={{ fontSize: '6pt', fontWeight: 700 }}>
                  {barcodeValue}
                </span>
              )}
              {showPrice && (
                <span style={{ fontSize: '7pt', fontWeight: 900 }}>
                  {currency} {currentPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Screen Interactive Modal */}
      <div className="bg-[#081335] text-[#f8fafc] border-2 border-cyan-500/50 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 no-print">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1844] via-[#0d225c] to-[#0a1844] border-b border-cyan-500/30 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <BarcodeIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Barcode Sticker Printing Engine
                </h2>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  THERMAL READY
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                Main Outlet Akkaraipattu &bull; Standard Thermal Label Roll & Sheet Printing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-blue-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 scrollbar-thin">
          {/* LEFT COLUMN: Controls & Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Item Search & Selection */}
            <div className="bg-[#050c24] border border-blue-500/30 rounded-2xl p-4 space-y-2 relative">
              <label className="text-xs uppercase text-cyan-300 font-bold block flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>1. Search & Select Inventory Item</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type Item Name, SKU Code (e.g. 000027), or Barcode..."
                  className="w-full bg-[#081335] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-blue-300/40 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                />

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-[#081335] border-2 border-cyan-500/50 rounded-xl shadow-2xl z-50 divide-y divide-blue-500/15">
                    {filteredSearchItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-blue-300/60">
                        No catalog items match your search.
                      </div>
                    ) : (
                      filteredSearchItems.map((item) => (
                        <div
                          key={item.id || item.code}
                          onClick={() => {
                            setSelectedItem(item);
                            setCustomPriceOverride('');
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`p-2.5 hover:bg-cyan-500/15 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                            selectedItem?.code === item.code ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-blue-100'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 rounded">
                                {item.code}
                              </span>
                            </div>
                            <div className="text-[10px] text-blue-300/60 flex items-center gap-2 mt-0.5">
                              <span>Cat: {item.category}</span>
                              <span>&bull;</span>
                              <span>Stock: {item.qty} units</span>
                            </div>
                          </div>
                          <div className="text-right font-black text-emerald-400">
                            {currency} {item.sellingPrice.toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Item Banner */}
              {selectedItem && (
                <div className="bg-[#0b1740] border border-blue-500/40 rounded-xl p-3 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] text-cyan-300 uppercase block font-bold">Selected SKU:</span>
                    <strong className="text-sm text-white block">{selectedItem.name}</strong>
                    <span className="text-[11px] text-blue-200/70">
                      Code: {selectedItem.code} &bull; Barcode: {barcodeValue}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-blue-300/70 block uppercase">Retail Price</span>
                    <span className="text-base font-black text-emerald-400">
                      {currency} {currentPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Sticker Dimensions & Copies */}
            <div className="bg-[#050c24] border border-blue-500/30 rounded-2xl p-4 space-y-3">
              <label className="text-xs uppercase text-cyan-300 font-bold block flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>2. Sticker Size & Copies</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: '38x25', label: '38mm × 25mm', desc: 'Standard 1.5"×1" Sticker' },
                  { id: '40x30', label: '40mm × 30mm', desc: 'Compact Roll Label' },
                  { id: '50x25', label: '50mm × 25mm', desc: 'Jewelry / Cable Bar' },
                  { id: '50x30', label: '50mm × 30mm', desc: 'Medium Box Sticker' },
                  { id: '80x50', label: '80mm × 50mm', desc: 'Large Shipping / Parts' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setLabelSize(s.id as LabelSize)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      labelSize === s.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-[#081335] border-blue-500/20 text-blue-200/70 hover:border-blue-400/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{s.label}</div>
                    <div className="text-[9px] text-blue-300/60 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>

              {/* Quantity Selector */}
              <div className="pt-2 border-t border-blue-500/20 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold text-blue-200 block">Sticker Quantity:</span>
                  <span className="text-[10px] text-blue-300/60">Number of barcode labels to print</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#081335] border border-cyan-500/40 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-blue-300 hover:text-white hover:bg-white/10 cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 text-center bg-transparent text-sm font-black text-cyan-300 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3 py-1.5 text-blue-300 hover:text-white hover:bg-white/10 cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantity(selectedItem?.qty || 10)}
                    className="px-2.5 py-1.5 bg-[#0b1740] hover:bg-[#12235c] border border-blue-500/30 text-[10px] text-cyan-300 rounded-lg cursor-pointer"
                    title="Set quantity to match current on-hand inventory stock"
                  >
                    Match Stock ({selectedItem?.qty || 0})
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Label Content Customization Toggles */}
            <div className="bg-[#050c24] border border-blue-500/30 rounded-2xl p-4 space-y-3">
              <label className="text-xs uppercase text-cyan-300 font-bold block flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>3. Label Customization Options</span>
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer bg-[#081335] p-2.5 rounded-xl border border-blue-500/20 hover:border-cyan-500/40">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Store Name</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#081335] p-2.5 rounded-xl border border-blue-500/20 hover:border-cyan-500/40">
                  <input
                    type="checkbox"
                    checked={showItemName}
                    onChange={(e) => setShowItemName(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Item Description</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#081335] p-2.5 rounded-xl border border-blue-500/20 hover:border-cyan-500/40">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Selling Price</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#081335] p-2.5 rounded-xl border border-blue-500/20 hover:border-cyan-500/40">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Barcode Numbers</span>
                </label>
              </div>

              {/* Store Name text edit */}
              {showStoreName && (
                <div className="pt-2 border-t border-blue-500/15 flex items-center gap-2 text-xs">
                  <span className="text-blue-300/70 text-[11px] whitespace-nowrap">Header Name:</span>
                  <input
                    type="text"
                    value={storeNameText}
                    onChange={(e) => setStoreNameText(e.target.value)}
                    className="flex-1 bg-[#081335] border border-blue-500/30 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Print Preview & Action (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-[#050c24] border border-cyan-500/30 rounded-2xl p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-2.5 mb-3">
                <span className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Real-Time Sticker Preview</span>
                </span>
                <span className="text-[10px] text-blue-300/60 font-mono-jb">
                  Size: {labelSize} mm &bull; {quantity} Copies
                </span>
              </div>

              {/* Single Label Realistic Sticker Preview */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#08102a] rounded-xl border border-blue-500/20">
                <div
                  className="bg-white text-black rounded-sm shadow-xl p-3 flex flex-col items-center justify-between text-center transition-all border border-slate-300"
                  style={{
                    width: labelSize === '38x25' ? '180px' : labelSize === '50x25' ? '210px' : '200px',
                    height: labelSize === '38x25' ? '120px' : labelSize === '50x25' ? '120px' : '140px',
                  }}
                >
                  {showStoreName && (
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 leading-tight">
                      {storeNameText}
                    </div>
                  )}

                  {showItemName && selectedItem && (
                    <div className="text-[9px] font-bold text-slate-800 line-clamp-1 max-w-[170px] leading-tight mt-0.5">
                      {selectedItem.name}
                    </div>
                  )}

                  {/* Barcode SVG */}
                  <svg ref={barcodeSvgRef} className="max-w-[95%] my-1" />

                  <div className="flex items-center justify-between w-full px-1 text-[9px] font-mono font-bold text-slate-900">
                    {showBarcodeText ? <span>{barcodeValue}</span> : <span />}
                    {showPrice && (
                      <span className="font-black text-[10px]">
                        {currency} {currentPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-blue-300/60 font-mono-jb mt-3 text-center">
                  Preview scaled for screen &bull; Prints crisp vector bars on thermal roll
                </div>
              </div>

              {/* Sheet Multi-Copy Preview Thumbnails */}
              <div className="pt-3 border-t border-blue-500/20 mt-3">
                <div className="text-[10px] text-cyan-300 uppercase font-bold mb-1.5 flex items-center justify-between">
                  <span>Batch Output Preview:</span>
                  <span>{quantity} Stickers</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {Array.from({ length: Math.min(6, quantity) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-12 h-8 bg-white/90 rounded-xs flex items-center justify-center border border-slate-400 shrink-0 shadow-xs"
                    >
                      <BarcodeIcon className="w-8 h-4 text-slate-800" />
                    </div>
                  ))}
                  {quantity > 6 && (
                    <span className="text-[10px] text-blue-300/70 font-bold px-1.5">
                      +{quantity - 6} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Print Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-2xl font-oswald text-sm font-black uppercase tracking-wider shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <Printer className="w-5 h-5 stroke-[2.2]" />
                <span>Print {quantity} Barcode Stickers Now</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-3 bg-[#081335] hover:bg-[#12235c] text-blue-300 text-xs rounded-xl font-bold border border-blue-500/20 transition-colors cursor-pointer"
              >
                Close Module
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
