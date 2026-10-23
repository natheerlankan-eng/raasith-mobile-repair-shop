import React from 'react';
import { MapPin, Phone, Printer } from 'lucide-react';
import { PosSystemConfig, PosBill, PosBillItem } from '../data/posData.ts';
import { useShop } from '../context/ShopContext.tsx';

interface ReceiptLineItem {
  code: string;
  name: string;
  rate: number;
  qty: number;
  amount: number;
}

export interface ThermalReceipt80mmProps {
  config: PosSystemConfig;
  bill?: PosBill | null;
  sampleMode?: boolean;
  showPrintButton?: boolean;
  onPrint?: () => void;
  className?: string;
}

export const ThermalReceipt80mm: React.FC<ThermalReceipt80mmProps> = ({
  config,
  bill,
  sampleMode = false,
  showPrintButton = false,
  onPrint,
  className = '',
}) => {
  const { shopProfile } = useShop();
  const activeShopName = (config?.shopName || shopProfile?.shopName || 'RAASITH MOBILE').toUpperCase();
  const activeOutlet = config?.outletName || shopProfile?.outletName || 'Professional Mobile Phone Repairing Centre';
  const activeBranch = (shopProfile?.branch || 'AKKARAIPATTU').toUpperCase();
  const activeAddress = config?.address || shopProfile?.address || 'Main Street, Akkaraipattu.';
  const activePhone = config?.phone || shopProfile?.phone || '0672277996, 0752834443';
  const activeLogo = config?.logoUrl || shopProfile?.logoUrl || '';

  // Use real bill data or sample receipt data matching prompt
  const isSample = sampleMode || !bill;

  const sampleItems: ReceiptLineItem[] = [
    { code: 'BTP00001', name: 'AMA P1 Button Phone', rate: 4000, qty: 1, amount: 4000 },
    { code: 'ACC00012', name: 'Fast Type-C Data Cable 65W', rate: 750, qty: 2, amount: 1500 },
    { code: 'SCR00088', name: 'Tempered Glass 9D Pro Guard', rate: 350, qty: 2, amount: 700 },
    { code: 'REP00045', name: 'Samsung A12 Port Replacement', rate: 1850, qty: 1, amount: 1850 },
  ];

  const items: ReceiptLineItem[] = isSample
    ? sampleItems
    : (bill?.items || []).map((it: PosBillItem) => ({
        code: it.code || 'ITEM',
        name: it.name,
        rate: it.price,
        qty: it.qty,
        amount: it.total,
      }));

  const customerName = isSample ? (config.defaultCustomer || 'CHEEP AND BEST') : (bill?.customerName || config.defaultCustomer || 'CHEEP AND BEST');
  const dateTime = isSample ? '10-10-2026 10:31 PM' : `${bill?.date || ''} ${bill?.time || ''}`;
  const invoiceNo = isSample ? (config.invoicePrefix || 'INV000010') : (bill?.billNo || config.invoicePrefix || 'INV000010');
  const cashierName = isSample ? (config.defaultCashier || 'Admin') : (config.defaultCashier || 'Admin');

  const totalItemsCount = items.length;
  const totalQuantityCount = items.reduce((acc: number, curr: ReceiptLineItem) => acc + curr.qty, 0);

  const subtotalAmount = isSample
    ? items.reduce((acc: number, curr: ReceiptLineItem) => acc + curr.amount, 0)
    : (bill?.subtotal || items.reduce((acc: number, curr: ReceiptLineItem) => acc + curr.amount, 0));

  const discountAmount = isSample ? 0 : (bill?.discount || 0);
  const netTotal = isSample ? subtotalAmount - discountAmount : (bill?.netTotal ?? (subtotalAmount - discountAmount));
  const amountPaid = isSample ? netTotal : (bill?.paidAmount ?? netTotal);
  const balanceAmount = isSample ? 0 : Math.max(0, (amountPaid - netTotal));
  const outstandingAmount = isSample ? 0 : (bill?.customerOutstandingDue || bill?.balanceDue || 0);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 80mm Physical Thermal Paper Container */}
      <div
        className="w-full max-w-[340px] sm:w-[80mm] bg-white text-black p-4 sm:p-5 shadow-2xl rounded-sm border border-gray-300 font-mono text-[11px] leading-[1.35] select-text"
        style={{
          fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
          color: '#000000',
        }}
      >
        {/* ========================================================= */}
        {/* 1. HEADER LAYOUT */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center text-center">
          {/* Centered Circular Logo */}
          <div className="mb-2">
            {activeLogo ? (
              <img
                src={activeLogo}
                alt={activeShopName}
                className="w-16 h-16 rounded-full object-cover border-2 border-black mx-auto"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <svg
                viewBox="0 0 120 120"
                className="w-16 h-16 mx-auto text-black drop-shadow-xs"
              >
                {/* Outer Dashed Ring */}
                <circle cx="60" cy="60" r="56" fill="none" stroke="#000" strokeWidth="2.5" strokeDasharray="3 2" />
                {/* Inner Ring */}
                <circle cx="60" cy="60" r="48" fill="none" stroke="#000" strokeWidth="1.5" />
                
                {/* Curved Text Paths */}
                <path id="topArc" d="M 18,60 A 42,42 0 0,1 102,60" fill="none" />
                <path id="bottomArc" d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
                
                <text fontSize="8" fontWeight="bold" letterSpacing="0.8" fill="#000">
                  <textPath href="#topArc" startOffset="50%" textAnchor="middle">
                    {activeShopName}
                  </textPath>
                </text>
                
                <text fontSize="7.5" fontWeight="bold" letterSpacing="0.5" fill="#000">
                  <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
                    {activeBranch}
                  </textPath>
                </text>
                
                {/* Center Smartphone / Tool Graphic */}
                <rect x="50" y="42" width="20" height="36" rx="3" fill="#000" />
                <rect x="52" y="45" width="16" height="27" rx="1.5" fill="#fff" />
                <circle cx="60" cy="74.5" r="1.5" fill="#fff" />
                <line x1="57" y1="43.5" x2="63" y2="43.5" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" />
              </svg>
            )}
          </div>

          {/* Bold Prominent Main Header Text */}
          <h1 className="text-base sm:text-[17px] font-black uppercase tracking-wider leading-tight text-black m-0">
            {activeShopName}
          </h1>

          {/* Subtitle */}
          <p className="text-[10px] font-bold text-gray-800 uppercase tracking-tight mt-0.5 mb-1">
            {activeOutlet}
          </p>

          {/* Pin Icon & Address with Telephone & Contact Numbers */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9.5px] text-gray-900 font-semibold mb-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0 stroke-[2.2]" />
              <span>{activeAddress}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3 shrink-0 stroke-[2.2]" />
              <span>{activePhone}</span>
            </span>
          </div>

          {/* Dashed Horizontal Line Divider */}
          <div className="w-full border-b border-dashed border-black my-1.5" />
        </div>

        {/* ========================================================= */}
        {/* 2. CUSTOMER & INVOICE META DETAILS */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between gap-2 py-1">
          {/* Left Side: Customer Name & Date/Time Stamp */}
          <div className="flex flex-col text-left">
            <div className="font-bold text-[11px] uppercase tracking-wide text-black">
              {customerName}
            </div>
            <div className="text-[9.5px] text-gray-700 font-medium mt-0.5">
              {dateTime}
            </div>
          </div>

          {/* Right Side: Rounded Capsule / Pill Container for Invoice No & Cashier */}
          <div className="border border-black rounded-full px-3 py-1 flex flex-col items-center justify-center text-center bg-gray-50 shrink-0">
            <span className="font-bold text-[10px] tracking-wider uppercase text-black leading-none">
              {invoiceNo}
            </span>
            <span className="text-[9px] text-gray-700 font-semibold leading-none mt-0.5">
              {cashierName}
            </span>
          </div>
        </div>

        {/* Solid Horizontal Line Divider */}
        <div className="w-full border-b border-black my-1.5" />

        {/* ========================================================= */}
        {/* 3. LINE ITEMS TABLE STRUCTURE */}
        {/* ========================================================= */}
        <div className="w-full my-1">
          {/* Header row */}
          <div className="flex items-center justify-between text-[10px] font-bold uppercase pb-1 border-b border-black">
            <div className="w-[50%] text-left"># Description</div>
            <div className="w-[25%] text-left">Rate &times; Qty</div>
            <div className="w-[25%] text-right">Amount</div>
          </div>

          {/* Item Rows */}
          <div className="divide-y divide-dashed divide-gray-400">
            {items.map((item: ReceiptLineItem, idx: number) => (
              <div key={idx} className="py-1.5 text-[10.5px]">
                {/* Line 1: Item Code & Name */}
                <div className="font-bold text-black leading-tight text-left">
                  {idx + 1}. {item.code} : {item.name}
                </div>

                {/* Line 2: Rate × Qty & Right-Aligned Amount */}
                <div className="flex items-center justify-between text-[10px] text-gray-800 mt-0.5">
                  <div className="pl-3 font-medium">
                    {item.rate} &times; {item.qty} pcs
                  </div>
                  <div className="font-bold text-black text-right">
                    {formatNumber(item.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. TOTALS & FINANCIAL BREAKDOWN */}
        {/* ========================================================= */}
        <div className="border-t-2 border-black pt-1.5 mt-1 space-y-1">
          <div className="flex items-start justify-between">
            {/* Left Block: Total Items & Total Qty Summary */}
            <div className="text-[10px] font-bold text-gray-900 space-y-0.5 text-left pt-0.5">
              <div>Total Items: {totalItemsCount}</div>
              <div>Total Qty: {totalQuantityCount}</div>
            </div>

            {/* Right Block: Right-Aligned Breakdown */}
            <div className="w-[55%] text-right space-y-0.5 text-[10.5px]">
              <div className="flex justify-between font-black text-[12px] border-b border-black/30 pb-0.5">
                <span>TOTAL:</span>
                <span>{formatNumber(netTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-800">
                <span>AMOUNT PAID:</span>
                <span>{formatNumber(amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-800">
                <span>BALANCE:</span>
                <span>{formatNumber(balanceAmount)}</span>
              </div>
            </div>
          </div>

          {/* Dashed Outstanding Box */}
          <div className="mt-2 pt-1">
            <div className="border border-dashed border-black rounded-xs py-1 px-2.5 flex items-center justify-between text-[10px] font-bold bg-gray-50/60">
              <span className="uppercase">Outstanding:</span>
              <span className="text-[11px] font-black">{formatNumber(outstandingAmount)}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. FOOTER POLICY & SOFTWARE CREDITS */}
        {/* ========================================================= */}
        <div className="mt-3 pt-2 border-t border-dashed border-black text-center space-y-1.5">
          {/* Centered Return Policy Disclaimer Text */}
          <p className="text-[9px] text-gray-800 leading-tight m-0 px-1 font-medium">
            {config.returnPolicy ||
              'We do not accept Return / Defective items after 7 days. Please submit original INVOICE for Return or Defective Claim.'}
          </p>

          {/* Bold Closing Line */}
          <p className="text-[10.5px] font-black uppercase tracking-wider text-black m-0">
            {config.footerMessage || '** Thank You for Shopping With Us! **'}
          </p>

          {/* Software Credit Line */}
          <p className="text-[8.5px] text-gray-600 tracking-tight font-medium m-0 border-t border-dotted border-gray-400 pt-1">
            {config.softwareCredit || 'Software: Syntaks Shopman | www.syntaks.lk'}
          </p>
        </div>
      </div>

      {/* Prominent Blue "Print This Bill" Action Button */}
      {showPrintButton && (
        <div className="mt-4 w-full max-w-[340px] no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-oswald text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-blue-600/40 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Printer className="w-5 h-5 stroke-[2.5]" />
            <span>Print This Bill</span>
          </button>
        </div>
      )}
    </div>
  );
};
