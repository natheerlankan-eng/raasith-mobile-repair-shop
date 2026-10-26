import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  User,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup } from 'firebase/auth';
import { useShop } from '../context/ShopContext.tsx';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: { email: string; name: string; role: string }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const { shopProfile } = useShop();
  const activeShopName = shopProfile?.shopName || 'RAASITH MOBILE';
  const activeLogoUrl = shopProfile?.logoUrl || '/src/assets/images/raasith_circle_logo_1791431541938.jpg';
  const activeBannerUrl = shopProfile?.bannerUrl || '/src/assets/images/raasith_desk_banner_1791308361536.jpg';
  const activeBranch = shopProfile?.branch || 'Akkaraipattu';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      // Safe JSON Parsing: வெற்றுப் பதில் (Empty response) வந்தால் அப்ளிகேஷன் கிராஷ் ஆகாமல் தடுக்கிறது
      const responseText = await res.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in.');
      }

      localStorage.setItem('raasith_staff_token', data.token);
      localStorage.setItem('raasith_staff_user', JSON.stringify(data.user));
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      const firebaseToken = await user.getIdToken();
      const email = user.email || 'staff@raasithmobile.com';
      const name = user.displayName || email.split('@')[0] || 'Staff User';

      // Obtain durable staff session token from backend
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'google-oauth-staff-session' }),
        });
        const responseText = await res.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (res.ok) {
          localStorage.setItem('raasith_staff_token', data.token);
          localStorage.setItem('raasith_staff_user', JSON.stringify(data.user));
          onLoginSuccess(data.token, data.user);
          return;
        }
      } catch {
        // Fallback to Firebase token
      }

      const userData = {
        email,
        name,
        role: 'staff',
      };
      localStorage.setItem('raasith_staff_token', firebaseToken);
      localStorage.setItem('raasith_staff_user', JSON.stringify(userData));
      onLoginSuccess(firebaseToken, userData);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const errorCode = err?.code || '';
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

      if (errorCode === 'auth/unauthorized-domain') {
        setError(
          `Domain Unauthorized: "${currentHost}" is not listed in your Firebase project's Authorized Domains. In Firebase Console, go to Authentication > Settings > Authorized Domains and add "${currentHost}". Alternatively, use the staff login credentials below.`
        );
      } else if (errorCode === 'auth/api-key-not-valid') {
        setError(
          'Firebase API key is invalid or restricted in Google Cloud Console. Please ensure Identity Toolkit API is enabled and API key has no conflicting restrictions.'
        );
      } else if (errorCode === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completing.');
      } else if (errorCode === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and retry.');
      } else if (errorCode === 'auth/cancelled-popup-request') {
        setError('Previous sign-in request was cancelled.');
      } else {
        setError(err.message || 'Google sign-in was cancelled or failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStaffLogin = () => {
    setEmail('cashier1');
    setPassword('cashier123');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-mono-jb text-[#f8f7f4] bg-[#070a14] select-none">
      {/* ========================================================================= */}
      {/* 1. FULL-SCREEN BACKGROUND WALLPAPER & TOP-TO-BOTTOM GRADIENT OVERLAY     */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Full Screen Background Image */}
        <img
          src={activeBannerUrl}
          alt={`${activeShopName} Backdrop`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-[0.38] contrast-[1.18] scale-[1.02]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
          }}
        />

        {/* Top-to-Bottom Transparency Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d1e]/75 via-[#09122a]/90 to-[#050814]" />

        {/* Subtle radial ambient spotlight for centered focus */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(14,165,233,0.12)_0%,transparent_70%)]" />

        {/* Top edge glowing accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP-CENTER BRANDING & OFFICIAL SHOP HEADER                            */}
      {/* ========================================================================= */}
      <header className="relative z-10 w-full pt-8 sm:pt-12 pb-4 px-4 flex flex-col items-center text-center">
        {/* Circular Shop Logo with Glow Accent Ring */}
        <div className="relative mb-3 group">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#080e22] p-1.5 border-2 border-cyan-400/80 shadow-2xl flex items-center justify-center overflow-hidden ring-4 ring-cyan-500/20">
            <img
              src={activeLogoUrl}
              alt={`${activeShopName} Logo`}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/raasith_logo.png';
              }}
            />
          </div>
        </div>

        {/* Prominent Shop Name in Heavy Oswald Display Typography */}
        <h1 className="font-oswald text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider text-white drop-shadow-md">
          {activeShopName}
        </h1>

        {/* Branch & ERP Category Subtitle */}
        <p className="font-mono-jb text-xs sm:text-sm text-cyan-200/80 mt-1 font-semibold tracking-wide uppercase">
          {activeBranch} &bull; Professional Mobile Phone Repairing Centre & POS Terminal
        </p>

        {/* Official Security Gateway Badge */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/70 text-cyan-300 text-xs font-mono-jb font-semibold border border-cyan-500/40 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Point of Sale & Repair ERP &bull; Official Staff Access</span>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. CENTERED AUTHENTICATION FORM                                           */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-lg mx-auto px-4 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        <div className="w-full bg-[#09122c]/85 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/80 space-y-5">
          {/* Form Header Info */}
          <div className="border-b border-cyan-500/20 pb-4 text-center sm:text-left">
            <h2 className="font-oswald text-xl sm:text-2xl font-bold uppercase tracking-wider text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>Staff Login</span>
            </h2>
            <p className="text-xs text-blue-200/70 mt-1">
              Enter counter credentials to access POS billing, job sheets & inventory
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-mono-jb font-medium flex items-start gap-2.5 animate-fadeIn">
              <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 flex items-center justify-center text-xs font-black shrink-0">
                !
              </span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Username or Email Input */}
            <div>
              <label className="block text-xs font-mono-jb font-bold text-cyan-200/80 uppercase tracking-wider mb-1.5">
                Staff Username or Email
              </label>
              <div className="relative">
                <div className="w-11 h-11 absolute left-1 top-1 flex items-center justify-center text-cyan-400/70 pointer-events-none">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. cashier1 or admin"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-[#060b1c] border border-blue-500/30 rounded-2xl text-white text-sm font-mono-jb font-medium focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all outline-none shadow-inner placeholder:text-blue-300/40"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-mono-jb font-bold text-cyan-200/80 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="w-11 h-11 absolute left-1 top-1 flex items-center justify-center text-cyan-400/70 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-[#060b1c] border border-blue-500/30 rounded-2xl text-white text-sm font-mono-jb font-medium focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all outline-none shadow-inner placeholder:text-blue-300/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-11 h-11 absolute right-1 top-1 flex items-center justify-center text-blue-300/60 hover:text-cyan-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-oswald text-sm sm:text-base uppercase tracking-wider font-extrabold rounded-2xl shadow-xl shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Subtle Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-cyan-500/20 w-full" />
            <span className="bg-[#09122c] px-3 text-[11px] font-mono-jb font-semibold text-blue-300/60 uppercase tracking-wider absolute">
              or continue with
            </span>
          </div>

          {/* Google Sign-in Option */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-[#060b1c] hover:bg-[#0c1638] text-white font-mono-jb text-xs sm:text-sm font-semibold rounded-2xl border border-blue-500/30 hover:border-cyan-400/50 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 shadow-md"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Quick Counter Autofill Helper */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={handleQuickStaffLogin}
              className="text-xs font-mono-jb text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Fill default cashier credentials (cashier1)</span>
            </button>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER & COPYRIGHT ANCHORED AT BOTTOM                                  */}
      {/* ========================================================================= */}
      <footer className="relative z-10 w-full py-5 px-4 text-center border-t border-cyan-500/15 bg-[#050814]/80 backdrop-blur-md">
        <p className="text-xs font-mono-jb text-blue-200/70 font-semibold">
          {activeShopName} &copy; 2026 &bull; {activeBranch} &bull; All Rights Reserved
        </p>
        <p className="text-[11px] font-mono-jb text-cyan-300/50 mt-0.5">
          Protected & Secure Terminal &bull; Enterprise POS & Repair Shop Management
        </p>
      </footer>
    </div>
  );
};