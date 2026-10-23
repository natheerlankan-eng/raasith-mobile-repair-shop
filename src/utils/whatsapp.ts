import { RepairJob } from '../types.ts';

export function formatWhatsAppPhone(phoneNumber: string, defaultCountryCode: string = '+94'): string {
  if (!phoneNumber) return '';

  // Clean country code: extract only digits
  const cleanCountryCode = defaultCountryCode.replace(/\D/g, '') || '94';

  // Remove non-digit characters except leading plus
  let cleaned = phoneNumber.trim();

  // If starts with +, strip all non-digits
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/\D/g, '');
  }

  // Strip all non-digits
  const digitsOnly = cleaned.replace(/\D/g, '');

  // If starts with leading 0 (e.g. 0771234567), remove leading 0 and prepend country code
  if (digitsOnly.startsWith('0')) {
    return `${cleanCountryCode}${digitsOnly.slice(1)}`;
  }

  // If already starts with the country code digits (e.g. 94771234567)
  if (digitsOnly.startsWith(cleanCountryCode) && digitsOnly.length > cleanCountryCode.length + 6) {
    return digitsOnly;
  }

  // Otherwise, prepend country code
  return `${cleanCountryCode}${digitsOnly}`;
}

export function parseJobIssues(job: RepairJob): string {
  try {
    const list: string[] = JSON.parse(job.problems || '[]');
    const items = [...list];
    if (job.otherProblem && job.otherProblem.trim()) {
      // If "Other" is in list, replace or augment it
      const filtered = items.filter(i => i.toLowerCase() !== 'other');
      filtered.push(job.otherProblem.trim());
      return filtered.join(', ');
    }
    return items.join(', ');
  } catch {
    return job.problems || 'General Issue';
  }
}

export function getStoredShopName(fallback: string = 'Raasith Mobile'): string {
  try {
    const raw = localStorage.getItem('raasith_shop_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.shopName?.trim()) return p.shopName.trim();
    }
  } catch {}
  return fallback;
}

export function getStoredBranch(fallback: string = 'Akkaraipattu'): string {
  try {
    const raw = localStorage.getItem('raasith_shop_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.branch?.trim()) return p.branch.trim();
      if (p.address?.trim()) return p.address.trim();
    }
  } catch {}
  return fallback;
}

export function generateReceivedMessage(job: RepairJob, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const issues = parseJobIssues(job);
  const price = job.estimatedPrice > 0 ? `${job.estimatedPrice}` : 'To be confirmed';

  return `Hello ${job.customerName}, we received your ${device} at ${activeShop}. Job ID: ${job.jobNumber}. Issue: ${issues}. Estimated price: ${price}. We will update you soon. Thank you.`;
}

export function generateInitialIntakeReceiptWhatsApp(
  job: RepairJob,
  shopName?: string
): string {
  const activeShop = shopName || getStoredShopName();
  const activeBranch = getStoredBranch();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const issues = parseJobIssues(job);
  const estimate =
    job.estimatedPrice > 0
      ? `LKR ${job.estimatedPrice.toLocaleString()}`
      : 'Pending technical bench diagnosis';
  const advance =
    job.advancePaid > 0
      ? `LKR ${job.advancePaid.toLocaleString()}`
      : 'LKR 0 (No advance deposited)';

  return `📱 *REPAIR JOB INTAKE & ADVANCE CONFIRMATION* - ${activeShop.toUpperCase()} 📱
-----------------------------------------------
Dear ${job.customerName},

Your device has been received and booked for repair:

• *Job Slip No:* ${job.jobNumber}
• *Device:* ${device}
• *Reported Fault:* ${issues}
• *Estimated Labor Charge:* ${estimate}
• *Advance Deposit Paid:* ${advance}
• *Intake Date:* ${job.date}
${(job.expectedDeliveryDate || job.expectedDeliveryTime) ? `• *Expected Delivery:* ${job.expectedDeliveryDate || ''}${job.expectedDeliveryTime ? ` at ${job.expectedDeliveryTime}` : ''}\n` : ''}
Our technician will examine your device on the bench. You will receive an instant notification when your phone is ready for collection at our counter.

Thank you for choosing ${activeShop}!
${activeBranch}`;
}

export function generateReadyMessage(job: RepairJob, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const balance = Math.max(0, job.estimatedPrice - job.advancePaid);

  return `Hello ${job.customerName}, your ${device} is ready to collect at ${activeShop}. Job ID: ${job.jobNumber}. Balance to pay: ${balance}. Thank you.`;
}

export function generateJobOrderWhatsApp(
  job: RepairJob,
  shopName?: string,
  calc?: { totalAmount: number; advancePaid: number; totalPaid: number; balance: number }
): string {
  const activeShop = shopName || getStoredShopName();
  const activeBranch = getStoredBranch();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const parts = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
  const total = calc ? calc.totalAmount : job.estimatedPrice + parts;
  const advance = calc ? calc.advancePaid : job.advancePaid;
  const paid = calc ? calc.totalPaid : job.advancePaid;
  const balance = calc ? calc.balance : Math.max(0, total - paid);

  return `Dear ${job.customerName},

Your repair at ${activeShop} is ready.

Job No: ${job.jobNumber}
Device: ${device}

Total Amount: LKR ${total.toLocaleString()}
Advance Paid: LKR ${advance.toLocaleString()}
Total Paid: LKR ${paid.toLocaleString()}
Balance to Pay: LKR ${balance.toLocaleString()}

Thank you for choosing ${activeShop}.

Please keep this message for your records.

${activeShop}
${activeBranch}`;
}

