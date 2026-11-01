import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  History,
  Smartphone,
  User,
  DollarSign,
  Calendar,
  Check,
  AlertCircle,
  Plus,
  Wrench,
  CheckSquare,
  Square,
  Search,
  ChevronDown,
  Tag,
  Zap,
  Clock,
} from 'lucide-react';
import { CATEGORIZED_PHONE_ISSUES, PHONE_ISSUES, COMMON_BRANDS } from '../data/issues.ts';
import { RepairJob, Technician } from '../types.ts';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: any) => Promise<void>;
  nextJobNumber: string;
  allJobs: RepairJob[];
  technicians?: Technician[];
}

export const NewJobModal: React.FC<NewJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nextJobNumber,
  allJobs,
  technicians = [],
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('Samsung');
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');

  // Searchable Categorized Fault Diagnostics State
  const [selectedIssues, setSelectedIssues] = useState<string[]>(['Display Replacement']);
  const [faultSearchTerm, setFaultSearchTerm] = useState('');
  const [isFaultDropdownOpen, setIsFaultDropdownOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [otherProblem, setOtherProblem] = useState('');
  const [notes, setNotes] = useState('');

  // Financials (Service Labor Charge & Advance)
  const [estimatedPrice, setEstimatedPrice] = useState<number | ''>('');
  const [advancePaid, setAdvancePaid] = useState<number | ''>(0);
  const [technicianName, setTechnicianName] = useState('Raasith');

  // Expected Delivery Schedule
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(getTomorrowStr());
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState('17:00');

  // Accessories Intake
  const [accSim, setAccSim] = useState(false);
  const [accBackCover, setAccBackCover] = useState(false);
  const [accBattery, setAccBattery] = useState(true);
  const [accOther, setAccOther] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Returning customer detection
  const [customerHistory, setCustomerHistory] = useState<RepairJob[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const faultInputRef = useRef<HTMLInputElement>(null);
  const faultDropdownRef = useRef<HTMLDivElement>(null);
  const customRemarksInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setCustomerName('');
      setPhoneNumber('');
      setCustomerAddress('');
      setDeviceBrand('Samsung');
      setDeviceModel('');
      setImei('');
      setSelectedIssues(['Display Replacement']);
      setFaultSearchTerm('');
      setIsFaultDropdownOpen(false);
      setActiveCategoryFilter('All');
      setOtherProblem('');
      setNotes('');
      setEstimatedPrice('');
      setAdvancePaid(0);
      setTechnicianName(technicians.length > 0 ? technicians[0].name : 'Raasith');
      setExpectedDeliveryDate(getTomorrowStr());
      setExpectedDeliveryTime('17:00');
      setAccSim(false);
      setAccBackCover(false);
      setAccBattery(true);
      setAccOther('');
      setFormError(null);
      setCustomerHistory([]);
      setShowHistoryModal(false);

      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, technicians]);

  // Click outside to close fault dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        faultDropdownRef.current &&
        !faultDropdownRef.current.contains(event.target as Node) &&
        faultInputRef.current &&
        !faultInputRef.current.contains(event.target as Node)
      ) {
        setIsFaultDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Returning customer phone lookup
  useEffect(() => {
    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
      const matches = allJobs.filter((j) => {
        const jPhone = j.phoneNumber.trim().replace(/\D/g, '');
        return jPhone === cleanPhone || (cleanPhone.length >= 9 && jPhone.endsWith(cleanPhone.slice(-9)));
      });

      if (matches.length > 0) {
        setCustomerHistory(matches);
        if (!customerName.trim() && matches[0]?.customerName) {
          setCustomerName(matches[0].customerName);
        }
        const prevAddress = matches.find((m) => m.customerAddress)?.customerAddress;
        if (!customerAddress.trim() && prevAddress) {
          setCustomerAddress(prevAddress);
        }
      } else {
        setCustomerHistory([]);
      }
    } else {
      setCustomerHistory([]);
    }
  }, [phoneNumber, allJobs]);

  // Keyboard navigation: Escape to close, Ctrl+Enter to submit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSubmit(e as any);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, customerName, phoneNumber, deviceBrand, deviceModel, estimatedPrice, advancePaid, selectedIssues, otherProblem, notes]);

  // Real-time Financial Calculations (Labor Charge - Advance = Due)
  const servicePriceNum = Number(estimatedPrice) || 0;
  const advanceNum = Number(advancePaid) || 0;
  const totalAmount = servicePriceNum;
  const balanceDue = Math.max(0, totalAmount - advanceNum);

  // Dynamic Searchable Filter for Predefined Fault List
  const filteredCategories = useMemo(() => {
    const query = faultSearchTerm.trim().toLowerCase();

    return CATEGORIZED_PHONE_ISSUES.map((cat) => {
      // If category filter is active and doesn't match, skip
      if (activeCategoryFilter !== 'All' && cat.category !== activeCategoryFilter) {
        return { ...cat, issues: [] };
      }

      if (!query) {
        return cat;
      }

      const matchingIssues = cat.issues.filter(
        (iss) =>
          iss.toLowerCase().includes(query) ||
          cat.category.toLowerCase().includes(query)
      );

      return {
        ...cat,
        issues: matchingIssues,
      };
    }).filter((cat) => cat.issues.length > 0);
  }, [faultSearchTerm, activeCategoryFilter]);

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleAddCustomFault = () => {
    const trimmed = faultSearchTerm.trim();
    if (trimmed && !selectedIssues.includes(trimmed)) {
      setSelectedIssues((prev) => [...prev, trimmed]);
      setFaultSearchTerm('');
    }
  };

  const removeIssue = (issue: string) => {
    setSelectedIssues((prev) => prev.filter((i) => i !== issue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      setFormError('Customer Name and Contact Number are mandatory.');
      return;
    }
    if (!deviceBrand.trim() || !deviceModel.trim()) {
      setFormError('Device Brand and Model are mandatory.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const finalProblems = selectedIssues.length > 0 ? selectedIssues : ['General Hardware Diagnosis / Repair'];

      await onSubmit({
        date,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        customerAddress: customerAddress.trim() || undefined,
        deviceBrand: deviceBrand.trim(),
        deviceModel: deviceModel.trim(),
        imei: imei.trim() || undefined,
        problems: finalProblems,
        otherProblem: otherProblem.trim() || undefined,
        notes: notes.trim() || undefined,
        estimatedPrice: servicePriceNum,
        sparePartsAmount: 0,
        advancePaid: advanceNum,
        technicianName: technicianName.trim() || 'Raasith',
        expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.trim() : undefined,
        expectedDeliveryTime: expectedDeliveryTime ? expectedDeliveryTime.trim() : undefined,
        accessories: {
          sim: accSim,
          backCover: accBackCover,
          battery: accBattery,
          other: accOther.trim() || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create repair job.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#070e28] flex flex-col p-2 sm:p-3 text-[#f8fafc] font-mono-jb select-none animate-fadeIn">
      {/* 1. TOP HEADER BAR (Compact, Zero Scroll Header) */}
      <div className="h-12 shrink-0 bg-[#0a1538] border border-blue-500/30 rounded-xl px-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 font-bold">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-oswald text-base sm:text-lg font-black uppercase tracking-wider text-white">
              Hardware Repair Intake Job Card
            </h1>
            <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono">
              Job Slip: {nextJobNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-blue-200/80 bg-[#060d24] px-2.5 py-1 rounded-lg border border-blue-500/20">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white outline-none text-xs font-bold"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-blue-200/80 bg-[#060d24] px-2.5 py-1 rounded-lg border border-blue-500/20">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="bg-transparent text-white outline-none text-xs font-bold cursor-pointer"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.name} className="bg-[#0a1538] text-white">
                  Tech: {t.name}
                </option>
              ))}
              <option value="Raasith" className="bg-[#0a1538] text-white">Tech: Raasith</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg bg-[#0e1d48] hover:bg-rose-600/30 text-blue-300 hover:text-rose-300 border border-blue-500/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ERROR ALERT IF ANY */}
      {formError && (
        <div className="mt-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{formError}</span>
          </div>
          <button onClick={() => setFormError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN 3-COLUMN RE-ALIGNED DASHBOARD (Single Screen, Zero Vertical Scroll) */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-12 gap-2.5 my-2 overflow-hidden">
        {/* ========================================================================= */}
        {/* COLUMN 1: CUSTOMER & DEVICE SPECIFICATIONS (Cols 1-4) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          {/* Card 1.1: Customer Particulars */}
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-xl p-3 flex flex-col gap-2 shadow-lg shrink-0">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                1. Customer Particulars
              </span>
              {customerHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>{customerHistory.length} Past Repairs</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Phone Number *</label>
                <input
                  ref={phoneInputRef}
                  type="text"
                  placeholder="077xxxxxxx"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Customer Name *</label>
                <input
                  type="text"
                  placeholder="Customer Full Name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Address / Area</label>
              <input
                type="text"
                placeholder="Akkaraipattu / Kalmunai / Ampara..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs text-blue-100 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Card 1.2: Device Specifications & Accessories */}
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-xl p-3 flex flex-col gap-2 shadow-lg flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                2. Device Specifications
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Brand *</label>
                <select
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-400 cursor-pointer"
                >
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b} className="bg-[#0a1538]">
                      {b}
                    </option>
                  ))}
                  <option value="Other" className="bg-[#0a1538]">Other Brand</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">Model *</label>
                <input
                  type="text"
                  placeholder="e.g. Galaxy A32 / iPhone 13"
                  required
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">IMEI / Serial Number</label>
              <input
                type="text"
                placeholder="15-digit IMEI or Serial Number"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-400"
              />
            </div>

            {/* Accessories Intake Checkboxes */}
            <div className="mt-auto pt-2 border-t border-blue-500/20">
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-1">
                Intake Accessories
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAccSim(!accSim)}
                  className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors ${
                    accSim
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                      : 'bg-[#050c22] border-blue-500/20 text-blue-300/60'
                  }`}
                >
                  {accSim ? <CheckSquare className="w-3 h-3 text-emerald-400" /> : <Square className="w-3 h-3" />}
                  <span>SIM Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccBackCover(!accBackCover)}
                  className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors ${
                    accBackCover
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                      : 'bg-[#050c22] border-blue-500/20 text-blue-300/60'
                  }`}
                >
                  {accBackCover ? <CheckSquare className="w-3 h-3 text-emerald-400" /> : <Square className="w-3 h-3" />}
                  <span>Back Cover</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccBattery(!accBattery)}
                  className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors ${
                    accBattery
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                      : 'bg-[#050c22] border-blue-500/20 text-blue-300/60'
                  }`}
                >
                  {accBattery ? <CheckSquare className="w-3 h-3 text-emerald-400" /> : <Square className="w-3 h-3" />}
                  <span>Battery</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Other accessories (e.g. Memory card, Cable, Charger)..."
                value={accOther}
                onChange={(e) => setAccOther(e.target.value)}
                className="w-full mt-1.5 bg-[#050c22] border border-blue-500/20 rounded-lg px-2.5 py-1 text-[11px] text-blue-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: SEARCHABLE CATEGORIZED FAULTS & DIAGNOSTICS (Cols 5-8) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="bg-[#0a1538] border border-blue-500/25 rounded-xl p-3 flex flex-col gap-2 shadow-lg flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-purple-400" />
                3. Reported Faults & Diagnostics
              </span>
              <span className="text-[10px] font-mono-jb px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 font-bold">
                {selectedIssues.length} Selected
              </span>
            </div>

            {/* Selected Issues Tag Cloud */}
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-[#050c22] rounded-lg border border-blue-500/20">
              {selectedIssues.length === 0 ? (
                <span className="text-[10px] text-blue-300/50 italic px-1">
                  No faults selected. Search or pick below.
                </span>
              ) : (
                selectedIssues.map((iss) => (
                  <span
                    key={iss}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600/30 text-purple-200 border border-purple-400/40"
                  >
                    <span className="truncate max-w-[150px]">{iss}</span>
                    <button
                      type="button"
                      onClick={() => removeIssue(iss)}
                      className="hover:text-rose-300 p-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Dynamic Searchable Select / Combobox Input */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-purple-400/70 absolute left-2.5 pointer-events-none" />
                <input
                  ref={faultInputRef}
                  type="text"
                  value={faultSearchTerm}
                  onFocus={() => setIsFaultDropdownOpen(true)}
                  onChange={(e) => {
                    setFaultSearchTerm(e.target.value);
                    setIsFaultDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomFault();
                    }
                  }}
                  placeholder="Filter faults by typing (e.g. screen, battery, water)..."
                  className="w-full bg-[#050c22] border border-purple-500/30 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white outline-none focus:border-purple-400 font-mono-jb placeholder:text-blue-200/40"
                />
                <button
                  type="button"
                  onClick={() => setIsFaultDropdownOpen(!isFaultDropdownOpen)}
                  className="absolute right-2 text-purple-300/70 hover:text-white"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Category Filter Pills */}
              <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-1 text-[9px] font-mono-jb">
                {['All', 'Hardware', 'Power', 'Display', 'Water', 'Audio', 'Camera', 'Software'].map((catLabel) => {
                  const fullCatName =
                    catLabel === 'Hardware'
                      ? 'Common Hardware Repairs'
                      : catLabel === 'Power'
                      ? 'Power & Charging Issues'
                      : catLabel === 'Display'
                      ? 'Display & Touch Issues'
                      : catLabel === 'Water'
                      ? 'Water & Liquid Damage'
                      : catLabel === 'Audio'
                      ? 'Audio & Call Issues'
                      : catLabel === 'Camera'
                      ? 'Camera Faults'
                      : catLabel === 'Software'
                      ? 'Software & OS Issues'
                      : 'All';

                  const isActive = activeCategoryFilter === fullCatName;

                  return (
                    <button
                      key={catLabel}
                      type="button"
                      onClick={() => setActiveCategoryFilter(fullCatName)}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-[#050c22] border border-blue-500/20 text-blue-200/60 hover:text-white'
                      }`}
                    >
                      {catLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorized Predefined Faults Dropdown List */}
            <div
              ref={faultDropdownRef}
              className="flex-1 min-h-0 bg-[#050c22] border border-purple-500/25 rounded-lg p-1.5 overflow-y-auto space-y-2 max-h-48"
            >
              {faultSearchTerm.trim() && (
                <div className="p-1 border-b border-purple-500/20 mb-1">
                  <button
                    type="button"
                    onClick={handleAddCustomFault}
                    className="w-full py-1 px-2 bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/40 rounded text-[10px] font-bold text-purple-200 flex items-center justify-between cursor-pointer"
                  >
                    <span>+ Add &quot;{faultSearchTerm.trim()}&quot; as custom fault</span>
                    <Plus className="w-3 h-3 text-purple-300" />
                  </button>
                </div>
              )}

              {filteredCategories.length === 0 ? (
                <div className="p-3 text-center text-xs text-blue-200/50">
                  No predefined faults found. Press Enter or click &quot;+ Add&quot; above to add as custom fault.
                </div>
              ) : (
                filteredCategories.map((catGroup) => (
                  <div key={catGroup.category} className="space-y-1">
                    <div className="text-[9px] font-bold text-purple-300/80 uppercase tracking-wider px-1 flex items-center gap-1 bg-[#09153a] py-0.5 rounded">
                      <Tag className="w-2.5 h-2.5 text-purple-400" />
                      <span>{catGroup.category} ({catGroup.issues.length})</span>
                    </div>

                    <div className="grid grid-cols-1 gap-0.5">
                      {catGroup.issues.map((iss) => {
                        const isChecked = selectedIssues.includes(iss);
                        return (
                          <button
                            key={iss}
                            type="button"
                            onClick={() => toggleIssue(iss)}
                            onDoubleClick={() => {
                              if (!selectedIssues.includes(iss)) {
                                setSelectedIssues((prev) => [...prev, iss]);
                              }
                              setTimeout(() => {
                                customRemarksInputRef.current?.focus();
                                customRemarksInputRef.current?.select();
                              }, 50);
                            }}
                            title="Click to toggle, Double-click to select & type remarks"
                            className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono-jb transition-all flex items-center justify-between cursor-pointer ${
                              isChecked
                                ? 'bg-purple-600/35 border border-purple-400/50 text-white font-bold'
                                : 'hover:bg-purple-900/30 text-blue-100/80'
                            }`}
                          >
                            <span className="truncate">{iss}</span>
                            {isChecked && <Check className="w-3 h-3 text-purple-400 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Custom Fault / Other Problem */}
            <div>
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">
                Custom / Additional Fault Remarks
              </label>
              <input
                ref={customRemarksInputRef}
                type="text"
                placeholder="Specific customer remarks or fault notes..."
                value={otherProblem}
                onChange={(e) => setOtherProblem(e.target.value)}
                className="w-full bg-[#050c22] border border-blue-500/30 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 focus:shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all"
              />
            </div>

            {/* Internal Bench Technician Notes */}
            <div className="flex-1 min-h-0 flex flex-col">
              <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-0.5">
                Internal Bench Technician Notes
              </label>
              <textarea
                rows={2}
                placeholder="Pattern code, passcode lock, internal condition, bench remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full flex-1 bg-[#050c22] border border-blue-500/30 rounded-lg p-2 text-xs text-blue-100 outline-none focus:border-purple-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: COST ESTIMATION & LIVE DUE BALANCE (Cols 9-12) */}
        {/* (PRE-FITTED SPARE PARTS REMOVED - SIZING EXPANDED TO UTILIZE FREED SPACE) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="bg-[#0a1538] border-2 border-emerald-500/40 rounded-xl p-3.5 flex flex-col gap-3 shadow-2xl flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-emerald-500/25 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                4. Cost Estimation & Live Due Balance
              </span>
              <span className="text-[10px] font-mono-jb text-emerald-300/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                LKR Currency
              </span>
            </div>

            {/* Charge Inputs */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-1">
                  Repair Labor Charge (LKR) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2500"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400 text-right font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200/70 font-bold block mb-1">
                  Advance Collected (LKR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-sm font-bold text-cyan-300 outline-none focus:border-cyan-400 text-right font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Advance Presets */}
            <div>
              <span className="text-[9px] uppercase tracking-wider text-blue-300/60 font-bold block mb-1">
                Quick Advance Presets
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAdvancePaid(0)}
                  className="py-1 px-2 bg-[#050c22] hover:bg-blue-600/20 border border-blue-500/20 rounded-lg text-blue-200 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  No Advance (0)
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancePaid(Math.round(servicePriceNum * 0.5))}
                  className="py-1 px-2 bg-[#050c22] hover:bg-cyan-600/20 border border-blue-500/20 rounded-lg text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  50% Advance
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancePaid(servicePriceNum)}
                  className="py-1 px-2 bg-[#050c22] hover:bg-emerald-600/20 border border-blue-500/20 rounded-lg text-emerald-300 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Full Advance (100%)
                </button>
              </div>
            </div>

            {/* Expected Delivery Date & Time Picker */}
            <div className="bg-[#050c22] p-3 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Expected Delivery Schedule
                </span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Customer Promise
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] uppercase text-blue-200/70 font-bold block mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full bg-[#081335] border border-blue-500/30 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase text-blue-200/70 font-bold block mb-1">
                    Target Time *
                  </label>
                  <input
                    type="time"
                    value={expectedDeliveryTime}
                    onChange={(e) => setExpectedDeliveryTime(e.target.value)}
                    className="w-full bg-[#081335] border border-blue-500/30 rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Quick Delivery Presets */}
              <div className="flex items-center gap-1 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setExpectedDeliveryDate(today);
                    setExpectedDeliveryTime('18:00');
                  }}
                  className="px-2 py-0.5 bg-[#081335] hover:bg-blue-600/30 border border-blue-500/20 rounded text-blue-200 hover:text-white transition-colors cursor-pointer"
                >
                  Today Eve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setExpectedDeliveryDate(d.toISOString().split('T')[0]);
                    setExpectedDeliveryTime('17:00');
                  }}
                  className="px-2 py-0.5 bg-[#081335] hover:bg-cyan-600/30 border border-blue-500/20 rounded text-cyan-300 hover:text-white transition-colors cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 2);
                    setExpectedDeliveryDate(d.toISOString().split('T')[0]);
                    setExpectedDeliveryTime('17:00');
                  }}
                  className="px-2 py-0.5 bg-[#081335] hover:bg-purple-600/30 border border-blue-500/20 rounded text-purple-200 hover:text-white transition-colors cursor-pointer"
                >
                  +2 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setExpectedDeliveryDate(d.toISOString().split('T')[0]);
                    setExpectedDeliveryTime('17:00');
                  }}
                  className="px-2 py-0.5 bg-[#081335] hover:bg-emerald-600/30 border border-blue-500/20 rounded text-emerald-300 hover:text-white transition-colors cursor-pointer"
                >
                  +3 Days
                </button>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-[#050c22] p-3 rounded-xl border border-blue-500/20 space-y-2 text-xs font-mono-jb">
              <div className="flex items-center justify-between text-blue-200/70">
                <span>Estimated Service Charge:</span>
                <span className="font-bold text-white">LKR {servicePriceNum.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-cyan-300">
                <span>Advance Deposit Collected:</span>
                <span className="font-bold">LKR {advanceNum.toLocaleString()}</span>
              </div>
              <div className="border-t border-blue-500/20 pt-1.5 flex items-center justify-between text-slate-300">
                <span>Settlement on Delivery:</span>
                <span className="font-bold text-amber-300">LKR {balanceDue.toLocaleString()}</span>
              </div>
            </div>

            {/* Prominent Glowing Net Balance Due Display */}
            <div className="bg-gradient-to-r from-[#05112f] via-[#091a45] to-[#05112f] border-2 border-emerald-500/50 rounded-2xl p-3.5 flex items-center justify-between shadow-xl shadow-emerald-950/40">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-black block">
                  Net Balance Due on Delivery
                </span>
                <span className="text-xs text-blue-200/60 font-mono">
                  Charge: {servicePriceNum.toLocaleString()} - Adv: {advanceNum.toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                  LKR {balanceDue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Technician Allocation & Service Terms Notice */}
            <div className="mt-auto bg-[#060e28] p-2.5 rounded-xl border border-blue-500/20 text-[10px] text-blue-200/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Assigned to: <strong className="text-white">{technicianName}</strong></span>
              </div>
              <span className="text-emerald-400 font-bold">Standard Warranty Slip</span>
            </div>
          </div>
        </div>
      </form>

      {/* 3. ACTION FOOTER BAR (Single View - Always in Viewport) */}
      <div className="h-12 shrink-0 bg-[#0a1538] border border-blue-500/30 rounded-xl px-4 flex items-center justify-between shadow-xl">
        <div className="text-[11px] text-blue-200/50 hidden sm:flex items-center gap-4">
          <span>Shortcuts:</span>
          <span className="bg-[#050c22] px-2 py-0.5 rounded text-blue-300 font-mono">Esc: Close</span>
          <span className="bg-[#050c22] px-2 py-0.5 rounded text-blue-300 font-mono">Ctrl+Enter: Save</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-blue-500/30 text-blue-200 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-oswald text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer ring-2 ring-emerald-400 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{submitting ? 'Creating Job...' : `Save & Issue Job Card (${nextJobNumber})`}</span>
          </button>
        </div>
      </div>

      {/* Returning Customer History Popup */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0a1538] border border-amber-500/50 rounded-2xl max-w-lg w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Customer Repair History ({customerHistory.length} Jobs)</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-blue-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {customerHistory.map((h) => (
                <div key={h.id} className="p-2.5 bg-[#050c22] rounded-xl border border-blue-500/20 flex justify-between">
                  <div>
                    <div className="font-bold text-white">{h.jobNumber} &bull; {h.deviceBrand} {h.deviceModel}</div>
                    <div className="text-blue-200/70 text-[11px]">{h.problems}</div>
                    <div className="text-blue-200/50 text-[10px]">{h.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300">{h.status}</span>
                    <div className="font-bold text-emerald-400 mt-1">LKR {h.estimatedPrice}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
