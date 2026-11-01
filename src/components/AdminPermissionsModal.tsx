import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  X,
  Check,
  AlertCircle,
  Lock,
  Unlock,
  Key,
  Users,
  Save,
  HelpCircle
} from 'lucide-react';
import { StaffUser, StaffRole, StaffPermissions, DEFAULT_ROLE_PERMISSIONS } from '../types.ts';
import { useShop } from '../context/ShopContext.tsx';

interface AdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  currentStaffUser: StaffUser | null;
  onStaffUpdated?: () => void;
}

const PERMISSION_CONFIG: {
  key: keyof StaffPermissions;
  label: string;
  desc: string;
}[] = [
  {
    key: 'create_jobs',
    label: 'Create Job Orders',
    desc: 'Intake new devices, create repair tickets & print initial job slips.',
  },
  {
    key: 'process_payments',
    label: 'POS & Payment Settlement',
    desc: 'Close transactions, collect counter cash/cards and issue receipts.',
  },
  {
    key: 'send_messages',
    label: 'Customer Messaging (SMS/WA)',
    desc: 'Send WhatsApp & carrier SMS status updates to customers.',
  },
  {
    key: 'edit_jobs',
    label: 'Edit & Manage Job Records',
    desc: 'Modify device details, pricing, spare parts, and delete records.',
  },
  {
    key: 'view_reports',
    label: 'Financial Reports & Analytics',
    desc: 'View daily revenue summary, cash drawer & technician commissions.',
  },
];

