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
  MapPin,
  Loader2,
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerAccountRecord | null>(null);

  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addCreditLimit, setAddCreditLimit] = useState<number | ''>(50000);
  const [addOpeningBal, setAddOpeningBal] = useState<number | ''>('');
  const [addOpeningType, setAddOpeningType] = useState<'None' | 'Advance' | 'Credit'>('None');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(50000);
  const [editCreditDue, setEditCreditDue] = useState<number>(0);
  const [editAdvanceBalance, setEditAdvanceBalance] = useState<number>(0);
  const [submittingEdit, setSubmittingEdit] = useState(false);

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

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, '');
    const phoneDigits = (c.phoneNumber || '').replace(/\D/g, '');

    const matchesText =
      c.customerName.toLowerCase().includes(q) ||
      (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q));

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

  const totalCustomers = customers.length;
  const totalCreditDue = customers.reduce((acc, c) => acc + (c.creditDue || 0), 0);
  const totalAdvanceBalances = customers.reduce((acc, c) => acc + (c.advanceBalance || 0), 0);
  const totalCreditLines = customers.reduce((acc, c) => acc + (c.creditLimit || 50000), 0);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden select-none">
      
      {/* 1. TOP STATS & METRICS BAR (100% SILVER THEME) */}
      <div className="bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 border-b border-slate-400 p-3.5 sm:px-6 shrink-0 shadow-lg space-y-3 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-500 flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                  Customer Management Console
                </h1>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold font-mono-jb">
                  LEDGER & CREDIT LINES
                </span>
              </div>
              <p className="font-mono-jb text-[11px] text-slate-700 font-bold uppercase">
                Client Accounts &bull; Advance Deposits &bull; Debtor Outstanding &bull; Batch CSV Import
              </p>
            </div>
          </div>

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
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>Bulk CSV Import</span>
            </button>

            <button
              onClick={exportCustomersCsv}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchCustomers}
              title="Refresh customer accounts"
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-jb">
          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Registered Clients</span>
              <span className="text-lg font-black text-slate-900">{totalCustomers}</span>
            </div>
            <Users className="w-5 h-5 text-slate-800 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Total Unpaid Credit (Debtor)</span>
              <span className="text-lg font-black text-slate-900">
                {currency} {totalCreditDue.toLocaleString()}
              </span>
            </div>
            <CreditCard className="w-5 h-5 text-slate-800 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Total Advance Deposits</span>
              <span className="text-lg font-black text-slate-900">
                {currency} {totalAdvanceBalances.toLocaleString()}
              </span>
            </div>
            <Wallet className="w-5 h-5 text-slate-800 opacity-80" />
          </div>

          <div className="bg-white/80 border border-slate-400 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase text-slate-700 font-bold block">Total Credit Lines</span>
              <span className="text-lg font-black text-slate-900">
                {currency} {totalCreditLines.toLocaleString()}
              </span>
            </div>
            <ShieldCheck className="w-5 h-5 text-slate-800 opacity-80" />
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2 flex items-center justify-between text-emerald-800 text-xs animate-fadeIn shrink-0 font-mono-jb">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 font-bold">&times;</button>
        </div>
      )}

      {/* SEARCH & FILTER CONTROLS */}
      <div className="bg-white border-b border-slate-300 p-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs shadow-xs font-mono-jb">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone number, location..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-500 shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-700" />
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
                  ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-500'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOMER TABLE SECTION - INVENTORY EXACT FONT & DESIGN */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-100 font-pos-table">
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-slate-900">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-200 text-slate-800 uppercase text-xs font-bold tracking-wider border-b border-slate-300">
                <th className="py-3 px-4 text-center w-14 border-r border-slate-300">#</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">Customer Name & Phone</th>
                <th className="py-3 px-4 text-left border-r border-slate-300">Address / Area</th>
                <th className="py-3 px-4 text-right border-r border-slate-300">Credit Limit</th>
                <th className="py-3 px-4 text-right border-r border-slate-300">Credit Due (Debt)</th>
                <th className="py-3 px-4 text-right border-r border-slate-300">Advance Deposit</th>
                <th className="py-3 px-4 text-center border-r border-slate-300 w-24">Repairs</th>
                <th className="py-3 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium text-xs">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-700 mb-2" />
                    <span>Loading customer accounts from ledger...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-700" />
                    <p className="text-sm font-bold text-slate-700">No customers found</p>
                    <p className="text-xs text-slate-500 mt-1">
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
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{cust.customerName}</span>
                          {isOverLimit && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-bold">
                              LIMIT EXCEEDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-700 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{cust.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs border-r border-slate-200">
                        {cust.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{cust.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                        {currency} {(cust.creditLimit || 50000).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold border-r border-slate-200">
                        {cust.creditDue > 0 ? (
                          <span className="font-black text-rose-600 text-sm">
                            {currency} {cust.creditDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">LKR 0 (Clear)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold border-r border-slate-200">
                        {cust.advanceBalance > 0 ? (
                          <span className="font-black text-slate-900 text-sm">
                            {currency} {cust.advanceBalance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                          {cust.totalRepairs || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onSelectCustomerForPOS && (
                            <button
                              type="button"
                              onClick={() => onSelectCustomerForPOS(cust)}
                              title="Load customer directly into POS Terminal"
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-colors cursor-pointer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onViewCustomerHistory && (
                            <button
                              type="button"
                              onClick={() => onViewCustomerHistory(cust.phoneNumber, cust.customerName, cust.address)}
                              title="View past repair slips & device history"
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-800 hover:text-white border border-slate-300 transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(cust)}
                            title="Edit Customer Profile & Balances"
                            className="p-1.5 rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-600 hover:text-white border border-purple-300 transition-colors cursor-pointer"
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
      </div>

      {/* Add / Edit Modals can be included here if needed as previously defined */}
    </div>
  );
};