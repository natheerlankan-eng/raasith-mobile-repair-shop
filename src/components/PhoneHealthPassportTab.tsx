import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Wrench,
  Clock,
  History,
  MessageCircle,
  Copy,
  Check,
  Save,
  HelpCircle,
  UserCheck,
  FileText,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { RepairJob, SparePart, PhoneHealthPassportData, QualityCheckItem, QualityCheckStatus } from '../types.ts';
import {
  formatWhatsAppPhone,
  generateHealthPassportWhatsApp,
  openWhatsAppMessage,
  parseJobIssues
} from '../utils/whatsapp.ts';
import { useShop } from '../context/ShopContext.tsx';

interface PhoneHealthPassportTabProps {
  job: RepairJob;
  token: string | null;
  shopName?: string;
  countryCode?: string;
  onJobUpdated?: (updated: RepairJob) => void;
}

const DEFAULT_CHECKS_TEMPLATE: QualityCheckItem[] = [
  { id: 'charging', name: 'Charging & Battery', status: 'PASS', notes: 'Charging at standard 5V/9V rate, battery stable' },
  { id: 'touch_display', name: 'Touchscreen & Display', status: 'PASS', notes: 'Multi-touch calibrated, uniform luminance, no dead pixels' },
  { id: 'audio_mic', name: 'Audio & Mic', status: 'PASS', notes: 'Earpiece speaker, loudspeaker & secondary mic verified' },
  { id: 'cameras', name: 'Cameras', status: 'PASS', notes: 'Autofocus locked, front/rear sensors clear, LED flash operational' },
  { id: 'network_wifi', name: 'Network & Wi-Fi', status: 'PASS', notes: '4G/5G signal registered, Wi-Fi 2.4/5GHz and Bluetooth paired' },
];