export const AdminPermissionsModal: React.FC<AdminPermissionsModalProps> = ({
  isOpen,
  onClose,
  token,
  currentStaffUser,
  onStaffUpdated,
}) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || 'RAASITH MOBILE';
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New staff modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('Cashier');
  const [submittingNew, setSubmittingNew] = useState(false);

  // Saving states per user ID
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      fetchStaffList();
    }
  }, [isOpen]);

  const fetchStaffList = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/staff-users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load staff members');
      }
      const data = await res.json();
      setStaffList(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error fetching staff users.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (userId: number, permKey: keyof StaffPermissions) => {
    setStaffList((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        const currentPerms = user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
        return {
          ...user,
          permissions: {
            ...currentPerms,
            [permKey]: !currentPerms[permKey],
          },
        };
      })
    );
  };

  const handleRoleChange = (userId: number, newRole: StaffRole) => {
    setStaffList((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole];
        return {
          ...user,
          role: newRole,
          permissions: { ...defaultPerms },
        };
      })
    );
  };

  const handleSaveUserPermissions = async (user: StaffUser) => {
    if (!token || !user.id) return;
    setSavingUserId(user.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/staff-users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: user.role,
          permissions: user.permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save permissions');
      }

      const updated = await res.json();
      setStaffList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setSuccessMsg(`Permissions saved successfully for ${user.name} (${user.role}).`);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user permissions.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newEmail.trim() || !newName.trim()) return;

    setSubmittingNew(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/staff-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          name: newName.trim(),
          role: newRole,
          permissions: DEFAULT_ROLE_PERMISSIONS[newRole],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create staff member');
      }

      const created = await res.json();
      setStaffList((prev) => [created, ...prev]);
      setShowAddUser(false);
      setNewEmail('');
      setNewName('');
      setNewRole('Cashier');
      setSuccessMsg(`Staff member ${created.name} added as ${created.role}.`);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create staff member.');
    } finally {
      setSubmittingNew(false);
    }
  };

  const handleDeleteStaff = async (userId: number, userName: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to remove staff member "${userName}"?`)) return;

    try {
      const res = await fetch(`/api/staff-users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove staff member');
      }

      setStaffList((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMsg(`Staff member "${userName}" removed.`);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete staff member.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print">
      <div className="bg-[#1c1c1e] text-[#f8f7f4] rounded-2xl shadow-2xl border border-[rgba(248,247,244,0.15)] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#111113] border-b border-[rgba(248,247,244,0.1)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-oswald text-lg sm:text-xl uppercase tracking-wider font-bold text-[#f8f7f4]">
                  ADMIN PERMISSIONS & ACCESS CONTROL
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] text-[10px] font-mono-jb uppercase tracking-wider border border-[#ef4444]/30 font-bold">
                  RBAC
                </span>
              </div>
              <p className="font-mono-jb text-xs text-[rgba(248,247,244,0.5)]">
                Manage Roles (Admin, Cashier, Technician) & Individual Privilege Toggles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddUser(true)}
              className="px-3.5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-xs font-oswald uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-red-600/30"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Staff</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-[#1c1c1e] text-[rgba(248,247,244,0.6)] hover:text-[#f8f7f4] hover:bg-[#252528] flex items-center justify-center transition-colors cursor-pointer border border-[rgba(248,247,244,0.1)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Roles Legend Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#111113] p-3.5 rounded-xl border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="font-oswald uppercase tracking-wider text-xs font-bold text-red-400">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-[rgba(248,247,244,0.6)] font-mono-jb leading-relaxed">
                Full master authority. Can manage users, edit jobs, process payments & access financial analytics.
              </p>
            </div>

            <div className="bg-[#111113] p-3.5 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-oswald uppercase tracking-wider text-xs font-bold text-emerald-400">
                  Cashier
                </span>
              </div>
              <p className="text-[11px] text-[rgba(248,247,244,0.6)] font-mono-jb leading-relaxed">
                Front desk counter desk. Can intake new repair jobs, process POS settlements, and send customer notices.
              </p>
            </div>

            <div className="bg-[#111113] p-3.5 rounded-xl border border-sky-500/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-oswald uppercase tracking-wider text-xs font-bold text-sky-400">
                  Technician
                </span>
              </div>
              <p className="text-[11px] text-[rgba(248,247,244,0.6)] font-mono-jb leading-relaxed">
                Repair workbench. Can log diagnoses, assign spare parts, and update job status to Ready.
              </p>
            </div>
          </div>

          {/* Add Staff Form (inline drawer) */}
          {showAddUser && (
            <form
              onSubmit={handleCreateStaff}
              className="bg-[#111113] p-5 rounded-xl border border-[rgba(248,247,244,0.15)] space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-[rgba(248,247,244,0.08)] pb-2.5">
                <h4 className="font-oswald text-sm uppercase tracking-wider font-bold text-[#f8f7f4] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#ef4444]" />
                  <span>Register New Staff Member</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="text-xs text-[rgba(248,247,244,0.5)] hover:text-[#f8f7f4] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-jb">
                <div>
                  <label className="text-[10px] uppercase text-[rgba(248,247,244,0.5)] block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Kasun Silva"
                    className="w-full px-3 py-2 bg-[#1c1c1e] border border-[rgba(248,247,244,0.12)] rounded-lg text-xs text-[#f8f7f4] outline-none focus:border-[#ef4444]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-[rgba(248,247,244,0.5)] block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. kasun@raasithmobile.com"
                    className="w-full px-3 py-2 bg-[#1c1c1e] border border-[rgba(248,247,244,0.12)] rounded-lg text-xs text-[#f8f7f4] outline-none focus:border-[#ef4444]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-[rgba(248,247,244,0.5)] block mb-1">Base Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 bg-[#1c1c1e] border border-[rgba(248,247,244,0.12)] rounded-lg text-xs text-[#f8f7f4] outline-none focus:border-[#ef4444]"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Technician">Technician</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingNew}
                  className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white rounded-lg font-oswald text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  {submittingNew ? 'Saving...' : 'Add User'}
                </button>
              </div>
            </form>
          )}

          {/* Staff Members List & Permission Matrix */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-oswald text-sm uppercase tracking-wider font-bold text-[#f8f7f4]">
                Staff Members & Privilege Configuration ({staffList.length})
              </h3>
              <span className="text-xs font-mono-jb text-[rgba(248,247,244,0.5)]">
                Permissions take effect immediately
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono-jb text-[rgba(248,247,244,0.5)]">
                Loading staff users...
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono-jb text-[rgba(248,247,244,0.5)]">
                No staff users found.
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((user) => {
                  const role = user.role || 'Cashier';
                  const perms = user.permissions || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
                  const isCurrentLoggedIn = currentStaffUser?.email?.toLowerCase() === user.email.toLowerCase();
                  const isSaving = savingUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="bg-[#111113] rounded-xl border border-[rgba(248,247,244,0.1)] p-4 sm:p-5 space-y-4 transition-all"
                    >
                      {/* Top Row: User info & Role selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(248,247,244,0.06)] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#1c1c1e] border border-[rgba(248,247,244,0.12)] flex items-center justify-center font-mono-jb font-bold text-sm text-[#f8f7f4]">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#f8f7f4] text-sm">{user.name}</span>
                              {isCurrentLoggedIn && (
                                <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-mono-jb">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono-jb text-[rgba(248,247,244,0.5)]">
                              {user.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 font-mono-jb">
                          {/* Role Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[rgba(248,247,244,0.4)] uppercase">Role:</span>
                            <select
                              value={user.role}
                              onChange={(e) => user.id && handleRoleChange(user.id, e.target.value as StaffRole)}
                              className="px-2.5 py-1.5 bg-[#1c1c1e] border border-[rgba(248,247,244,0.15)] rounded-lg text-xs font-bold text-[#f8f7f4] outline-none focus:border-[#ef4444]"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Cashier">Cashier</option>
                              <option value="Technician">Technician</option>
                            </select>
                          </div>

                          {/* Save Button */}
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveUserPermissions(user)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-oswald uppercase tracking-wider font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                          </button>

                          {/* Delete user */}
                          {!isCurrentLoggedIn && user.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(user.id!, user.name)}
                              className="p-1.5 bg-[#1c1c1e] hover:bg-red-950/40 text-[rgba(248,247,244,0.5)] hover:text-red-400 rounded-lg border border-[rgba(248,247,244,0.1)] transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Permissions Toggles Grid */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono-jb uppercase text-[rgba(248,247,244,0.4)] block font-bold">
                          Assigned Privileges
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {PERMISSION_CONFIG.map(({ key, label, desc }) => {
                            const isAllowed = role.toLowerCase() === 'admin' ? true : Boolean(perms[key]);

                            return (
                              <label
                                key={key}
                                className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-all select-none ${
                                  isAllowed
                                    ? 'bg-[#1c1c1e] border-emerald-500/30 text-[#f8f7f4]'
                                    : 'bg-[#18181a]/40 border-[rgba(248,247,244,0.06)] text-[rgba(248,247,244,0.5)]'
                                } ${role.toLowerCase() === 'admin' ? 'opacity-80 cursor-default' : 'cursor-pointer hover:border-[rgba(248,247,244,0.2)]'}`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={role.toLowerCase() === 'admin'}
                                  checked={isAllowed}
                                  onChange={() => user.id && handleTogglePermission(user.id, key)}
                                  className="mt-0.5 w-4 h-4 rounded text-emerald-500 accent-emerald-500 shrink-0 cursor-pointer"
                                />
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                                    <span>{label}</span>
                                    {isAllowed ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[rgba(248,247,244,0.45)] leading-snug font-mono-jb">
                                    {desc}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#111113] border-t border-[rgba(248,247,244,0.1)] flex items-center justify-between text-xs font-mono-jb text-[rgba(248,247,244,0.4)] shrink-0">
          <div>
            <span>Protected RBAC Engine</span> &bull; <span>{activeShopName} Admin Console</span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-[#f8f7f4] cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
