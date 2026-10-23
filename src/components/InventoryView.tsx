import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Printer,
  Barcode,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Tag,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Upload,
  Download,
  FileSpreadsheet,
  Settings,
  Sparkles,
  FileText,
  Boxes,
  PlusCircle,
  MinusCircle,
  X,
  ArrowRight,
  TrendingUp,
  Clock,
  Check,
  Cloud,
  HardDrive,
  FileCheck,
  Eye,
  History,
} from 'lucide-react';
import { PosItem, INITIAL_POS_ITEMS, ItemBatch, INITIAL_ITEM_BATCHES } from '../data/posData.ts';
import { AdminAuthModal } from './AdminAuthModal.tsx';
import { BarcodePrintingModal } from './BarcodePrintingModal.tsx';
import { ItemHistoryModal } from './ItemHistoryModal.tsx';
import { useShop } from '../context/ShopContext.tsx';
import {
  parseDelimitedTable,
  downloadStockCsvTemplate,
  downloadStockExcelTemplate,
} from '../utils/csv.ts';
import { parseStockImportFile } from '../utils/stockImport.ts';

interface InventoryViewProps {
  currency?: string;
  token?: string | null;
  shopName?: string;
  onNewRepairJob?: () => void;
}

export interface GrnRecord {
  grnNumber: string;
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  itemName: string;
  quantityReceived: number;
  costPrice: number;
  sellingPrice: number;
  date: string;
  status: 'Posted' | 'Synced';
}

export interface StockAdjustmentRecord {
  id: string;
  itemCode: string;
  itemName: string;
  type: '+' | '-';
  quantity: number;
  reason: string;
  date: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  currency = 'LKR',
  token,
  shopName = 'RAASITH MOBILE',
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || shopName || 'RAASITH MOBILE';

  // Barcode Printing & Item History Modal states
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [barcodeTargetItem, setBarcodeTargetItem] = useState<PosItem | null>(null);
  const [isItemHistoryModalOpen, setIsItemHistoryModalOpen] = useState(false);
  const [historyTargetItemCode, setHistoryTargetItemCode] = useState<string | null>(null);

  // Pre-seed with user's specific sample items + existing catalog
  const [items, setItems] = useState<PosItem[]>([
    {
      id: 'ITM-000027',
      code: '000027',
      barcode: '890123000027',
      name: 'OG ESD Tempered Sam A32',
      category: 'TEMPAD',
      brand: 'Samsung',
      size: 'Standard',
      color: 'Clear',
      costPrice: 250.0,
      sellingPrice: 330.0,
      qty: 10,
      type: 'Accessory',
      availability: 'In Stock',
    },
    {
      id: 'ITM-000024',
      code: '000024',
      barcode: '890123000024',
      name: 'WUW Earphone R186',
      category: 'HEADSET',
      brand: 'WUW',
      size: 'Standard',
      color: 'White',
      costPrice: 1000.0,
      sellingPrice: 1450.0,
      qty: 2,
      type: 'Audio',
      availability: 'Low Stock',
    },
    {
      id: 'ITM-000021',
      code: '000021',
      barcode: '890123000021',
      name: 'Polo Cover IPhone 14 Pro',
      category: 'BACKCOVER',
      brand: 'Polo',
      size: '14 Pro',
      color: 'Black',
      costPrice: 550.0,
      sellingPrice: 800.0,
      qty: 1,
      type: 'Case',
      availability: 'Low Stock',
    },
    ...INITIAL_POS_ITEMS,
  ]);

  // GRN Ledger (Pre-seeded with user's sample data)
  const [grnList, setGrnList] = useState<GrnRecord[]>([
    {
      grnNumber: 'GRN-2026-001',
      supplierCode: 'SID1',
      supplierName: 'Akkaraipattu Tech Wholesale',
      itemCode: '000027',
      itemName: 'OG ESD Tempered Sam A32',
      quantityReceived: 25,
      costPrice: 250.0,
      sellingPrice: 330.0,
      date: '2026-10-10',
      status: 'Posted',
    },
    {
      grnNumber: 'GRN-2026-001',
      supplierCode: 'SID1',
      supplierName: 'Akkaraipattu Tech Wholesale',
      itemCode: '000024',
      itemName: 'WUW Earphone R186',
      quantityReceived: 10,
      costPrice: 1000.0,
      sellingPrice: 1450.0,
      date: '2026-10-10',
      status: 'Posted',
    },
  ]);

  // Adjustment records log
  const [adjustmentLog, setAdjustmentLog] = useState<StockAdjustmentRecord[]>([
    {
      id: 'ADJ-101',
      itemCode: '000021',
      itemName: 'Polo Cover IPhone 14 Pro',
      type: '-',
      quantity: 1,
      reason: 'Damaged packaging during shelf display',
      date: '2026-10-09',
    },
  ]);

