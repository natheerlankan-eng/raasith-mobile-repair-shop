import React from 'react';

export interface AppIconProps {
  className?: string;
  size?: number;
}

// 1. Home - Friendly Filled House with Door
export const AppIconHome: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M11.293 2.293a1 1 0 0 1 1.414 0l8.5 8.5A1 1 0 0 1 20.5 12.5H19v7.5A2 2 0 0 1 17 22h-3a1 1 0 0 1-1-1v-5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-7.5H1.5a1 1 0 0 1-.707-1.707l8.5-8.5a1 1 0 0 1 2 0Z" />
  </svg>
);

// 2. Dashboard - Growth & Analytics Filled Chart with Upward Trend
export const AppIconDashboard: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 13a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Zm7-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7Zm7-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V3Z" />
  </svg>
);

// 3. POS Sales - Filled Shopping Bag with Handle & Badge
export const AppIconPos: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M7.5 6a4.5 4.5 0 1 1 9 0H19a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2h2.5Zm2 0a2.5 2.5 0 0 1 5 0h-5Zm-1.5 5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z"
      clipRule="evenodd"
    />
  </svg>
);

// 4. Inventory - Filled Package / Stock Box with Flaps
export const AppIconInventory: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.89 1.45a2 2 0 0 0-1.78 0l-8 4.2A2 2 0 0 0 2 7.42V16.58a2 2 0 0 0 1.11 1.77l8 4.2a2 2 0 0 0 1.78 0l8-4.2a2 2 0 0 0 1.11-1.77V7.42a2 2 0 0 0-1.11-1.77l-8-4.2ZM12 3.32l6.83 3.59L15.5 8.7 8.67 5.11 12 3.32ZM4 8.78l7 3.68v7.62l-7-3.68V8.78Zm9 11.3V12.46l7-3.68v7.62l-7 3.68Z" />
  </svg>
);

// 5. Customers - Filled Double User Profile Avatars
export const AppIconCustomers: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm7.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM9 13.5c-4.418 0-8 2.462-8 5.5v1.25A1.75 1.75 0 0 0 2.75 22h12.5A1.75 1.75 0 0 0 17 20.25V19c0-3.038-3.582-5.5-8-5.5Zm9.25 1.5c1.688.75 2.75 2.1 2.75 3.75v1.25a1.75 1.75 0 0 1-1.75 1.75H18v-2.25c0-1.795-.88-3.37-2.31-4.453 1.077-.046 2.302-.047 3.56.203Z" />
  </svg>
);

// 6. Suppliers - Filled Logistics / Delivery Van Truck
export const AppIconSuppliers: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3h2.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 23 12.828V16a2 2 0 0 1-2 2h-1.17a3.001 3.001 0 0 1-5.66 0H9.83a3.001 3.001 0 0 1-5.66 0H3a1 1 0 0 1-1-1V5Zm15 5.5V13h3.5l-2.5-2.5H17ZM7 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
  </svg>
);

// 7. Finance - Filled Circular Currency / Coin Badge
export const AppIconFinance: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm1 5a1 1 0 1 0-2 0v.55A3.99 3.99 0 0 0 8 11a3.5 3.5 0 0 0 3.5 3.5h1A1.5 1.5 0 0 1 14 16c0 .828-.895 1.5-2 1.5a2.5 2.5 0 0 1-2.4-1.8 1 1 0 1 0-1.92.56A4.5 4.5 0 0 0 11 18.95V19a1 1 0 1 0 2 0v-.55A3.99 3.99 0 0 0 16 15a3.5 3.5 0 0 0-3.5-3.5h-1A1.5 1.5 0 0 1 10 10c0-.828.895-1.5 2-1.5a2.5 2.5 0 0 1 2.4 1.8 1 1 0 0 0 1.92-.56A4.5 4.5 0 0 0 13 7.05V7Z"
      clipRule="evenodd"
    />
  </svg>
);

// 8. Reports - Filled Analytical Document with Bar Chart
export const AppIconReports: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 4a2 2 0 0 1 2-2h8.586a2 2 0 0 1 1.414.586l4.414 4.414A2 2 0 0 1 21 8.414V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm4 13a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v4Zm4 0a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v7Zm4 0a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v2Z" />
  </svg>
);

// 9. Repairs - Filled Ergonomic Mechanical Tool Wrench
export const AppIconRepairs: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M22.707 5.707a1 1 0 0 0-1.414-1.414l-3.267 3.268a7.03 7.03 0 0 0-4.086-1.547L13.5 3a1 1 0 0 0-1.414-1.414L9.5 4.172A7.054 7.054 0 0 0 4.11 9.94l6.95 6.95 8.38-8.38a7.03 7.03 0 0 0 1.547-4.086l1.72-1.717ZM2.707 19.879l5.414-5.414 2.828 2.828-5.414 5.414a2 2 0 0 1-2.828 0l-.001-.001a2 2 0 0 1 0-2.827Z" />
  </svg>
);

// 10. Settings - Refined 6-Tooth Modern Cog / Gear
export const AppIconSettings: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10.87 2.13a1.5 1.5 0 0 1 2.26 0l.97 1.09a1.5 1.5 0 0 0 1.53.45l1.41-.44a1.5 1.5 0 0 1 1.96 1.13l.33 1.44a1.5 1.5 0 0 0 1.13 1.13l1.44.33a1.5 1.5 0 0 1 1.13 1.96l-.44 1.41a1.5 1.5 0 0 0 .45 1.53l1.09.97a1.5 1.5 0 0 1 0 2.26l-1.09.97a1.5 1.5 0 0 0-.45 1.53l.44 1.41a1.5 1.5 0 0 1-1.13 1.96l-1.44.33a1.5 1.5 0 0 0-1.13 1.13l-.33 1.44a1.5 1.5 0 0 1-1.96 1.13l-1.41-.44a1.5 1.5 0 0 0-1.53.45l-.97 1.09a1.5 1.5 0 0 1-2.26 0l-.97-1.09a1.5 1.5 0 0 0-1.53-.45l-1.41.44a1.5 1.5 0 0 1-1.96-1.13l-.33-1.44a1.5 1.5 0 0 0-1.13-1.13l-1.44-.33a1.5 1.5 0 0 1-1.13-1.96l.44-1.41a1.5 1.5 0 0 0-.45-1.53l-1.09-.97a1.5 1.5 0 0 1 0-2.26l1.09-.97a1.5 1.5 0 0 0 .45-1.53l-.44-1.41a1.5 1.5 0 0 1 1.13-1.96l1.44-.33a1.5 1.5 0 0 0 1.13-1.13l.33-1.44a1.5 1.5 0 0 1 1.96-1.13l1.41.44a1.5 1.5 0 0 0 1.53-.45l.97-1.09ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      clipRule="evenodd"
    />
  </svg>
);

// 11. Door Logout - Clean Door with Arrow Exit
export const AppIconDoorLogout: React.FC<AppIconProps> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2a2 2 0 0 0-2 2v2a1 1 0 1 0 2 0V4h7v16h-7v-2a1 1 0 1 0-2 0v2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Z" />
    <path d="M10.707 7.293a1 1 0 0 0-1.414 1.414L11.586 11H3a1 1 0 1 0 0 2h8.586l-2.293 2.293a1 1 0 1 0 1.414 1.414l4-4a1 1 0 0 0 0-1.414l-4-4Z" />
  </svg>
);
