import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemePreset = 'dark-tactical' | 'clean-light' | 'oled-black';

export interface ThemeColors {
  primaryAccent: string; // Buttons, active states, key icons
  successGreen: string;  // Advance payments, positive balance badges
  dangerRed: string;     // Gross totals, unpaid due alerts, delete actions
  warningYellow: string; // To Pay amounts, pending notifications
}

export const DEFAULT_PRESET_COLORS: Record<ThemePreset, ThemeColors> = {
  'dark-tactical': {
    primaryAccent: '#3b82f6',
    successGreen: '#10b981',
    dangerRed: '#ef4444',
    warningYellow: '#eab308',
  },
  'clean-light': {
    primaryAccent: '#2563eb',
    successGreen: '#059669',
    dangerRed: '#dc2626',
    warningYellow: '#d97706',
  },
  'oled-black': {
    primaryAccent: '#06b6d4',
    successGreen: '#00ff88',
    dangerRed: '#ff3344',
    warningYellow: '#ffd600',
  },
};

export const applyThemeToDom = (preset: ThemePreset, colors: ThemeColors) => {
  const root = document.documentElement;

  // Background and surface variables based on preset
  if (preset === 'clean-light') {
    root.style.setProperty('--bg-primary', '#f8fafc');
    root.style.setProperty('--bg-secondary', '#f1f5f9');
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--bg-header', '#ffffff');
    root.style.setProperty('--bg-input', '#f8fafc');
    root.style.setProperty('--text-primary', '#0f172a');
    root.style.setProperty('--text-secondary', '#334155');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--border-color', '#cbd5e1');

    root.classList.remove('theme-dark', 'theme-oled');
    root.classList.add('theme-light');
  } else if (preset === 'oled-black') {
    root.style.setProperty('--bg-primary', '#000000');
    root.style.setProperty('--bg-secondary', '#050505');
    root.style.setProperty('--bg-card', '#0a0a0a');
    root.style.setProperty('--bg-header', '#050505');
    root.style.setProperty('--bg-input', '#0f0f10');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#cbd5e1');
    root.style.setProperty('--text-muted', '#94a3b8');
    root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.15)');

    root.classList.remove('theme-light');
    root.classList.add('theme-dark', 'theme-oled');
  } else {
    // Dark Tactical / Cyberpunk (default)
    root.style.setProperty('--bg-primary', '#070e28');
    root.style.setProperty('--bg-secondary', '#09153a');
    root.style.setProperty('--bg-card', '#0a1538');
    root.style.setProperty('--bg-header', '#070e28');
    root.style.setProperty('--bg-input', '#050c24');
    root.style.setProperty('--text-primary', '#f8fafc');
    root.style.setProperty('--text-secondary', '#93c5fd');
    root.style.setProperty('--text-muted', 'rgba(147, 197, 253, 0.7)');
    root.style.setProperty('--border-color', 'rgba(96, 165, 250, 0.25)');

    root.classList.remove('theme-light', 'theme-oled');
    root.classList.add('theme-dark');
  }

  // Functional Color Tokens
  root.style.setProperty('--primary-accent', colors.primaryAccent);
  root.style.setProperty('--success-green', colors.successGreen);
  root.style.setProperty('--danger-red', colors.dangerRed);
  root.style.setProperty('--warning-yellow', colors.warningYellow);
};

interface ThemeContextType {
  preset: ThemePreset;
  colors: ThemeColors;
  setPreset: (preset: ThemePreset) => void;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode; token?: string | null }> = ({ children, token }) => {
  const [preset, setPresetState] = useState<ThemePreset>(() => {
    try {
      return (localStorage.getItem('raasith_theme_preset') as ThemePreset) || 'dark-tactical';
    } catch {
      return 'dark-tactical';
    }
  });

  const [colors, setColorsState] = useState<ThemeColors>(() => {
    try {
      const savedPreset = (localStorage.getItem('raasith_theme_preset') as ThemePreset) || 'dark-tactical';
      const savedColors = localStorage.getItem('raasith_theme_colors');
      return savedColors ? JSON.parse(savedColors) : DEFAULT_PRESET_COLORS[savedPreset];
    } catch {
      return DEFAULT_PRESET_COLORS['dark-tactical'];
    }
  });

  // Apply immediately on mount
  useEffect(() => {
    applyThemeToDom(preset, colors);
  }, []);

  // Fetch saved settings from server when token changes
  useEffect(() => {
    const fetchRemoteTheme = async () => {
      const authToken = token || localStorage.getItem('raasith_staff_token');
      if (!authToken) return;
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.theme_preset) {
            const remotePreset = data.theme_preset as ThemePreset;
            let remoteColors = DEFAULT_PRESET_COLORS[remotePreset];
            if (data.theme_colors) {
              try {
                remoteColors = JSON.parse(data.theme_colors);
              } catch {}
            }
            setPresetState(remotePreset);
            setColorsState(remoteColors);
            localStorage.setItem('raasith_theme_preset', remotePreset);
            localStorage.setItem('raasith_theme_colors', JSON.stringify(remoteColors));
            applyThemeToDom(remotePreset, remoteColors);
          }
        }
      } catch (e) {
        console.warn('Could not load remote theme:', e);
      }
    };
    fetchRemoteTheme();
  }, [token]);

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    const newColors = DEFAULT_PRESET_COLORS[newPreset];
    setColorsState(newColors);
    applyThemeToDom(newPreset, newColors);
    persist(newPreset, newColors);
  };

  const updateColor = (key: keyof ThemeColors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColorsState(updated);
    applyThemeToDom(preset, updated);
    persist(preset, updated);
  };

  const resetDefaults = () => {
    const defaults = DEFAULT_PRESET_COLORS[preset];
    setColorsState(defaults);
    applyThemeToDom(preset, defaults);
    persist(preset, defaults);
  };

  const persist = async (p: ThemePreset, c: ThemeColors) => {
    try {
      localStorage.setItem('raasith_theme_preset', p);
      localStorage.setItem('raasith_theme_colors', JSON.stringify(c));

      const authToken = token || localStorage.getItem('raasith_staff_token');
      if (authToken) {
        fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            settings: {
              theme_preset: p,
              theme_colors: JSON.stringify(c),
            },
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ preset, colors, setPreset, updateColor, resetDefaults }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      preset: 'dark-tactical' as ThemePreset,
      colors: DEFAULT_PRESET_COLORS['dark-tactical'],
      setPreset: () => {},
      updateColor: () => {},
      resetDefaults: () => {},
    };
  }
  return context;
};
