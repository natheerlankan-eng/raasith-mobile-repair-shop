export interface PosItem {
  id: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  image?: string;
  type: string;
  availability: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface ItemBatch {
  id: string | number;
  batchNumber: string; // e.g. "B-GRN-2026-001-000027"
  itemCode: string;
  itemName: string;
  grnNumber: string;
  supplierName?: string;
  purchaseDate: string; // YYYY-MM-DD
  costPrice: number;
  sellingPrice: number;
  initialQty: number;
  remainingQty: number;
  status: 'Active' | 'Depleted';
  createdAt?: string;
}

export interface PosBillItem {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
  isFromJob?: boolean;
  itemName?: string;
  itemCode?: string;
  costPrice?: number;
  batchNumber?: string;
  batchPurchaseDate?: string;
}

export interface PosBill {
  id: string;
  billNo: string;
  date: string;
  time: string;
  cashierName?: string;
  cashierId?: number;
  customerName: string;
  customerPhone: string;
  items: PosBillItem[];
  subtotal: number;
  discount: number;
  returns: number;
  netTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'e-Wallet' | 'Credit';
  paymentTerm?: 'Cash' | 'Credit';
  bankAccountId?: number;
  bankAccountName?: string;
  advanceApplied?: number;
  creditDue?: number;
  customerOutstandingDue?: number;
  status: 'Completed' | 'Pending' | 'Locked' | 'Returned';
  linkedJobId?: number;
  linkedJobNumber?: string;
  deviceInfo?: string;
  advancePaid?: number;
  cashTendered?: number;
  changeDue?: number;
}

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactNumber: string;
  email?: string;
  address?: string;
  totalPurchase: number;
  paidAmount: number;
  purchaseReturn: number;
  balancePay: number;
  status: 'Active' | 'Pending Settlement';
}

export interface ExpenseRecord {
  id: string;
  location: string;
  expenseType: string;
  paidTo: string;
  remark: string;
  payType: 'Cash' | 'Card' | 'Bank Transfer' | 'Cheque';
  payInfo: string;
  date: string;
  amount: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  type: 'Admin' | 'Cashier' | 'Manager' | 'Technician';
  username: string;
  email?: string;
  password?: string;
  location: string;
  series: string;
  accessRate: boolean;
  accessOffPercent: boolean;
  accessOffRs: boolean;
  accessBillDiscount: boolean;
  permissions?: any;
}

export interface PosSystemConfig {
  logoUrl?: string;
  shopName: string;
  outletName: string;
  phone: string;
  address: string;
  currency: string;
  billWidth: '80mm' | '58mm' | 'A4';
  qtyDigits: number;
  barcodeDigits: number;
  grnAutoUpdate: boolean;
  stickerColumns: number;
  defaultCashier: string;
  defaultCustomer: string;
  invoicePrefix: string;
  returnPolicy: string;
  footerMessage: string;
  softwareCredit: string;
  note1: string;
  note2: string;
  note3: string;
  disclaimer: string;
}

