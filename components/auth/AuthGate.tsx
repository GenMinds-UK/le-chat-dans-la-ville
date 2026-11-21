"use client";

import { useEffect, useState, type ReactNode } from "react";
import { signOut, watchAuthUser, type AuthUser } from "@/lib/supabase/auth";
import AuthForm from "./AuthForm";

// Shows the sign-in form until there is a signed-in user, then the children.
// onUser fires on reload, sign-in and sign-out; pass the game store's setUser.
export default function AuthGate({
  children,
  onUser,
}: {
  children: ReactNode;
  onUser?: (user: AuthUser | null) => void;
}) {
  // undefined = still checking the saved session
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      return watchAuthUser((u) => {
        setUser(u);
        onUser?.(u);
      });
    } catch (err: any) {
      setConfigError(err?.message ?? "Sign-in is not configured.");
    }
    // onUser is expected to be stable (a store action).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (configError) return <p className="auth-error">{configError}</p>;
  if (user === undefined) return <p className="auth-notice">Loading…</p>;
  if (!user) return <AuthForm />;

  return (
    <>
      <div className="auth-bar">
        <span>{user.email}</span>
        <button type="button" className="auth-link" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}
