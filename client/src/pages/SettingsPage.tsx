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
      <div className="border-b border-[#EEDFD9] pb-4">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-[#883A2E]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
            {t('settings', 'System & User Settings')}
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#7A6360]">
          Manage your analyst profile, multilingual localization preferences, and access credentials.
        </p>
      </div>

      {/* Profile Overview */}
      <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 border-b border-[#EEDFD9] pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#883A2E]/10 text-[#883A2E] font-bold text-lg border border-[#883A2E]/20">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2B1F1D]">{user?.name}</h2>
            <p className="text-xs text-[#7A6360]">{user?.email}</p>
          </div>
          <span className="ml-auto rounded-full bg-[#883A2E]/10 px-3 py-1 text-xs font-mono font-medium text-[#883A2E] border border-[#883A2E]/20 capitalize">
            {user?.role === 'admin' ? 'Administrator' : 'Analyst'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#7A6360] mb-1 font-medium">Full Name</label>
            <input
              type="text"
              disabled
              value={user?.name || ''}
              className="w-full rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] px-3 py-2 text-[#2B1F1D] font-medium"
            />
          </div>
          <div>
            <label className="block text-[#7A6360] mb-1 font-medium">Registered Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl border border-[#EEDFD9] bg-[#FAF0EC] px-3 py-2 text-[#2B1F1D] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Language Selection Setting (13 Languages) */}
      <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#EEDFD9] pb-3">
          <Globe className="h-5 w-5 text-[#883A2E]" />
          <h2 className="text-sm font-bold text-[#2B1F1D]">Language & Regional Localization (13 Indian Languages)</h2>
        </div>

        <p className="text-xs text-[#7A6360]">
          Select your preferred Indian language for UI navigation, headings, action buttons, and analytical metrics.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium border transition-all cursor-pointer ${
                currentLanguage === lang.code
                  ? 'bg-[#883A2E] text-white border-[#883A2E] shadow-sm'
                  : 'border-[#EEDFD9] bg-[#FAF0EC] text-[#2B1F1D] hover:bg-[#EEDFD9]'
              }`}
            >
              <span className="font-semibold">{lang.nativeName}</span>
              <span className={`text-[10px] ${currentLanguage === lang.code ? 'text-white/80' : 'text-[#7A6360]'}`}>
                {lang.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Security: Password Update */}
      <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#EEDFD9] pb-3">
          <Lock className="h-5 w-5 text-[#883A2E]" />
          <h2 className="text-sm font-bold text-[#2B1F1D]">Security & Password Management</h2>
        </div>

        {passwordMessage && (
          <div className="flex items-center space-x-2 rounded-xl border border-[#2E7D32]/30 bg-[#2E7D32]/10 p-3 text-xs text-[#2E7D32]">
            <CheckCircle2 className="h-4 w-4 text-[#2E7D32]" />
            <span>{passwordMessage}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#7A6360] font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7A6360] font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:outline-none shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="rounded-xl bg-[#883A2E] hover:bg-[#542A20] px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isUpdatingPassword ? 'Updating Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