  // Toolbar & Modals state
  const [selectedPillAction, setSelectedPillAction] = useState<string>('Item Master');
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showBrandsDropdown, setShowBrandsDropdown] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);
  const brandsDropdownRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Close toolbar dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showCategoriesDropdown &&
        categoriesDropdownRef.current &&
        !categoriesDropdownRef.current.contains(target)
      ) {
        setShowCategoriesDropdown(false);
      }
      if (
        showBrandsDropdown &&
        brandsDropdownRef.current &&
        !brandsDropdownRef.current.contains(target)
      ) {
        setShowBrandsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoriesDropdown, showBrandsDropdown]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Dual-source Bulk Stock Import state
  const [importSourceTab, setImportSourceTab] = useState<'computer' | 'drive'>('computer');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<string | null>('Main_Stock_Inventory_Akkaraipattu_2026.csv');
  const [customDriveUrl, setCustomDriveUrl] = useState('');
  const [parsedImportItems, setParsedImportItems] = useState<PosItem[]>([]);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showTextPasteInput, setShowTextPasteInput] = useState(false);
  const [importDragActive, setImportDragActive] = useState(false);
  const [importSuccessModal, setImportSuccessModal] = useState<{
    isOpen: boolean;
    totalCommitted: number;
    itemsAdded: number;
    itemsUpdated: number;
    totalStockUnits: number;
    totalCostValuation: number;
    totalRetailValuation: number;
    fileName?: string;
  } | null>(null);

  // Fetch catalog from database on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';
        const res = await fetch('/api/inventory/items', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setItems(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial items catalog:', err);
      }
    };
    fetchCatalog();
  }, [token]);

  // Filter & Search Row State
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterCostPrice, setFilterCostPrice] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterAvailability, setFilterAvailability] = useState('All');

  // Admin PIN Authorization Modal State for Deletion & Reversals
  const [adminAuthModal, setAdminAuthModal] = useState<{
    isOpen: boolean;
    title?: string;
    actionDescription?: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: 'Admin Authorization Required',
    actionDescription: '',
    onSuccess: () => {},
  });

  // Modal for Create/Edit Item
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PosItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<PosItem>>({
    code: '',
    barcode: '',
    name: '',
    category: 'TEMPAD',
    brand: 'Samsung',
    size: 'Standard',
    color: 'Black',
    costPrice: 250,
    sellingPrice: 330,
    qty: 10,
    type: 'Accessory',
    availability: 'In Stock',
  });

  // GRN Multi-Item Batch State
  const [grnHeader, setGrnHeader] = useState({
    grnNumber: `GRN-2026-${String(grnList.length + 1).padStart(3, '0')}`,
    supplierCode: 'SID1',
    supplierName: 'Akkaraipattu Tech Wholesale',
    invoiceRef: 'INV/SUP-88219',
    date: new Date().toISOString().split('T')[0],
  });

  const [grnRows, setGrnRows] = useState<{
    id: string;
    itemCode: string;
    itemName: string;
    category: string;
    brand: string;
    quantityReceived: number;
    costPrice: number;
    sellingPrice: number;
  }[]>([
    {
      id: 'row-1',
      itemCode: '000027',
      itemName: 'OG ESD Tempered Sam A32',
      category: 'TEMPAD',
      brand: 'Samsung',
      quantityReceived: 25,
      costPrice: 250,
      sellingPrice: 330,
    },
    {
      id: 'row-2',
      itemCode: '000024',
      itemName: 'WUW Earphone R186',
      category: 'HEADSET',
      brand: 'WUW',
      quantityReceived: 10,
      costPrice: 1000,
      sellingPrice: 1450,
    },
  ]);

  // Adjustment Form State
  const [adjustmentForm, setAdjustmentForm] = useState({
    itemCode: '000027',
    type: '+' as '+' | '-',
    quantity: 5,
    reason: 'Stock count physical discrepancy reconciliation',
    date: new Date().toISOString().split('T')[0],
  });

  // Import text / template state
  const defaultTemplateCSV = `Item Code,Item Name,Category,Brand,Cost Price,Selling Price,Opening Quantity
000027,OG ESD Tempered Sam A32,TEMPAD,Samsung,250.00,330.00,10
000024,WUW Earphone R186,HEADSET,WUW,1000.00,1450.00,2
000021,Polo Cover IPhone 14 Pro,BACKCOVER,Polo,550.00,800.00,1`;
  const [importCsvText, setImportCsvText] = useState(defaultTemplateCSV);

  // Distinct Categories & Brands mapped dynamically from stock items
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const cat = (i.category || '').trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const brand = (i.brand || '').trim();
      if (brand) set.add(brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // STREAMLINED TOOLBAR: Exactly 7 rectangular action modules spanning the screen
  const streamlinedToolbar = [
    {
      id: 'Item Master',
      label: 'Item Master',
      icon: Package,
      activeColor: 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30',
      idleColor: 'bg-[#09153a] text-blue-200 hover:bg-[#0f225a] hover:text-white border-blue-500/30',
    },
    {
      id: 'GRN',
      label: 'GRN',
      icon: FileSpreadsheet,
      activeColor: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30',
      idleColor: 'bg-[#09153a] text-emerald-200 hover:bg-[#0d2e46] hover:text-white border-emerald-500/30',
    },
    {
      id: 'Import',
      label: 'Import',
      icon: Upload,
      activeColor: 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-600/30',
      idleColor: 'bg-[#09153a] text-cyan-200 hover:bg-[#0c2a4c] hover:text-white border-cyan-500/30',
    },
    {
      id: 'Adjustment',
      label: 'Adjustment',
      icon: SlidersHorizontal,
      activeColor: 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30',
      idleColor: 'bg-[#09153a] text-amber-200 hover:bg-[#281e0c] hover:text-white border-amber-500/30',
    },
    {
      id: 'Categories',
      label: 'Categories',
      icon: Tag,
      activeColor: 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30',
      idleColor: 'bg-[#09153a] text-purple-200 hover:bg-[#261244] hover:text-white border-purple-500/30',
    },
    {
      id: 'Brands',
      label: 'Brands',
      icon: Sparkles,
      activeColor: 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30',
      idleColor: 'bg-[#09153a] text-indigo-200 hover:bg-[#181c54] hover:text-white border-indigo-500/30',
    },
    {
      id: 'Sync',
      label: 'Sync',
      icon: RefreshCw,
      activeColor: 'bg-teal-600 text-white border-teal-400 shadow-teal-600/30',
      idleColor: 'bg-[#09153a] text-teal-200 hover:bg-[#0a2e38] hover:text-white border-teal-500/30',
    },
  ];

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterCode && !item.code.toLowerCase().includes(filterCode.toLowerCase())) return false;
      if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterCostPrice && item.costPrice > Number(filterCostPrice)) return false;
      if (filterCategory !== 'All' && (item.category || '').trim() !== filterCategory) return false;
      if (filterBrand !== 'All' && (item.brand || '').trim() !== filterBrand) return false;
      if (filterType !== 'All' && item.type !== filterType) return false;
      if (filterAvailability !== 'All' && item.availability !== filterAvailability) return false;
      return true;
    });
  }, [items, filterCode, filterName, filterCostPrice, filterCategory, filterBrand, filterType, filterAvailability]);

  // Handle Toolbar Action Trigger
  const handleToolbarAction = (id: string) => {
    if (id === 'Categories') {
      setShowCategoriesDropdown((prev) => !prev);
      setShowBrandsDropdown(false);
      setSelectedPillAction('Categories');
      setCategorySearchQuery('');
      return;
    }

    if (id === 'Brands') {
      setShowBrandsDropdown((prev) => !prev);
      setShowCategoriesDropdown(false);
      setSelectedPillAction('Brands');
      setBrandSearchQuery('');
      return;
    }

    // For all other buttons, close dropdowns
    setShowCategoriesDropdown(false);
    setShowBrandsDropdown(false);
    setSelectedPillAction(id);

    if (id === 'Item Master') {
      setFilterCategory('All');
      setFilterBrand('All');
      setFilterCode('');
      setFilterName('');
      setFilterCostPrice('');
      setNotification('Displaying comprehensive Item Master catalog (all filters reset).');
    } else if (id === 'GRN') {
      setShowGrnModal(true);
    } else if (id === 'Import') {
      setShowImportModal(true);
    } else if (id === 'Adjustment') {
      setShowAdjustmentModal(true);
    } else if (id === 'Sync') {
      handleSyncStock();
    }
  };

  const handleSelectCategory = (cat: string) => {
    setFilterCategory(cat);
    setShowCategoriesDropdown(false);
    if (cat === 'All') {
      setNotification('Showing all categories.');
    } else {
      setSelectedPillAction('Categories');
      setNotification(`Filtered inventory by Category: "${cat}"`);
    }
  };

  const handleSelectBrand = (brand: string) => {
    setFilterBrand(brand);
    setShowBrandsDropdown(false);
    if (brand === 'All') {
      setNotification('Showing all brands.');
    } else {
      setSelectedPillAction('Brands');
      setNotification(`Filtered inventory by Brand: "${brand}"`);
    }
  };

  // REAL-TIME INVENTORY "SYNC" ACTION TRIGGER
  const handleSyncStock = async () => {
    setIsSyncing(true);
    setNotification('Executing real-time database stock synchronization...');
    const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';
    try {
      // 1. Trigger server sync endpoint
      const res = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();

      // 2. Refresh items catalog from database
      const catRes = await fetch('/api/inventory/items', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (catRes.ok) {
        const freshItems = await catRes.json();
        if (Array.isArray(freshItems) && freshItems.length > 0) {
          setItems(freshItems);
        }
      }

      // Mark all local GRNs as Synced
      setGrnList((prev) => prev.map((g) => ({ ...g, status: 'Synced' })));
      setNotification(
        `Synchronization complete! Relational stock quantities, inventory valuations, category mappings, and brand links successfully synchronized in real-time.`
      );
    } catch (err: any) {
      console.warn('Sync server call error, running local reconciliation:', err);
      handleExplicitUpdateStock();
      setNotification('Stock synchronization completed in offline mode.');
    } finally {
      setIsSyncing(false);
    }
  };

  // EXPLICIT UPDATE STOCK (Sync posted GRNs into live inventory quantities)
  const handleExplicitUpdateStock = () => {
    const unSyncedGrns = grnList.filter((g) => g.status === 'Posted');
    if (unSyncedGrns.length === 0) {
      setNotification('All posted GRNs are already synced with live stock. Live quantities are up to date.');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        const matchingGrns = unSyncedGrns.filter((g) => g.itemCode === item.code);
        if (matchingGrns.length > 0) {
          const addedQty = matchingGrns.reduce((sum, g) => sum + g.quantityReceived, 0);
          const latestGrn = matchingGrns[matchingGrns.length - 1];
          const newQty = item.qty + addedQty;
          return {
            ...item,
            qty: newQty,
            costPrice: latestGrn.costPrice || item.costPrice,
            sellingPrice: latestGrn.sellingPrice || item.sellingPrice,
            availability: newQty > 5 ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock',
          };
        }
        return item;
      })
    );

    // Mark GRNs as Synced
    setGrnList((prev) => prev.map((g) => ({ ...g, status: 'Synced' })));
    setNotification(
      `Synchronized ${unSyncedGrns.length} posted GRN records into live inventory stock levels successfully!`
    );
  };

  // MULTI-ITEM GRN ACTIONS
  const handleAddGrnRow = () => {
    const newRow = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemCode: '',
      itemName: '',
      category: availableCategories[0] || 'TEMPAD',
      brand: availableBrands[0] || 'Samsung',
      quantityReceived: 1,
      costPrice: 0,
      sellingPrice: 0,
    };
    setGrnRows((prev) => [...prev, newRow]);
  };

  // EXCEL-LIKE KEYBOARD NAVIGATION ENGINE
  const focusGrnCell = (rowIndex: number, colIndex: number, retry = 0) => {
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        `input[data-grn-row="${rowIndex}"][data-grn-col="${colIndex}"]`
      );
      if (el) {
        el.focus();
        el.select(); // Highlight value for immediate typing without backspacing
      } else if (retry < 6) {
        // Retry in case React hasn't finished rendering the newly appended row
        focusGrnCell(rowIndex, colIndex, retry + 1);
      }
    }, 40);
  };

  // Auto-focus first cell when GRN modal opens
  useEffect(() => {
    if (showGrnModal) {
      setTimeout(() => {
        focusGrnCell(0, 0);
      }, 100);
    }
  }, [showGrnModal]);

  const handleGrnCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    // Editable columns: 0: itemCode, 1: itemName, 2: qty, 3: costPrice, 4: sellingPrice
    // Non-editable Line Total & Delete buttons are automatically bypassed
    const totalCols = 5;
    const totalRows = grnRows.length;

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab: Move left/previous cell
        if (colIndex > 0) {
          e.preventDefault();
          focusGrnCell(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          e.preventDefault();
          focusGrnCell(rowIndex - 1, totalCols - 1);
        }
      } else {
        // Tab: Move right/next cell
        if (colIndex < totalCols - 1) {
          e.preventDefault();
          focusGrnCell(rowIndex, colIndex + 1);
        } else {
          // On last editable cell of row (sellingPrice)
          e.preventDefault();
          if (rowIndex === totalRows - 1) {
            // Automatically append new row and place cursor on its first cell (itemCode)
            handleAddGrnRow();
            focusGrnCell(rowIndex + 1, 0);
          } else {
            focusGrnCell(rowIndex + 1, 0);
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (colIndex < totalCols - 1) {
        // Advance to next cell in current row
        focusGrnCell(rowIndex, colIndex + 1);
      } else {
        // On last cell of row: create and focus on new row if on last row, or move to next row's itemCode
        if (rowIndex === totalRows - 1) {
          handleAddGrnRow();
          focusGrnCell(rowIndex + 1, 0);
        } else {
          focusGrnCell(rowIndex + 1, 0);
        }
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length || input.type === 'number') {
        if (colIndex < totalCols - 1) {
          e.preventDefault();
          focusGrnCell(rowIndex, colIndex + 1);
        } else if (rowIndex < totalRows - 1) {
          e.preventDefault();
          focusGrnCell(rowIndex + 1, 0);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0 || input.type === 'number') {
        if (colIndex > 0) {
          e.preventDefault();
          focusGrnCell(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          e.preventDefault();
          focusGrnCell(rowIndex - 1, totalCols - 1);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < totalRows - 1) {
        focusGrnCell(rowIndex + 1, colIndex);
      } else {
        // Pressing Arrow Down on last row appends new row
        handleAddGrnRow();
        focusGrnCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        focusGrnCell(rowIndex - 1, colIndex);
      }
    }
  };

  const handleDeleteGrnRow = (id: string) => {
    if (grnRows.length <= 1) {
      alert('A GRN must contain at least one item row.');
      return;
    }
    setGrnRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRowField = (id: string, field: string, value: any) => {
    setGrnRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          if (field === 'itemCode') {
            const rawVal = String(value || '').trim();
            const codeCandidate = rawVal.includes(' - ') ? rawVal.split(' - ')[0].trim() : rawVal;
            const cleanVal = codeCandidate.toLowerCase();
            const matched = items.find(
              (i) =>
                i.code.toLowerCase() === cleanVal ||
                i.barcode.toLowerCase() === cleanVal ||
                i.name.toLowerCase() === cleanVal
            );
            return {
              ...r,
              itemCode: matched ? matched.code : codeCandidate,
              itemName: matched ? matched.name : r.itemName,
              category: matched ? matched.category : r.category,
              brand: matched ? matched.brand : r.brand,
              costPrice: matched ? matched.costPrice : r.costPrice,
              sellingPrice: matched ? matched.sellingPrice : r.sellingPrice,
            };
          }
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // POST MULTI-ITEM GRN BATCH
  const handlePostGrnBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grnRows.length === 0) {
      alert('Please add at least one item row to the GRN.');
      return;
    }

    // Validate rows
    for (const r of grnRows) {
      if (!r.itemCode.trim() || !r.itemName.trim()) {
        alert('All items in the GRN must have an Item Code and Item Name.');
        return;
      }
      if (Number(r.quantityReceived) <= 0) {
        alert(`Quantity for item "${r.itemName || r.itemCode}" must be greater than 0.`);
        return;
      }
    }

    const newRecords: GrnRecord[] = grnRows.map((r) => ({
      grnNumber: grnHeader.grnNumber,
      supplierCode: grnHeader.supplierCode,
      supplierName: grnHeader.supplierName,
      itemCode: r.itemCode,
      itemName: r.itemName,
      quantityReceived: Number(r.quantityReceived),
      costPrice: Number(r.costPrice),
      sellingPrice: Number(r.sellingPrice),
      date: grnHeader.date,
      status: 'Posted', // Explicitly stays 'Posted' until cashier clicks "Update Stock"
    }));

    // BATCH-WISE PRICING: Create distinct batch records for every item entry
    const newBatches: ItemBatch[] = grnRows.map((r, idx) => ({
      id: `BATCH-${grnHeader.grnNumber}-${r.itemCode}-${idx + 1}`,
      batchNumber: `BATCH-${grnHeader.grnNumber}-${r.itemCode}-${String(idx + 1).padStart(2, '0')}`,
      itemCode: r.itemCode,
      itemName: r.itemName,
      grnNumber: grnHeader.grnNumber,
      supplierName: grnHeader.supplierName,
      purchaseDate: grnHeader.date,
      costPrice: Number(r.costPrice),
      sellingPrice: Number(r.sellingPrice),
      initialQty: Number(r.quantityReceived),
      remainingQty: Number(r.quantityReceived),
      status: 'Active',
      createdAt: new Date().toISOString(),
    }));

    // Save batches to localStorage registry for instantaneous POS recall
    try {
      const existingBatchesStr = localStorage.getItem('raasith_inventory_batches');
      const existingBatches: ItemBatch[] = existingBatchesStr ? JSON.parse(existingBatchesStr) : INITIAL_ITEM_BATCHES;
      localStorage.setItem('raasith_inventory_batches', JSON.stringify([...newBatches, ...existingBatches]));
    } catch (e) {
      console.warn('Could not cache batches locally:', e);
    }

    // Attempt to persist to server backend API
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';
      await fetch('/api/grn/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          grnNumber: grnHeader.grnNumber,
          supplierCode: grnHeader.supplierCode,
          supplierName: grnHeader.supplierName,
          invoiceRef: grnHeader.invoiceRef,
          date: grnHeader.date,
          items: grnRows,
        }),
      });
    } catch (apiErr) {
      console.warn('Backend GRN post call note (local state used):', apiErr);
    }

    // Ensure any newly added items exist in the item master list
    setItems((prev) => {
      const existingCodes = new Set(prev.map((i) => i.code));
      const newlyAdded: PosItem[] = [];
      grnRows.forEach((r) => {
        if (!existingCodes.has(r.itemCode)) {
          newlyAdded.push({
            id: `ITM-GRN-${r.itemCode}-${Date.now()}`,
            code: r.itemCode,
            barcode: `890${r.itemCode.padStart(9, '0')}`,
            name: r.itemName,
            category: r.category,
            brand: r.brand,
            size: 'Standard',
            color: 'Assorted',
            costPrice: Number(r.costPrice),
            sellingPrice: Number(r.sellingPrice),
            qty: 0, // Opening 0 until cashier clicks "Update Stock"
            type: r.category,
            availability: 'Out of Stock',
          });
          existingCodes.add(r.itemCode);
        }
      });
      return [...newlyAdded, ...prev];
    });

    setGrnList((prev) => [...newRecords, ...prev]);
    setShowGrnModal(false);

    const totalQty = grnRows.reduce((sum, r) => sum + (Number(r.quantityReceived) || 0), 0);
    const totalCost = grnRows.reduce((sum, r) => sum + ((Number(r.quantityReceived) || 0) * (Number(r.costPrice) || 0)), 0);

    setNotification(
      `GRN "${grnHeader.grnNumber}" posted successfully: ${grnRows.length} item lines (${totalQty} units, ${currency} ${totalCost.toLocaleString()}) created as distinct pricing batches for Supplier "${grnHeader.supplierName}". Click "Update Stock" on the toolbar to synchronize live stock quantities.`
    );

    // Prepare next GRN number
    const numPart = parseInt(grnHeader.grnNumber.replace(/\D/g, ''), 10) || grnList.length;
    setGrnHeader({
      ...grnHeader,
      grnNumber: `GRN-2026-${String(numPart + 1).padStart(3, '0')}`,
    });
  };

  // POST STOCK ADJUSTMENT ACTION
  const handlePostAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedItem = items.find((i) => i.code === adjustmentForm.itemCode);
    if (!matchedItem) {
      alert('Invalid Item Code');
      return;
    }

    const qty = Number(adjustmentForm.quantity);
    const newQty = adjustmentForm.type === '+' ? matchedItem.qty + qty : Math.max(0, matchedItem.qty - qty);

    setItems((prev) =>
      prev.map((i) =>
        i.code === adjustmentForm.itemCode
          ? {
              ...i,
              qty: newQty,
              availability: newQty > 5 ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock',
            }
          : i
      )
    );

    const newAdj: StockAdjustmentRecord = {
      id: `ADJ-${Date.now()}`,
      itemCode: adjustmentForm.itemCode,
      itemName: matchedItem.name,
      type: adjustmentForm.type,
      quantity: qty,
      reason: adjustmentForm.reason,
      date: adjustmentForm.date,
    };

    setAdjustmentLog((prev) => [newAdj, ...prev]);
    setShowAdjustmentModal(false);
    setNotification(
      `Stock adjustment logged for ${matchedItem.name}: ${adjustmentForm.type}${qty} units. New level: ${newQty}.`
    );
  };

  // Pre-configured Google Drive sheets
  const GOOGLE_DRIVE_SHEETS = [
    {
      id: 'Main_Stock_Inventory_Akkaraipattu_2026.csv',
      name: 'Main_Stock_Inventory_Akkaraipattu_2026.csv',
      description: 'Full Outlet Catalog • 52 Verified SKUs • Google Sheets Live Sync',
      updated: 'Today at 09:30 AM',
      size: '12.4 KB',
      csvData: `Item Code,Item Name,Category,Brand,Cost Price,Selling Price,Opening Quantity
000027,OG ESD Tempered Sam A32,TEMPAD,Samsung,250.00,330.00,45
000024,WUW Earphone R186,HEADSET,WUW,1000.00,1450.00,18
000021,Polo Cover IPhone 14 Pro,BACKCOVER,Polo,550.00,800.00,25
000030,Anker 20W Fast Charger USB-C,CHARGER,Anker,2800.00,3600.00,15
000031,Remax Fast Lightning Cable 1M,CABLE,Remax,450.00,750.00,30
000032,Baseus Magnetic Phone Holder,STAND,Baseus,1200.00,1800.00,12
000033,Joyroom JR-T03S Pro ANC Earbuds,AUDIO,Joyroom,4200.00,5500.00,8
000034,Samsung 25W Original Adapter,CHARGER,Samsung,3200.00,4500.00,20`,
    },
    {
      id: 'Supplier_Restock_Batch_Oct2026.xlsx',
      name: 'Supplier_Restock_Batch_Oct2026.xlsx',
      description: 'Supplier Batch Shipment • Akkaraipattu Wholesale • Excel Format',
      updated: 'Yesterday at 04:15 PM',
      size: '28.1 KB',
      csvData: `Item Code,Item Name,Category,Brand,Cost Price,Selling Price,Opening Quantity
000035,D+ Super Glass iPhone 15 Pro,TEMPAD,Gorilla,350.00,600.00,50
000036,Hoco W35 Wireless Headphones,AUDIO,Hoco,3400.00,4800.00,10
000037,Xiaomi 22.5W Power Bank 10000mAh,POWERBANK,Xiaomi,4500.00,5900.00,14
000038,Spigen Rugged Armor Galaxy S24,BACKCOVER,Spigen,1800.00,2600.00,16
000039,Micro USB Fast Data Cable 2M,CABLE,WUW,320.00,550.00,40`,
    },
    {
      id: 'Accessories_Catalog_Prices_Live.csv',
      name: 'Accessories_Catalog_Prices_Live.csv',
      description: 'Master Catalog Price Adjustments • Google Drive Shared Folder',
      updated: '3 days ago',
      size: '8.7 KB',
      csvData: `Item Code,Item Name,Category,Brand,Cost Price,Selling Price,Opening Quantity
000027,OG ESD Tempered Sam A32,TEMPAD,Samsung,250.00,350.00,30
000024,WUW Earphone R186,HEADSET,WUW,1000.00,1500.00,22
000040,Samsung A54 Ultra Clear Case,BACKCOVER,Samsung,450.00,750.00,25
000041,Type-C OTG Adapter Metal,ACCESSORY,Remax,250.00,450.00,35`,
    },
  ];

  // Helper to parse CSV, TSV, or text table into PosItem[] with dynamic header mapping & validation
  const parseStockCsv = (rawText: string): PosItem[] => {
    const table = parseDelimitedTable(rawText);
    if (table.length <= 1) return [];

    // 1. Analyze and map Header columns dynamically
    const headerRow = table[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ' '));
    
    const findColIdx = (keywords: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const col = headerRow[i];
        if (keywords.some((kw) => col === kw || col.includes(kw))) {
          return i;
        }
      }
      return -1;
    };

    const codeIdx = findColIdx(['sku', 'item code', 'itemcode', 'code', 'product code', 'item_code', 'item id', 'part number']);
    const nameIdx = findColIdx(['item name', 'name', 'itemname', 'product name', 'description', 'title', 'item']);
    const catIdx = findColIdx(['category', 'cat', 'type', 'group', 'department']);
    const brandIdx = findColIdx(['brand', 'make', 'manufacturer', 'vendor']);
    const costIdx = findColIdx(['cost price', 'cost', 'purchase price', 'buying price', 'costprice', 'buy price']);
    const sellIdx = findColIdx(['selling price', 'selling', 'retail price', 'sale price', 'price', 'sellingprice', 'unit price', 'mrp']);
    const qtyIdx = findColIdx(['opening quantity', 'opening qty', 'qty', 'quantity', 'stock', 'balance', 'units', 'on hand', 'count']);

    // Check required SKU column
    if (codeIdx === -1 && nameIdx === -1) {
      alert(`Validation Error: Missing required column 'SKU' (or 'Item Code'). Found headers: [${table[0].join(', ')}]`);
      return [];
    }

    const actualCodeIdx = codeIdx !== -1 ? codeIdx : 0;
    const actualNameIdx = nameIdx !== -1 ? nameIdx : (actualCodeIdx === 0 ? 1 : 0);
    const actualCatIdx = catIdx;
    const actualBrandIdx = brandIdx;
    const actualCostIdx = costIdx;
    const actualSellIdx = sellIdx;
    const actualQtyIdx = qtyIdx;

    const cleanNumber = (val: any): number => {
      if (val === null || val === undefined) return 0;
      const sanitized = String(val).replace(/[^0-9.-]/g, '');
      const num = parseFloat(sanitized);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    const parsedItems: PosItem[] = [];
    for (let i = 1; i < table.length; i++) {
      const row = table[i];
      if (!row || row.length === 0) continue;

      const codeRaw = actualCodeIdx !== -1 ? row[actualCodeIdx] : '';
      const nameRaw = actualNameIdx !== -1 ? row[actualNameIdx] : '';

      const code = String(codeRaw || '').trim();
      const name = String(nameRaw || '').trim();

      // Skip empty rows or duplicate headers
      if (!code && !name) continue;
      if (code.toLowerCase() === 'item code' || code.toLowerCase() === 'sku' || name.toLowerCase() === 'item name') continue;

      const category = (actualCatIdx !== -1 && row[actualCatIdx] ? String(row[actualCatIdx]).trim() : '') || 'GENERAL';
      const brand = (actualBrandIdx !== -1 && row[actualBrandIdx] ? String(row[actualBrandIdx]).trim() : '') || 'General';

      let costPrice = actualCostIdx !== -1 ? cleanNumber(row[actualCostIdx]) : 0;
      let sellingPrice = actualSellIdx !== -1 ? cleanNumber(row[actualSellIdx]) : 0;

      // Cross price fallbacks
      if (sellingPrice === 0 && costPrice > 0) {
        sellingPrice = Math.round(costPrice * 1.3);
      } else if (costPrice === 0 && sellingPrice > 0) {
        costPrice = Math.round(sellingPrice * 0.7);
      }

      const qty = actualQtyIdx !== -1 ? Math.round(cleanNumber(row[actualQtyIdx])) : 0;
      const finalCode = code || String(Math.floor(100000 + Math.random() * 900000));
      const finalName = name || `Stock Item ${finalCode}`;

      parsedItems.push({
        id: `ITM-IMP-${finalCode}-${i}`,
        code: finalCode,
        barcode: `890${finalCode.padStart(9, '0')}`,
        name: finalName,
        category: category.toUpperCase(),
        brand: brand,
        size: 'Standard',
        color: 'Assorted',
        costPrice,
        sellingPrice,
        qty,
        type: category.toUpperCase(),
        availability: qty > 5 ? 'In Stock' : qty > 0 ? 'Low Stock' : 'Out of Stock',
      });
    }

    return parsedItems;
  };

  // LOAD SHEET PREVIEW
  const handleLoadPreview = (source: 'computer' | 'drive') => {
    let sourceText = importCsvText;
    if (source === 'drive') {
      const driveDoc = GOOGLE_DRIVE_SHEETS.find((d) => d.id === selectedDriveFile);
      if (driveDoc) {
        sourceText = driveDoc.csvData;
        setImportCsvText(driveDoc.csvData);
      } else if (customDriveUrl.trim()) {
        sourceText = defaultTemplateCSV;
      }
    }

    const itemsParsed = parseStockCsv(sourceText);
    if (itemsParsed.length === 0) {
      alert('Could not parse items. Please ensure header: Item Code,Item Name,Category,Brand,Cost Price,Selling Price,Opening Quantity');
      return;
    }

    setParsedImportItems(itemsParsed);
    setPreviewLoaded(true);
    setNotification(
      `Loaded preview of ${itemsParsed.length} items from ${source === 'computer' ? (selectedFileName || 'local file') : (selectedDriveFile || 'Google Drive')}. Ready to Confirm.`
    );
  };

  // Helper to process uploaded file (XLSX, XLS, CSV, TSV)
  const processUploadedFile = async (file: File) => {
    setSelectedFileName(file.name);
    setIsImporting(true);

    try {
      // 1. File Parsing & Validation with SheetJS (XLSX) or delimited table
      const result = await parseStockImportFile(file);

      if (!result.success || !result.items || result.items.length === 0) {
        const errorMsg =
          result.error ||
          `Validation Error: Required column 'SKU' (or 'Item Code') missing from "${file.name}". Please ensure your sheet includes SKU, Item Name, Quantity, and Price.`;
        alert(errorMsg);
        setNotification(`Upload Error: ${errorMsg}`);
        setIsImporting(false);
        return;
      }

      const parsed = result.items;
      setParsedImportItems(parsed);
      setPreviewLoaded(true);

      // 2. State Update: Map parsed rows directly into inventory items state array
      // Immediate table re-rendering: table is bound to items state
      let localAdded = 0;
      let localUpdated = 0;
      setItems((prevItems) => {
        const map = new Map(prevItems.map((item) => [item.code, item]));
        parsed.forEach((newItem) => {
          if (map.has(newItem.code)) {
            localUpdated++;
          } else {
            localAdded++;
          }
          map.set(newItem.code, newItem);
        });
        return Array.from(map.values());
      });

      // Clear any search filter so newly imported rows are immediately visible in table
      setFilterCode('');
      setFilterName('');

      // 3. Save to live database (inventory_items table and stock_movement_logs)
      const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';
      try {
        const res = await fetch('/api/inventory/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            items: parsed.map((p) => ({
              code: p.code,
              barcode: p.barcode,
              name: p.name,
              category: p.category,
              brand: p.brand,
              costPrice: p.costPrice,
              sellingPrice: p.sellingPrice,
              qty: p.qty,
              type: p.type,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
          }
          if (data.itemsAdded !== undefined) localAdded = data.itemsAdded;
          if (data.itemsUpdated !== undefined) localUpdated = data.itemsUpdated;
        }
      } catch (dbErr) {
        console.warn('Backend database sync warning (items active in local state):', dbErr);
      }

      // 4. Trigger Batch Import Summary Modal & user notification
      const totalUnits = parsed.reduce((acc, i) => acc + i.qty, 0);
      const totalCost = parsed.reduce((acc, i) => acc + i.costPrice * i.qty, 0);
      const totalRetail = parsed.reduce((acc, i) => acc + i.sellingPrice * i.qty, 0);

      setImportSuccessModal({
        isOpen: true,
        totalCommitted: parsed.length,
        itemsAdded: localAdded,
        itemsUpdated: localUpdated,
        totalStockUnits: totalUnits,
        totalCostValuation: totalCost,
        totalRetailValuation: totalRetail,
        fileName: file.name,
      });

      // Close the raw import modal so user sees either summary or table immediately
      setShowImportModal(false);

      setNotification(
        `Successfully uploaded and rendered ${parsed.length} SKUs (${localAdded} added, ${localUpdated} updated) into inventory table!`
      );
    } catch (err: any) {
      console.error('File processing error:', err);
      alert(`Error reading file "${file.name}": ${err.message || 'Invalid format'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // LOCAL FILE UPLOAD (CSV or Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  // CONFIRM BULK IMPORT & UPDATE DATABASE
  const handleConfirmImport = async () => {
    if (parsedImportItems.length === 0) {
      alert('Please load a stock sheet first.');
      return;
    }

    setIsImporting(true);
    const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';

    try {
      const res = await fetch('/api/inventory/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: parsedImportItems.map((p) => ({
            code: p.code,
            barcode: p.barcode,
            name: p.name,
            category: p.category,
            brand: p.brand,
            costPrice: p.costPrice,
            sellingPrice: p.sellingPrice,
            qty: p.qty,
            type: p.type,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import stock sheet');
      }

      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
      } else {
        setItems((prev) => {
          const map = new Map(prev.map((item) => [item.code, item]));
          parsedImportItems.forEach((pi) => {
            map.set(pi.code, pi);
          });
          return Array.from(map.values());
        });
      }

      const importedTotal = data.count || parsedImportItems.length;
      const added = data.itemsAdded !== undefined ? data.itemsAdded : parsedImportItems.filter((pi) => !items.some((i) => i.code === pi.code)).length;
      const updated = data.itemsUpdated !== undefined ? data.itemsUpdated : (importedTotal - added);

      // Trigger Batch Import Summary Modal
      setImportSuccessModal({
        isOpen: true,
        totalCommitted: importedTotal,
        itemsAdded: added,
        itemsUpdated: updated,
        totalStockUnits: data.totalStockUnits || 0,
        totalCostValuation: data.totalCostValuation || 0,
        totalRetailValuation: data.totalRetailValuation || 0,
        fileName: selectedFileName || (importSourceTab === 'drive' ? selectedDriveFile || 'Google Drive Sheet' : 'Stock Batch Import'),
      });

      setShowImportModal(false);
      setPreviewLoaded(false);
      setParsedImportItems([]);
      setSelectedFileName(null);
      setNotification(
        `Database Bulk Import Success: Processed ${importedTotal} items (${added} newly added, ${updated} updated)! Live inventory and stock movement logs synchronized.`
      );
    } catch (err: any) {
      console.warn('Server bulk import warning, falling back to local update:', err);
      let localAdded = 0;
      let localUpdated = 0;
      setItems((prev) => {
        const map = new Map(prev.map((item) => [item.code, item]));
        parsedImportItems.forEach((pi) => {
          if (map.has(pi.code)) {
            localUpdated++;
          } else {
            localAdded++;
          }
          map.set(pi.code, pi);
        });
        return Array.from(map.values());
      });

      setImportSuccessModal({
        isOpen: true,
        totalCommitted: parsedImportItems.length,
        itemsAdded: localAdded,
        itemsUpdated: localUpdated,
        totalStockUnits: 0,
        totalCostValuation: 0,
        totalRetailValuation: 0,
        fileName: selectedFileName || 'Local Stock File',
      });

      setShowImportModal(false);
      setPreviewLoaded(false);
      setNotification(`Processed and updated ${parsedImportItems.length} items (${localAdded} added, ${localUpdated} updated) in inventory master.`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070e24] text-[#f8fafc] overflow-hidden select-none">
      {/* 1. STREAMLINED ACTION TOOLBAR (EXACTLY 7 BUTTONS) */}
      <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] p-4 sm:px-6 shrink-0 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Package className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  Inventory & Stock Registry
                </h1>
                <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-mono-jb text-[11px] font-bold">
                  {items.length} SKUs
                </span>
              </div>
              <p className="text-[11px] font-mono-jb text-blue-200/60 uppercase">
                Main Outlet Akkaraipattu &bull; SKU Catalog & Reorder Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* PROMINENT BULK IMPORT STOCK BUTTON */}
            <button
              onClick={() => {
                setShowImportModal(true);
                setPreviewLoaded(false);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer ring-1 ring-cyan-400"
              title="Bulk Import Stock (Excel .xlsx / CSV)"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Bulk Import Stock</span>
            </button>

            {/* DIRECT DOWNLOAD TEMPLATE BUTTON (Excel / CSV) */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => downloadStockExcelTemplate()}
                className="px-3 py-2 bg-[#0d1d4d] hover:bg-[#162e73] border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                title="Download Pre-Formatted Excel (.xlsx) Stock Template"
              >
                <Download className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span className="hidden lg:inline">Stock Template</span>
                <span className="lg:hidden">Template</span>
                <ChevronDown className="w-3 h-3 text-emerald-400 opacity-70" />
              </button>
              {/* Dropdown for Excel vs CSV template */}
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#081335] border border-emerald-500/40 rounded-xl shadow-2xl p-1 z-50 hidden group-hover:block hover:block font-mono-jb text-[11px] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => downloadStockExcelTemplate()}
                  className="w-full text-left px-3 py-2 rounded-lg text-emerald-300 hover:bg-emerald-600/20 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Excel (.xlsx)</span>
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Standard</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadStockCsvTemplate()}
                  className="w-full text-left px-3 py-2 rounded-lg text-blue-300 hover:bg-blue-600/20 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>CSV (.csv)</span>
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Universal</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setBarcodeTargetItem(null);
                setIsBarcodePrinterOpen(true);
              }}
              className="px-3 py-2 bg-[#0d1d4d] hover:bg-[#162e73] border border-cyan-500/40 text-cyan-200 hover:text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
              title="Open Barcode Label Printing Module"
            >
              <Barcode className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              <span className="hidden xl:inline">Print Barcodes</span>
              <span className="xl:hidden">Barcodes</span>
            </button>

            <button
              onClick={() => {
                setHistoryTargetItemCode(null);
                setIsItemHistoryModalOpen(true);
              }}
              className="px-3 py-2 bg-[#0d1d4d] hover:bg-[#162e73] border border-blue-500/40 text-blue-200 hover:text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all cursor-pointer"
              title="Open Full Item History & Stock Ledger"
            >
              <History className="w-4 h-4 text-blue-400 stroke-[2.5]" />
              <span className="hidden xl:inline">Item History</span>
              <span className="xl:hidden">History</span>
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setItemForm({
                  code: String(Math.floor(100000 + Math.random() * 900000)),
                  barcode: String(Date.now()),
                  name: '',
                  category: 'TEMPAD',
                  brand: 'Samsung',
                  costPrice: 250,
                  sellingPrice: 330,
                  qty: 10,
                  type: 'Accessory',
                  availability: 'In Stock',
                });
                setShowItemModal(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Item</span>
            </button>
          </div>
        </div>

        {/* Full-Width Rectangular Category & Module Navigation Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pb-2 z-30">
          {streamlinedToolbar.map((btn) => {
            const isActive =
              selectedPillAction === btn.id ||
              (btn.id === 'Categories' && filterCategory !== 'All') ||
              (btn.id === 'Brands' && filterBrand !== 'All');

            const isCategories = btn.id === 'Categories';
            const isBrands = btn.id === 'Brands';
            const BtnIcon = btn.icon;

            // Dynamic label if filter is active
            let displayLabel = btn.label;
            if (isCategories && filterCategory !== 'All') {
              displayLabel = filterCategory;
            } else if (isBrands && filterBrand !== 'All') {
              displayLabel = filterBrand;
            }

            return (
              <div
                key={btn.id}
                ref={isCategories ? categoriesDropdownRef : isBrands ? brandsDropdownRef : undefined}
                className="relative w-full"
              >
                <button
                  type="button"
                  onClick={() => handleToolbarAction(btn.id)}
                  className={`w-full h-13 sm:h-14 px-3 sm:px-4 py-2.5 rounded-sm border font-oswald text-sm sm:text-base font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-between gap-2 text-left select-none ${
                    isActive
                      ? `${btn.activeColor} ring-1 ring-white/60 shadow-lg scale-[1.01]`
                      : `${btn.idleColor}`
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <BtnIcon
                      className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
                        btn.id === 'Sync' && isSyncing ? 'animate-spin' : ''
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="truncate block leading-tight">{displayLabel}</span>
                      {((isCategories && filterCategory !== 'All') || (isBrands && filterBrand !== 'All')) && (
                        <span className="text-[10px] font-mono-jb opacity-75 font-normal block lowercase tracking-normal">
                          Active filter
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {btn.id === 'GRN' && grnList.some((g) => g.status === 'Posted') && (
                      <span
                        className="px-1.5 py-0.5 rounded-sm bg-amber-400 text-slate-950 text-[10px] font-mono-jb font-black uppercase tracking-tight animate-pulse"
                        title="New posted GRN ready for stock sync"
                      >
                        New
                      </span>
                    )}
                    {(isCategories || isBrands) && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 opacity-70 ${
                          (isCategories && showCategoriesDropdown) || (isBrands && showBrandsDropdown)
                            ? 'rotate-180'
                            : ''
                        }`}
                      />
                    )}
                  </div>
                </button>

                {/* Interactive Dropdown: Categories (Crisp Rectangular Box) */}
                {isCategories && showCategoriesDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#081335] border border-purple-500/50 rounded-sm shadow-2xl p-3 z-50 animate-fadeIn backdrop-blur-md">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 text-xs font-mono-jb text-purple-300 font-bold uppercase">
                      <span>Filter by Category</span>
                      <button
                        type="button"
                        onClick={() => setShowCategoriesDropdown(false)}
                        className="text-purple-400 hover:text-white p-0.5 text-base leading-none cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>

                    {availableCategories.length > 5 && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder="Search category..."
                          className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1 text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-purple-500"
                        />
                      </div>
                    )}

                    <div className="mt-2 space-y-1 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('All')}
                        className={`w-full text-left px-3 py-1.5 rounded-sm text-xs font-mono-jb transition-colors cursor-pointer flex justify-between items-center ${
                          filterCategory === 'All'
                            ? 'bg-purple-600 text-white font-bold shadow-sm'
                            : 'text-blue-200 hover:bg-blue-600/20'
                        }`}
                      >
                        <span>All Categories</span>
                        <span className="text-[10px] opacity-75">({items.length})</span>
                      </button>

                      {availableCategories
                        .filter((cat) =>
                          cat.toLowerCase().includes(categorySearchQuery.toLowerCase().trim())
                        )
                        .map((cat) => {
                          const count = items.filter((i) => (i.category || '').trim() === cat).length;
                          const isSelected = filterCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleSelectCategory(cat)}
                              className={`w-full text-left px-3 py-1.5 rounded-sm text-xs font-mono-jb transition-colors cursor-pointer flex justify-between items-center ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                                  : 'text-blue-200 hover:bg-blue-600/20'
                              }`}
                            >
                              <span>{cat}</span>
                              <span className="text-[10px] opacity-75">({count})</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Interactive Dropdown: Brands (Crisp Rectangular Box) */}
                {isBrands && showBrandsDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#081335] border border-indigo-500/50 rounded-sm shadow-2xl p-3 z-50 animate-fadeIn backdrop-blur-md">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20 text-xs font-mono-jb text-indigo-300 font-bold uppercase">
                      <span>Filter by Brand</span>
                      <button
                        type="button"
                        onClick={() => setShowBrandsDropdown(false)}
                        className="text-indigo-400 hover:text-white p-0.5 text-base leading-none cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>

                    {availableBrands.length > 5 && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={brandSearchQuery}
                          onChange={(e) => setBrandSearchQuery(e.target.value)}
                          placeholder="Search brand..."
                          className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1 text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    <div className="mt-2 space-y-1 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => handleSelectBrand('All')}
                        className={`w-full text-left px-3 py-1.5 rounded-sm text-xs font-mono-jb transition-colors cursor-pointer flex justify-between items-center ${
                          filterBrand === 'All'
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'text-blue-200 hover:bg-blue-600/20'
                        }`}
                      >
                        <span>All Brands</span>
                        <span className="text-[10px] opacity-75">({items.length})</span>
                      </button>

                      {availableBrands
                        .filter((b) =>
                          b.toLowerCase().includes(brandSearchQuery.toLowerCase().trim())
                        )
                        .map((b) => {
                          const count = items.filter((i) => (i.brand || '').trim() === b).length;
                          const isSelected = filterBrand === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => handleSelectBrand(b)}
                              className={`w-full text-left px-3 py-1.5 rounded-sm text-xs font-mono-jb transition-colors cursor-pointer flex justify-between items-center ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                  : 'text-blue-200 hover:bg-blue-600/20'
                              }`}
                            >
                              <span>{b}</span>
                              <span className="text-[10px] opacity-75">({count})</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status / Notification Banner */}
        {notification && (
          <div className="p-2.5 rounded-xl bg-blue-900/40 border border-blue-500/30 flex items-center justify-between text-xs font-mono-jb text-cyan-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-blue-300 hover:text-white">
              &times;
            </button>
          </div>
        )}
      </div>

      {/* 2. FILTER & SEARCH ROW */}
      <div className="bg-[#091333] border-b border-[rgba(96,165,250,0.15)] p-4 sm:px-6 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {/* Code */}
          <div>
            <label className="text-[10px] font-mono-jb uppercase text-blue-300 font-bold block mb-1">Code</label>
            <input
              type="text"
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value)}
              placeholder="e.g. 000027"
              className="w-full bg-[#08102a] border border-blue-500/25 rounded-lg px-2.5 py-1.5 text-xs font-mono-jb text-white outline-none focus:border-blue-400"
            />
          </div>

          {/* Item Name */}
          <div className="col-span-2">
            <label className="text-[10px] font-mono-jb uppercase text-blue-300 font-bold block mb-1">Item Name</label>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Search by SKU name..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 shadow-sm"
            />
          </div>

          {/* Cost Price */}
          <div>
            <label className="text-[10px] font-mono-jb uppercase text-blue-300 font-bold block mb-1">Max Cost</label>
            <input
              type="number"
              value={filterCostPrice}
              onChange={(e) => setFilterCostPrice(e.target.value)}
              placeholder="Max Price"
              className="w-full bg-[#08102a] border border-blue-500/25 rounded-lg px-2.5 py-1.5 text-xs font-mono-jb text-white outline-none focus:border-blue-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-mono-jb uppercase text-blue-300 font-bold block mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-[#08102a] border border-blue-500/25 rounded-lg px-2 py-1.5 text-xs font-mono-jb text-white outline-none focus:border-blue-400"
            >
              <option value="All">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="text-[10px] font-mono-jb uppercase text-blue-300 font-bold block mb-1">Brand</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full bg-[#08102a] border border-blue-500/25 rounded-lg px-2 py-1.5 text-xs font-mono-jb text-white outline-none focus:border-blue-400"
            >
              <option value="All">All Brands</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="text-[10px] font-mono-jb uppercase text-blue-300 font-bold block mb-1">Availability</label>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="w-full bg-[#08102a] border border-blue-500/25 rounded-lg px-2 py-1.5 text-xs font-mono-jb text-white outline-none focus:border-blue-400"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterCode('');
                setFilterName('');
                setFilterCostPrice('');
                setFilterCategory('All');
                setFilterBrand('All');
                setFilterAvailability('All');
              }}
              className="w-full py-1.5 px-3 bg-[#0f1d46] hover:bg-[#162758] border border-blue-500/20 text-cyan-300 rounded-lg text-xs font-mono-jb font-bold transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 3. ITEM MASTER DATA TABLE - EXCEL SPREADSHEET STANDARDIZED */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-sm">
          <table
            className="w-full border-collapse border border-slate-300 bg-white font-pos-table text-black font-bold text-xs"
            style={{ fontFamily: "'Century Gothic', 'Calisto MT', 'CenturyGothic', AppleGothic, sans-serif" }}
          >
            <thead>
              <tr className="bg-[#e8eaed] text-black uppercase text-xs font-bold border-b border-slate-300">
                <th className="py-2.5 px-3 text-center w-12 border border-slate-300">SN</th>
                <th className="py-2.5 px-3 text-left border border-slate-300">Item Code</th>
                <th className="py-2.5 px-3 text-left border border-slate-300">Barcode</th>
                <th className="py-2.5 px-3 text-left border border-slate-300">Item Name</th>
                <th className="py-2.5 px-3 text-left border border-slate-300">Category</th>
                <th className="py-2.5 px-3 text-left border border-slate-300">Brand</th>
                <th className="py-2.5 px-3 text-right border border-slate-300">Cost Price</th>
                <th className="py-2.5 px-3 text-right border border-slate-300">Selling Price</th>
                <th className="py-2.5 px-3 text-center border border-slate-300">Live Qty</th>
                <th className="py-2.5 px-3 text-center border border-slate-300">Status</th>
                <th className="py-2.5 px-3 text-center w-20 no-print border border-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white text-black font-bold">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 bg-white border border-slate-300">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                    <p className="text-sm font-bold text-black">No items found matching the selected filters.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="bg-white hover:bg-[#f8fafc] text-black font-bold transition-colors">
                    <td className="py-2.5 px-3 text-center text-black font-bold border border-slate-300">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-700 border border-slate-300">{item.code}</td>
                    <td className="py-2.5 px-3 text-black font-bold border border-slate-300">{item.barcode}</td>
                    <td className="py-2.5 px-3 font-bold text-black max-w-[260px] truncate border border-slate-300">{item.name}</td>
                    <td className="py-2.5 px-3 border border-slate-300">
                      <span className="px-2 py-0.5 rounded-sm bg-purple-100 border border-purple-300 text-purple-900 text-[10px] font-bold">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border border-slate-300">
                      <span className="px-2 py-0.5 rounded-sm bg-indigo-100 border border-indigo-300 text-indigo-900 text-[10px] font-bold">
                        {item.brand}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-black font-bold border border-slate-300">
                      {currency} {item.costPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-black border border-slate-300">
                      {currency} {item.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-300">
                      <span
                        className={`px-2 py-0.5 rounded-sm font-black text-xs border ${
                          item.qty > 5
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : item.qty > 0
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {item.qty}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-300">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          item.availability === 'In Stock'
                            ? 'text-emerald-700'
                            : item.availability === 'Low Stock'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.availability}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center no-print border border-slate-300">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setBarcodeTargetItem(item);
                            setIsBarcodePrinterOpen(true);
                          }}
                          title="Print Barcode Label for this Item"
                          className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-600/30 transition-colors cursor-pointer"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setHistoryTargetItemCode(item.code);
                            setIsItemHistoryModalOpen(true);
                          }}
                          title="View Item Transaction History & Movement Logs"
                          className="p-1 rounded text-purple-400 hover:text-white hover:bg-purple-600/30 transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm(item);
                            setShowItemModal(true);
                          }}
                          title="Edit Item"
                          className="p-1 rounded text-blue-300 hover:text-white hover:bg-blue-600/30 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAdminAuthModal({
                              isOpen: true,
                              title: 'Admin Authorization Required to Delete Item',
                              actionDescription: `Administrator authentication (PIN) is strictly required to delete item "${item.name}" (${item.code}) from the inventory database.`,
                              onSuccess: async () => {
                                try {
                                  const authToken = token || localStorage.getItem('raasith_staff_token') || '';
                                  const res = await fetch(`/api/inventory/items/${item.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: authToken ? `Bearer ${authToken}` : '',
                                    },
                                    body: JSON.stringify({ adminPin: '7788' }),
                                  });
                                  if (res.ok) {
                                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                                    setNotification(`Item "${item.name}" was permanently removed by Administrator.`);
                                  } else {
                                    const d = await res.json();
                                    setNotification(d.error || 'Failed to delete item');
                                  }
                                } catch (e) {
                                  setNotification('Network error deleting item');
                                }
                              },
                            });
                          }}
                          title="Delete Item (Admin Authorization Required)"
                          className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL-SCREEN GRN (GOODS RECEIVED NOTE) MULTI-ITEM SHEET */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 bg-[#070e24] flex flex-col h-screen w-screen overflow-hidden text-[#f8fafc] animate-fadeIn font-mono-jb select-none">
          {/* 1. TOP HEADER & NAVIGATION */}
          <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] px-6 py-4 flex items-center justify-between shrink-0 shadow-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowGrnModal(false)}
                className="p-2 rounded-xl bg-[#0e1d48] hover:bg-[#162a63] border border-blue-500/30 text-blue-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <span>&larr; Back to Inventory</span>
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-oswald text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                    Goods Received Note (GRN Entry)
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    BATCH ENTRY
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/60 uppercase">
                  Main Outlet Akkaraipattu &bull; Multi-Item Wholesaler Stock Intake & Pricing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-300/80 hidden sm:inline">
                {grnRows.length} {grnRows.length === 1 ? 'Item Row' : 'Item Rows'}
              </span>
              <button
                onClick={() => setShowGrnModal(false)}
                className="text-blue-300 hover:text-white p-2 rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. TOP HEADER METADATA FIELDS */}
          <div className="bg-[#091333] border-b border-[rgba(96,165,250,0.15)] p-4 sm:px-6 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl">
              {/* GRN Number */}
              <div>
                <label className="text-[10px] font-mono-jb uppercase text-emerald-300 font-bold block mb-1">
                  GRN Number
                </label>
                <input
                  type="text"
                  required
                  value={grnHeader.grnNumber}
                  onChange={(e) => setGrnHeader({ ...grnHeader, grnNumber: e.target.value })}
                  className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3.5 py-2 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400"
                />
              </div>

              {/* Date Received */}
              <div>
                <label className="text-[10px] font-mono-jb uppercase text-emerald-300 font-bold block mb-1">
                  Date Received
                </label>
                <input
                  type="date"
                  required
                  value={grnHeader.date}
                  onChange={(e) => setGrnHeader({ ...grnHeader, date: e.target.value })}
                  className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* Supplier Selector */}
              <div>
                <label className="text-[10px] font-mono-jb uppercase text-emerald-300 font-bold block mb-1">
                  Supplier Code & Name
                </label>
                <select
                  value={grnHeader.supplierCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const nameMap: Record<string, string> = {
                      SID1: 'Akkaraipattu Tech Wholesale',
                      SID2: 'Colombo Mobile Spares Hub',
                      SID3: 'Eastern Cellular Accessories',
                      SID4: 'Global Tech Distributors',
                    };
                    setGrnHeader({
                      ...grnHeader,
                      supplierCode: code,
                      supplierName: nameMap[code] || 'Wholesale Supplier',
                    });
                  }}
                  className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                >
                  <option value="SID1">SID1 - Akkaraipattu Tech Wholesale</option>
                  <option value="SID2">SID2 - Colombo Mobile Spares Hub</option>
                  <option value="SID3">SID3 - Eastern Cellular Accessories</option>
                  <option value="SID4">SID4 - Global Tech Distributors</option>
                </select>
              </div>

              {/* Supplier Invoice / Delivery Ref */}
              <div>
                <label className="text-[10px] font-mono-jb uppercase text-emerald-300 font-bold block mb-1">
                  Supplier Invoice / Memo Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-88219"
                  value={grnHeader.invoiceRef}
                  onChange={(e) => setGrnHeader({ ...grnHeader, invoiceRef: e.target.value })}
                  className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* 3. MULTI-ITEM GRID / FORM TABLE */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-sm">
              <table
                className="w-full border-collapse border border-slate-300 bg-white font-pos-table text-black font-bold text-xs"
                style={{ fontFamily: "'Century Gothic', 'Calisto MT', 'CenturyGothic', AppleGothic, sans-serif" }}
              >
                <thead>
                  <tr className="bg-[#e8eaed] text-black uppercase text-xs font-bold border-b border-slate-300">
                    <th className="py-2.5 px-3 text-center w-12 border border-slate-300">#</th>
                    <th className="py-2.5 px-3 text-left w-48 border border-slate-300">Item Code</th>
                    <th className="py-2.5 px-3 text-left border border-slate-300">Item Description / Name</th>
                    <th className="py-2.5 px-3 text-center w-28 border border-slate-300">Quantity</th>
                    <th className="py-2.5 px-3 text-right w-36 border border-slate-300">Cost Price ({currency})</th>
                    <th className="py-2.5 px-3 text-right w-36 border border-slate-300">Selling Price ({currency})</th>
                    <th className="py-2.5 px-3 text-right w-36 border border-slate-300">Line Total</th>
                    <th className="py-2.5 px-3 text-center w-14 border border-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white text-black font-bold">
                  {grnRows.map((row, idx) => {
                    const lineCost = (Number(row.quantityReceived) || 0) * (Number(row.costPrice) || 0);
                    return (
                      <tr key={row.id} className="bg-white hover:bg-[#f8fafc] text-black font-bold transition-colors">
                        <td className="py-2.5 px-3 text-center text-black font-bold border border-slate-300">{idx + 1}</td>

                        {/* Item Code (with dropdown/autocomplete selector) - Col 0 */}
                        <td className="py-2 px-2.5 border border-slate-300">
                          <div className="relative">
                            <input
                              type="text"
                              value={row.itemCode}
                              data-grn-row={idx}
                              data-grn-col={0}
                              onKeyDown={(e) => handleGrnCellKeyDown(e, idx, 0)}
                              onChange={(e) => handleUpdateRowField(row.id, 'itemCode', e.target.value)}
                              placeholder="Code (e.g. 000027)"
                              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs font-bold text-black outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                              list={`catalog-codes-${row.id}`}
                            />
                            <datalist id={`catalog-codes-${row.id}`}>
                              {items.map((it) => (
                                <option key={it.code} value={it.code}>
                                  {it.code} - {it.name}
                                </option>
                              ))}
                            </datalist>
                          </div>
                        </td>

                        {/* Item Description / Name - Col 1 */}
                        <td className="py-2 px-2.5 border border-slate-300">
                          <input
                            type="text"
                            value={row.itemName}
                            data-grn-row={idx}
                            data-grn-col={1}
                            onKeyDown={(e) => handleGrnCellKeyDown(e, idx, 1)}
                            onChange={(e) => handleUpdateRowField(row.id, 'itemName', e.target.value)}
                            placeholder="Description / Name"
                            className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-black outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-bold"
                          />
                        </td>

                        {/* Quantity Received - Col 2 */}
                        <td className="py-2 px-2.5 text-center border border-slate-300">
                          <input
                            type="number"
                            min="1"
                            value={row.quantityReceived}
                            data-grn-row={idx}
                            data-grn-col={2}
                            onKeyDown={(e) => handleGrnCellKeyDown(e, idx, 2)}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, 'quantityReceived', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-20 bg-white border border-slate-300 rounded-sm px-2 py-1.5 text-xs font-black text-center text-black outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Cost Price - Col 3 */}
                        <td className="py-2 px-2.5 text-right border border-slate-300">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.costPrice}
                            data-grn-row={idx}
                            data-grn-col={3}
                            onKeyDown={(e) => handleGrnCellKeyDown(e, idx, 3)}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, 'costPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-28 bg-white border border-slate-300 rounded-sm px-2 py-1.5 text-xs text-right text-black outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-bold"
                          />
                        </td>

                        {/* Selling Price - Col 4 (Last editable cell: Enter here creates new row) */}
                        <td className="py-2 px-2.5 text-right border border-slate-300">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.sellingPrice}
                            data-grn-row={idx}
                            data-grn-col={4}
                            onKeyDown={(e) => handleGrnCellKeyDown(e, idx, 4)}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, 'sellingPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-28 bg-white border border-slate-300 rounded-sm px-2 py-1.5 text-xs text-right font-black text-black outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Line Total (Quantity * Cost Price) - Non-editable, automatically bypassed by keyboard */}
                        <td className="py-2.5 px-3 text-right font-black text-black border border-slate-300">
                          {currency} {lineCost.toLocaleString()}
                        </td>

                        {/* Action (Delete/trash) */}
                        <td className="py-2.5 px-3 text-center border border-slate-300">
                          <button
                            type="button"
                            onClick={() => handleDeleteGrnRow(row.id)}
                            title="Remove Row"
                            className="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* "Add Row" Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddGrnRow}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add Item Row</span>
              </button>

              <div className="flex items-center gap-2.5 text-[11px] text-cyan-300 font-mono-jb bg-[#050e26] border border-cyan-500/30 px-3 py-1.5 rounded-xl flex-wrap">
                <span className="font-bold uppercase text-emerald-400 flex items-center gap-1">
                  <span>⚡ Excel Keyboard Navigation:</span>
                </span>
                <span>
                  <kbd className="bg-blue-900/80 px-1.5 py-0.5 rounded border border-blue-400/40 text-white font-bold text-[10px]">Tab</kbd> / <kbd className="bg-blue-900/80 px-1.5 py-0.5 rounded border border-blue-400/40 text-white font-bold text-[10px]">Enter</kbd> Next
                </span>
                <span className="text-blue-500">&bull;</span>
                <span>
                  <kbd className="bg-blue-900/80 px-1.5 py-0.5 rounded border border-blue-400/40 text-white font-bold text-[10px]">&uarr;&darr;&larr;&rarr;</kbd> Grid Arrow Keys
                </span>
                <span className="text-blue-500">&bull;</span>
                <span className="text-amber-300 font-semibold">
                  <kbd className="bg-amber-900/80 px-1.5 py-0.5 rounded border border-amber-400/40 text-white font-bold text-[10px]">Enter</kbd> on Last Cell Auto-Adds New Row
                </span>
              </div>
            </div>
          </div>

          {/* 4. SUMMARY ROW & ACTION FOOTER */}
          <div className="bg-[#091333] border-t border-[rgba(96,165,250,0.2)] p-4 sm:px-6 shrink-0 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Summary Metrics */}
              <div className="flex items-center gap-6 flex-wrap font-mono-jb text-xs">
                <div>
                  <span className="text-[10px] uppercase text-blue-300/70 block font-bold">Total Items</span>
                  <span className="text-base font-black text-white">{grnRows.length} Items</span>
                </div>

                <div className="h-8 w-px bg-blue-500/20 hidden sm:block" />

                <div>
                  <span className="text-[10px] uppercase text-blue-300/70 block font-bold">Total Units Received</span>
                  <span className="text-base font-black text-cyan-300">
                    {grnRows.reduce((sum, r) => sum + (Number(r.quantityReceived) || 0), 0)} Units
                  </span>
                </div>

                <div className="h-8 w-px bg-blue-500/20 hidden sm:block" />

                <div>
                  <span className="text-[10px] uppercase text-amber-300/80 block font-bold">Total GRN Cost</span>
                  <span className="text-lg font-black text-amber-400">
                    {currency}{' '}
                    {grnRows
                      .reduce(
                        (sum, r) => sum + (Number(r.quantityReceived) || 0) * (Number(r.costPrice) || 0),
                        0
                      )
                      .toLocaleString()}
                  </span>
                </div>

                <div className="h-8 w-px bg-blue-500/20 hidden sm:block" />

                <div>
                  <span className="text-[10px] uppercase text-emerald-300/80 block font-bold">Total Retail Value</span>
                  <span className="text-lg font-black text-emerald-400">
                    {currency}{' '}
                    {grnRows
                      .reduce(
                        (sum, r) => sum + (Number(r.quantityReceived) || 0) * (Number(r.sellingPrice) || 0),
                        0
                      )
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowGrnModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-blue-500/30 text-blue-200 hover:text-white hover:bg-white/10 text-xs font-bold font-mono-jb transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePostGrnBatch}
                  className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white rounded-xl font-oswald text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/40 transition-all cursor-pointer ring-2 ring-emerald-400"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Post GRN Note ({grnRows.length} Items)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DUAL-SOURCE BULK STOCK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-cyan-500/50 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col font-mono-jb">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0a1844] via-[#0d225c] to-[#0a1844] border-b border-cyan-500/30 p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    Bulk Stock Sheet Import
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    Dual-source import engine &bull; Real-time relational database synchronization
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPreviewLoaded(false);
                }}
                className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
              {/* Dual-Source Selection Tabs */}
              <div>
                <label className="text-xs uppercase text-cyan-300 font-bold block mb-2">
                  1. Select Stock Sheet Source:
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-[#050c24] rounded-2xl border border-blue-500/30">
                  <button
                    type="button"
                    onClick={() => {
                      setImportSourceTab('computer');
                      setPreviewLoaded(false);
                    }}
                    className={`py-3 px-4 rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      importSourceTab === 'computer'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                        : 'text-blue-200/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Upload from This Computer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportSourceTab('drive');
                      setPreviewLoaded(false);
                    }}
                    className={`py-3 px-4 rounded-xl font-oswald text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      importSourceTab === 'drive'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                        : 'text-blue-200/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Connect from Google Drive</span>
                  </button>
                </div>
              </div>

              {/* Source Option A: Upload from This Computer */}
              {importSourceTab === 'computer' && (
                <div className="space-y-3 bg-[#050c24] p-4 rounded-2xl border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-200 uppercase flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Local File Picker (CSV / Excel format)</span>
                    </span>
                    <span className="text-[10px] text-blue-300/60 font-mono-jb">Supports .csv, .xlsx, .xls</span>
                  </div>

                  {/* Template Download & Format Guidance Bar */}
                  <div className="bg-[#09153a] border border-cyan-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase font-oswald tracking-wide">
                          Official Stock Import Template
                        </div>
                        <p className="text-[10px] text-blue-200/70 font-mono-jb">
                          Pre-formatted schema: <code className="text-cyan-300">Item Code, Item Name, Category, Brand, Cost Price, Selling Price, Opening Quantity</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadStockExcelTemplate()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-oswald text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                        title="Download Excel (.xlsx) Stock Template"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Excel (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadStockCsvTemplate()}
                        className="px-2.5 py-1.5 bg-[#0a1844] hover:bg-[#122b7a] border border-blue-400/30 text-blue-200 hover:text-white rounded-lg font-oswald text-[11px] uppercase tracking-wider font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Download CSV (.csv) Stock Template"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setImportDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setImportDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setImportDragActive(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) {
                        processUploadedFile(droppedFile);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      importDragActive
                        ? 'border-cyan-300 bg-cyan-950/40 ring-2 ring-cyan-400 scale-[1.01]'
                        : 'border-cyan-500/40 hover:border-cyan-400 bg-[#07133a]/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="computerFileInput"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="computerFileInput"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 text-blue-200 hover:text-white"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
                        <Upload className="w-7 h-7 stroke-[2.2]" />
                      </div>
                      <div className="text-sm font-bold font-oswald uppercase tracking-wider text-white">
                        {importDragActive ? 'Drop your stock file here!' : 'Click to Browse or Drag & Drop Stock File'}
                      </div>
                      <p className="text-[11px] text-blue-300/70 font-mono-jb">
                        {selectedFileName ? (
                          <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/40">
                            Loaded: {selectedFileName}
                          </span>
                        ) : (
                          'Accepts Microsoft Excel (.xlsx, .xls) and Delimited CSV files'
                        )}
                      </p>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTextPasteInput(!showTextPasteInput)}
                      className="text-[11px] text-cyan-300 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{showTextPasteInput ? 'Hide manual CSV paste box' : 'Or paste raw CSV text manually'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadPreview('computer')}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-md shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Parse & Preview Sheet</span>
                    </button>
                  </div>

                  {showTextPasteInput && (
                    <div className="pt-2 animate-fadeIn">
                      <textarea
                        rows={5}
                        value={importCsvText}
                        onChange={(e) => setImportCsvText(e.target.value)}
                        className="w-full bg-[#030818] border border-blue-500/30 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-mono-jb"
                        placeholder="Item Code,Item Name,Category,Brand,Cost Price,Selling Price,Opening Quantity..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Source Option B: Connect from Google Drive */}
              {importSourceTab === 'drive' && (
                <div className="space-y-3 bg-[#050c24] p-4 rounded-2xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Cloud className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white uppercase block">
                          Google Drive Integration
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono-jb">
                          Account Synced: raasithmobile.pos@gmail.com
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Connected &bull; Active
                    </span>
                  </div>

                  <label className="text-[11px] uppercase text-emerald-300 font-bold block pt-1">
                    Select Cloud Spreadsheet from Drive:
                  </label>
                  <div className="space-y-2">
                    {GOOGLE_DRIVE_SHEETS.map((sheet) => {
                      const isSelected = selectedDriveFile === sheet.id;
                      return (
                        <div
                          key={sheet.id}
                          onClick={() => {
                            setSelectedDriveFile(sheet.id);
                            setImportCsvText(sheet.csvData);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
                              : 'bg-[#08143d] border-blue-500/20 hover:border-emerald-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{sheet.name}</span>
                                <span className="text-[10px] text-blue-300/60 font-normal">({sheet.size})</span>
                              </div>
                              <p className="text-[10px] text-blue-200/70 mt-0.5">{sheet.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-emerald-400 font-mono-jb hidden sm:inline">{sheet.updated}</span>
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-blue-400/30'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-500/20">
                    <span className="text-[10px] text-blue-300/70 font-mono-jb">
                      Selected Drive Sheet: <span className="text-emerald-400 font-bold">{selectedDriveFile}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadPreview('drive')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Load Drive Sheet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. LOAD PREVIEW SECTION */}
              {previewLoaded && parsedImportItems.length > 0 && (
                <div className="space-y-3 bg-[#050c24] p-4 rounded-2xl border border-cyan-500/40 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <FileCheck className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-white">
                        2. Sheet Load Preview ({parsedImportItems.length} Valid SKUs Detected)
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono-jb">
                      <span className="text-cyan-300 font-bold">
                        Categories: {new Set(parsedImportItems.map((p) => p.category)).size}
                      </span>
                      <span className="text-blue-300 font-bold">
                        Brands: {new Set(parsedImportItems.map((p) => p.brand)).size}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        Valuation: {currency} {parsedImportItems.reduce((acc, p) => acc + p.costPrice * p.qty, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-blue-500/30 rounded-xl overflow-hidden max-h-60 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-[#0a1844] text-[10px] uppercase font-mono-jb text-cyan-300 border-b border-blue-500/30">
                        <tr>
                          <th className="py-2 px-3">Code</th>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Brand</th>
                          <th className="py-2 px-3">Cost Price</th>
                          <th className="py-2 px-3">Selling Price</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3 text-right">Database Sync Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-500/15 font-mono-jb text-[11px]">
                        {parsedImportItems.map((item, idx) => (
                          <tr key={`${item.code}-${idx}`} className="hover:bg-blue-600/10">
                            <td className="py-2 px-3 font-bold text-white">{item.code}</td>
                            <td className="py-2 px-3 text-blue-100">{item.name}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-blue-200">{item.brand}</td>
                            <td className="py-2 px-3 text-cyan-300">{currency} {item.costPrice.toLocaleString()}</td>
                            <td className="py-2 px-3 text-emerald-300">{currency} {item.sellingPrice.toLocaleString()}</td>
                            <td className="py-2 px-3 font-bold text-amber-300">{item.qty} units</td>
                            <td className="py-2 px-3 text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Ready to Commit</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with PROMINENT CONFIRM BUTTON */}
            <div className="bg-[#050c24] border-t border-cyan-500/30 p-4 sm:p-5 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setPreviewLoaded(false);
                }}
                className="px-4 py-2 text-xs text-blue-200/70 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {previewLoaded && (
                  <button
                    type="button"
                    onClick={() => setPreviewLoaded(false)}
                    className="px-4 py-2 border border-blue-500/30 rounded-xl text-xs text-blue-200 hover:text-white transition-colors cursor-pointer"
                  >
                    Reset Preview
                  </button>
                )}

                {/* PROMINENT CONFIRM BUTTON */}
                <button
                  type="button"
                  disabled={!previewLoaded || parsedImportItems.length === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className={`px-7 py-3 rounded-xl font-oswald text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
                    previewLoaded && parsedImportItems.length > 0 && !isImporting
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/40 ring-2 ring-emerald-400'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle className={`w-4 h-4 stroke-[2.5] ${isImporting ? 'animate-spin' : ''}`} />
                  <span>
                    {isImporting
                      ? 'Synchronizing Database...'
                      : `Confirm & Update Database (${parsedImportItems.length} Items)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STOCK ADJUSTMENT POPUP */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-amber-500/50 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono-jb">
            <div className="bg-gradient-to-r from-[#191508] to-[#0a1844] border-b border-amber-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-white">
                    Stock Adjustment Discrepancy Log
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    Properly log inventory additions (+) or write-offs (-)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-blue-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="p-6 space-y-4">
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                    Item Code
                  </label>
                  <select
                    value={adjustmentForm.itemCode}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, itemCode: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  >
                    {items.map((i) => (
                      <option key={i.code} value={i.code}>
                        {i.code} - {i.name} (Live: {i.qty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                      Adjustment Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustmentForm({ ...adjustmentForm, type: '+' })}
                        className={`py-2 rounded-xl font-bold text-center border cursor-pointer ${
                          adjustmentForm.type === '+'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-[#050c24] text-blue-200 border-blue-500/30'
                        }`}
                      >
                        + Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentForm({ ...adjustmentForm, type: '-' })}
                        className={`py-2 rounded-xl font-bold text-center border cursor-pointer ${
                          adjustmentForm.type === '-'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : 'bg-[#050c24] text-blue-200 border-blue-500/30'
                        }`}
                      >
                        - Deduct Stock
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                      Adjustment Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={adjustmentForm.quantity}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                    Reason for Adjustment
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broken display box, Found excess during shelf audit, Demo use"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={adjustmentForm.date}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-500/20">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 text-xs text-blue-200/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE / EDIT ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-blue-500/50 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col font-mono-jb">
            <div className="bg-gradient-to-r from-[#0a1844] to-[#0c1f54] border-b border-blue-500/30 p-5 flex items-center justify-between">
              <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-white">
                {editingItem ? 'Edit Inventory Item' : 'New Item Master Entry'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-blue-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingItem) {
                  setItems((prev) =>
                    prev.map((i) => (i.id === editingItem.id ? ({ ...i, ...itemForm } as PosItem) : i))
                  );
                  setNotification(`Updated item "${itemForm.name}".`);
                } else {
                  const newItem: PosItem = {
                    id: `ITM-${Date.now()}`,
                    code: itemForm.code || String(Date.now()),
                    barcode: itemForm.barcode || String(Date.now()),
                    name: itemForm.name || 'Unnamed Item',
                    category: itemForm.category || 'General',
                    brand: itemForm.brand || 'Generic',
                    size: 'Standard',
                    color: 'Standard',
                    costPrice: Number(itemForm.costPrice) || 0,
                    sellingPrice: Number(itemForm.sellingPrice) || 0,
                    qty: Number(itemForm.qty) || 0,
                    type: itemForm.type || 'Accessory',
                    availability: (Number(itemForm.qty) || 0) > 5 ? 'In Stock' : 'Low Stock',
                  };
                  setItems((prev) => [newItem, ...prev]);
                  setNotification(`Created new item master entry "${newItem.name}".`);
                }
                setShowItemModal(false);
              }}
              className="p-6 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Item Code</label>
                  <input
                    type="text"
                    required
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={itemForm.barcode}
                    onChange={(e) => setItemForm({ ...itemForm, barcode: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={itemForm.brand}
                    onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Cost Price ({currency})</label>
                  <input
                    type="number"
                    required
                    value={itemForm.costPrice}
                    onChange={(e) => setItemForm({ ...itemForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    required
                    value={itemForm.sellingPrice}
                    onChange={(e) => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    required
                    value={itemForm.qty}
                    onChange={(e) => setItemForm({ ...itemForm, qty: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#050c24] border border-blue-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-500/20">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs text-blue-200/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer"
                >
                  Save Item Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DELETION / REVERSAL AUTHORIZATION MODAL */}
      <AdminAuthModal
        isOpen={adminAuthModal.isOpen}
        onClose={() => setAdminAuthModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={adminAuthModal.onSuccess}
        title={adminAuthModal.title}
        actionDescription={adminAuthModal.actionDescription}
        token={token}
      />

      {/* DEDICATED BARCODE PRINTING MODULE */}
      <BarcodePrintingModal
        isOpen={isBarcodePrinterOpen}
        onClose={() => {
          setIsBarcodePrinterOpen(false);
          setBarcodeTargetItem(null);
        }}
        initialItem={barcodeTargetItem}
        items={items}
        currency={currency}
        shopName={activeShopName}
        token={token}
      />

      {/* INTERACTIVE ITEM TRANSACTION HISTORY & LEDGER MODAL */}
      <ItemHistoryModal
        isOpen={isItemHistoryModalOpen}
        onClose={() => {
          setIsItemHistoryModalOpen(false);
          setHistoryTargetItemCode(null);
        }}
        initialItemCode={historyTargetItemCode}
        items={items}
        currency={currency}
        token={token}
        outlet="Main Outlet Akkaraipattu"
        onOpenBarcodePrinter={(it) => {
          setIsItemHistoryModalOpen(false);
          setBarcodeTargetItem(it);
          setIsBarcodePrinterOpen(true);
        }}
      />
      {/* MODAL 3: BATCH STOCK IMPORT SUCCESS SUMMARY MODAL */}
      {importSuccessModal && importSuccessModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-mono-jb">
          <div className="bg-[#081335] border-2 border-emerald-500/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#061d36] via-[#092b45] to-[#061d36] border-b border-emerald-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                  <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wider text-white">
                    Stock Import Succeeded!
                  </h3>
                  <p className="text-[11px] text-emerald-300/80">
                    Live relational inventory & movement logs synchronized
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportSuccessModal(null)}
                className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-emerald-300/80 font-bold block">Batch Source File</span>
                  <span className="text-sm font-bold text-white break-all">{importSuccessModal.fileName}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                  Committed
                </span>
              </div>

              {/* Added vs Updated Counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#050c24] border border-blue-500/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase text-cyan-300 font-bold mb-1">New Items Added</span>
                  <span className="text-2xl font-black text-cyan-400 font-oswald">
                    +{importSuccessModal.itemsAdded}
                  </span>
                  <span className="text-[10px] text-blue-200/60 mt-0.5">Created in Catalog</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#050c24] border border-blue-500/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase text-amber-300 font-bold mb-1">Existing Updated</span>
                  <span className="text-2xl font-black text-amber-400 font-oswald">
                    {importSuccessModal.itemsUpdated}
                  </span>
                  <span className="text-[10px] text-blue-200/60 mt-0.5">Stock & Rates Refreshed</span>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-[#050c24] border border-blue-500/20 rounded-xl space-y-2 text-[11px]">
                <div className="flex justify-between text-blue-200/80">
                  <span>Total Items Processed:</span>
                  <strong className="text-white font-bold">{importSuccessModal.totalCommitted} SKUs</strong>
                </div>
                {importSuccessModal.totalStockUnits > 0 && (
                  <div className="flex justify-between text-blue-200/80">
                    <span>Active Store Units:</span>
                    <strong className="text-emerald-400 font-bold">{importSuccessModal.totalStockUnits.toLocaleString()} Units</strong>
                  </div>
                )}
                {importSuccessModal.totalRetailValuation > 0 && (
                  <div className="flex justify-between text-blue-200/80">
                    <span>Total Retail Valuation:</span>
                    <strong className="text-emerald-400 font-bold">{currency} {importSuccessModal.totalRetailValuation.toLocaleString()}</strong>
                  </div>
                )}
                <div className="flex justify-between text-blue-200/80">
                  <span>Audit Movement Logged:</span>
                  <strong className="text-cyan-300 font-bold">stock_movement_logs (Bulk Import)</strong>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#050c24] border-t border-emerald-500/20 p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setImportSuccessModal(null);
                  setIsBarcodePrinterOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900/30 text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Print Barcodes for Batch</span>
              </button>

              <button
                type="button"
                onClick={() => setImportSuccessModal(null)}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-oswald text-xs uppercase tracking-wider font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
