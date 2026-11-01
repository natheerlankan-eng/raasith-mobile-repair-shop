import { RepairJob } from '../types.ts';
import { parseJobIssues } from './whatsapp.ts';

export function exportJobsToCSV(jobs: RepairJob[], shopName: string = 'Raasith Mobile'): void {
  const headers = [
    'Job ID',
    'Date',
    'Customer Name',
    'Phone Number',
    'Customer Address',
    'Device Brand',
    'Device Model',
    'Issues',
    'Other Problem',
    'Notes',
    'Estimated Price',
    'Advance Paid',
    'Balance Due',
    'Technician',
    'Status',
    'Received Msg Sent',
    'Ready Msg Sent',
    'Created At'
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = jobs.map((job) => {
    const balance = Math.max(0, job.estimatedPrice - job.advancePaid);
    const issues = parseJobIssues(job);

    return [
      escapeCSV(job.jobNumber),
      escapeCSV(job.date),
      escapeCSV(job.customerName),
      escapeCSV(job.phoneNumber),
      escapeCSV(job.customerAddress || ''),
      escapeCSV(job.deviceBrand),
      escapeCSV(job.deviceModel),
      escapeCSV(issues),
      escapeCSV(job.otherProblem || ''),
      escapeCSV(job.notes || ''),
      escapeCSV(job.estimatedPrice),
      escapeCSV(job.advancePaid),
      escapeCSV(balance),
      escapeCSV(job.technicianName),
      escapeCSV(job.status),
      escapeCSV(job.receivedMsgSent ? 'Yes' : 'No'),
      escapeCSV(job.readyMsgSent ? 'Yes' : 'No'),
      escapeCSV(job.createdAt || '')
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${shopName.toLowerCase().replace(/\s+/g, '_')}_repair_jobs_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV/TSV/Excel table text parser supporting:
 * - Comma (,), Semicolon (;), and Tab (\t) delimiters
 * - Quoted fields containing commas or quotes ("hello, world", "quoted ""word""")
 * - Windows (\r\n) and Unix (\n) line endings
 */
export function parseDelimitedTable(rawText: string): string[][] {
  const clean = rawText.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM if present
  if (!clean) return [];

  // Detect delimiter from first non-empty line
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  } else if (semicolonCount > commaCount) {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push last remaining field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Standard Stock Template Definition
 * Header: Item Code, Item Name, Category, Brand, Cost Price, Selling Price, Opening Quantity
 */
export const STOCK_TEMPLATE_HEADERS = [
  'Item Code',
  'Item Name',
  'Category',
  'Brand',
  'Cost Price',
  'Selling Price',
  'Opening Quantity',
];

export const SAMPLE_STOCK_TEMPLATE_ROWS = [
  ['000027', 'OG ESD Tempered Sam A32', 'TEMPAD', 'Samsung', 250.00, 330.00, 45],
  ['000024', 'WUW Earphone R186', 'HEADSET', 'WUW', 1000.00, 1450.00, 18],
  ['000021', 'Polo Cover IPhone 14 Pro', 'BACKCOVER', 'Polo', 550.00, 800.00, 25],
  ['000030', 'Anker 20W Fast Charger USB-C', 'CHARGER', 'Anker', 2800.00, 3600.00, 15],
  ['000031', 'Remax Fast Lightning Cable 1M', 'CABLE', 'Remax', 450.00, 750.00, 30],
  ['000032', 'Baseus Magnetic Phone Holder', 'STAND', 'Baseus', 1200.00, 1800.00, 12],
  ['000033', 'Joyroom JR-T03S Pro ANC Earbuds', 'AUDIO', 'Joyroom', 4200.00, 5500.00, 8],
  ['000034', 'Samsung 25W Original Adapter', 'CHARGER', 'Samsung', 3200.00, 4500.00, 20],
];

/**
 * Downloads the exact CSV template matching the system schema
 */
export function downloadStockCsvTemplate(filename: string = 'Stock_Import_Template.csv'): void {
  const csvLines = [
    STOCK_TEMPLATE_HEADERS.join(','),
    ...SAMPLE_STOCK_TEMPLATE_ROWS.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the exact Excel (.xlsx) template matching the system schema with text-formatted Item Codes
 */
export async function downloadStockExcelTemplate(filename: string = 'Stock_Import_Template.xlsx'): Promise<void> {
  try {
    const XLSX = await import('xlsx');
    // Build worksheet with headers and sample data
    const wsData = [STOCK_TEMPLATE_HEADERS, ...SAMPLE_STOCK_TEMPLATE_ROWS];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ensure Item Code column (col 0) is treated as string so leading zeros are preserved
    SAMPLE_STOCK_TEMPLATE_ROWS.forEach((row, rIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx + 1, c: 0 });
      if (ws[cellRef]) {
        ws[cellRef].t = 's'; // string type
        ws[cellRef].v = String(row[0]);
      }
    });

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, // Item Code
      { wch: 32 }, // Item Name
      { wch: 16 }, // Category
      { wch: 16 }, // Brand
      { wch: 14 }, // Cost Price
      { wch: 14 }, // Selling Price
      { wch: 18 }, // Opening Quantity
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock_Items');
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.warn('XLSX export fallback to CSV:', err);
    downloadStockCsvTemplate(filename.replace(/\.xlsx$/i, '.csv'));
  }
}

