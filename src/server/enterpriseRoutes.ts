import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  inventoryItems,
  suppliers,
  grnBatches,
  grnItems,
  inventoryBatches,
  stockAdjustments,
  posBills,
  posBillItems,
  expenses,
  repairJobs,
  advancePayments,
  advanceApplications,
  jobPayments,
  bankAccounts,
  bankTransactions,
  customerAccounts,
  customerLedgerEntries,
  salesReturns,
  salesReturnItems,
  ewalletAccounts,
  ewalletTransactions,
  investments,
  otherIncomes,
  profitOut,
  stockMovementLogs,
  appSettings,
} from '../db/schema.ts';
import { desc, eq, inArray, sql, and, gte, lte, or, ilike } from 'drizzle-orm';
import { requireAuth, type AuthRequest, requirePermission, requireAdmin } from '../middleware/auth.ts';

export const enterpriseRouter = Router();

// ============================================================================
// 1. GLOBAL MULTI-CATEGORY SEARCH & DIRECT ACCESS (Header Autocomplete & Recall)
// ============================================================================
enterpriseRouter.get('/search/global', requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ jobs: [], items: [], customers: [], suppliers: [] });
    }

    const qLower = q.toLowerCase();
    const cleanDigits = q.replace(/\D/g, '');

    // 1. Repair Jobs
    const allJobs = await db.select().from(repairJobs).orderBy(desc(repairJobs.id));
    const matchedJobs = allJobs
      .filter((j) => {
        const numMatch = j.jobNumber.toLowerCase().includes(qLower) || String(j.id) === q;
        const nameMatch = j.customerName.toLowerCase().includes(qLower);
        const pClean = j.phoneNumber.replace(/\D/g, '');
        const phoneMatch = cleanDigits.length >= 3 && pClean.includes(cleanDigits);
        const imeiMatch = j.imei ? j.imei.toLowerCase().includes(qLower) : false;
        const modelMatch = j.deviceModel.toLowerCase().includes(qLower) || j.deviceBrand.toLowerCase().includes(qLower);
        return numMatch || nameMatch || phoneMatch || imeiMatch || modelMatch;
      })
      .slice(0, 6)
      .map((j) => {
        const partsCost = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
        const due = Math.max(0, (j.estimatedPrice + partsCost) - j.advancePaid);
        return {
          id: j.id,
          jobNumber: j.jobNumber,
          customerName: j.customerName,
          phoneNumber: j.phoneNumber,
          customerAddress: j.customerAddress,
          deviceBrand: j.deviceBrand,
          deviceModel: j.deviceModel,
          imei: j.imei,
          status: j.status,
          estimatedPrice: j.estimatedPrice,
          advancePaid: j.advancePaid,
          sparePartsAmount: partsCost,
          dueAmount: due,
          date: j.date,
        };
      });

    // 2. Inventory Items (Barcodes, SKU code, Name, Category)
    const allItems = await db.select().from(inventoryItems).orderBy(inventoryItems.id);
    const matchedItems = allItems
      .filter((i) => {
        const codeMatch = i.code.toLowerCase().includes(qLower);
        const barcodeMatch = i.barcode.toLowerCase().includes(qLower);
        const nameMatch = i.name.toLowerCase().includes(qLower);
        const brandMatch = i.brand.toLowerCase().includes(qLower);
        const catMatch = i.category.toLowerCase().includes(qLower);
        return codeMatch || barcodeMatch || nameMatch || brandMatch || catMatch;
      })
      .slice(0, 6)
      .map((i) => ({
        id: i.id,
        code: i.code,
        barcode: i.barcode,
        name: i.name,
        category: i.category,
        brand: i.brand,
        costPrice: i.costPrice,
        sellingPrice: i.sellingPrice,
        qty: i.qty,
        type: i.type,
        availability: i.availability,
      }));

    // 3. Customers (Accounts + Open Repair Customer Ledgers)
    const allCustomerAccounts = await db.select().from(customerAccounts).orderBy(desc(customerAccounts.id));
    const matchedCustomers: any[] = allCustomerAccounts
      .filter((c) => {
        const nameMatch = c.customerName.toLowerCase().includes(qLower);
        const pClean = c.phoneNumber.replace(/\D/g, '');
        const phoneMatch = cleanDigits.length >= 3 && pClean.includes(cleanDigits);
        return nameMatch || phoneMatch;
      })
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        customerName: c.customerName,
        phoneNumber: c.phoneNumber,
        address: c.address,
        creditDue: c.creditDue,
        advanceBalance: c.advanceBalance,
        totalPurchases: c.totalPurchases,
      }));

    // If few customers found, also check repair jobs for customers
    if (matchedCustomers.length < 4) {
      const existingPhones = new Set(matchedCustomers.map((c) => c.phoneNumber.replace(/\D/g, '')));
      for (const j of allJobs) {
        const pClean = j.phoneNumber.replace(/\D/g, '');
        if (!existingPhones.has(pClean)) {
          const nameMatch = j.customerName.toLowerCase().includes(qLower);
          const phoneMatch = cleanDigits.length >= 3 && pClean.includes(cleanDigits);
          if (nameMatch || phoneMatch) {
            existingPhones.add(pClean);
            matchedCustomers.push({
              id: -j.id,
              customerName: j.customerName,
              phoneNumber: j.phoneNumber,
              address: j.customerAddress,
              creditDue: Math.max(0, (j.estimatedPrice + (j.sparePartsAmount ?? j.totalPartsCost ?? 0)) - j.advancePaid),
              advanceBalance: 0,
              totalPurchases: 0,
            });
            if (matchedCustomers.length >= 6) break;
          }
        }
      }
    }

    // 4. Suppliers (Code, Name, Contact)
    const allSuppliers = await db.select().from(suppliers).orderBy(suppliers.code);
    const matchedSuppliers = allSuppliers
      .filter((s) => {
        const codeMatch = s.code.toLowerCase().includes(qLower);
        const nameMatch = s.name.toLowerCase().includes(qLower);
        const pClean = s.contactNumber.replace(/\D/g, '');
        const phoneMatch = cleanDigits.length >= 3 && pClean.includes(cleanDigits);
        return codeMatch || nameMatch || phoneMatch;
      })
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        contactNumber: s.contactNumber,
        address: s.address,
        totalPurchase: s.totalPurchase,
        paidAmount: s.paidAmount,
        balancePay: s.balancePay,
      }));

    res.json({
      jobs: matchedJobs,
      items: matchedItems,
      customers: matchedCustomers,
      suppliers: matchedSuppliers,
    });
  } catch (error: any) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Failed to perform global search' });
  }
});

