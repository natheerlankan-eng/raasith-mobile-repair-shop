export type JobStatus =
  | 'Received'
  | 'In Repair'
  | 'Waiting for Parts'
  | 'Ready for Pickup'
  | 'Delivered'
  | 'Cancelled';

export interface AccessoriesInfo {
  sim: boolean;
  backCover: boolean;
  battery: boolean;
  other?: string;
}

export interface SparePart {
  id: string;
  name: string;
  cost: number;
  qty: number;
}

export interface RepairJob {
  id: number;
  jobNumber: string;
  date: string;
  customerName: string;
  phoneNumber: string;
  customerAddress?: string | null;
  deviceBrand: string;
  deviceModel: string;
  imei?: string | null;
  problems: string; // JSON array string
  otherProblem?: string | null;
  notes?: string | null;
  estimatedPrice: number;
  advancePaid: number;
  technicianName: string;
  status: JobStatus;
  receivedMsgSent: boolean;
  readyMsgSent: boolean;
  smsReceivedSent?: boolean;
  smsReadySent?: boolean;
  accessories?: string | null; // JSON string of AccessoriesInfo
  spareParts?: string | null; // JSON string of SparePart[]
  totalPartsCost?: number;
  sparePartsAmount?: number;
  dueAmount?: number;
  completedDate?: string | null;
  expectedDeliveryDate?: string | null;
  expectedDeliveryTime?: string | null;
  healthPassport?: string | null; // JSON string of PhoneHealthPassportData
  createdAt?: string;
  updatedAt?: string;
}

export type QualityCheckStatus = 'PASS' | 'OK' | 'FAIL' | 'NOT_TESTED';

export interface QualityCheckItem {
  id: string;
  name: string;
  status: QualityCheckStatus;
  notes?: string;
}

export interface PhoneHealthPassportData {
  technicalDiagnosis?: string;
  workCompleted?: string;
  partsReplacedText?: string;
  qualityChecks?: QualityCheckItem[];
  warrantyPeriod?: string; // e.g. "30 Days Warranty", "90 Days Warranty"
  coveredComponents?: string; // e.g. "Replaced display & workmanship"
  warrantyExclusions?: string; // e.g. "Physical damage, screen cracks, or water exposure."
  supportInstructions?: string; // e.g. "Present this digital passport or Job ID at Raasith Mobile."
  consentLogged?: boolean;
  updatedAt?: string;
}

export type AdvanceStatus = 'Available' | 'Partially Applied' | 'Fully Applied';

export interface AdvancePayment {
  id: number;
  receiptNumber: string;
  date: string;
  customerName: string;
  phoneNumber: string;
  originalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  status: AdvanceStatus;
  invoiceReference?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdvanceApplication {
  id: number;
  advanceId: number;
  jobId: number;
  invoiceReference: string;
  amount: number;
  appliedAt?: string;
}

export interface JobPayment {
  id: number;
  jobId: number;
  date: string;
  paymentType: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface UnifiedPaymentItem {
  id: string;
  date: string;
  type: string; // 'Advance' | 'Payment' | 'Cash' | 'Card' | 'Bank Transfer'
  amount: number;
  reference?: string | null;
  invoiceReference?: string | null;
  notes?: string | null;
}

export interface Technician {
  id: number;
  name: string;
  phone?: string | null;
  commissionRate: number; // percentage, e.g. 40
  role: string;
  active: boolean;
  createdAt?: string;
}

export interface TechnicianCommissionSummary {
  technician: Technician;
  totalJobs: number;
  completedJobs: number;
  totalJobRevenue: number;
  totalPartsCost: number;
  netLaborProfit: number;
  commissionEarned: number;
  jobs: RepairJob[];
}

export interface DailySummary {
  date: string;
  totalCompletedRepairs: number;
  totalAdvanceRevenue: number;
  totalJobsReceivedToday: number;
  totalEstimatedRevenueToday: number;
  completedJobs: RepairJob[];
  advanceJobs: RepairJob[];
  advancePayments?: AdvancePayment[];
}

export interface CustomerSummary {
  phoneNumber: string;
  customerName: string;
  customerAddress?: string | null;
  totalRepairs: number;
  lastVisitDate: string;
  devices: string[];
  jobs: RepairJob[];
}

export interface AppSettings {
  country_code: string;
  shop_name: string;
}

export type StaffRole = 'Admin' | 'Cashier' | 'Technician';

export interface StaffPermissions {
  create_jobs: boolean;
  process_payments: boolean;
  send_messages: boolean;
  edit_jobs: boolean;
  view_reports: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, StaffPermissions> = {
  Admin: {
    create_jobs: true,
    process_payments: true,
    send_messages: true,
    edit_jobs: true,
    view_reports: true,
  },
  Cashier: {
    create_jobs: true,
    process_payments: true,
    send_messages: true,
    edit_jobs: false,
    view_reports: false,
  },
  Technician: {
    create_jobs: false,
    process_payments: false,
    send_messages: true,
    edit_jobs: true,
    view_reports: false,
  },
};

export interface StaffUser {
  id?: number;
  email: string;
  username?: string | null;
  password?: string | null;
  name: string;
  role: string;
  location?: string | null;
  series?: string | null;
  permissions?: StaffPermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  jobId: number;
  jobNumber: string;
  customerName: string;
  deviceModel: string;
  type: 'new_job_assigned' | 'job_ready_to_collect';
  title: string;
  message: string;
  targetRole: 'Technician' | 'Cashier' | 'All';
  assignedTechnician?: string;
  status: string;
  createdAt: string;
  read: boolean;
}
