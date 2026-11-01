export interface FaultCategory {
  category: string;
  issues: string[];
}

export const CATEGORIZED_PHONE_ISSUES: FaultCategory[] = [
  {
    category: 'Common Hardware Repairs',
    issues: [
      'Board Repair',
      'Display Replacement',
      'C/C PIN Change (Charging Port Replacement)',
      'Speaker Repair',
      'Mic Issue',
    ],
  },
  {
    category: 'Power & Charging Issues',
    issues: [
      "NO POWER / Phone doesn't turn on at all",
      "Phone won't charge at all",
      'Charges very slow',
      'Charging port loose, cable falls out easy',
      'Phone gets very hot while charging',
      'Shows "charging" but battery percent doesn\'t go up',
      'Battery drains fast / dies fast even with full battery',
      'Battery swollen (back looks puffed up)',
      'Phone switches off even though battery shows charge left',
      'Phone shuts down on its own during use',
    ],
  },
  {
    category: 'Display & Touch Issues',
    issues: [
      'Screen cracked or shattered',
      'Screen black but phone still makes sounds (Backlight/Display fault)',
      'Touch not working in some areas',
      'Screen has lines, spots, or color patches',
    ],
  },
  {
    category: 'Water & Liquid Damage',
    issues: [
      'Phone fell in water, not turning on',
      'Worked after water damage, now acting weird (random restarts, no sound, etc.)',
    ],
  },
  {
    category: 'Audio & Call Issues',
    issues: [
      "Can't hear caller during calls",
      "Caller can't hear you (Mic problem)",
      'Speaker sound is low or distorted',
      'No sound at all (calls or media)',
    ],
  },
  {
    category: 'Camera Faults',
    issues: [
      "Camera app won't open or keeps crashing",
      'Blurry photos',
      'Black screen when camera opens',
      "Front camera works but back camera doesn't (or reverse)",
    ],
  },
  {
    category: 'Network & Connectivity',
    issues: [
      'No signal or "No Service"',
      'WiFi not connecting or keeps dropping',
      'Bluetooth not working',
      'SIM not detected',
    ],
  },
  {
    category: 'Physical & Button Damage',
    issues: [
      'Power button stuck or not responding',
      'Volume buttons not working',
      'Home button or fingerprint sensor not working',
      'Back cover loose or broken',
    ],
  },
  {
    category: 'Software & OS Issues',
    issues: [
      'Software Issue',
      'Phone turns on but stuck on logo / boot loop',
      'Phone very slow or hangs',
      'Apps keep crashing',
      'Forgot pattern/password, locked out',
      'Phone infected with virus or shows pop-up ads',
      'Unlock Service',
    ],
  },
];

// Flat deduplicated list for backwards compatibility
export const PHONE_ISSUES: string[] = CATEGORIZED_PHONE_ISSUES.flatMap((c) => c.issues);

export const COMMON_BRANDS = [
  'Samsung',
  'Apple (iPhone)',
  'Xiaomi / Redmi / POCO',
  'Vivo',
  'Oppo',
  'Realme',
  'Huawei',
  'OnePlus',
  'Google Pixel',
  'Motorola',
  'Infinix',
  'Tecno',
  'Nokia',
  'Sony',
  'Other Brand',
];
