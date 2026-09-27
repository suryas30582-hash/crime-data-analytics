import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { forgotPassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    if (!newPassword) {
      setError('Please provide a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const resMsg = await forgotPassword({
        email: email.trim(),
        newPassword,
        confirmPassword
      });
      setMessage(resMsg);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-8 shadow-warm-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#883A2E] to-[#D65A31] p-0.5 shadow-md shadow-[#883A2E]/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#FFFDFC]">
              <Lock className="h-7 w-7 text-[#883A2E]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2B1F1D] sm:text-3xl">
            {t('forgotPassword', 'Reset Password')}
          </h2>
          <p className="text-xs text-[#7A6360]">
            Enter your registered email address to set a new password
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2.5 rounded-xl border border-[#D65A31]/30 bg-[#D65A31]/10 p-3.5 text-xs text-[#D65A31] animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#D65A31]" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-center space-x-2.5 rounded-xl border border-[#2E7D32]/30 bg-[#2E7D32]/10 p-3.5 text-xs text-[#2E7D32] animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2E7D32]" />
            <span>{message} Redirecting to Sign In...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">
              {t('email', 'Registered Email Address')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-4 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-10 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#7A6360] hover:text-[#2B1F1D]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">
              {t('confirmPassword', 'Confirm New Password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-10 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-[#7A6360] hover:text-[#2B1F1D]"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#883A2E]/20 hover:from-[#752F24] hover:to-[#BA461F] disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>{isSubmitting ? 'Updating Password...' : 'Reset Password'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="border-t border-[#EEDFD9] pt-4 text-center">
          <p className="text-xs text-[#7A6360]">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-[#883A2E] hover:underline">
              {t('signIn', 'Back to Sign In')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