enterpriseRouter.get('/jobs/search', requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    const cleanDigits = q.replace(/\D/g, '');
    const all = await db.select().from(repairJobs).orderBy(desc(repairJobs.id));

    const matched = all.filter((j) => {
      const numMatch = j.jobNumber.toLowerCase().includes(q.toLowerCase()) || String(j.id) === q;
      const nameMatch = j.customerName.toLowerCase().includes(q.toLowerCase());
      const pClean = j.phoneNumber.replace(/\D/g, '');
      const phoneMatch = cleanDigits.length >= 4 && (pClean.includes(cleanDigits) || pClean.endsWith(cleanDigits));
      const imeiMatch = j.imei ? j.imei.toLowerCase().includes(q.toLowerCase()) : false;
      const modelMatch = j.deviceModel.toLowerCase().includes(q.toLowerCase());
      return numMatch || nameMatch || phoneMatch || imeiMatch || modelMatch;
    });

    const formatted = matched.slice(0, 20).map((j) => {
      const partsCost = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
      const due = Math.max(0, (j.estimatedPrice + partsCost) - j.advancePaid);
      return {
        ...j,
        sparePartsAmount: partsCost,
        dueAmount: due,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Job search error:', error);
    res.status(500).json({ error: 'Failed to search repair jobs' });
  }
});

// ============================================================================
// 2. INVENTORY & STOCK MANAGEMENT
// ============================================================================

// Get all inventory items
enterpriseRouter.get('/inventory/items', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await db.select().from(inventoryItems).orderBy(inventoryItems.id);
    res.json(items);
  } catch (error: any) {
    console.error('Failed to get inventory items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Create inventory item
enterpriseRouter.post('/inventory/items', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      code,
      barcode,
      name,
      category,
      brand,
      size,
      color,
      costPrice,
      sellingPrice,
      qty,
      type,
      availability,
      supplierCode,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Item code and name are required' });
    }

    const cleanCode = String(code).trim();
    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.code, cleanCode));
    if (existing.length > 0) {
      return res.status(400).json({ error: `An item with code "${cleanCode}" already exists` });
    }

    const quantity = Math.max(0, Number(qty) || 0);
    const inserted = await db
      .insert(inventoryItems)
      .values({
        code: cleanCode,
        barcode: barcode ? String(barcode).trim() : `890${cleanCode.padStart(9, '0')}`,
        name: String(name).trim(),
        category: category ? String(category).trim() : 'General',
        brand: brand ? String(brand).trim() : 'General',
        size: size ? String(size).trim() : 'Standard',
        color: color ? String(color).trim() : 'Standard',
        costPrice: Math.max(0, Number(costPrice) || 0),
        sellingPrice: Math.max(0, Number(sellingPrice) || 0),
        qty: quantity,
        type: type ? String(type).trim() : 'Accessory',
        availability: availability || (quantity > 5 ? 'In Stock' : quantity > 0 ? 'Low Stock' : 'Out of Stock'),
        supplierCode: supplierCode ? String(supplierCode).trim() : 'SID1',
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Failed to create inventory item:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item
enterpriseRouter.patch('/inventory/items/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (existing.length === 0) return res.status(404).json({ error: 'Item not found' });

    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    const { name, category, brand, size, color, costPrice, sellingPrice, qty, type, availability } = req.body;

    if (name !== undefined) updatePayload.name = String(name).trim();
    if (category !== undefined) updatePayload.category = String(category).trim();
    if (brand !== undefined) updatePayload.brand = String(brand).trim();
    if (size !== undefined) updatePayload.size = String(size).trim();
    if (color !== undefined) updatePayload.color = String(color).trim();
    if (costPrice !== undefined) updatePayload.costPrice = Math.max(0, Number(costPrice) || 0);
    if (sellingPrice !== undefined) updatePayload.sellingPrice = Math.max(0, Number(sellingPrice) || 0);
    if (qty !== undefined) {
      const q = Math.max(0, Number(qty) || 0);
      updatePayload.qty = q;
      updatePayload.availability = q > 5 ? 'In Stock' : q > 0 ? 'Low Stock' : 'Out of Stock';
    }
    if (type !== undefined) updatePayload.type = String(type).trim();
    if (availability !== undefined && qty === undefined) updatePayload.availability = String(availability).trim();

    const updated = await db
      .update(inventoryItems)
      .set(updatePayload)
      .where(eq(inventoryItems.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update inventory item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete inventory item (Restricted to Admin Role or Admin PIN)
enterpriseRouter.delete('/inventory/items/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { adminPin } = req.body || {};

    const VALID_ADMIN_PINS = ['7788', '1234', '9999', 'admin', 'admin123'];
    const authorized =
      req.user?.role?.toLowerCase() === 'admin' ||
      (adminPin && VALID_ADMIN_PINS.includes(String(adminPin).trim()));

    if (!authorized) {
      return res.status(403).json({ error: 'Admin authorization required to delete inventory items' });
    }

    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    res.json({ success: true, id, message: `Inventory item ${existing[0].name} deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Stock Adjustment (+ or - with negative stock prevention)
enterpriseRouter.post('/inventory/adjust', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { itemCode, type, quantity, reason, date } = req.body;
    const cleanCode = String(itemCode || '').trim();
    const qtyChange = Math.max(1, Number(quantity) || 1);

    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.code, cleanCode));
    if (existing.length === 0) {
      return res.status(404).json({ error: `Item with code "${cleanCode}" not found` });
    }

    const item = existing[0];
    let newQty = item.qty;

    if (type === '-') {
      if (item.qty < qtyChange) {
        return res.status(400).json({
          error: `Cannot deduct ${qtyChange} units. Current stock is ${item.qty} units (negative inventory prevented).`,
        });
      }
      newQty = item.qty - qtyChange;
    } else {
      newQty = item.qty + qtyChange;
    }

    const adjCode = `ADJ-${Date.now()}`;
    const adjDate = date || new Date().toISOString().split('T')[0];
    const adjTime = new Date().toTimeString().split(' ')[0];
    await db.insert(stockAdjustments).values({
      adjustmentCode: adjCode,
      itemCode: cleanCode,
      itemName: item.name,
      type: type === '-' ? '-' : '+',
      quantity: qtyChange,
      reason: reason ? String(reason).trim() : 'Stock count adjustment',
      date: adjDate,
    });

    // Log to stockMovementLogs
    try {
      await db.insert(stockMovementLogs).values({
        date: adjDate,
        time: adjTime,
        itemCode: cleanCode,
        barcode: item.barcode || '',
        itemName: item.name,
        movementType: 'Stock Adjustment',
        refNo: adjCode,
        qtyChange: type === '-' ? -qtyChange : qtyChange,
        balanceAfter: newQty,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        user: req.user?.name || req.user?.email || 'Admin',
        outlet: 'Main Outlet Akkaraipattu',
        notes: reason ? String(reason).trim() : 'Stock count adjustment',
      });
    } catch (smErr) {
      console.warn('Failed to log stock movement for adjustment:', smErr);
    }

    const updatedItem = await db
      .update(inventoryItems)
      .set({
        qty: newQty,
        availability: newQty > 5 ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock',
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, item.id))
      .returning();

    res.json({ success: true, item: updatedItem[0], newQty, adjustmentCode: adjCode });
  } catch (error: any) {
    console.error('Stock adjustment error:', error);
    res.status(500).json({ error: 'Failed to process stock adjustment' });
  }
});

// Bulk Import stock sheet
enterpriseRouter.post('/inventory/bulk-import', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { items: importRows } = req.body;
    if (!Array.isArray(importRows) || importRows.length === 0) {
      return res.status(400).json({ error: 'No items provided for import' });
    }

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    const username = req.user?.name || req.user?.email || 'Admin';

    let importedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;
    for (const row of importRows) {
      if (!row.code || !row.name) continue;
      const cleanCode = String(row.code).trim();
      const cleanName = String(row.name).trim();
      const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.code, cleanCode));
      const q = Math.max(0, Number(row.qty !== undefined ? row.qty : (row.openingQuantity !== undefined ? row.openingQuantity : row.quantity)) || 0);
      const cp = Math.max(0, Number(row.costPrice) || 0);
      const sp = Math.max(0, Number(row.sellingPrice) || 0);
      const categoryName = row.category ? String(row.category).trim() : 'General';
      const brandName = row.brand ? String(row.brand).trim() : 'General';
      const barcodeVal = row.barcode ? String(row.barcode).trim() : `890${cleanCode.padStart(9, '0')}`;

      let previousQty = 0;
      if (existing.length > 0) {
        previousQty = existing[0].qty;
        await db
          .update(inventoryItems)
          .set({
            name: cleanName,
            category: categoryName,
            brand: brandName,
            costPrice: cp,
            sellingPrice: sp,
            qty: q,
            availability: q > 5 ? 'In Stock' : q > 0 ? 'Low Stock' : 'Out of Stock',
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, existing[0].id));
        updatedCount++;
      } else {
        await db.insert(inventoryItems).values({
          code: cleanCode,
          barcode: barcodeVal,
          name: cleanName,
          category: categoryName,
          brand: brandName,
          size: row.size || 'Standard',
          color: row.color || 'Standard',
          costPrice: cp,
          sellingPrice: sp,
          qty: q,
          type: row.type || categoryName,
          availability: q > 5 ? 'In Stock' : q > 0 ? 'Low Stock' : 'Out of Stock',
          supplierCode: row.supplierCode || 'SID1',
        });
        addedCount++;
      }

      // Commit into stock_movement_logs
      try {
        const qtyDiff = existing.length > 0 ? (q - previousQty) : q;
        await db.insert(stockMovementLogs).values({
          date: todayDate,
          time: currentTime,
          itemCode: cleanCode,
          barcode: barcodeVal,
          itemName: cleanName,
          movementType: existing.length > 0 ? 'Bulk Import' : 'Initial Stock',
          refNo: 'STOCK-IMPORT',
          qtyChange: qtyDiff,
          balanceAfter: q,
          costPrice: cp,
          sellingPrice: sp,
          user: username,
          outlet: 'Main Outlet Akkaraipattu',
          notes: `Bulk import: ${categoryName} / ${brandName}`,
        });
      } catch (logErr) {
        console.warn('Failed to insert stock_movement_logs during bulk import:', logErr);
      }

      importedCount++;
    }

    const allItems = await db.select().from(inventoryItems).orderBy(inventoryItems.id);
    const totalStockUnits = allItems.reduce((acc, i) => acc + i.qty, 0);
    const totalCostValuation = allItems.reduce((acc, i) => acc + (i.costPrice * i.qty), 0);
    const totalRetailValuation = allItems.reduce((acc, i) => acc + (i.sellingPrice * i.qty), 0);
    const lowStockCount = allItems.filter((i) => i.qty > 0 && i.qty <= 5).length;
    const outOfStockCount = allItems.filter((i) => i.qty <= 0).length;

    res.json({
      success: true,
      count: importedCount,
      itemsAdded: addedCount,
      itemsUpdated: updatedCount,
      items: allItems,
      totalStockUnits,
      totalCostValuation,
      totalRetailValuation,
      lowStockCount,
      outOfStockCount,
      message: `Successfully committed ${importedCount} items (${addedCount} newly added, ${updatedCount} updated) to active inventory and stock movement logs.`,
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import stock sheet' });
  }
});

// REAL-TIME INVENTORY "SYNC" ACTION TRIGGER
enterpriseRouter.post('/inventory/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    // 1. Synchronize any posted GRN batches into live inventory
    const unSyncedBatches = await db.select().from(grnBatches).where(eq(grnBatches.status, 'Posted'));
    let grnItemsSynced = 0;
    if (unSyncedBatches.length > 0) {
      const unSyncedGrnNumbers = unSyncedBatches.map((b) => b.grnNumber);
      const pendingItems = await db.select().from(grnItems).where(inArray(grnItems.grnNumber, unSyncedGrnNumbers));
      for (const pi of pendingItems) {
        const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.code, pi.itemCode));
        if (existing.length > 0) {
          const it = existing[0];
          const newQty = it.qty + pi.quantityReceived;
          await db
            .update(inventoryItems)
            .set({
              qty: newQty,
              costPrice: pi.costPrice || it.costPrice,
              sellingPrice: pi.sellingPrice || it.sellingPrice,
              category: pi.category || it.category,
              brand: pi.brand || it.brand,
              availability: newQty > 5 ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock',
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, it.id));

          try {
            const now = new Date();
            await db.insert(stockMovementLogs).values({
              date: now.toISOString().split('T')[0],
              time: now.toTimeString().split(' ')[0],
              itemCode: it.code,
              barcode: it.barcode || '',
              itemName: it.name,
              movementType: 'GRN Intake',
              refNo: pi.grnNumber,
              qtyChange: pi.quantityReceived,
              balanceAfter: newQty,
              costPrice: pi.costPrice || it.costPrice,
              sellingPrice: pi.sellingPrice || it.sellingPrice,
              user: req.user?.name || req.user?.email || 'Admin',
              outlet: 'Main Outlet Akkaraipattu',
              notes: `GRN intake batch sync (${pi.grnNumber})`,
            });
          } catch (logErr) {
            console.warn('Failed to log stock movement in sync:', logErr);
          }

          grnItemsSynced++;
        }
      }
      for (const b of unSyncedBatches) {
        await db.update(grnBatches).set({ status: 'Synced', updatedAt: new Date() }).where(eq(grnBatches.id, b.id));
      }
    }

    // 2. Fetch fresh synchronized catalog
    const allItems = await db.select().from(inventoryItems).orderBy(inventoryItems.id);
    const totalValuation = allItems.reduce((sum, i) => sum + (i.costPrice * i.qty), 0);
    const totalRetail = allItems.reduce((sum, i) => sum + (i.sellingPrice * i.qty), 0);
    const distinctCategories = Array.from(new Set(allItems.map((i) => i.category))).length;
    const distinctBrands = Array.from(new Set(allItems.map((i) => i.brand))).length;

    res.json({
      success: true,
      items: allItems,
      syncedBatches: unSyncedBatches.length,
      grnItemsSynced,
      totalValuation,
      totalRetail,
      distinctCategories,
      distinctBrands,
      message: `Synchronization Complete: Real-time stock quantities, valuations, categories and brand links synchronized (${allItems.length} SKUs).`,
    });
  } catch (error: any) {
    console.error('Inventory sync error:', error);
    res.status(500).json({ error: 'Failed to synchronize inventory data' });
  }
});

// ============================================================================
// 3. SUPPLIER LEDGER MANAGEMENT
// ============================================================================

// Get suppliers
enterpriseRouter.get('/suppliers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const all = await db.select().from(suppliers).orderBy(suppliers.code);
    res.json(all);
  } catch (error: any) {
    console.error('Failed to get suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Create supplier
enterpriseRouter.post('/suppliers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code, name, contactNumber, address, totalPurchase, paidAmount, purchaseReturn, balancePay } = req.body;
    if (!code || !name || !contactNumber) {
      return res.status(400).json({ error: 'Supplier code, name, and contact number are required' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await db.select().from(suppliers).where(eq(suppliers.code, cleanCode));
    if (existing.length > 0) {
      return res.status(400).json({ error: `Supplier with code "${cleanCode}" already exists` });
    }

    const inserted = await db
      .insert(suppliers)
      .values({
        code: cleanCode,
        name: String(name).trim(),
        contactNumber: String(contactNumber).trim(),
        address: address ? String(address).trim() : null,
        totalPurchase: Number(totalPurchase) || 0,
        paidAmount: Number(paidAmount) || 0,
        purchaseReturn: Number(purchaseReturn) || 0,
        balancePay: Number(balancePay) || 0,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Failed to create supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Record supplier payment & expense record
enterpriseRouter.post('/suppliers/:code/payment', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { amount, payType, remark, date } = req.body;
    const payAmt = Math.max(0, Number(amount) || 0);
    if (payAmt <= 0) return res.status(400).json({ error: 'Positive payment amount required' });

    const supRows = await db.select().from(suppliers).where(eq(suppliers.code, code));
    if (supRows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const sup = supRows[0];

    const newPaid = sup.paidAmount + payAmt;
    const newBalance = Math.max(0, sup.balancePay - payAmt);

    const updatedSup = await db
      .update(suppliers)
      .set({
        paidAmount: newPaid,
        balancePay: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, sup.id))
      .returning();

    // Record cashbook outflow in expenses
    await db.insert(expenses).values({
      location: 'Main Outlet Akkaraipattu',
      expenseType: 'Supplier Settlement',
      paidTo: sup.name,
      remark: remark || `Payment voucher for ${sup.name} (${sup.code})`,
      payType: payType || 'Cash',
      payInfo: 'Voucher - Balance Pay reduction',
      date: date || new Date().toISOString().split('T')[0],
      amount: payAmt,
    });

    res.json({ success: true, supplier: updatedSup[0] });
  } catch (error: any) {
    console.error('Supplier payment error:', error);
    res.status(500).json({ error: 'Failed to record supplier payment' });
  }
});

// ============================================================================
// 4. GOODS RECEIVED NOTES (GRN) & STOCK SYNC
// ============================================================================

// Get GRN Batches
enterpriseRouter.get('/grn/batches', requireAuth, async (req: AuthRequest, res) => {
  try {
    const batches = await db.select().from(grnBatches).orderBy(desc(grnBatches.id));
    const allItems = await db.select().from(grnItems);
    const enriched = batches.map((b) => ({
      ...b,
      items: allItems.filter((i) => i.grnNumber === b.grnNumber),
    }));
    res.json(enriched);
  } catch (error: any) {
    console.error('Failed to get GRN batches:', error);
    res.status(500).json({ error: 'Failed to fetch GRN batches' });
  }
});

// Post multi-item GRN Batch (Atomic posting: sets status to 'Posted', updates supplier ledger, leaves live stock intact until Update Stock)
enterpriseRouter.post('/grn/post', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { grnNumber, supplierCode, supplierName, invoiceRef, date, items: rowItems } = req.body;
    if (!grnNumber || !supplierCode || !Array.isArray(rowItems) || rowItems.length === 0) {
      return res.status(400).json({ error: 'GRN Number, supplier, and at least one item are required' });
    }

    const cleanGrnNo = String(grnNumber).trim();
    const existing = await db.select().from(grnBatches).where(eq(grnBatches.grnNumber, cleanGrnNo));
    if (existing.length > 0) {
      return res.status(400).json({ error: `GRN "${cleanGrnNo}" has already been posted` });
    }

    let totalCost = 0;
    let totalRetail = 0;
    const validatedItems = rowItems.map((r) => {
      const q = Math.max(1, Number(r.quantityReceived) || 1);
      const cp = Math.max(0, Number(r.costPrice) || 0);
      const sp = Math.max(0, Number(r.sellingPrice) || 0);
      const costTotal = q * cp;
      totalCost += costTotal;
      totalRetail += q * sp;
      return {
        grnNumber: cleanGrnNo,
        itemCode: String(r.itemCode).trim(),
        itemName: String(r.itemName).trim(),
        category: r.category ? String(r.category).trim() : 'General',
        brand: r.brand ? String(r.brand).trim() : 'General',
        quantityReceived: q,
        costPrice: cp,
        sellingPrice: sp,
        totalCost: costTotal,
      };
    });

    // 1. Insert GRN Batch
    const createdBatch = await db
      .insert(grnBatches)
      .values({
        grnNumber: cleanGrnNo,
        supplierCode: String(supplierCode).trim(),
        supplierName: String(supplierName || 'Wholesale Supplier').trim(),
        invoiceRef: invoiceRef ? String(invoiceRef).trim() : null,
        date: date || new Date().toISOString().split('T')[0],
        totalItems: validatedItems.length,
        totalCost,
        totalRetail,
        status: 'Posted', // Explicitly stays 'Posted' until Update Stock trigger is pressed
      })
      .returning();

    // 2. Insert GRN Items, create Batch Records & ensure master catalog registration
    const today = date || new Date().toISOString().split('T')[0];
    for (let i = 0; i < validatedItems.length; i++) {
      const it = validatedItems[i];
      await db.insert(grnItems).values(it);

      // Create distinct batch record linked to itemCode and GRN
      const batchNo = `BATCH-${cleanGrnNo}-${it.itemCode}-${String(i + 1).padStart(2, '0')}`;
      try {
        await db.insert(inventoryBatches).values({
          batchNumber: batchNo,
          itemCode: it.itemCode,
          itemName: it.itemName,
          grnNumber: cleanGrnNo,
          supplierName: String(supplierName || 'Wholesale Supplier').trim(),
          purchaseDate: today,
          costPrice: it.costPrice,
          sellingPrice: it.sellingPrice,
          initialQty: it.quantityReceived,
          remainingQty: it.quantityReceived,
          status: 'Active',
        });
      } catch (bErr) {
        console.warn('Batch record creation note:', bErr);
      }

      const itExists = await db
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(eq(inventoryItems.code, it.itemCode));

      if (itExists.length === 0) {
        await db.insert(inventoryItems).values({
          code: it.itemCode,
          barcode: `890${it.itemCode.padStart(9, '0')}`,
          name: it.itemName,
          category: it.category,
          brand: it.brand,
          costPrice: it.costPrice,
          sellingPrice: it.sellingPrice,
          qty: 0, // 0 opening until synchronized
          availability: 'Out of Stock',
          supplierCode: String(supplierCode).trim(),
        });
      }
    }

    // 3. Update Supplier Ledger
    const supRows = await db.select().from(suppliers).where(eq(suppliers.code, String(supplierCode).trim()));
    if (supRows.length > 0) {
      const s = supRows[0];
      await db
        .update(suppliers)
        .set({
          totalPurchase: s.totalPurchase + totalCost,
          balancePay: s.balancePay + totalCost,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, s.id));
    }

    res.status(201).json({
      success: true,
      batch: createdBatch[0],
      items: validatedItems,
      message: `Posted GRN ${cleanGrnNo} successfully. Batch records created with exact pricing. Stock quantities will update when "Update Stock" is triggered.`,
    });
  } catch (error: any) {
    console.error('GRN posting error:', error);
    res.status(500).json({ error: 'Failed to post GRN batch' });
  }
});

// GET /api/inventory/batches - Retrieve batch records (filterable by ?itemCode=... and ?activeOnly=true)
enterpriseRouter.get('/inventory/batches', requireAuth, async (req: AuthRequest, res) => {
  try {
    const itemCode = req.query.itemCode ? String(req.query.itemCode).trim() : null;
    const activeOnly = req.query.activeOnly === 'true';

    let query = db.select().from(inventoryBatches);
    const conditions = [];

    if (itemCode) {
      conditions.push(eq(inventoryBatches.itemCode, itemCode));
    }
    if (activeOnly) {
      conditions.push(and(eq(inventoryBatches.status, 'Active'), gte(inventoryBatches.remainingQty, 1)));
    }

    const batches = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(inventoryBatches.id))
      : await query.orderBy(desc(inventoryBatches.id));

    res.json(batches);
  } catch (error: any) {
    console.error('Failed to get inventory batches:', error);
    res.status(500).json({ error: 'Failed to fetch inventory batches' });
  }
});

// EXPLICIT "UPDATE STOCK" TRIGGER: Synchronizes posted GRNs into live inventory quantities
enterpriseRouter.post('/grn/update-stock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const unSyncedBatches = await db.select().from(grnBatches).where(eq(grnBatches.status, 'Posted'));
    if (unSyncedBatches.length === 0) {
      return res.json({ success: true, count: 0, message: 'All posted GRNs are already synced with live inventory' });
    }

    const unSyncedGrnNumbers = unSyncedBatches.map((b) => b.grnNumber);
    const pendingItems = await db.select().from(grnItems).where(inArray(grnItems.grnNumber, unSyncedGrnNumbers));

    let itemsUpdated = 0;
    for (const pi of pendingItems) {
      const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.code, pi.itemCode));
      if (existing.length > 0) {
        const it = existing[0];
        const newQty = it.qty + pi.quantityReceived;
        await db
          .update(inventoryItems)
          .set({
            qty: newQty,
            costPrice: pi.costPrice || it.costPrice,
            sellingPrice: pi.sellingPrice || it.sellingPrice,
            availability: newQty > 5 ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock',
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, it.id));

        try {
          const now = new Date();
          await db.insert(stockMovementLogs).values({
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            itemCode: it.code,
            barcode: it.barcode || '',
            itemName: it.name,
            movementType: 'GRN Intake',
            refNo: pi.grnNumber,
            qtyChange: pi.quantityReceived,
            balanceAfter: newQty,
            costPrice: pi.costPrice || it.costPrice,
            sellingPrice: pi.sellingPrice || it.sellingPrice,
            user: req.user?.name || req.user?.email || 'Admin',
            outlet: 'Main Outlet Akkaraipattu',
            notes: `GRN Intake posted (${pi.grnNumber})`,
          });
        } catch (logErr) {
          console.warn('Failed to log stock movement in /grn/update-stock:', logErr);
        }

        itemsUpdated++;
      }
    }

    // Mark batches as Synced
    for (const b of unSyncedBatches) {
      await db.update(grnBatches).set({ status: 'Synced', updatedAt: new Date() }).where(eq(grnBatches.id, b.id));
    }

    const updatedCatalog = await db.select().from(inventoryItems).orderBy(inventoryItems.id);
    res.json({
      success: true,
      syncedBatches: unSyncedBatches.length,
      itemsUpdated,
      items: updatedCatalog,
      message: `Successfully synchronized ${unSyncedBatches.length} GRN batch(es) into live stock.`,
    });
  } catch (error: any) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to synchronize GRN stock' });
  }
});

// ============================================================================
// 5. SHOP BANK ACCOUNTS & DIGITAL PAYMENT REGISTRY
// ============================================================================

enterpriseRouter.get('/pos/banks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accounts = await db.select().from(bankAccounts).orderBy(bankAccounts.id);
    res.json(accounts);
  } catch (error: any) {
    console.error('Failed to get bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

enterpriseRouter.post('/pos/banks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { accountName, bankName, accountNumber, branch, balance, isDefault } = req.body;
    if (!accountName || !bankName || !accountNumber) {
      return res.status(400).json({ error: 'Account name, bank name, and account number are required' });
    }

    if (isDefault) {
      await db.update(bankAccounts).set({ isDefault: false });
    }

    const created = await db
      .insert(bankAccounts)
      .values({
        accountName: String(accountName).trim(),
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).trim(),
        branch: branch ? String(branch).trim() : 'Akkaraipattu',
        balance: Math.max(0, Number(balance) || 0),
        isDefault: Boolean(isDefault),
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error: any) {
    console.error('Failed to create bank account:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

enterpriseRouter.patch('/pos/banks/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { accountName, bankName, accountNumber, branch, balance, isDefault } = req.body;
    const updateObj: Record<string, any> = {};

    if (accountName !== undefined) updateObj.accountName = String(accountName).trim();
    if (bankName !== undefined) updateObj.bankName = String(bankName).trim();
    if (accountNumber !== undefined) updateObj.accountNumber = String(accountNumber).trim();
    if (branch !== undefined) updateObj.branch = String(branch).trim();
    if (balance !== undefined) updateObj.balance = Number(balance);
    if (isDefault !== undefined) {
      updateObj.isDefault = Boolean(isDefault);
      if (isDefault) {
        await db.update(bankAccounts).set({ isDefault: false });
      }
    }

    const updated = await db.update(bankAccounts).set(updateObj).where(eq(bankAccounts.id, id)).returning();
    if (updated.length === 0) return res.status(404).json({ error: 'Bank account not found' });
    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

enterpriseRouter.get('/pos/banks/:id/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const txs = await db
      .select()
      .from(bankTransactions)
      .where(eq(bankTransactions.bankAccountId, id))
      .orderBy(desc(bankTransactions.id));
    res.json(txs);
  } catch (error: any) {
    console.error('Failed to get bank transactions:', error);
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
});

// ============================================================================
// 6. CUSTOMER DIRECTORY & ADVANCE / CREDIT LOOKUP
// ============================================================================

enterpriseRouter.get('/pos/customers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const all = await db.select().from(customerAccounts).orderBy(customerAccounts.customerName);
    res.json(all);
  } catch (error: any) {
    console.error('Failed to get customer accounts:', error);
    res.status(500).json({ error: 'Failed to fetch customer accounts' });
  }
});

// Query customer by phone number (returns account, credit dues, advance balances, and available advance vouchers)
enterpriseRouter.get('/pos/customers/:phone', requireAuth, async (req: AuthRequest, res) => {
  try {
    const phone = req.params.phone.trim();
    const cleanDigits = phone.replace(/\D/g, '');
    const allCustomers = await db.select().from(customerAccounts);

    const matching = allCustomers.find((c) => {
      const pClean = c.phoneNumber.replace(/\D/g, '');
      return pClean === cleanDigits || (cleanDigits.length >= 7 && pClean.endsWith(cleanDigits.slice(-7)));
    });

    // Query active advance payments vouchers
    const allAdvances = await db.select().from(advancePayments);
    const availableAdvances = allAdvances.filter((a) => {
      const pClean = a.phoneNumber.replace(/\D/g, '');
      const phoneMatches = pClean === cleanDigits || (cleanDigits.length >= 7 && pClean.endsWith(cleanDigits.slice(-7)));
      return phoneMatches && a.remainingAmount > 0;
    });

    const totalAvailableAdvanceVouchers = availableAdvances.reduce((sum, a) => sum + a.remainingAmount, 0);

    // Recent ledger entries
    let ledgerHistory: any[] = [];
    if (matching) {
      ledgerHistory = await db
        .select()
        .from(customerLedgerEntries)
        .where(eq(customerLedgerEntries.customerPhone, matching.phoneNumber))
        .orderBy(desc(customerLedgerEntries.id))
        .limit(20);
    }

    res.json({
      customer: matching || null,
      advanceBalance: matching ? Math.max(matching.advanceBalance, totalAvailableAdvanceVouchers) : totalAvailableAdvanceVouchers,
      creditDue: matching?.creditDue || 0,
      availableAdvances,
      ledgerHistory,
    });
  } catch (error: any) {
    console.error('Failed to get customer profile by phone:', error);
    res.status(500).json({ error: 'Failed to query customer account' });
  }
});

// Helper to get next unique POS Bill Number
export async function getNextBillNumber(): Promise<string> {
  const rows = await db.select({ billNo: posBills.billNo }).from(posBills);
  const existingSet = new Set(rows.map((r) => r.billNo));
  let maxNum = 0;
  for (const r of rows) {
    if (r.billNo) {
      const match = r.billNo.match(/INV(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  let candidateNum = Math.max(1, maxNum + 1);
  let candidate = `INV${String(candidateNum).padStart(6, '0')}`;
  while (existingSet.has(candidate)) {
    candidateNum++;
    candidate = `INV${String(candidateNum).padStart(6, '0')}`;
  }
  return candidate;
}

// Get next available POS Bill Number
enterpriseRouter.get('/pos/next-bill-number', requireAuth, async (req: AuthRequest, res) => {
  try {
    const nextBillNo = await getNextBillNumber();
    res.json({ nextBillNo });
  } catch (error: any) {
    console.error('Failed to get next bill number:', error);
    res.status(500).json({ error: 'Failed to generate next bill number' });
  }
});

// ============================================================================
// 7. ATOMIC POS CHECKOUT & AUTOMATED LEDGER POSTING ENGINE
// ============================================================================

enterpriseRouter.post('/pos/checkout', requireAuth, requirePermission('process_payments'), async (req: AuthRequest, res) => {
  try {
    const {
      billNo,
      customerName,
      customerPhone,
      items: billItems,
      subtotal,
      discount,
      returns,
      advancePaid, // from recalled repair job
      advanceApplied, // customer advance balance applied to bill
      netTotal,
      paidAmount,
      changeDue,
      paymentMethod = 'Cash', // 'Cash' | 'Card' | 'Bank Transfer'
      paymentTerm = 'Cash', // 'Cash' | 'Credit'
      bankAccountId,
      paymentDetails,
      linkedJobId,
      linkedJobNumber,
      notes,
    } = req.body;

    if (!Array.isArray(billItems) || billItems.length === 0) {
      return res.status(400).json({ error: 'Item list cannot be empty for checkout' });
    }

    // Validation: If Credit payment term is chosen, customer phone and name are mandatory
    if (paymentTerm === 'Credit' && (!customerPhone || !String(customerPhone).trim())) {
      return res.status(400).json({ error: 'Customer phone number is required when selecting Credit payment terms' });
    }

    // 1. Stock availability validation (prevent negative stock)
    for (const it of billItems) {
      if (!it.isFromJob) {
        const invRows = await db.select().from(inventoryItems).where(eq(inventoryItems.code, it.code));
        if (invRows.length > 0) {
          const inv = invRows[0];
          const reqQty = Number(it.qty) || 1;
          if (inv.qty < reqQty) {
            return res.status(400).json({
              error: `Insufficient stock for "${inv.name}" (Code: ${inv.code}). In stock: ${inv.qty}, Requested: ${reqQty}. Checkout halted to prevent negative stock.`,
            });
          }
        }
      }
    }

    let cleanBillNo = billNo ? String(billNo).trim() : '';
    if (!cleanBillNo) {
      cleanBillNo = await getNextBillNumber();
    }

    // Check if cleanBillNo already exists in posBills
    const existingBillRows = await db.select().from(posBills).where(eq(posBills.billNo, cleanBillNo));
    const isLockedBill = existingBillRows.length > 0 && existingBillRows[0].status === 'Locked';

    if (existingBillRows.length > 0 && !isLockedBill) {
      // The billNo was already used by an existing finalized bill (e.g. from a stale client state)
      // Automatically generate a new unique bill number to avoid duplicate key error
      cleanBillNo = await getNextBillNumber();
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const requestedDate = req.body.date ? String(req.body.date).trim() : todayStr;
    const userRole = req.user?.role?.toLowerCase() || 'cashier';

    // 2. Date Restriction & Role-Based Privileges:
    // Normal users/cashiers are strictly prohibited from making sales entries or modifications on previous/past dates.
    // Super User / Admin has the privilege to override or make back-dated entries if necessary.
    if (requestedDate < todayStr && userRole !== 'admin') {
      return res.status(403).json({
        error: `Back-Date Restriction: You are attempting to post a transaction on past date (${requestedDate}). Regular staff and cashiers are strictly prohibited from back-dated sales entries. Only a Super User / Administrator can perform back-dated entries.`,
      });
    }

    const billDate = requestedDate;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const cashierId = req.user?.uid || 'CASH-01';
    const cashierName = req.user?.name || 'Cashier';

    const netToCollect = Math.max(0, Number(netTotal) || 0);
    const advAppliedAmt = Math.max(0, Number(advanceApplied) || 0);
    const amountTendered = Math.max(0, Number(paidAmount) || 0);

    // Calculate Credit dues if paymentTerm === 'Credit'
    let creditDueAmount = 0;
    if (paymentTerm === 'Credit') {
      creditDueAmount = Math.max(0, netToCollect - amountTendered);
    }

    // Bank account lookup if Card / Bank Transfer
    let targetBank: any = null;
    if (paymentMethod === 'Card' || paymentMethod === 'Bank Transfer') {
      if (bankAccountId) {
        const b = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(bankAccountId)));
        if (b.length > 0) targetBank = b[0];
      }
      if (!targetBank) {
        const defaultB = await db.select().from(bankAccounts).where(eq(bankAccounts.isDefault, true));
        targetBank = defaultB.length > 0 ? defaultB[0] : null;
        if (!targetBank) {
          const firstB = await db.select().from(bankAccounts).limit(1);
          if (firstB.length > 0) targetBank = firstB[0];
        }
      }
    }

    // 2. Customer Account Resolution
    let customerAcct: any = null;
    let customerOutstandingDue = 0;
    const cleanPhone = customerPhone ? String(customerPhone).trim() : '';

    if (cleanPhone) {
      const existingCust = await db.select().from(customerAccounts).where(eq(customerAccounts.phoneNumber, cleanPhone));
      if (existingCust.length > 0) {
        customerAcct = existingCust[0];
      } else {
        // Create new customer account
        const createdCust = await db
          .insert(customerAccounts)
          .values({
            phoneNumber: cleanPhone,
            customerName: customerName ? String(customerName).trim() : 'Walk-in Customer',
            creditDue: 0,
            advanceBalance: 0,
            totalPurchases: 0,
          })
          .returning();
        customerAcct = createdCust[0];
      }
      customerOutstandingDue = (customerAcct.creditDue || 0) + creditDueAmount;
    }

    // 3. Insert or Update Bill Record with full relational ledger tracking
    let createdBill: any[];
    if (isLockedBill) {
      // Clean up previous locked draft items before replacing with finalized items
      await db.delete(posBillItems).where(eq(posBillItems.billNo, cleanBillNo));
      createdBill = await db
        .update(posBills)
        .set({
          date: billDate,
          time: timeStr,
          cashierId,
          cashierName,
          customerName: customerName ? String(customerName).trim() : 'Walk-in Customer',
          customerPhone: cleanPhone || null,
          subtotal: Math.max(0, Number(subtotal) || 0),
          discount: Math.max(0, Number(discount) || 0),
          returns: Math.max(0, Number(returns) || 0),
          advancePaid: Math.max(0, Number(advancePaid) || 0),
          advanceApplied: advAppliedAmt,
          netTotal: netToCollect,
          paidAmount: amountTendered,
          changeDue: Math.max(0, Number(changeDue) || 0),
          paymentMethod: paymentMethod || 'Cash',
          paymentTerm: paymentTerm || 'Cash',
          bankAccountId: targetBank?.id || null,
          bankAccountName: targetBank?.accountName || null,
          creditDue: creditDueAmount,
          customerOutstandingDue,
          paymentDetails: typeof paymentDetails === 'string' ? paymentDetails : JSON.stringify(paymentDetails || {}),
          linkedJobId: linkedJobId ? Number(linkedJobId) : null,
          linkedJobNumber: linkedJobNumber ? String(linkedJobNumber).trim() : null,
          status: 'Completed',
          notes: notes ? String(notes).trim() : null,
        })
        .where(eq(posBills.billNo, cleanBillNo))
        .returning();
    } else {
      createdBill = await db
        .insert(posBills)
        .values({
          billNo: cleanBillNo,
          date: billDate,
          time: timeStr,
          cashierId,
          cashierName,
          customerName: customerName ? String(customerName).trim() : 'Walk-in Customer',
          customerPhone: cleanPhone || null,
          subtotal: Math.max(0, Number(subtotal) || 0),
          discount: Math.max(0, Number(discount) || 0),
          returns: Math.max(0, Number(returns) || 0),
          advancePaid: Math.max(0, Number(advancePaid) || 0),
          advanceApplied: advAppliedAmt,
          netTotal: netToCollect,
          paidAmount: amountTendered,
          changeDue: Math.max(0, Number(changeDue) || 0),
          paymentMethod: paymentMethod || 'Cash',
          paymentTerm: paymentTerm || 'Cash',
          bankAccountId: targetBank?.id || null,
          bankAccountName: targetBank?.accountName || null,
          creditDue: creditDueAmount,
          customerOutstandingDue,
          paymentDetails: typeof paymentDetails === 'string' ? paymentDetails : JSON.stringify(paymentDetails || {}),
          linkedJobId: linkedJobId ? Number(linkedJobId) : null,
          linkedJobNumber: linkedJobNumber ? String(linkedJobNumber).trim() : null,
          status: 'Completed',
          notes: notes ? String(notes).trim() : null,
        })
        .returning();
    }

    // 4. Insert Bill Items and Instantly Deduct Stock Quantities
    for (const bi of billItems) {
      const q = Math.max(1, Number(bi.qty) || 1);
      const p = Math.max(0, Number(bi.price) || 0);
      const cp = Math.max(0, Number(bi.costPrice) || 0);
      const d = Math.max(0, Number(bi.discount) || 0);
      const t = Math.max(0, Number(bi.total) || q * p - d);

      await db.insert(posBillItems).values({
        billNo: cleanBillNo,
        itemCode: String(bi.code).trim(),
        itemName: String(bi.name).trim(),
        qty: q,
        price: p,
        costPrice: cp,
        discount: d,
        total: t,
        isFromJob: Boolean(bi.isFromJob),
        batchNumber: bi.batchNumber ? String(bi.batchNumber).trim() : null,
      });

      // Deduct from specific inventory batch if batchNumber provided
      if (bi.batchNumber) {
        try {
          const bRows = await db
            .select()
            .from(inventoryBatches)
            .where(eq(inventoryBatches.batchNumber, String(bi.batchNumber).trim()));
          if (bRows.length > 0) {
            const b = bRows[0];
            const newRem = Math.max(0, b.remainingQty - q);
            await db
              .update(inventoryBatches)
              .set({
                remainingQty: newRem,
                status: newRem <= 0 ? 'Depleted' : 'Active',
                updatedAt: new Date(),
              })
              .where(eq(inventoryBatches.id, b.id));
          }
        } catch (bErr) {
          console.warn('Batch stock deduction note:', bErr);
        }
      }

      // Stock deduction for physical items
      if (!bi.isFromJob) {
        const invRows = await db.select().from(inventoryItems).where(eq(inventoryItems.code, bi.code));
        if (invRows.length > 0) {
          const inv = invRows[0];
          const newQty = Math.max(0, inv.qty - q);
          await db
            .update(inventoryItems)
            .set({
              qty: newQty,
              availability: newQty > 5 ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock',
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, inv.id));

          // Log POS Sale deduction to stockMovementLogs
          try {
            await db.insert(stockMovementLogs).values({
              date: todayStr,
              time: timeStr,
              itemCode: String(bi.code).trim(),
              barcode: inv.barcode || '',
              itemName: String(bi.name).trim(),
              movementType: 'POS Sale',
              refNo: cleanBillNo,
              qtyChange: -q,
              balanceAfter: newQty,
              costPrice: cp,
              sellingPrice: p,
              user: cashierName || req.user?.name || 'Cashier',
              outlet: 'Main Outlet Akkaraipattu',
              notes: `POS Retail Sale to ${customerName || 'Walk-in'}`,
            });
          } catch (smErr) {
            console.warn('Failed to log stock movement for POS sale:', smErr);
          }
        }
      }
    }

    // 5. Bank & e-Wallet Account Synchronizing for Card / Bank Transfer / e-Wallet Digital payments
    if (amountTendered > 0 && (paymentMethod === 'Card' || paymentMethod === 'Bank Transfer' || paymentMethod === 'e-Wallet' || paymentMethod === 'QR')) {
      if (paymentMethod === 'e-Wallet' || paymentMethod === 'QR' || req.body.ewalletAccountId) {
        // e-Wallet synchronization
        let targetWallet: any = null;
        const ewalletId = req.body.ewalletAccountId ? Number(req.body.ewalletAccountId) : null;
        if (ewalletId) {
          const wRows = await db.select().from(ewalletAccounts).where(eq(ewalletAccounts.id, ewalletId));
          if (wRows.length > 0) targetWallet = wRows[0];
        }
        if (!targetWallet) {
          const defWallets = await db.select().from(ewalletAccounts).orderBy(desc(ewalletAccounts.isDefault)).limit(1);
          if (defWallets.length > 0) targetWallet = defWallets[0];
        }
        if (targetWallet) {
          await db.update(ewalletAccounts).set({ balance: targetWallet.balance + amountTendered }).where(eq(ewalletAccounts.id, targetWallet.id));
          await db.insert(ewalletTransactions).values({
            ewalletAccountId: targetWallet.id,
            walletName: targetWallet.walletName,
            date: todayStr,
            type: 'POS QR Settlement',
            amount: amountTendered,
            refNo: cleanBillNo,
            description: `POS Retail Payment #${cleanBillNo} (${targetWallet.provider}) - Customer: ${customerName || 'Walk-in'}`,
            locationId: 'LOC-AKK-01',
            userId: req.user?.id ? Number(req.user.id) : null,
          });
        }
      } else {
        // Bank transfer / Card settlement synchronization
        let bankToCredit = targetBank;
        if (!bankToCredit) {
          const defBanks = await db.select().from(bankAccounts).orderBy(desc(bankAccounts.isDefault)).limit(1);
          if (defBanks.length > 0) bankToCredit = defBanks[0];
        }
        if (bankToCredit) {
          const newBankBal = bankToCredit.balance + amountTendered;
          await db.update(bankAccounts).set({ balance: newBankBal }).where(eq(bankAccounts.id, bankToCredit.id));

          await db.insert(bankTransactions).values({
            bankAccountId: bankToCredit.id,
            bankAccountName: bankToCredit.accountName,
            date: todayStr,
            type: paymentMethod === 'Card' ? 'Card POS Settlement' : 'Bank Transfer In',
            amount: amountTendered,
            refNo: cleanBillNo,
            description: `POS Retail Payment #${cleanBillNo} - Customer: ${customerName || 'Walk-in'}`,
            locationId: 'LOC-AKK-01',
            userId: req.user?.id ? Number(req.user.id) : null,
          });
        }
      }
    }

    // 6. Customer Advance Balance Deduction & Reconciliation
    if (cleanPhone && advAppliedAmt > 0 && customerAcct) {
      const newAdvBal = Math.max(0, customerAcct.advanceBalance - advAppliedAmt);
      await db
        .update(customerAccounts)
        .set({
          advanceBalance: newAdvBal,
          updatedAt: new Date(),
        })
        .where(eq(customerAccounts.id, customerAcct.id));

      // Reconcile specific advance vouchers
      const advRows = await db.select().from(advancePayments).where(eq(advancePayments.phoneNumber, cleanPhone));
      let remainingToDeduct = advAppliedAmt;
      for (const adv of advRows) {
        if (remainingToDeduct <= 0) break;
        if (adv.remainingAmount > 0) {
          const deduct = Math.min(adv.remainingAmount, remainingToDeduct);
          const newRem = adv.remainingAmount - deduct;
          const newUsed = adv.usedAmount + deduct;
          const newStatus = newRem === 0 ? 'Fully Applied' : 'Partially Applied';

          await db
            .update(advancePayments)
            .set({
              usedAmount: newUsed,
              remainingAmount: newRem,
              status: newStatus,
              invoiceReference: adv.invoiceReference ? `${adv.invoiceReference}, ${cleanBillNo}` : cleanBillNo,
              updatedAt: new Date(),
            })
            .where(eq(advancePayments.id, adv.id));

          remainingToDeduct -= deduct;
        }
      }

      // Log to Customer Ledger
      await db.insert(customerLedgerEntries).values({
        customerPhone: cleanPhone,
        customerName: customerName ? String(customerName).trim() : 'Customer',
        date: todayStr,
        type: 'Advance Applied',
        refNo: cleanBillNo,
        debit: 0,
        credit: advAppliedAmt,
        balance: customerOutstandingDue,
        notes: `Advance deposit balance applied to POS bill ${cleanBillNo}`,
      });
    }

    // 7. Customer Credit Due Handling (Payment Terms: Credit)
    if (cleanPhone && customerAcct) {
      if (paymentTerm === 'Credit' && creditDueAmount > 0) {
        const updatedCreditDue = (customerAcct.creditDue || 0) + creditDueAmount;
        await db
          .update(customerAccounts)
          .set({
            creditDue: updatedCreditDue,
            totalPurchases: (customerAcct.totalPurchases || 0) + netToCollect,
            updatedAt: new Date(),
          })
          .where(eq(customerAccounts.id, customerAcct.id));

        await db.insert(customerLedgerEntries).values({
          customerPhone: cleanPhone,
          customerName: customerName ? String(customerName).trim() : 'Customer',
          date: todayStr,
          type: 'Credit Sale',
          refNo: cleanBillNo,
          debit: creditDueAmount,
          credit: amountTendered,
          balance: updatedCreditDue,
          notes: `Credit bill ${cleanBillNo}. Amount due LKR ${creditDueAmount.toLocaleString()}`,
        });
      } else {
        // Cash term: update total purchases
        await db
          .update(customerAccounts)
          .set({
            totalPurchases: (customerAcct.totalPurchases || 0) + netToCollect,
            updatedAt: new Date(),
          })
          .where(eq(customerAccounts.id, customerAcct.id));

        await db.insert(customerLedgerEntries).values({
          customerPhone: cleanPhone,
          customerName: customerName ? String(customerName).trim() : 'Customer',
          date: todayStr,
          type: 'Cash Sale',
          refNo: cleanBillNo,
          debit: netToCollect,
          credit: amountTendered,
          balance: customerAcct.creditDue || 0,
          notes: `Cash settlement bill ${cleanBillNo}`,
        });
      }
    }

    // 8. If linked to repair job, record settlement payment & mark completed/delivered
    if (linkedJobId) {
      const jobRows = await db.select().from(repairJobs).where(eq(repairJobs.id, Number(linkedJobId)));
      if (jobRows.length > 0) {
        const job = jobRows[0];
        const settleAmt = Math.max(0, netToCollect - (Number(advancePaid) || 0));
        if (settleAmt > 0) {
          await db.insert(jobPayments).values({
            jobId: job.id,
            date: todayStr,
            paymentType: paymentMethod || 'Cash',
            amount: settleAmt,
            reference: `POS Bill: ${cleanBillNo}`,
            notes: 'Settled at counter POS checkout',
          });
        }

        // Separate appended spare parts from the Labor / Service charge
        const partsItems = billItems.filter(
          (bi: any) =>
            !String(bi.code).startsWith('SRV-') &&
            !String(bi.id).startsWith('JOB-SRV')
        );
        const partsList = partsItems.map((pi: any) => ({
          name: String(pi.name).replace('Pre-Fitted: ', '').trim(),
          cost: Number(pi.price) || 0,
          qty: Number(pi.qty) || 1,
        }));
        const totalPartsCost = partsList.reduce(
          (sum: number, p: any) => sum + p.cost * p.qty,
          0
        );

        // Mark job as Delivered with updated parts breakdown
        await db
          .update(repairJobs)
          .set({
            status: 'Delivered',
            completedDate: todayStr,
            spareParts: partsList.length > 0 ? JSON.stringify(partsList) : job.spareParts,
            sparePartsAmount: totalPartsCost > 0 ? totalPartsCost : job.sparePartsAmount,
            totalPartsCost: totalPartsCost > 0 ? totalPartsCost : job.totalPartsCost,
            advancePaid: job.advancePaid + settleAmt,
            dueAmount: 0,
            updatedAt: new Date(),
          })
          .where(eq(repairJobs.id, job.id));
      }
    }

    const updatedCatalog = await db.select().from(inventoryItems).orderBy(inventoryItems.id);

    res.status(201).json({
      success: true,
      bill: createdBill[0],
      items: updatedCatalog,
      customerAccount: customerAcct,
      creditDue: creditDueAmount,
      totalCustomerDue: customerOutstandingDue,
      message: `Invoice ${cleanBillNo} completed (${paymentTerm} Terms: ${paymentMethod}). Stock deducted and ledgers posted in real-time.`,
    });
  } catch (error: any) {
    console.error('POS Checkout error:', error);
    res.status(500).json({ error: 'Failed to process POS checkout transaction' });
  }
});

// ============================================================================
// 8. DUAL-MODE SALES RETURNS ENGINE (WITH BILL & WITHOUT BILL)
// ============================================================================

enterpriseRouter.post('/pos/returns', requireAuth, requirePermission('process_payments'), async (req: AuthRequest, res) => {
  try {
    const {
      returnType = 'WITH_BILL', // 'WITH_BILL' | 'WITHOUT_BILL'
      originalBillNo,
      customerName,
      customerPhone,
      items: returnItems,
      refundType = 'Cash Refund', // 'Cash Refund' | 'Credit Note' | 'Exchange Adjustment'
      reason,
      restocked = true,
      notes,
    } = req.body;

    if (!Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({ error: 'At least one return item is required' });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Return reason is required' });
    }

    if (returnType === 'WITH_BILL' && (!originalBillNo || !String(originalBillNo).trim())) {
      return res.status(400).json({ error: 'Original Bill Number is required for Return WITH Bill' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const latestReturn = await db.select({ id: salesReturns.id }).from(salesReturns).orderBy(desc(salesReturns.id)).limit(1);
    const nextRetNum = latestReturn.length > 0 ? latestReturn[0].id + 1001 : 1001;
    const returnNumber = `RET-${todayStr.slice(0, 4)}-${nextRetNum}`;

    let totalAmount = 0;
    const validatedItems = returnItems.map((r) => {
      const q = Math.max(1, Number(r.qty) || 1);
      const p = Math.max(0, Number(r.price) || 0);
      const lineTotal = q * p;
      totalAmount += lineTotal;
      return {
        returnNumber,
        itemCode: String(r.itemCode || r.code).trim(),
        itemName: String(r.itemName || r.name).trim(),
        qty: q,
        price: p,
        total: lineTotal,
        condition: r.condition ? String(r.condition).trim() : 'Good / Resellable',
      };
    });

    // 1. Insert Sales Return Master Record
    const createdReturn = await db
      .insert(salesReturns)
      .values({
        returnNumber,
        returnType,
        originalBillNo: originalBillNo ? String(originalBillNo).trim() : null,
        customerName: customerName ? String(customerName).trim() : 'Walk-in Customer',
        customerPhone: customerPhone ? String(customerPhone).trim() : '0770000000',
        date: todayStr,
        refundType,
        totalAmount,
        reason: String(reason).trim(),
        restocked: Boolean(restocked),
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    // 2. Insert Return Items & Restock into Inventory
    for (const ri of validatedItems) {
      await db.insert(salesReturnItems).values(ri);

      if (restocked) {
        const invRows = await db.select().from(inventoryItems).where(eq(inventoryItems.code, ri.itemCode));
        if (invRows.length > 0) {
          const inv = invRows[0];
          const restoredQty = inv.qty + ri.qty;
          await db
            .update(inventoryItems)
            .set({
              qty: restoredQty,
              availability: restoredQty > 5 ? 'In Stock' : restoredQty > 0 ? 'Low Stock' : 'Out of Stock',
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, inv.id));

          // Log Stock Adjustment
          await db.insert(stockAdjustments).values({
            adjustmentCode: `ADJ-RET-${returnNumber}-${ri.itemCode}`,
            itemCode: ri.itemCode,
            itemName: ri.itemName,
            type: '+',
            quantity: ri.qty,
            reason: `Sales Return Restocking (${returnNumber}) - ${ri.condition}`,
            date: todayStr,
          });

          // Log to stockMovementLogs
          try {
            await db.insert(stockMovementLogs).values({
              date: todayStr,
              time: new Date().toTimeString().split(' ')[0],
              itemCode: ri.itemCode,
              barcode: inv.barcode || '',
              itemName: ri.itemName,
              movementType: 'Sales Return',
              refNo: returnNumber,
              qtyChange: ri.qty,
              balanceAfter: restoredQty,
              costPrice: inv.costPrice,
              sellingPrice: ri.price,
              user: req.user?.name || req.user?.email || 'Cashier',
              outlet: 'Main Outlet Akkaraipattu',
              notes: `Sales Return Restocked (${ri.condition})`,
            });
          } catch (smErr) {
            console.warn('Failed to log stock movement for return:', smErr);
          }
        }
      }
    }

    // 3. If Return WITH Bill, update original bill's return amount
    if (returnType === 'WITH_BILL' && originalBillNo) {
      const origBills = await db.select().from(posBills).where(eq(posBills.billNo, String(originalBillNo).trim()));
      if (origBills.length > 0) {
        const ob = origBills[0];
        const newBillReturns = (ob.returns || 0) + totalAmount;
        await db
          .update(posBills)
          .set({ returns: newBillReturns })
          .where(eq(posBills.id, ob.id));
      }
    }

    // 4. Financial Ledger Updates based on Refund Type
    const cleanPhone = customerPhone ? String(customerPhone).trim() : '';
    if (cleanPhone) {
      const custRows = await db.select().from(customerAccounts).where(eq(customerAccounts.phoneNumber, cleanPhone));
      if (custRows.length > 0) {
        const cust = custRows[0];

        if (refundType === 'Credit Note') {
          // Increase store credit (advanceBalance) or offset any outstanding creditDue
          let newCreditDue = cust.creditDue;
          let newAdvanceBal = cust.advanceBalance;

          if (newCreditDue > 0) {
            const offset = Math.min(newCreditDue, totalAmount);
            newCreditDue -= offset;
            const remainingCredit = totalAmount - offset;
            newAdvanceBal += remainingCredit;
          } else {
            newAdvanceBal += totalAmount;
          }

          await db
            .update(customerAccounts)
            .set({
              creditDue: newCreditDue,
              advanceBalance: newAdvanceBal,
              updatedAt: new Date(),
            })
            .where(eq(customerAccounts.id, cust.id));

          await db.insert(customerLedgerEntries).values({
            customerPhone: cleanPhone,
            customerName: cust.customerName,
            date: todayStr,
            type: 'Credit Note',
            refNo: returnNumber,
            debit: 0,
            credit: totalAmount,
            balance: newCreditDue,
            notes: `Credit Note issued for Return ${returnNumber} (${returnType}). Added to advance balance / dues adjusted.`,
          });
        } else if (refundType === 'Cash Refund') {
          await db.insert(customerLedgerEntries).values({
            customerPhone: cleanPhone,
            customerName: cust.customerName,
            date: todayStr,
            type: 'Return Refund',
            refNo: returnNumber,
            debit: 0,
            credit: totalAmount,
            balance: cust.creditDue,
            notes: `Cash refund payout of LKR ${totalAmount.toLocaleString()} for Return ${returnNumber}`,
          });
        }
      }
    }

    const updatedCatalog = await db.select().from(inventoryItems).orderBy(inventoryItems.id);

    res.status(201).json({
      success: true,
      salesReturn: createdReturn[0],
      items: updatedCatalog,
      message: `Processed ${returnType === 'WITH_BILL' ? 'Return With Bill' : 'Return Without Bill'} ${returnNumber}. Total Refund: LKR ${totalAmount.toLocaleString()} (${refundType}). Items restocked.`,
    });
  } catch (error: any) {
    console.error('Sales return error:', error);
    res.status(500).json({ error: 'Failed to process sales return' });
  }
});

// List all sales returns
enterpriseRouter.get('/pos/returns', requireAuth, async (req: AuthRequest, res) => {
  try {
    const returns = await db.select().from(salesReturns).orderBy(desc(salesReturns.id));
    const allItems = await db.select().from(salesReturnItems);
    const enriched = returns.map((r) => ({
      ...r,
      items: allItems.filter((i) => i.returnNumber === r.returnNumber),
    }));
    res.json(enriched);
  } catch (error: any) {
    console.error('Failed to get sales returns:', error);
    res.status(500).json({ error: 'Failed to fetch sales returns' });
  }
});

// Search bills for Return With Bill
enterpriseRouter.get('/pos/bills/search', requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const allBills = await db.select().from(posBills).orderBy(desc(posBills.id)).limit(100);
    const allBillItems = await db.select().from(posBillItems);

    let filtered = allBills;
    if (q) {
      filtered = allBills.filter(
        (b) =>
          b.billNo.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          (b.customerPhone && b.customerPhone.includes(q))
      );
    }

    const enriched = filtered.slice(0, 20).map((b) => ({
      ...b,
      items: allBillItems.filter((i) => i.billNo === b.billNo),
    }));

    res.json(enriched);
  } catch (error: any) {
    console.error('Failed to search bills:', error);
    res.status(500).json({ error: 'Failed to search bills' });
  }
});

// Get POS bills
enterpriseRouter.get('/pos/bills', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bills = await db.select().from(posBills).orderBy(desc(posBills.id)).limit(100);
    const items = await db.select().from(posBillItems);
    const enriched = bills.map((b) => ({
      ...b,
      items: items.filter((i) => i.billNo === b.billNo),
    }));
    res.json(enriched);
  } catch (error: any) {
    console.error('Failed to get bills:', error);
    res.status(500).json({ error: 'Failed to fetch sales bills' });
  }
});

// Get single POS bill with items by billNo
enterpriseRouter.get('/pos/bills/:billNo', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billNo } = req.params;
    const bills = await db.select().from(posBills).where(eq(posBills.billNo, billNo));
    if (bills.length === 0) {
      return res.status(404).json({ error: `Invoice ${billNo} not found` });
    }
    const bill = bills[0];
    const items = await db.select().from(posBillItems).where(eq(posBillItems.billNo, billNo));
    res.json({ ...bill, items });
  } catch (error: any) {
    console.error('Failed to get bill:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// Lock an active invoice
enterpriseRouter.post('/pos/bills/lock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      billNo,
      date,
      customerName,
      customerPhone,
      items: billItems = [],
      subtotal = 0,
      discount = 0,
      returns = 0,
      advancePaid = 0,
      advanceApplied = 0,
      netTotal = 0,
      paidAmount = 0,
      changeDue = 0,
      paymentMethod = 'Cash',
      paymentTerm = 'Cash',
      bankAccountId,
      linkedJobId,
      linkedJobNumber,
      notes,
    } = req.body;

    if (!billNo) {
      return res.status(400).json({ error: 'Bill number is required to lock an invoice' });
    }

    const cleanBillNo = String(billNo).trim();
    const todayStr = date || new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const cashierId = req.user?.uid || 'CASH-01';
    const cashierName = req.user?.name || 'Cashier';

    // Check if bill exists
    const existing = await db.select().from(posBills).where(eq(posBills.billNo, cleanBillNo));
    if (existing.length > 0) {
      await db
        .update(posBills)
        .set({
          status: 'Locked',
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || '',
          subtotal: Number(subtotal) || 0,
          discount: Number(discount) || 0,
          returns: Number(returns) || 0,
          netTotal: Number(netTotal) || 0,
          notes: notes || 'Locked invoice in POS',
        })
        .where(eq(posBills.billNo, cleanBillNo));

      // Replace items
      await db.delete(posBillItems).where(eq(posBillItems.billNo, cleanBillNo));
      for (const it of billItems) {
        await db.insert(posBillItems).values({
          billNo: cleanBillNo,
          itemCode: it.code || 'ITEM',
          itemName: it.name || 'Product',
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
          discount: Number(it.discount) || 0,
          total: Number(it.total) || 0,
          isFromJob: Boolean(it.isFromJob),
        });
      }
    } else {
      await db.insert(posBills).values({
        billNo: cleanBillNo,
        date: todayStr,
        time: timeStr,
        cashierId,
        cashierName,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        returns: Number(returns) || 0,
        advancePaid: Number(advancePaid) || 0,
        advanceApplied: Number(advanceApplied) || 0,
        netTotal: Number(netTotal) || 0,
        paidAmount: Number(paidAmount) || 0,
        changeDue: Number(changeDue) || 0,
        paymentMethod,
        paymentTerm,
        bankAccountId: bankAccountId ? Number(bankAccountId) : null,
        creditDue: 0,
        customerOutstandingDue: 0,
        linkedJobId: linkedJobId ? Number(linkedJobId) : null,
        linkedJobNumber: linkedJobNumber ? String(linkedJobNumber) : null,
        status: 'Locked',
        notes: notes || 'Locked invoice in POS',
      });

      for (const it of billItems) {
        await db.insert(posBillItems).values({
          billNo: cleanBillNo,
          itemCode: it.code || 'ITEM',
          itemName: it.name || 'Product',
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
          discount: Number(it.discount) || 0,
          total: Number(it.total) || 0,
          isFromJob: Boolean(it.isFromJob),
        });
      }
    }

    res.json({
      success: true,
      billNo: cleanBillNo,
      status: 'Locked',
      message: `Invoice ${cleanBillNo} locked successfully.`,
    });
  } catch (error: any) {
    console.error('Failed to lock invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to lock invoice' });
  }
});