export const INITIAL_POS_ITEMS: PosItem[] = [
  {
    id: 'ITEM-001',
    code: 'SCR-IP13-OLED',
    barcode: '890123456001',
    name: 'iPhone 13 OLED Display Assembly (OEM Grade)',
    category: 'Displays',
    brand: 'Apple',
    size: '6.1"',
    color: 'Black',
    costPrice: 18500,
    sellingPrice: 24500,
    qty: 14,
    type: 'Spare Part',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-002',
    code: 'BAT-SAM-S21',
    barcode: '890123456002',
    name: 'Samsung Galaxy S21 Battery 4000mAh',
    category: 'Batteries',
    brand: 'Samsung',
    size: 'Standard',
    color: 'Silver',
    costPrice: 4200,
    sellingPrice: 6500,
    qty: 28,
    type: 'Spare Part',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-003',
    code: 'CHG-33W-TYPEC',
    barcode: '890123456003',
    name: 'Xiaomi 33W Fast Wall Charger + Type-C Cable',
    category: 'Chargers',
    brand: 'Xiaomi',
    size: '1M',
    color: 'White',
    costPrice: 2100,
    sellingPrice: 3200,
    qty: 45,
    type: 'Accessory',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-004',
    code: 'GLS-TMP-UNIV',
    barcode: '890123456004',
    name: '9D Full Curved Tempered Glass (iPhone 14/15)',
    category: 'Protection',
    brand: 'Remax',
    size: '6.1"',
    color: 'Clear/Black',
    costPrice: 350,
    sellingPrice: 950,
    qty: 120,
    type: 'Accessory',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-005',
    code: 'PRT-CHG-V20',
    barcode: '890123456005',
    name: 'Vivo V20 USB-C Charging Port Board Flex',
    category: 'Ports & Flex',
    brand: 'Vivo',
    size: 'Standard',
    color: 'Blue',
    costPrice: 1800,
    sellingPrice: 3500,
    qty: 8,
    type: 'Spare Part',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-006',
    code: 'EAR-TWS-AIR2',
    barcode: '890123456006',
    name: 'Baseus Bowie E3 TWS Wireless Earbuds',
    category: 'Audio',
    brand: 'Baseus',
    size: 'Compact',
    color: 'Black',
    costPrice: 4800,
    sellingPrice: 7200,
    qty: 16,
    type: 'Accessory',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-007',
    code: 'BCV-MATTE-SAM',
    barcode: '890123456007',
    name: 'Shockproof Matte Armor Case (Samsung A54 5G)',
    category: 'Cases',
    brand: 'Nillkin',
    size: 'Custom',
    color: 'Navy Blue',
    costPrice: 850,
    sellingPrice: 1650,
    qty: 32,
    type: 'Accessory',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-008',
    code: 'SRV-L1-DIAG',
    barcode: '890123456008',
    name: 'Motherboard Short-Circuit Diagnostics & Ultrasonic Clean',
    category: 'Services',
    brand: 'Raasith Tech',
    size: 'N/A',
    color: 'N/A',
    costPrice: 500,
    sellingPrice: 2500,
    qty: 999,
    type: 'Service',
    availability: 'In Stock',
  },
  {
    id: 'ITEM-009',
    code: 'CAM-IP12-BCK',
    barcode: '890123456009',
    name: 'iPhone 12 Main Rear Dual Camera Sensor Unit',
    category: 'Cameras',
    brand: 'Apple',
    size: 'Standard',
    color: 'Black',
    costPrice: 12500,
    sellingPrice: 16800,
    qty: 3,
    type: 'Spare Part',
    availability: 'Low Stock',
  },
];

export const INITIAL_ITEM_BATCHES: ItemBatch[] = [
  {
    id: 'BATCH-GRN-2026-001-000027-01',
    batchNumber: 'BATCH-GRN-2026-001-000027-01',
    itemCode: '000027',
    itemName: 'OG ESD Tempered Sam A32',
    grnNumber: 'GRN-2026-001',
    supplierName: 'Akkaraipattu Tech Wholesale',
    purchaseDate: '2026-10-10',
    costPrice: 210,
    sellingPrice: 330,
    initialQty: 25,
    remainingQty: 15,
    status: 'Active',
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'BATCH-GRN-2026-004-000027-01',
    batchNumber: 'BATCH-GRN-2026-004-000027-01',
    itemCode: '000027',
    itemName: 'OG ESD Tempered Sam A32',
    grnNumber: 'GRN-2026-004',
    supplierName: 'Colombo Direct Spares',
    purchaseDate: '2026-10-18',
    costPrice: 240,
    sellingPrice: 380,
    initialQty: 25,
    remainingQty: 25,
    status: 'Active',
    createdAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'BATCH-GRN-2026-001-000024-01',
    batchNumber: 'BATCH-GRN-2026-001-000024-01',
    itemCode: '000024',
    itemName: 'WUW Earphone R186',
    grnNumber: 'GRN-2026-001',
    supplierName: 'Akkaraipattu Tech Wholesale',
    purchaseDate: '2026-10-10',
    costPrice: 350,
    sellingPrice: 550,
    initialQty: 10,
    remainingQty: 10,
    status: 'Active',
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'BATCH-GRN-2026-003-000024-01',
    batchNumber: 'BATCH-GRN-2026-003-000024-01',
    itemCode: '000024',
    itemName: 'WUW Earphone R186',
    grnNumber: 'GRN-2026-003',
    supplierName: 'Global Audio Hub',
    purchaseDate: '2026-10-17',
    costPrice: 400,
    sellingPrice: 620,
    initialQty: 20,
    remainingQty: 20,
    status: 'Active',
    createdAt: '2026-10-17T10:00:00Z',
  },
  {
    id: 'BATCH-GRN-2026-002-SCR-IP13-01',
    batchNumber: 'BATCH-GRN-2026-002-SCR-IP13-01',
    itemCode: 'SCR-IP13-OLED',
    itemName: 'iPhone 13 OLED Display Assembly (OEM Grade)',
    grnNumber: 'GRN-2026-002',
    supplierName: 'Shenzhen OLED Direct',
    purchaseDate: '2026-10-12',
    costPrice: 17500,
    sellingPrice: 23500,
    initialQty: 10,
    remainingQty: 6,
    status: 'Active',
    createdAt: '2026-10-12T10:00:00Z',
  },
  {
    id: 'BATCH-GRN-2026-005-SCR-IP13-01',
    batchNumber: 'BATCH-GRN-2026-005-SCR-IP13-01',
    itemCode: 'SCR-IP13-OLED',
    itemName: 'iPhone 13 OLED Display Assembly (OEM Grade)',
    grnNumber: 'GRN-2026-005',
    supplierName: 'Singapore Spares Ltd',
    purchaseDate: '2026-10-19',
    costPrice: 18500,
    sellingPrice: 24500,
    initialQty: 12,
    remainingQty: 8,
    status: 'Active',
    createdAt: '2026-10-19T10:00:00Z',
  },
];

