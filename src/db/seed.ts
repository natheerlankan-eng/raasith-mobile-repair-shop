import { db } from './index.ts';
import { sql } from 'drizzle-orm';
import {
  inventoryItems,
  suppliers,
  grnBatches,
  grnItems,
  expenses,
  bankAccounts,
  customerAccounts,
  ewalletAccounts,
  investments,
  otherIncomes,
  profitOut,
  stockMovementLogs,
} from './schema.ts';
import { INITIAL_POS_ITEMS, INITIAL_SUPPLIERS, INITIAL_EXPENSES } from '../data/posData.ts';

export async function seedDatabaseIfEmpty() {
  try {
    // Database schema is maintained through Cloud SQL Drizzle migrations

    // 1. Seed Inventory Items if empty
    const existingItems = await db.select({ id: inventoryItems.id }).from(inventoryItems).limit(1);
    if (existingItems.length === 0) {
      console.log('Seeding inventory items table...');
      const seedItems = [
        {
          code: '000027',
          barcode: '890123000027',
          name: 'OG ESD Tempered Sam A32',
          category: 'TEMPAD',
          brand: 'Samsung',
          size: 'Standard',
          color: 'Clear',
          costPrice: 250,
          sellingPrice: 330,
          qty: 10,
          type: 'Accessory',
          availability: 'In Stock',
          supplierCode: 'SID1',
        },
        {
          code: '000024',
          barcode: '890123000024',
          name: 'WUW Earphone R186',
          category: 'HEADSET',
          brand: 'WUW',
          size: 'Standard',
          color: 'White',
          costPrice: 1000,
          sellingPrice: 1450,
          qty: 2,
          type: 'Audio',
          availability: 'Low Stock',
          supplierCode: 'SID1',
        },
        {
          code: '000021',
          barcode: '890123000021',
          name: 'Polo Cover IPhone 14 Pro',
          category: 'BACKCOVER',
          brand: 'Polo',
          size: '14 Pro',
          color: 'Black',
          costPrice: 550,
          sellingPrice: 800,
          qty: 1,
          type: 'Case',
          availability: 'Low Stock',
          supplierCode: 'SID1',
        },
        ...INITIAL_POS_ITEMS.map((item) => ({
          code: item.code,
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          brand: item.brand,
          size: item.size || 'Standard',
          color: item.color || 'Standard',
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          qty: item.qty,
          type: item.type,
          availability: item.availability,
          supplierCode: 'SID1',
        })),
      ];

      for (const it of seedItems) {
        await db.insert(inventoryItems).values(it).onConflictDoNothing();
      }
    }

    // 2. Seed Suppliers if empty
    const existingSuppliers = await db.select({ id: suppliers.id }).from(suppliers).limit(1);
    if (existingSuppliers.length === 0) {
      console.log('Seeding suppliers table...');
      const seedSuppliers = [
        {
          code: 'SID1',
          name: 'Akkaraipattu Tech Wholesale',
          contactNumber: '+94 67 227 8899',
          address: 'Main Street, Akkaraipattu',
          totalPurchase: 450000,
          paidAmount: 390000,
          purchaseReturn: 15000,
          balancePay: 45000,
        },
        {
          code: 'SID2',
          name: 'Colombo Mobile Spares Hub',
          contactNumber: '+94 77 123 4567',
          address: 'Pettah 1st Cross St, Colombo 11',
          totalPurchase: 1850000,
          paidAmount: 1420000,
          purchaseReturn: 45000,
          balancePay: 385000,
        },
        {
          code: 'SID3',
          name: 'Eastern Cellular Accessories',
          contactNumber: '+94 81 223 9988',
          address: 'Kalmunai Road, Ampara',
          totalPurchase: 640000,
          paidAmount: 480000,
          purchaseReturn: 0,
          balancePay: 160000,
        },
        {
          code: 'SID4',
          name: 'Global Tech Distributors',
          contactNumber: '+971 4 223 7711',
          address: 'Deira, Dubai, UAE',
          totalPurchase: 920000,
          paidAmount: 920000,
          purchaseReturn: 12000,
          balancePay: 0,
        },
      ];

      for (const sup of seedSuppliers) {
        await db.insert(suppliers).values(sup).onConflictDoNothing();
      }
    }

    // 3. Seed Sample GRN if empty
    const existingGrns = await db.select({ id: grnBatches.id }).from(grnBatches).limit(1);
    if (existingGrns.length === 0) {
      console.log('Seeding initial GRN batch...');
      await db.insert(grnBatches).values({
        grnNumber: 'GRN-2026-001',
        supplierCode: 'SID1',
        supplierName: 'Akkaraipattu Tech Wholesale',
        invoiceRef: 'INV-88219',
        date: '2026-10-10',
        totalItems: 2,
        totalCost: 16250,
        totalRetail: 22750,
        status: 'Posted',
      }).onConflictDoNothing();

      await db.insert(grnItems).values([
        {
          grnNumber: 'GRN-2026-001',
          itemCode: '000027',
          itemName: 'OG ESD Tempered Sam A32',
          category: 'TEMPAD',
          brand: 'Samsung',
          quantityReceived: 25,
          costPrice: 250,
          sellingPrice: 330,
          totalCost: 6250,
        },
        {
          grnNumber: 'GRN-2026-001',
          itemCode: '000024',
          itemName: 'WUW Earphone R186',
          category: 'HEADSET',
          brand: 'WUW',
          quantityReceived: 10,
          costPrice: 1000,
          sellingPrice: 1450,
          totalCost: 10000,
        },
      ]);
    }

    // 4. Seed Expenses if empty
    const existingExpenses = await db.select({ id: expenses.id }).from(expenses).limit(1);
    if (existingExpenses.length === 0) {
      console.log('Seeding initial expenses...');
      for (const exp of INITIAL_EXPENSES) {
        await db.insert(expenses).values({
          location: exp.location,
          expenseType: exp.expenseType,
          paidTo: exp.paidTo,
          remark: exp.remark,
          payType: exp.payType,
          payInfo: exp.payInfo,
          date: exp.date,
          amount: exp.amount,
        });
      }
    }

    // 5. Seed Bank Accounts if empty
    const existingBank = await db.select({ id: bankAccounts.id }).from(bankAccounts).limit(1);
    if (existingBank.length === 0) {
      console.log('Seeding initial bank accounts...');
      await db.insert(bankAccounts).values([
        {
          accountName: 'Commercial Bank - Main Counter POS Terminal',
          bankName: 'Commercial Bank of Ceylon',
          accountNumber: '8004928172',
          branch: 'Akkaraipattu',
          balance: 285000,
          isDefault: true,
        },
        {
          accountName: 'Hatton National Bank (HNB) - Digital Payments',
          bankName: 'Hatton National Bank',
          accountNumber: '049100294821',
          branch: 'Akkaraipattu Town',
          balance: 142500,
          isDefault: false,
        },
        {
          accountName: 'Bank of Ceylon (BOC) - Operating Account',
          bankName: 'Bank of Ceylon',
          accountNumber: '00281938201',
          branch: 'Akkaraipattu Main',
          balance: 95000,
          isDefault: false,
        },
      ]);
    }

    // 6. Seed Customers & Ledgers if empty
    const existingCustomers = await db.select({ id: customerAccounts.id }).from(customerAccounts).limit(1);
    if (existingCustomers.length === 0) {
      console.log('Seeding customer accounts and credit balances...');
      await db.insert(customerAccounts).values([
        {
          phoneNumber: '0771234567',
          customerName: 'Mohamed Fazil',
          address: 'Main Street, Akkaraipattu',
          creditDue: 4500,
          advanceBalance: 2000,
          totalPurchases: 42000,
        },
        {
          phoneNumber: '0719876543',
          customerName: 'Ahmed Rilwan',
          address: 'Beach Road, Sainthamaruthu',
          creditDue: 0,
          advanceBalance: 3500,
          totalPurchases: 28500,
        },
        {
          phoneNumber: '0754433221',
          customerName: 'Kavinda Perera',
          address: 'Hospital Road, Kalmunai',
          creditDue: 8200,
          advanceBalance: 0,
          totalPurchases: 65000,
        },
        {
          phoneNumber: '0779988112',
          customerName: 'Zakeer Hussain',
          address: 'Market St, Addalaichenai',
          creditDue: 0,
          advanceBalance: 5000,
          totalPurchases: 18000,
        },
      ]);
    }

    // 7. Seed e-Wallet Accounts if empty
    const existingEwallets = await db.select({ id: ewalletAccounts.id }).from(ewalletAccounts).limit(1);
    if (existingEwallets.length === 0) {
      console.log('Seeding digital e-wallet accounts...');
      await db.insert(ewalletAccounts).values([
        {
          walletName: 'Dialog e-Z Cash Merchant Terminal',
          provider: 'e-Z Cash',
          accountNumber: '0777123901',
          merchantId: 'EZC-MCH-9921',
          balance: 65400,
          isDefault: true,
          locationId: 'LOC-AKK-01',
        },
        {
          walletName: 'Nations Trust FriMi Dynamic QR',
          provider: 'FriMi',
          accountNumber: 'FRM-AKK-0019',
          merchantId: 'FRIMI-7712',
          balance: 42000,
          isDefault: false,
          locationId: 'LOC-AKK-01',
        },
        {
          walletName: 'Dialog Genie Contactless Wallet',
          provider: 'Genie',
          accountNumber: 'GENIE-99812',
          merchantId: 'GENIE-M-44',
          balance: 28500,
          isDefault: false,
          locationId: 'LOC-AKK-01',
        },
        {
          walletName: 'Koko Pay Buy-Now-Pay-Later Gateway',
          provider: 'Koko',
          accountNumber: 'KOKO-RAASITH-01',
          merchantId: 'KOKO-BNPL-33',
          balance: 89000,
          isDefault: false,
          locationId: 'LOC-AKK-01',
        },
      ]);
    }

    // 8. Seed Capital Investments if empty
    const existingInvestments = await db.select({ id: investments.id }).from(investments).limit(1);
    if (existingInvestments.length === 0) {
      console.log('Seeding initial capital investments...');
      await db.insert(investments).values([
        {
          investorName: 'Mohamed Raasith (Founder)',
          investmentType: 'Partner Equity',
          amount: 1500000,
          location: 'Main Outlet Akkaraipattu',
          locationId: 'LOC-AKK-01',
          userId: 1,
          userName: 'Mohamed Raasith',
          payType: 'Bank Transfer',
          accountName: 'Commercial Bank - Main Counter POS Terminal',
          date: '2026-09-01',
          notes: 'Initial workshop equipment, tooling setup and stock opening balance',
        },
        {
          investorName: 'Partner Equity Injection - A. Rilwan',
          investmentType: 'Capital Injection',
          amount: 500000,
          location: 'Main Outlet Akkaraipattu',
          locationId: 'LOC-AKK-01',
          userId: 1,
          userName: 'Mohamed Raasith',
          payType: 'Bank Transfer',
          accountName: 'Hatton National Bank (HNB) - Digital Payments',
          date: '2026-09-15',
          notes: 'Expansion capital for second technician rework bench',
        },
      ]);
    }

    // 9. Seed Other Incomes if empty
    const existingOtherIncome = await db.select({ id: otherIncomes.id }).from(otherIncomes).limit(1);
    if (existingOtherIncome.length === 0) {
      console.log('Seeding other income sources...');
      await db.insert(otherIncomes).values([
        {
          source: 'Scrap / E-Waste Disposal',
          receivedFrom: 'Colombo Recyclers Ltd',
          amount: 14500,
          location: 'Main Outlet Akkaraipattu',
          locationId: 'LOC-AKK-01',
          userId: 1,
          userName: 'Mohamed Raasith',
          payType: 'Cash',
          date: '2026-10-04',
          remark: 'Broken LCD screens and damaged lithium battery recycling scrap',
        },
        {
          source: 'Device Trade-in Margin',
          receivedFrom: 'Walk-in Customer Trade-In',
          amount: 8500,
          location: 'Main Outlet Akkaraipattu',
          locationId: 'LOC-AKK-01',
          userId: 1,
          userName: 'Mohamed Raasith',
          payType: 'Cash',
          date: '2026-10-06',
          remark: 'Used Samsung A20 refurbishing markup profit',
        },
      ]);
    }

    // 10. Seed Profit Out if empty
    const existingProfitOut = await db.select({ id: profitOut.id }).from(profitOut).limit(1);
    if (existingProfitOut.length === 0) {
      console.log('Seeding initial profit drawings...');
      await db.insert(profitOut).values([
        {
          recipient: 'Mohamed Raasith (Owner Draw)',
          distributionType: 'Owner Draw',
          amount: 80000,
          location: 'Main Outlet Akkaraipattu',
          locationId: 'LOC-AKK-01',
          userId: 1,
          userName: 'Mohamed Raasith',
          payType: 'Bank Transfer',
          accountName: 'Commercial Bank - Main Counter POS Terminal',
          date: '2026-09-30',
          notes: 'September 2026 monthly founder profit drawing',
        },
      ]);
    }
  } catch (error) {
    console.error('Database seeding error (non-fatal):', error);
  }
}