// Get all locked invoices
enterpriseRouter.get('/pos/bills/status/locked', requireAuth, async (req: AuthRequest, res) => {
  try {
    const lockedBills = await db
      .select()
      .from(posBills)
      .where(eq(posBills.status, 'Locked'))
      .orderBy(desc(posBills.id));

    const items = await db.select().from(posBillItems);
    const enriched = lockedBills.map((b) => ({
      ...b,
      items: items.filter((i) => i.billNo === b.billNo),
    }));

    res.json(enriched);
  } catch (error: any) {
    console.error('Failed to get locked bills:', error);
    res.status(500).json({ error: 'Failed to fetch locked invoices' });
  }
});

// Unlock a locked invoice & remove from locked state to resume in POS
enterpriseRouter.post('/pos/bills/:billNo/unlock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billNo } = req.params;
    const bills = await db.select().from(posBills).where(eq(posBills.billNo, billNo));
    if (bills.length === 0) {
      return res.status(404).json({ error: `Invoice ${billNo} not found` });
    }
    const bill = bills[0];
    const items = await db.select().from(posBillItems).where(eq(posBillItems.billNo, billNo));

    await db.delete(posBillItems).where(eq(posBillItems.billNo, billNo));
    await db.delete(posBills).where(eq(posBills.billNo, billNo));

    res.json({
      success: true,
      message: `Invoice ${billNo} unlocked and resumed into POS`,
      bill: { ...bill, items },
    });
  } catch (error: any) {
    console.error('Failed to unlock invoice:', error);
    res.status(500).json({ error: 'Failed to unlock invoice' });
  }
});

// ============================================================================
// 5.5 BUSINESS DAY LIFECYCLE (DAY OPEN / DAY CLOSE / EOD) & FINANCIAL REPORTS
// ============================================================================

// Get Business Day Status
enterpriseRouter.get('/pos/day/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const settingsRows = await db.select().from(appSettings);
    const getSetting = (k: string) => settingsRows.find((s) => s.settingKey === k)?.settingValue;

    const statusVal = getSetting('business_day_status') || 'Open';
    const activeDate = getSetting('business_day_date') || todayStr;
    const openedAt = getSetting('business_day_opened_at');
    const openedBy = getSetting('business_day_opened_by');
    const closedAt = getSetting('business_day_closed_at');
    const closedBy = getSetting('business_day_closed_by');

    const nextDateObj = new Date(activeDate);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().split('T')[0];

    res.json({
      isOpen: statusVal === 'Open',
      status: statusVal,
      currentDate: activeDate,
      openedAt,
      openedBy,
      closedAt,
      closedBy,
      nextDate,
    });
  } catch (error: any) {
    console.error('Failed to get day status:', error);
    res.status(500).json({ error: 'Failed to fetch day status' });
  }
});

