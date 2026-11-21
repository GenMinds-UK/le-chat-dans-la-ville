"use client";

import { useState, type FormEvent } from "react";
import { MIN_PASSWORD_LENGTH, signIn, signUp, type AuthUser } from "@/lib/supabase/auth";

type Mode = "signin" | "signup";

// Email and password sign-in / sign-up. On success it hands the user to
// onSignedIn; pass the game store's setUser.
export default function AuthForm({ onSignedIn }: { onSignedIn?: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result =
        mode === "signup"
          ? await signUp(email.trim(), password)
          : await signIn(email.trim(), password);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation)
        setNotice("Check your email for a confirmation link, then sign in.");
      else if (result.user) onSignedIn?.(result.user);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setNotice(null);
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2>{mode === "signin" ? "Sign in" : "Create an account"}</h2>

      <label>
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label>
        Password
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && (
          <small>At least {MIN_PASSWORD_LENGTH} characters.</small>
        )}
      </label>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="auth-notice">{notice}</p>}

      <button type="submit" disabled={busy}>
        {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
      </button>

      <p className="auth-switch">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button type="button" className="auth-link" onClick={switchMode}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
