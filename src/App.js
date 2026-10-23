import React from 'react';
import App from './App.tsx';
import { ShopProvider } from './context/ShopContext.js';
import { ThemeProvider } from './context/ThemeContext.tsx';

/**
 * App Wrapper with Global State Management
 * 
 * Demonstrates wrapping the POS application root in `ShopProvider`
 * so that any changes to shop branding (Shop Name, App Title, Branch, Phone, Address, Logo URL)
 * instantly reflect across Header, Dashboard Banner, POS Invoices, Print Previews, and Job Slips
 * without requiring a hard page refresh.
 */
export default function AppWithProviders(props) {
  return (
    <ThemeProvider>
      <ShopProvider>
        <App {...props} />
      </ShopProvider>
    </ThemeProvider>
  );
}

export { AppWithProviders as App };
