import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Minus,
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

  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState<number>(0);
  const [customerCreditDue, setCustomerCreditDue] = useState<number>(0);
  const [applyCustomerAdvance, setApplyCustomerAdvance] = useState(false);
  const [appliedAdvanceAmount, setAppliedAdvanceAmount] = useState<number>(0);

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [paymentTerm, setPaymentTerm] = useState<'Cash' | 'Credit'>('Cash');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

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

  const [showSalesReturnsModal, setShowSalesReturnsModal] = useState(false);
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
      } catch (err) {}
    };
    syncBatchesFromBackend();
  }, [token]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (itemQuery.trim()) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [itemQuery]);

  useEffect(() => {
    if (selectedIndex >= 0 && searchItemRefs.current[selectedIndex]) {
      searchItemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const cashTenderedInputRef = useRef<HTMLInputElement>(null);
  const confirmPrintBtnRef = useRef<HTMLButtonElement>(null);

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
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (err) {}
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
      } catch (err) {}
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
        } catch (err) {}
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

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.total, 0);
  }, [cartItems]);

  const discountValue = useMemo(() => {
    return Math.round((subtotal * overallDiscountPercent) / 100);
  }, [subtotal, overallDiscountPercent]);

  const cartGrossTotal = subtotal;

  const grossAfterDiscount = useMemo(() => {
    const net = cartGrossTotal - discountValue;
    return Math.max(0, net - returnsAmount);
  }, [cartGrossTotal, discountValue, returnsAmount]);

  const advancePaidFromJob = useMemo(() => {
    return activeRecalledJob?.advancePaid || 0;
  }, [activeRecalledJob]);

  const grossBeforeCustomerAdvance = useMemo(() => {
    return Math.max(0, grossAfterDiscount - advancePaidFromJob);
  }, [grossAfterDiscount, advancePaidFromJob]);

  const effectiveCustomerAdvanceApplied = useMemo(() => {
    if (!applyCustomerAdvance || customerAdvanceBalance <= 0) return 0;
    const maxApplicable = Math.min(customerAdvanceBalance, grossBeforeCustomerAdvance);
    return Math.min(appliedAdvanceAmount > 0 ? appliedAdvanceAmount : maxApplicable, maxApplicable);
  }, [applyCustomerAdvance, customerAdvanceBalance, appliedAdvanceAmount, grossBeforeCustomerAdvance]);

  const totalCustomerAdvanceDeposit = useMemo(() => {
    return advancePaidFromJob + effectiveCustomerAdvanceApplied;
  }, [advancePaidFromJob, effectiveCustomerAdvanceApplied]);

  const toPayAmount = useMemo(() => {
    return Math.max(0, cartGrossTotal - discountValue - totalCustomerAdvanceDeposit - returnsAmount);
  }, [cartGrossTotal, discountValue, totalCustomerAdvanceDeposit, returnsAmount]);

  const amountToCollect = toPayAmount;

  const tenderedNum = typeof cashTendered === 'number' ? cashTendered : 0;
  const changeDue = Math.max(0, tenderedNum - toPayAmount);
  const remainingDue = Math.max(0, toPayAmount - tenderedNum);
  const creditDueAmount = paymentTerm === 'Credit' ? remainingDue : 0;

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

      setItemsCatalog((prev) => [data, ...prev]);
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

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (itemQuery.trim() && filteredCatalog.length > 0) {
        setSelectedIndex((prev) => (prev < filteredCatalog.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (itemQuery.trim() && filteredCatalog.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCatalog.length - 1));
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setItemQuery('');
      setSelectedIndex(-1);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (itemQuery.trim()) {
        const itemToAdd =
          selectedIndex >= 0 && selectedIndex < filteredCatalog.length
            ? filteredCatalog[selectedIndex]
            : (filteredCatalog.length > 0 ? filteredCatalog[0] : null);

        if (itemToAdd) {
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
          handleOpenAddNewItemModal(itemQuery.trim());
        }
        return;
      }

      if (cartItems.length > 0) {
        handleOpenCashCheckout();
      } else {
        setInputErrorNotice('Scan or select an item first before proceeding to checkout.');
      }
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!selectedItemToAdd) {
        barcodeInputRef.current?.focus();
        return;
      }
      handleAddItem(selectedItemToAdd, inputQty);
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 30);
    }
  };

  const handleAddItem = (item: PosItem, qtyToAdd = inputQty, chosenBatch?: ItemBatch) => {
    if (billLocked) return;

    if (!chosenBatch) {
      const activeBatches = getBatchesForItem(item.code);
      if (activeBatches.length > 1) {
        setBatchModalState({
          isOpen: true,
          item,
          qty: qtyToAdd,
          batches: activeBatches,
        });
        return;
      } else if (activeBatches.length === 1) {
        chosenBatch = activeBatches[0];
      }
    }

    const unitPrice = chosenBatch ? chosenBatch.sellingPrice : item.sellingPrice;
    const unitCost = chosenBatch ? chosenBatch.costPrice : item.costPrice;
    const batchNo = chosenBatch ? chosenBatch.batchNumber : undefined;
    const batchDate = chosenBatch ? chosenBatch.purchaseDate : undefined;

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

  const handleOpenCashCheckout = () => {
    if (cartItems.length === 0) {
      setInputErrorNotice('Invoice is empty. Scan barcode or add items before checking out.');
      barcodeInputRef.current?.focus();
      return;
    }
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
      } catch (bErr) {}

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

      if (onPrintThermalBill) {
        onPrintThermalBill(finalizedBill);
      } else {
        setTimeout(() => {
          window.print();
        }, 100);
      }

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

      if (onPrintThermalBill) {
        onPrintThermalBill(finalizedBill);
      } else {
        setTimeout(() => {
          window.print();
        }, 80);
      }

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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
      } catch (err) {}
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
    } catch (e) {}
  };

  useEffect(() => {
    fetchLockedInvoices();
  }, [token]);

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

  const handleUnlockAndResumeInvoice = async (invoiceToResume: PosBill) => {
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      const res = await fetch(`/api/pos/bills/${invoiceToResume.billNo}/unlock`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resume locked invoice');

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
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden select-none font-mono-jb">
      
      {/* TOP HEADER & THREE-CARD TOTALS - 100% SILVER THEME */}
      <div className="bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 border-b border-slate-400 px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg text-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border-2 border-slate-500 flex items-center justify-center shadow-inner shrink-0">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="font-oswald text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
              SALES TERMINAL
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md font-mono-jb text-xs font-bold shadow-xs">
                {billNumber}
              </span>
              {activeRecalledJob && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-mono-jb text-[11px] font-bold flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-amber-700" />
                  <span>JOB #{activeRecalledJob.jobNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Three-Card Breakdown (Silver Theme Touch) */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="bg-white/80 border border-slate-400 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col items-end min-w-[120px] sm:min-w-[140px] shadow-inner justify-center">
            <span className="text-[10px] sm:text-xs font-mono-jb uppercase text-slate-700 font-bold tracking-wider">
              GROSS TOTAL
            </span>
            <div className="text-lg sm:text-xl font-black font-mono-jb text-slate-900 my-0.5 tracking-tight leading-tight">
              {config.currency} {cartGrossTotal.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col items-end min-w-[120px] sm:min-w-[140px] shadow-inner justify-center">
            <span className="text-[10px] sm:text-xs font-mono-jb uppercase text-slate-700 font-bold tracking-wider">
              ADVANCE
            </span>
            <div className="text-lg sm:text-xl font-black font-mono-jb text-emerald-700 my-0.5 tracking-tight leading-tight">
              {totalCustomerAdvanceDeposit > 0
                ? `-${config.currency} ${totalCustomerAdvanceDeposit.toLocaleString()}`
                : `${config.currency} 0`}
            </div>
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col items-end min-w-[120px] sm:min-w-[140px] shadow-inner justify-center">
            <span className="text-[10px] sm:text-xs font-mono-jb uppercase font-bold tracking-wider text-slate-700">
              TO PAY
            </span>
            <div className="text-lg sm:text-xl font-black font-mono-jb text-blue-700 my-0.5 tracking-tight leading-tight">
              {config.currency} {toPayAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL NEW BILL & CUSTOMER DETAILS BAR */}
      <div className="bg-white border-b border-slate-300 px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCreateNewBill}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-oswald text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setShowJobRecallModal(true)}
            className="py-2 px-3 bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800 rounded-xl font-oswald text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-slate-700" />
            <span>{activeRecalledJob ? `Job #${activeRecalledJob.jobNumber}` : 'Recall Job'}</span>
          </button>

          <button
            type="button"
            onClick={handleLockActiveInvoice}
            disabled={lockingInvoice}
            className="py-2 px-3 bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800 rounded-xl font-oswald text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {lockingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Lock Bill</span>
          </button>

          {lockedInvoicesCount > 0 && (
            <button
              type="button"
              onClick={() => setShowLockedInvoicesModal(true)}
              className="py-1.5 px-2.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-[11px] font-mono-jb font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse"
            >
              <Lock className="w-3 h-3 text-amber-700" />
              <span>Locked ({lockedInvoicesCount})</span>
            </button>
          )}

          {/* INVOICE SEARCH BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchInvoice();
            }}
            className="flex items-center gap-1.5 border-2 border-slate-300 focus-within:border-blue-600 rounded-xl px-2.5 py-1 bg-slate-100 transition-all shadow-inner"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={quickBillSearch}
              onChange={(e) => setQuickBillSearch(e.target.value)}
              placeholder="Search Inv (e.g. INV000008)..."
              className="text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none w-36 sm:w-44 bg-transparent"
            />
            <button
              type="submit"
              disabled={searchingInvoice}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
            >
              {searchingInvoice ? <Loader2 className="w-3 h-3 animate-spin" /> : 'View'}
            </button>
          </form>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 flex-1 max-w-4xl justify-end">
          <button
            type="button"
            onClick={() => setShowQuickAddCustomerModal(true)}
            className="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-oswald font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Cust</span>
          </button>

          <div ref={customerDropdownRef} className="relative flex items-center gap-1.5 flex-1 min-w-[320px]">
            <div className="flex items-center gap-1.5 bg-slate-100 border-2 border-slate-300 focus-within:border-blue-600 rounded-xl px-2.5 py-1.5 min-w-[160px] flex-1 shadow-inner">
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
                className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 border-2 border-slate-300 focus-within:border-blue-600 rounded-xl px-2.5 py-1.5 min-w-[140px] shadow-inner">
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
                className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-500 font-bold font-mono"
              />
            </div>

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
                className="text-[10px] text-slate-600 hover:text-slate-900 px-1.5 py-1 bg-slate-200 rounded-lg shrink-0 cursor-pointer font-bold"
              >
                &times; Walk-in
              </button>
            )}

            {isCustomerSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border-2 border-slate-300 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-200 max-h-72 overflow-y-auto font-mono-jb">
                <div className="p-2 bg-slate-200 text-[10px] font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3 text-blue-600" />
                    <span>Search by Mobile No or Name ({matchingCustomers.length} results)</span>
                  </span>
                  <button type="button" onClick={() => setIsCustomerSearchOpen(false)} className="text-slate-600 hover:text-slate-900">
                    &times;
                  </button>
                </div>
                {matchingCustomers.length === 0 ? (
                  <div className="p-3 text-center text-xs space-y-2">
                    <p className="text-slate-500">No customer matching "{customerSearchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerSearchOpen(false);
                        setShowQuickAddCustomerModal(true);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
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
                        className="p-2.5 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                            <User className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{cust.customerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{cust.phoneNumber}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {hasDue && <span className="text-[10px] font-bold text-rose-600">Due: {config.currency} {Number(cust.creditDue).toLocaleString()}</span>}
                          {hasAdv && <span className="text-[10px] font-bold text-emerald-600">Adv: {config.currency} {Number(cust.advanceBalance).toLocaleString()}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {paymentSuccessNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-emerald-800 text-xs font-mono-jb">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{paymentSuccessNotice}</span>
          </div>
          <button onClick={() => setPaymentSuccessNotice(null)} className="text-emerald-700 font-bold">&times;</button>
        </div>
      )}

      {inputErrorNotice && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 flex items-center justify-between text-rose-800 text-xs font-mono-jb">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{inputErrorNotice}</span>
          </div>
          <button onClick={() => setInputErrorNotice(null)} className="text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* MAIN LAYOUT SPLIT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100">
        
        {/* LEFT PANEL: TABLE & SCANNER */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden p-3 gap-2">
          
          {/* BARCODE SCANNER BAR */}
          <div className="bg-white border border-slate-300 rounded-xl p-2.5 flex items-center gap-2 shadow-xs shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
              <Barcode className="w-4 h-4 text-slate-700" />
              <span>SCAN</span>
            </div>

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
                  if (val.trim().length >= 3) {
                    const exact = itemsCatalog.find(
                      (i) => i.barcode === val.trim() || i.code.toLowerCase() === val.trim().toLowerCase()
                    );
                    if (exact) {
                      handleAddItem(exact, 1);
                      setItemQuery('');
                      setSelectedItemToAdd(null);
                      setPaymentSuccessNotice(`Auto-Added: ${exact.name}`);
                      setTimeout(() => barcodeInputRef.current?.focus(), 20);
                    }
                  }
                }}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode or type item code/name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-inner"
              />

              {itemQuery.trim() && (
                <div ref={searchDropdownRef} className="absolute left-0 top-full mt-1 w-full bg-white border-2 border-slate-300 rounded-xl shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-200">
                  {filteredCatalog.length > 0 ? (
                    filteredCatalog.map((item, idx) => (
                      <button
                        key={item.id}
                        ref={(el) => { searchItemRefs.current[idx] = el; }}
                        type="button"
                        onClick={() => {
                          handleAddItem(item, inputQty);
                          setItemQuery('');
                          setSelectedItemToAdd(null);
                        }}
                        className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-slate-100 cursor-pointer ${
                          idx === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Code: {item.code} &bull; Barcode: {item.barcode}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">{config.currency} {item.sellingPrice.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">Stock: {item.qty}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500 font-bold">
                      No items found. Press Enter to add on-the-fly.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddNewItemModal(itemQuery.trim())}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer shrink-0"
            >
              + Add Item
            </button>
          </div>

          {/* TABLE */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-slate-300 rounded-2xl shadow-sm">
            <table className="w-full border-collapse font-pos-table text-slate-900 text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-200 text-slate-800 uppercase text-[10px] font-bold border-b border-slate-300">
                  <th className="py-3 px-3 text-center w-12 border-r border-slate-300">#</th>
                  <th className="py-3 px-3 text-left border-r border-slate-300">ITEM DESCRIPTION</th>
                  <th className="py-3 px-3 text-center w-28 border-r border-slate-300">QUANTITY</th>
                  <th className="py-3 px-3 text-right w-28 border-r border-slate-300">RATE</th>
                  <th className="py-3 px-3 text-right w-24 border-r border-slate-300">DISCOUNT</th>
                  <th className="py-3 px-3 text-right w-28 border-r border-slate-300">SUBTOTAL</th>
                  <th className="py-3 px-3 text-center w-16 no-print">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-medium text-xs">
                {cartItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center text-slate-500">
                      <Barcode className="w-12 h-12 mx-auto mb-2 text-slate-400 opacity-60" />
                      <p className="text-sm font-bold text-slate-700">Invoice is currently empty</p>
                      <p className="text-xs text-slate-500 mt-1">Scan item barcode or search catalog to begin billing.</p>
                    </td>
                  </tr>
                ) : (
                  cartItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-600 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                        <div>{item.name}</div>
                        {item.batchNumber && <div className="text-[10px] text-slate-500 font-mono">Batch: {item.batchNumber}</div>}
                      </td>
                      <td className="py-3 px-3 text-center border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleUpdateItemQty(item.id, parseInt(e.target.value, 10) || 1)}
                          className="w-16 text-center py-1 bg-slate-100 border border-slate-300 rounded font-bold text-xs"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold border-r border-slate-200">{item.price.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold border-r border-slate-200">{item.discount > 0 ? `-${item.discount}` : '-'}</td>
                      <td className="py-3 px-3 text-right font-mono font-black border-r border-slate-200">{item.total.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">
                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL: PAYMENT & CHECKOUT */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-slate-300 flex flex-col h-full overflow-y-auto p-4 gap-3 shadow-sm shrink-0">
          
          <div className="bg-slate-100 rounded-2xl p-3 border border-slate-300 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 font-bold text-xs">
              <span className="uppercase text-slate-800">Payment Term & Mode</span>
              <span className="text-blue-700">{paymentTerm} Terms</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentTerm('Cash')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  paymentTerm === 'Cash' ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                Cash Sale
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerm('Credit')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  paymentTerm === 'Credit' ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                Credit Sale
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['Cash', 'Card', 'Bank Transfer'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m);
                    handleOpenCashCheckout();
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border text-center ${
                    paymentMethod === m ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 mt-auto pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowSalesReturnsModal(true)}
                className="py-2.5 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sales Returns</span>
              </button>

              <button
                type="button"
                onClick={handleClearBill}
                className="py-2.5 bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 rounded-xl font-bold flex items-center justify-center cursor-pointer"
              >
                Clear Bill
              </button>
            </div>

            <button
              type="button"
              onClick={handleSettleAndPrint}
              disabled={processingCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-oswald text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>{processingCheckout ? 'Processing...' : 'Settle & Print (80mm)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CASH CHECKOUT MODAL */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono-jb text-slate-900">
            <div className="bg-slate-200 border-b border-slate-300 p-4 flex items-center justify-between">
              <h3 className="font-oswald text-lg font-bold uppercase">Checkout Settlement</h3>
              <button onClick={() => setIsCashModalOpen(false)} className="text-slate-600 hover:text-slate-900">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm font-bold">
                <span>Net Total: {config.currency} {amountToCollect.toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-slate-700">Amount Tendered:</label>
                <input
                  ref={cashTenderedInputRef}
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  onKeyDown={handleCashTenderedKeyDown}
                  className="w-full px-4 py-2.5 bg-slate-100 border-2 border-slate-300 rounded-xl text-lg font-black outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-end gap-3">
              <button
                ref={confirmPrintBtnRef}
                onClick={handleFinalizeAndPrint}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase"
              >
                Confirm & Print
              </button>
            </div>
          </div>
        </div>
      )}

      <SalesReturnsModal isOpen={showSalesReturnsModal} onClose={() => setShowSalesReturnsModal(false)} currency={config.currency} catalog={itemsCatalog} onReturnComplete={() => {}} />
      <RecallRepairJobModal isOpen={showJobRecallModal} onClose={() => setShowJobRecallModal(false)} jobs={jobs} onSelectJob={handleRecallJob} currency={config.currency} />
      <QuickAddCustomerModal isOpen={showQuickAddCustomerModal} onClose={() => setShowQuickAddCustomerModal(false)} token={token} currency={config.currency} onCustomerAdded={() => {}} />
      <ViewOnlyInvoiceModal isOpen={showViewOnlyModal} invoice={viewOnlyInvoiceData} onClose={() => setShowViewOnlyModal(false)} currency={config.currency} shopName={config.shopName} onUnlockInvoice={() => {}} />
    </div>
  );
};