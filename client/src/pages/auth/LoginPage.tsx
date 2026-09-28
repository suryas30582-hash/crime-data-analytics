import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, ArrowRight, UserCheck, ShieldAlert, KeyRound, CheckCircle2, RefreshCw, Key } from 'lucide-react';
import { useAuth, RoleType } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRoleParam = queryParams.get('role') as RoleType | null;

  const [activeRole, setActiveRole] = useState<RoleType>(
    initialRoleParam === 'police' || initialRoleParam === 'admin' ? initialRoleParam : 'user'
  );

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const { sendOTP, verifyOTP, policeLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Listen to location changes if query param changes
  useEffect(() => {
    const roleParam = new URLSearchParams(location.search).get('role') as RoleType | null;
    if (roleParam && ['user', 'police', 'admin'].includes(roleParam)) {
      setActiveRole(roleParam);
      setStep('email');
      setEmail('');
      setOtpCode('');
      setError(null);
      setInfoMessage(null);
    }
  }, [location.search]);

  // Resend Timer countdown effect
  useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleRoleChange = (role: RoleType) => {
    setActiveRole(role);
    setStep('email');
    setEmail('');
    setOtpCode('');
    setError(null);
    setInfoMessage(null);
  };

  const handleRedirect = (user: any) => {
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];

    if (activeRole === 'admin' && userRoles.includes('admin')) {
      navigate('/admin/dashboard', { replace: true });
    } else if (activeRole === 'police' && userRoles.includes('police')) {
      navigate('/police/dashboard', { replace: true });
    } else if (userRoles.includes('admin')) {
      navigate('/admin/dashboard', { replace: true });
    } else if (userRoles.includes('police')) {
      navigate('/police/dashboard', { replace: true });
    } else {
      navigate('/user/dashboard', { replace: true });
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeRole === 'police') {
        const user = await policeLogin({ email: cleanEmail });
        handleRedirect(user);
        return;
      }
      const msg = await sendOTP({ email: cleanEmail, expectedRole: activeRole });
      setStep('otp');
      setInfoMessage(msg || 'Verification code sent to your email.');
      setResendTimer(30);
    } catch (err: any) {
      setError(err.message || 'Unable to authenticate account. Access denied.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await verifyOTP({ email: email.trim(), code: cleanCode, expectedRole: activeRole });
      handleRedirect(user);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Invalid or expired code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      const msg = await sendOTP({ email: email.trim(), expectedRole: activeRole });
      setInfoMessage(msg || 'A new verification code has been sent to your email.');
      setResendTimer(30);
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPortalInfo = () => {
    switch (activeRole) {
      case 'police':
        return {
          title: 'Police & Officer Portal',
          subtitle: 'Secure command dispatch & incident review',
          icon: ShieldAlert,
          gradient: 'from-[#542A20] to-[#883A2E]',
          tag: 'AUTHORIZED LAW ENFORCEMENT ONLY'
        };
      case 'admin':
        return {
          title: 'Administrator Console',
          subtitle: 'System management & master database access',
          icon: KeyRound,
          gradient: 'from-[#2B1F1D] to-[#542A20]',
          tag: 'SUPER-USER PRIVILEGES'
        };
      default:
        return {
          title: 'Citizen & Public Portal',
          subtitle: 'Explore crime analytics & report incident events',
          icon: UserCheck,
          gradient: 'from-[#883A2E] to-[#D65A31]',
          tag: 'PUBLIC CITIZEN ACCESS'
        };
    }
  };

  const portal = getPortalInfo();
  const IconComponent = portal.icon;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-8 shadow-warm-xl">

        {/* Role Switcher Tabs */}
        <div className="flex rounded-2xl bg-[#FFF7F4] p-1.5 border border-[#EEDFD9]">
          <button
            type="button"
            onClick={() => handleRoleChange('user')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeRole === 'user'
                ? 'bg-[#883A2E] text-white shadow-sm'
                : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-white/50'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Citizen / User</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('police')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeRole === 'police'
                ? 'bg-[#542A20] text-white shadow-sm'
                : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-white/50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Police Command</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeRole === 'admin'
                ? 'bg-[#2B1F1D] text-white shadow-sm'
                : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-white/50'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Administrator</span>
          </button>
        </div>

        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr ${portal.gradient} p-0.5 shadow-md shadow-[#883A2E]/20`}>
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#FFFDFC]">
              <IconComponent className="h-7 w-7 text-[#883A2E]" />
            </div>
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#FAF0EC] text-[#883A2E] border border-[#EEDFD9]">
            {portal.tag}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2B1F1D]">
            {portal.title}
          </h2>
          <p className="text-xs text-[#7A6360] max-w-sm mx-auto">
            {portal.subtitle}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="rounded-xl border border-[#D65A31]/30 bg-[#D65A31]/10 p-3.5 text-xs text-[#D65A31] animate-in fade-in">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {infoMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <p className="font-medium">{infoMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Email Address Input */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold text-[#2B1F1D]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-4 py-2.5 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendOTP}
              disabled={isSubmitting}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50 transition-all cursor-pointer bg-gradient-to-r ${portal.gradient} hover:brightness-110`}
            >
              <span>
                {isSubmitting
                  ? activeRole === 'police' ? 'Authenticating Police Access...' : 'Sending Verification Code...'
                  : activeRole === 'police' ? 'Access Police Command' : 'Send Verification Code'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification Code Input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 animate-in fade-in">
            <div className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] p-3 text-center">
              <p className="text-xs font-semibold text-[#2B1F1D]">
                Enter the verification code sent to your email
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-otp" className="text-xs font-semibold text-[#2B1F1D]">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 h-4 w-4 text-[#7A6360]" />
                <input
                  id="login-otp"
                  name="otpCode"
                  type="text"
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.4em] font-mono text-base font-bold rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-10 pr-4 py-2.5 text-[#2B1F1D] placeholder-[#7A6360]/40 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50 transition-all cursor-pointer bg-gradient-to-r ${portal.gradient} hover:brightness-110`}
            >
              <span>{isSubmitting ? 'Verifying Code...' : 'Verify & Access Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtpCode('');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-[#7A6360] hover:text-[#883A2E] hover:underline"
              >
                ← Change Email
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0 || isSubmitting}
                className="flex items-center space-x-1 font-semibold text-[#883A2E] disabled:opacity-50 hover:underline cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>{resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="border-t border-[#EEDFD9] pt-4 text-center">
          <p className="text-xs text-[#7A6360]">
            Need help?{' '}
            <Link to="/register" className="font-semibold text-[#883A2E] hover:underline">
              {t('register', 'Register as Citizen or Police Officer')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
