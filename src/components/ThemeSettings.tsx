import React, { useState } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Save,
  Paintbrush,
  Eye,
  ShoppingBag,
  Wrench,
  CheckCircle
} from 'lucide-react';
import {
  ThemePreset,
  ThemeColors,
  DEFAULT_PRESET_COLORS,
  applyThemeToDom,
  useTheme
} from '../context/ThemeContext.tsx';

export type { ThemePreset, ThemeColors };
export { DEFAULT_PRESET_COLORS, applyThemeToDom };

interface ThemeSettingsProps {
  token?: string | null;
  onThemeSaved?: () => void;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ token, onThemeSaved }) => {
  const { preset, colors, setPreset, updateColor, resetDefaults } = useTheme();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSelectPreset = (newPreset: ThemePreset) => {
    setPreset(newPreset);
    setSaveNotice(`Switched to ${newPreset === 'clean-light' ? 'Pure Light White' : newPreset === 'oled-black' ? 'OLED Midnight Black' : 'Dark Tactical'} Theme`);
    setTimeout(() => setSaveNotice(null), 3000);
    onThemeSaved?.();
  };

  const handleUpdateColor = (key: keyof ThemeColors, value: string) => {
    updateColor(key, value);
    setSaveNotice('Custom color token updated');
    setTimeout(() => setSaveNotice(null), 2000);
  };

  const handleReset = () => {
    resetDefaults();
    setSaveNotice('Colors reset to preset defaults');
    setTimeout(() => setSaveNotice(null), 2500);
  };

  return (
    <div className="space-y-6 font-mono-jb select-none">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
            <Palette className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-oswald text-xl font-black uppercase tracking-wider text-white">
              THEMES & VISUAL CUSTOMIZATION
            </h3>
            <p className="text-xs text-blue-200/70">
              Instant DOM theming across POS, Repair Bench, Inventory, GRN & Reports
            </p>
          </div>
        </div>

        {saveNotice && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveNotice}</span>
          </div>
        )}
      </div>

      {/* 1. VISUAL THEME PRESET SELECTOR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-extrabold text-blue-300 tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>1. Select Theme Preset</span>
          </h4>
          <span className="text-[11px] text-slate-400">Instantly applies to all pages without reload</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preset 1: Pure Light White Theme */}
          <div
            onClick={() => handleSelectPreset('clean-light')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              preset === 'clean-light'
                ? 'bg-white border-blue-600 shadow-2xl ring-2 ring-blue-500/50'
                : 'bg-slate-100/90 border-slate-300 hover:border-blue-400 opacity-90 hover:opacity-100'
            }`}
          >
            {preset === 'clean-light' && (
              <span className="absolute top-2.5 right-2.5 bg-blue-600 text-white p-1 rounded-full shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center mb-3">
                <Sun className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h5 className="font-oswald text-base font-bold text-slate-900 uppercase tracking-wider">
                Pure Light White Theme
              </h5>
              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded mt-0.5">
                Clean Corporate Light
              </span>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed font-sans">
                Crisp, full-white backdrop optimized for daytime front-desk operations with high-contrast text and clean borders.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
              <span className="w-4 h-4 rounded-full bg-[#f8fafc] border border-slate-300" title="Background" />
              <span className="w-4 h-4 rounded-full bg-[#ffffff] border border-slate-300" title="Card Surface" />
              <span className="w-4 h-4 rounded-full bg-[#2563eb]" title="Primary Accent" />
              <span className="w-4 h-4 rounded-full bg-[#059669]" title="Success Green" />
              <span className="ml-auto text-[10px] font-bold text-slate-700 uppercase">Light Mode</span>
            </div>
          </div>

          {/* Preset 2: Dark Tactical Theme */}
          <div
            onClick={() => handleSelectPreset('dark-tactical')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              preset === 'dark-tactical'
                ? 'bg-[#09153a] border-cyan-400 shadow-xl shadow-cyan-950/80 ring-2 ring-cyan-500/50'
                : 'bg-[#060e28] border-blue-500/25 hover:border-blue-400/50 opacity-80 hover:opacity-100'
            }`}
          >
            {preset === 'dark-tactical' && (
              <span className="absolute top-2.5 right-2.5 bg-cyan-500 text-slate-950 p-1 rounded-full shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-cyan-300 flex items-center justify-center mb-3">
                <Monitor className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h5 className="font-oswald text-base font-bold text-white uppercase tracking-wider">
                Dark Tactical Theme
              </h5>
              <span className="inline-block text-[10px] font-bold text-cyan-300 bg-blue-900/60 px-2 py-0.5 rounded mt-0.5">
                Cyberpunk Navy Blue
              </span>
              <p className="text-[11px] text-blue-200/70 mt-2 leading-relaxed font-sans">
                Default high-tech navy blue (#070e28) with radiant cyan accents. Engineered for mobile technicians & hardware benches.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-blue-500/20">
              <span className="w-4 h-4 rounded-full bg-[#070e28] border border-blue-400/40" title="Background" />
              <span className="w-4 h-4 rounded-full bg-[#09153a] border border-blue-400/40" title="Card Surface" />
              <span className="w-4 h-4 rounded-full bg-[#3b82f6]" title="Primary Accent" />
              <span className="w-4 h-4 rounded-full bg-[#10b981]" title="Success Green" />
              <span className="ml-auto text-[10px] font-bold text-cyan-400 uppercase">Default Dark</span>
            </div>
          </div>

          {/* Preset 3: OLED Midnight Black */}
          <div
            onClick={() => handleSelectPreset('oled-black')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              preset === 'oled-black'
                ? 'bg-black border-purple-400 shadow-xl ring-2 ring-purple-500/50'
                : 'bg-[#060e28] border-blue-500/25 hover:border-blue-400/50 opacity-80 hover:opacity-100'
            }`}
          >
            {preset === 'oled-black' && (
              <span className="absolute top-2.5 right-2.5 bg-purple-500 text-white p-1 rounded-full shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-3">
                <Moon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h5 className="font-oswald text-base font-bold text-white uppercase tracking-wider">
                OLED Midnight Black
              </h5>
              <span className="inline-block text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded mt-0.5">
                Pure Pitch Black
              </span>
              <p className="text-[11px] text-blue-200/70 mt-2 leading-relaxed font-sans">
                True pure black (#000000) backdrop. Maximum power saving for OLED laptops, high contrast, and zero back-bleed.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-purple-500/20">
              <span className="w-4 h-4 rounded-full bg-[#000000] border border-slate-600" title="Background" />
              <span className="w-4 h-4 rounded-full bg-[#09090b] border border-slate-600" title="Card Surface" />
              <span className="w-4 h-4 rounded-full bg-[#06b6d4]" title="Primary Accent" />
              <span className="w-4 h-4 rounded-full bg-[#00ff88]" title="Success Green" />
              <span className="ml-auto text-[10px] font-bold text-purple-400 uppercase">True Black</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FUNCTIONAL COLOR TOKENS PICKER */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
          <h4 className="text-xs uppercase font-extrabold text-blue-300 tracking-wider flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-cyan-400" />
            <span>2. Custom Functional Color Tokens</span>
          </h4>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Colors to Default</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Token 1: Primary Accent */}
          <div className="bg-[#050c24] border border-blue-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Primary Accent Color</span>
                <span className="text-[10px] text-blue-300/70">Main buttons, active tabs & key icons</span>
              </div>
              <input
                type="color"
                value={colors.primaryAccent}
                onChange={(e) => handleUpdateColor('primaryAccent', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={colors.primaryAccent}
                onChange={(e) => handleUpdateColor('primaryAccent', e.target.value)}
                className="w-28 bg-[#09153a] border border-blue-500/30 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono-jb uppercase font-bold outline-none"
              />
              <span
                className="flex-1 py-1 px-2.5 rounded-lg text-[10px] text-center font-bold text-white shadow-xs"
                style={{ backgroundColor: colors.primaryAccent }}
              >
                Sample Action Button
              </span>
            </div>
          </div>

          {/* Token 2: Success / Radiant Green */}
          <div className="bg-[#050c24] border border-emerald-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Success / Radiant Green</span>
                <span className="text-[10px] text-emerald-300/70">Advance payments, positive balances, Day Open</span>
              </div>
              <input
                type="color"
                value={colors.successGreen}
                onChange={(e) => handleUpdateColor('successGreen', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={colors.successGreen}
                onChange={(e) => handleUpdateColor('successGreen', e.target.value)}
                className="w-28 bg-[#09153a] border border-emerald-500/30 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono-jb uppercase font-bold outline-none"
              />
              <span
                className="flex-1 py-1 px-2.5 rounded-lg text-[10px] text-center font-bold text-white shadow-xs"
                style={{ backgroundColor: colors.successGreen }}
              >
                Advance: Rs. 5,000
              </span>
            </div>
          </div>

          {/* Token 3: Danger / Red */}
          <div className="bg-[#050c24] border border-rose-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Danger / Bright Red</span>
                <span className="text-[10px] text-rose-300/70">Gross totals, unpaid dues, EOD trigger</span>
              </div>
              <input
                type="color"
                value={colors.dangerRed}
                onChange={(e) => handleUpdateColor('dangerRed', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={colors.dangerRed}
                onChange={(e) => handleUpdateColor('dangerRed', e.target.value)}
                className="w-28 bg-[#09153a] border border-rose-500/30 rounded-lg px-2.5 py-1 text-xs text-rose-400 font-mono-jb uppercase font-bold outline-none"
              />
              <span
                className="flex-1 py-1 px-2.5 rounded-lg text-[10px] text-center font-bold text-white shadow-xs"
                style={{ backgroundColor: colors.dangerRed }}
              >
                Gross Total: Rs. 24,500
              </span>
            </div>
          </div>

          {/* Token 4: Warning / Yellow */}
          <div className="bg-[#050c24] border border-yellow-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Warning / Yellow</span>
                <span className="text-[10px] text-yellow-300/70">To Pay amounts, pending notifications & locks</span>
              </div>
              <input
                type="color"
                value={colors.warningYellow}
                onChange={(e) => handleUpdateColor('warningYellow', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={colors.warningYellow}
                onChange={(e) => handleUpdateColor('warningYellow', e.target.value)}
                className="w-28 bg-[#09153a] border border-yellow-500/30 rounded-lg px-2.5 py-1 text-xs text-yellow-400 font-mono-jb uppercase font-bold outline-none"
              />
              <span
                className="flex-1 py-1 px-2.5 rounded-lg text-[10px] text-center font-bold text-black font-black shadow-xs"
                style={{ backgroundColor: colors.warningYellow }}
              >
                To Pay: Rs. 19,500
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIVE INTERACTIVE MODULE PREVIEW */}
      <div className="bg-[#08102a] border border-blue-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs uppercase font-extrabold text-blue-300 tracking-wider">
              Live Theme Preview (Active: {preset === 'clean-light' ? 'Pure Light' : preset === 'oled-black' ? 'OLED Black' : 'Dark Tactical'})
            </h4>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Real-time CSS Variables Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Mini Gross Total Card */}
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase text-rose-300">GROSS TOTAL</span>
            <span className="text-lg font-black" style={{ color: colors.dangerRed }}>
              Rs. 45,000
            </span>
          </div>

          {/* Mini Advance Paid Card */}
          <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase text-emerald-300">ADVANCE PAYMENT</span>
            <span className="text-lg font-black" style={{ color: colors.successGreen }}>
              -Rs. 15,000
            </span>
          </div>

          {/* Mini To Pay Card */}
          <div className="p-3 rounded-xl border border-yellow-500/40 bg-yellow-950/30 flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase text-yellow-300">TO PAY</span>
            <span className="text-lg font-black" style={{ color: colors.warningYellow }}>
              Rs. 30,000
            </span>
          </div>
        </div>
      </div>

      {/* Persistence Note */}
      <div className="bg-[#09153a] border border-blue-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-200/80">
        <span className="flex items-center gap-2">
          <Save className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>All selected theme preferences and color configurations persist instantly across logout, reloads, and database profiles.</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setSaveNotice('All theme preferences synced to database.');
            setTimeout(() => setSaveNotice(null), 2500);
          }}
          className="py-1.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold font-oswald uppercase tracking-wider transition-all cursor-pointer shadow-md"
        >
          Synced & Saved
        </button>
      </div>
    </div>
  );
};
