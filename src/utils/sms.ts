import { RepairJob } from '../types.ts';
import { parseJobIssues, formatWhatsAppPhone, getStoredShopName } from './whatsapp.ts';

export function generateReceivedSMS(job: RepairJob, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const issues = parseJobIssues(job);
  const price = job.estimatedPrice > 0 ? `${job.estimatedPrice}` : 'To be confirmed';

  return `[${activeShop}] We received your ${device}. Job ID: ${job.jobNumber}. Issue: ${issues}. Est price: Rs.${price}. Thank you.`;
}

export function generateInitialIntakeReceiptSMS(job: RepairJob, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const adv = job.advancePaid > 0 ? ` Adv: LKR ${job.advancePaid}.` : '';
  const del = job.expectedDeliveryDate ? ` Delivery: ${job.expectedDeliveryDate}${job.expectedDeliveryTime ? ` ${job.expectedDeliveryTime}` : ''}.` : '';
  return `[${activeShop}] Job #${job.jobNumber} Confirmed! Device: ${device}. Est: LKR ${job.estimatedPrice}.${adv}${del} We will notify you once ready for pickup. Thank you!`;
}

export function generateReadySMS(job: RepairJob, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const balance = Math.max(0, job.estimatedPrice - job.advancePaid);

  return `[${activeShop}] Your ${device} is ready to collect! Job ID: ${job.jobNumber}. Balance to pay: Rs.${balance}. Thank you.`;
}

export function generateJobOrderSMS(
  job: RepairJob,
  shopName?: string,
  calc?: { totalAmount: number; totalPaid: number; balance: number }
): string {
  const activeShop = shopName || getStoredShopName();
  const device = `${job.deviceBrand} ${job.deviceModel}`.trim();
  const parts = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
  const total = calc ? calc.totalAmount : job.estimatedPrice + parts;
  const paid = calc ? calc.totalPaid : job.advancePaid;
  const balance = calc ? calc.balance : Math.max(0, total - paid);

  return `Dear ${job.customerName},

Your repair at ${shopName} is ready.

Job No: ${job.jobNumber}
Device: ${device}
Total Amount: LKR ${total.toLocaleString()}
Paid: LKR ${paid.toLocaleString()}
Balance: LKR ${balance.toLocaleString()}

Thank you for choosing ${activeShop}.`;
}

export function generateThankYouSMS(customerName: string, shopName?: string): string {
  const activeShop = shopName || getStoredShopName();
  return `Dear ${customerName},

Thank you for choosing ${activeShop} for your phone repair.

We truly appreciate your trust and support.

If you need any help with your phone in the future, please feel free to contact us.

Please keep in touch with ${activeShop}.

Thank you ❤️

${shopName}
Akkaraipattu
Your Trusted Mobile Phone Service Partner`;
}

export function openCarrierSMS(phoneNumber: string, text: string, defaultCountryCode: string = '+94'): void {
  const formattedPhone = formatWhatsAppPhone(phoneNumber, defaultCountryCode);
  const encodedText = encodeURIComponent(text);

  // Works on Android, iOS, and Windows (via Windows Phone Link / default SMS client)
  // Standard format is sms:<number>?body=<text> (or &body for iOS fallback)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const smsUrl = `sms:${formattedPhone}${separator}body=${encodedText}`;

  const link = document.createElement('a');
  link.href = smsUrl;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
