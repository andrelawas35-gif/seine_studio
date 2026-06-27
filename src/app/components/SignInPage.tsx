import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { isAuthConfigured, signInWithEmail, signUpWithEmail, forgotPassword, verifyEmailCode } from "../auth";
import { SeineLogo } from "./SeineLogo";

export function SignInPage({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmail(trimmedEmail, trimmedPassword);
      if (result?.error) {
        const msg = result.error.message ?? "Sign in failed.";
        // Detect "account not found" — suggest creating one
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("invalid email")) {
          setError("Account not found. Tap 'Create an account' below to set up this email.");
        } else {
          setError(msg);
        }
        return;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email first, then tap Forgot password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await forgotPassword(trimmedEmail);
      if (result?.error) {
        setError(result.error.message ?? "Password reset failed.");
        return;
      }
      setResetSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }
    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const name = trimmedEmail === "seinestudio.info@gmail.com" ? "Seine Studio" : "Developer";
      const result = await signUpWithEmail(trimmedEmail, trimmedPassword, name);
      if (result?.error) {
        const msg = result.error.message ?? "Account creation failed.";
        if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("already registered")) {
          setError("This account already exists. Go back to Sign in or tap 'Forgot password?' to reset.");
        } else {
          setError(msg);
        }
        return;
      }
      // Skip email verification — verification must be disabled in Neon Console
      setSetupSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!verificationCode.trim() || verificationCode.trim().length < 6) {
      setError("Enter the 6-digit verification code sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailCode(verificationCode.trim());
      if (result?.error) {
        setError(result.error.message ?? "Verification failed. Check the code and try again.");
        return;
      }
      setNeedsVerification(false);
      setSetupSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <Logo />
            <p className="mt-4 text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
              Verify your email
            </p>
            <p className="mt-2 text-[12px] text-muted-foreground">
              A verification code was sent to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            {error && (
              <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                {error}
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Verification Code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="h-11 w-full border border-border bg-card px-3 text-[13px] text-foreground text-center tracking-[0.3em] outline-none placeholder:text-muted-foreground focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
                placeholder="000000"
                autoFocus
                maxLength={8}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 bg-foreground text-[11px] uppercase tracking-[0.16em] text-background transition-opacity disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Verify Email
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Check your inbox or spam folder for the code.
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (setupSuccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <Logo />
          <div className="border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-[11px] font-medium text-emerald-900">Account created</p>
            <p className="mt-2 text-[11px] leading-5 text-emerald-700">
              You can now sign in with this email and password.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setMode("signin"); setSetupSuccess(false); setEmail(""); setPassword(""); }}
            className="min-h-10 px-6 text-[12px] bg-foreground text-background"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm space-y-6 text-center">
          <Logo />
          <div className="border border-amber-200 bg-amber-50 p-5">
            <p className="text-[11px] font-medium text-amber-900">Authentication not configured</p>
            <p className="mt-2 text-[11px] leading-5 text-amber-700">
              Set <code className="font-mono text-[11px]">VITE_NEON_AUTH_URL</code> in your environment to enable sign-in.
              The sample workspace remains available without authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Logo />
          <p className="mt-4 text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
            {mode === "setup" ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={mode === "setup" ? handleSetup : submit} className="space-y-4">
          {error && (
            <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
              {error}
            </p>
          )}
          {resetSent && mode === "signin" && (
            <div className="border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-700">
              If the account exists, a password reset link has been sent to your email. Check your inbox.
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full border border-border bg-card px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              maxLength={254}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full border border-border bg-card px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={128}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 bg-foreground text-[11px] uppercase tracking-[0.16em] text-background transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {mode === "setup" ? "Create Account" : "Sign in"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-accent transition-colors"
            >
              Forgot password?
            </button>
          )}
        </form>

        <p className="mt-8 text-center text-[11px] leading-4 text-muted-foreground/60">
          Seine Studio is a private workspace. Only authorized accounts may sign in.
        </p>
        <p className="mt-3 text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "setup" : "signin"); setError(null); }}
            className="text-[11px] text-accent hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Back to sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <SeineLogo size={64} />
      <h1
        className="text-lg tracking-wide text-foreground"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Seine Studio
      </h1>
    </div>
  );
}
