import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Trash2,
  Printer,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  DollarSign,
  User,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Receipt,
  Smartphone,
  Tag,
  Barcode,
  Layers,
  ChevronRight,
  X,
  Clock,
  Calendar,
  AlertCircle,
  Wrench,
  Check,
  Zap,
  Phone,
  Banknote,
  Building2,
  Wallet,
  PlusCircle,
  PackagePlus,
  ShieldCheck,
  UserPlus,
  ShieldAlert,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { PosItem, PosBillItem, PosBill, ItemBatch, INITIAL_POS_ITEMS, INITIAL_ITEM_BATCHES, PosSystemConfig } from '../data/posData.ts';
import { RepairJob } from '../types.ts';
import { SalesReturnsModal } from './SalesReturnsModal.tsx';
import { QuickAddCustomerModal } from './QuickAddCustomerModal.tsx';
import { ViewOnlyInvoiceModal } from './ViewOnlyInvoiceModal.tsx';
import { EodClosingModal } from './EodClosingModal.tsx';
import { RecallRepairJobModal, isJobReadyForPickup, isJobDelivered } from './RecallRepairJobModal.tsx';
import { BatchSelectionModal } from './BatchSelectionModal.tsx';

interface PosTerminalViewProps {
  config: PosSystemConfig;
  token?: string | null;
  onPrintThermalBill?: (bill: PosBill) => void;
  staffName?: string;
  onOpenNewRepairJob?: () => void;
  jobs?: RepairJob[];
  recalledJob?: RepairJob | null;
  onClearRecalledJob?: () => void;
  initialItemToAdd?: PosItem | null;
  onClearInitialItemToAdd?: () => void;
  recalledCustomer?: { phoneNumber: string; customerName: string; creditDue?: number; advanceBalance?: number } | null;
  onClearRecalledCustomer?: () => void;
  onUpdateJobStatus?: (job: RepairJob, newStatus: any) => Promise<void>;
  onTriggerDeliveredPassport?: (job: RepairJob) => void;
}