export const INITIAL_SUPPLIERS: SupplierItem[] = [
  {
    id: 'SUP-001',
    code: 'SPL-COL-01',
    name: 'Lanka Telecom & Spares Colombo (Pvt) Ltd',
    contactNumber: '+94 77 123 4567',
    email: 'sales@lankaspareparts.lk',
    address: '142 1st Cross Street, Pettah, Colombo 11',
    totalPurchase: 1850000,
    paidAmount: 1420000,
    purchaseReturn: 45000,
    balancePay: 385000,
    status: 'Active',
  },
  {
    id: 'SUP-002',
    code: 'SPL-BAT-02',
    name: 'Apex Battery Solutions Hong Kong',
    contactNumber: '+852 9876 5432',
    email: 'export@apexbatteries.hk',
    address: 'Kowloon Industrial Park, HK',
    totalPurchase: 920000,
    paidAmount: 920000,
    purchaseReturn: 12000,
    balancePay: 0,
    status: 'Active',
  },
  {
    id: 'SUP-003',
    code: 'SPL-KND-03',
    name: 'Kandy Mobile Components Wholesalers',
    contactNumber: '+94 81 223 9988',
    email: 'kandymobilespares@gmail.com',
    address: '45 Colombo Street, Kandy',
    totalPurchase: 640000,
    paidAmount: 480000,
    purchaseReturn: 0,
    balancePay: 160000,
    status: 'Active',
  },
  {
    id: 'SUP-004',
    code: 'SPL-AMP-04',
    name: 'Eastern Accessories Hub (Akkaraipattu)',
    contactNumber: '+94 67 227 8899',
    email: 'easternhub.amp@sltnet.lk',
    address: 'Main Street, Akkaraipattu 02',
    totalPurchase: 450000,
    paidAmount: 390000,
    purchaseReturn: 15000,
    balancePay: 45000,
    status: 'Active',
  },
  {
    id: 'SUP-005',
    code: 'SPL-DUB-05',
    name: 'Deira Mobile Parts Trading LLC Dubai',
    contactNumber: '+971 4 223 7711',
    email: 'orders@deiraparts.ae',
    address: 'Naif Road, Deira, Dubai, UAE',
    totalPurchase: 3200000,
    paidAmount: 2600000,
    purchaseReturn: 80000,
    balancePay: 520000,
    status: 'Active',
  },
];

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'EXP-101',
    location: 'Main Outlet Akkaraipattu',
    expenseType: 'Shop Rent',
    paidTo: 'Building Owner (Haji Ismail)',
    remark: 'Shop monthly rental advance for October 2026',
    payType: 'Bank Transfer',
    payInfo: 'Commercial Bank Ref #99281',
    date: '2026-10-01',
    amount: 65000,
  },
  {
    id: 'EXP-102',
    location: 'Main Outlet Akkaraipattu',
    expenseType: 'Electricity Bill',
    paidTo: 'CEB Akkaraipattu Branch',
    remark: 'A/C and workbench soldering stations electricity usage',
    payType: 'Cash',
    payInfo: 'CEB Bill #8827104',
    date: '2026-10-04',
    amount: 18450,
  },
  {
    id: 'EXP-103',
    location: 'Workshop Bench #1',
    expenseType: 'Tooling & Consumables',
    paidTo: 'Mechanic Pro Tools',
    remark: 'Solder wire 0.3mm, flux paste, and SMD tweezers kit',
    payType: 'Cash',
    payInfo: 'Receipt #4412',
    date: '2026-10-06',
    amount: 7200,
  },
  {
    id: 'EXP-104',
    location: 'Main Outlet Akkaraipattu',
    expenseType: 'Staff Welfare & Tea',
    paidTo: 'Al-Madina Tea Kiosk',
    remark: 'Weekly technician refreshment and water bottles',
    payType: 'Cash',
    payInfo: 'Voucher #092',
    date: '2026-10-07',
    amount: 4300,
  },
  {
    id: 'EXP-105',
    location: 'Transport & Freight',
    expenseType: 'Courier & Shipping',
    paidTo: 'Pronto Courier Service',
    remark: 'Display panels parcel delivered from Colombo Pettah',
    payType: 'Cash',
    payInfo: 'Waybill #PR-881920',
    date: '2026-10-08',
    amount: 2850,
  },
];