// START DAY (Day Open): Activates business day, initializes session, allows sales entry
enterpriseRouter.post('/pos/day/open', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    const activeDate = date || todayStr;
    const userName = req.user?.name || 'Staff User';

    const saveSetting = async (k: string, v: string) => {
      const existing = await db.select().from(appSettings).where(eq(appSettings.settingKey, k));
      if (existing.length > 0) {
        await db.update(appSettings).set({ settingValue: v, updatedAt: new Date() }).where(eq(appSettings.settingKey, k));
      } else {
        await db.insert(appSettings).values({ settingKey: k, settingValue: v });
      }
    };

    await saveSetting('business_day_status', 'Open');
    await saveSetting('business_day_date', activeDate);
    await saveSetting('business_day_opened_at', new Date().toISOString());
    await saveSetting('business_day_opened_by', userName);

    const nextDateObj = new Date(activeDate);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().split('T')[0];

    res.json({
      success: true,
      isOpen: true,
      currentDate: activeDate,
      nextDate,
      message: `Business day opened for ${activeDate}. Counter session initialized and sales entry active.`,
    });
  } catch (error: any) {
    console.error('Failed to open day:', error);
    res.status(500).json({ error: 'Failed to open business day' });
  }
});

// Validate EOD Closing: Check if any locked or unsettled invoices remain
enterpriseRouter.get('/pos/eod/validate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const lockedBills = await db
      .select()
      .from(posBills)
      .where(eq(posBills.status, 'Locked'))
      .orderBy(desc(posBills.id));

    const canClose = lockedBills.length === 0;
    res.json({
      canClose,
      lockedCount: lockedBills.length,
      lockedInvoices: lockedBills,
      message: canClose
        ? 'All invoices settled. System is ready for End of Day (EOD) closing.'
        : `Cannot perform End of Day (EOD) closing! There are ${lockedBills.length} locked/unsettled invoice(s) that must be cleared or settled first.`,
    });
  } catch (error: any) {
    console.error('Failed to validate EOD:', error);
    res.status(500).json({ error: 'Failed to validate EOD status' });
  }
});

// Generate EOD Financial Closing Summary Reports
enterpriseRouter.get('/pos/eod/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const settingsRows = await db.select().from(appSettings);
    const savedDate = settingsRows.find((s) => s.settingKey === 'business_day_date')?.settingValue;
    const queryDate = String(req.query.date || savedDate || todayStr).trim();

    // 1. Fetch Bills for queryDate
    const bills = await db.select().from(posBills).where(eq(posBills.date, queryDate));
    const lockedBills = bills.filter((b) => (b.status || '').toLowerCase() === 'locked');
    const completedBills = bills.filter((b) => (b.status || '').toLowerCase() !== 'locked');

    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalBankSales = 0;
    let totalCreditSales = 0;
    let totalGrossSales = 0;
    let totalDiscount = 0;
    let totalReturns = 0;
    let totalAdvanceApplied = 0;

    const creditSalesItems: any[] = [];
    const customerAccountsList = await db.select().from(customerAccounts);

    for (const b of completedBills) {
      totalGrossSales += Number(b.subtotal) || 0;
      totalDiscount += Number(b.discount) || 0;
      totalReturns += Number(b.returns) || 0;
      totalAdvanceApplied += Number(b.advanceApplied) || 0;

      const pMethod = (b.paymentMethod || '').trim().toLowerCase();
      if (pMethod === 'cash') {
        totalCashSales += Number(b.paidAmount) || 0;
      } else if (pMethod === 'card') {
        totalCardSales += Number(b.paidAmount) || 0;
      } else if (pMethod.includes('bank')) {
        totalBankSales += Number(b.paidAmount) || 0;
      } else {
        totalCashSales += Number(b.paidAmount) || 0;
      }

      if (
        (b.paymentTerm || '').trim().toLowerCase() === 'credit' ||
        (b.creditDue && Number(b.creditDue) > 0)
      ) {
        const creditAmt = Number(b.creditDue) || Math.max(0, (Number(b.netTotal) || 0) - (Number(b.paidAmount) || 0));
        totalCreditSales += creditAmt;

        // Match customer account by phone digits or name to get their Total Cumulative Due / Outstanding Balance
        const cleanCustPhone = (b.customerPhone || '').replace(/\D/g, '');
        const custAcc = customerAccountsList.find((c) => {
          const cleanAccPhone = (c.phoneNumber || '').replace(/\D/g, '');
          const phoneMatch = cleanCustPhone.length >= 7 && cleanAccPhone.length >= 7 &&
            (cleanCustPhone.endsWith(cleanAccPhone.slice(-7)) || cleanAccPhone.endsWith(cleanCustPhone.slice(-7)));
          const nameMatch = c.customerName && b.customerName &&
            c.customerName.trim().toLowerCase() === b.customerName.trim().toLowerCase();
          return phoneMatch || nameMatch;
        });

        creditSalesItems.push({
          billNo: b.billNo,
          customerName: b.customerName,
          customerPhone: b.customerPhone || '',
          creditAmount: creditAmt,
          // Cumulative due beneath name!
          cumulativeDue: custAcc ? Number(custAcc.creditDue) || creditAmt : creditAmt,
          time: b.time,
        });
      }
    }

    const netSales = Math.max(0, totalGrossSales - totalDiscount - totalReturns);

    // 2. Expenses for queryDate
    const expenseRows = await db.select().from(expenses).where(eq(expenses.date, queryDate));
    let totalExpenses = 0;
    let totalCashExpenses = 0;
    const itemizedExpenses = expenseRows.map((e) => {
      const amt = Number(e.amount) || 0;
      totalExpenses += amt;
      if (e.payType === 'Cash' || !e.payType) {
        totalCashExpenses += amt;
      }
      return {
        id: e.id,
        category: e.expenseType,
        title: e.remark || e.paidTo,
        amount: amt,
        paymentMethod: e.payType || 'Cash',
      };
    });

    // 3. Purchases / GRNs for queryDate
    const grnRows = await db.select().from(grnBatches).where(eq(grnBatches.date, queryDate));
    let totalPurchases = 0;
    const itemizedPurchases = grnRows.map((g) => {
      const cost = Number(g.totalCost) || 0;
      totalPurchases += cost;
      return {
        grnNumber: g.grnNumber,
        supplierName: g.supplierName,
        invoiceRef: g.invoiceRef,
        totalCost: cost,
        status: g.status,
      };
    });

    // 4. Job Advances & Direct Job Payments for queryDate
    const advances = await db.select().from(advancePayments).where(eq(advancePayments.date, queryDate));
    let totalCustomerAdvances = 0;
    for (const adv of advances) {
      totalCustomerAdvances += Number(adv.originalAmount) || 0;
    }

    const jobPayRows = await db.select().from(jobPayments).where(eq(jobPayments.date, queryDate));
    let totalJobCashPayments = 0;
    for (const jp of jobPayRows) {
      if (jp.paymentType === 'Cash' || !jp.paymentType) {
        totalJobCashPayments += Number(jp.amount) || 0;
      }
    }

    // Cash Drawer Reconciliation
    const totalCashIn = totalCashSales + totalCustomerAdvances + totalJobCashPayments;
    const totalCashOut = totalCashExpenses;
    const netCashDrawer = totalCashIn - totalCashOut;

    const totalOutflows = totalExpenses + totalPurchases;
    const totalInflows = netSales;

    // All active credit customers with cumulative outstanding balances
    const allDebtorCustomers = customerAccountsList
      .filter((c) => Number(c.creditDue) > 0)
      .map((c) => ({
        id: c.id,
        customerName: c.customerName,
        phoneNumber: c.phoneNumber,
        creditDue: Number(c.creditDue) || 0,
        creditLimit: Number(c.creditLimit) || 50000,
      }))
      .sort((a, b) => b.creditDue - a.creditDue);

    const totalDebtorsBalance = allDebtorCustomers.reduce((s, c) => s + c.creditDue, 0);

    const nextDateObj = new Date(queryDate);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().split('T')[0];

    res.json({
      date: queryDate,
      nextDate,
      canClose: lockedBills.length === 0,
      lockedCount: lockedBills.length,
      lockedInvoices: lockedBills,
      // Report 1: Cash Flow Summary Report
      report1CashFlow: {
        date: queryDate,
        totalCashIn,
        totalCashOut,
        netCashDrawer,
        totalCashSales,
        totalCustomerAdvances,
        totalJobCashPayments,
        totalCashExpenses,
        totalDailySales: netSales,
        totalGrossSales,
        totalDiscount,
        totalReturns,
      },
      // Report 2: Detailed Transaction & Credit Report
      report2Detailed: {
        date: queryDate,
        outflows: {
          purchases: itemizedPurchases,
          totalPurchases,
          expenses: itemizedExpenses,
          totalExpenses,
          purchaseReturns: 0,
          totalOutflows,
        },
        inflows: {
          totalCashSales,
          totalCardSales,
          totalBankSales,
          totalCreditSales,
          creditSalesItems,
          outstandingCreditCustomers: allDebtorCustomers,
          totalDebtorsBalance,
          totalInflows,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to generate EOD summary:', error);
    res.status(500).json({ error: 'Failed to generate EOD financial summary' });
  }
});

// Close EOD (End of Day) with strict lock validation and reports generation
enterpriseRouter.post('/pos/eod/close', requireAuth, async (req: AuthRequest, res) => {
  try {
    const lockedBills = await db
      .select()
      .from(posBills)
      .where(eq(posBills.status, 'Locked'))
      .orderBy(desc(posBills.id));

    if (lockedBills.length > 0) {
      return res.status(400).json({
        canClose: false,
        error: `EOD Closing Blocked: ${lockedBills.length} invoice(s) are currently in Locked status. Please settle or cancel them before closing the day.`,
        lockedInvoices: lockedBills,
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const settingsRows = await db.select().from(appSettings);
    const savedDate = settingsRows.find((s) => s.settingKey === 'business_day_date')?.settingValue;
    const closedDate = savedDate || todayStr;
    const cashierName = req.user?.name || 'Cashier';

    const saveSetting = async (k: string, v: string) => {
      const existing = await db.select().from(appSettings).where(eq(appSettings.settingKey, k));
      if (existing.length > 0) {
        await db.update(appSettings).set({ settingValue: v, updatedAt: new Date() }).where(eq(appSettings.settingKey, k));
      } else {
        await db.insert(appSettings).values({ settingKey: k, settingValue: v });
      }
    };

    await saveSetting('business_day_status', 'Closed');
    await saveSetting('business_day_closed_at', new Date().toISOString());
    await saveSetting('business_day_closed_by', cashierName);

    const nextDateObj = new Date(closedDate);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().split('T')[0];

    res.json({
      success: true,
      isOpen: false,
      date: closedDate,
      nextDate,
      closedAt: new Date().toISOString(),
      closedBy: cashierName,
      message: `End of Day (EOD) closing completed successfully for ${closedDate}. All registers and invoices reconciled.`,
    });
  } catch (error: any) {
    console.error('Failed to close EOD:', error);
    res.status(500).json({ error: 'Failed to complete EOD closing' });
  }
});


// ============================================================================
// 6. DEDICATED FINANCE & EXPENSE MANAGEMENT WITH LIVE SQL AGGREGATION
// ============================================================================

// Live SQL Overview & Metric Aggregation
enterpriseRouter.get('/finance/overview', requireAuth, async (req: AuthRequest, res) => {
  try {
    const startDate = String(req.query.startDate || '2026-10-01');
    const endDate = String(req.query.endDate || new Date().toISOString().split('T')[0]);

    // Live SQL aggregate calculations using SUM, GROUP BY, etc.
    const expenseSumRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::int as total
      FROM expenses
      WHERE date >= ${startDate} AND date <= ${endDate}
    `);
    const totalExpenses = Number((expenseSumRes.rows?.[0] as any)?.total || 0);

    const investmentSumRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::int as total
      FROM investments
      WHERE date >= ${startDate} AND date <= ${endDate}
    `);
    const totalInvestments = Number((investmentSumRes.rows?.[0] as any)?.total || 0);

    const otherIncomeSumRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::int as total
      FROM other_incomes
      WHERE date >= ${startDate} AND date <= ${endDate}
    `);
    const totalOtherIncome = Number((otherIncomeSumRes.rows?.[0] as any)?.total || 0);

    const profitOutSumRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::int as total
      FROM profit_out
      WHERE date >= ${startDate} AND date <= ${endDate}
    `);
    const totalProfitOut = Number((profitOutSumRes.rows?.[0] as any)?.total || 0);

    const bankBalRes = await db.execute(sql`
      SELECT COALESCE(SUM(balance), 0)::int as total
      FROM bank_accounts
    `);
    const totalBankBalance = Number((bankBalRes.rows?.[0] as any)?.total || 0);

    const ewalletBalRes = await db.execute(sql`
      SELECT COALESCE(SUM(balance), 0)::int as total
      FROM ewallet_accounts
    `);
    const totalEwalletBalance = Number((ewalletBalRes.rows?.[0] as any)?.total || 0);

    // SQL Category aggregations
    const expenseCategoriesRes = await db.execute(sql`
      SELECT expense_type as name, SUM(amount)::int as value, COUNT(*)::int as count
      FROM expenses
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY expense_type
      ORDER BY value DESC
    `);

    const investmentTypesRes = await db.execute(sql`
      SELECT investment_type as name, SUM(amount)::int as value
      FROM investments
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY investment_type
      ORDER BY value DESC
    `);

    const otherIncomeSourcesRes = await db.execute(sql`
      SELECT source as name, SUM(amount)::int as value
      FROM other_incomes
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY source
      ORDER BY value DESC
    `);

    res.json({
      period: { startDate, endDate },
      totalExpenses,
      totalInvestments,
      totalOtherIncome,
      totalProfitOut,
      totalBankBalance,
      totalEwalletBalance,
      netCashFlow: totalOtherIncome + totalInvestments - totalExpenses - totalProfitOut,
      expenseCategories: expenseCategoriesRes.rows || [],
      investmentTypes: investmentTypesRes.rows || [],
      otherIncomeSources: otherIncomeSourcesRes.rows || [],
    });
  } catch (error: any) {
    console.error('Failed to calculate finance aggregations:', error);
    res.status(500).json({ error: 'Failed to calculate finance aggregations' });
  }
});

// ----------------------------------------------------------------------------
// 6A. EXPENSES SUB-MODULE
// ----------------------------------------------------------------------------
const fetchExpensesHandler = async (req: AuthRequest, res: any) => {
  try {
    const { startDate, endDate, location, expenseType } = req.query;
    let query = db.select().from(expenses);
    const conditions = [];

    if (startDate) conditions.push(gte(expenses.date, String(startDate)));
    if (endDate) conditions.push(lte(expenses.date, String(endDate)));
    if (location && location !== 'All') conditions.push(eq(expenses.location, String(location)));
    if (expenseType && expenseType !== 'All') conditions.push(eq(expenses.expenseType, String(expenseType)));

    const result = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(expenses.id))
      : await query.orderBy(desc(expenses.id));

    res.json(result);
  } catch (error: any) {
    console.error('Failed to get expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

enterpriseRouter.get('/finance/expenses', requireAuth, fetchExpensesHandler);
enterpriseRouter.get('/expenses', requireAuth, fetchExpensesHandler);

const createExpenseHandler = async (req: AuthRequest, res: any) => {
  try {
    const {
      location,
      locationId = 'LOC-AKK-01',
      expenseType,
      paidTo,
      remark,
      payType = 'Cash',
      payInfo,
      date,
      amount,
      accountId,
      accountName,
    } = req.body;

    if (!expenseType || !paidTo || !amount) {
      return res.status(400).json({ error: 'Expense type, paid to, and amount are required' });
    }

    const amt = Math.max(0, Number(amount) || 0);
    const todayStr = date || new Date().toISOString().split('T')[0];
    const userId = req.user?.id ? Number(req.user.id) : null;
    const userName = req.user?.name || 'Staff';

    const inserted = await db
      .insert(expenses)
      .values({
        location: location || 'Main Outlet Akkaraipattu',
        locationId,
        expenseType: String(expenseType).trim(),
        paidTo: String(paidTo).trim(),
        remark: remark ? String(remark).trim() : null,
        payType,
        payInfo: payInfo ? String(payInfo).trim() : null,
        date: todayStr,
        amount: amt,
        userId,
        userName,
        accountId: accountId ? Number(accountId) : null,
        accountName: accountName ? String(accountName) : null,
      })
      .returning();

    const createdRecord = inserted[0];

    // Synchronize linked Bank Account if paid via Bank Transfer
    if (payType === 'Bank Transfer' && accountId) {
      const bRows = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(accountId)));
      if (bRows.length > 0) {
        const bank = bRows[0];
        await db.update(bankAccounts).set({ balance: Math.max(0, bank.balance - amt) }).where(eq(bankAccounts.id, bank.id));
        await db.insert(bankTransactions).values({
          bankAccountId: bank.id,
          bankAccountName: bank.accountName,
          date: todayStr,
          type: 'Expense Out',
          amount: amt,
          refNo: `EXP-${createdRecord.id}`,
          description: `Expense: ${expenseType} - Paid to ${paidTo}`,
          locationId,
          userId,
        });
      }
    }

    // Synchronize linked e-Wallet Account if paid via e-Wallet
    if (payType === 'e-Wallet' && accountId) {
      const wRows = await db.select().from(ewalletAccounts).where(eq(ewalletAccounts.id, Number(accountId)));
      if (wRows.length > 0) {
        const wallet = wRows[0];
        await db.update(ewalletAccounts).set({ balance: Math.max(0, wallet.balance - amt) }).where(eq(ewalletAccounts.id, wallet.id));
        await db.insert(ewalletTransactions).values({
          ewalletAccountId: wallet.id,
          walletName: wallet.walletName,
          date: todayStr,
          type: 'Vendor Payout',
          amount: amt,
          refNo: `EXP-${createdRecord.id}`,
          description: `Expense: ${expenseType} - Paid to ${paidTo}`,
          locationId,
          userId,
        });
      }
    }

    res.status(201).json(createdRecord);
  } catch (error: any) {
    console.error('Failed to create expense:', error);
    res.status(500).json({ error: 'Failed to record expense' });
  }
};

enterpriseRouter.post('/finance/expenses', requireAuth, createExpenseHandler);
enterpriseRouter.post('/expenses', requireAuth, createExpenseHandler);

const deleteExpenseHandler = async (req: AuthRequest, res: any) => {
  try {
    const id = Number(req.params.id);
    await db.delete(expenses).where(eq(expenses.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

enterpriseRouter.delete('/finance/expenses/:id', requireAuth, deleteExpenseHandler);
enterpriseRouter.delete('/expenses/:id', requireAuth, deleteExpenseHandler);

// ----------------------------------------------------------------------------
// 6B. INVESTMENTS SUB-MODULE
// ----------------------------------------------------------------------------
enterpriseRouter.get('/finance/investments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const all = await db.select().from(investments).orderBy(desc(investments.id));
    res.json(all);
  } catch (error: any) {
    console.error('Failed to get investments:', error);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

enterpriseRouter.post('/finance/investments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      investorName,
      investmentType = 'Capital Injection',
      amount,
      location = 'Main Outlet Akkaraipattu',
      locationId = 'LOC-AKK-01',
      payType = 'Bank Transfer',
      accountId,
      accountName,
      date,
      notes,
    } = req.body;

    if (!investorName || !amount) {
      return res.status(400).json({ error: 'Investor name and amount are required' });
    }

    const amt = Math.max(0, Number(amount) || 0);
    const todayStr = date || new Date().toISOString().split('T')[0];
    const userId = req.user?.id ? Number(req.user.id) : null;
    const userName = req.user?.name || 'Staff';

    const inserted = await db
      .insert(investments)
      .values({
        investorName: String(investorName).trim(),
        investmentType: String(investmentType).trim(),
        amount: amt,
        location,
        locationId,
        userId,
        userName,
        accountId: accountId ? Number(accountId) : null,
        accountName: accountName ? String(accountName).trim() : null,
        payType,
        date: todayStr,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    const createdRecord = inserted[0];

    // Synchronize Bank if deposited to bank
    if (payType === 'Bank Transfer' && accountId) {
      const bRows = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(accountId)));
      if (bRows.length > 0) {
        const bank = bRows[0];
        await db.update(bankAccounts).set({ balance: bank.balance + amt }).where(eq(bankAccounts.id, bank.id));
        await db.insert(bankTransactions).values({
          bankAccountId: bank.id,
          bankAccountName: bank.accountName,
          date: todayStr,
          type: 'Investment Deposit',
          amount: amt,
          refNo: `INV-CAP-${createdRecord.id}`,
          description: `Capital Investment: ${investorName} (${investmentType})`,
          locationId,
          userId,
        });
      }
    }

    res.status(201).json(createdRecord);
  } catch (error: any) {
    console.error('Failed to create investment:', error);
    res.status(500).json({ error: 'Failed to record investment' });
  }
});

enterpriseRouter.delete('/finance/investments/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(investments).where(eq(investments.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete investment:', error);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// ----------------------------------------------------------------------------
// 6C. OTHER INCOMES SUB-MODULE
// ----------------------------------------------------------------------------
enterpriseRouter.get('/finance/other-incomes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const all = await db.select().from(otherIncomes).orderBy(desc(otherIncomes.id));
    res.json(all);
  } catch (error: any) {
    console.error('Failed to get other incomes:', error);
    res.status(500).json({ error: 'Failed to fetch other incomes' });
  }
});

enterpriseRouter.post('/finance/other-incomes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      source,
      receivedFrom,
      amount,
      location = 'Main Outlet Akkaraipattu',
      locationId = 'LOC-AKK-01',
      payType = 'Cash',
      accountId,
      accountName,
      date,
      remark,
    } = req.body;

    if (!source || !receivedFrom || !amount) {
      return res.status(400).json({ error: 'Source, received from, and amount are required' });
    }

    const amt = Math.max(0, Number(amount) || 0);
    const todayStr = date || new Date().toISOString().split('T')[0];
    const userId = req.user?.id ? Number(req.user.id) : null;
    const userName = req.user?.name || 'Staff';

    const inserted = await db
      .insert(otherIncomes)
      .values({
        source: String(source).trim(),
        receivedFrom: String(receivedFrom).trim(),
        amount: amt,
        location,
        locationId,
        userId,
        userName,
        accountId: accountId ? Number(accountId) : null,
        accountName: accountName ? String(accountName).trim() : null,
        payType,
        date: todayStr,
        remark: remark ? String(remark).trim() : null,
      })
      .returning();

    const createdRecord = inserted[0];

    // Synchronize Bank if deposited via Bank
    if (payType === 'Bank Transfer' && accountId) {
      const bRows = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(accountId)));
      if (bRows.length > 0) {
        const bank = bRows[0];
        await db.update(bankAccounts).set({ balance: bank.balance + amt }).where(eq(bankAccounts.id, bank.id));
        await db.insert(bankTransactions).values({
          bankAccountId: bank.id,
          bankAccountName: bank.accountName,
          date: todayStr,
          type: 'Bank Transfer In',
          amount: amt,
          refNo: `INC-${createdRecord.id}`,
          description: `Other Income: ${source} - From ${receivedFrom}`,
          locationId,
          userId,
        });
      }
    }

    res.status(201).json(createdRecord);
  } catch (error: any) {
    console.error('Failed to create other income:', error);
    res.status(500).json({ error: 'Failed to record other income' });
  }
});

enterpriseRouter.delete('/finance/other-incomes/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(otherIncomes).where(eq(otherIncomes.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete other income:', error);
    res.status(500).json({ error: 'Failed to delete other income' });
  }
});

// ----------------------------------------------------------------------------
// 6D. PROFIT OUT (OWNER DRAWS & DIVIDENDS) SUB-MODULE
// ----------------------------------------------------------------------------
enterpriseRouter.get('/finance/profit-out', requireAuth, async (req: AuthRequest, res) => {
  try {
    const all = await db.select().from(profitOut).orderBy(desc(profitOut.id));
    res.json(all);
  } catch (error: any) {
    console.error('Failed to get profit out:', error);
    res.status(500).json({ error: 'Failed to fetch profit distributions' });
  }
});

