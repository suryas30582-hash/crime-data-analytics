import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/react/legacy';
import { useClerk } from '@clerk/react';
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification state for OTP
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { isLoaded: isSignUpLoaded, signUp, setActive } = useSignUp();
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleStartSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your confirm password.');
      return;
    }

    setIsSubmitting(true);

    // If Clerk is active and loaded, initiate Clerk signup + email verification
    if (isSignUpLoaded && signUp) {
      try {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || name.trim();
        const lastName = nameParts.slice(1).join(' ') || '';

        await signUp.create({
          emailAddress: email.trim(),
          password,
          firstName,
          lastName
        });

        // Send OTP email code
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
        setIsSubmitting(false);
        return;
      } catch (clerkErr: any) {
        console.warn('Clerk registration step notice:', clerkErr?.errors?.[0]?.message || clerkErr?.message);
        const errorMsg = clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message || clerkErr?.message;
        setError(errorMsg || 'Registration failed. Please check your details.');
        setIsSubmitting(false);
        return;
      }
    }

    // Direct registration fallback
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role: 'user'
      });

      navigate('/user/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again with a different email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      if (signUp) {
        const completeSignUp = await signUp.attemptEmailAddressVerification({
          code: code.trim()
        });

        if (completeSignUp.status === 'complete' && completeSignUp.createdSessionId) {
          await setActive({ session: completeSignUp.createdSessionId });
          // Register user in local DB as role 'user'
          try {
            await register({
              name: name.trim(),
              email: email.trim(),
              password,
              confirmPassword,
              role: 'user'
            });
          } catch {
            // Already synced or existing
          }
          navigate('/user/dashboard', { replace: true });
          return;
        } else {
          setError('Email verification incomplete. Please try again.');
        }
      }
    } catch (err: any) {
      const errorMsg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message;
      setError(errorMsg || 'Invalid verification code. Please check your inbox and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-8 shadow-warm-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#883A2E] to-[#D65A31] p-0.5 shadow-md shadow-[#883A2E]/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#FFFDFC]">
              <Shield className="h-7 w-7 text-[#883A2E]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2B1F1D]">
            {pendingVerification ? 'Verify Your Email' : t('register', 'Create Citizen Account')}
          </h2>
          <p className="text-xs text-[#7A6360]">
            {pendingVerification
              ? `We have sent a 6-digit OTP verification code to ${email}`
              : 'Register for a verified Crimelytixs Citizen user account'}
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2.5 rounded-xl border border-[#D65A31]/30 bg-[#D65A31]/10 p-3.5 text-xs text-[#D65A31] animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#D65A31]" />
            <span>{error}</span>
          </div>
        )}

        {pendingVerification ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-1.5 text-center">
              <label className="text-xs font-semibold text-[#2B1F1D] block">Enter Verification Code</label>
              <div className="relative max-w-xs mx-auto">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-4 py-2.5 text-center text-lg tracking-widest font-mono text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
                />
              </div>
              <p className="text-[11px] text-[#7A6360] mt-1">
                Please check your inbox or spam folder for the Clerk OTP code.
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#883A2E]/20 hover:from-[#752F24] hover:to-[#BA461F] disabled:opacity-50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isVerifying ? 'Verifying Code...' : 'Complete Verification & Sign In'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleStartSignUp} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-4 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">Email Address</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-9 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#7A6360] hover:text-[#2B1F1D]"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#2B1F1D]">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-9 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-[#7A6360] hover:text-[#2B1F1D]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#883A2E]/20 hover:from-[#752F24] hover:to-[#BA461F] disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>{isSubmitting ? 'Sending Verification Code...' : 'Register Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="border-t border-[#EEDFD9] pt-4 text-center">
          <p className="text-xs text-[#7A6360]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#883A2E] hover:underline">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