export const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: 'USR-01',
    name: 'Mohamed Raasith',
    type: 'Admin',
    username: 'raasith.admin',
    location: 'Main Outlet Akkaraipattu',
    series: 'RM-A01',
    accessRate: true,
    accessOffPercent: true,
    accessOffRs: true,
    accessBillDiscount: true,
  },
  {
    id: 'USR-02',
    name: 'Natheer Lankan',
    type: 'Admin',
    username: 'natheerlankan',
    location: 'Main Outlet Akkaraipattu',
    series: 'RM-A02',
    accessRate: true,
    accessOffPercent: true,
    accessOffRs: true,
    accessBillDiscount: true,
  },
  {
    id: 'USR-03',
    name: 'Kamaldeen Aslam',
    type: 'Cashier',
    username: 'aslam.cashier',
    location: 'Front Counter Desk',
    series: 'RM-C01',
    accessRate: false,
    accessOffPercent: true,
    accessOffRs: false,
    accessBillDiscount: true,
  },
  {
    id: 'USR-04',
    name: 'Farhan Hardware Tech',
    type: 'Technician',
    username: 'farhan.tech',
    location: 'Repair Bench 2',
    series: 'RM-T01',
    accessRate: false,
    accessOffPercent: false,
    accessOffRs: false,
    accessBillDiscount: false,
  },
];

export const INITIAL_POS_SYSTEM_CONFIG: PosSystemConfig = {
  logoUrl: '',
  shopName: 'RAASITH MOBILE',
  outletName: 'Professional Mobile Phone Repairing Centre',
  phone: '0672277996, 0752834443',
  address: 'Main Street, Akkaraipattu.',
  currency: 'Rs',
  billWidth: '80mm',
  qtyDigits: 2,
  barcodeDigits: 12,
  grnAutoUpdate: true,
  stickerColumns: 2,
  defaultCashier: 'Admin',
  defaultCustomer: 'CHEEP AND BEST',
  invoicePrefix: 'INV000010',
  returnPolicy: 'We do not accept Return / Defective items after 7 days. Please submit original INVOICE for Return or Defective Claim.',
  footerMessage: '** Thank You for Shopping With Us! **',
  softwareCredit: 'Software: Syntaks Shopman | www.syntaks.lk',
  note1: 'Warranty valid for 30 days on hardware replacements. Display & water damage void warranty.',
  note2: 'Please inspect your device upon delivery. Goods sold cannot be returned without original receipt.',
  note3: 'Thank you for choosing Raasith Mobile! For tech support WhatsApp 0752834443.',
  disclaimer: 'Job slips not claimed within 90 days will be disposed of per shop policy.',
};
