import { PosItem } from '../data/posData.ts';
import { parseDelimitedTable } from './csv.ts';

export interface StockImportValidationResult {
  success: boolean;
  items?: PosItem[];
  error?: string;
  missingColumns?: string[];
  totalRows?: number;
}

/**
 * Clean and parse numbers stripping currency symbols, commas, spaces
 */
export function cleanNumericValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * Normalizes header strings for matching: lowercase, strip punctuation and whitespace
 */
export function normalizeHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an Excel (.xlsx / .xls) or CSV / TSV file buffer into an array of PosItem objects,
 * verifying that required columns (especially SKU) exist and mapping columns accurately.
 */
export async function parseStockImportFile(file: File): Promise<StockImportValidationResult> {
  const fileName = file.name.toLowerCase();

  try {
    let rows: Record<string, any>[] = [];
    let detectedHeaders: string[] = [];

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // 1. SheetJS Excel parsing
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellText: true });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          error: 'The uploaded Excel workbook contains no worksheets.',
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet || !worksheet['!ref']) {
        return {
          success: false,
          error: 'The worksheet is empty.',
        };
      }

      // Read raw 2D array to find headers and row count
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: '',
      });

      if (!rawRows || rawRows.length === 0) {
        return {
          success: false,
          error: 'The uploaded Excel sheet contains no data rows.',
        };
      }

      // Find header row (first non-empty row)
      let headerRowIdx = 0;
      while (headerRowIdx < rawRows.length && (!rawRows[headerRowIdx] || rawRows[headerRowIdx].every((c) => !String(c).trim()))) {
        headerRowIdx++;
      }

      if (headerRowIdx >= rawRows.length) {
        return {
          success: false,
          error: 'Could not find any header columns in the uploaded Excel sheet.',
        };
      }

      detectedHeaders = rawRows[headerRowIdx].map((h) => String(h || '').trim());

      // Parse as objects with headers preserved
      const sheetObjects = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        range: headerRowIdx,
        defval: '',
        raw: false,
      });

      rows = sheetObjects;
    } else {
      // 2. CSV / Delimited text parsing
      const text = await file.text();
      const table = parseDelimitedTable(text);

      if (!table || table.length <= 1) {
        return {
          success: false,
          error: 'The uploaded file contains no data or only a single header row.',
        };
      }

      detectedHeaders = table[0].map((h) => String(h || '').trim());
      const headerKeys = table[0];

      for (let r = 1; r < table.length; r++) {
        const rowData = table[r];
        if (!rowData || rowData.length === 0 || rowData.every((c) => !c.trim())) continue;
        const obj: Record<string, any> = {};
        for (let c = 0; c < headerKeys.length; c++) {
          obj[headerKeys[c]] = rowData[c] || '';
        }
        rows.push(obj);
      }
    }

    if (detectedHeaders.length === 0 || rows.length === 0) {
      return {
        success: false,
        error: 'The uploaded file does not contain any item data rows.',
      };
    }

    // 3. Validation: Find matching header keys
    const normalizedHeaders = detectedHeaders.map((h) => ({
      original: h,
      norm: normalizeHeader(h),
    }));

    const findMatchingKey = (possibleAliases: string[]): string | null => {
      const aliasNorms = possibleAliases.map(normalizeHeader);
      for (const h of normalizedHeaders) {
        if (aliasNorms.includes(h.norm)) {
          return h.original;
        }
      }
      // Partial contains match fallback
      for (const h of normalizedHeaders) {
        if (aliasNorms.some((alias) => h.norm.includes(alias) || alias.includes(h.norm))) {
          return h.original;
        }
      }
      return null;
    };

    // SKU / Item Code aliases (REQUIRED)
    const skuKey = findMatchingKey([
      'sku',
      'item code',
      'itemcode',
      'code',
      'product code',
      'productcode',
      'item_code',
      'item id',
      'itemid',
      'part number',
      'partno',
    ]);

    // Validation Check: SKU is required
    if (!skuKey) {
      return {
        success: false,
        missingColumns: ['SKU'],
        error: `Validation Error: Missing required column 'SKU' (or 'Item Code'). Detected columns: [${detectedHeaders.join(', ')}]. Please ensure your file includes a column named 'SKU' or 'Item Code'.`,
      };
    }

    // Item Name aliases
    const nameKey = findMatchingKey([
      'item name',
      'itemname',
      'name',
      'product name',
      'productname',
      'description',
      'item description',
      'title',
      'item',
    ]);

    // Quantity aliases
    const qtyKey = findMatchingKey([
      'opening quantity',
      'opening qty',
      'openingquantity',
      'quantity',
      'qty',
      'stock',
      'stock quantity',
      'units',
      'balance',
      'on hand',
      'count',
    ]);

    // Selling Price aliases
    const sellingPriceKey = findMatchingKey([
      'selling price',
      'sellingprice',
      'retail price',
      'retailprice',
      'sale price',
      'saleprice',
      'price',
      'unit price',
      'mrp',
    ]);

    // Cost Price aliases
    const costPriceKey = findMatchingKey([
      'cost price',
      'costprice',
      'cost',
      'purchase price',
      'purchaseprice',
      'buying price',
      'buy price',
      'unit cost',
    ]);

    // Category aliases
    const categoryKey = findMatchingKey(['category', 'cat', 'type', 'group', 'department', 'section']);

    // Brand aliases
    const brandKey = findMatchingKey(['brand', 'make', 'manufacturer', 'vendor', 'model']);

    // Barcode aliases
    const barcodeKey = findMatchingKey(['barcode', 'bar code', 'upc', 'ean']);

    // 4. Map rows to PosItem[]
    const mappedItems: PosItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawSku = row[skuKey];
      const skuStr = String(rawSku ?? '').trim();

      // If SKU is empty, check if row has name; if both empty, skip empty row
      const rawName = nameKey ? row[nameKey] : '';
      const nameStr = String(rawName ?? '').trim();

      if (!skuStr && !nameStr) {
        continue;
      }

      // Final validated SKU code (preserving leading zeros, e.g., "000027")
      const finalCode = skuStr || String(Math.floor(100000 + Math.random() * 900000));
      const finalName = nameStr || `Stock Item ${finalCode}`;

      // Numbers
      let rawSelling = sellingPriceKey ? cleanNumericValue(row[sellingPriceKey]) : 0;
      let rawCost = costPriceKey ? cleanNumericValue(row[costPriceKey]) : 0;

      // Price cross-fallbacks
      if (rawSelling === 0 && rawCost > 0) {
        rawSelling = Math.round(rawCost * 1.3);
      } else if (rawCost === 0 && rawSelling > 0) {
        rawCost = Math.round(rawSelling * 0.7);
      }

      const rawQty = qtyKey ? Math.round(cleanNumericValue(row[qtyKey])) : 0;
      const finalQty = Math.max(0, rawQty);

      const categoryVal = categoryKey && row[categoryKey] ? String(row[categoryKey]).trim() : 'GENERAL';
      const brandVal = brandKey && row[brandKey] ? String(row[brandKey]).trim() : 'General';
      const barcodeVal = barcodeKey && row[barcodeKey] ? String(row[barcodeKey]).trim() : `890${finalCode.padStart(9, '0')}`;

      const posItem: PosItem = {
        id: `ITM-${finalCode}`,
        code: finalCode,
        barcode: barcodeVal,
        name: finalName,
        category: categoryVal.toUpperCase(),
        brand: brandVal,
        size: 'Standard',
        color: 'Assorted',
        costPrice: rawCost,
        sellingPrice: rawSelling,
        qty: finalQty,
        type: categoryVal.toUpperCase(),
        availability: finalQty > 5 ? 'In Stock' : finalQty > 0 ? 'Low Stock' : 'Out of Stock',
      };

      mappedItems.push(posItem);
    }

    if (mappedItems.length === 0) {
      return {
        success: false,
        error: 'No valid stock rows could be parsed from the uploaded file.',
      };
    }

    return {
      success: true,
      items: mappedItems,
      totalRows: mappedItems.length,
    };
  } catch (err: any) {
    console.error('Error during stock file import:', err);
    return {
      success: false,
      error: `Failed to parse file "${file.name}": ${err.message || 'Unknown parsing error'}`,
    };
  }
}