export function generateThankYouWhatsApp(customerName: string, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  const activeBranch = getStoredBranch();
  return `Dear ${customerName},

Thank you for choosing ${activeShop} for your phone repair.

We truly appreciate your trust and support.

If you need any help with your phone in the future, please feel free to contact us.

Please keep in touch with ${activeShop}.

Thank you ❤️

${activeShop}
${activeBranch}
Your Trusted Mobile Phone Service Partner`;
}

export function openWhatsAppMessage(phoneFormatted: string, text: string): void {
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${phoneFormatted}?text=${encodedText}`;
  // Use anchor click rather than window.open to support popup blocker policies
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface HealthPassportMessageOptions {
  historyCount?: number;
  lastServiceDate?: string;
  passportData?: {
    technicalDiagnosis?: string;
    workCompleted?: string;
    partsReplacedText?: string;
    qualityChecks?: Array<{ id: string; name: string; status: string }>;
    warrantyPeriod?: string;
    coveredComponents?: string;
    warrantyExclusions?: string;
    supportInstructions?: string;
  };
}

export function generateHealthPassportWhatsApp(
  job: RepairJob,
  shopName?: string,
  options?: HealthPassportMessageOptions
): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const fault = parseJobIssues(job) || 'General Hardware Service';

  // Parse spare parts
  let partsListText = 'None';
  if (options?.passportData?.partsReplacedText?.trim()) {
    partsListText = options.passportData.partsReplacedText.trim();
  } else if (job.spareParts) {
    try {
      const parsed = JSON.parse(job.spareParts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        partsListText = parsed.map((p: any) => `${p.name || 'Component'}${p.qty > 1 ? ` (x${p.qty})` : ''}`).join(', ');
      }
    } catch {
      // ignore
    }
  }

  // Diagnosis
  const diagnosis = options?.passportData?.technicalDiagnosis?.trim() ||
    (job.notes?.trim()
      ? job.notes.trim()
      : 'Hardware component diagnostic confirmed fault; circuit and interface tested.');

  // Work Completed
  const workCompleted = options?.passportData?.workCompleted?.trim() ||
    (partsListText !== 'None'
      ? `Replaced defective hardware component (${partsListText}) & completed precision bench re-assembly.`
      : 'Component repair, hardware servicing & operational recalibration completed.');

  // Quality checks map
  const defaultChecks: Record<string, string> = {
    charging: 'PASS',
    touch_display: 'PASS',
    audio_mic: 'PASS',
    cameras: 'PASS',
  };

  if (options?.passportData?.qualityChecks && Array.isArray(options.passportData.qualityChecks)) {
    for (const qc of options.passportData.qualityChecks) {
      const id = qc.id.toLowerCase();
      const st = qc.status || 'PASS';
      if (id.includes('charg') || id.includes('batt')) defaultChecks.charging = st;
      else if (id.includes('touch') || id.includes('display') || id.includes('screen')) defaultChecks.touch_display = st;
      else if (id.includes('audio') || id.includes('mic') || id.includes('sound') || id.includes('speak')) defaultChecks.audio_mic = st;
      else if (id.includes('cam')) defaultChecks.cameras = st;
      else defaultChecks[id] = st;
    }
  }

  // Warranty details
  const warrantyPeriod = options?.passportData?.warrantyPeriod?.trim() || '30 Days Warranty';
  const covered = options?.passportData?.coveredComponents?.trim() || 'Replaced display & workmanship';
  const exclusions = options?.passportData?.warrantyExclusions?.trim() || 'Physical damage, screen cracks, or water exposure.';
  const support = options?.passportData?.supportInstructions?.trim() ||
    `Present this digital passport or Job ID ${job.jobNumber} at ${activeShop}.`;

  // History details
  const historyCount = options?.historyCount !== undefined ? options.historyCount : 0;
  const lastServiceDate = options?.lastServiceDate || job.date || 'Initial Service Record';

  return `📱 *PHONE HEALTH PASSPORT - ${activeShop.toUpperCase()}* 📱
-----------------------------------------------
*Job ID:* ${job.jobNumber}
*Customer:* ${job.customerName}
*Device:* ${device}

🔧 *1. REPAIR SUMMARY*
• *Reported Fault:* ${fault}
• *Diagnosis:* ${diagnosis}
• *Work Completed:* ${workCompleted}
• *Parts Replaced:* ${partsListText}

✅ *2. POST-REPAIR QUALITY TEST RESULTS*
• Charging & Battery: ${defaultChecks.charging}
• Touchscreen & Display: ${defaultChecks.touch_display}
• Audio & Mic: ${defaultChecks.audio_mic}
• Cameras: ${defaultChecks.cameras}

🛡️ *3. WARRANTY RECORD*
• *Warranty Period:* ${warrantyPeriod}
• *Covered Components:* ${covered}
• *Exclusions:* ${exclusions}
• *Support Claim:* ${support}

📜 *4. REPAIR HISTORY*
• Total Previous Services: ${historyCount}
• Last Service Date: ${lastServiceDate}

Thank you for choosing *${activeShop}*!`;
}

export function generateDeliveredAndThankYouCombinedWhatsApp(
  job: RepairJob,
  shopName?: string,
  options?: {
    historyCount?: number;
    lastServiceDate?: string;
    passportData?: any;
  }
): string {
  const activeShop = shopName || getStoredShopName();
  const passport = generateHealthPassportWhatsApp(job, activeShop, options);
  const thankYou = generateThankYouWhatsApp(job.customerName, activeShop);
  return `${passport}

-----------------------------------------------
🤝 *DELIVERY COMPLETE & THANK YOU* 🤝
-----------------------------------------------
${thankYou}`;
}