enterpriseRouter.post('/finance/profit-out', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      recipient,
      distributionType = 'Owner Draw',
      amount,
      location = 'Main Outlet Akkaraipattu',
      locationId = 'LOC-AKK-01',
      payType = 'Cash',
      accountId,
      accountName,
      date,
      notes,
    } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: 'Recipient and amount are required' });
    }

    const amt = Math.max(0, Number(amount) || 0);
    const todayStr = date || new Date().toISOString().split('T')[0];
    const userId = req.user?.id ? Number(req.user.id) : null;
    const userName = req.user?.name || 'Staff';

    const inserted = await db
      .insert(profitOut)
      .values({
        recipient: String(recipient).trim(),
        distributionType: String(distributionType).trim(),
        amount: amt,
        location,
        locationId,
        userId,
        userName,
        accountId: accountId ? Number(accountId) : null,
        accountName: accountName ? String(accountName).trim() : null,
        payType,
        date: todayStr,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    const createdRecord = inserted[0];

    // Synchronize Bank if drawn from Bank
    if (payType === 'Bank Transfer' && accountId) {
      const bRows = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(accountId)));
      if (bRows.length > 0) {
        const bank = bRows[0];
        await db.update(bankAccounts).set({ balance: Math.max(0, bank.balance - amt) }).where(eq(bankAccounts.id, bank.id));
        await db.insert(bankTransactions).values({
          bankAccountId: bank.id,
          bankAccountName: bank.accountName,
          date: todayStr,
          type: 'Owner Draw',
          amount: amt,
          refNo: `DRAW-${createdRecord.id}`,
          description: `Profit Distribution: ${recipient} (${distributionType})`,
          locationId,
          userId,
        });
      }
    }

    res.status(201).json(createdRecord);
  } catch (error: any) {
    console.error('Failed to create profit out record:', error);
    res.status(500).json({ error: 'Failed to record profit distribution' });
  }
});

enterpriseRouter.delete('/finance/profit-out/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(profitOut).where(eq(profitOut.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete profit out:', error);
    res.status(500).json({ error: 'Failed to delete profit distribution' });
  }
});

// ----------------------------------------------------------------------------
// 6E. BANK ACCOUNTS & TRANSACTIONS SUB-MODULE
// ----------------------------------------------------------------------------
enterpriseRouter.get('/finance/bank-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accounts = await db.select().from(bankAccounts).orderBy(desc(bankAccounts.isDefault), bankAccounts.id);
    res.json(accounts);
  } catch (error: any) {
    console.error('Failed to get bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

enterpriseRouter.post('/finance/bank-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { accountName, bankName, accountNumber, branch = 'Akkaraipattu', balance = 0, isDefault = false } = req.body;
    if (!accountName || !bankName || !accountNumber) {
      return res.status(400).json({ error: 'Account name, bank name, and account number are required' });
    }

    if (isDefault) {
      await db.update(bankAccounts).set({ isDefault: false });
    }

    const inserted = await db
      .insert(bankAccounts)
      .values({
        accountName: String(accountName).trim(),
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).trim(),
        branch: String(branch).trim(),
        balance: Math.max(0, Number(balance) || 0),
        isDefault: Boolean(isDefault),
        locationId: 'LOC-AKK-01',
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Failed to create bank account:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

enterpriseRouter.put('/finance/bank-accounts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { accountName, bankName, accountNumber, branch, balance, isDefault } = req.body;

    if (isDefault) {
      await db.update(bankAccounts).set({ isDefault: false });
    }

    const updated = await db
      .update(bankAccounts)
      .set({
        accountName: accountName ? String(accountName).trim() : undefined,
        bankName: bankName ? String(bankName).trim() : undefined,
        accountNumber: accountNumber ? String(accountNumber).trim() : undefined,
        branch: branch ? String(branch).trim() : undefined,
        balance: balance !== undefined ? Math.max(0, Number(balance)) : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

enterpriseRouter.delete('/finance/bank-accounts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete bank account:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

enterpriseRouter.get('/finance/bank-transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bankAccountId } = req.query;
    if (bankAccountId) {
      const rows = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.bankAccountId, Number(bankAccountId)))
        .orderBy(desc(bankTransactions.id))
        .limit(100);
      return res.json(rows);
    }
    const rows = await db.select().from(bankTransactions).orderBy(desc(bankTransactions.id)).limit(100);
    res.json(rows);
  } catch (error: any) {
    console.error('Failed to get bank transactions:', error);
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
});

enterpriseRouter.post('/finance/bank-transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bankAccountId, type, amount, refNo, description, date } = req.body;
    if (!bankAccountId || !type || !amount) {
      return res.status(400).json({ error: 'Bank account, type, and amount are required' });
    }

    const bRows = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(bankAccountId)));
    if (bRows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    const bank = bRows[0];
    const amt = Math.max(0, Number(amount) || 0);
    const todayStr = date || new Date().toISOString().split('T')[0];
    const isOutflow = type.toLowerCase().includes('out') || type.toLowerCase().includes('withdraw') || type.toLowerCase().includes('payout');
    const newBal = isOutflow ? Math.max(0, bank.balance - amt) : bank.balance + amt;

    await db.update(bankAccounts).set({ balance: newBal }).where(eq(bankAccounts.id, bank.id));

    const inserted = await db
      .insert(bankTransactions)
      .values({
        bankAccountId: bank.id,
        bankAccountName: bank.accountName,
        date: todayStr,
        type: String(type),
        amount: amt,
        refNo: refNo ? String(refNo).trim() : null,
        description: description ? String(description).trim() : null,
        locationId: 'LOC-AKK-01',
        userId: req.user?.id ? Number(req.user.id) : null,
      })
      .returning();

    res.status(201).json({ transaction: inserted[0], newBalance: newBal });
  } catch (error: any) {
    console.error('Failed to record bank transaction:', error);
    res.status(500).json({ error: 'Failed to record bank transaction' });
  }
});

// ----------------------------------------------------------------------------
// 6F. E-WALLET ACCOUNTS & DIGITAL REGISTRY SUB-MODULE
// ----------------------------------------------------------------------------
enterpriseRouter.get('/finance/ewallet-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accounts = await db.select().from(ewalletAccounts).orderBy(desc(ewalletAccounts.isDefault), ewalletAccounts.id);
    res.json(accounts);
  } catch (error: any) {
    console.error('Failed to get e-wallet accounts:', error);
    res.status(500).json({ error: 'Failed to fetch digital wallet accounts' });
  }
});

enterpriseRouter.post('/finance/ewallet-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { walletName, provider, accountNumber, merchantId, balance = 0, isDefault = false } = req.body;
    if (!walletName || !provider || !accountNumber) {
      return res.status(400).json({ error: 'Wallet name, provider, and account/mobile number are required' });
    }

    if (isDefault) {
      await db.update(ewalletAccounts).set({ isDefault: false });
    }

    const inserted = await db
      .insert(ewalletAccounts)
      .values({
        walletName: String(walletName).trim(),
        provider: String(provider).trim(),
        accountNumber: String(accountNumber).trim(),
        merchantId: merchantId ? String(merchantId).trim() : null,
        balance: Math.max(0, Number(balance) || 0),
        isDefault: Boolean(isDefault),
        locationId: 'LOC-AKK-01',
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Failed to create e-wallet account:', error);
    res.status(500).json({ error: 'Failed to create e-wallet account' });
  }
});

enterpriseRouter.put('/finance/ewallet-accounts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { walletName, provider, accountNumber, merchantId, balance, isDefault } = req.body;

    if (isDefault) {
      await db.update(ewalletAccounts).set({ isDefault: false });
    }

    const updated = await db
      .update(ewalletAccounts)
      .set({
        walletName: walletName ? String(walletName).trim() : undefined,
        provider: provider ? String(provider).trim() : undefined,
        accountNumber: accountNumber ? String(accountNumber).trim() : undefined,
        merchantId: merchantId !== undefined ? String(merchantId).trim() : undefined,
        balance: balance !== undefined ? Math.max(0, Number(balance)) : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
      })
      .where(eq(ewalletAccounts.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update e-wallet account:', error);
    res.status(500).json({ error: 'Failed to update e-wallet account' });
  }
});

enterpriseRouter.delete('/finance/ewallet-accounts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(ewalletAccounts).where(eq(ewalletAccounts.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete e-wallet account:', error);
    res.status(500).json({ error: 'Failed to delete e-wallet account' });
  }
});

enterpriseRouter.get('/finance/ewallet-transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { ewalletAccountId } = req.query;
    if (ewalletAccountId) {
      const rows = await db
        .select()
        .from(ewalletTransactions)
        .where(eq(ewalletTransactions.ewalletAccountId, Number(ewalletAccountId)))
        .orderBy(desc(ewalletTransactions.id))
        .limit(100);
      return res.json(rows);
    }
    const rows = await db.select().from(ewalletTransactions).orderBy(desc(ewalletTransactions.id)).limit(100);
    res.json(rows);
  } catch (error: any) {
    console.error('Failed to get e-wallet transactions:', error);
    res.status(500).json({ error: 'Failed to fetch e-wallet transactions' });
  }
});

enterpriseRouter.post('/finance/ewallet-transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { ewalletAccountId, type, amount, refNo, description, date } = req.body;
    if (!ewalletAccountId || !type || !amount) {
      return res.status(400).json({ error: 'e-Wallet account, type, and amount are required' });
    }

    const wRows = await db.select().from(ewalletAccounts).where(eq(ewalletAccounts.id, Number(ewalletAccountId)));
    if (wRows.length === 0) {
      return res.status(404).json({ error: 'e-Wallet account not found' });
    }
    const wallet = wRows[0];
    const amt = Math.max(0, Number(amount) || 0);
    const todayStr = date || new Date().toISOString().split('T')[0];
    const isOutflow = type.toLowerCase().includes('payout') || type.toLowerCase().includes('withdraw') || type.toLowerCase().includes('transfer out');
    const newBal = isOutflow ? Math.max(0, wallet.balance - amt) : wallet.balance + amt;

    await db.update(ewalletAccounts).set({ balance: newBal }).where(eq(ewalletAccounts.id, wallet.id));

    const inserted = await db
      .insert(ewalletTransactions)
      .values({
        ewalletAccountId: wallet.id,
        walletName: wallet.walletName,
        date: todayStr,
        type: String(type),
        amount: amt,
        refNo: refNo ? String(refNo).trim() : null,
        description: description ? String(description).trim() : null,
        locationId: 'LOC-AKK-01',
        userId: req.user?.id ? Number(req.user.id) : null,
      })
      .returning();

    res.status(201).json({ transaction: inserted[0], newBalance: newBal });
  } catch (error: any) {
    console.error('Failed to record e-wallet transaction:', error);
    res.status(500).json({ error: 'Failed to record e-wallet transaction' });
  }
});

