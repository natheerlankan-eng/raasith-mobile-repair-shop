import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Smartphone,
  Sparkles,
  Check,
  Trash2,
  X,
  CreditCard
} from 'lucide-react';
import { AppNotification, StaffUser, RepairJob } from '../types.ts';
import { playNotificationChime } from '../utils/audioChime.ts';

interface NotificationCenterProps {
  staffUser: StaffUser | null;
  token?: string | null;
  onRecallJobToPOS?: (jobId: number) => void;
  onOpenJobSheet?: (jobId: number) => void;
  jobs?: RepairJob[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  staffUser,
  token,
  onRecallJobToPOS,
  onOpenJobSheet,
  jobs = [],
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_sound_alerts') !== 'false';
    } catch {
      return true;
    }
  });
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<any>(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pos_sound_alerts', String(next));
      } catch {}
      return next;
    });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch((err) => console.error('Failed to load initial notifications:', err));
  }, []);

  const userRole = staffUser?.role?.toLowerCase() || 'cashier';

  // Role-targeted notification filter:
  // - Technician: sees new job assignments (targetRole === 'Technician' or assigned to them)
  // - Cashier: sees jobs ready to collect for billing & pickup (targetRole === 'Cashier' or type === 'job_ready_to_collect')
  // - Admin: sees all shop notifications
  const roleNotifications = notifications.filter((notif) => {
    if (userRole === 'admin') return true;
    if (userRole === 'technician') {
      return (
        notif.targetRole === 'Technician' ||
        notif.type === 'new_job_assigned' ||
        (notif.assignedTechnician && staffUser?.name && notif.assignedTechnician.toLowerCase() === staffUser.name.toLowerCase())
      );
    }
    if (userRole === 'cashier') {
      return notif.targetRole === 'Cashier' || notif.type === 'job_ready_to_collect';
    }
    return true;
  });

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  // Connect to SSE stream for zero-delay cross-device push notifications
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync' && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          return;
        }

        // New real-time alert arrived!
        const newNotif: AppNotification = data;
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotif.id);
          if (exists) return prev;
          return [newNotif, ...prev.slice(0, 59)];
        });

        // Only trigger audio chime & toast banner if alert is relevant to current user role
        const isTargeted =
          userRole === 'admin' ||
          (userRole === 'technician' &&
            (newNotif.targetRole === 'Technician' ||
              newNotif.type === 'new_job_assigned' ||
              (newNotif.assignedTechnician && staffUser?.name && newNotif.assignedTechnician.toLowerCase() === staffUser.name.toLowerCase()))) ||
          (userRole === 'cashier' && (newNotif.targetRole === 'Cashier' || newNotif.type === 'job_ready_to_collect'));

        if (isTargeted) {
          if (soundEnabled) {
            playNotificationChime();
          }

          // Show prominent toast alert banner
          setActiveToast(newNotif);
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setActiveToast(null);
          }, 8000);
        }
      } catch (e) {
        // Ping or format error
      }
    };

    eventSource.onerror = () => {
      // Browser will auto-reconnect SSE automatically
    };

    return () => {
      eventSource.close();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [soundEnabled, userRole, staffUser?.name]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    handleMarkAsRead(notif.id);
    setIsOpen(false);
    setActiveToast(null);

    if (notif.type === 'job_ready_to_collect' && onRecallJobToPOS) {
      onRecallJobToPOS(notif.jobId);
    } else if (notif.type === 'new_job_assigned' && onOpenJobSheet) {
      onOpenJobSheet(notif.jobId);
    } else if (onRecallJobToPOS) {
      onRecallJobToPOS(notif.jobId);
    }
  };

  // Helper for human-friendly time elapsed
  const formatTimeElapsed = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toast Alert Banner (Appears on top when real-time event triggers) */}
      {activeToast && (
        <div className="fixed top-3 right-4 z-70 max-w-sm w-full bg-[#1c1c1e] border-2 border-emerald-500/70 shadow-2xl rounded-2xl p-3.5 text-white animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${activeToast.type === 'job_ready_to_collect' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'}`}>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-jb text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {activeToast.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono-jb">
                  {formatTimeElapsed(activeToast.createdAt)}
                </span>
              </div>

              <p className="text-xs text-slate-200 font-medium mt-1 leading-snug">
                {activeToast.message}
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNotificationClick(activeToast)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono-jb text-[11px] font-bold rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{activeToast.type === 'job_ready_to_collect' ? 'Recall & Settle in POS' : 'Open Job Sheet'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 bg-[#09153a] hover:bg-[#12225a] border border-blue-500/30 rounded-xl text-blue-200 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-inner"
        title="Notifications Center"
        aria-label="Open Notifications"
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />

        {/* Unread badge counter (e.g. 🔴 3) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 min-w-5 h-5 rounded-full bg-red-600 text-white font-mono-jb font-black text-[10px] flex items-center justify-center border-2 border-[#09153a] shadow-lg shadow-red-600/40 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel / Drawer */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-60 w-84 sm:w-96 bg-[#161618] border border-[rgba(248,247,244,0.15)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-[#1c1c1e] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h4 className="font-oswald text-sm uppercase tracking-wider text-white font-bold">
                Notification Center
              </h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono-jb text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Chime Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={soundEnabled ? 'Alert Chime Sound: ON' : 'Alert Chime Sound: MUTED'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-mono-jb text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60 font-mono-jb">
            {roleNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <span>
                  {userRole === 'technician'
                    ? 'No repair job alerts for your bench yet.'
                    : 'No alerts yet. Notifications between Cashier & Technician will appear here live.'}
                </span>
              </div>
            ) : (
              roleNotifications.map((notif) => {
                const isReady = notif.type === 'job_ready_to_collect';
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 transition-all cursor-pointer hover:bg-slate-800/40 flex items-start gap-3 relative ${
                      !notif.read ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-4 left-1.5" />
                    )}

                    {/* Type Icon */}
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isReady
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {isReady ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                    </div>

                    {/* Notification content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                          Job #{notif.jobNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatTimeElapsed(notif.createdAt)}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 font-sans font-medium line-clamp-2">
                        {notif.message}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 truncate">
                          Customer: <strong className="text-white">{notif.customerName}</strong>
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {notif.status}
                        </span>
                      </div>

                      {/* Quick action button */}
                      <div className="pt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300">
                          {isReady ? (
                            <>
                              <CreditCard className="w-3 h-3 text-emerald-400" />
                              <span>Click to Recall & Settle in POS →</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3 text-purple-400" />
                              <span>Click to Open Job Sheet Details →</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#1c1c1e] px-4 py-2 text-center border-t border-slate-800 text-[10px] text-slate-500 font-mono-jb flex items-center justify-between">
            <span>Real-time WebSocket/SSE Active</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400">Live Sync</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
