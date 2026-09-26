import React, { useState } from 'react';
import {
  Settings,
  User,
  Globe,
  Lock,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const SettingsPage: React.FC = () => {
  const { user, forgotPassword } = useAuth();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      if (!user?.email) throw new Error('User email not found');
      const msg = await forgotPassword({
        email: user.email,
        newPassword,
        confirmPassword
      });
      setPasswordMessage('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('settings', 'System & User Settings')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Manage your analyst profile, multilingual localization preferences, and access credentials.
        </p>
      </div>

      {/* Profile Overview */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-800/80 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600/20 text-cyan-400 font-bold text-lg border border-cyan-500/30">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{user?.name}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <span className="ml-auto rounded-full bg-cyan-950 px-3 py-1 text-xs font-mono font-medium text-cyan-400 border border-cyan-800/50 capitalize">
            {user?.role === 'admin' ? 'Administrator' : 'Analyst'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              disabled
              value={user?.name || ''}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-300 font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Registered Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-300 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Language Selection Setting (13 Languages) */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
          <Globe className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Language & Regional Localization (13 Indian Languages)</h2>
        </div>

        <p className="text-xs text-slate-400">
          Select your preferred Indian language for UI navigation, headings, action buttons, and analytical metrics.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium border transition-all ${
                currentLanguage === lang.code
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span className="font-semibold">{lang.nativeName}</span>
              <span className="text-[10px] text-slate-500">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security: Password Update */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/75 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
          <Lock className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Security & Password Management</h2>
        </div>

        {passwordMessage && (
          <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{passwordMessage}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isUpdatingPassword ? 'Updating Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
