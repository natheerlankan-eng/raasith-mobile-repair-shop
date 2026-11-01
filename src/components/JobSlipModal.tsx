import React from 'react';
import { X, Printer, Smartphone, CheckCircle, ShieldCheck } from 'lucide-react';
import { RepairJob, AccessoriesInfo, SparePart } from '../types.ts';
import { parseJobIssues } from '../utils/whatsapp.ts';
import { useShop } from '../context/ShopContext.tsx';

interface JobSlipModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
}

export const JobSlipModal: React.FC<JobSlipModalProps> = ({
  job,
  isOpen,
  onClose,
  shopName,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';
  const activeLogoUrl = shopProfile?.logoUrl || '/images/raasith_logo.png';

  if (!isOpen || !job) return null;

  const sparePartsAmount = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
  const totalAmount = job.estimatedPrice + sparePartsAmount;
  const balance = Math.max(0, totalAmount - job.advancePaid);
  const issues = parseJobIssues(job);

  let acc: AccessoriesInfo | null = null;
  if (job.accessories) {
    try {
      acc = JSON.parse(job.accessories);
    } catch {
      acc = null;
    }
  }

  let parts: SparePart[] = [];
  if (job.spareParts) {
    try {
      const p = JSON.parse(job.spareParts);
      parts = Array.isArray(p) ? p : [];
    } catch {
      parts = [];
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Screen Modal (Hidden on Print) */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
          {/* Modal Header */}
          <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-red-400" />
              <h3 className="font-extrabold text-lg">Job Slip Preview</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Slip Content on Screen */}
          <div className="p-6 space-y-4 text-slate-800 bg-white">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              {/* Slip Header */}
              <div className="flex flex-col items-center justify-center border-b border-slate-200 pb-3 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-950 p-0.5 border-2 border-red-500 shadow-md mb-2 overflow-hidden">
                  <img
                    src={activeLogoUrl}
                    alt={activeShopName}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
                    }}
                  />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeShopName}</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                  Mobile Phone Repair Slip & Customer Receipt
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white rounded-lg font-mono font-black text-sm">
                  JOB ID: {job.jobNumber}
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Date</span>
                  <span className="font-bold text-slate-800 text-sm">{job.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Customer Name</span>
                  <span className="font-bold text-slate-800 text-sm">{job.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Phone Number</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{job.phoneNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Technician</span>
                  <span className="font-bold text-slate-800 text-sm">{job.technicianName}</span>
                </div>
                {(job.expectedDeliveryDate || job.expectedDeliveryTime) && (
                  <div className="col-span-2 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-emerald-700 font-bold uppercase text-[10px] block">Expected Delivery Schedule</span>
                    <span className="font-bold text-emerald-900 text-xs">
                      {job.expectedDeliveryDate} {job.expectedDeliveryTime ? `at ${job.expectedDeliveryTime}` : ''}
                    </span>
                  </div>
                )}
                {job.customerAddress && (
                  <div className="col-span-2 bg-slate-100/70 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Customer Address / Area</span>
                    <span className="font-semibold text-slate-800 text-xs">{job.customerAddress}</span>
                  </div>
                )}
              </div>

              {/* Device & Problem */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Device</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {job.deviceBrand} {job.deviceModel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Reported Problem</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{issues}</span>
                  {job.notes && (
                    <span className="text-slate-500 italic block mt-1">Notes: {job.notes}</span>
                  )}
                </div>
              </div>

              {/* Accessories Received Checklist */}
              {acc && (
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-xs space-y-1">
                  <span className="font-bold text-blue-900 block text-[11px] uppercase tracking-wider">
                    Accessories Handed In:
                  </span>
                  <div className="flex items-center gap-3 font-semibold text-slate-700">
                    <span>SIM: {acc.sim ? '✓ Yes' : '✗ No'}</span>
                    <span>Back Cover: {acc.backCover ? '✓ Yes' : '✗ No'}</span>
                    <span>Battery: {acc.battery ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  {acc.other && (
                    <div className="text-[11px] text-slate-600 mt-0.5">Other: {acc.other}</div>
                  )}
                </div>
              )}

              {/* Spare Parts Installed */}
              {parts.length > 0 && (
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                  <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider">
                    Spare Parts Replaced:
                  </span>
                  <div className="space-y-0.5">
                    {parts.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>{p.name} {p.qty > 1 ? `(x${p.qty})` : ''}</span>
                        <span className="font-bold">Rs. {p.cost * p.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financials */}
              <div className="bg-slate-100 p-3.5 rounded-xl space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between text-slate-700">
                  <span>Base Service Charge:</span>
                  <span className="font-bold text-sm">Rs. {job.estimatedPrice}</span>
                </div>
                {sparePartsAmount > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Spare Parts Amount:</span>
                    <span className="font-bold text-sm">+ Rs. {sparePartsAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 border-t border-slate-200/80 pt-1">
                  <span>Total Repair Amount:</span>
                  <span className="font-black text-sm">Rs. {totalAmount}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Advance Paid / Applied:</span>
                  <span className="font-bold text-sm text-slate-800">- Rs. {job.advancePaid}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-300 text-slate-900 font-extrabold text-sm">
                  <span>Balance Due:</span>
                  <span className={balance > 0 ? 'text-rose-600 font-black text-base' : 'text-emerald-600 font-black'}>
                    Rs. {balance}
                  </span>
                </div>
              </div>

              {/* Terms / Notice */}
              <div className="text-[10px] text-slate-500 text-center space-y-0.5 border-t border-slate-200 pt-2">
                <p>Please present this slip when collecting your device.</p>
                <p className="font-bold text-slate-700">Thank you for choosing {activeShopName}!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-md shadow-red-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Job Slip</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area (Activated during window.print()) */}
      <div className="print-only print-job-slip">
        <div style={{ maxWidth: '380px', margin: '0 auto', fontFamily: 'monospace', padding: '10px', color: '#000000' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '10px' }}>
            <img
              src={activeLogoUrl}
              alt={activeShopName}
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px auto', display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
              }}
            />
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{activeShopName}</h1>
            {shopProfile?.branch && <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{shopProfile.branch}</p>}
            {shopProfile?.address && <p style={{ fontSize: '10px', margin: '0 0 2px 0' }}>{shopProfile.address}</p>}
            {shopProfile?.phone && <p style={{ fontSize: '10px', margin: '0 0 4px 0' }}>Tel: {shopProfile.phone}</p>}
            <p style={{ fontSize: '11px', margin: 0 }}>MOBILE PHONE REPAIR SLIP</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0 0 0' }}>JOB ID: {job.jobNumber}</p>
          </div>

          <div style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '12px' }}>
            <div><strong>Date:</strong> {job.date}</div>
            <div><strong>Customer:</strong> {job.customerName}</div>
            <div><strong>Phone:</strong> {job.phoneNumber}</div>
            {job.customerAddress && <div><strong>Address:</strong> {job.customerAddress}</div>}
            <div><strong>Device:</strong> {job.deviceBrand} {job.deviceModel}</div>
            <div><strong>Technician:</strong> {job.technicianName}</div>
            {(job.expectedDeliveryDate || job.expectedDeliveryTime) && (
              <div style={{ border: '1px solid black', padding: '4px 6px', margin: '5px 0', fontWeight: 'bold' }}>
                Expected Delivery: {job.expectedDeliveryDate} {job.expectedDeliveryTime ? `at ${job.expectedDeliveryTime}` : ''}
              </div>
            )}
            <div style={{ marginTop: '6px' }}><strong>Problem:</strong> {issues}</div>
            {job.notes && <div><strong>Notes:</strong> {job.notes}</div>}

            {acc && (
              <div style={{ marginTop: '6px', borderTop: '1px dotted black', paddingTop: '4px' }}>
                <strong>Accessories:</strong> SIM: {acc.sim ? 'Yes' : 'No'} | Cover: {acc.backCover ? 'Yes' : 'No'} | Battery: {acc.battery ? 'Yes' : 'No'}
                {acc.other && <div>Other: {acc.other}</div>}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '8px 0', margin: '10px 0', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Base Service Price:</span>
              <strong>Rs. {job.estimatedPrice}</strong>
            </div>
            {sparePartsAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Spare Parts Amount:</span>
                <strong>+ Rs. {sparePartsAmount}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #ccc', paddingTop: '3px', marginTop: '3px' }}>
              <span>Total Amount:</span>
              <strong>Rs. {totalAmount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Advance Paid:</span>
              <strong>- Rs. {job.advancePaid}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              <span>Balance Due:</span>
              <span>Rs. {balance}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '12px' }}>
            <p style={{ margin: '0 0 4px 0' }}>Bring this slip to collect your mobile.</p>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Thank you for choosing {activeShopName}!</p>
          </div>
        </div>
      </div>
    </>
  );
};