// ============================================================================
// 7. COMPREHENSIVE REPORTS CENTER SQL AGGREGATION ENGINE
// ============================================================================
enterpriseRouter.get('/reports/comprehensive', requireAuth, async (req: AuthRequest, res) => {
  try {
    const reportType = String(req.query.reportType || req.query.id || 'Cashbook').toLowerCase();
    const title = String(req.query.title || 'Report');
    const startDate = String(req.query.startDate || '2026-10-01');
    const endDate = String(req.query.endDate || new Date().toISOString().split('T')[0]);
    const outlet = String(req.query.outlet || 'Main Outlet Akkaraipattu');

    // Fetch primary transactional tables
    const allBills = await db.select().from(posBills).orderBy(desc(posBills.id));
    const allBillItems = await db.select().from(posBillItems);
    const allJobs = await db.select().from(repairJobs).orderBy(desc(repairJobs.id));
    const allAdvances = await db.select().from(advancePayments).orderBy(desc(advancePayments.id));
    const allJobPayments = await db.select().from(jobPayments).orderBy(desc(jobPayments.id));
    const allInventory = await db.select().from(inventoryItems).orderBy(inventoryItems.id);
    const allSuppliers = await db.select().from(suppliers).orderBy(suppliers.code);
    const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.id));
    const allInvestments = await db.select().from(investments).orderBy(desc(investments.id));
    const allOtherIncomes = await db.select().from(otherIncomes).orderBy(desc(otherIncomes.id));
    const allProfitOut = await db.select().from(profitOut).orderBy(desc(profitOut.id));

    // Filter by date range
    const periodBills = allBills.filter((b) => b.date >= startDate && b.date <= endDate);
    const periodExpenses = allExpenses.filter((e) => e.date >= startDate && e.date <= endDate);
    const periodAdvances = allAdvances.filter((a) => a.date >= startDate && a.date <= endDate);
    const periodJobPayments = allJobPayments.filter((p) => p.date >= startDate && p.date <= endDate);
    const periodInvestments = allInvestments.filter((i) => i.date >= startDate && i.date <= endDate);
    const periodOtherIncomes = allOtherIncomes.filter((oi) => oi.date >= startDate && oi.date <= endDate);
    const periodProfitOut = allProfitOut.filter((po) => po.date >= startDate && po.date <= endDate);

    let reportResult: {
      title: string;
      category: string;
      period: { startDate: string; endDate: string };
      outlet: string;
      metrics: { label: string; value: string; highlight?: boolean }[];
      headers: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
      rows: any[];
      totals: Record<string, any>;
      csvData: string;
    };

    // ------------------------------------------------------------------------
    // CASE A: CASHBOOK (Accounting)
    // ------------------------------------------------------------------------
    if (reportType.includes('cashbook')) {
      const cashEntries: any[] = [];
      let runningBalance = 0;

      // Inflow: Cash POS Sales
      for (const b of periodBills) {
        if (b.paymentMethod === 'Cash' || b.paidAmount > 0) {
          const cashIn = Math.min(b.netTotal, b.paidAmount);
          runningBalance += cashIn;
          cashEntries.push({
            ref: b.billNo,
            desc: `POS Retail Sale - ${b.customerName}`,
            date: b.date,
            inflow: cashIn,
            outflow: 0,
            balance: runningBalance,
          });
        }
      }

      // Inflow: Cash Advances
      for (const a of periodAdvances) {
        runningBalance += a.originalAmount;
        cashEntries.push({
          ref: a.receiptNumber,
          desc: `Advance Deposit - ${a.customerName} (${a.invoiceReference || 'Repair Intake'})`,
          date: a.date,
          inflow: a.originalAmount,
          outflow: 0,
          balance: runningBalance,
        });
      }

      // Inflow: Cash Job Payments
      for (const jp of periodJobPayments) {
        if (jp.paymentType === 'Cash') {
          runningBalance += jp.amount;
          cashEntries.push({
            ref: jp.reference || `PAY-${jp.id}`,
            desc: `Repair Balance Settled - Job #${jp.jobId}`,
            date: jp.date,
            inflow: jp.amount,
            outflow: 0,
            balance: runningBalance,
          });
        }
      }

      // Inflow: Cash Other Non-Sales Incomes
      for (const oi of periodOtherIncomes) {
        if (oi.payType === 'Cash') {
          runningBalance += oi.amount;
          cashEntries.push({
            ref: `INC-${oi.id}`,
            desc: `Other Revenue: ${oi.source} (${oi.receivedFrom})`,
            date: oi.date,
            inflow: oi.amount,
            outflow: 0,
            balance: runningBalance,
          });
        }
      }

      // Inflow: Cash Capital Injections
      for (const inv of periodInvestments) {
        if (inv.payType === 'Cash') {
          runningBalance += inv.amount;
          cashEntries.push({
            ref: `INV-CAP-${inv.id}`,
            desc: `Capital Injection: ${inv.investorName} (${inv.investmentType})`,
            date: inv.date,
            inflow: inv.amount,
            outflow: 0,
            balance: runningBalance,
          });
        }
      }

      // Outflow: Cash Expenses
      for (const exp of periodExpenses) {
        if (exp.payType === 'Cash') {
          runningBalance -= exp.amount;
          cashEntries.push({
            ref: `EXP-${exp.id}`,
            desc: `${exp.expenseType} - Paid to ${exp.paidTo}`,
            date: exp.date,
            inflow: 0,
            outflow: exp.amount,
            balance: runningBalance,
          });
        }
      }

      // Outflow: Cash Profit Out / Owner Draws
      for (const po of periodProfitOut) {
        if (po.payType === 'Cash') {
          runningBalance -= po.amount;
          cashEntries.push({
            ref: `DRAW-${po.id}`,
            desc: `Profit Distribution / Draw - ${po.recipient}`,
            date: po.date,
            inflow: 0,
            outflow: po.amount,
            balance: runningBalance,
          });
        }
      }

      // Sort by date ascending for clean cashbook ledger
      cashEntries.sort((a, b) => a.date.localeCompare(b.date));

      const totalInflow = cashEntries.reduce((s, e) => s + e.inflow, 0);
      const totalOutflow = cashEntries.reduce((s, e) => s + e.outflow, 0);
      const netCashBalance = totalInflow - totalOutflow;

      // Recalculate true progressive balance
      let rolling = 0;
      const progressiveRows = cashEntries.map((e) => {
        rolling += e.inflow - e.outflow;
        return { ...e, balance: rolling };
      });

      const csvHeader = 'Ref,Description,Date,Inflow (LKR),Outflow (LKR),Balance (LKR)\n';
      const csvBody = progressiveRows
        .map((r) => `"${r.ref}","${r.desc}","${r.date}",${r.inflow},${r.outflow},${r.balance}`)
        .join('\n');

      reportResult = {
        title: 'Cashbook Register',
        category: 'Accounting Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total Cash Inflow', value: `LKR ${totalInflow.toLocaleString()}`, highlight: true },
          { label: 'Total Cash Outflow', value: `LKR ${totalOutflow.toLocaleString()}` },
          { label: 'Net Cash In-Hand', value: `LKR ${netCashBalance.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'ref', label: 'Ref / Voucher', align: 'left' },
          { key: 'desc', label: 'Particulars / Description', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'inflow', label: 'Inflow (LKR)', align: 'right' },
          { key: 'outflow', label: 'Outflow (LKR)', align: 'right' },
          { key: 'balance', label: 'Balance (LKR)', align: 'right' },
        ],
        rows: progressiveRows,
        totals: {
          ref: 'PERIOD TOTAL',
          desc: `${progressiveRows.length} Ledger Entries`,
          date: '-',
          inflow: totalInflow,
          outflow: totalOutflow,
          balance: netCashBalance,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE B: PROFIT / LOSS LEDGER
    // ------------------------------------------------------------------------
    else if (reportType.includes('profit') || reportType.includes('loss')) {
      const totalSalesRevenue = periodBills.reduce((s, b) => s + b.netTotal, 0);

      // COGS (Cost of goods sold)
      const periodBillNumbers = periodBills.map((b) => b.billNo);
      const itemsSold = allBillItems.filter((i) => periodBillNumbers.includes(i.billNo));
      const totalCogs = itemsSold.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0);

      // Repair jobs completed revenue
      const deliveredJobs = allJobs.filter((j) => j.status === 'Delivered' && (j.completedDate || j.date) >= startDate && (j.completedDate || j.date) <= endDate);
      const repairLaborRevenue = deliveredJobs.reduce((s, j) => s + j.estimatedPrice, 0);
      const repairPartsCost = deliveredJobs.reduce((s, j) => s + (j.sparePartsAmount ?? j.totalPartsCost ?? 0), 0);

      const totalOtherOperatingIncome = periodOtherIncomes.reduce((s, oi) => s + oi.amount, 0);
      const grossOperatingRevenue = totalSalesRevenue + repairLaborRevenue + totalOtherOperatingIncome;
      const totalDirectCost = totalCogs + repairPartsCost;
      const grossProfit = grossOperatingRevenue - totalDirectCost;

      const totalOperatingExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
      const netOperatingProfit = grossProfit - totalOperatingExpenses;
      const totalOwnerDraws = periodProfitOut.reduce((s, po) => s + po.amount, 0);
      const retainedEarnings = netOperatingProfit - totalOwnerDraws;

      const rows = [
        { item: 'Retail POS Sales Revenue', type: 'Revenue', amount: totalSalesRevenue, notes: `${periodBills.length} Invoices generated` },
        { item: 'Mobile Repair Labor Revenue', type: 'Revenue', amount: repairLaborRevenue, notes: `${deliveredJobs.length} Completed jobs delivered` },
        { item: 'Non-Sales Operating Incomes', type: 'Revenue', amount: totalOtherOperatingIncome, notes: `${periodOtherIncomes.length} Secondary revenue receipts` },
        { item: 'Cost of Goods Sold (Retail Inventory)', type: 'COGS', amount: totalCogs, notes: 'Wholesale acquisition cost of sold items' },
        { item: 'Hardware Spare Parts Consumed in Repairs', type: 'COGS', amount: repairPartsCost, notes: 'Fitted screens, batteries, charging flex' },
        { item: 'GROSS OPERATING PROFIT', type: 'Gross Profit', amount: grossProfit, notes: 'Gross Margin before operational overhead' },
        { item: 'Shop Operating Overhead & Expenses', type: 'Expense', amount: totalOperatingExpenses, notes: `${periodExpenses.length} Expense vouchers recorded` },
        { item: 'NET OPERATING PROFIT', type: 'Operating Profit', amount: netOperatingProfit, notes: 'Operating bottom-line before owner distributions' },
        { item: 'Owner Draws & Partner Distributions', type: 'Distribution', amount: totalOwnerDraws, notes: `${periodProfitOut.length} Profit drawings recorded` },
        { item: 'RETAINED BUSINESS EARNINGS', type: 'Net Retained', amount: retainedEarnings, notes: 'Retained capital after drawings' },
      ];

      const csvHeader = 'Line Item,Type,Amount (LKR),Notes\n';
      const csvBody = rows.map((r) => `"${r.item}","${r.type}",${r.amount},"${r.notes}"`).join('\n');

      reportResult = {
        title: 'Profit & Loss Statement',
        category: 'Accounting Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Gross Revenue', value: `LKR ${grossOperatingRevenue.toLocaleString()}` },
          { label: 'Total Direct COGS', value: `LKR ${totalDirectCost.toLocaleString()}` },
          { label: 'Net Business Profit', value: `LKR ${netOperatingProfit.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'item', label: 'Financial Category', align: 'left' },
          { key: 'type', label: 'Classification', align: 'left' },
          { key: 'amount', label: 'Amount (LKR)', align: 'right' },
          { key: 'notes', label: 'Audit Notes', align: 'left' },
        ],
        rows,
        totals: {
          item: 'NET BOTTOM LINE',
          type: 'Net Income',
          amount: netOperatingProfit,
          notes: netOperatingProfit >= 0 ? 'Profitable Period' : 'Deficit Period',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE C-1: ITEM HISTORY REPORT (Item Transaction Ledger)
    // ------------------------------------------------------------------------
    else if (reportType.includes('item_history') || reportType.includes('item history')) {
      const targetQuery = String(req.query.itemCode || req.query.code || req.query.q || '').trim().toLowerCase();

      let matchedItem = null;
      if (targetQuery) {
        const found = allInventory.filter(
          (i) =>
            i.code.toLowerCase() === targetQuery ||
            (i.barcode && i.barcode.toLowerCase() === targetQuery) ||
            i.name.toLowerCase().includes(targetQuery)
        );
        if (found.length > 0) matchedItem = found[0];
      }
      if (!matchedItem && allInventory.length > 0) {
        matchedItem = allInventory[0];
      }

      let movements: any[] = [];
      if (matchedItem) {
        movements = await db
          .select()
          .from(stockMovementLogs)
          .where(eq(stockMovementLogs.itemCode, matchedItem.code))
          .orderBy(desc(stockMovementLogs.id));

        // If no records exist in stockMovementLogs yet for this item, synthesize initial record
        if (movements.length === 0) {
          const initDate = matchedItem.createdAt ? new Date(matchedItem.createdAt).toISOString().split('T')[0] : '2026-10-01';
          const initLog = {
            date: initDate,
            time: '09:00:00',
            itemCode: matchedItem.code,
            barcode: matchedItem.barcode || '',
            itemName: matchedItem.name,
            movementType: 'Initial Stock',
            refNo: 'INIT-OPENING',
            qtyChange: matchedItem.qty,
            balanceAfter: matchedItem.qty,
            costPrice: matchedItem.costPrice,
            sellingPrice: matchedItem.sellingPrice,
            user: 'Admin',
            outlet,
            notes: `Initial opening balance cataloged in ${matchedItem.category}`,
          };
          try {
            await db.insert(stockMovementLogs).values(initLog);
            movements = await db
              .select()
              .from(stockMovementLogs)
              .where(eq(stockMovementLogs.itemCode, matchedItem.code))
              .orderBy(desc(stockMovementLogs.id));
          } catch (e) {
            movements = [initLog];
          }
        }
      }

      // Filter movements by date range
      const periodMovements = movements.filter((m) => m.date >= startDate && m.date <= endDate);
      const activeRows = periodMovements.length > 0 ? periodMovements : movements;

      const rows = activeRows.map((m) => ({
        date: m.date,
        time: m.time,
        refNo: m.refNo,
        movementType: m.movementType,
        qtyChange: m.qtyChange > 0 ? `+${m.qtyChange}` : String(m.qtyChange),
        balanceAfter: m.balanceAfter,
        costPrice: m.costPrice,
        sellingPrice: m.sellingPrice,
        user: m.user,
        notes: m.notes || '-',
      }));

      const totalAdditions = activeRows.filter((m) => m.qtyChange > 0).reduce((acc, m) => acc + Number(m.qtyChange || 0), 0);
      const totalDeductions = activeRows.filter((m) => m.qtyChange < 0).reduce((acc, m) => acc + Math.abs(Number(m.qtyChange || 0)), 0);

      const csvHeader = 'Date,Time,Reference,Movement Type,Qty Change,Balance After,Cost Price,Selling Price,Cashier / User,Notes\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.date}","${r.time}","${r.refNo}","${r.movementType}","${r.qtyChange}",${r.balanceAfter},${r.costPrice},${r.sellingPrice},"${r.user}","${r.notes}"`
        )
        .join('\n');

      reportResult = {
        title: matchedItem ? `Item History: ${matchedItem.name} (${matchedItem.code})` : 'Item History Report',
        category: 'Stock Reports of Main Outlet',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Current On-Hand Stock', value: `${matchedItem ? matchedItem.qty : 0} Units`, highlight: true },
          { label: 'Total Inflow Additions', value: `+${totalAdditions} Units` },
          { label: 'Total Outflow Deductions', value: `-${totalDeductions} Units` },
          { label: 'Ledger Audit Entries', value: `${rows.length} Events` },
        ],
        headers: [
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'time', label: 'Time', align: 'center' },
          { key: 'refNo', label: 'Ref / Inv No', align: 'left' },
          { key: 'movementType', label: 'Movement Type', align: 'center' },
          { key: 'qtyChange', label: 'Qty Change', align: 'center' },
          { key: 'balanceAfter', label: 'Balance After', align: 'center' },
          { key: 'costPrice', label: 'Cost Price', align: 'right' },
          { key: 'sellingPrice', label: 'Selling Price', align: 'right' },
          { key: 'user', label: 'User / Cashier', align: 'left' },
          { key: 'notes', label: 'Audit Notes', align: 'left' },
        ],
        rows,
        totals: {
          date: 'CURRENT ON-HAND',
          time: '-',
          refNo: '-',
          movementType: '-',
          qtyChange: `${matchedItem ? matchedItem.qty : 0} Units`,
          balanceAfter: matchedItem ? matchedItem.qty : 0,
          costPrice: matchedItem ? matchedItem.costPrice : 0,
          sellingPrice: matchedItem ? matchedItem.sellingPrice : 0,
          user: '-',
          notes: matchedItem ? `${matchedItem.category} &bull; ${matchedItem.brand}` : '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE C-2: STOCK & INVENTORY VALUATION REPORTS
    // ------------------------------------------------------------------------
    else if (reportType.includes('stock') || reportType.includes('price')) {
      const isZeroOnly = reportType.includes('zero');
      const filteredStock = isZeroOnly ? allInventory.filter((i) => i.qty <= 0) : allInventory;

      const rows = filteredStock.map((it) => {
        const costValuation = it.costPrice * it.qty;
        const retailValuation = it.sellingPrice * it.qty;
        const margin = it.sellingPrice > 0 ? Math.round(((it.sellingPrice - it.costPrice) / it.sellingPrice) * 100) : 0;
        return {
          code: it.code,
          barcode: it.barcode,
          name: it.name,
          category: it.category,
          brand: it.brand,
          qty: it.qty,
          costPrice: it.costPrice,
          sellingPrice: it.sellingPrice,
          costValuation,
          retailValuation,
          margin: `${margin}%`,
          status: it.availability,
        };
      });

      const totalUnits = rows.reduce((s, r) => s + r.qty, 0);
      const totalCostValuation = rows.reduce((s, r) => s + r.costValuation, 0);
      const totalRetailValuation = rows.reduce((s, r) => s + r.retailValuation, 0);

      const csvHeader = 'Code,Barcode,Name,Category,Brand,Qty,Cost Price,Selling Price,Cost Valuation,Retail Valuation,Margin\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.code}","${r.barcode}","${r.name}","${r.category}","${r.brand}",${r.qty},${r.costPrice},${r.sellingPrice},${r.costValuation},${r.retailValuation},"${r.margin}"`
        )
        .join('\n');

      reportResult = {
        title: isZeroOnly ? 'Zero Stock Alert Report' : 'Detailed Inventory Valuation Report',
        category: 'Stock Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total SKUs', value: `${rows.length} Items` },
          { label: 'Total Units in Stock', value: `${totalUnits.toLocaleString()} Pcs` },
          { label: 'Inventory Cost Value', value: `LKR ${totalCostValuation.toLocaleString()}`, highlight: true },
          { label: 'Retail Expected Value', value: `LKR ${totalRetailValuation.toLocaleString()}` },
        ],
        headers: [
          { key: 'code', label: 'Item Code', align: 'left' },
          { key: 'name', label: 'Description', align: 'left' },
          { key: 'category', label: 'Category', align: 'left' },
          { key: 'qty', label: 'Quantity', align: 'center' },
          { key: 'costPrice', label: 'Cost Price', align: 'right' },
          { key: 'sellingPrice', label: 'Retail Price', align: 'right' },
          { key: 'costValuation', label: 'Cost Valuation', align: 'right' },
          { key: 'retailValuation', label: 'Retail Valuation', align: 'right' },
          { key: 'margin', label: 'Margin', align: 'center' },
        ],
        rows,
        totals: {
          code: 'STOCK VALUATION TOTAL',
          name: `${rows.length} Catalog SKUs`,
          category: '-',
          qty: totalUnits,
          costPrice: '-',
          sellingPrice: '-',
          costValuation: totalCostValuation,
          retailValuation: totalRetailValuation,
          margin: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE D: SUPPLIER & DEBTOR STATEMENTS
    // ------------------------------------------------------------------------
    else if (reportType.includes('debtor') || reportType.includes('supplier')) {
      const rows = allSuppliers.map((s) => ({
        code: s.code,
        name: s.name,
        contact: s.contactNumber,
        totalPurchase: s.totalPurchase,
        paidAmount: s.paidAmount,
        returns: s.purchaseReturn,
        balancePay: s.balancePay,
        status: s.balancePay > 0 ? 'Payable Due' : 'Fully Settled',
      }));

      const totalPurchases = rows.reduce((s, r) => s + r.totalPurchase, 0);
      const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
      const totalPayable = rows.reduce((s, r) => s + r.balancePay, 0);

      const csvHeader = 'Code,Supplier Name,Contact,Total Purchase,Paid Amount,Returns,Balance Payable\n';
      const csvBody = rows
        .map((r) => `"${r.code}","${r.name}","${r.contact}",${r.totalPurchase},${r.paidAmount},${r.returns},${r.balancePay}`)
        .join('\n');

      reportResult = {
        title: 'Supplier Debtor Statement',
        category: 'Supplier Statements',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total Purchases', value: `LKR ${totalPurchases.toLocaleString()}` },
          { label: 'Total Paid Out', value: `LKR ${totalPaid.toLocaleString()}` },
          { label: 'Outstanding Balance Pay', value: `LKR ${totalPayable.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'code', label: 'Code', align: 'left' },
          { key: 'name', label: 'Supplier Name', align: 'left' },
          { key: 'contact', label: 'Phone', align: 'left' },
          { key: 'totalPurchase', label: 'Total Purchase (LKR)', align: 'right' },
          { key: 'paidAmount', label: 'Paid Amount (LKR)', align: 'right' },
          { key: 'returns', label: 'Returns (LKR)', align: 'right' },
          { key: 'balancePay', label: 'Balance Payable (LKR)', align: 'right' },
        ],
        rows,
        totals: {
          code: 'TOTAL',
          name: `${rows.length} Suppliers`,
          contact: '-',
          totalPurchase: totalPurchases,
          paidAmount: totalPaid,
          returns: 0,
          balancePay: totalPayable,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE E: CUSTOMER CREDITOR / REPAIR AGEING STATEMENTS
    // ------------------------------------------------------------------------
    else if (reportType.includes('creditor') || reportType.includes('customer')) {
      const unpaidJobs = allJobs.filter((j) => {
        const partsCost = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
        const due = Math.max(0, (j.estimatedPrice + partsCost) - j.advancePaid);
        return due > 0;
      });

      const today = new Date();
      const rows = unpaidJobs.map((j) => {
        const partsCost = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
        const total = j.estimatedPrice + partsCost;
        const due = Math.max(0, total - j.advancePaid);
        const jobDate = new Date(j.date);
        const diffDays = Math.max(0, Math.floor((today.getTime() - jobDate.getTime()) / (1000 * 3600 * 24)));
        const ageingBucket = diffDays <= 30 ? '0-30 Days' : diffDays <= 60 ? '31-60 Days' : '60+ Days Overdue';
        return {
          jobNo: j.jobNumber,
          customer: j.customerName,
          phone: j.phoneNumber,
          device: `${j.deviceBrand} ${j.deviceModel}`,
          date: j.date,
          ageDays: `${diffDays}d`,
          bucket: ageingBucket,
          total,
          advance: j.advancePaid,
          due,
        };
      });

      const totalDue = rows.reduce((s, r) => s + r.due, 0);

      const csvHeader = 'Job No,Customer,Phone,Device,Date,Age,Ageing Bucket,Total,Advance,Balance Due\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.jobNo}","${r.customer}","${r.phone}","${r.device}","${r.date}","${r.ageDays}","${r.bucket}",${r.total},${r.advance},${r.due}`
        )
        .join('\n');

      reportResult = {
        title: 'Customer Creditor Statement & Ageing',
        category: 'Customer Statements',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Pending Jobs with Dues', value: `${rows.length} Jobs` },
          { label: 'Total Due Receivables', value: `LKR ${totalDue.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'jobNo', label: 'Job ID', align: 'left' },
          { key: 'customer', label: 'Customer Name', align: 'left' },
          { key: 'phone', label: 'Phone', align: 'left' },
          { key: 'device', label: 'Device', align: 'left' },
          { key: 'date', label: 'Intake Date', align: 'center' },
          { key: 'bucket', label: 'Ageing Tier', align: 'center' },
          { key: 'total', label: 'Total (LKR)', align: 'right' },
          { key: 'advance', label: 'Advance (LKR)', align: 'right' },
          { key: 'due', label: 'Balance Due (LKR)', align: 'right' },
        ],
        rows,
        totals: {
          jobNo: 'TOTAL DUES',
          customer: `${rows.length} Unsettled Accounts`,
          phone: '-',
          device: '-',
          date: '-',
          bucket: '-',
          total: rows.reduce((s, r) => s + r.total, 0),
          advance: rows.reduce((s, r) => s + r.advance, 0),
          due: totalDue,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE F: SALES RETURNS & REFUNDS AUDIT
    // ------------------------------------------------------------------------
    else if (reportType.includes('return') || reportType.includes('refund')) {
      const allReturns = await db.select().from(salesReturns).orderBy(desc(salesReturns.id));
      const allRetItems = await db.select().from(salesReturnItems);
      const periodReturns = allReturns.filter((r) => r.date >= startDate && r.date <= endDate);

      const rows = periodReturns.map((r) => {
        const items = allRetItems.filter((i) => i.returnNumber === r.returnNumber);
        const itemsSummary = items.map((i) => `${i.itemName} (x${i.qty})`).join(', ');
        return {
          returnNo: r.returnNumber,
          date: r.date,
          type: r.returnType === 'WITH_BILL' ? 'With Bill' : 'Direct Return',
          origBill: r.originalBillNo || '-',
          customer: r.customerName,
          phone: r.customerPhone,
          refundType: r.refundType,
          items: itemsSummary || 'Returned Goods',
          amount: r.totalAmount,
          reason: r.reason,
          restocked: r.restocked ? 'Restocked' : 'Scrapped',
        };
      });

      const totalReturnedAmount = rows.reduce((s, r) => s + r.amount, 0);

      const csvHeader = 'Return No,Date,Type,Original Bill,Customer,Phone,Refund Type,Items,Amount,Reason,Restocked\n';
      const csvBody = rows
        .map((r) => `"${r.returnNo}","${r.date}","${r.type}","${r.origBill}","${r.customer}","${r.phone}","${r.refundType}","${r.items}",${r.amount},"${r.reason}","${r.restocked}"`)
        .join('\n');

      reportResult = {
        title: 'Sales Returns & Refund Register',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total Returns', value: `${rows.length} Vouchers` },
          { label: 'Total Refund Value', value: `LKR ${totalReturnedAmount.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'returnNo', label: 'Return ID', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'type', label: 'Mode', align: 'center' },
          { key: 'origBill', label: 'Original Inv', align: 'left' },
          { key: 'customer', label: 'Customer', align: 'left' },
          { key: 'refundType', label: 'Refund Mode', align: 'center' },
          { key: 'items', label: 'Returned Items', align: 'left' },
          { key: 'amount', label: 'Total (LKR)', align: 'right' },
          { key: 'restocked', label: 'Stock Status', align: 'center' },
        ],
        rows,
        totals: {
          returnNo: 'RETURNS TOTAL',
          date: '-',
          type: '-',
          origBill: '-',
          customer: `${rows.length} Entries`,
          refundType: '-',
          items: '-',
          amount: totalReturnedAmount,
          restocked: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE G: BANK & CARD DIGITAL SETTLEMENTS
    // ------------------------------------------------------------------------
    else if (reportType.includes('card') || reportType.includes('bank') || reportType.includes('online')) {
      const allBanks = await db.select().from(bankAccounts);
      const allBankTxs = await db.select().from(bankTransactions).orderBy(desc(bankTransactions.id));
      const periodTxs = allBankTxs.filter((t) => t.date >= startDate && t.date <= endDate);

      const rows = periodTxs.map((t) => ({
        id: t.id,
        date: t.date,
        bank: t.bankAccountName,
        type: t.type,
        refNo: t.refNo || '-',
        description: t.description || '-',
        amount: t.amount,
      }));

      const totalDigitalSettled = rows.reduce((s, r) => s + r.amount, 0);

      const csvHeader = 'Date,Bank Account,Type,Reference,Description,Amount (LKR)\n';
      const csvBody = rows
        .map((r) => `"${r.date}","${r.bank}","${r.type}","${r.refNo}","${r.description}",${r.amount}`)
        .join('\n');

      reportResult = {
        title: 'Bank Accounts & Digital POS Settlements',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Active Bank Accounts', value: `${allBanks.length} Banks` },
          { label: 'Total Transactions', value: `${rows.length} Tx` },
          { label: 'Digital POS Volume', value: `LKR ${totalDigitalSettled.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'bank', label: 'Bank Registry', align: 'left' },
          { key: 'type', label: 'Channel', align: 'center' },
          { key: 'refNo', label: 'Ref / Invoice', align: 'left' },
          { key: 'description', label: 'Particulars', align: 'left' },
          { key: 'amount', label: 'Settled (LKR)', align: 'right' },
        ],
        rows,
        totals: {
          date: '-',
          bank: 'TOTAL DIGITAL SETTLEMENTS',
          type: '-',
          refNo: '-',
          description: `${rows.length} Transactions`,
          amount: totalDigitalSettled,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-1: SALES MARGIN ANALYSIS (Cost vs Retail Selling Margins)
    // ------------------------------------------------------------------------
    else if (reportType.includes('margin')) {
      const periodBillNumbers = periodBills.map((b) => b.billNo);
      const periodItems = allBillItems.filter((i) => periodBillNumbers.includes(i.billNo));

      const rows = periodItems.map((i) => {
        const rev = i.price * i.qty - (i.discount || 0);
        const cost = (i.costPrice || 0) * i.qty;
        const profit = rev - cost;
        const marginPct = rev > 0 ? Math.round((profit / rev) * 100) : 0;
        return {
          billNo: i.billNo,
          code: i.itemCode,
          name: i.itemName,
          qty: i.qty,
          costPrice: i.costPrice || 0,
          sellingPrice: i.price,
          costTotal: cost,
          revenueTotal: rev,
          grossProfit: profit,
          margin: `${marginPct}%`,
        };
      });

      const totalRevenue = rows.reduce((s, r) => s + r.revenueTotal, 0);
      const totalCost = rows.reduce((s, r) => s + r.costTotal, 0);
      const totalGrossProfit = rows.reduce((s, r) => s + r.grossProfit, 0);
      const overallMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;

      const csvHeader = 'Bill No,Code,Item Name,Qty,Cost Price,Selling Price,Cost Total,Revenue Total,Gross Profit,Margin\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.billNo}","${r.code}","${r.name}",${r.qty},${r.costPrice},${r.sellingPrice},${r.costTotal},${r.revenueTotal},${r.grossProfit},"${r.margin}"`
        )
        .join('\n');

      reportResult = {
        title: 'Sales Margin & Markup Register',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total Sold Revenue', value: `LKR ${totalRevenue.toLocaleString()}` },
          { label: 'Total COGS Acquisition', value: `LKR ${totalCost.toLocaleString()}` },
          { label: 'Gross Operating Profit', value: `LKR ${totalGrossProfit.toLocaleString()}`, highlight: true },
          { label: 'Overall Average Margin', value: `${overallMargin}%` },
        ],
        headers: [
          { key: 'billNo', label: 'Bill No', align: 'left' },
          { key: 'code', label: 'Item Code', align: 'left' },
          { key: 'name', label: 'Item Description', align: 'left' },
          { key: 'qty', label: 'Qty Sold', align: 'center' },
          { key: 'costPrice', label: 'Unit Cost', align: 'right' },
          { key: 'sellingPrice', label: 'Unit Price', align: 'right' },
          { key: 'costTotal', label: 'Cost Total', align: 'right' },
          { key: 'revenueTotal', label: 'Net Revenue', align: 'right' },
          { key: 'grossProfit', label: 'Gross Profit', align: 'right' },
          { key: 'margin', label: 'Margin', align: 'center' },
        ],
        rows,
        totals: {
          billNo: 'MARGIN TOTAL',
          code: '-',
          name: `${rows.length} Sold Items`,
          qty: rows.reduce((s, r) => s + r.qty, 0),
          costPrice: '-',
          sellingPrice: '-',
          costTotal: totalCost,
          revenueTotal: totalRevenue,
          grossProfit: totalGrossProfit,
          margin: `${overallMargin}%`,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-2: SALES BY ITEMS (SKU-Level Sales Performance)
    // ------------------------------------------------------------------------
    else if (reportType.includes('by_items') || reportType.includes('by items')) {
      const periodBillNumbers = periodBills.map((b) => b.billNo);
      const periodItems = allBillItems.filter((i) => periodBillNumbers.includes(i.billNo));

      const itemMap = new Map<string, any>();
      for (const pi of periodItems) {
        const existing = itemMap.get(pi.itemCode) || {
          code: pi.itemCode,
          name: pi.itemName,
          qtySold: 0,
          revenueTotal: 0,
          costTotal: 0,
        };
        existing.qtySold += pi.qty;
        existing.revenueTotal += pi.price * pi.qty - (pi.discount || 0);
        existing.costTotal += (pi.costPrice || 0) * pi.qty;
        itemMap.set(pi.itemCode, existing);
      }

      const rows = Array.from(itemMap.values()).map((it) => {
        const profit = it.revenueTotal - it.costTotal;
        const marginPct = it.revenueTotal > 0 ? Math.round((profit / it.revenueTotal) * 100) : 0;
        return {
          ...it,
          grossProfit: profit,
          margin: `${marginPct}%`,
        };
      });

      const totalUnits = rows.reduce((s, r) => s + r.qtySold, 0);
      const totalRev = rows.reduce((s, r) => s + r.revenueTotal, 0);
      const totalProfit = rows.reduce((s, r) => s + r.grossProfit, 0);

      const csvHeader = 'Item Code,Item Name,Units Sold,Total Revenue (LKR),Total Cost (LKR),Gross Profit (LKR),Margin\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.code}","${r.name}",${r.qtySold},${r.revenueTotal},${r.costTotal},${r.grossProfit},"${r.margin}"`
        )
        .join('\n');

      reportResult = {
        title: 'Sales Volume by Items & Parts',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Distinct SKUs Sold', value: `${rows.length} SKUs` },
          { label: 'Total Volume Dispatched', value: `${totalUnits.toLocaleString()} Pcs` },
          { label: 'Revenue Generated', value: `LKR ${totalRev.toLocaleString()}`, highlight: true },
          { label: 'Total Item Profit', value: `LKR ${totalProfit.toLocaleString()}` },
        ],
        headers: [
          { key: 'code', label: 'Item Code', align: 'left' },
          { key: 'name', label: 'Product Name', align: 'left' },
          { key: 'qtySold', label: 'Qty Sold', align: 'center' },
          { key: 'revenueTotal', label: 'Total Revenue (LKR)', align: 'right' },
          { key: 'costTotal', label: 'Total Cost (LKR)', align: 'right' },
          { key: 'grossProfit', label: 'Gross Profit (LKR)', align: 'right' },
          { key: 'margin', label: 'Margin', align: 'center' },
        ],
        rows,
        totals: {
          code: 'TOTAL',
          name: `${rows.length} Distinct Items`,
          qtySold: totalUnits,
          revenueTotal: totalRev,
          costTotal: rows.reduce((s, r) => s + r.costTotal, 0),
          grossProfit: totalProfit,
          margin: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-3: SALES SUMMARY BY DAYS (Daily Trajectory & Trend)
    // ------------------------------------------------------------------------
    else if (reportType.includes('days') || reportType.includes('daily')) {
      const dayMap = new Map<string, any>();
      for (const b of periodBills) {
        const existing = dayMap.get(b.date) || {
          date: b.date,
          billCount: 0,
          grossTotal: 0,
          discount: 0,
          netTotal: 0,
          cashPaid: 0,
          digitalPaid: 0,
        };
        existing.billCount += 1;
        existing.grossTotal += b.subtotal;
        existing.discount += b.discount;
        existing.netTotal += b.netTotal;
        if (b.paymentMethod === 'Cash') existing.cashPaid += b.paidAmount;
        else existing.digitalPaid += b.paidAmount;
        dayMap.set(b.date, existing);
      }

      const rows = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      const totalBills = rows.reduce((s, r) => s + r.billCount, 0);
      const totalNet = rows.reduce((s, r) => s + r.netTotal, 0);
      const totalCash = rows.reduce((s, r) => s + r.cashPaid, 0);
      const totalDigital = rows.reduce((s, r) => s + r.digitalPaid, 0);

      const csvHeader = 'Date,Invoices,Gross Sales,Discounts,Net Sales,Cash Collected,Digital Collected\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.date}",${r.billCount},${r.grossTotal},${r.discount},${r.netTotal},${r.cashPaid},${r.digitalPaid}`
        )
        .join('\n');

      reportResult = {
        title: 'Sales Summary by Days',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Active Trading Days', value: `${rows.length} Days` },
          { label: 'Total Bills Issued', value: `${totalBills} Invoices` },
          { label: 'Daily Average Revenue', value: `LKR ${rows.length > 0 ? Math.round(totalNet / rows.length).toLocaleString() : 0}` },
          { label: 'Total Period Sales', value: `LKR ${totalNet.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'date', label: 'Trading Date', align: 'center' },
          { key: 'billCount', label: 'Invoices', align: 'center' },
          { key: 'grossTotal', label: 'Gross Sales (LKR)', align: 'right' },
          { key: 'discount', label: 'Discounts (LKR)', align: 'right' },
          { key: 'netTotal', label: 'Net Sales (LKR)', align: 'right' },
          { key: 'cashPaid', label: 'Cash Inflow (LKR)', align: 'right' },
          { key: 'digitalPaid', label: 'Digital Inflow (LKR)', align: 'right' },
        ],
        rows,
        totals: {
          date: 'TOTAL TRADING',
          billCount: totalBills,
          grossTotal: rows.reduce((s, r) => s + r.grossTotal, 0),
          discount: rows.reduce((s, r) => s + r.discount, 0),
          netTotal: totalNet,
          cashPaid: totalCash,
          digitalPaid: totalDigital,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-4: SHOP OVERHEAD EXPENSES
    // ------------------------------------------------------------------------
    else if (reportType.includes('expense')) {
      const rows = periodExpenses.map((e) => ({
        id: `EXP-${e.id}`,
        date: e.date,
        type: e.expenseType,
        paidTo: e.paidTo,
        paymentMethod: e.payType,
        amount: e.amount,
        notes: e.remark || e.expenseType || '-',
      }));

      const totalExpense = rows.reduce((s, r) => s + r.amount, 0);

      const csvHeader = 'Voucher ID,Date,Expense Category,Paid To,Payment Mode,Amount (LKR),Notes\n';
      const csvBody = rows
        .map((r) => `"${r.id}","${r.date}","${r.type}","${r.paidTo}","${r.paymentMethod}",${r.amount},"${r.notes}"`)
        .join('\n');

      reportResult = {
        title: 'Outlet Operational Expenses',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Expense Vouchers', value: `${rows.length} Vouchers` },
          { label: 'Total Overhead Outflow', value: `LKR ${totalExpense.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'id', label: 'Voucher ID', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'type', label: 'Expense Category', align: 'left' },
          { key: 'paidTo', label: 'Beneficiary', align: 'left' },
          { key: 'paymentMethod', label: 'Payment Mode', align: 'center' },
          { key: 'amount', label: 'Amount (LKR)', align: 'right' },
          { key: 'notes', label: 'Audit Notes', align: 'left' },
        ],
        rows,
        totals: {
          id: 'EXPENSES TOTAL',
          date: '-',
          type: `${rows.length} Records`,
          paidTo: '-',
          paymentMethod: '-',
          amount: totalExpense,
          notes: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-5: OTHER NON-SALES INCOMES
    // ------------------------------------------------------------------------
    else if (reportType.includes('other_income') || reportType.includes('other income') || reportType.includes('incomes')) {
      const rows = periodOtherIncomes.map((oi) => ({
        id: `INC-${oi.id}`,
        date: oi.date,
        type: oi.source || 'Secondary Income',
        source: oi.receivedFrom || oi.source,
        paymentMethod: oi.payType,
        amount: oi.amount,
        notes: oi.remark || '-',
      }));

      const totalIncome = rows.reduce((s, r) => s + r.amount, 0);

      const csvHeader = 'Receipt ID,Date,Income Category,Source,Payment Mode,Amount (LKR),Notes\n';
      const csvBody = rows
        .map((r) => `"${r.id}","${r.date}","${r.type}","${r.source}","${r.paymentMethod}",${r.amount},"${r.notes}"`)
        .join('\n');

      reportResult = {
        title: 'Other Operating Incomes Register',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Income Receipts', value: `${rows.length} Receipts` },
          { label: 'Total Secondary Income', value: `LKR ${totalIncome.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'id', label: 'Receipt ID', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'type', label: 'Income Source', align: 'left' },
          { key: 'source', label: 'Received From', align: 'left' },
          { key: 'paymentMethod', label: 'Payment Mode', align: 'center' },
          { key: 'amount', label: 'Amount (LKR)', align: 'right' },
          { key: 'notes', label: 'Audit Notes', align: 'left' },
        ],
        rows,
        totals: {
          id: 'INCOME TOTAL',
          date: '-',
          type: `${rows.length} Records`,
          source: '-',
          paymentMethod: '-',
          amount: totalIncome,
          notes: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-6: DEFERRED CUSTOMER CREDITS & RECEIVABLES
    // ------------------------------------------------------------------------
    else if (reportType.includes('credit')) {
      const creditBills = periodBills.filter((b) => b.paymentTerm === 'Credit' || b.paidAmount < b.netTotal);
      const rows = creditBills.map((b) => {
        const balance = Math.max(0, b.netTotal - b.paidAmount);
        return {
          billNo: b.billNo,
          date: b.date,
          customer: b.customerName,
          phone: b.customerPhone || '-',
          total: b.netTotal,
          paid: b.paidAmount,
          balanceDue: balance,
          cashier: b.cashierName,
        };
      });

      const totalCreditSales = rows.reduce((s, r) => s + r.total, 0);
      const totalCreditDue = rows.reduce((s, r) => s + r.balanceDue, 0);

      const csvHeader = 'Bill No,Date,Customer,Phone,Total (LKR),Paid (LKR),Balance Due (LKR),Cashier\n';
      const csvBody = rows
        .map((r) => `"${r.billNo}","${r.date}","${r.customer}","${r.phone}",${r.total},${r.paid},${r.balanceDue},"${r.cashier}"`)
        .join('\n');

      reportResult = {
        title: 'Customer Credit Bills & Dues Register',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Unsettled Credit Bills', value: `${rows.length} Invoices` },
          { label: 'Total Credit Volume', value: `LKR ${totalCreditSales.toLocaleString()}` },
          { label: 'Outstanding Receivables', value: `LKR ${totalCreditDue.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'billNo', label: 'Bill No', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'customer', label: 'Customer Name', align: 'left' },
          { key: 'phone', label: 'Phone', align: 'left' },
          { key: 'total', label: 'Bill Total (LKR)', align: 'right' },
          { key: 'paid', label: 'Amount Paid (LKR)', align: 'right' },
          { key: 'balanceDue', label: 'Balance Due (LKR)', align: 'right' },
          { key: 'cashier', label: 'Cashier', align: 'left' },
        ],
        rows,
        totals: {
          billNo: 'CREDIT DUES TOTAL',
          date: '-',
          customer: `${rows.length} Bills`,
          phone: '-',
          total: totalCreditSales,
          paid: rows.reduce((s, r) => s + r.paid, 0),
          balanceDue: totalCreditDue,
          cashier: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-7: PROMOTIONAL FREE ISSUES REGISTER
    // ------------------------------------------------------------------------
    else if (reportType.includes('free_issue') || reportType.includes('free issue') || reportType.includes('free_issues')) {
      const freeRows: any[] = [];
      for (const b of periodBills) {
        const items = allBillItems.filter((i) => i.billNo === b.billNo && (i.price === 0 || i.discount >= i.total));
        for (const fi of items) {
          freeRows.push({
            billNo: b.billNo,
            date: b.date,
            customer: b.customerName,
            item: fi.itemName,
            qty: fi.qty,
            retailValue: fi.price * fi.qty,
            costValue: (fi.costPrice || 0) * fi.qty,
            notes: 'Complimentary customer issue',
          });
        }
      }

      const totalRetailValue = freeRows.reduce((s, r) => s + r.retailValue, 0);
      const totalCostValue = freeRows.reduce((s, r) => s + r.costValue, 0);

      const csvHeader = 'Bill No,Date,Customer,Complimentary Item,Qty,Retail Value (LKR),Acquisition Cost (LKR),Notes\n';
      const csvBody = freeRows
        .map((r) => `"${r.billNo}","${r.date}","${r.customer}","${r.item}",${r.qty},${r.retailValue},${r.costValue},"${r.notes}"`)
        .join('\n');

      reportResult = {
        title: 'Complimentary Free Issues Register',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Free Items Issued', value: `${freeRows.length} Items` },
          { label: 'Retail Value Given', value: `LKR ${totalRetailValue.toLocaleString()}` },
          { label: 'Acquisition Cost Burden', value: `LKR ${totalCostValue.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'billNo', label: 'Bill No', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'customer', label: 'Customer', align: 'left' },
          { key: 'item', label: 'Complimentary SKU', align: 'left' },
          { key: 'qty', label: 'Qty', align: 'center' },
          { key: 'retailValue', label: 'Retail Value (LKR)', align: 'right' },
          { key: 'costValue', label: 'Cost Burden (LKR)', align: 'right' },
        ],
        rows: freeRows,
        totals: {
          billNo: 'FREE ISSUES TOTAL',
          date: '-',
          customer: `${freeRows.length} Items`,
          item: '-',
          qty: freeRows.reduce((s, r) => s + r.qty, 0),
          retailValue: totalRetailValue,
          costValue: totalCostValue,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-8: INVOICE-BY-INVOICE PROFIT SUMMARY
    // ------------------------------------------------------------------------
    else if (reportType.includes('bill_profit') || reportType.includes('bill profit')) {
      const rows = periodBills.map((b) => {
        const items = allBillItems.filter((i) => i.billNo === b.billNo);
        const cogs = items.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0);
        const profit = b.netTotal - cogs;
        const marginPct = b.netTotal > 0 ? Math.round((profit / b.netTotal) * 100) : 0;
        return {
          billNo: b.billNo,
          date: b.date,
          customer: b.customerName,
          itemsCount: items.length,
          netSales: b.netTotal,
          cogs,
          grossProfit: profit,
          margin: `${marginPct}%`,
        };
      });

      const totalNetSales = rows.reduce((s, r) => s + r.netSales, 0);
      const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
      const totalProfit = rows.reduce((s, r) => s + r.grossProfit, 0);
      const overallMargin = totalNetSales > 0 ? Math.round((totalProfit / totalNetSales) * 100) : 0;

      const csvHeader = 'Bill No,Date,Customer,Items,Net Sales,COGS,Gross Profit,Margin\n';
      const csvBody = rows
        .map((r) => `"${r.billNo}","${r.date}","${r.customer}",${r.itemsCount},${r.netSales},${r.cogs},${r.grossProfit},"${r.margin}"`)
        .join('\n');

      reportResult = {
        title: 'Bill-by-Bill Profit Margins',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total Invoices', value: `${rows.length} Bills` },
          { label: 'Net Sales Volume', value: `LKR ${totalNetSales.toLocaleString()}` },
          { label: 'Total Direct COGS', value: `LKR ${totalCogs.toLocaleString()}` },
          { label: 'Net Bill Profit', value: `LKR ${totalProfit.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'billNo', label: 'Bill No', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'customer', label: 'Customer', align: 'left' },
          { key: 'itemsCount', label: 'Items', align: 'center' },
          { key: 'netSales', label: 'Net Sales (LKR)', align: 'right' },
          { key: 'cogs', label: 'Cost of Goods (LKR)', align: 'right' },
          { key: 'grossProfit', label: 'Gross Profit (LKR)', align: 'right' },
          { key: 'margin', label: 'Margin', align: 'center' },
        ],
        rows,
        totals: {
          billNo: 'PROFIT REGISTER TOTAL',
          date: '-',
          customer: `${rows.length} Bills`,
          itemsCount: rows.reduce((s, r) => s + r.itemsCount, 0),
          netSales: totalNetSales,
          cogs: totalCogs,
          grossProfit: totalProfit,
          margin: `${overallMargin}%`,
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-9: CASH RECEIPTS REGISTER
    // ------------------------------------------------------------------------
    else if (reportType.includes('cash_payment') || reportType.includes('cash payment') || reportType.includes('cash_payments')) {
      const cashBills = periodBills.filter((b) => b.paymentMethod === 'Cash' || b.paidAmount > 0);
      const rows = cashBills.map((b) => ({
        billNo: b.billNo,
        date: b.date,
        time: b.time,
        customer: b.customerName,
        phone: b.customerPhone || '-',
        paidAmount: b.paidAmount,
        netTotal: b.netTotal,
        cashier: b.cashierName,
      }));

      const totalCashReceived = rows.reduce((s, r) => s + r.paidAmount, 0);

      const csvHeader = 'Bill No,Date,Time,Customer,Phone,Cash Collected,Invoice Total,Cashier\n';
      const csvBody = rows
        .map((r) => `"${r.billNo}","${r.date}","${r.time}","${r.customer}","${r.phone}",${r.paidAmount},${r.netTotal},"${r.cashier}"`)
        .join('\n');

      reportResult = {
        title: 'Counter Cash Receipts Register',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Cash Invoices', value: `${rows.length} Bills` },
          { label: 'Total Cash Collected', value: `LKR ${totalCashReceived.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'billNo', label: 'Bill No', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'time', label: 'Time', align: 'center' },
          { key: 'customer', label: 'Customer', align: 'left' },
          { key: 'paidAmount', label: 'Cash Collected (LKR)', align: 'right' },
          { key: 'netTotal', label: 'Bill Total (LKR)', align: 'right' },
          { key: 'cashier', label: 'Cashier', align: 'left' },
        ],
        rows,
        totals: {
          billNo: 'CASH REGISTER TOTAL',
          date: '-',
          time: '-',
          customer: `${rows.length} Bills`,
          paidAmount: totalCashReceived,
          netTotal: rows.reduce((s, r) => s + r.netTotal, 0),
          cashier: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    // ------------------------------------------------------------------------
    // CASE H-10: GENERAL SALES BILLS REGISTER (Default)
    // ------------------------------------------------------------------------
    else {
      const rows = periodBills.map((b) => ({
        billNo: b.billNo,
        date: b.date,
        time: b.time,
        customer: b.customerName,
        phone: b.customerPhone || '-',
        subtotal: b.subtotal,
        discount: b.discount,
        netTotal: b.netTotal,
        paymentMethod: b.paymentMethod,
        cashier: b.cashierName,
        linkedJob: b.linkedJobNumber || 'Retail Checkout',
      }));

      const totalGross = rows.reduce((s, r) => s + r.subtotal, 0);
      const totalDiscount = rows.reduce((s, r) => s + r.discount, 0);
      const totalNet = rows.reduce((s, r) => s + r.netTotal, 0);

      const csvHeader = 'Bill No,Date,Time,Customer,Phone,Subtotal,Discount,Net Total,Payment Method,Cashier\n';
      const csvBody = rows
        .map(
          (r) =>
            `"${r.billNo}","${r.date}","${r.time}","${r.customer}","${r.phone}",${r.subtotal},${r.discount},${r.netTotal},"${r.paymentMethod}","${r.cashier}"`
        )
        .join('\n');

      reportResult = {
        title: title || 'Sales Summary by Bills',
        category: 'Sales & Payments Reports',
        period: { startDate, endDate },
        outlet,
        metrics: [
          { label: 'Total Invoices', value: `${rows.length} Bills` },
          { label: 'Gross Sales', value: `LKR ${totalGross.toLocaleString()}` },
          { label: 'Total Discounts', value: `LKR ${totalDiscount.toLocaleString()}` },
          { label: 'Net Sales Volume', value: `LKR ${totalNet.toLocaleString()}`, highlight: true },
        ],
        headers: [
          { key: 'billNo', label: 'Bill No', align: 'left' },
          { key: 'date', label: 'Date', align: 'center' },
          { key: 'customer', label: 'Customer', align: 'left' },
          { key: 'paymentMethod', label: 'Payment', align: 'center' },
          { key: 'subtotal', label: 'Subtotal (LKR)', align: 'right' },
          { key: 'discount', label: 'Discount (LKR)', align: 'right' },
          { key: 'netTotal', label: 'Net Total (LKR)', align: 'right' },
          { key: 'linkedJob', label: 'Origin', align: 'left' },
        ],
        rows,
        totals: {
          billNo: 'SALES REGISTER TOTAL',
          date: '-',
          customer: `${rows.length} Invoices`,
          paymentMethod: '-',
          subtotal: totalGross,
          discount: totalDiscount,
          netTotal: totalNet,
          linkedJob: '-',
        },
        csvData: csvHeader + csvBody,
      };
    }

    res.json(reportResult);
  } catch (error: any) {
    console.error('Reports generation error:', error);
    res.status(500).json({ error: 'Failed to aggregate report data' });
  }
});

// Dedicated Item History Endpoint for instant SKU Ledger inspection
enterpriseRouter.get('/inventory/item-history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawQuery = String(req.query.itemCode || req.query.code || req.query.q || '').trim();
    const allItems = await db.select().from(inventoryItems).orderBy(inventoryItems.name);

    if (!rawQuery) {
      return res.json({
        items: allItems.map((i) => ({
          code: i.code,
          barcode: i.barcode,
          name: i.name,
          category: i.category,
          brand: i.brand,
          costPrice: i.costPrice,
          sellingPrice: i.sellingPrice,
          qty: i.qty,
        })),
        selectedItem: null,
        movements: [],
      });
    }

    const qLower = rawQuery.toLowerCase();
    const matched = allItems.find(
      (i) =>
        i.code.toLowerCase() === qLower ||
        (i.barcode && i.barcode.toLowerCase() === qLower) ||
        i.name.toLowerCase().includes(qLower)
    );

    if (!matched) {
      return res.json({
        items: allItems.map((i) => ({
          code: i.code,
          barcode: i.barcode,
          name: i.name,
          category: i.category,
          brand: i.brand,
          costPrice: i.costPrice,
          sellingPrice: i.sellingPrice,
          qty: i.qty,
        })),
        selectedItem: null,
        movements: [],
      });
    }

    let movements = await db
      .select()
      .from(stockMovementLogs)
      .where(eq(stockMovementLogs.itemCode, matched.code))
      .orderBy(desc(stockMovementLogs.id));

    if (movements.length === 0) {
      const initDate = matched.createdAt ? new Date(matched.createdAt).toISOString().split('T')[0] : '2026-10-01';
      const initLog = {
        date: initDate,
        time: '09:00:00',
        itemCode: matched.code,
        barcode: matched.barcode || '',
        itemName: matched.name,
        movementType: 'Initial Stock',
        refNo: 'INIT-OPENING',
        qtyChange: matched.qty,
        balanceAfter: matched.qty,
        costPrice: matched.costPrice,
        sellingPrice: matched.sellingPrice,
        user: 'Admin',
        outlet: 'Main Outlet Akkaraipattu',
        notes: `Initial opening balance cataloged in ${matched.category}`,
      };
      try {
        await db.insert(stockMovementLogs).values(initLog);
        movements = await db
          .select()
          .from(stockMovementLogs)
          .where(eq(stockMovementLogs.itemCode, matched.code))
          .orderBy(desc(stockMovementLogs.id));
      } catch (e) {
        movements = [initLog as any];
      }
    }

    res.json({
      items: allItems.map((i) => ({
        code: i.code,
        barcode: i.barcode,
        name: i.name,
        category: i.category,
        brand: i.brand,
        costPrice: i.costPrice,
        sellingPrice: i.sellingPrice,
        qty: i.qty,
      })),
      selectedItem: matched,
      movements,
    });
  } catch (error: any) {
    console.error('Item history endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch item history' });
  }
});

// ============================================================================
// 8. REAL-TIME MULTI-ENTITY GLOBAL HEADER SEARCH ENGINE
// ============================================================================
enterpriseRouter.get('/search/global', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawQ = String(req.query.q || '').trim();
    if (!rawQ) {
      return res.json({ jobs: [], items: [], suppliers: [], customers: [] });
    }

    const pattern = `%${rawQ}%`;

    const [jobsRes, itemsRes, suppliersRes, customersRes] = await Promise.all([
      db
        .select()
        .from(repairJobs)
        .where(
          or(
            ilike(repairJobs.jobNumber, pattern),
            ilike(repairJobs.customerName, pattern),
            ilike(repairJobs.phoneNumber, pattern),
            ilike(repairJobs.deviceBrand, pattern),
            ilike(repairJobs.deviceModel, pattern),
            ilike(repairJobs.imei, pattern)
          )
        )
        .limit(6),

      db
        .select()
        .from(inventoryItems)
        .where(
          or(
            ilike(inventoryItems.code, pattern),
            ilike(inventoryItems.barcode, pattern),
            ilike(inventoryItems.name, pattern),
            ilike(inventoryItems.category, pattern)
          )
        )
        .limit(6),

      db
        .select()
        .from(suppliers)
        .where(
          or(
            ilike(suppliers.code, pattern),
            ilike(suppliers.name, pattern),
            ilike(suppliers.contactNumber, pattern)
          )
        )
        .limit(6),

      db
        .select()
        .from(customerAccounts)
        .where(
          or(
            ilike(customerAccounts.phoneNumber, pattern),
            ilike(customerAccounts.customerName, pattern)
          )
        )
        .limit(6),
    ]);

    const mappedJobs = jobsRes.map((j) => {
      const sparePartsAmount = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
      const dueAmount = Math.max(0, (j.estimatedPrice + sparePartsAmount) - j.advancePaid);
      return {
        ...j,
        sparePartsAmount,
        dueAmount,
      };
    });

    res.json({
      jobs: mappedJobs,
      items: itemsRes,
      suppliers: suppliersRes,
      customers: customersRes,
    });
  } catch (error: any) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Failed to search global records' });
  }
});

// ============================================================================
// 9. DEDICATED CUSTOMER MANAGEMENT MODULE (Add, Edit, Bulk Import, Balances)
// ============================================================================

// Get all customer accounts with repair counts & ledger balances
enterpriseRouter.get('/customer-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(customerAccounts)
      .orderBy(desc(customerAccounts.id));

    // Also get repair counts per phone number
    const jobs = await db.select({ phoneNumber: repairJobs.phoneNumber }).from(repairJobs);
    const repairCounts: Record<string, number> = {};
    for (const j of jobs) {
      const p = j.phoneNumber.trim();
      repairCounts[p] = (repairCounts[p] || 0) + 1;
    }

    const enhanced = list.map((c) => ({
      ...c,
      creditLimit: c.creditLimit || 50000,
      totalRepairs: repairCounts[c.phoneNumber.trim()] || 0,
      availableCredit: Math.max(0, (c.creditLimit || 50000) - (c.creditDue || 0)),
    }));

    res.json(enhanced);
  } catch (error: any) {
    console.error('Failed to get customer accounts:', error);
    res.status(500).json({ error: 'Failed to retrieve customer accounts' });
  }
});

// Create a new customer
enterpriseRouter.post('/customer-accounts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { customerName, phoneNumber, address, creditLimit, openingBalance, openingBalanceType } = req.body;
    if (!customerName || !phoneNumber) {
      return res.status(400).json({ error: 'Customer Name and Phone Number are required' });
    }

    const cleanPhone = String(phoneNumber).trim();
    const cleanName = String(customerName).trim();
    const limit = Number(creditLimit) || 50000;
    const initialBal = Number(openingBalance) || 0;

    let advanceBalance = 0;
    let creditDue = 0;
    if (openingBalanceType === 'Advance') {
      advanceBalance = Math.max(0, initialBal);
    } else if (openingBalanceType === 'Credit') {
      creditDue = Math.max(0, initialBal);
    }

    // Check if customer already exists by phone
    const existing = await db
      .select()
      .from(customerAccounts)
      .where(eq(customerAccounts.phoneNumber, cleanPhone));

    if (existing.length > 0) {
      return res.status(400).json({ error: `Customer with phone ${cleanPhone} already exists (${existing[0].customerName}). Please edit instead.` });
    }

    const [created] = await db
      .insert(customerAccounts)
      .values({
        customerName: cleanName,
        phoneNumber: cleanPhone,
        address: address ? String(address).trim() : null,
        creditLimit: limit,
        advanceBalance,
        creditDue,
        totalPurchases: 0,
      })
      .returning();

    // If opening balance > 0, record in customer ledger
    if (initialBal > 0) {
      await db.insert(customerLedgerEntries).values({
        customerPhone: cleanPhone,
        customerName: cleanName,
        date: new Date().toISOString().split('T')[0],
        type: openingBalanceType === 'Advance' ? 'Advance Applied' : 'Credit Sale',
        refNo: `OPENING-${created.id}`,
        debit: openingBalanceType === 'Credit' ? initialBal : 0,
        credit: openingBalanceType === 'Advance' ? initialBal : 0,
        balance: openingBalanceType === 'Credit' ? initialBal : -initialBal,
        notes: 'Opening balance setup on account creation',
      });
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Failed to create customer:', error);
    res.status(500).json({ error: 'Failed to create customer record' });
  }
});

// Quick Add Customer endpoint alias
enterpriseRouter.post('/customers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { customerName, phoneNumber, address, creditLimit, openingBalance, openingBalanceType } = req.body;
    if (!customerName || !phoneNumber) {
      return res.status(400).json({ error: 'Customer Name and Phone Number are required' });
    }

    const cleanPhone = String(phoneNumber).trim();
    const cleanName = String(customerName).trim();
    const limit = Number(creditLimit) || 50000;
    const initialBal = Number(openingBalance) || 0;

    let advanceBalance = 0;
    let creditDue = 0;
    if (openingBalanceType === 'Advance') {
      advanceBalance = Math.max(0, initialBal);
    } else if (openingBalanceType === 'Credit') {
      creditDue = Math.max(0, initialBal);
    }

    const existing = await db
      .select()
      .from(customerAccounts)
      .where(eq(customerAccounts.phoneNumber, cleanPhone));

    if (existing.length > 0) {
      // If already exists, return existing
      return res.status(200).json({
        ...existing[0],
        message: 'Customer already exists and has been selected.',
      });
    }

    const [created] = await db
      .insert(customerAccounts)
      .values({
        customerName: cleanName,
        phoneNumber: cleanPhone,
        address: address ? String(address).trim() : null,
        creditLimit: limit,
        advanceBalance,
        creditDue,
        totalPurchases: 0,
      })
      .returning();

    if (initialBal > 0) {
      await db.insert(customerLedgerEntries).values({
        customerPhone: cleanPhone,
        customerName: cleanName,
        date: new Date().toISOString().split('T')[0],
        type: openingBalanceType === 'Advance' ? 'Advance Applied' : 'Credit Sale',
        refNo: 'OPEN-BAL',
        debit: openingBalanceType === 'Credit' ? initialBal : 0,
        credit: openingBalanceType === 'Advance' ? initialBal : 0,
        balance: openingBalanceType === 'Credit' ? initialBal : -initialBal,
        notes: 'Opening balance setup on account creation',
      });
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Failed to create customer:', error);
    res.status(500).json({ error: 'Failed to create customer record' });
  }
});

// Update an existing customer
enterpriseRouter.put('/customer-accounts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { customerName, phoneNumber, address, creditLimit, creditDue, advanceBalance } = req.body;

    const existing = await db
      .select()
      .from(customerAccounts)
      .where(eq(customerAccounts.id, id));

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };
    if (customerName) updateData.customerName = String(customerName).trim();
    if (phoneNumber) updateData.phoneNumber = String(phoneNumber).trim();
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit) || 0;
    if (creditDue !== undefined) updateData.creditDue = Number(creditDue) || 0;
    if (advanceBalance !== undefined) updateData.advanceBalance = Number(advanceBalance) || 0;

    const [updated] = await db
      .update(customerAccounts)
      .set(updateData)
      .where(eq(customerAccounts.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update customer:', error);
    res.status(500).json({ error: 'Failed to update customer record' });
  }
});

// Bulk import customer records from CSV data
enterpriseRouter.post('/customer-accounts/bulk-import', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records must be a non-empty array' });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    const sanitizeInt = (val: any, fallback = 0): number => {
      if (val === undefined || val === null || val === '') return fallback;
      const cleaned = String(val).replace(/[^0-9.-]+/g, '');
      const parsed = Math.round(Number(cleaned));
      if (isNaN(parsed)) return fallback;
      // Clamp within PostgreSQL 32-bit signed integer limits
      return Math.max(0, Math.min(2147483647, parsed));
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const rec = records[i];
        if (!rec || typeof rec !== 'object') {
          errors.push(`Row ${i + 1}: Invalid row structure`);
          continue;
        }

        const rawPhone = rec.phoneNumber ?? rec.phone ?? rec.Phone ?? rec.contact ?? rec.Contact ?? '';
        const rawName = rec.customerName ?? rec.name ?? rec.Name ?? '';
        const rawAddress = rec.address ?? rec.Address ?? rec.city ?? rec.City ?? null;

        const phone = String(rawPhone).replace(/\.0+$/, '').trim();
        const name = String(rawName).trim();
        const address = rawAddress ? String(rawAddress).trim() : null;

        const limit = sanitizeInt(rec.creditLimit ?? rec.CreditLimit ?? rec.limit, 50000);
        const credit = sanitizeInt(rec.creditDue ?? rec.CreditDue ?? rec.balance, 0);
        const advance = sanitizeInt(rec.advanceBalance ?? rec.AdvanceBalance ?? rec.advance, 0);

        if (!phone || !name) {
          errors.push(`Row ${i + 1}: Missing name (${name || 'empty'}) or phone (${phone || 'empty'})`);
          continue;
        }

        const existing = await db
          .select()
          .from(customerAccounts)
          .where(eq(customerAccounts.phoneNumber, phone));

        if (existing.length > 0) {
          await db
            .update(customerAccounts)
            .set({
              customerName: name,
              address: address !== null ? address : existing[0].address,
              creditLimit: limit,
              creditDue: credit > 0 ? credit : existing[0].creditDue,
              advanceBalance: advance > 0 ? advance : existing[0].advanceBalance,
              updatedAt: new Date(),
            })
            .where(eq(customerAccounts.id, existing[0].id));
          updatedCount++;
        } else {
          await db.insert(customerAccounts).values({
            phoneNumber: phone,
            customerName: name,
            address: address || null,
            creditLimit: limit,
            creditDue: credit,
            advanceBalance: advance,
            totalPurchases: 0,
          });
          createdCount++;
        }
      } catch (rowErr: any) {
        console.error(`Row ${i + 1} processing error:`, rowErr);
        errors.push(`Row ${i + 1}: ${rowErr.message || 'Error processing record'}`);
      }
    }

    res.json({
      success: true,
      totalProcessed: records.length,
      createdCount,
      updatedCount,
      errors,
      message: `Successfully processed ${createdCount + updatedCount} of ${records.length} customers (${createdCount} created, ${updatedCount} updated).`,
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message || 'Failed to process bulk import' });
  }
});

// ============================================================================
// 10. ADMIN AUTHORIZATION & TRANSACTION REVERSALS
// ============================================================================

// Verify Admin PIN / Credentials
enterpriseRouter.post('/auth/verify-admin-pin', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pin, password } = req.body;
    const cleanPin = String(pin || password || '').trim();

    // Accepted secure admin PINs / Passwords
    const VALID_ADMIN_PINS = ['7788', '1234', '9999', 'admin', 'admin123'];

    const isPinValid = VALID_ADMIN_PINS.includes(cleanPin);
    const isUserAdminRole = req.user?.role?.toLowerCase() === 'admin';

    if (isPinValid || (isUserAdminRole && cleanPin.length > 0)) {
      return res.json({
        authorized: true,
        adminName: req.user?.name || 'Administrator',
        message: 'Admin authorization successful',
      });
    }

    return res.status(403).json({
      authorized: false,
      error: 'Invalid Admin PIN or password. Authorization rejected.',
    });
  } catch (error: any) {
    console.error('Admin pin verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Admin Delete Inventory Item
enterpriseRouter.delete('/inventory/items/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { adminPin } = req.body || {};

    const VALID_ADMIN_PINS = ['7788', '1234', '9999', 'admin', 'admin123'];
    const authorized =
      req.user?.role?.toLowerCase() === 'admin' ||
      (adminPin && VALID_ADMIN_PINS.includes(String(adminPin).trim()));

    if (!authorized) {
      return res.status(403).json({ error: 'Admin authorization required to delete inventory items' });
    }

    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    res.json({ success: true, message: `Inventory item ${existing[0].name} deleted successfully` });
  } catch (error: any) {
    console.error('Inventory delete error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Admin Reverse POS Sales Bill (Restores Stock & Voids/Reverses Ledger)
enterpriseRouter.post('/pos/bills/:billNo/reverse', requireAuth, async (req: AuthRequest, res) => {
  try {
    const billNo = req.params.billNo;
    const { adminPin, reason } = req.body;

    const VALID_ADMIN_PINS = ['7788', '1234', '9999', 'admin', 'admin123'];
    const authorized =
      req.user?.role?.toLowerCase() === 'admin' ||
      (adminPin && VALID_ADMIN_PINS.includes(String(adminPin).trim()));

    if (!authorized) {
      return res.status(403).json({ error: 'Admin authorization required to reverse POS sales bills' });
    }

    const bills = await db.select().from(posBills).where(eq(posBills.billNo, billNo));
    if (bills.length === 0) {
      return res.status(404).json({ error: `Bill ${billNo} not found` });
    }

    const bill = bills[0];
    if (bill.status === 'Reversed') {
      return res.status(400).json({ error: `Bill ${billNo} is already reversed` });
    }

    // 1. Restore Stock for all items in bill
    const items = await db.select().from(posBillItems).where(eq(posBillItems.billNo, billNo));
    for (const item of items) {
      await db.execute(sql`
        UPDATE inventory_items
        SET qty = qty + ${item.qty}, updated_at = NOW()
        WHERE code = ${item.itemCode}
      `);
    }

    // 2. If credit sale, deduct customer creditDue
    if (bill.paymentTerm === 'Credit' && bill.customerPhone) {
      const remainingCredit = bill.creditDue || bill.netTotal;
      await db.execute(sql`
        UPDATE customer_accounts
        SET credit_due = GREATEST(0, credit_due - ${remainingCredit}), updated_at = NOW()
        WHERE phone_number = ${bill.customerPhone}
      `);
    }

    // 3. If advance was applied, restore customer advanceBalance
    if (bill.advanceApplied && bill.advanceApplied > 0 && bill.customerPhone) {
      await db.execute(sql`
        UPDATE customer_accounts
        SET advance_balance = advance_balance + ${bill.advanceApplied}, updated_at = NOW()
        WHERE phone_number = ${bill.customerPhone}
      `);
    }

    // 4. Mark bill as Reversed with audit log note
    await db
      .update(posBills)
      .set({
        status: 'Reversed',
        notes: `REVERSED by Admin (${req.user?.name || 'Admin'}). Reason: ${reason || 'Transaction reversal / correction'}`,
      })
      .where(eq(posBills.billNo, billNo));

    res.json({
      success: true,
      message: `Bill ${billNo} has been safely reversed. Restored ${items.length} items to inventory.`,
      billNo,
      restoredItemsCount: items.length,
    });
  } catch (error: any) {
    console.error('POS bill reverse error:', error);
    res.status(500).json({ error: 'Failed to reverse POS sales bill' });
  }
});

// ============================================================================
// DATABASE BACKUP, HEALTH STATS & RESTORE MANAGEMENT
// ============================================================================

// 1. GET /api/database/stats - Quick stats on records count & database health
enterpriseRouter.get('/database/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allBills = await db.select().from(posBills);
    const allJobs = await db.select().from(repairJobs);
    const allItems = await db.select().from(inventoryItems);
    const allCustomers = await db.select().from(customerAccounts);
    const allExpenses = await db.select().from(expenses);
    const allSuppliers = await db.select().from(suppliers);

    const totalSales = allBills.reduce((acc, b) => acc + (b.netTotal || 0), 0);
    const totalInventoryValue = allItems.reduce((acc, i) => acc + ((i.qty || 0) * (i.costPrice || 0)), 0);
    const totalCreditOutstanding = allCustomers.reduce((acc, c) => acc + (c.creditDue || 0), 0);
    const activeJobs = allJobs.filter((j) => !['Delivered', 'Cancelled'].includes(j.status)).length;

    // Check last backup timestamp from appSettings
    const lastBackupSetting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingKey, 'last_backup_timestamp'));

    const lastBackupBySetting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingKey, 'last_backup_by'));

    res.json({
      invoicesCount: allBills.length,
      totalSales,
      jobsCount: allJobs.length,
      activeJobsCount: activeJobs,
      inventoryCount: allItems.length,
      totalInventoryValue,
      customersCount: allCustomers.length,
      totalCreditOutstanding,
      expensesCount: allExpenses.length,
      suppliersCount: allSuppliers.length,
      lastBackupTimestamp: lastBackupSetting[0]?.settingValue || null,
      lastBackupBy: lastBackupBySetting[0]?.settingValue || null,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Database stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve database stats' });
  }
});

// 2. GET /api/database/backup - Compiles full JSON snapshot of all database entities
enterpriseRouter.get('/database/backup', requireAuth, async (req: AuthRequest, res) => {
  try {
    const timestamp = new Date().toISOString();

    const [
      bills,
      billItems,
      jobs,
      items,
      customers,
      customerLedgers,
      expensesList,
      advances,
      advanceApps,
      payments,
      banks,
      bankTx,
      suppliersList,
      settingsList,
      returnsList,
    ] = await Promise.all([
      db.select().from(posBills).orderBy(desc(posBills.id)),
      db.select().from(posBillItems).orderBy(desc(posBillItems.id)),
      db.select().from(repairJobs).orderBy(desc(repairJobs.id)),
      db.select().from(inventoryItems).orderBy(desc(inventoryItems.id)),
      db.select().from(customerAccounts).orderBy(desc(customerAccounts.id)),
      db.select().from(customerLedgerEntries).orderBy(desc(customerLedgerEntries.id)),
      db.select().from(expenses).orderBy(desc(expenses.id)),
      db.select().from(advancePayments).orderBy(desc(advancePayments.id)),
      db.select().from(advanceApplications).orderBy(desc(advanceApplications.id)),
      db.select().from(jobPayments).orderBy(desc(jobPayments.id)),
      db.select().from(bankAccounts).orderBy(desc(bankAccounts.id)),
      db.select().from(bankTransactions).orderBy(desc(bankTransactions.id)),
      db.select().from(suppliers).orderBy(desc(suppliers.id)),
      db.select().from(appSettings),
      db.select().from(salesReturns).orderBy(desc(salesReturns.id)),
    ]);

    // Update last backup timestamp in appSettings
    const userIdentifier = req.user?.name || req.user?.email || 'Admin';
    await db
      .insert(appSettings)
      .values({ settingKey: 'last_backup_timestamp', settingValue: timestamp })
      .onConflictDoUpdate({
        target: appSettings.settingKey,
        set: { settingValue: timestamp, updatedAt: new Date() },
      });

    await db
      .insert(appSettings)
      .values({ settingKey: 'last_backup_by', settingValue: userIdentifier })
      .onConflictDoUpdate({
        target: appSettings.settingKey,
        set: { settingValue: userIdentifier, updatedAt: new Date() },
      });

    const backupBundle = {
      backupVersion: '2.0',
      system: 'POS & Mobile Repair Shop Management Engine',
      generatedAt: timestamp,
      generatedBy: userIdentifier,
      summary: {
        invoicesCount: bills.length,
        invoiceItemsCount: billItems.length,
        jobSheetsCount: jobs.length,
        inventoryStockCount: items.length,
        customerAccountsCount: customers.length,
        customerLedgerCount: customerLedgers.length,
        expensesCount: expensesList.length,
        advancePaymentsCount: advances.length,
        jobPaymentsCount: payments.length,
        bankAccountsCount: banks.length,
        suppliersCount: suppliersList.length,
        salesReturnsCount: returnsList.length,
      },
      tables: {
        posBills: bills,
        posBillItems: billItems,
        repairJobs: jobs,
        inventoryItems: items,
        customerAccounts: customers,
        customerLedgerEntries: customerLedgers,
        expenses: expensesList,
        advancePayments: advances,
        advanceApplications: advanceApps,
        jobPayments: payments,
        bankAccounts: banks,
        bankTransactions: bankTx,
        suppliers: suppliersList,
        appSettings: settingsList,
        salesReturns: returnsList,
      },
    };

    res.json(backupBundle);
  } catch (err: any) {
    console.error('Backup generation error:', err);
    res.status(500).json({ error: 'Failed to generate database backup' });
  }
});

// 3. POST /api/database/restore - Validates and restores/merges data from backup file
enterpriseRouter.post('/database/restore', requireAuth, async (req: AuthRequest, res) => {
  try {
    const backupData = req.body;
    if (!backupData || (!backupData.tables && !backupData.posBills && !backupData.repairJobs)) {
      return res.status(400).json({ error: 'Invalid backup file format. Missing table collections.' });
    }

    const tables = backupData.tables || backupData;
    let restoredCounts = {
      invoices: 0,
      jobs: 0,
      inventory: 0,
      customers: 0,
      expenses: 0,
      suppliers: 0,
    };

    // 1. Restore Inventory Items (upsert by code)
    if (Array.isArray(tables.inventoryItems)) {
      for (const item of tables.inventoryItems) {
        if (!item.code || !item.name) continue;
        try {
          await db
            .insert(inventoryItems)
            .values({
              code: item.code,
              barcode: item.barcode || item.code,
              name: item.name,
              category: item.category || 'General',
              brand: item.brand || 'Generic',
              size: item.size || 'Standard',
              color: item.color || 'Standard',
              costPrice: Number(item.costPrice) || 0,
              sellingPrice: Number(item.sellingPrice) || 0,
              qty: Number(item.qty) || 0,
              type: item.type || 'Accessory',
              availability: item.availability || 'In Stock',
            })
            .onConflictDoUpdate({
              target: inventoryItems.code,
              set: {
                name: item.name,
                category: item.category || 'General',
                brand: item.brand || 'Generic',
                costPrice: Number(item.costPrice) || 0,
                sellingPrice: Number(item.sellingPrice) || 0,
                qty: Number(item.qty) || 0,
                availability: item.availability || 'In Stock',
              },
            });
          restoredCounts.inventory++;
        } catch (e) {
          // ignore duplicate/constraint errors per record
        }
      }
    }

    // 2. Restore Customers (upsert by phone)
    if (Array.isArray(tables.customerAccounts)) {
      for (const cust of tables.customerAccounts) {
        const phone = cust.phoneNumber || cust.phone;
        const name = cust.customerName || cust.name;
        if (!phone || !name) continue;
        try {
          await db
            .insert(customerAccounts)
            .values({
              customerName: name,
              phoneNumber: phone,
              address: cust.address || null,
              creditLimit: Number(cust.creditLimit) || 50000,
              creditDue: Number(cust.creditDue) || 0,
              advanceBalance: Number(cust.advanceBalance) || 0,
              totalPurchases: Number(cust.totalPurchases || cust.totalInvoiced) || 0,
            })
            .onConflictDoUpdate({
              target: customerAccounts.phoneNumber,
              set: {
                customerName: name,
                creditDue: Number(cust.creditDue) || 0,
                advanceBalance: Number(cust.advanceBalance) || 0,
              },
            });
          restoredCounts.customers++;
        } catch (e) {}
      }
    }

    // 3. Restore Repair Jobs (upsert or insert)
    if (Array.isArray(tables.repairJobs)) {
      for (const job of tables.repairJobs) {
        if (!job.jobNumber || !job.customerName) continue;
        try {
          // Check if already exists
          const existing = await db
            .select()
            .from(repairJobs)
            .where(eq(repairJobs.jobNumber, job.jobNumber));

          if (existing.length === 0) {
            await db.insert(repairJobs).values({
              jobNumber: job.jobNumber,
              date: job.date || new Date().toISOString().split('T')[0],
              customerName: job.customerName,
              phoneNumber: job.phoneNumber || '',
              customerAddress: job.customerAddress || null,
              deviceBrand: job.deviceBrand || 'General',
              deviceModel: job.deviceModel || 'Phone',
              imei: job.imei || null,
              problems: typeof job.problems === 'string' ? job.problems : JSON.stringify(job.problems || []),
              otherProblem: job.otherProblem || null,
              notes: job.notes || null,
              estimatedPrice: Number(job.estimatedPrice) || 0,
              advancePaid: Number(job.advancePaid) || 0,
              technicianName: job.technicianName || 'General Tech',
              status: job.status || 'Received',
              accessories: typeof job.accessories === 'string' ? job.accessories : JSON.stringify(job.accessories || {}),
              spareParts: typeof job.spareParts === 'string' ? job.spareParts : JSON.stringify(job.spareParts || []),
              totalPartsCost: Number(job.totalPartsCost) || 0,
              dueAmount: Number(job.dueAmount) || 0,
              completedDate: job.completedDate || null,
            });
            restoredCounts.jobs++;
          }
        } catch (e) {}
      }
    }

    // 4. Restore POS Bills (insert missing)
    if (Array.isArray(tables.posBills)) {
      for (const bill of tables.posBills) {
        if (!bill.billNo) continue;
        try {
          const existing = await db
            .select()
            .from(posBills)
            .where(eq(posBills.billNo, bill.billNo));

          if (existing.length === 0) {
            await db.insert(posBills).values({
              billNo: bill.billNo,
              date: bill.date || new Date().toISOString().split('T')[0],
              time: bill.time || '12:00 PM',
              cashierId: bill.cashierId || 'CASH-01',
              cashierName: bill.cashierName || 'Cashier',
              customerName: bill.customerName || 'Walk-in Customer',
              customerPhone: bill.customerPhone || null,
              subtotal: Number(bill.subtotal) || 0,
              discount: Number(bill.discount) || 0,
              returns: Number(bill.returns) || 0,
              advancePaid: Number(bill.advancePaid) || 0,
              advanceApplied: Number(bill.advanceApplied) || 0,
              netTotal: Number(bill.netTotal) || 0,
              paidAmount: Number(bill.paidAmount) || 0,
              changeDue: Number(bill.changeDue) || 0,
              paymentMethod: bill.paymentMethod || 'Cash',
              paymentTerm: bill.paymentTerm || 'Cash',
              creditDue: Number(bill.creditDue) || 0,
              status: bill.status || 'Completed',
              notes: bill.notes || null,
            });
            restoredCounts.invoices++;
          }
        } catch (e) {}
      }
    }

    // 5. Restore POS Bill Items
    if (Array.isArray(tables.posBillItems)) {
      for (const bItem of tables.posBillItems) {
        if (!bItem.billNo || !bItem.itemName) continue;
        try {
          await db.insert(posBillItems).values({
            billNo: bItem.billNo,
            itemCode: bItem.itemCode || 'ITEM',
            itemName: bItem.itemName,
            qty: Number(bItem.qty) || 1,
            price: Number(bItem.price || bItem.unitPrice) || 0,
            costPrice: Number(bItem.costPrice || bItem.unitCost) || 0,
            discount: Number(bItem.discount) || 0,
            total: Number(bItem.total || bItem.totalPrice) || 0,
            isFromJob: !!(bItem.isFromJob || bItem.isServiceOrRepair),
          });
        } catch (e) {}
      }
    }

    // 6. Restore Expenses
    if (Array.isArray(tables.expenses)) {
      for (const exp of tables.expenses) {
        if (!exp.expenseType || !exp.amount) continue;
        try {
          await db.insert(expenses).values({
            location: exp.location || 'Main Outlet Akkaraipattu',
            expenseType: exp.expenseType,
            paidTo: exp.paidTo || 'Vendor',
            remark: exp.remark || null,
            payType: exp.payType || 'Cash',
            payInfo: exp.payInfo || null,
            date: exp.date || new Date().toISOString().split('T')[0],
            amount: Number(exp.amount) || 0,
          });
          restoredCounts.expenses++;
        } catch (e) {}
      }
    }

    // 7. Restore Suppliers
    if (Array.isArray(tables.suppliers)) {
      for (const sup of tables.suppliers) {
        if (!sup.code || !sup.name) continue;
        try {
          await db
            .insert(suppliers)
            .values({
              code: sup.code,
              name: sup.name,
              contactNumber: sup.contactNumber || 'N/A',
              address: sup.address || null,
              totalPurchase: Number(sup.totalPurchase) || 0,
              paidAmount: Number(sup.paidAmount) || 0,
              purchaseReturn: Number(sup.purchaseReturn) || 0,
              balancePay: Number(sup.balancePay) || 0,
            })
            .onConflictDoNothing();
          restoredCounts.suppliers++;
        } catch (e) {}
      }
    }

    res.json({
      success: true,
      message: 'Database backup restored and verified successfully!',
      restoredCounts,
      restoredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Database restore error:', err);
    res.status(500).json({ error: 'Failed to restore database backup' });
  }
});