export const PhoneHealthPassportTab: React.FC<PhoneHealthPassportTabProps> = ({
  job,
  token,
  shopName = 'Raasith Mobile',
  countryCode = '+94',
  onJobUpdated,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';

  // Parse initial passport from job.healthPassport
  const initialPassport: PhoneHealthPassportData = useMemo(() => {
    if (job.healthPassport) {
      try {
        const parsed = JSON.parse(job.healthPassport);
        return parsed || {};
      } catch {
        // ignore
      }
    }
    return {};
  }, [job.healthPassport]);

  // Parse spare parts from job
  const sparePartsList: SparePart[] = useMemo(() => {
    if (job.spareParts) {
      try {
        const p = JSON.parse(job.spareParts);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [job.spareParts]);

  const defaultPartsText = sparePartsList.length > 0
    ? sparePartsList.map((p) => `${p.name}${p.qty > 1 ? ` (x${p.qty})` : ''}`).join(', ')
    : 'None';

  // Form states
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState<string>(
    initialPassport.technicalDiagnosis || job.notes || 'Hardware component diagnostic confirmed fault; circuit and interface tested.'
  );
  const [workCompleted, setWorkCompleted] = useState<string>(
    initialPassport.workCompleted || (
      sparePartsList.length > 0
        ? `Replaced defective hardware component (${defaultPartsText}) & completed precision bench re-assembly.`
        : 'Component repair, hardware servicing & operational recalibration completed.'
    )
  );
  const [partsReplacedText, setPartsReplacedText] = useState<string>(
    initialPassport.partsReplacedText || defaultPartsText
  );

  // Quality checks state
  const [qualityChecks, setQualityChecks] = useState<QualityCheckItem[]>(() => {
    if (initialPassport.qualityChecks && initialPassport.qualityChecks.length > 0) {
      return initialPassport.qualityChecks;
    }
    return DEFAULT_CHECKS_TEMPLATE;
  });

  // Warranty states
  const [warrantyPeriod, setWarrantyPeriod] = useState<string>(
    initialPassport.warrantyPeriod || '30 Days Warranty'
  );
  const [coveredComponents, setCoveredComponents] = useState<string>(
    initialPassport.coveredComponents || 'Replaced display & workmanship'
  );
  const [warrantyExclusions, setWarrantyExclusions] = useState<string>(
    initialPassport.warrantyExclusions || 'Physical damage, screen cracks, or water exposure.'
  );
  const [supportInstructions, setSupportInstructions] = useState<string>(
    initialPassport.supportInstructions || `Present this digital passport or Job ID ${job.jobNumber} at ${shopName}.`
  );

  // Customer consent
  const [consentLogged, setConsentLogged] = useState<boolean>(
    initialPassport.consentLogged !== undefined ? initialPassport.consentLogged : true
  );

  // Customer history state
  const [historyJobs, setHistoryJobs] = useState<RepairJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [savingPassport, setSavingPassport] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Fetch customer history for this customer / phone / IMEI
  useEffect(() => {
    if (!token || !job.phoneNumber) return;
    setLoadingHistory(true);
    fetch(`/api/customers/history/${encodeURIComponent(job.phoneNumber.trim())}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter out current job from previous history, but record total
          setHistoryJobs(data);
        }
      })
      .catch((err) => console.error('Failed to load passport customer history:', err))
      .finally(() => setLoadingHistory(false));
  }, [token, job.phoneNumber]);

  // Previous repairs count (excluding this job ID if present)
  const previousJobs = historyJobs.filter((j) => j.id !== job.id);
  const historyCount = previousJobs.length;
  const lastServiceDate = previousJobs.length > 0
    ? previousJobs[0].date
    : job.date || 'Initial Service Record';

  // Toggle check status
  const handleCheckStatusChange = (id: string, newStatus: QualityCheckStatus) => {
    setQualityChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
  };

  const handlePassAllChecks = () => {
    setQualityChecks((prev) => prev.map((c) => ({ ...c, status: 'PASS' })));
  };

  // Construct current passport data object
  const currentPassportData: PhoneHealthPassportData = useMemo(() => ({
    technicalDiagnosis,
    workCompleted,
    partsReplacedText,
    qualityChecks,
    warrantyPeriod,
    coveredComponents,
    warrantyExclusions,
    supportInstructions,
    consentLogged,
    updatedAt: new Date().toISOString(),
  }), [
    technicalDiagnosis,
    workCompleted,
    partsReplacedText,
    qualityChecks,
    warrantyPeriod,
    coveredComponents,
    warrantyExclusions,
    supportInstructions,
    consentLogged,
  ]);

  // Generate live WhatsApp message
  const generatedWhatsAppText = useMemo(() => {
    return generateHealthPassportWhatsApp(job, shopName, {
      historyCount,
      lastServiceDate,
      passportData: currentPassportData,
    });
  }, [job, shopName, historyCount, lastServiceDate, currentPassportData]);

  // Save passport to database
  const handleSavePassport = async () => {
    if (!token) return;
    setSavingPassport(true);
    setSaveSuccessNotice(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/passport`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          healthPassport: currentPassportData,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (onJobUpdated) onJobUpdated(updated);
        setSaveSuccessNotice('Phone Health Passport saved successfully!');
        setTimeout(() => setSaveSuccessNotice(null), 3500);
      } else {
        throw new Error('Failed to save passport');
      }
    } catch (err) {
      console.error(err);
      setSaveSuccessNotice('Failed to save Phone Health Passport. Please try again.');
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } finally {
      setSavingPassport(false);
    }
  };

  // Send WhatsApp action
  const handleSendWhatsApp = () => {
    const formattedPhone = formatWhatsAppPhone(job.phoneNumber, countryCode);
    openWhatsAppMessage(formattedPhone, generatedWhatsAppText);
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedWhatsAppText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const reportedFault = parseJobIssues(job) || 'General Hardware Fault';
  const allPassed = qualityChecks.every((c) => c.status === 'PASS' || c.status === 'OK');

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner: Passport Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  Phone Health Passport
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-jb font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Digital Record
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono-jb">
                <span>Job #{job.jobNumber}</span>
                <span>&bull;</span>
                <span>{job.deviceBrand} {job.deviceModel}</span>
                {job.imei && (
                  <>
                    <span>&bull;</span>
                    <span>IMEI: {job.imei}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all font-mono-jb"
              title="Directly send this Health Passport via WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors font-mono-jb"
            >
              {copiedNotice ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedNotice ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleSavePassport}
              disabled={savingPassport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 font-mono-jb"
            >
              <Save className="w-4 h-4" />
              <span>{savingPassport ? 'Saving...' : 'Save Passport'}</span>
            </button>
          </div>
        </div>

        {saveSuccessNotice && (
          <div className="mt-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-mono-jb flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}
      </div>

      {/* Grid: 1. Repair Summary & 2. Post-Repair Quality Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. REPAIR SUMMARY */}
        <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[rgba(248,247,244,0.1)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-oswald text-xs uppercase tracking-wider font-bold text-white">
                  1. Repair Summary
                </h4>
                <span className="text-[10px] text-slate-400">Diagnosis, work & parts record</span>
              </div>
            </div>
            <span className="text-[11px] font-mono-jb text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              {job.deviceBrand} {job.deviceModel}
            </span>
          </div>

          <div className="space-y-3.5 text-xs font-mono-jb">
            {/* Reported Fault */}
            <div className="bg-[#111113] p-3 rounded-xl border border-[rgba(248,247,244,0.06)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                • Reported Fault (Intake Complaint)
              </span>
              <p className="text-sm font-semibold text-white">{reportedFault}</p>
            </div>

            {/* Technical Diagnosis */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  • Technical Diagnosis:
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTechnicalDiagnosis('Display panel damaged; internal LCD shattered; touch digitizer unresponsive.')}
                    className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    +Display
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechnicalDiagnosis('Charging sub-board ribbon flex damaged; cold solder pin micro-fracture.')}
                    className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    +Charging
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechnicalDiagnosis('Battery cell degradation below nominal threshold, high internal resistance.')}
                    className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    +Battery
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                value={technicalDiagnosis}
                onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                className="w-full bg-[#111113] text-white p-2.5 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-indigo-500 focus:outline-hidden text-xs resize-none"
                placeholder="Enter technical diagnosis findings..."
              />
            </div>

            {/* Work Completed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  • Work Completed:
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setWorkCompleted('Disassembled handset, fitted high-grade OEM panel with sealed gasket, tested touch.')}
                    className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    +Fitted Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkCompleted('Replaced charging port assembly, cleaned microphone channel & tested fast charge.')}
                    className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    +Port Serviced
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                className="w-full bg-[#111113] text-white p-2.5 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-indigo-500 focus:outline-hidden text-xs resize-none"
                placeholder="Describe work completed by technician..."
              />
            </div>

            {/* Parts Replaced */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  • Parts Replaced:
                </label>
                {sparePartsList.length > 0 && (
                  <span className="text-[10px] text-amber-400">
                    {sparePartsList.length} spare parts logged
                  </span>
                )}
              </div>
              <input
                type="text"
                value={partsReplacedText}
                onChange={(e) => setPartsReplacedText(e.target.value)}
                className="w-full bg-[#111113] text-white px-3 py-2 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-indigo-500 focus:outline-hidden text-xs"
                placeholder="e.g. Original Display Assembly, OEM Battery (or None)"
              />
            </div>
          </div>
        </div>

        {/* 2. POST-REPAIR QUALITY TEST RESULTS */}
        <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[rgba(248,247,244,0.1)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-oswald text-xs uppercase tracking-wider font-bold text-white">
                  2. Post-Repair Quality Checks
                </h4>
                <span className="text-[10px] text-slate-400">Interactive hardware quality audit</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePassAllChecks}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-mono-jb font-bold cursor-pointer transition-colors"
            >
              ✓ Pass All
            </button>
          </div>

          <div className="space-y-2.5 font-mono-jb text-xs">
            {qualityChecks.map((check) => {
              const isPass = check.status === 'PASS';
              const isOk = check.status === 'OK';
              const isFail = check.status === 'FAIL';

              return (
                <div
                  key={check.id}
                  className="bg-[#111113] p-3 rounded-xl border border-[rgba(248,247,244,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{check.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider ${
                          isPass || isOk
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isFail
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    {check.notes && (
                      <p className="text-[10px] text-slate-400 line-clamp-1">{check.notes}</p>
                    )}
                  </div>

                  {/* Toggle buttons */}
                  <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCheckStatusChange(check.id, 'PASS')}
                      className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer transition-all ${
                        isPass
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      PASS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckStatusChange(check.id, 'OK')}
                      className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer transition-all ${
                        isOk
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckStatusChange(check.id, 'FAIL')}
                      className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer transition-all ${
                        isFail
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      FAIL
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Overall Quality Status:</span>
              </span>
              <strong className={allPassed ? 'text-emerald-400' : 'text-amber-400'}>
                {allPassed ? '✓ 100% Quality Bench Passed' : '⚠️ Quality Warnings Logged'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 3. Warranty Record & 4. Future Repair History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 3. WARRANTY RECORD */}
        <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[rgba(248,247,244,0.1)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-oswald text-xs uppercase tracking-wider font-bold text-white">
                  3. Warranty Record
                </h4>
                <span className="text-[10px] text-slate-400">Protection term, coverage & claim rules</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {['30 Days Warranty', '60 Days Warranty', '90 Days Warranty'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setWarrantyPeriod(term)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono-jb font-bold cursor-pointer transition-colors ${
                    warrantyPeriod === term
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {term.split(' ')[0]}D
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 font-mono-jb text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                • Warranty Period:
              </label>
              <input
                type="text"
                value={warrantyPeriod}
                onChange={(e) => setWarrantyPeriod(e.target.value)}
                className="w-full bg-[#111113] text-white px-3 py-2 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-amber-500 focus:outline-hidden text-xs"
                placeholder="e.g. 30 Days Warranty / 90 Days Warranty"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                • Covered Components & Work:
              </label>
              <input
                type="text"
                value={coveredComponents}
                onChange={(e) => setCoveredComponents(e.target.value)}
                className="w-full bg-[#111113] text-white px-3 py-2 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-amber-500 focus:outline-hidden text-xs"
                placeholder="e.g. Replaced display & workmanship"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                • Exclusions (Strict):
              </label>
              <input
                type="text"
                value={warrantyExclusions}
                onChange={(e) => setWarrantyExclusions(e.target.value)}
                className="w-full bg-[#111113] text-white px-3 py-2 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-amber-500 focus:outline-hidden text-xs"
                placeholder="e.g. Physical damage, screen cracks, or water exposure."
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                • Support Claim Instructions:
              </label>
              <input
                type="text"
                value={supportInstructions}
                onChange={(e) => setSupportInstructions(e.target.value)}
                className="w-full bg-[#111113] text-white px-3 py-2 rounded-xl border border-[rgba(248,247,244,0.15)] focus:border-amber-500 focus:outline-hidden text-xs"
                placeholder={`e.g. Present this digital passport or Job ID at ${activeShopName}.`}
              />
            </div>
          </div>
        </div>

        {/* 4. REPAIR HISTORY & CONSENT */}
        <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[rgba(248,247,244,0.1)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-oswald text-xs uppercase tracking-wider font-bold text-white">
                  4. Future Repair History
                </h4>
                <span className="text-[10px] text-slate-400">Previous service records & customer consent</span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-mono-jb text-[10px] bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                checked={consentLogged}
                onChange={(e) => setConsentLogged(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span className={consentLogged ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                Consent Logged: {consentLogged ? 'YES' : 'NO'}
              </span>
            </label>
          </div>

          <div className="space-y-3 font-mono-jb text-xs">
            <div className="grid grid-cols-2 gap-2 bg-[#111113] p-3 rounded-xl border border-[rgba(248,247,244,0.06)]">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Total Previous Services</span>
                <span className="text-base font-bold text-white">{historyCount} Records</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Last Service Date</span>
                <span className="text-sm font-semibold text-purple-300">{lastServiceDate}</span>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Loading customer service ledger...
              </div>
            ) : previousJobs.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-[#111113] border border-[rgba(248,247,244,0.06)] text-slate-400 text-xs">
                No previous repair records found for this phone number ({job.phoneNumber}). This is the inaugural service passport entry.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-800/80">
                {previousJobs.map((hJob) => (
                  <div key={hJob.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-indigo-300">{hJob.jobNumber}</strong>
                        <span className="text-slate-400 text-[10px]">{hJob.date}</span>
                      </div>
                      <p className="text-slate-300 text-[10px] truncate max-w-[220px]">
                        {hJob.deviceBrand} {hJob.deviceModel} &bull; {parseJobIssues(hJob)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300">
                        {hJob.status}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        Rs. {(hJob.estimatedPrice + (hJob.sparePartsAmount ?? 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. LIVE WHATSAPP PASSPORT MESSAGE PREVIEW */}
      <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[rgba(248,247,244,0.1)] shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-oswald text-xs uppercase tracking-wider font-bold text-white">
                Live WhatsApp Passport Message Preview
              </h4>
              <span className="text-[10px] text-slate-400">
                Formatted for customer: {job.customerName} ({job.phoneNumber})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono-jb font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono-jb font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send WhatsApp Now</span>
            </button>
          </div>
        </div>

        {/* WhatsApp Chat Preview Bubble */}
        <div className="bg-[#0b141a] p-4 sm:p-5 rounded-2xl border border-emerald-950/60 font-mono-jb text-xs text-emerald-100 shadow-inner">
          <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] text-slate-100 whitespace-pre-wrap leading-relaxed shadow-md">
            {generatedWhatsAppText}
          </div>
        </div>
      </div>
    </div>
  );
};
