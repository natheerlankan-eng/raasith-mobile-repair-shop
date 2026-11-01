import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Phone,
  UserPlus,
  Edit3,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Wallet,
  ShieldCheck,
  Check,
  History,
  ShoppingCart,
  ArrowRight,
  Filter,
  RefreshCw,
  Building,
  MapPin,
  HelpCircle,
} from 'lucide-react';

export interface CustomerAccountRecord {
  id: number;
  customerName: string;
  phoneNumber: string;
  address?: string | null;
  creditLimit: number;
  creditDue: number;
  advanceBalance: number;
  totalPurchases: number;
  totalRepairs?: number;
  availableCredit?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomersViewProps {
  token: string | null;
  currency?: string;
  onSelectCustomerForPOS?: (customer: { phoneNumber: string; customerName: string; creditDue?: number; advanceBalance?: number }) => void;
  onViewCustomerHistory?: (phone: string, name: string, address?: string | null) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  token,
  currency = 'LKR',
  onSelectCustomerForPOS,
  onViewCustomerHistory,
}) => {
  const [customers, setCustomers] = useState<CustomerAccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'CreditDue' | 'Advance' | 'OverLimit'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add / Edit Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerAccountRecord | null>(null);

  // Form fields for Add Customer
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addCreditLimit, setAddCreditLimit] = useState<number | ''>(50000);
  const [addOpeningBal, setAddOpeningBal] = useState<number | ''>('');
  const [addOpeningType, setAddOpeningType] = useState<'None' | 'Advance' | 'Credit'>('None');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(50000);
  const [editCreditDue, setEditCreditDue] = useState<number>(0);
  const [editAdvanceBalance, setEditAdvanceBalance] = useState<number>(0);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Bulk Import Modal States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importingBulk, setImportingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = () => {
    return token || localStorage.getItem('raasith_staff_token') || '';
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer-accounts', {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomers(data);
        }
      }
    } catch (err) {
      console.error('Failed to load customer accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. ADD NEW CUSTOMER SUBMIT
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPhone.trim()) {
      setFormError('Customer Name and Phone Number are required');
      return;
    }

    setSubmittingAdd(true);
    setFormError(null);

    try {
      const res = await fetch('/api/customer-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          customerName: addName.trim(),
          phoneNumber: addPhone.trim(),
          address: addAddress.trim() || undefined,
          creditLimit: typeof addCreditLimit === 'number' ? addCreditLimit : 50000,
          openingBalance: typeof addOpeningBal === 'number' ? addOpeningBal : 0,
          openingBalanceType: addOpeningType !== 'None' ? addOpeningType : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      showToast(`Customer "${data.customerName}" created successfully!`);
      setShowAddModal(false);
      resetAddForm();
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Error creating customer');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const resetAddForm = () => {
    setAddName('');
    setAddPhone('');
    setAddAddress('');
    setAddCreditLimit(50000);
    setAddOpeningBal('');
    setAddOpeningType('None');
    setFormError(null);
  };

  // 2. EDIT CUSTOMER
  const handleStartEdit = (c: CustomerAccountRecord) => {
    setEditingCustomer(c);
    setEditName(c.customerName);
    setEditPhone(c.phoneNumber);
    setEditAddress(c.address || '');
    setEditCreditLimit(c.creditLimit || 50000);
    setEditCreditDue(c.creditDue || 0);
    setEditAdvanceBalance(c.advanceBalance || 0);
    setFormError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setSubmittingEdit(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/customer-accounts/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          customerName: editName.trim(),
          phoneNumber: editPhone.trim(),
          address: editAddress.trim() || null,
          creditLimit: editCreditLimit,
          creditDue: editCreditDue,
          advanceBalance: editAdvanceBalance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      showToast(`Updated profile for "${data.customerName}"!`);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Error updating customer');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 3. BULK CSV IMPORT HANDLERS
  const parseCsvText = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const parseCsvLine = (lineStr: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < lineStr.length; i++) {
        const char = lineStr[i];
        if (char === '"') {
          if (inQuotes && lineStr[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseCsvLine(lines[0]).map((h) =>
      h.trim().replace(/^["']|["']$/g, '').toLowerCase().replace(/[\s_-]+/g, '')
    );
    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};

      headers.forEach((h, index) => {
        const val = values[index] !== undefined ? values[index].trim().replace(/^["']|["']$/g, '') : '';
        row[h] = val;
      });

      const phone = (
        row['phone'] ||
        row['phonenumber'] ||
        row['contact'] ||
        row['contactno'] ||
        row['mobile'] ||
        ''
      ).replace(/\.0+$/, '').trim();

      const name = (
        row['name'] ||
        row['customername'] ||
        row['customer'] ||
        ''
      ).trim();

      const address = (
        row['address'] ||
        row['city'] ||
        row['location'] ||
        ''
      ).trim();

      const parseNum = (val: string | undefined, fallback: number) => {
        if (!val || val === '') return fallback;
        const n = Math.round(Number(String(val).replace(/[^0-9.-]+/g, '')));
        return isNaN(n) ? fallback : n;
      };

      const creditLimit = parseNum(row['creditlimit'] || row['limit'], 50000);
      const creditDue = parseNum(row['creditdue'] || row['balance'] || row['due'], 0);
      const advanceBalance = parseNum(row['advancebalance'] || row['advance'], 0);

      if (phone && name) {
        results.push({
          phoneNumber: phone,
          customerName: name,
          address: address || undefined,
          creditLimit,
          creditDue,
          advanceBalance,
        });
      }
    }
    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkCsvText(text);
      const parsed = parseCsvText(text);
      setParsedRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (parsedRows.length === 0) {
      setFormError('Please parse at least 1 valid customer row before submitting.');
      return;
    }

    setImportingBulk(true);
    setFormError(null);

    try {
      const res = await fetch('/api/customer-accounts/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ records: parsedRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bulk import failed');
      }

      const msg = data.errors && data.errors.length > 0
        ? `Bulk Import Finished: Created ${data.createdCount}, Updated ${data.updatedCount} records (${data.errors.length} skipped).`
        : `Bulk Import Complete: Created ${data.createdCount}, Updated ${data.updatedCount} records!`;

      showToast(msg);
      setShowBulkModal(false);
      setBulkCsvText('');
      setParsedRows([]);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Error executing bulk import');
    } finally {
      setImportingBulk(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleCsv = `Name,Phone,Address,CreditLimit,CreditDue,AdvanceBalance\nMohamed Rizwan,0771122334,Main St Akkaraipattu,50000,0,1500\nFarook Trading,0765544332,Kalmunai Town,100000,12000,0\nSajith Silva,0712233445,Ampara Road,25000,0,0`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customer_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCustomersCsv = () => {
    let csv = 'ID,Name,Phone,Address,CreditLimit,CreditDue,AdvanceBalance,TotalPurchases\n';
    customers.forEach((c) => {
      csv += `${c.id},"${c.customerName}","${c.phoneNumber}","${c.address || ''}",${c.creditLimit || 50000},${c.creditDue || 0},${c.advanceBalance || 0},${c.totalPurchases || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported customer directory CSV file!');
  };

  // Filtered customer list with robust mobile number & name search
  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, '');
    const phoneDigits = (c.phoneNumber || '').replace(/\D/g, '');

    // Match name or address
    const matchesText =
      c.customerName.toLowerCase().includes(q) ||
      (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q));

    // Match mobile number digits (ignoring spaces, hyphens, prefixes like 0 or +94)
    const matchesPhone =
      (qDigits.length >= 2 && phoneDigits.includes(qDigits)) ||
      (qDigits.length >= 3 && phoneDigits.replace(/^94/, '0').includes(qDigits)) ||
      (qDigits.length >= 3 && phoneDigits.includes(qDigits.replace(/^0/, '')));

    if (!matchesText && !matchesPhone) return false;

    if (filterType === 'CreditDue') return c.creditDue > 0;
    if (filterType === 'Advance') return c.advanceBalance > 0;
    if (filterType === 'OverLimit') return c.creditDue >= (c.creditLimit || 50000);
    return true;
  });

  // Aggregated Summary Metrics
  const totalCustomers = customers.length;
  const totalCreditDue = customers.reduce((acc, c) => acc + (c.creditDue || 0), 0);
  const totalAdvanceBalances = customers.reduce((acc, c) => acc + (c.advanceBalance || 0), 0);
  const totalCreditLines = customers.reduce((acc, c) => acc + (c.creditLimit || 50000), 0);

  return (
    <div className="flex flex-col h-full bg-[#070e28] text-[#f8fafc] overflow-hidden select-none font-mono-jb">
      {/* 1. TOP STATS & METRICS BAR */}
      <div className="bg-[#0a1538] border-b border-[rgba(96,165,250,0.2)] p-3.5 sm:px-6 shrink-0 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/30">
              <Users className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  Customer Management Console
                </h1>
                <span className="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-500/30 text-[10px] text-cyan-300 font-bold">
                  LEDGER & CREDIT LINES
                </span>
              </div>
              <p className="text-[11px] text-blue-200/60 uppercase">
                Client Accounts &bull; Advance Deposits &bull; Debtor Outstanding &bull; Batch CSV Import
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Add Customer</span>
            </button>

            <button
              onClick={() => {
                setFormError(null);
                setParsedRows([]);
                setBulkCsvText('');
                setShowBulkModal(true);
              }}
              className="px-3.5 py-2 bg-[#0e1d48] hover:bg-[#152a62] border border-cyan-500/40 text-cyan-200 hover:text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bulk CSV Import</span>
            </button>

            <button
              onClick={exportCustomersCsv}
              className="px-3 py-2 bg-[#0e1d48] hover:bg-[#152a62] border border-blue-500/30 text-blue-200 hover:text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchCustomers}
              title="Refresh customer accounts"
              className="p-2 bg-[#0e1d48] hover:bg-[#152a62] border border-blue-500/30 text-blue-200 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time Glowing Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#0c1c45] border border-blue-500/30 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-blue-300 font-bold block">Registered Clients</span>
              <span className="text-lg font-black text-white">{totalCustomers}</span>
            </div>
            <Users className="w-5 h-5 text-blue-400 opacity-60" />
          </div>

          <div className="bg-[#1c1214] border border-rose-500/40 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-rose-300 font-bold block">Total Unpaid Credit (Debtor)</span>
              <span className="text-lg font-black text-rose-400">
                {currency} {totalCreditDue.toLocaleString()}
              </span>
            </div>
            <CreditCard className="w-5 h-5 text-rose-400 opacity-60" />
          </div>

          <div className="bg-[#091b1f] border border-cyan-500/40 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-cyan-300 font-bold block">Total Advance Deposits</span>
              <span className="text-lg font-black text-cyan-300">
                {currency} {totalAdvanceBalances.toLocaleString()}
              </span>
            </div>
            <Wallet className="w-5 h-5 text-cyan-400 opacity-60" />
          </div>

          <div className="bg-[#0e173d] border border-indigo-500/30 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-indigo-300 font-bold block">Total Credit Lines</span>
              <span className="text-lg font-black text-indigo-200">
                {currency} {totalCreditLines.toLocaleString()}
              </span>
            </div>
            <ShieldCheck className="w-5 h-5 text-indigo-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* TOAST NOTICE BANNER */}
      {toastMessage && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2 flex items-center justify-between text-emerald-300 text-xs animate-fadeIn shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-[#081232] border-b border-blue-500/20 p-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone number, location..."
              className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-black placeholder:text-slate-500 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-blue-300/70 uppercase font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>Filter:</span>
          </span>
          {[
            { id: 'All', label: `All (${totalCustomers})` },
            { id: 'CreditDue', label: `With Credit Due (${customers.filter((c) => c.creditDue > 0).length})` },
            { id: 'Advance', label: `With Advance (${customers.filter((c) => c.advanceBalance > 0).length})` },
            { id: 'OverLimit', label: `Near/Over Limit (${customers.filter((c) => c.creditDue >= (c.creditLimit || 50000)).length})` },
          ].map((flt) => (
            <button
              key={flt.id}
              onClick={() => setFilterType(flt.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === flt.id
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-cyan-400'
                  : 'bg-[#0a1538] text-blue-200/70 hover:text-white hover:bg-blue-600/20'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CUSTOMER ACCOUNTS TABLE */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0b1b48] text-cyan-300 uppercase text-[10px] font-bold border-b border-blue-500/30">
              <th className="py-2.5 px-3 text-left w-12">#</th>
              <th className="py-2.5 px-3 text-left">Customer Name & Phone</th>
              <th className="py-2.5 px-3 text-left">Address / Area</th>
              <th className="py-2.5 px-3 text-right w-28">Credit Limit</th>
              <th className="py-2.5 px-3 text-right w-32">Credit Due (Debt)</th>
              <th className="py-2.5 px-3 text-right w-32">Advance Deposit</th>
              <th className="py-2.5 px-3 text-center w-24">Repairs</th>
              <th className="py-2.5 px-3 text-center w-36 no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-500/10">
            {loading && customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-blue-300">
                  <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading customer accounts from ledger...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-blue-300/50">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-cyan-400" />
                  <p className="text-sm font-bold text-white">No customers found</p>
                  <p className="text-xs text-blue-200/60 mt-1">
                    Try adjusting your search criteria or click "+ Add Customer" above.
                  </p>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((cust, idx) => {
                const isOverLimit = cust.creditDue >= (cust.creditLimit || 50000) && cust.creditDue > 0;
                return (
                  <tr
                    key={cust.id}
                    className="hover:bg-blue-600/15 transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-blue-300/50 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{cust.customerName}</span>
                        {isOverLimit && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                            LIMIT EXCEEDED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-cyan-300 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-blue-400" />
                        <span>{cust.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-blue-200/70 text-xs">
                      {cust.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{cust.address}</span>
                        </div>
                      ) : (
                        <span className="text-blue-300/40 italic">Not specified</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-300">
                      {currency} {(cust.creditLimit || 50000).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {cust.creditDue > 0 ? (
                        <span className="font-black text-rose-400 text-sm">
                          {currency} {cust.creditDue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-emerald-400/80 font-bold">LKR 0 (Clear)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {cust.advanceBalance > 0 ? (
                        <span className="font-black text-cyan-300 text-sm">
                          {currency} {cust.advanceBalance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-blue-300/40">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-200 border border-blue-500/20 font-bold text-[11px]">
                        {cust.totalRepairs || 0}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        {/* Load into POS */}
                        {onSelectCustomerForPOS && (
                          <button
                            type="button"
                            onClick={() => onSelectCustomerForPOS(cust)}
                            title="Load customer directly into POS Terminal"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View History */}
                        {onViewCustomerHistory && (
                          <button
                            type="button"
                            onClick={() => onViewCustomerHistory(cust.phoneNumber, cust.customerName, cust.address)}
                            title="View past repair slips & device history"
                            className="p-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-colors cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Customer */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cust)}
                          title="Edit Customer Profile & Balances"
                          className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/30 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 4. ADD NEW CUSTOMER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-emerald-500/50 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono-jb">
            <div className="bg-gradient-to-r from-[#0a1844] to-[#0c1f54] border-b border-blue-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    Add New Customer
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    Register Client Profile, Credit Line & Opening Deposit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-blue-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Full Customer Name"
                    className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="077xxxxxxx"
                    className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                  Address / City Area
                </label>
                <input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  placeholder="Akkaraipattu / Kalmunai / Ampara..."
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-blue-100 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                  Credit Limit ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={addCreditLimit}
                  onChange={(e) => setAddCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="50000"
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold text-indigo-300 outline-none focus:border-cyan-400"
                />
              </div>

              {/* Opening Balance */}
              <div className="p-3 bg-[#050c22] rounded-2xl border border-blue-500/25 space-y-2">
                <span className="text-[10px] uppercase text-cyan-300 font-bold block">
                  Opening Ledger Balance Setup (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] uppercase text-blue-300/70 block mb-0.5">Balance Type</label>
                    <select
                      value={addOpeningType}
                      onChange={(e) => setAddOpeningType(e.target.value as any)}
                      className="w-full bg-[#0a1538] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="None">No Opening Balance (0)</option>
                      <option value="Advance">Advance Deposit In (+)</option>
                      <option value="Credit">Previous Credit Due (-)</option>
                    </select>
                  </div>
                  {addOpeningType !== 'None' && (
                    <div>
                      <label className="text-[9px] uppercase text-blue-300/70 block mb-0.5">
                        Amount ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={addOpeningBal}
                        onChange={(e) => setAddOpeningBal(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 5000"
                        className="w-full bg-[#0a1538] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#0e1d48] hover:bg-[#14265c] text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 font-oswald transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{submittingAdd ? 'Saving...' : 'Create Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EDIT CUSTOMER PROFILE & CREDIT LIMIT MODAL */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-purple-500/50 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono-jb">
            <div className="bg-gradient-to-r from-[#0a1844] to-[#140b28] border-b border-purple-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    Edit Customer Account
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    ID #{editingCustomer.id} &bull; {editingCustomer.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-blue-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                  Address / City Area
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-blue-100 outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                  Credit Limit Line ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(Number(e.target.value) || 0)}
                  className="w-full bg-[#050c22] border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold text-indigo-300 outline-none focus:border-purple-400"
                />
              </div>

              {/* Adjust Balances */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] uppercase text-rose-300 font-bold block mb-1">
                    Credit Due ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editCreditDue}
                    onChange={(e) => setEditCreditDue(Number(e.target.value) || 0)}
                    className="w-full bg-[#050c22] border border-rose-500/40 rounded-xl px-3 py-2 text-xs font-black text-rose-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-cyan-300 font-bold block mb-1">
                    Advance Balance ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editAdvanceBalance}
                    onChange={(e) => setEditAdvanceBalance(Number(e.target.value) || 0)}
                    className="w-full bg-[#050c22] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-black text-cyan-300 outline-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-2.5 bg-[#0e1d48] hover:bg-[#14265c] text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 font-oswald transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{submittingEdit ? 'Updating...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. BATCH CSV / EXCEL BULK IMPORT MODAL */}
      {/* ========================================================================= */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#081335] border-2 border-cyan-500/50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-mono-jb">
            <div className="bg-gradient-to-r from-[#0a1844] to-[#0b244d] border-b border-cyan-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    Customer Bulk Import
                  </h3>
                  <p className="text-[11px] text-blue-200/70">
                    Upload or Paste CSV / Excel Data to Add / Update in Batch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-blue-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Instructions and Download Template */}
              <div className="p-3.5 bg-[#050c22] rounded-2xl border border-cyan-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-cyan-300 font-bold block mb-0.5">Format Guidelines:</span>
                  <p className="text-[11px] text-blue-200/70">
                    Required headers: <code>Name, Phone, Address, CreditLimit, CreditDue, AdvanceBalance</code>. Existing phone numbers will be updated automatically!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Upload File Input */}
              <div>
                <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                  Upload CSV File:
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-blue-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* Or Paste CSV Raw Text */}
              <div>
                <label className="text-[10px] uppercase text-blue-200 font-bold block mb-1">
                  Or Paste Raw CSV Text:
                </label>
                <textarea
                  rows={4}
                  value={bulkCsvText}
                  onChange={(e) => {
                    setBulkCsvText(e.target.value);
                    const parsed = parseCsvText(e.target.value);
                    setParsedRows(parsed);
                  }}
                  placeholder="Name,Phone,Address,CreditLimit,CreditDue,AdvanceBalance&#10;Fazil,0771234567,Akkaraipattu,50000,0,1000"
                  className="w-full p-2.5 bg-[#050c22] border border-blue-500/30 rounded-xl text-xs text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Parsed {parsedRows.length} Valid Records Ready to Import:</span>
                  </span>
                  <div className="max-h-36 overflow-y-auto border border-blue-500/20 rounded-xl bg-[#050c22]">
                    <table className="w-full text-[11px] border-collapse">
                      <thead className="bg-[#0a1538] text-cyan-300 sticky top-0">
                        <tr>
                          <th className="p-1.5 text-left">Name</th>
                          <th className="p-1.5 text-left">Phone</th>
                          <th className="p-1.5 text-left">Address</th>
                          <th className="p-1.5 text-right">Limit</th>
                          <th className="p-1.5 text-right">Due</th>
                          <th className="p-1.5 text-right">Adv</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-500/10 text-blue-100">
                        {parsedRows.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td className="p-1.5 font-bold">{r.customerName}</td>
                            <td className="p-1.5">{r.phoneNumber}</td>
                            <td className="p-1.5 truncate max-w-[100px]">{r.address || '-'}</td>
                            <td className="p-1.5 text-right">{r.creditLimit}</td>
                            <td className="p-1.5 text-right text-rose-300">{r.creditDue}</td>
                            <td className="p-1.5 text-right text-cyan-300">{r.advanceBalance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 10 && (
                    <p className="text-[10px] text-blue-300/60 italic text-right">
                      + {parsedRows.length - 10} more records in file
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-2.5 bg-[#0e1d48] hover:bg-[#14265c] text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importingBulk || parsedRows.length === 0}
                  onClick={handleBulkSubmit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-1.5 font-oswald transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>{importingBulk ? 'Importing Batch...' : `Import ${parsedRows.length} Customers`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
