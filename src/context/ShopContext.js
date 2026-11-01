import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

/**
 * Default Shop Profile Configuration
 * Used when no custom settings have been saved yet.
 */
export const DEFAULT_SHOP_PROFILE = {
  appTitle: 'RAASITH MOBILE · POS & Repair Shop',
  shopName: 'RAASITH MOBILE',
  branch: 'MAIN OUTLET AKKARAIPATTU',
  phone: '0672277996, 0752834443',
  address: 'Main Street, Akkaraipattu.',
  logoUrl: '/images/raasith_logo.png',
  outletName: 'Professional Mobile Phone Repairing Centre',
  currency: 'Rs',
};

const STORAGE_KEY = 'raasith_shop_profile';
const POS_CONFIG_KEY = 'raasith_pos_config';

/**
 * ShopContext definition
 */
export const ShopContext = createContext({
  shopProfile: DEFAULT_SHOP_PROFILE,
  loading: false,
  updateShopProfile: async () => {},
  resetToDefaults: async () => {},
});

/**
 * ShopProvider Component
 * 
 * Wraps the application to provide real-time shop branding state across all
 * components (Header, Dashboard Banner, POS Invoices, Print Previews, Job Slips).
 * 
 * Features:
 * - Real-time sync with Firebase Firestore (`settings/shop_profile`)
 * - Fallback to localStorage for offline reliability and instant initial paint
 * - Zero-latency optimistic UI updates: changes made in Settings reflect instantly
 * - Automatic document title synchronization
 */
export const ShopProvider = ({ children, token }) => {
  const [shopProfile, setShopProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        return { ...DEFAULT_SHOP_PROFILE, ...JSON.parse(savedProfile) };
      }

      // Check legacy posConfig for fallback values
      const legacyConfig = localStorage.getItem(POS_CONFIG_KEY);
      if (legacyConfig) {
        const parsed = JSON.parse(legacyConfig);
        return {
          ...DEFAULT_SHOP_PROFILE,
          shopName: parsed.shopName || DEFAULT_SHOP_PROFILE.shopName,
          outletName: parsed.outletName || DEFAULT_SHOP_PROFILE.outletName,
          phone: parsed.phone || DEFAULT_SHOP_PROFILE.phone,
          address: parsed.address || DEFAULT_SHOP_PROFILE.address,
          logoUrl: parsed.logoUrl || DEFAULT_SHOP_PROFILE.logoUrl,
          currency: parsed.currency || DEFAULT_SHOP_PROFILE.currency,
        };
      }
    } catch (e) {
      console.warn('Error reading stored shop profile:', e);
    }
    return DEFAULT_SHOP_PROFILE;
  });

  const [loading, setLoading] = useState(false);

  // Sync document title and meta branding dynamically
  useEffect(() => {
    if (shopProfile.appTitle) {
      document.title = shopProfile.appTitle;
    } else if (shopProfile.shopName) {
      document.title = `${shopProfile.shopName} · POS & Repair Shop`;
    }
  }, [shopProfile.appTitle, shopProfile.shopName]);

  // Synchronize from Firestore and API settings on mount & token changes
  useEffect(() => {
    let unsubscribeFirestore = null;

    // 1. Listen for real-time changes in Firestore (doc: settings/shop_profile)
    try {
      if (db) {
        const shopDocRef = doc(db, 'settings', 'shop_profile');
        unsubscribeFirestore = onSnapshot(
          shopDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const merged = {
                appTitle: data.appTitle || DEFAULT_SHOP_PROFILE.appTitle,
                shopName: data.shopName || DEFAULT_SHOP_PROFILE.shopName,
                branch: data.branch || DEFAULT_SHOP_PROFILE.branch,
                phone: data.phone || DEFAULT_SHOP_PROFILE.phone,
                address: data.address || DEFAULT_SHOP_PROFILE.address,
                logoUrl: data.logoUrl || DEFAULT_SHOP_PROFILE.logoUrl,
                outletName: data.outletName || DEFAULT_SHOP_PROFILE.outletName,
                currency: data.currency || DEFAULT_SHOP_PROFILE.currency,
              };
              setShopProfile((prev) => {
                const next = { ...prev, ...merged };
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                } catch {}
                return next;
              });
            }
          },
          (err) => {
            console.info('Firestore shop profile listener note (offline or rules):', err.message);
          }
        );
      }
    } catch (err) {
      console.warn('Firestore listener initialization error:', err);
    }

    // 2. Fetch from backend /api/settings as well
    const fetchApiSettings = async () => {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      if (!authToken) return;
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.shop_name || data.shopName)) {
            setShopProfile((prev) => {
              const updated = {
                ...prev,
                shopName: data.shop_name || data.shopName || prev.shopName,
                appTitle: data.app_title || data.appTitle || prev.appTitle,
                branch: data.branch || prev.branch,
                phone: data.phone || prev.phone,
                address: data.address || prev.address,
                logoUrl: data.logo_url || data.logoUrl || prev.logoUrl,
                outletName: data.outlet_name || data.outletName || prev.outletName,
                currency: data.currency || prev.currency,
              };
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      } catch (err) {
        // Silently fall back to localStorage/default
      }
    };

    fetchApiSettings();

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [token]);

  // Update profile handler (instantly reflects in UI, saves to local state, Firestore, and API)
  const updateShopProfile = async (newProfile) => {
    const updated = {
      ...shopProfile,
      ...newProfile,
    };

    // 1. Instant local state update for zero-latency UI re-render
    setShopProfile(updated);

    // 2. Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Also keep legacy posConfig in sync so any dependent views stay consistent
      const legacy = localStorage.getItem(POS_CONFIG_KEY);
      const parsedLegacy = legacy ? JSON.parse(legacy) : {};
      const updatedLegacy = {
        ...parsedLegacy,
        shopName: updated.shopName,
        outletName: updated.outletName,
        phone: updated.phone,
        address: updated.address,
        logoUrl: updated.logoUrl,
        currency: updated.currency,
      };
      localStorage.setItem(POS_CONFIG_KEY, JSON.stringify(updatedLegacy));
    } catch (e) {
      console.warn('Could not persist shop profile locally:', e);
    }

    // 3. Persist to Firestore
    try {
      if (db) {
        const shopDocRef = doc(db, 'settings', 'shop_profile');
        await setDoc(shopDocRef, updated, { merge: true });
      }
    } catch (e) {
      console.warn('Could not persist shop profile to Firestore:', e);
    }

    // 4. Persist to server /api/settings
    try {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      if (authToken) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            settings: {
              shop_name: updated.shopName,
              app_title: updated.appTitle,
              branch: updated.branch,
              phone: updated.phone,
              address: updated.address,
              logo_url: updated.logoUrl,
              outlet_name: updated.outletName,
              currency: updated.currency,
            },
          }),
        });
      }
    } catch (e) {
      console.warn('Could not persist shop profile to API:', e);
    }
  };

  const resetToDefaults = async () => {
    await updateShopProfile(DEFAULT_SHOP_PROFILE);
  };

  return (
    <ShopContext.Provider
      value={{
        shopProfile,
        loading,
        updateShopProfile,
        resetToDefaults,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

/**
 * Custom hook to consume ShopContext
 * Returns { shopProfile, loading, updateShopProfile, resetToDefaults }
 */
export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    return {
      shopProfile: DEFAULT_SHOP_PROFILE,
      loading: false,
      updateShopProfile: async () => {},
      resetToDefaults: async () => {},
    };
  }
  return context;
};

export default ShopContext;
