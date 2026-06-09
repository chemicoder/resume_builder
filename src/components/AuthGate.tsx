import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2, Lock, UserRound, KeyRound, ArrowLeft } from 'lucide-react';
import { authRedirectUrl, enableAnonymousAuth, isAuthConfigured, supabase } from '../lib/supabaseClient';

type AuthMode = 'password' | 'magic-link' | 'reset';

interface AuthGateProps {
  onContinueAsGuest: () => void;
}

async function createConfirmedAccount(email: string, password: string) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || 'Could not create the account. Please try again.');
  }

  return body as { created: boolean };
}

export default function AuthGate({ onContinueAsGuest }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('password');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  // When `sentMessage` is set it's shown in the confirmation panel instead of
  // the default "we sent a verification link" copy — used for the reset flow.
  const [sentMessage, setSentMessage] = useState<string>('');
  const [error, setError] = useState('');

  const ensureAuthConfigured = () => {
    if (!supabase || !isAuthConfigured) {
      setError('Login is not configured yet.');
      return false;
    }
    return true;
  };

  const handleMagicLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!ensureAuthConfigured()) return;

    setIsSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authRedirectUrl,
      },
    });
    setIsSending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSentTo(email);
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!ensureAuthConfigured()) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSending(true);
    let response;

    if (isCreatingAccount) {
      try {
        await createConfirmedAccount(normalizedEmail, password);
      } catch (error) {
        setIsSending(false);
        setError(error instanceof Error ? error.message : 'Could not create the account. Please try again.');
        return;
      }
    }

    response = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setIsSending(false);

    if (response.error) {
      if (isCreatingAccount) {
        setError('The account was created, but this password did not sign in. Try signing in again or continue without email.');
      } else if (/invalid login credentials/i.test(response.error.message)) {
        setError('Email or password did not match. Create an account if this is your first time, or continue without email.');
      } else {
        setError(response.error.message);
      }
      return;
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!ensureAuthConfigured()) return;
    if (!email) {
      setError('Enter your email to receive a reset link.');
      return;
    }

    setIsSending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl,
    });
    setIsSending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSentTo(email);
    setSentMessage(`We sent a password reset link to ${email}. Open it in this browser, then choose a new password.`);
  };

  const handleAnonymousSignIn = async () => {
    setError('');

    if (!enableAnonymousAuth) {
      onContinueAsGuest();
      return;
    }

    if (!ensureAuthConfigured()) {
      onContinueAsGuest();
      return;
    }

    setIsSending(true);
    const { error: signInError } = await supabase.auth.signInAnonymously();
    setIsSending(false);

    if (signInError) {
      onContinueAsGuest();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Mail size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Resume - SoftBrane</h1>
            <p className="text-sm text-gray-500">Sign in to continue building your resume.</p>
          </div>
        </div>

        {sentTo ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <CheckCircle2 size={18} />
                Check your email
              </div>
              <p className="text-sm leading-relaxed">
                {sentMessage || (
                  <>We sent a secure verification link to <span className="font-semibold">{sentTo}</span>. Open it in this browser to verify your email.</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSentTo('');
                setSentMessage('');
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to sign in
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mode !== 'reset' && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setMode('password');
                    setError('');
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('magic-link');
                    setError('');
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'magic-link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Email link
                </button>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                {error}
              </div>
            )}

            {mode === 'password' ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  {isCreatingAccount
                    ? 'Create an account with email and password. No verification email is required.'
                    : 'Sign in with your password, or continue without email to start immediately.'}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {isSending ? 'Please wait...' : isCreatingAccount ? 'Create account' : 'Sign in'}
                </button>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingAccount((value) => !value);
                      setError('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {isCreatingAccount ? 'Have an account? Sign in' : 'Create an account'}
                  </button>
                  {!isCreatingAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setError('');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </form>
            ) : mode === 'reset' ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Enter the email you signed up with. We&apos;ll send a link to set a new password.</p>
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                  {isSending ? 'Sending reset link...' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('password');
                    setError('');
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  {isSending ? 'Sending link...' : 'Send verification link'}
                </button>
              </form>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleAnonymousSignIn}
              disabled={isSending}
              className="w-full border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-800 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <UserRound size={18} />}
              Continue without email
            </button>
            <p className="text-xs text-gray-500 text-center">
              Guest work is saved in this browser. Sign in later if you need account-based AI access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
