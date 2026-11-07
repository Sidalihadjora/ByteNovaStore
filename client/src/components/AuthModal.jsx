import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AuthModal({ isOpen, onClose, initialTab = 'login', onLoginSuccess }) {
  const { t, language, isRtl } = useLanguage();
  const { login, register, googleLogin } = useAuth();

  const [tab, setTab] = useState(initialTab); // 'login', 'signup', 'forgot'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const loggedInUser = await login(email, password);
        onClose();
        if (onLoginSuccess) onLoginSuccess(loggedInUser);
      } else if (tab === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error(t('password_placeholder'));
        }
        const newUser = await register({ name, email, password, phone });
        onClose();
        if (onLoginSuccess) onLoginSuccess(newUser);
      } else if (tab === 'forgot') {
        // Handle forgot password
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSuccessMessage(t('reset_link_sent') + (data.resetToken ? ` (Dev Token: ${data.resetToken})` : ''));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const loggedUser = await googleLogin(credentialResponse.credential);
      onClose();
      if (onLoginSuccess) onLoginSuccess(loggedUser);
    } catch (err) {
      setErrorMessage(err.message || 'Google Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage('Google Sign-In was cancelled or failed.');
  };

  return (
    <div
      className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="responsive-modal-panel relative bg-white rounded-3xl max-w-md w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => { setTab('login'); setErrorMessage(''); }}
              className={`text-sm font-bold pb-2 transition-colors cursor-pointer border-b-2 ${
                tab === 'login'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('sign_in')}
            </button>
            <button
              onClick={() => { setTab('signup'); setErrorMessage(''); }}
              className={`text-sm font-bold pb-2 transition-colors cursor-pointer border-b-2 ${
                tab === 'signup'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('sign_up')}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer -mt-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('full_name')} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('full_name_placeholder')}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm pe-10 focus:outline-hidden text-slate-800"
                  />
                  <User size={16} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} text-slate-400`} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('email')} *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm pe-10 focus:outline-hidden text-slate-800"
                />
                <Mail size={16} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} text-slate-400`} />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('password')} *
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      {t('forgot_password')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm pe-10 focus:outline-hidden text-slate-800"
                  />
                  <Lock size={16} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} text-slate-400`} />
                </div>
              </div>
            )}

            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('confirm_password')} *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm pe-10 focus:outline-hidden text-slate-800"
                  />
                  <Lock size={16} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} text-slate-400`} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <span>
                  {tab === 'login' ? t('sign_in') : tab === 'signup' ? t('sign_up') : t('send_reset_link')}
                </span>
              )}
            </button>
          </form>

          {/* Social Divider */}
          {tab !== 'forgot' && (GOOGLE_CLIENT_ID ? (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold">{t('or')}</span>
                </div>
              </div>

              {/* Real Google OAuth Component / Fallback */}
              <div className="flex justify-center w-full">
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    shape="pill"
                    text="continue_with"
                    width="100%"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="mt-5 text-center text-xs text-slate-500">
              {language === 'ar' ? 'تسجيل الدخول عبر Google غير مُعدّ.' : 'Connexion Google non configurée.'}
            </p>
          ))}

          {/* Switch tab footer */}
          <div className="mt-5 text-center text-xs text-slate-500">
            {tab === 'login' ? (
              <p>
                {t('no_account')}{' '}
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {t('sign_up')}
                </button>
              </p>
            ) : tab === 'signup' ? (
              <p>
                {t('have_account')}{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {t('sign_in')}
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setTab('login')}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                ← {t('sign_in')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
