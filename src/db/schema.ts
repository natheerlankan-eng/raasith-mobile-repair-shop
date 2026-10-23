import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. REPAIR JOBS
export const repairJobs = pgTable('repair_jobs', {
  id: serial('id').primaryKey(),
  jobNumber: text('job_number').notNull(),
  date: text('date').notNull(),
  customerName: text('customer_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  customerAddress: text('customer_address'),
  deviceBrand: text('device_brand').notNull(),
  deviceModel: text('device_model').notNull(),
  imei: text('imei'),
  problems: text('problems').notNull(), // JSON string array of issues
  otherProblem: text('other_problem'),
  notes: text('notes'),
  estimatedPrice: integer('estimated_price').notNull().default(0),
  advancePaid: integer('advance_paid').notNull().default(0),
  technicianName: text('technician_name').notNull(),
  status: text('status').notNull().default('Received'), // 'Received' | 'In Repair' | 'Waiting for Parts' | 'Ready for Pickup' | 'Delivered' | 'Cancelled'
  receivedMsgSent: boolean('received_msg_sent').notNull().default(false),
  readyMsgSent: boolean('ready_msg_sent').notNull().default(false),
  smsReceivedSent: boolean('sms_received_sent').notNull().default(false),
  smsReadySent: boolean('sms_ready_sent').notNull().default(false),
  accessories: text('accessories'), // JSON: { sim: boolean, backCover: boolean, battery: boolean, other?: string }
  spareParts: text('spare_parts'), // JSON array: [{ name: string, cost: number, qty: number }]
  totalPartsCost: integer('total_parts_cost').notNull().default(0),
  sparePartsAmount: integer('spare_parts_amount').notNull().default(0),
  dueAmount: integer('due_amount').notNull().default(0),
  completedDate: text('completed_date'),
  expectedDeliveryDate: text('expected_delivery_date'),
  expectedDeliveryTime: text('expected_delivery_time'),
  healthPassport: text('health_passport'), // JSON of PhoneHealthPassportData
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. ADVANCE PAYMENTS & APPLICATIONS
export const advancePayments = pgTable('advance_payments', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(), // e.g. ADV-1001
  date: text('date').notNull(), // YYYY-MM-DD
  customerName: text('customer_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  originalAmount: integer('original_amount').notNull().default(0),
  usedAmount: integer('used_amount').notNull().default(0),
  remainingAmount: integer('remaining_amount').notNull().default(0),
  status: text('status').notNull().default('Available'), // 'Available' | 'Partially Applied' | 'Fully Applied'
  invoiceReference: text('invoice_reference'), // e.g. "INV-1005" or "RM-1001"
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const advanceApplications = pgTable('advance_applications', {
  id: serial('id').primaryKey(),
  advanceId: integer('advance_id').notNull(),
  jobId: integer('job_id').notNull(),
  invoiceReference: text('invoice_reference').notNull(),
  amount: integer('amount').notNull(),
  appliedAt: timestamp('applied_at').defaultNow(),
});

// 3. JOB DIRECT PAYMENTS
export const jobPayments = pgTable('job_payments', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  paymentType: text('payment_type').notNull().default('Payment'), // 'Advance' | 'Payment' | 'Cash' | 'Card' | 'Bank Transfer'
  amount: integer('amount').notNull(),
  reference: text('reference'), // e.g. receipt or ADV reference or transaction ID
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. TECHNICIANS & COMMISSIONS
export const technicians = pgTable('technicians', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  phone: text('phone'),
  commissionRate: integer('commission_rate').notNull().default(40), // e.g. 40%
  role: text('role').notNull().default('Technician'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. APP SETTINGS & RBAC STAFF USERS
export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const staffUsers = pgTable('staff_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username'),
  password: text('password'),
  name: text('name').notNull(),
  role: text('role').notNull().default('Cashier'), // 'Admin' | 'Cashier' | 'Technician'
  location: text('location'),
  series: text('series'),
  permissions: text('permissions'), // JSON string: { create_jobs: boolean, process_payments: boolean, send_messages: boolean, edit_jobs: boolean, view_reports: boolean }
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 6. INVENTORY ITEMS (MASTER CATALOG)
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. "000027"
  barcode: text('barcode').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  brand: text('brand').notNull(),
  size: text('size').default('Standard'),
  color: text('color').default('Standard'),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  qty: integer('qty').notNull().default(0),
  type: text('type').notNull().default('Accessory'),
  availability: text('availability').notNull().default('In Stock'),
  supplierCode: text('supplier_code'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. SUPPLIERS & LEDGER
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. "SID1"
  name: text('name').notNull(),
  contactNumber: text('contact_number').notNull(),
  address: text('address'),
  totalPurchase: integer('total_purchase').notNull().default(0),
  paidAmount: integer('paid_amount').notNull().default(0),
  purchaseReturn: integer('purchase_return').notNull().default(0),
  balancePay: integer('balance_pay').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. GOODS RECEIVED NOTES (GRN BATCHES & ITEMS)
export const grnBatches = pgTable('grn_batches', {
  id: serial('id').primaryKey(),
  grnNumber: text('grn_number').notNull().unique(), // e.g. "GRN-2026-001"
  supplierCode: text('supplier_code').notNull(),
  supplierName: text('supplier_name').notNull(),
  invoiceRef: text('invoice_ref'),
  date: text('date').notNull(),
  totalItems: integer('total_items').notNull().default(0),
  totalCost: integer('total_cost').notNull().default(0),
  totalRetail: integer('total_retail').notNull().default(0),
  status: text('status').notNull().default('Posted'), // 'Posted' | 'Synced'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const grnItems = pgTable('grn_items', {
  id: serial('id').primaryKey(),
  grnNumber: text('grn_number').notNull(),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  category: text('category').notNull().default('General'),
  brand: text('brand').notNull().default('General'),
  quantityReceived: integer('quantity_received').notNull().default(1),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  totalCost: integer('total_cost').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8B. INVENTORY BATCHES (BATCH-WISE PRICING & FIFO INTAKE REGISTRY)
export const inventoryBatches = pgTable('inventory_batches', {
  id: serial('id').primaryKey(),
  batchNumber: text('batch_number').notNull().unique(), // e.g. "B-GRN-2026-001-000027"
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  grnNumber: text('grn_number').notNull(),
  supplierName: text('supplier_name'),
  purchaseDate: text('purchase_date').notNull(),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  initialQty: integer('initial_qty').notNull().default(0),
  remainingQty: integer('remaining_qty').notNull().default(0),
  status: text('status').notNull().default('Active'), // 'Active' | 'Depleted'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. STOCK ADJUSTMENTS
export const stockAdjustments = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  adjustmentCode: text('adjustment_code').notNull().unique(),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  type: text('type').notNull(), // '+' | '-'
  quantity: integer('quantity').notNull().default(1),
  reason: text('reason').notNull(),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. POS BILLS & SALES TRANSACTIONS
export const posBills = pgTable('pos_bills', {
  id: serial('id').primaryKey(),
  billNo: text('bill_no').notNull().unique(), // e.g. "INV000009"
  date: text('date').notNull(),
  time: text('time').notNull(),
  cashierId: text('cashier_id').notNull().default('CASH-01'),
  cashierName: text('cashier_name').notNull().default('Cashier'),
  customerName: text('customer_name').notNull().default('Walk-in Customer'),
  customerPhone: text('customer_phone'),
  subtotal: integer('subtotal').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  returns: integer('returns').notNull().default(0),
  advancePaid: integer('advance_paid').notNull().default(0),
  advanceApplied: integer('advance_applied').notNull().default(0),
  netTotal: integer('net_total').notNull().default(0),
  paidAmount: integer('paid_amount').notNull().default(0),
  changeDue: integer('change_due').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('Cash'), // 'Cash' | 'Card' | 'Bank Transfer' | 'Credit'
  paymentTerm: text('payment_term').notNull().default('Cash'), // 'Cash' | 'Credit'
  bankAccountId: integer('bank_account_id'),
  bankAccountName: text('bank_account_name'),
  creditDue: integer('credit_due').notNull().default(0),
  customerOutstandingDue: integer('customer_outstanding_due').notNull().default(0),
  paymentDetails: text('payment_details'), // JSON string with breakdown
  linkedJobId: integer('linked_job_id'),
  linkedJobNumber: text('linked_job_number'),
  status: text('status').notNull().default('Completed'), // 'Completed' | 'Refunded' | 'Cancelled'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posBillItems = pgTable('pos_bill_items', {
  id: serial('id').primaryKey(),
  billNo: text('bill_no').notNull(),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  qty: integer('qty').notNull().default(1),
  price: integer('price').notNull().default(0),
  costPrice: integer('cost_price').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  total: integer('total').notNull().default(0),
  isFromJob: boolean('is_from_job').notNull().default(false),
  batchNumber: text('batch_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. EXPENSES & FINANCIAL TRANSACTIONS
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  location: text('location').notNull().default('Main Outlet Akkaraipattu'),
  locationId: text('location_id').default('LOC-AKK-01'),
  expenseType: text('expense_type').notNull(),
  paidTo: text('paid_to').notNull(),
  remark: text('remark'),
  payType: text('pay_type').notNull().default('Cash'), // 'Cash' | 'Bank Transfer' | 'e-Wallet'
  payInfo: text('pay_info'),
  date: text('date').notNull(),
  amount: integer('amount').notNull().default(0),
  userId: integer('user_id'),
  userName: text('user_name'),
  accountId: integer('account_id'),
  accountName: text('account_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. SHOP BANK ACCOUNTS & DIGITAL PAYMENT REGISTRY
export const bankAccounts = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  accountName: text('account_name').notNull(), // e.g. "Commercial Bank - Main Counter POS"
  bankName: text('bank_name').notNull(), // e.g. "Commercial Bank of Ceylon"
  accountNumber: text('account_number').notNull(),
  branch: text('branch').notNull().default('Akkaraipattu'),
  balance: integer('balance').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  locationId: text('location_id').default('LOC-AKK-01'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankTransactions = pgTable('bank_transactions', {
  id: serial('id').primaryKey(),
  bankAccountId: integer('bank_account_id').notNull(),
  bankAccountName: text('bank_account_name').notNull(),
  date: text('date').notNull(),
  type: text('type').notNull(), // 'Card POS Settlement' | 'Bank Transfer In' | 'Expense Out' | 'Transfer Out' | 'Investment Deposit' | 'Owner Draw'
  amount: integer('amount').notNull().default(0),
  refNo: text('ref_no'),
  description: text('description'),
  locationId: text('location_id').default('LOC-AKK-01'),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12B. E-WALLET ACCOUNTS & DIGITAL REGISTRY (Dialog e-Z Cash, FriMi, Genie, Koko)
export const ewalletAccounts = pgTable('ewallet_accounts', {
  id: serial('id').primaryKey(),
  walletName: text('wallet_name').notNull(), // e.g. "Dialog e-Z Cash Merchant"
  provider: text('provider').notNull(), // 'e-Z Cash' | 'FriMi' | 'Genie' | 'Koko'
  accountNumber: text('account_number').notNull(), // Mobile number or Terminal ID
  merchantId: text('merchant_id'),
  balance: integer('balance').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  locationId: text('location_id').default('LOC-AKK-01'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const ewalletTransactions = pgTable('ewallet_transactions', {
  id: serial('id').primaryKey(),
  ewalletAccountId: integer('ewallet_account_id').notNull(),
  walletName: text('wallet_name').notNull(),
  date: text('date').notNull(),
  type: text('type').notNull(), // 'POS QR Settlement' | 'Mobile In' | 'Topup' | 'Vendor Payout' | 'Settlement to Bank'
  amount: integer('amount').notNull().default(0),
  refNo: text('ref_no'),
  description: text('description'),
  locationId: text('location_id').default('LOC-AKK-01'),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12C. CAPITAL INVESTMENTS & PARTNER EQUITY
export const investments = pgTable('investments', {
  id: serial('id').primaryKey(),
  investorName: text('investor_name').notNull(),
  investmentType: text('investment_type').notNull().default('Capital Injection'), // 'Capital Injection' | 'Partner Equity' | 'Working Capital' | 'External Loan'
  amount: integer('amount').notNull().default(0),
  location: text('location').notNull().default('Main Outlet Akkaraipattu'),
  locationId: text('location_id').default('LOC-AKK-01'),
  userId: integer('user_id'),
  userName: text('user_name'),
  accountId: integer('account_id'),
  accountName: text('account_name'),
  payType: text('pay_type').notNull().default('Bank Transfer'), // 'Bank Transfer' | 'Cash' | 'Cheque'
  date: text('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12D. OTHER INCOMES (Non-Sales Revenue)
export const otherIncomes = pgTable('other_incomes', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // 'Scrap / E-Waste Disposal' | 'Device Trade-in Margin' | 'Franchise Royalty' | 'Rental Sublet' | 'Commission' | 'Other'
  receivedFrom: text('received_from').notNull(),
  amount: integer('amount').notNull().default(0),
  location: text('location').notNull().default('Main Outlet Akkaraipattu'),
  locationId: text('location_id').default('LOC-AKK-01'),
  userId: integer('user_id'),
  userName: text('user_name'),
  accountId: integer('account_id'),
  accountName: text('account_name'),
  payType: text('pay_type').notNull().default('Cash'), // 'Cash' | 'Bank Transfer' | 'e-Wallet'
  date: text('date').notNull(),
  remark: text('remark'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12E. PROFIT OUT (Owner Draws, Dividends & Profit Distributions)
export const profitOut = pgTable('profit_out', {
  id: serial('id').primaryKey(),
  recipient: text('recipient').notNull(), // 'Mohamed Raasith (Owner Draw)' | 'Partner Dividend' | 'Equity Payout' | 'Bonus Distribution'
  distributionType: text('distribution_type').notNull().default('Owner Draw'), // 'Owner Draw' | 'Dividend Payout' | 'Profit Distribution'
  amount: integer('amount').notNull().default(0),
  location: text('location').notNull().default('Main Outlet Akkaraipattu'),
  locationId: text('location_id').default('LOC-AKK-01'),
  userId: integer('user_id'),
  userName: text('user_name'),
  accountId: integer('account_id'),
  accountName: text('account_name'),
  payType: text('pay_type').notNull().default('Cash'), // 'Cash' | 'Bank Transfer' | 'Cheque'
  date: text('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. CUSTOMER ACCOUNTS, ADVANCES & CREDITORS/DEBTORS
export const customerAccounts = pgTable('customer_accounts', {
  id: serial('id').primaryKey(),
  phoneNumber: text('phone_number').notNull(),
  customerName: text('customer_name').notNull(),
  address: text('address'),
  creditLimit: integer('credit_limit').notNull().default(50000), // Maximum credit line allowance in LKR
  creditDue: integer('credit_due').notNull().default(0), // Total unpaid credit bills (Debtor)
  advanceBalance: integer('advance_balance').notNull().default(0), // Unspent advance deposits
  totalPurchases: integer('total_purchases').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customerLedgerEntries = pgTable('customer_ledger_entries', {
  id: serial('id').primaryKey(),
  customerPhone: text('customer_phone').notNull(),
  customerName: text('customer_name').notNull(),
  date: text('date').notNull(),
  type: text('type').notNull(), // 'Cash Sale' | 'Credit Sale' | 'Advance Applied' | 'Credit Settlement' | 'Return Refund' | 'Credit Note'
  refNo: text('ref_no').notNull(),
  debit: integer('debit').notNull().default(0),
  credit: integer('credit').notNull().default(0),
  balance: integer('balance').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. DUAL-MODE SALES RETURNS & RESTOCKING
export const salesReturns = pgTable('sales_returns', {
  id: serial('id').primaryKey(),
  returnNumber: text('return_number').notNull().unique(), // e.g. "RET-0001"
  returnType: text('return_type').notNull(), // 'WITH_BILL' | 'WITHOUT_BILL'
  originalBillNo: text('original_bill_no'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  date: text('date').notNull(),
  refundType: text('refund_type').notNull().default('Cash Refund'), // 'Cash Refund' | 'Credit Note' | 'Exchange Adjustment'
  totalAmount: integer('total_amount').notNull().default(0),
  reason: text('reason').notNull(),
  restocked: boolean('restocked').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const salesReturnItems = pgTable('sales_return_items', {
  id: serial('id').primaryKey(),
  returnNumber: text('return_number').notNull(),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  qty: integer('qty').notNull().default(1),
  price: integer('price').notNull().default(0),
  total: integer('total').notNull().default(0),
  condition: text('condition').notNull().default('Good / Resellable'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 15. STOCK MOVEMENT LOGS (Full Ledger History for Auditing & Reports)
export const stockMovementLogs = pgTable('stock_movement_logs', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').notNull(), // HH:MM:SS
  itemCode: text('item_code').notNull(),
  barcode: text('barcode'),
  itemName: text('item_name').notNull(),
  movementType: text('movement_type').notNull(), // 'Initial Stock' | 'Bulk Import' | 'GRN Intake' | 'POS Sale' | 'Sales Return' | 'Reversal' | 'Stock Adjustment'
  refNo: text('ref_no').notNull(), // e.g. "IMPORT-CSV", "GRN-2026-001", "INV000010", "RET-0001"
  qtyChange: integer('qty_change').notNull(), // +20, -1, etc.
  balanceAfter: integer('balance_after').notNull(),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  user: text('user').notNull().default('Admin'),
  outlet: text('outlet').notNull().default('Main Outlet Akkaraipattu'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