export const PosTerminalView: React.FC<PosTerminalViewProps> = ({
  config,
  token,
  onPrintThermalBill,
  staffName = 'Mohamed Raasith',
  onOpenNewRepairJob,
  jobs = [],
  recalledJob: propRecalledJob,
  onClearRecalledJob,
  initialItemToAdd,
  onClearInitialItemToAdd,
  recalledCustomer,
  onClearRecalledCustomer,
  onUpdateJobStatus,
  onTriggerDeliveredPassport,
}) => {
  const [itemsCatalog, setItemsCatalog] = useState<PosItem[]>(INITIAL_POS_ITEMS);
  const [billNumber, setBillNumber] = useState('INV000009');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('0771234567');
  const [pendingDeliveredJob, setPendingDeliveredJob] = useState<RepairJob | null>(null);
  const deliverButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pendingDeliveredJob) {
      const timer = setTimeout(() => deliverButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [pendingDeliveredJob]);

  const handleDeliverRecalledJob = async (job: RepairJob) => {
    if (onUpdateJobStatus) {
      await onUpdateJobStatus(job, 'Delivered');
    }
    if (onTriggerDeliveredPassport) {
      onTriggerDeliveredPassport(job);
    }
    setPendingDeliveredJob(null);
  };

  // Customer Account & Advance / Credit States
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState<number>(0);
  const [customerCreditDue, setCustomerCreditDue] = useState<number>(0);
  const [applyCustomerAdvance, setApplyCustomerAdvance] = useState(false);
  const [appliedAdvanceAmount, setAppliedAdvanceAmount] = useState<number>(0);

  // Customer Instant Search Dropdown
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Payment Terms & Methods
  const [paymentTerm, setPaymentTerm] = useState<'Cash' | 'Credit'>('Cash');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  // Active Recalled Repair Job
  const [activeRecalledJob, setActiveRecalledJob] = useState<RepairJob | null>(propRecalledJob || null);
  const [showJobRecallModal, setShowJobRecallModal] = useState(false);
  const [recallBlockedModal, setRecallBlockedModal] = useState<{
    isOpen: boolean;
    job: RepairJob | null;
    message: string;
  }>({
    isOpen: false,
    job: null,
    message: '',
  });

  const isJobReadyForRecall = (j: RepairJob) => isJobReadyForPickup(j);

  // Dual-Mode Sales Returns Modal
  const [showSalesReturnsModal, setShowSalesReturnsModal] = useState(false);

  // On-the-Fly Item Creation Modal
  const [showAddNewItemModal, setShowAddNewItemModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    code: '',
    barcode: '',
    category: 'Displays',
    brand: 'Generic',
    costPrice: 0,
    sellingPrice: 1000,
    qty: 10,
    type: 'Spare Part',
    availability: 'In Stock',
  });
  const [savingNewItemOnTheFly, setSavingNewItemOnTheFly] = useState(false);

  // Invoice items
  const [cartItems, setCartItems] = useState<PosBillItem[]>([
    {
      id: 'B-1',
      code: 'SCR-IP13-OLED',
      name: 'iPhone 13 OLED Display Assembly (OEM Grade)',
      qty: 1,
      price: 24500,
      discount: 0,
      total: 24500,
    },
    {
      id: 'B-2',
      code: 'GLS-TMP-UNIV',
      name: '9D Full Curved Tempered Glass (iPhone 14/15)',
      qty: 2,
      price: 950,
      discount: 100,
      total: 1800,
    },
  ]);

  // Lookup & input state
  const [itemQuery, setItemQuery] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<PosItem | null>(null);
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputDiscount, setInputDiscount] = useState<number>(0);
  const [quickBillSearch, setQuickBillSearch] = useState('');
  const [billLocked, setBillLocked] = useState(false);
  const [lockingInvoice, setLockingInvoice] = useState(false);
  const [lockedInvoicesCount, setLockedInvoicesCount] = useState<number>(0);
  const [lockedInvoicesList, setLockedInvoicesList] = useState<any[]>([]);
  const [showLockedInvoicesModal, setShowLockedInvoicesModal] = useState(false);
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [viewOnlyInvoiceData, setViewOnlyInvoiceData] = useState<(PosBill & { items?: PosBillItem[] }) | null>(null);
  const [showQuickAddCustomerModal, setShowQuickAddCustomerModal] = useState(false);
  const [showEodModal, setShowEodModal] = useState(false);
  const [returnsAmount, setReturnsAmount] = useState<number>(0);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [inputErrorNotice, setInputErrorNotice] = useState<string | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  // Batch Selection & Pricing Architecture
  const [batchModalState, setBatchModalState] = useState<{
    isOpen: boolean;
    item: PosItem | null;
    qty: number;
    batches: ItemBatch[];
  }>({
    isOpen: false,
    item: null,
    qty: 1,
    batches: [],
  });

  // Local & Remote Batch Resolver
  const getBatchesForItem = (itemCode: string): ItemBatch[] => {
    let allBatches: ItemBatch[] = [];
    try {
      const raw = localStorage.getItem('raasith_inventory_batches');
      if (raw) {
        allBatches = JSON.parse(raw);
      } else {
        allBatches = INITIAL_ITEM_BATCHES;
        localStorage.setItem('raasith_inventory_batches', JSON.stringify(INITIAL_ITEM_BATCHES));
      }
    } catch (e) {
      allBatches = INITIAL_ITEM_BATCHES;
    }

    return allBatches.filter(
      (b) =>
        b.itemCode.toLowerCase() === itemCode.toLowerCase() &&
        b.status === 'Active' &&
        b.remainingQty > 0
    );
  };

  // Sync latest inventory batches from server backend
  useEffect(() => {
    const syncBatchesFromBackend = async () => {
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';
        const res = await fetch('/api/inventory/batches?activeOnly=true', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const serverBatches: ItemBatch[] = await res.json();
          if (Array.isArray(serverBatches) && serverBatches.length > 0) {
            const raw = localStorage.getItem('raasith_inventory_batches');
            const local: ItemBatch[] = raw ? JSON.parse(raw) : INITIAL_ITEM_BATCHES;
            const map = new Map<string, ItemBatch>();
            local.forEach((b) => map.set(b.batchNumber, b));
            serverBatches.forEach((b) => map.set(b.batchNumber, b));
            localStorage.setItem('raasith_inventory_batches', JSON.stringify(Array.from(map.values())));
          }
        }
      } catch (err) {
        // Offline or backend unavailable, local cache is used
      }
    };
    syncBatchesFromBackend();
  }, [token]);

  // Search dropdown keyboard navigation state & refs
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset selectedIndex whenever itemQuery changes
  useEffect(() => {
    if (itemQuery.trim()) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [itemQuery]);

  // Scroll the highlighted item into view automatically as the user presses UP/DOWN keys
  useEffect(() => {
    if (selectedIndex >= 0 && searchItemRefs.current[selectedIndex]) {
      searchItemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Cash Checkout Modal State
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  // References for Enter-Key Sequential Keyboard Flow
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const cashTenderedInputRef = useRef<HTMLInputElement>(null);
  const confirmPrintBtnRef = useRef<HTMLButtonElement>(null);

  // Sync prop recalledJob if changed
  useEffect(() => {
    if (propRecalledJob) {
      if (isJobDelivered(propRecalledJob)) {
        setRecallBlockedModal({
          isOpen: true,
          job: propRecalledJob,
          message: "This job order is already Delivered and completed. Delivered jobs cannot be recalled into the POS bill.",
        });
        if (onClearRecalledJob) onClearRecalledJob();
        return;
      }
      if (!isJobReadyForRecall(propRecalledJob)) {
        setRecallBlockedModal({
          isOpen: true,
          job: propRecalledJob,
          message: "It's not ready to pick up. Make it ready to pick up, then you can recall.",
        });
        if (onClearRecalledJob) onClearRecalledJob();
        return;
      }
      handleRecallJob(propRecalledJob);
    }
  }, [propRecalledJob]);

  // Sync prop initialItemToAdd (from Global Search barcode / inventory item)
  useEffect(() => {
    if (initialItemToAdd) {
      setSelectedItemToAdd(initialItemToAdd);
      setInputQty(1);
      setInputErrorNotice(null);
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
      onClearInitialItemToAdd?.();
    }
  }, [initialItemToAdd]);

  // Sync prop recalledCustomer (from Global Search customer phone / name)
  useEffect(() => {
    if (recalledCustomer) {
      setCustomerPhone(recalledCustomer.phoneNumber);
      setCustomerName(recalledCustomer.customerName);
      if (recalledCustomer.creditDue !== undefined) setCustomerCreditDue(recalledCustomer.creditDue);
      if (recalledCustomer.advanceBalance !== undefined) {
        setCustomerAdvanceBalance(recalledCustomer.advanceBalance);
        if (recalledCustomer.advanceBalance > 0) {
          setApplyCustomerAdvance(true);
          setAppliedAdvanceAmount(recalledCustomer.advanceBalance);
        }
      }
      onClearRecalledCustomer?.();
    }
  }, [recalledCustomer]);

  // Focus barcode input on initial mount & load database items and banks
  useEffect(() => {
    barcodeInputRef.current?.focus();

    const fetchCatalog = async () => {
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token');
        const res = await fetch('/api/inventory/items', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setItemsCatalog(data);
          }
        }
      } catch (e) {
        console.warn('Could not load live inventory items:', e);
      }
    };

    const fetchBanks = async () => {
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token');
        const res = await fetch('/api/pos/banks', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setBankAccounts(data);
          const def = data.find((b: any) => b.isDefault);
          if (def) setSelectedBankId(def.id);
          else if (data.length > 0) setSelectedBankId(data[0].id);
        }
      } catch (e) {
        console.warn('Could not load bank accounts:', e);
      }
    };

    const fetchCustomersList = async () => {
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token');
        const res = await fetch('/api/customer-accounts', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAllCustomers(data);
          }
        }
      } catch (err) {
        console.warn('Could not load customers in POS:', err);
      }
    };

    const fetchNextBillNumber = async () => {
      try {
        const authToken = token || localStorage.getItem('raasith_staff_token');
        const res = await fetch('/api/pos/next-bill-number', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.nextBillNo) {
            setBillNumber(data.nextBillNo);
          }
        }
      } catch (err) {
        console.warn('Could not load next bill number in POS:', err);
      }
    };

    fetchCatalog();
    fetchBanks();
    fetchCustomersList();
    fetchNextBillNumber();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchingCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return allCustomers.slice(0, 8);
    const qDigits = q.replace(/\D/g, '');
    return allCustomers
      .filter((c: any) => {
        const nameMatch = (c.customerName || '').toLowerCase().includes(q);
        const phoneDigits = (c.phoneNumber || '').replace(/\D/g, '');
        const phoneMatch =
          (c.phoneNumber || '').toLowerCase().includes(q) ||
          (qDigits.length >= 2 && phoneDigits.includes(qDigits)) ||
          (qDigits.length >= 3 && phoneDigits.replace(/^94/, '0').includes(qDigits)) ||
          (qDigits.length >= 3 && phoneDigits.includes(qDigits.replace(/^0/, '')));
        return nameMatch || phoneMatch;
      })
      .slice(0, 10);
  }, [allCustomers, customerSearchQuery]);

  const selectCustomerFromDropdown = (c: any) => {
    setCustomerName(c.customerName);
    setCustomerPhone(c.phoneNumber);
    setCustomerProfile(c);
    const due = Number(c.creditDue) || 0;
    const adv = Number(c.advanceBalance) || 0;
    setCustomerCreditDue(due);
    setCustomerAdvanceBalance(adv);
    if (adv > 0) {
      setApplyCustomerAdvance(true);
      setAppliedAdvanceAmount(adv);
    }
    setIsCustomerSearchOpen(false);
  };

  // Real-time customer advance and credit dues lookup by phone
  useEffect(() => {
    const clean = customerPhone.replace(/\D/g, '');
    if (clean.length >= 7) {
      const timer = setTimeout(async () => {
        try {
          const authToken = token || localStorage.getItem('raasith_staff_token');
          const res = await fetch(`/api/pos/customers/${clean}`, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            setCustomerProfile(data.customer);
            const adv = Number(data.advanceBalance) || 0;
            const due = Number(data.creditDue) || 0;
            setCustomerAdvanceBalance(adv);
            setCustomerCreditDue(due);
            if (data.customer?.customerName && customerName === 'Walk-in Customer') {
              setCustomerName(data.customer.customerName);
            }
            if (adv > 0) {
              setApplyCustomerAdvance(true);
              setAppliedAdvanceAmount(adv);
            }
          }
        } catch (err) {
          console.error('Customer phone lookup error:', err);
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setCustomerProfile(null);
      setCustomerAdvanceBalance(0);
      setCustomerCreditDue(0);
      setApplyCustomerAdvance(false);
      setAppliedAdvanceAmount(0);
    }
  }, [customerPhone, token]);

  // Filter items matching query
  const filteredCatalog = useMemo(() => {
    if (!itemQuery.trim()) return itemsCatalog.slice(0, 8);
    const q = itemQuery.toLowerCase().trim();
    return itemsCatalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.barcode.includes(q)
    );
  }, [itemsCatalog, itemQuery]);

  // Financial calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.total, 0);
  }, [cartItems]);

  const discountValue = useMemo(() => {
    return Math.round((subtotal * overallDiscountPercent) / 100);
  }, [subtotal, overallDiscountPercent]);

  // Strict Formula: TO PAY = Gross Total - Overall Discount - Customer Advance Deposit
  // Gross Total before discount & advance
  const cartGrossTotal = subtotal;

  const grossAfterDiscount = useMemo(() => {
    const net = cartGrossTotal - discountValue;
    return Math.max(0, net - returnsAmount);
  }, [cartGrossTotal, discountValue, returnsAmount]);

  const grossTotal = grossAfterDiscount;

  // Advance Paid from linked Repair Job
  const advancePaidFromJob = useMemo(() => {
    return activeRecalledJob?.advancePaid || 0;
  }, [activeRecalledJob]);

  // Gross collectible before customer advance deposit applied
  const grossBeforeCustomerAdvance = useMemo(() => {
    return Math.max(0, grossAfterDiscount - advancePaidFromJob);
  }, [grossAfterDiscount, advancePaidFromJob]);

  // Effective advance balance applied from customer account
  const effectiveCustomerAdvanceApplied = useMemo(() => {
    if (!applyCustomerAdvance || customerAdvanceBalance <= 0) return 0;
    const maxApplicable = Math.min(customerAdvanceBalance, grossBeforeCustomerAdvance);
    return Math.min(appliedAdvanceAmount > 0 ? appliedAdvanceAmount : maxApplicable, maxApplicable);
  }, [applyCustomerAdvance, customerAdvanceBalance, appliedAdvanceAmount, grossBeforeCustomerAdvance]);

  // Total Customer Advance Deposit (Job advance + Account advance)
  const totalCustomerAdvanceDeposit = useMemo(() => {
    return advancePaidFromJob + effectiveCustomerAdvanceApplied;
  }, [advancePaidFromJob, effectiveCustomerAdvanceApplied]);

  // Strict User Formula: TO PAY = Gross Total - Overall Discount - Customer Advance Deposit
  const toPayAmount = useMemo(() => {
    return Math.max(0, cartGrossTotal - discountValue - totalCustomerAdvanceDeposit - returnsAmount);
  }, [cartGrossTotal, discountValue, totalCustomerAdvanceDeposit, returnsAmount]);

  // Backward compatibility alias
  const amountToCollect = toPayAmount;

  // Dynamic Change Due or Remaining Due calculated in real-time
  const tenderedNum = typeof cashTendered === 'number' ? cashTendered : 0;
  const changeDue = Math.max(0, tenderedNum - toPayAmount);
  const remainingDue = Math.max(0, toPayAmount - tenderedNum);
  const creditDueAmount = paymentTerm === 'Credit' ? remainingDue : 0;

  // On-the-Fly Item Creation Handlers
  const handleOpenAddNewItemModal = (initialQuery = '') => {
    const q = initialQuery.trim();
    const isDigits = /^\d+$/.test(q);
    setNewItemForm({
      name: '',
      code: isDigits ? `ITM-${q.slice(-6)}` : (q || `ITM-${Date.now().toString().slice(-4)}`),
      barcode: isDigits ? q : `${Date.now().toString().slice(-10)}`,
      category: 'Displays',
      brand: 'Generic',
      costPrice: 0,
      sellingPrice: 1000,
      qty: 10,
      type: 'Spare Part',
      availability: 'In Stock',
    });
    setShowAddNewItemModal(true);
  };

  const handleSaveNewItemOnTheFly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name.trim() || !newItemForm.code.trim()) {
      setInputErrorNotice('Item name and code are required to register new product.');
      return;
    }

    setSavingNewItemOnTheFly(true);
    setInputErrorNotice(null);

    try {
      const authToken = token || localStorage.getItem('raasith_staff_token') || '';
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify(newItemForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save new item');
      }

      // Add to catalog
      setItemsCatalog((prev) => [data, ...prev]);

      // Automatically append to active sales cart!
      handleAddItem(data, 1);
      setShowAddNewItemModal(false);
      setItemQuery('');
      setSelectedItemToAdd(null);
      setPaymentSuccessNotice(`Product "${data.name}" added to inventory & inserted into bill!`);

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setInputErrorNotice(err.message || 'Error creating item on-the-fly');
    } finally {
      setSavingNewItemOnTheFly(false);
    }
  };

  // 1. BARCODE SCANNING & KEYBOARD NAVIGATION FLOW
  // Handler when navigating or pressing Enter in Barcode / Item Search field
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Navigate Down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (itemQuery.trim() && filteredCatalog.length > 0) {
        setSelectedIndex((prev) => (prev < filteredCatalog.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    // Navigate Up
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (itemQuery.trim() && filteredCatalog.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCatalog.length - 1));
      }
      return;
    }

    // Escape Key: Close dropdown popup
    if (e.key === 'Escape') {
      e.preventDefault();
      setItemQuery('');
      setSelectedIndex(-1);
      return;
    }

    // Enter Key: Select highlighted item or fallback
    if (e.key === 'Enter') {
      e.preventDefault();

      // Case A: Query is typed / barcode scanned
      if (itemQuery.trim()) {
        const itemToAdd =
          selectedIndex >= 0 && selectedIndex < filteredCatalog.length
            ? filteredCatalog[selectedIndex]
            : (filteredCatalog.length > 0 ? filteredCatalog[0] : null);

        if (itemToAdd) {
          // Auto-append directly to active cart without extra keypress!
          handleAddItem(itemToAdd, inputQty);
          setItemQuery('');
          setSelectedIndex(-1);
          setSelectedItemToAdd(null);
          setInputQty(1);
          setPaymentSuccessNotice(`Auto-Added: ${itemToAdd.name}`);
          setTimeout(() => {
            barcodeInputRef.current?.focus();
          }, 30);
        } else {
          // Item not found: Open On-the-Fly Add New Item modal!
          handleOpenAddNewItemModal(itemQuery.trim());
        }
        return;
      }

      // Case B: Search input is empty and there are items in the bill ->
      // Proceed directly into Cash Checkout / Payment sequence!
      if (cartItems.length > 0) {
        handleOpenCashCheckout();
      } else {
        setInputErrorNotice('Scan or select an item first before proceeding to checkout.');
      }
    }
  };

  // Handler when pressing Enter in Quantity field
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!selectedItemToAdd) {
        // Fallback to first filtered or refocus
        barcodeInputRef.current?.focus();
        return;
      }

      // Add item to the bill
      handleAddItem(selectedItemToAdd, inputQty);

      // Loop cursor back to "Scan Barcode / Item Search" input field for the next item
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 30);
    }
  };

  // Handle adding item to invoice with Batch-Wise Pricing
  const handleAddItem = (item: PosItem, qtyToAdd = inputQty, chosenBatch?: ItemBatch) => {
    if (billLocked) return;

    // Check if a batch has been designated or if multiple batches exist
    if (!chosenBatch) {
      const activeBatches = getBatchesForItem(item.code);
      if (activeBatches.length > 1) {
        // Multiple active batches with different cost/selling prices exist!
        // Display quick selection modal to secure exact profit margin
        setBatchModalState({
          isOpen: true,
          item,
          qty: qtyToAdd,
          batches: activeBatches,
        });
        return;
      } else if (activeBatches.length === 1) {
        // Single active batch: auto-bind its batch number, cost price and selling price
        chosenBatch = activeBatches[0];
      }
    }

    const unitPrice = chosenBatch ? chosenBatch.sellingPrice : item.sellingPrice;
    const unitCost = chosenBatch ? chosenBatch.costPrice : item.costPrice;
    const batchNo = chosenBatch ? chosenBatch.batchNumber : undefined;
    const batchDate = chosenBatch ? chosenBatch.purchaseDate : undefined;

    // Line matching: check both item code AND batchNumber
    const existingIndex = cartItems.findIndex(
      (ci) => ci.code === item.code && ci.batchNumber === batchNo && !ci.isFromJob
    );

    if (existingIndex > -1) {
      setCartItems((prev) =>
        prev.map((ci, idx) => {
          if (idx === existingIndex) {
            const newQty = ci.qty + qtyToAdd;
            const newTotal = newQty * ci.price - ci.discount;
            return { ...ci, qty: newQty, total: Math.max(0, newTotal) };
          }
          return ci;
        })
      );
    } else {
      const lineTotal = qtyToAdd * unitPrice - inputDiscount;
      const newItem: PosBillItem = {
        id: `B-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: item.code,
        name: item.name,
        qty: qtyToAdd,
        price: unitPrice,
        costPrice: unitCost,
        discount: inputDiscount,
        total: Math.max(0, lineTotal),
        batchNumber: batchNo,
        batchPurchaseDate: batchDate,
      };
      setCartItems((prev) => [newItem, ...prev]);
    }

    // Reset inputs and selection
    setItemQuery('');
    setSelectedItemToAdd(null);
    setInputQty(1);
    setInputDiscount(0);
    setInputErrorNotice(null);
  };

  const handleUpdateItemQty = (id: string, newQty: number, removeIfZero = false) => {
    if (billLocked) return;
    if (newQty <= 0 && removeIfZero) {
      handleRemoveItem(id);
      return;
    }
    const safeQty = Math.max(0, newQty);
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, qty: safeQty, total: Math.max(0, safeQty * item.price - item.discount) }
          : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    if (billLocked) return;
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 2. CASH CHECKOUT & PAYMENT SEQUENCE
  const handleOpenCashCheckout = () => {
    if (cartItems.length === 0) {
      setInputErrorNotice('Invoice is empty. Scan barcode or add items before checking out.');
      barcodeInputRef.current?.focus();
      return;
    }
    // Pre-populate with exact amount to collect
    setCashTendered(amountToCollect);
    setIsCashModalOpen(true);
    setTimeout(() => {
      cashTenderedInputRef.current?.focus();
      cashTenderedInputRef.current?.select();
    }, 60);
  };

  const handleCashTenderedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If cash is tendered and covers amount, or if exact, trigger print confirmation
      if (typeof cashTendered !== 'number' || cashTendered <= 0) {
        setCashTendered(amountToCollect);
      }
      setTimeout(() => {
        confirmPrintBtnRef.current?.focus();
      }, 40);
    }
    if (e.key === 'Escape') {
      setIsCashModalOpen(false);
      barcodeInputRef.current?.focus();
    }
  };

  const handleFinalizeAndPrint = async () => {
    if (cartItems.length === 0) {
      setInputErrorNotice('Cart is empty. Add items before checking out.');
      return;
    }

    if (paymentTerm === 'Credit' && (!customerPhone || !customerPhone.trim())) {
      setInputErrorNotice('Customer Phone number is required when selecting Credit payment terms.');
      return;
    }

    const finalTendered =
      paymentTerm === 'Credit'
        ? (typeof cashTendered === 'number' ? cashTendered : 0)
        : (typeof cashTendered === 'number' ? cashTendered : amountToCollect);

    const finalChange =
      paymentTerm === 'Credit'
        ? 0
        : Math.max(0, finalTendered - amountToCollect);

    const billCreditDue =
      paymentTerm === 'Credit'
        ? Math.max(0, amountToCollect - finalTendered)
        : 0;

    setProcessingCheckout(true);
    setInputErrorNotice(null);

    const authToken = token || localStorage.getItem('raasith_staff_token') || 'staff-session:admin-mohamed';

    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          billNo: billNumber,
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone ? customerPhone.trim() : null,
          items: cartItems,
          subtotal,
          discount: discountValue,
          returns: returnsAmount,
          advancePaid: advancePaidFromJob,
          advanceApplied: effectiveCustomerAdvanceApplied,
          netTotal: amountToCollect,
          paidAmount: finalTendered,
          changeDue: finalChange,
          paymentMethod,
          paymentTerm,
          bankAccountId: (paymentMethod === 'Card' || paymentMethod === 'Bank Transfer') ? selectedBankId : null,
          linkedJobId: activeRecalledJob?.id,
          linkedJobNumber: activeRecalledJob?.jobNumber,
          notes: paymentTerm === 'Credit' ? `Credit terms invoice. Balance due: ${billCreditDue}` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process checkout transaction');
      }

      if (Array.isArray(data.items)) {
        setItemsCatalog(data.items);
      }

      // Deduct sold batches locally from localStorage registry
      try {
        const rawBatches = localStorage.getItem('raasith_inventory_batches');
        if (rawBatches) {
          const allBatches: ItemBatch[] = JSON.parse(rawBatches);
          const updatedBatches = allBatches.map((b) => {
            const billedItem = cartItems.find((ci) => ci.batchNumber === b.batchNumber);
            if (billedItem) {
              const newQty = Math.max(0, b.remainingQty - billedItem.qty);
              return {
                ...b,
                remainingQty: newQty,
                status: (newQty <= 0 ? 'Depleted' : 'Active') as 'Active' | 'Depleted',
              };
            }
            return b;
          });
          localStorage.setItem('raasith_inventory_batches', JSON.stringify(updatedBatches));
        }
      } catch (bErr) {
        console.warn('Local batch deduction note:', bErr);
      }

      const targetBank = bankAccounts.find((b) => b.id === selectedBankId);
      const resolvedBillNo = data.bill?.billNo || billNumber;

      const finalizedBill: PosBill = {
        id: resolvedBillNo,
        billNo: resolvedBillNo,
        date: billDate,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        items: cartItems,
        subtotal,
        discount: discountValue,
        returns: returnsAmount,
        netTotal: amountToCollect,
        paidAmount: finalTendered,
        balanceDue: billCreditDue,
        paymentMethod,
        paymentTerm,
        bankAccountId: selectedBankId || undefined,
        bankAccountName: targetBank ? `${targetBank.bankName} (${targetBank.accountName})` : undefined,
        advanceApplied: effectiveCustomerAdvanceApplied,
        creditDue: billCreditDue,
        customerOutstandingDue: data.totalCustomerDue || (customerCreditDue + billCreditDue),
        status: 'Completed',
        linkedJobId: activeRecalledJob?.id,
        linkedJobNumber: activeRecalledJob?.jobNumber,
        deviceInfo: activeRecalledJob ? `${activeRecalledJob.deviceBrand} ${activeRecalledJob.deviceModel}` : undefined,
        advancePaid: advancePaidFromJob,
        cashTendered: finalTendered,
        changeDue: finalChange,
      };

      const recalledJobToUpdate = activeRecalledJob;
      setIsCashModalOpen(false);

      // Trigger Print
      if (onPrintThermalBill) {
        onPrintThermalBill(finalizedBill);
      } else {
        setTimeout(() => {
          window.print();
        }, 100);
      }

      // Auto-update Job Status to "Delivered" upon full payment & trigger delivery flow & passport
      if (recalledJobToUpdate) {
        const isFullyPaid = billCreditDue === 0 || paymentTerm !== 'Credit';
        if (isFullyPaid) {
          if (onUpdateJobStatus) {
            onUpdateJobStatus(recalledJobToUpdate, 'Delivered').catch(() => {});
          } else {
            fetch(`/api/jobs/${recalledJobToUpdate.id}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ status: 'Delivered' }),
            }).catch(() => {});
          }
          if (onTriggerDeliveredPassport) {
            onTriggerDeliveredPassport(recalledJobToUpdate);
          }
          setPendingDeliveredJob(recalledJobToUpdate);
        }
      }

      const termMsg = paymentTerm === 'Credit' ? `Credit Term (Due: ${config.currency} ${billCreditDue.toLocaleString()})` : `Settled via ${paymentMethod}`;
      setPaymentSuccessNotice(
        `Invoice ${resolvedBillNo} completed! ${termMsg}. Stock deducted, customer ledger updated & posted to reports.`
      );

      // Advance to next bill
      const nextNum = parseInt(resolvedBillNo.replace('INV', ''), 10) + 1;
      const nextBill = `INV${String(nextNum).padStart(6, '0')}`;
      setBillNumber(nextBill);
      setCartItems([]);
      setActiveRecalledJob(null);
      if (onClearRecalledJob) onClearRecalledJob();
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setReturnsAmount(0);
      setOverallDiscountPercent(0);
      setPaymentTerm('Cash');
      setPaymentMethod('Cash');
      setApplyCustomerAdvance(false);
      setAppliedAdvanceAmount(0);
      setCustomerAdvanceBalance(0);
      setCustomerCreditDue(0);

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
    } catch (err: any) {
      setInputErrorNotice(err.message || 'Checkout failed');
    } finally {
      setProcessingCheckout(false);
    }
  };

  // 2B. DIRECT SETTLE, PRINT & AUTO-RESET WORKFLOW (F12 or Settle & Print button)
  const handleSettleAndPrint = async () => {
    if (cartItems.length === 0) {
      setInputErrorNotice('Cart is empty. Please scan or add an item first before settling.');
      return;
    }
    if (billLocked) {
      setInputErrorNotice('Bill is locked. Please unlock the bill before checkout.');
      return;
    }

    if (paymentTerm === 'Credit' && (!customerPhone || customerPhone === '0771234567')) {
      setInputErrorNotice('Customer phone number is required for Credit sales.');
      return;
    }

    setProcessingCheckout(true);
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const amountToCollect = toPayAmount;
      const finalTendered = amountToCollect;
      const finalChange = 0;
      const billCreditDue = paymentTerm === 'Credit' ? amountToCollect : 0;

      // Persist to backend
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          billNo: billNumber,
          date: billDate,
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || '',
          items: cartItems,
          subtotal: cartGrossTotal,
          discount: discountValue,
          returns: returnsAmount,
          netTotal: amountToCollect,
          paidAmount: finalTendered,
          balanceDue: billCreditDue,
          paymentMethod,
          paymentTerm,
          bankAccountId: selectedBankId || undefined,
          advanceApplied: effectiveCustomerAdvanceApplied,
          linkedJobId: activeRecalledJob?.id,
          linkedJobNumber: activeRecalledJob?.jobNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process POS checkout transaction');
      }

      const resolvedBillNo = data.bill?.billNo || billNumber;

      const finalizedBill: PosBill = {
        id: resolvedBillNo,
        billNo: resolvedBillNo,
        date: billDate,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        items: [...cartItems],
        subtotal: cartGrossTotal,
        discount: discountValue,
        returns: returnsAmount,
        netTotal: amountToCollect,
        paidAmount: finalTendered,
        balanceDue: billCreditDue,
        paymentMethod,
        paymentTerm,
        advanceApplied: effectiveCustomerAdvanceApplied,
        creditDue: billCreditDue,
        customerOutstandingDue: data.totalCustomerDue || (customerCreditDue + billCreditDue),
        status: 'Completed',
        linkedJobId: activeRecalledJob?.id,
        linkedJobNumber: activeRecalledJob?.jobNumber,
        deviceInfo: activeRecalledJob ? `${activeRecalledJob.deviceBrand} ${activeRecalledJob.deviceModel}` : undefined,
        advancePaid: advancePaidFromJob,
        cashTendered: finalTendered,
        changeDue: finalChange,
      };

      const recalledJobToUpdate = activeRecalledJob;
      setIsCashModalOpen(false);

      // 1. Trigger the invoice print action
      if (onPrintThermalBill) {
        onPrintThermalBill(finalizedBill);
      } else {
        setTimeout(() => {
          window.print();
        }, 80);
      }

      // 2. Automated Recalled Job Delivery & Phone Health Passport trigger
      if (recalledJobToUpdate) {
        const isFullyPaid = billCreditDue === 0 || paymentTerm !== 'Credit';
        if (isFullyPaid) {
          if (onUpdateJobStatus) {
            onUpdateJobStatus(recalledJobToUpdate, 'Delivered').catch(() => {});
          } else {
            fetch(`/api/jobs/${recalledJobToUpdate.id}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ status: 'Delivered' }),
            }).catch(() => {});
          }
          // Automatically trigger Phone Health Passport modal to send repair report to customer
          if (onTriggerDeliveredPassport) {
            onTriggerDeliveredPassport(recalledJobToUpdate);
          }
          setPendingDeliveredJob(recalledJobToUpdate);
        }
      }

      // 3. Automatically close/clear current invoice & initialize next invoice number
      const nextNum = parseInt(resolvedBillNo.replace('INV', ''), 10) + 1;
      const nextInvoiceNo = `INV${String(nextNum).padStart(6, '0')}`;
      setBillNumber(nextInvoiceNo);
      setCartItems([]);
      setActiveRecalledJob(null);
      if (onClearRecalledJob) onClearRecalledJob();
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setReturnsAmount(0);
      setOverallDiscountPercent(0);
      setPaymentTerm('Cash');
      setPaymentMethod('Cash');
      setApplyCustomerAdvance(false);
      setAppliedAdvanceAmount(0);
      setCustomerAdvanceBalance(0);
      setCustomerCreditDue(0);

      setPaymentSuccessNotice(
        `✓ Invoice ${finalizedBill.billNo} Settled & Printed! Generated next invoice ${nextInvoiceNo}. Screen reset for next transaction.`
      );

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setInputErrorNotice(err.message || 'Settlement failed');
    } finally {
      setProcessingCheckout(false);
    }
  };

  // Keyboard shortcut listener for F1, F2, F3, Alt+C, Alt+R, and F12 (Settle & Print)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept function keys if user is actively editing an input with specific intent unless standard function keys
      if (e.key === 'F1') {
        e.preventDefault();
        setPaymentMethod('Cash');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setPaymentMethod('Card');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setPaymentMethod('Bank Transfer');
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setPaymentTerm('Cash');
      } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setPaymentTerm('Credit');
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleSettleAndPrint();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    cartItems,
    billNumber,
    billDate,
    customerName,
    customerPhone,
    toPayAmount,
    cartGrossTotal,
    discountValue,
    returnsAmount,
    paymentTerm,
    paymentMethod,
    selectedBankId,
    effectiveCustomerAdvanceApplied,
    activeRecalledJob,
    advancePaidFromJob,
    customerCreditDue,
    billLocked,
  ]);

  // 3. JOB ORDER RECALL INTEGRATION
  const handleRecallJob = (job: RepairJob) => {
    if (isJobDelivered(job)) {
      setShowJobRecallModal(false);
      setRecallBlockedModal({
        isOpen: true,
        job,
        message: "This job order has already been Delivered and completed. Delivered jobs cannot be recalled into the POS bill.",
      });
      return;
    }

    if (!isJobReadyForRecall(job)) {
      setShowJobRecallModal(false);
      setRecallBlockedModal({
        isOpen: true,
        job,
        message: "It's not ready to pick up. Make it ready to pick up, then you can recall.",
      });
      return;
    }

    setActiveRecalledJob(job);
    setCustomerName(job.customerName);
    setCustomerPhone(job.phoneNumber);

    const issues = Array.isArray(job.problems) ? job.problems.join(', ') : job.problems;
    const newItems: PosBillItem[] = [];

    // Service labor item
    newItems.push({
      id: `JOB-SRV-${job.id}`,
      code: `SRV-${job.jobNumber}`,
      name: `Repair Labor / Service: ${job.deviceBrand} ${job.deviceModel} (${issues || 'Hardware Service'})`,
      qty: 1,
      price: job.estimatedPrice,
      discount: 0,
      total: job.estimatedPrice,
      isFromJob: true,
    });

    // Pre-fitted components / spare parts
    if (job.spareParts) {
      try {
        const parsed = JSON.parse(job.spareParts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((part: any, idx: number) => {
            newItems.push({
              id: `JOB-PART-${job.id}-${idx}`,
              code: `PART-${part.id || idx + 1}`,
              name: `Pre-Fitted: ${part.name}`,
              qty: part.qty || 1,
              price: part.cost || 0,
              discount: 0,
              total: (part.cost || 0) * (part.qty || 1),
              isFromJob: true,
            });
          });
        }
      } catch (err) {
        console.warn('Could not parse job.spareParts:', err);
      }
    } else if (job.sparePartsAmount && job.sparePartsAmount > 0) {
      newItems.push({
        id: `JOB-PARTS-${job.id}`,
        code: 'SPARE-PARTS',
        name: 'Fitted Hardware Components & Modules',
        qty: 1,
        price: job.sparePartsAmount,
        discount: 0,
        total: job.sparePartsAmount,
        isFromJob: true,
      });
    }

    // Merge with any existing accessories or keep job lines
    setCartItems(newItems);
    setShowJobRecallModal(false);
    setPaymentSuccessNotice(`Recalled Repair Job ${job.jobNumber} (${job.deviceBrand} ${job.deviceModel}) into POS!`);

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleUnlinkJob = () => {
    setActiveRecalledJob(null);
    if (onClearRecalledJob) onClearRecalledJob();
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    // Remove job-specific items
    setCartItems((prev) => prev.filter((i) => !i.isFromJob));
  };

  const handleCreateNewBill = async () => {
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/pos/next-bill-number', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nextBillNo) {
          setBillNumber(data.nextBillNo);
        }
      }
    } catch {
      const nextNum = parseInt(billNumber.replace('INV', ''), 10) + 1;
      setBillNumber(`INV${String(nextNum).padStart(6, '0')}`);
    }
    setBillDate(new Date().toISOString().split('T')[0]);
    setCartItems([]);
    setActiveRecalledJob(null);
    if (onClearRecalledJob) onClearRecalledJob();
    setReturnsAmount(0);
    setOverallDiscountPercent(0);
    setBillLocked(false);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setPaymentSuccessNotice(null);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const handleClearBill = () => {
    setCartItems([]);
    setActiveRecalledJob(null);
    if (onClearRecalledJob) onClearRecalledJob();
    setReturnsAmount(0);
    setOverallDiscountPercent(0);
    setBillLocked(false);
    setPaymentTerm('Cash');
    setPaymentMethod('Cash');
    setApplyCustomerAdvance(false);
    setAppliedAdvanceAmount(0);
    setCustomerAdvanceBalance(0);
    setCustomerCreditDue(0);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setItemQuery('');
    setSelectedItemToAdd(null);
    setInputQty(1);
    setInputDiscount(0);
    setInputErrorNotice(null);
    setPaymentSuccessNotice('Active billing session reset safely. Inventory locks restored.');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Fetch locked invoices count and records
  const fetchLockedInvoices = async () => {
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/pos/bills/status/locked', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLockedInvoicesList(data || []);
        setLockedInvoicesCount((data || []).length);
      }
    } catch (e) {
      console.warn('Could not load locked invoices:', e);
    }
  };

  useEffect(() => {
    fetchLockedInvoices();
  }, [token]);

  // 1. INVOICE LOCKING FEATURE: Locks active bill, closes it, and automatically opens clean new bill
  const handleLockActiveInvoice = async () => {
    if (cartItems.length === 0 && !activeRecalledJob) {
      setInputErrorNotice('Cannot lock an empty invoice. Please scan/add items or recall a job first.');
      return;
    }

    setLockingInvoice(true);
    setInputErrorNotice(null);
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch('/api/pos/bills/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          billNo: billNumber,
          date: billDate,
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || '',
          items: cartItems,
          subtotal: cartGrossTotal,
          discount: discountValue,
          returns: returnsAmount,
          advancePaid: advancePaidFromJob,
          advanceApplied: totalCustomerAdvanceDeposit,
          netTotal: toPayAmount,
          paidAmount: 0,
          changeDue: 0,
          paymentMethod,
          paymentTerm,
          bankAccountId: selectedBankId,
          linkedJobId: activeRecalledJob?.id || null,
          linkedJobNumber: activeRecalledJob?.jobNumber || null,
          notes: activeRecalledJob ? `Locked Job #${activeRecalledJob.jobNumber} invoice` : 'Parked / Locked counter bill',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to lock invoice');
      }

      const lockedBillNo = billNumber;

      // Close current invoice & automatically open a clean New Invoice for the next transaction
      const nextNum = parseInt(billNumber.replace('INV', ''), 10) + 1;
      const nextInvoiceNo = `INV${String(nextNum).padStart(6, '0')}`;
      setBillNumber(nextInvoiceNo);
      setCartItems([]);
      setActiveRecalledJob(null);
      if (onClearRecalledJob) onClearRecalledJob();
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setReturnsAmount(0);
      setOverallDiscountPercent(0);
      setBillLocked(false);
      setPaymentTerm('Cash');
      setPaymentMethod('Cash');
      setApplyCustomerAdvance(false);
      setAppliedAdvanceAmount(0);
      setCustomerAdvanceBalance(0);
      setCustomerCreditDue(0);

      setPaymentSuccessNotice(
        `🔒 Invoice ${lockedBillNo} Locked & Closed. New invoice ${nextInvoiceNo} initialized for next transaction.`
      );
      fetchLockedInvoices();
      setTimeout(() => barcodeInputRef.current?.focus(), 50);
    } catch (err: any) {
      setInputErrorNotice(err.message || 'Failed to lock invoice');
    } finally {
      setLockingInvoice(false);
    }
  };

  // 2. INVOICE SEARCH FEATURE (VIEW-ONLY MODE)
  const handleSearchInvoice = async (invoiceQueryToSearch?: string) => {
    const q = (invoiceQueryToSearch ?? quickBillSearch).trim();
    if (!q) {
      setInputErrorNotice('Please enter an Invoice Number to search (e.g. INV000008).');
      return;
    }

    setSearchingInvoice(true);
    setInputErrorNotice(null);
    try {
      const cleanBillNo = q.toUpperCase().startsWith('INV')
        ? q.toUpperCase()
        : !isNaN(Number(q))
        ? `INV${String(Number(q)).padStart(6, '0')}`
        : q.toUpperCase();

      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch(`/api/pos/bills/${cleanBillNo}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (!res.ok) {
        // Fallback search in bills search endpoint
        const searchRes = await fetch(`/api/pos/bills/search?q=${encodeURIComponent(q)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (searchRes.ok) {
          const list = await searchRes.json();
          if (list && list.length > 0) {
            setViewOnlyInvoiceData(list[0]);
            setShowViewOnlyModal(true);
            return;
          }
        }
        throw new Error(`Invoice "${cleanBillNo}" not found.`);
      }

      const billData = await res.json();
      setViewOnlyInvoiceData(billData);
      setShowViewOnlyModal(true);
    } catch (err: any) {
      setInputErrorNotice(err.message || 'Invoice search failed');
    } finally {
      setSearchingInvoice(false);
    }
  };

  // Unlock and resume a locked invoice into the POS screen
  const handleUnlockAndResumeInvoice = async (invoiceToResume: PosBill) => {
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch(`/api/pos/bills/${invoiceToResume.billNo}/unlock`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resume locked invoice');

      // Populate into active POS terminal
      setBillNumber(invoiceToResume.billNo);
      setBillDate(invoiceToResume.date || new Date().toISOString().split('T')[0]);
      setCustomerName(invoiceToResume.customerName || 'Walk-in Customer');
      setCustomerPhone(invoiceToResume.customerPhone || '');
      setPaymentMethod(
        invoiceToResume.paymentMethod === 'Card' || invoiceToResume.paymentMethod === 'Bank Transfer'
          ? invoiceToResume.paymentMethod
          : 'Cash'
      );
      setPaymentTerm(invoiceToResume.paymentTerm === 'Credit' ? 'Credit' : 'Cash');
      setReturnsAmount(invoiceToResume.returns || 0);
      setBillLocked(false);
      setShowViewOnlyModal(false);
      setShowLockedInvoicesModal(false);

      if (invoiceToResume.linkedJobId && jobs.length > 0) {
        const matchingJob = jobs.find((j) => j.id === invoiceToResume.linkedJobId);
        if (matchingJob) {
          setActiveRecalledJob(matchingJob);
        }
      }

      setPaymentSuccessNotice(
        `Invoice ${invoiceToResume.billNo} unlocked & loaded into POS screen. Ready to settle.`
      );
      fetchLockedInvoices();
    } catch (err: any) {
      setInputErrorNotice(err.message || 'Failed to resume invoice');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070e24] text-[#f8fafc] overflow-hidden select-none">
      {/* 1. TOP HEADER & THREE-CARD TOTALS */}
      <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        {/* Left: Clean SALES Title + Bill Number Badge */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <h2 className="font-oswald text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
              SALES
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600/30 text-cyan-300 border border-blue-500/40 px-3 py-1 rounded-lg font-mono-jb text-sm font-bold shadow-xs">
                {billNumber}
              </span>
              {activeRecalledJob && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-mono-jb text-xs font-bold flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>JOB #{activeRecalledJob.jobNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Three-Card Breakdown: Grand Total - Advance - To Pay (Expanded Spacing & Typographic Scale) */}
        <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto py-1">
          {/* 1. Gross / Grand Total Card (Bright Red color) */}
          <div className="bg-[#24080c] border-2 border-red-500/80 rounded-2xl px-5 py-2.5 sm:px-6 sm:py-3.5 flex flex-col items-end min-w-[170px] sm:min-w-[205px] xl:min-w-[230px] shadow-xl shadow-red-950/70 justify-center">
            <span className="text-xs sm:text-sm font-mono-jb uppercase text-red-300 font-black tracking-wider">
              GROSS TOTAL
            </span>
            <div className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono-jb text-red-500 drop-shadow-[0_0_14px_rgba(239,68,68,0.75)] my-0.5 tracking-tight leading-tight">
              {config.currency} {cartGrossTotal.toLocaleString()}
            </div>
            <span className="text-[10px] sm:text-xs font-mono-jb text-red-400/90 font-bold tracking-tight">
              Grand Total
            </span>
          </div>

          {/* 2. Advance Payment Card (Radiant Green color - ALWAYS DISPLAYED) */}
          <div className="bg-[#052317] border-2 border-emerald-500/80 rounded-2xl px-5 py-2.5 sm:px-6 sm:py-3.5 flex flex-col items-end min-w-[170px] sm:min-w-[205px] xl:min-w-[230px] shadow-xl shadow-emerald-950/70 justify-center">
            <span className="text-xs sm:text-sm font-mono-jb uppercase text-emerald-300 font-black tracking-wider">
              ADVANCE PAYMENT
            </span>
            <div className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono-jb text-emerald-400 drop-shadow-[0_0_14px_rgba(16,185,129,0.75)] my-0.5 tracking-tight leading-tight">
              {totalCustomerAdvanceDeposit > 0
                ? `-${config.currency} ${totalCustomerAdvanceDeposit.toLocaleString()}`
                : `${config.currency} 0`}
            </div>
            <span className="text-[10px] sm:text-xs font-mono-jb text-emerald-300/90 font-bold tracking-tight">
              {totalCustomerAdvanceDeposit > 0 ? 'Advance Applied' : 'No Advance'}
            </span>
          </div>

          {/* 3. TO PAY Card (Yellow color) */}
          <div className="bg-[#282103] border-2 border-yellow-400/90 rounded-2xl px-5 py-2.5 sm:px-6 sm:py-3.5 flex flex-col items-end min-w-[170px] sm:min-w-[205px] xl:min-w-[230px] shadow-xl shadow-yellow-950/80 justify-center">
            <span className="text-xs sm:text-sm font-mono-jb uppercase font-black tracking-wider text-yellow-300">
              TO PAY
            </span>
            <div className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono-jb text-yellow-400 drop-shadow-[0_0_18px_rgba(250,204,21,0.85)] my-0.5 tracking-tight leading-tight">
              {config.currency} {toPayAmount.toLocaleString()}
            </div>
            <span className="text-[10px] sm:text-xs font-mono-jb text-yellow-200 font-bold tracking-tight">
              Gross - Advance - Disc
            </span>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL NEW BILL & CUSTOMER DETAILS BAR */}
      <div className="bg-[#09153a] border-b border-[rgba(96,165,250,0.25)] px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
        {/* Left: New Bill & Recall Job & Lock Bill & Invoice Search */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCreateNewBill}
            className="py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white rounded-xl font-oswald text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setShowJobRecallModal(true)}
            title="Recall Repair Job Order data into POS bill"
            className={`py-2 px-3 border rounded-xl font-oswald text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeRecalledJob
                ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                : 'bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/40 text-amber-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{activeRecalledJob ? `Job #${activeRecalledJob.jobNumber}` : 'Recall Job'}</span>
          </button>

          {/* 1. LOCK INVOICE FEATURE: Locks current bill, closes it, and automatically opens clean new bill */}
          <button
            type="button"
            onClick={handleLockActiveInvoice}
            disabled={lockingInvoice}
            title="Lock Current Invoice (Closes bill and opens clean new invoice)"
            className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 active:scale-95 rounded-xl font-oswald text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {lockingInvoice ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Lock Bill</span>
          </button>

          {/* Locked Invoices counter indicator & drawer toggle */}
          {lockedInvoicesCount > 0 && (
            <button
              type="button"
              onClick={() => setShowLockedInvoicesModal(true)}
              title="View all parked and locked invoices"
              className="py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 rounded-xl text-[11px] font-mono-jb font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-pulse"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Locked ({lockedInvoicesCount})</span>
            </button>
          )}

          {/* 2. INVOICE SEARCH BAR RIGHT NEXT TO LOCK BUTTON */}
          {/* 2. INSTANT SEARCH INVOICE (VIEW-ONLY AUDIT MODE) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchInvoice();
            }}
            className="flex items-center gap-1.5 bg-white border-2 border-slate-300 hover:border-blue-400 focus-within:border-blue-600 rounded-xl px-2.5 py-1 transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={quickBillSearch}
              onChange={(e) => setQuickBillSearch(e.target.value)}
              placeholder="Search Inv (e.g. INV000008)..."
              className="bg-white text-xs font-bold text-black placeholder:text-slate-500 outline-none w-36 sm:w-44"
            />
            <button
              type="submit"
              disabled={searchingInvoice}
              title="Search Invoice in View-Only Mode"
              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase rounded-lg border border-blue-600 transition-colors cursor-pointer"
            >
              {searchingInvoice ? <Loader2 className="w-3 h-3 animate-spin" /> : 'View'}
            </button>
          </form>
        </div>

        {/* Center / Right: Customer Details (+ Add Cust Quick Button) & Parameters Horizontal Inputs */}
        <div className="flex items-center flex-wrap gap-2.5 flex-1 max-w-4xl justify-end">
          {/* 3. QUICK ADD CUSTOMER BUTTON (+ Add Cust) RIGHT BESIDE CUSTOMER DETAILS */}
          <button
            type="button"
            onClick={() => setShowQuickAddCustomerModal(true)}
            title="Quick Register New Customer and Select for Current Bill"
            className="py-1.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-oswald font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Cust</span>
          </button>

          {/* Searchable Customer Dropdown Container */}
          <div ref={customerDropdownRef} className="relative flex items-center gap-1.5 flex-1 min-w-[320px]">
            {/* Customer Name Input */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-slate-300 focus-within:border-blue-600 rounded-xl px-2.5 py-1.5 min-w-[160px] flex-1 shadow-xs">
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[10px] text-slate-600 uppercase font-bold shrink-0">Cust:</span>
              <input
                type="text"
                value={customerName}
                onFocus={() => {
                  setCustomerSearchQuery(customerName === 'Walk-in Customer' ? '' : customerName);
                  setIsCustomerSearchOpen(true);
                }}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerSearchOpen(true);
                }}
                placeholder="Search name or mobile..."
                className="w-full bg-white text-xs font-bold text-black outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Customer Mobile Number Input */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-slate-300 focus-within:border-blue-600 rounded-xl px-2.5 py-1.5 min-w-[140px] shadow-xs">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[10px] text-slate-600 uppercase font-bold shrink-0">Mob:</span>
              <input
                type="text"
                value={customerPhone}
                onFocus={() => {
                  setCustomerSearchQuery(customerPhone);
                  setIsCustomerSearchOpen(true);
                }}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerSearchOpen(true);
                }}
                placeholder="077xxxxxxx"
                className="w-full bg-white text-xs text-black outline-none placeholder:text-slate-500 font-bold"
              />
            </div>

            {/* Quick Reset to Walk-in */}
            {customerName !== 'Walk-in Customer' && (
              <button
                type="button"
                onClick={() => {
                  setCustomerName('Walk-in Customer');
                  setCustomerPhone('');
                  setCustomerCreditDue(0);
                  setCustomerAdvanceBalance(0);
                  setCustomerProfile(null);
                  setApplyCustomerAdvance(false);
                }}
                className="text-[10px] text-blue-300/60 hover:text-white px-1.5 py-1 bg-blue-600/10 rounded-lg shrink-0 cursor-pointer"
                title="Reset to Walk-in Customer"
              >
                &times; Walk-in
              </button>
            )}

            {/* Live Customer Due Indicator */}
            {customerCreditDue > 0 && (
              <div className="bg-rose-500/20 border border-rose-500/40 px-2 py-1 rounded-xl text-rose-300 text-[10px] font-bold flex items-center gap-1 shrink-0 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Due: {config.currency} {customerCreditDue.toLocaleString()}</span>
              </div>
            )}

            {/* Interactive Search Dropdown Popover */}
            {isCustomerSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#081335] border-2 border-cyan-500/50 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-blue-500/15 max-h-72 overflow-y-auto font-mono-jb">
                <div className="p-2 bg-[#0a1844] text-[10px] font-bold text-cyan-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3 text-cyan-400" />
                    <span>Search by Mobile No or Name ({matchingCustomers.length} results)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomerSearchOpen(false)}
                    className="text-blue-300/60 hover:text-white"
                  >
                    &times;
                  </button>
                </div>

                {matchingCustomers.length === 0 ? (
                  <div className="p-3 text-center text-xs space-y-2">
                    <p className="text-blue-200/50">No customer matching &quot;{customerSearchQuery}&quot;</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerSearchOpen(false);
                        setShowQuickAddCustomerModal(true);
                      }}
                      className="px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-400/40 rounded-lg text-cyan-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Register as New Customer</span>
                    </button>
                  </div>
                ) : (
                  matchingCustomers.map((cust) => {
                    const hasDue = Number(cust.creditDue) > 0;
                    const hasAdv = Number(cust.advanceBalance) > 0;
                    return (
                      <div
                        key={cust.id}
                        onClick={() => selectCustomerFromDropdown(cust)}
                        className="p-2.5 hover:bg-blue-600/20 cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                            <User className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{cust.customerName}</span>
                          </div>
                          <div className="text-[11px] text-cyan-300/90 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-blue-400 shrink-0" />
                            <span>{cust.phoneNumber}</span>
                            {cust.address && <span className="text-[10px] text-blue-300/50 truncate">&bull; {cust.address}</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5">
                          {hasDue && (
                            <div className="text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded">
                              Due: {config.currency} {Number(cust.creditDue).toLocaleString()}
                            </div>
                          )}
                          {hasAdv && (
                            <div className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                              Adv: {config.currency} {Number(cust.advanceBalance).toLocaleString()}
                            </div>
                          )}
                          {!hasDue && !hasAdv && (
                            <span className="text-[9px] text-blue-300/50">Clean Account</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Bill Date */}
          <div className="flex items-center gap-1.5 bg-[#060e28] border border-blue-500/30 rounded-xl px-2.5 py-1.5 text-xs font-mono-jb text-blue-200/80 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{billDate}</span>
          </div>

          {/* Discount % */}
          <div className="flex items-center gap-1.5 bg-[#060e28] border border-blue-500/30 rounded-xl px-2 py-1 text-xs font-mono-jb shrink-0">
            <span className="text-[10px] text-amber-300 font-bold uppercase">Disc%:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={overallDiscountPercent || ''}
              onChange={(e) =>
                setOverallDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))
              }
              placeholder="0"
              className="w-10 bg-[#0c1c45] border border-blue-500/30 px-1 py-0.5 rounded text-center text-xs font-bold text-amber-400 outline-none"
            />
          </div>

          {/* Customer Advance Balance if available */}
          {customerAdvanceBalance > 0 && (
            <button
              type="button"
              onClick={() => setApplyCustomerAdvance(!applyCustomerAdvance)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-jb font-bold flex items-center gap-1 transition-all cursor-pointer ${
                applyCustomerAdvance
                  ? 'bg-cyan-500 text-black shadow-xs font-black'
                  : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Adv: {config.currency} {customerAdvanceBalance.toLocaleString()} {applyCustomerAdvance ? '✓' : '+'}</span>
            </button>
          )}

          {/* Unpaid Credit Warning if due */}
          {customerCreditDue > 0 && (
            <div className="px-2.5 py-1 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[11px] font-mono-jb flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Due: {config.currency} {customerCreditDue.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* SUCCESS OR INPUT NOTICE BANNER */}
      {paymentSuccessNotice && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2 flex items-center justify-between text-emerald-300 text-xs font-mono-jb animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{paymentSuccessNotice}</span>
          </div>
          <button onClick={() => setPaymentSuccessNotice(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {inputErrorNotice && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-6 py-2 flex items-center justify-between text-rose-300 text-xs font-mono-jb animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{inputErrorNotice}</span>
          </div>
          <button onClick={() => setInputErrorNotice(null)} className="text-rose-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* 2. MAIN LAYOUT SPLIT: LEFT PANEL (EXPANDED BILLING WORKSPACE) & RIGHT PANEL (CUSTOMER & PAYMENT SIDEBAR) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT PANEL: PRIMARY BILLING WORKSPACE (High-Density Multi-Column Table & Scan Bar) */}
        {/* ========================================================================= */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#070e24] overflow-hidden">
          {/* Top Barcode / Item Scanning & Quick Actions Toolbar */}
          <div className="bg-[#091438] border-b border-[rgba(96,165,250,0.2)] p-2.5 sm:p-3 shrink-0 flex flex-col sm:flex-row items-center gap-2.5 shadow-md">
            {/* Item Scan Indicator */}
            <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 bg-[#060e28] border border-blue-500/30 rounded-xl text-xs font-mono-jb text-cyan-300 font-bold">
              <Barcode className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">ITEM SCAN</span>
            </div>

            {/* High-Speed Barcode & Item Search Input with Qty & Discount */}
            <div className="flex-1 w-full flex items-center gap-2 relative">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={itemQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemQuery(val);
                    setInputErrorNotice(null);

                    // Hands-Free Barcode Scanning: Auto-Add on Scan
                    // When scanner reads code, if exact match is found, append immediately!
                    if (val.trim().length >= 3) {
                      const exact = itemsCatalog.find(
                        (i) => i.barcode === val.trim() || i.code.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (exact) {
                        handleAddItem(exact, 1);
                        setItemQuery('');
                        setSelectedItemToAdd(null);
                        setPaymentSuccessNotice(`Auto-Added: ${exact.name} (${config.currency} ${exact.sellingPrice.toLocaleString()})`);
                        setTimeout(() => {
                          barcodeInputRef.current?.focus();
                        }, 20);
                      }
                    }
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Scan barcode or type code/name... (Auto-adds on scan)"
                  className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                />

                {/* Auto-complete dropdown for item search */}
                {itemQuery.trim() && (
                  <div
                    ref={searchDropdownRef}
                    className="absolute left-0 top-full mt-1.5 w-full bg-[#08102a] border border-cyan-400/50 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto divide-y divide-blue-500/15 scrollbar-thin"
                  >
                    {filteredCatalog.length > 0 ? (
                      filteredCatalog.map((item, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                          <button
                            key={item.id}
                            ref={(el) => {
                              searchItemRefs.current[idx] = el;
                            }}
                            type="button"
                            onMouseEnter={() => setSelectedIndex(idx)}
                            onClick={() => {
                              handleAddItem(item, inputQty);
                              setItemQuery('');
                              setSelectedIndex(-1);
                              setSelectedItemToAdd(null);
                              setPaymentSuccessNotice(`Added: ${item.name}`);
                              setTimeout(() => {
                                barcodeInputRef.current?.focus();
                              }, 30);
                            }}
                            className={`w-full text-left p-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/40 border-l-4 border-cyan-400 pl-3'
                                : 'hover:bg-blue-600/25'
                            }`}
                          >
                            <div>
                              <div
                                className={`text-xs sm:text-sm font-bold leading-snug ${
                                  isSelected ? 'text-cyan-300 font-extrabold' : 'text-white'
                                }`}
                              >
                                {item.name}
                              </div>
                              <div className="text-[10px] font-mono-jb text-blue-300/70">
                                Code: {item.code} &bull; Barcode: {item.barcode}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-emerald-400">
                                {config.currency} {item.sellingPrice.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-blue-200/50">Stock: {item.qty}</div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs font-mono-jb text-blue-300/70">
                        No items matching "{itemQuery.trim()}". Press{' '}
                        <kbd className="px-1.5 py-0.5 bg-blue-950 border border-blue-500/40 rounded text-cyan-300 font-bold">
                          Enter
                        </kbd>{' '}
                        to add on-the-fly.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity input */}
              <div className="w-28 flex items-center bg-[#060d26] border border-blue-500/30 rounded-xl overflow-hidden focus-within:border-cyan-400 shrink-0">
                <button
                  type="button"
                  onClick={() => setInputQty((q) => Math.max(1, q - 1))}
                  className="px-2 py-1.5 text-blue-300 hover:bg-blue-600/20 font-bold cursor-pointer text-xs"
                >
                  -
                </button>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="1"
                  value={inputQty}
                  onChange={(e) => setInputQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  onKeyDown={handleQtyKeyDown}
                  className="w-full bg-transparent text-center font-mono-jb text-xs font-bold text-white outline-none"
                  placeholder="Qty"
                />
                <button
                  type="button"
                  onClick={() => setInputQty((q) => q + 1)}
                  className="px-2 py-1.5 text-blue-300 hover:bg-blue-600/20 font-bold cursor-pointer text-xs"
                >
                  +
                </button>
              </div>

              {/* Line Discount input */}
              <div className="w-24 shrink-0 hidden sm:block">
                <input
                  type="number"
                  min="0"
                  value={inputDiscount || ''}
                  onChange={(e) => setInputDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="Disc"
                  className="w-full px-2 py-2 bg-[#060d26] border border-blue-500/25 rounded-xl text-xs font-mono-jb text-white outline-none focus:border-blue-400 text-center"
                />
              </div>

              {/* Add New Item Button (Replaced old + Add button) */}
              <button
                type="button"
                onClick={() => {
                  if (selectedItemToAdd) {
                    handleAddItem(selectedItemToAdd, inputQty);
                    setSelectedItemToAdd(null);
                    setItemQuery('');
                    barcodeInputRef.current?.focus();
                  } else if (itemQuery.trim()) {
                    const match = itemsCatalog.find(
                      (i) =>
                        i.code.toLowerCase() === itemQuery.trim().toLowerCase() ||
                        i.barcode === itemQuery.trim()
                    ) || (filteredCatalog.length > 0 ? filteredCatalog[0] : null);
                    if (match) {
                      handleAddItem(match, inputQty);
                      setSelectedItemToAdd(null);
                      setItemQuery('');
                      barcodeInputRef.current?.focus();
                    } else {
                      // Scanned item not in system -> open inventory card/modal to immediately add new product!
                      handleOpenAddNewItemModal(itemQuery.trim());
                    }
                  } else {
                    handleOpenAddNewItemModal('');
                  }
                }}
                className="py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-mono-jb font-bold shrink-0 transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Add scanned item or register new inventory product"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Item</span>
              </button>
            </div>
          </div>

          {/* EXCEL-STYLE SPREADSHEET BILLING ITEM GRID (Full width & height of workspace) */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-slate-300 shadow-sm">
            <table
              className="w-full border-collapse border border-slate-300 bg-white font-pos-table text-black font-bold"
              style={{ fontFamily: "'Century Gothic', 'Calisto MT', 'CenturyGothic', AppleGothic, sans-serif" }}
            >
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr className="bg-[#e8eaed] text-black uppercase text-xs sm:text-sm font-bold tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12 font-bold border border-slate-300">#</th>
                  <th className="py-2.5 px-3 text-left font-bold border border-slate-300">ITEM DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-center w-28 font-bold border border-slate-300">QUANTITY</th>
                  <th className="py-2.5 px-3 text-right w-32 font-bold border border-slate-300">RATE ({config.currency})</th>
                  <th className="py-2.5 px-3 text-right w-28 font-bold border border-slate-300">DISCOUNT</th>
                  <th className="py-2.5 px-3 text-right w-32 font-bold border border-slate-300">SUBTOTAL</th>
                  <th className="py-2.5 px-3 text-center w-14 no-print font-bold border border-slate-300">ACTION</th>
                </tr>
              </thead>
              <tbody className="bg-white text-black font-bold">
                {cartItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center bg-white border border-slate-300">
                      <Barcode className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-60" />
                      <p className="text-base font-bold text-black uppercase tracking-wider">
                        Invoice is currently empty
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1 max-w-sm mx-auto">
                        Scan item barcode with barcode reader, type SKU/name, or click &quot;Add New Item&quot; to begin billing.
                      </p>
                    </td>
                  </tr>
                ) : (
                  cartItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`bg-white hover:bg-[#f8fafc] transition-colors text-black font-bold ${
                        item.isFromJob ? 'bg-amber-50/70 border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-3 px-3 text-center text-black text-sm sm:text-base font-bold border border-slate-300">
                        {idx + 1}
                      </td>

                      {/* Primary Item Description Only (SKU code removed for clean horizontal space) */}
                      <td className="py-3 px-3 border border-slate-300">
                        <div className="text-base sm:text-lg font-bold text-black tracking-tight leading-snug flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.isFromJob && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-sm text-xs font-bold uppercase tracking-wide">
                              Repair Service
                            </span>
                          )}
                        </div>
                        {item.batchNumber && (
                          <div className="text-xs text-black font-bold mt-1 flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-sm text-xs font-bold flex items-center gap-1.5">
                              <span>Batch: {item.batchNumber}</span>
                              {item.batchPurchaseDate && (
                                <span className="text-emerald-800 font-bold">({item.batchPurchaseDate})</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const catalogItem = itemsCatalog.find((ci) => ci.code === item.code);
                                  const batches = getBatchesForItem(item.code);
                                  if (catalogItem && batches.length > 0) {
                                    setBatchModalState({
                                      isOpen: true,
                                      item: catalogItem,
                                      qty: item.qty,
                                      batches,
                                    });
                                  }
                                }}
                                className="underline hover:text-black cursor-pointer ml-1 text-xs font-bold text-cyan-800"
                                title="Switch Batch"
                              >
                                Change
                              </button>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Manual Keyboard Entry Quantity Input Box (No +/- buttons) */}
                      <td className="py-2.5 px-3 text-center border border-slate-300">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                handleUpdateItemQty(item.id, 0);
                              } else {
                                const val = parseInt(raw, 10);
                                if (!isNaN(val)) {
                                  handleUpdateItemQty(item.id, Math.max(1, val));
                                }
                              }
                            }}
                            onBlur={() => {
                              if (!item.qty || item.qty < 1) {
                                handleUpdateItemQty(item.id, 1);
                              }
                            }}
                            className="w-20 sm:w-24 text-center py-1.5 px-2 bg-white text-black font-bold text-base sm:text-lg border-2 border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-sm shadow-xs"
                          />
                        </div>
                      </td>

                      {/* Unit Price / Rate */}
                      <td className="py-2.5 px-3 text-right text-black font-bold text-base sm:text-lg tabular-nums border border-slate-300">
                        {item.price.toLocaleString()}
                      </td>

                      {/* Discount */}
                      <td className="py-2.5 px-3 text-right text-rose-700 font-bold text-sm sm:text-base tabular-nums border border-slate-300">
                        {item.discount > 0 ? `-${item.discount.toLocaleString()}` : '-'}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right text-black font-bold text-base sm:text-lg tabular-nums border border-slate-300 bg-slate-50/50">
                        {item.total.toLocaleString()}
                      </td>

                      {/* Delete Action Button */}
                      <td className="py-2.5 px-3 text-center no-print border border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Delete item from invoice"
                          className="p-1.5 rounded-sm text-rose-600 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Excel-Style Table Bottom Status / Count Bar */}
          <div
            className="bg-[#f1f3f4] border-t-2 border-slate-300 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-black font-bold shrink-0 font-pos-table"
            style={{ fontFamily: "'Century Gothic', 'Calisto MT', 'CenturyGothic', AppleGothic, sans-serif" }}
          >
            <div className="flex items-center gap-4">
              <span>
                Items: <strong className="text-black font-bold text-sm sm:text-base">{cartItems.length}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span>
                Total Qty:{' '}
                <strong className="text-black font-bold text-sm sm:text-base">
                  {cartItems.reduce((acc, i) => acc + i.qty, 0)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <span>[Enter] on empty search triggers Cash Checkout</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: CUSTOMER DETAILS, PAYMENT SUMMARY & CHECKOUT ACTIONS */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#091333] border-t lg:border-t-0 lg:border-l border-[rgba(96,165,250,0.2)] flex flex-col h-full overflow-y-auto p-3.5 sm:p-4 gap-3 shadow-2xl shrink-0">
          {/* Linked Repair Job Banner (if active) */}
          {activeRecalledJob && (
            <div className="bg-gradient-to-r from-amber-950/60 via-[#1c190c] to-[#0a1538] border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 shrink-0 animate-fadeIn shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono-jb font-black text-amber-300 truncate">
                      Job #{activeRecalledJob.jobNumber}
                    </span>
                    <span className="text-[9px] font-mono-jb px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 truncate">
                      {activeRecalledJob.deviceBrand} {activeRecalledJob.deviceModel}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono-jb text-blue-200/80 truncate">
                    Advance: <strong className="text-amber-400 font-bold">{config.currency} {advancePaidFromJob.toLocaleString()}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUnlinkJob}
                className="px-2 py-1 text-[10px] font-mono-jb text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Unlink
              </button>
            </div>
          )}

          {/* Settlement Channels & Mode Selection */}
          <div className="bg-[#0c183d] rounded-2xl p-3 border border-blue-500/25 space-y-3 shadow-md shrink-0">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
              <span className="text-[11px] font-mono-jb uppercase text-cyan-300 font-bold flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                <span>Payment Mode</span>
              </span>
              <span className="text-[10px] font-mono-jb text-yellow-300 font-bold">
                {paymentTerm} Terms
              </span>
            </div>

            {/* Terms Toggle: Uniform Symmetrical 2-Column Grid with Legible Teal/Cyan */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentTerm('Cash')}
                title="Switch to Cash Settlement (Alt+C)"
                className={`h-12 px-3 rounded-xl text-xs font-mono-jb font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                  paymentTerm === 'Cash'
                    ? 'bg-neutral-800 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/40 shadow-sm'
                    : 'bg-neutral-900/60 border-neutral-700 text-cyan-400 hover:bg-neutral-800/80 hover:border-neutral-600'
                }`}
              >
                <Banknote className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Cash Sale</span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono font-normal opacity-60 bg-neutral-950/60 text-cyan-400/90 ml-auto">
                  Alt+C
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentTerm('Credit');
                  if (!customerPhone || customerPhone === '0771234567') {
                    setInputErrorNotice('Please enter customer phone in the top bar for credit billing.');
                  }
                }}
                title="Switch to Customer Credit Billing (Alt+R)"
                className={`h-12 px-3 rounded-xl text-xs font-mono-jb font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                  paymentTerm === 'Credit'
                    ? 'bg-neutral-800 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/40 shadow-sm'
                    : 'bg-neutral-900/60 border-neutral-700 text-cyan-400 hover:bg-neutral-800/80 hover:border-neutral-600'
                }`}
              >
                <Receipt className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Credit Sale</span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono font-normal opacity-60 bg-neutral-950/60 text-cyan-400/90 ml-auto">
                  Alt+R
                </span>
              </button>
            </div>

            {/* Payment Method Cards: Expanded Heights & Vibrant Distinct Color Fills */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* 1. CASH PAY - Green / Emerald Theme (Filling blank space with prominent height) */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Cash');
                  handleOpenCashCheckout();
                }}
                title="Settle with Cash [F1]"
                className={`group relative overflow-hidden h-24 sm:h-28 rounded-2xl font-mono-jb transition-all cursor-pointer flex flex-col items-center justify-between p-2 sm:p-2.5 border shadow-md active:scale-[0.98] ${
                  paymentMethod === 'Cash'
                    ? 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 text-white border-emerald-300 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/35'
                    : 'bg-gradient-to-b from-emerald-950/70 via-[#072418] to-emerald-950/80 border-emerald-500/35 text-emerald-200 hover:from-emerald-900/80 hover:to-emerald-950 hover:border-emerald-400/60 hover:text-white'
                }`}
              >
                {/* Subtle desaturated cash notes watermark in button background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 group-hover:opacity-15 transition-opacity">
                  <svg
                    className="absolute -right-3 -bottom-3 w-20 h-20 text-white filter grayscale"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm3 1a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V8a1 1 0 00-1-1H5zm7 8a3 3 0 100-6 3 3 0 000 6zm0-1.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                </div>

                {/* Top Icon Badge */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                  paymentMethod === 'Cash'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  <Banknote className="w-5 h-5 shrink-0" />
                </div>

                {/* Center Title */}
                <div className="font-oswald text-xs sm:text-sm font-extrabold uppercase tracking-wide text-center">
                  Cash Pay
                </div>

                {/* Bottom Shortcut Key */}
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-tight ${
                  paymentMethod === 'Cash'
                    ? 'bg-emerald-900/70 text-emerald-100 border border-emerald-400/40'
                    : 'bg-emerald-950/80 text-emerald-300/80 border border-emerald-500/25'
                }`}>
                  F1
                </span>
              </button>

              {/* 2. CARD PAY - Purple / Violet Theme */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Card');
                  handleOpenCashCheckout();
                }}
                title="Settle with Card Terminal [F2]"
                className={`group relative overflow-hidden h-24 sm:h-28 rounded-2xl font-mono-jb transition-all cursor-pointer flex flex-col items-center justify-between p-2 sm:p-2.5 border shadow-md active:scale-[0.98] ${
                  paymentMethod === 'Card'
                    ? 'bg-gradient-to-b from-purple-600 via-violet-600 to-purple-700 text-white border-purple-300 ring-2 ring-purple-400/60 shadow-lg shadow-purple-500/35'
                    : 'bg-gradient-to-b from-purple-950/70 via-[#1e0a30] to-purple-950/80 border-purple-500/35 text-purple-200 hover:from-purple-900/80 hover:to-purple-950 hover:border-purple-400/60 hover:text-white'
                }`}
              >
                {/* Top Bank Card Logo */}
                <div className={`w-9 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                  paymentMethod === 'Card'
                    ? 'bg-white/15'
                    : 'bg-purple-500/15 border border-purple-500/30'
                }`}>
                  {/* Standard recognizable Mastercard / Visa Card Logo */}
                  <svg className="w-6 h-4 shrink-0 rounded-xs" viewBox="0 0 32 20" fill="none">
                    <rect width="32" height="20" rx="3" fill="#0f172a" />
                    <circle cx="12" cy="10" r="5.5" fill="#EB001B" />
                    <circle cx="20" cy="10" r="5.5" fill="#F79E1B" fillOpacity="0.95" />
                  </svg>
                </div>

                {/* Center Title */}
                <div className="font-oswald text-xs sm:text-sm font-extrabold uppercase tracking-wide text-center">
                  Card Pay
                </div>

                {/* Bottom Shortcut Key */}
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-tight ${
                  paymentMethod === 'Card'
                    ? 'bg-purple-950/80 text-purple-100 border border-purple-400/40'
                    : 'bg-purple-950/80 text-purple-300/80 border border-purple-500/25'
                }`}>
                  F2
                </span>
              </button>

              {/* 3. BANK XFER - Yellow / Amber Theme */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Bank Transfer');
                  handleOpenCashCheckout();
                }}
                title="Settle with Bank Transfer [F3]"
                className={`group relative overflow-hidden h-24 sm:h-28 rounded-2xl font-mono-jb transition-all cursor-pointer flex flex-col items-center justify-between p-2 sm:p-2.5 border shadow-md active:scale-[0.98] ${
                  paymentMethod === 'Bank Transfer'
                    ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-amber-200 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/35 font-black'
                    : 'bg-gradient-to-b from-amber-950/70 via-[#261b07] to-amber-950/80 border-amber-500/35 text-amber-200 hover:from-amber-900/80 hover:to-amber-950 hover:border-amber-400/60 hover:text-amber-100'
                }`}
              >
                {/* Top Bank Icon Badge */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                  paymentMethod === 'Bank Transfer'
                    ? 'bg-black/20 text-slate-950'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <Building2 className="w-5 h-5 shrink-0" />
                </div>

                {/* Center Title */}
                <div className="font-oswald text-xs sm:text-sm font-extrabold uppercase tracking-wide text-center">
                  Bank Xfer
                </div>

                {/* Bottom Shortcut Key */}
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-tight ${
                  paymentMethod === 'Bank Transfer'
                    ? 'bg-amber-950/30 text-slate-950 border border-amber-950/30'
                    : 'bg-amber-950/80 text-amber-300/80 border border-amber-500/25'
                }`}>
                  F3
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Sales Returns & Clear Bill */}
          <div className="space-y-2.5 mt-auto shrink-0 pt-1">
            {/* Secondary Actions: Deep Red Sales Returns & Subdued Grey Clear Bill */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono-jb">
              <button
                type="button"
                onClick={() => setShowSalesReturnsModal(true)}
                title="Process Customer Sales Return or Item Exchange"
                className="h-11 px-3 rounded-xl bg-red-950/40 text-red-300 border border-red-800 hover:bg-red-900/50 hover:text-red-200 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold active:scale-98"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                <span>Sales Returns</span>
              </button>

              <button
                type="button"
                onClick={handleClearBill}
                title="Reset current bill items and amounts"
                className="h-11 px-3 rounded-xl bg-neutral-900/50 text-neutral-300 hover:text-white border border-neutral-700 hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer font-semibold active:scale-98"
              >
                Clear Bill
              </button>
            </div>

            {/* Primary Action Button: Settle & Print (80mm) with Auto-Reset Workflow */}
            <button
              type="button"
              onClick={handleSettleAndPrint}
              disabled={processingCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white rounded-xl font-oswald text-base font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/40 transition-all cursor-pointer ring-1 ring-red-400/50"
            >
              <Printer className="w-5 h-5 stroke-[2.5]" />
              <span>{processingCheckout ? 'Processing...' : 'Settle & Print (80mm)'}</span>
              <span className="text-[10px] bg-red-950/80 border border-red-400/40 px-1.5 py-0.5 rounded font-mono-jb">
                F12
              </span>
            </button>
          </div>
        </div>
      </div>


      {/* 4. CASH / DIGITAL / CREDIT PAYMENT & SETTLEMENT MODAL */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-emerald-500/50 rounded-3xl w-full max-w-xl shadow-2xl shadow-emerald-950/90 overflow-hidden flex flex-col font-mono-jb">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0a1844] to-[#0c1f54] border-b border-blue-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-md ${
                  paymentMethod === 'Card'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : paymentMethod === 'Bank Transfer'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  {paymentMethod === 'Card' ? (
                    <CreditCard className="w-6 h-6" />
                  ) : paymentMethod === 'Bank Transfer' ? (
                    <Building2 className="w-6 h-6" />
                  ) : (
                    <Banknote className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    {paymentTerm === 'Credit' ? 'Credit Terms Settlement' : `${paymentMethod} Checkout Settlement`}
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    Bill No: {billNumber} &bull; Customer: {customerName} ({customerPhone || 'Walk-in'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCashModalOpen(false);
                  barcodeInputRef.current?.focus();
                }}
                className="text-blue-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Payment Terms Selector Pills in Modal */}
              <div className="bg-[#050c24] p-3 rounded-2xl border border-blue-500/25 flex items-center justify-between">
                <span className="text-xs uppercase text-blue-300 font-bold">Payment Terms:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentTerm('Cash')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      paymentTerm === 'Cash'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0a1844] text-blue-300 hover:text-white'
                    }`}
                  >
                    Cash Terms
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentTerm('Credit')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      paymentTerm === 'Credit'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[#0a1844] text-blue-300 hover:text-white'
                    }`}
                  >
                    Credit Terms
                  </button>
                </div>
              </div>

              {/* Payment Channel (Cash / Card / Bank Transfer) */}
              <div className="bg-[#050c24] p-3 rounded-2xl border border-blue-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-blue-300 font-bold">Settlement Channel:</span>
                  <div className="flex items-center gap-1.5">
                    {(['Cash', 'Card', 'Bank Transfer'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          paymentMethod === mode
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-[#0a1844] text-blue-300/70 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Digital / Card Bank Account Selector */}
                {(paymentMethod === 'Card' || paymentMethod === 'Bank Transfer') && (
                  <div className="pt-2 border-t border-blue-500/20">
                    <label className="text-[10px] uppercase text-cyan-300 font-bold block mb-1">
                      Routing Shop Bank Account:
                    </label>
                    <select
                      value={selectedBankId || ''}
                      onChange={(e) => setSelectedBankId(Number(e.target.value))}
                      className="w-full bg-[#08102a] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono-jb"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountName} ({b.accountNumber}) &bull; Bal: {config.currency} {Number(b.balance || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Recalled Job notification if present */}
              {activeRecalledJob && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-between">
                  <span>Linked Job #{activeRecalledJob.jobNumber}</span>
                  <span className="font-bold text-amber-400">
                    Job Advance Deducted: {config.currency} {advancePaidFromJob.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Customer Advance Deposit Application Box */}
              {customerAdvanceBalance > 0 && (
                <div className="bg-[#041a2f] p-3.5 rounded-2xl border border-cyan-400/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="modalApplyAdvance"
                        checked={applyCustomerAdvance}
                        onChange={(e) => {
                          setApplyCustomerAdvance(e.target.checked);
                          if (e.target.checked && appliedAdvanceAmount <= 0) {
                            setAppliedAdvanceAmount(Math.min(customerAdvanceBalance, grossBeforeCustomerAdvance));
                          }
                        }}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <label htmlFor="modalApplyAdvance" className="text-xs font-bold text-cyan-300 cursor-pointer">
                        Apply Customer Advance Deposit Balance
                      </label>
                    </div>
                    <span className="text-xs font-black text-white">
                      Avail: {config.currency} {customerAdvanceBalance.toLocaleString()}
                    </span>
                  </div>

                  {applyCustomerAdvance && (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-blue-200/80">Amount to Apply:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">{config.currency}</span>
                        <input
                          type="number"
                          min="0"
                          max={Math.min(customerAdvanceBalance, grossBeforeCustomerAdvance)}
                          value={appliedAdvanceAmount}
                          onChange={(e) =>
                            setAppliedAdvanceAmount(
                              Math.min(
                                customerAdvanceBalance,
                                Math.max(0, parseFloat(e.target.value) || 0)
                              )
                            )
                          }
                          className="w-24 bg-[#08102a] border border-cyan-400/50 rounded px-2 py-0.5 text-right font-bold text-white outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Summary Breakdown */}
              <div className="bg-[#050c24] p-4 rounded-2xl border border-blue-500/25 space-y-2 text-xs">
                <div className="flex justify-between text-blue-200/80">
                  <span>Gross Subtotal:</span>
                  <span>{config.currency} {subtotal.toLocaleString()}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount:</span>
                    <span>-{config.currency} {discountValue.toLocaleString()}</span>
                  </div>
                )}
                {advancePaidFromJob > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Advance Deposit (Job):</span>
                    <span>-{config.currency} {advancePaidFromJob.toLocaleString()}</span>
                  </div>
                )}
                {effectiveCustomerAdvanceApplied > 0 && (
                  <div className="flex justify-between text-cyan-300 font-bold">
                    <span>Advance Balance Applied:</span>
                    <span>-{config.currency} {effectiveCustomerAdvanceApplied.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-blue-500/25 flex justify-between text-sm sm:text-base font-black text-emerald-300">
                  <span>{paymentTerm === 'Credit' ? 'NET BILL TOTAL:' : 'NET AMOUNT TO COLLECT:'}</span>
                  <span>{config.currency} {amountToCollect.toLocaleString()}</span>
                </div>
              </div>

              {/* Amount Tendered Input */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-cyan-300 font-bold flex items-center justify-between">
                  <span>{paymentTerm === 'Credit' ? 'Cash/Card Down Payment Received:' : 'Amount Tendered By Customer:'}</span>
                  <span className="text-[10px] text-blue-300/60">[Enter] to Calculate & Confirm</span>
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-blue-400 pointer-events-none">
                    {config.currency}
                  </span>
                  <input
                    ref={cashTenderedInputRef}
                    type="number"
                    min="0"
                    value={cashTendered === '' ? '' : cashTendered}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                      setCashTendered(val);
                    }}
                    onKeyDown={handleCashTenderedKeyDown}
                    placeholder={paymentTerm === 'Credit' ? 'Enter down payment (or 0)...' : 'Type cash amount received...'}
                    className="w-full pl-16 pr-4 py-3 bg-[#050c24] border-2 border-emerald-500/60 rounded-2xl text-xl sm:text-2xl font-black font-mono-jb text-white outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 shadow-inner"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCashTendered(amountToCollect);
                      confirmPrintBtnRef.current?.focus();
                    }}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Exact ({amountToCollect.toLocaleString()})
                  </button>
                  {paymentTerm === 'Credit' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCashTendered(0);
                        confirmPrintBtnRef.current?.focus();
                      }}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      0 (Full Credit)
                    </button>
                  )}
                  {[500, 1000, 2000, 5000].map((add) => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => {
                        const current = typeof cashTendered === 'number' ? cashTendered : 0;
                        setCashTendered(current + add);
                      }}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      +{add}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Status / Change Due or Credit Due Banner */}
              {paymentTerm === 'Credit' ? (
                <div className="p-3.5 rounded-2xl border-2 bg-amber-950/50 border-amber-500/60 text-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold block tracking-wider">
                      NEW CREDIT DUE TO BOOK:
                    </span>
                    <div className="text-xl sm:text-2xl font-black mt-0.5">
                      {config.currency} {creditDueAmount.toLocaleString()}
                    </div>
                    {customerCreditDue > 0 && (
                      <p className="text-[10px] text-amber-200/70 mt-1">
                        Previous dues: {config.currency} {customerCreditDue.toLocaleString()} &bull; Total Account Balance: {config.currency} {(customerCreditDue + creditDueAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-400 stroke-[2]" />
                </div>
              ) : (
                <div
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between text-sm sm:text-base font-black ${
                    tenderedNum >= amountToCollect
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/60 text-rose-300'
                  }`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold block tracking-wider">
                      {tenderedNum >= amountToCollect ? 'CHANGE DUE TO CUSTOMER:' : 'REMAINING BALANCE DUE:'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black mt-0.5">
                      {config.currency}{' '}
                      {tenderedNum >= amountToCollect
                        ? changeDue.toLocaleString()
                        : remainingDue.toLocaleString()}
                    </div>
                  </div>
                  {tenderedNum >= amountToCollect && (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 stroke-[2.5]" />
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-[#050c24] border-t border-blue-500/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCashModalOpen(false);
                  barcodeInputRef.current?.focus();
                }}
                className="px-4 py-2.5 text-xs text-blue-200/70 hover:text-white transition-colors cursor-pointer"
              >
                [Esc] Back to Items
              </button>

              <button
                ref={confirmPrintBtnRef}
                type="button"
                disabled={processingCheckout}
                onClick={handleFinalizeAndPrint}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-oswald text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/40 transition-all cursor-pointer ring-2 ring-emerald-400"
              >
                <Printer className="w-5 h-5 stroke-[2.5]" />
                <span>{processingCheckout ? 'Processing...' : 'Confirm & Print Bill (80mm) [Enter]'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL-MODE SALES RETURNS MODAL */}
      <SalesReturnsModal
        isOpen={showSalesReturnsModal}
        onClose={() => setShowSalesReturnsModal(false)}
        currency={config.currency}
        catalog={itemsCatalog}
        onReturnComplete={(msg) => {
          setPaymentSuccessNotice(msg);
          // Refetch items catalog after return restocking
          fetch('/api/inventory/items', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data)) setItemsCatalog(data);
            })
            .catch(() => {});
        }}
      />

      {/* 5. JOB ORDER RECALL MODAL */}
      <RecallRepairJobModal
        isOpen={showJobRecallModal}
        onClose={() => setShowJobRecallModal(false)}
        jobs={jobs}
        onSelectJob={handleRecallJob}
        currency={config.currency}
      />
      {/* 6. ON-THE-FLY ITEM CREATION MODAL */}
      {showAddNewItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-emerald-500/50 rounded-3xl w-full max-w-lg shadow-2xl shadow-emerald-950/80 overflow-hidden flex flex-col font-mono-jb">
            <div className="bg-gradient-to-r from-[#081f18] to-[#0a1844] border-b border-emerald-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <PackagePlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-white">
                    Add New Item (On-the-Fly)
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    Saves to inventory database & auto-inserts into current bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddNewItemModal(false)}
                className="text-blue-300/60 hover:text-white p-1 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNewItemOnTheFly} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                  Item Description / Name *
                </label>
                <input
                  type="text"
                  required
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  placeholder="e.g. AMA P1 Button Phone"
                  className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-bold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Item Code (SKU) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemForm.code}
                    onChange={(e) => setNewItemForm({ ...newItemForm, code: e.target.value })}
                    placeholder="BTP00001"
                    className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={newItemForm.barcode}
                    onChange={(e) => setNewItemForm({ ...newItemForm, barcode: e.target.value })}
                    placeholder="890123456001"
                    className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Category
                  </label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                  >
                    <option value="Displays">Displays / Screens</option>
                    <option value="Batteries">Batteries</option>
                    <option value="Chargers">Chargers</option>
                    <option value="Cables">Cables & Adapters</option>
                    <option value="Tempered Glass">Tempered Glass</option>
                    <option value="Phones">Phones / Devices</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Spare Part">Spare Parts</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={newItemForm.brand}
                    onChange={(e) => setNewItemForm({ ...newItemForm, brand: e.target.value })}
                    placeholder="Apple, Samsung, etc."
                    className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Cost Price ({config.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemForm.costPrice || ''}
                    onChange={(e) => setNewItemForm({ ...newItemForm, costPrice: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-emerald-300 font-bold block mb-1">
                    Selling Price * ({config.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItemForm.sellingPrice || ''}
                    onChange={(e) => setNewItemForm({ ...newItemForm, sellingPrice: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    placeholder="1000"
                    className="w-full px-3 py-2 bg-[#060d26] border border-emerald-500/40 rounded-xl text-emerald-300 outline-none focus:border-emerald-400 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-300 font-bold block mb-1">
                    Initial Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemForm.qty || ''}
                    onChange={(e) => setNewItemForm({ ...newItemForm, qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-[#060d26] border border-blue-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-bold text-center"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-blue-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNewItemModal(false)}
                  className="px-3 py-2 rounded-xl text-blue-300/80 hover:bg-blue-600/10 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewItemOnTheFly}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{savingNewItemOnTheFly ? 'Saving...' : 'Save & Insert into Bill'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Status Transition Modal / Prompt: "Ready to Collect" -> "Delivered" on Enter */}
      {pendingDeliveredJob && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleDeliverRecalledJob(pendingDeliveredJob);
            } else if (e.key === 'Escape') {
              setPendingDeliveredJob(null);
            }
          }}
        >
          <div className="bg-[#1c1c1e] text-white rounded-2xl sm:rounded-3xl border border-emerald-500/50 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono-jb text-[10px] font-bold uppercase tracking-wider">
                Automated Status Update
              </span>
              <h3 className="font-oswald text-xl uppercase font-bold text-white tracking-wide pt-1">
                Payment Settled & Ready to Collect
              </h3>
              <p className="text-xs text-slate-300 font-mono-jb leading-relaxed">
                Job <strong className="text-white">#{pendingDeliveredJob.jobNumber}</strong> was auto-updated to <strong className="text-emerald-400">Ready to Collect</strong>!
              </p>
            </div>

            <div className="bg-[#111113] p-3.5 rounded-xl border border-slate-800 text-xs font-mono-jb space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Customer:</span>
                <span className="text-white font-bold">{pendingDeliveredJob.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Device:</span>
                <span className="text-white font-semibold">{pendingDeliveredJob.deviceBrand} {pendingDeliveredJob.deviceModel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cashier / Staff:</span>
                <span className="text-emerald-400">{staffName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Delivery Log Time:</span>
                <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1 font-mono-jb">
              <button
                ref={deliverButtonRef}
                type="button"
                onClick={() => handleDeliverRecalledJob(pendingDeliveredJob)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                <span>Mark as DELIVERED & Send Passport + Thank You (Enter ↵)</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingDeliveredJob(null)}
                className="w-full py-2 px-3 bg-[#111113] hover:bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl transition-colors cursor-pointer text-center"
              >
                Close / Keep as Ready to Collect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      <QuickAddCustomerModal
        isOpen={showQuickAddCustomerModal}
        onClose={() => setShowQuickAddCustomerModal(false)}
        token={token}
        currency={config.currency}
        onCustomerAdded={(newCust) => {
          setCustomerName(newCust.customerName);
          setCustomerPhone(newCust.phoneNumber);
          if (newCust.advanceBalance) {
            setCustomerAdvanceBalance(newCust.advanceBalance);
          }
          if (newCust.creditDue) {
            setCustomerCreditDue(newCust.creditDue);
          }
          setPaymentSuccessNotice(`Customer "${newCust.customerName}" registered & selected for current invoice!`);
        }}
      />

      {/* VIEW-ONLY INVOICE MODAL */}
      <ViewOnlyInvoiceModal
        isOpen={showViewOnlyModal}
        invoice={viewOnlyInvoiceData}
        onClose={() => setShowViewOnlyModal(false)}
        currency={config.currency}
        shopName={config.shopName}
        onUnlockInvoice={(inv) => handleUnlockAndResumeInvoice(inv)}
      />

      {/* END OF DAY (EOD) CLOSING MODAL WITH STRICT LOCKED INVOICE VALIDATION */}
      <EodClosingModal
        isOpen={showEodModal}
        onClose={() => setShowEodModal(false)}
        token={token}
        currency={config.currency}
        onOpenLockedInvoice={(inv) => {
          setShowEodModal(false);
          setViewOnlyInvoiceData(inv);
          setShowViewOnlyModal(true);
        }}
        onEodClosed={() => {
          fetchLockedInvoices();
          handleCreateNewBill();
        }}
      />

      {/* LOCKED INVOICES LIST MODAL */}
      {showLockedInvoicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-mono-jb">
          <div className="bg-[#081335] border-2 border-amber-500/50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#0c1c4d] border-b border-amber-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-black uppercase text-white tracking-wider">
                    Parked & Locked Invoices ({lockedInvoicesList.length})
                  </h3>
                  <p className="text-[11px] text-amber-200/70">
                    Must be settled or cleared prior to End of Day (EOD) closing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLockedInvoicesModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {lockedInvoicesList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No locked invoices currently pending.
                </div>
              ) : (
                lockedInvoicesList.map((inv) => (
                  <div
                    key={inv.billNo}
                    className="p-3 bg-[#0c183e] border border-amber-500/25 rounded-2xl flex flex-wrap items-center justify-between gap-3 hover:border-amber-400/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-bold text-sm">{inv.billNo}</strong>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          LOCKED
                        </span>
                        {inv.linkedJobNumber && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-bold border border-blue-500/30">
                            Job #{inv.linkedJobNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-blue-200/70 mt-1">
                        Customer: <span className="text-white font-semibold">{inv.customerName || 'Walk-in'}</span> &bull; {inv.date} {inv.time}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <div className="text-[10px] text-blue-300/70 uppercase">Net Total</div>
                        <div className="text-base font-black text-yellow-400">
                          {config.currency} {(inv.netTotal || 0).toLocaleString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setViewOnlyInvoiceData(inv);
                          setShowViewOnlyModal(true);
                          setShowLockedInvoicesModal(false);
                        }}
                        className="py-1.5 px-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-cyan-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUnlockAndResumeInvoice(inv)}
                        className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-oswald text-xs font-bold uppercase rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Resume in POS
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-[#050c24] border-t border-blue-500/20 p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLockedInvoicesModal(false)}
                className="py-2 px-4 bg-[#0f1d46] hover:bg-[#1a2d68] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. JOB RECALL BLOCKED MODAL: Ready to Pick Up Check */}
      {recallBlockedModal.isOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-mono-jb">
          <div className="bg-[#0b132b] border-2 border-rose-500/60 rounded-3xl w-full max-w-md shadow-2xl shadow-rose-950/80 overflow-hidden text-white p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-oswald text-lg font-black uppercase tracking-wider text-rose-300">
                  Job Recall Blocked
                </h3>
                <p className="text-[11px] text-slate-400">
                  {recallBlockedModal.job ? `Job Order #${recallBlockedModal.job.jobNumber}` : 'Validation Notice'}
                </p>
              </div>
            </div>

            {/* The exact required warning prompt */}
            <div className="bg-rose-950/60 border border-rose-500/40 p-4 rounded-2xl space-y-2.5">
              <p className="text-sm font-extrabold text-white leading-relaxed">
                &ldquo;{recallBlockedModal.message || "This job order is not ready to pick up. The status must be 'Ready for Pickup' before it can be recalled into the POS bill."}&rdquo;
              </p>
              <p className="text-xs text-amber-200 font-semibold italic border-t border-rose-500/30 pt-2">
                &ldquo;It&apos;s not ready to pick up. Make it ready to pick up, then you can recall.&rdquo;
              </p>
              {recallBlockedModal.job && (
                <div className="pt-1 text-xs text-rose-200/80 flex items-center gap-2">
                  <span>Current Status:</span>
                  <span className="font-bold uppercase px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40">
                    {recallBlockedModal.job.status}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-rose-300/70 pt-1">
                To prevent unauthorized or premature billing, only jobs marked as <strong>&ldquo;Ready for Pickup&rdquo;</strong> can be recalled into the POS terminal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecallBlockedModal({ isOpen: false, job: null, message: '' })}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-rose-600/30 transition-all font-mono-jb"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BATCH SELECTION MODAL: BATCH-WISE PRICING & MARGIN SELECTION */}
      <BatchSelectionModal
        isOpen={batchModalState.isOpen}
        onClose={() => {
          setBatchModalState({ isOpen: false, item: null, qty: 1, batches: [] });
          setTimeout(() => barcodeInputRef.current?.focus(), 50);
        }}
        item={batchModalState.item}
        qty={batchModalState.qty}
        batches={batchModalState.batches}
        currency={config.currency}
        onSelectBatch={(selectedBatch) => {
          if (batchModalState.item) {
            handleAddItem(batchModalState.item, batchModalState.qty, selectedBatch);
          }
          setBatchModalState({ isOpen: false, item: null, qty: 1, batches: [] });
          setTimeout(() => barcodeInputRef.current?.focus(), 50);
        }}
      />
    </div>
  );
};
