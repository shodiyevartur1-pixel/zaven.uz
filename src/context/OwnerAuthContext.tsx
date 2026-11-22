import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  getConfiguredOwnerEmail,
  isDevDemoAuthAllowed,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';

export type AuthMode = 'supabase' | 'dev_demo' | 'unauthenticated';
type OwnerVerificationResult =
  | { allowed: true }
  | { allowed: false; reason: 'not_allowlisted' | 'check_failed' };

const ownerVerificationError = (
  reason: 'not_allowlisted' | 'check_failed'
) =>
  reason === 'check_failed'
    ? 'Doʻkon egasi ruxsati tekshirilmadi. Supabase ulanishini tekshiring.'
    : 'Supabase Auth emailingiz owner_allowlist jadvaliga kiritilmagan.';

interface OwnerAuthContextType {
  isOwnerAuthenticated: boolean;
  isLoadingAuth: boolean;
  ownerEmail: string | null;
  authMode: AuthMode;
  authError: string | null;
  isSupabaseReady: boolean;
  isDevPreviewAllowed: boolean;
  signInWithSupabase: (email: string, password: string) => Promise<boolean>;
  signInDevPreviewOwner: (emailInput?: string) => boolean;
  signOutOwner: () => Promise<void>;
}

const DEV_SESSION_STORAGE_KEY = 'zaven_dev_owner_session_v1';

const OwnerAuthContext = createContext<OwnerAuthContextType | undefined>(
  undefined
);

export const OwnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] =
    useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('unauthenticated');
  const [authError, setAuthError] = useState<string | null>(null);
  const verificationSequenceRef = useRef(0);

  const allowedOwnerEmail = getConfiguredOwnerEmail();

  // Verify whether a signed-in Supabase user is the allowlisted single owner
  const verifySupabaseOwner = async (
    email: string | undefined
  ): Promise<OwnerVerificationResult> => {
    if (!email || !supabase) {
      return { allowed: false, reason: 'check_failed' };
    }
    // Match the database's RLS predicate instead of treating the frontend
    // owner-email setting as proof of database authorization. This also keeps
    // a stale frontend setting from blocking the database-authorized owner.
    try {
      const { data, error } = await supabase.rpc('is_store_owner');
      if (error) return { allowed: false, reason: 'check_failed' };
      return data === true
        ? { allowed: true }
        : { allowed: false, reason: 'not_allowlisted' };
    } catch {
      return { allowed: false, reason: 'check_failed' };
    }
  };

  useEffect(() => {
    let isMounted = true;

    const verifySession = async (email: string) => {
      const sequence = ++verificationSequenceRef.current;
      const verification = await verifySupabaseOwner(email);
      if (!isMounted || sequence !== verificationSequenceRef.current) return;

      setIsOwnerAuthenticated(verification.allowed);
      setOwnerEmail(verification.allowed ? email : null);
      setAuthMode(verification.allowed ? 'supabase' : 'unauthenticated');
      setAuthError(
        verification.allowed ? null : ownerVerificationError(verification.reason)
      );
      setIsLoadingAuth(false);
    };

    const initAuth = async () => {
      setIsLoadingAuth(true);

      // Priority 1: Real Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user?.email) {
            await verifySession(session.user.email);
            return;
          }
        } catch {
          if (isMounted) {
            setIsOwnerAuthenticated(false);
            setOwnerEmail(null);
            setAuthMode('unauthenticated');
            setAuthError(ownerVerificationError('check_failed'));
            setIsLoadingAuth(false);
          }
          return;
        }
      }

      // Priority 2: Local Dev-Only Preview Session (Strictly disabled in production builds)
      if (isDevDemoAuthAllowed) {
        try {
          const savedDevEmail = sessionStorage.getItem(DEV_SESSION_STORAGE_KEY);
          if (savedDevEmail && isMounted) {
            setIsOwnerAuthenticated(true);
            setOwnerEmail(savedDevEmail);
            setAuthMode('dev_demo');
            setIsLoadingAuth(false);
            return;
          }
        } catch {
          // Ignore storage error
        }
      }

      if (isMounted) {
        setIsOwnerAuthenticated(false);
        setOwnerEmail(null);
        setAuthMode('unauthenticated');
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Subscribe to Supabase Auth state changes
    const configuredSupabase = supabase;
    if (isSupabaseConfigured && configuredSupabase) {
      const {
        data: { subscription },
      } = configuredSupabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          setIsLoadingAuth(true);
          // Supabase auth callbacks must return synchronously; defer the RPC
          // until after its internal lock has been released.
          window.setTimeout(() => {
            void verifySession(session.user.email!);
          }, 0);
        } else {
          verificationSequenceRef.current += 1;
          setIsOwnerAuthenticated(false);
          setOwnerEmail(null);
          setAuthMode('unauthenticated');
          setAuthError(null);
          setIsLoadingAuth(false);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const signInWithSupabase = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      setAuthError(
        'Supabase ulanmagan. .env.local faylida VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY qiymatlarini kiriting.'
      );
      return false;
    }

    const cleanEmail = email.trim().toLowerCase();
    setIsLoadingAuth(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user?.email) {
        setAuthError(
          error?.message ||
            'Login yoki parol notoʻgʻri. Iltimos, qaytadan tekshiring.'
        );
        return false;
      }

      const verification = await verifySupabaseOwner(data.user.email);
      if (!verification.allowed) {
        setIsOwnerAuthenticated(false);
        setOwnerEmail(null);
        setAuthMode('unauthenticated');
        setAuthError(ownerVerificationError(verification.reason));
        return false;
      }

      setIsOwnerAuthenticated(true);
      setOwnerEmail(data.user.email);
      setAuthMode('supabase');
      setAuthError(null);
      return true;
    } catch {
      setAuthError(ownerVerificationError('check_failed'));
      return false;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signInDevPreviewOwner = (emailInput?: string): boolean => {
    setAuthError(null);
    if (!isDevDemoAuthAllowed) {
      setAuthError(
        'Production muhitida demo kirish oʻchirilgan. Haqiqiy Supabase Owner hisobi talab qilinadi.'
      );
      return false;
    }

    const previewEmail =
      emailInput?.trim() || allowedOwnerEmail || 'owner@zaven.uz (Dev Preview)';
    try {
      sessionStorage.setItem(DEV_SESSION_STORAGE_KEY, previewEmail);
    } catch {
      // Ignore storage error
    }
    setIsOwnerAuthenticated(true);
    setOwnerEmail(previewEmail);
    setAuthMode('dev_demo');
    return true;
  };

  const signOutOwner = async (): Promise<void> => {
    try {
      sessionStorage.removeItem(DEV_SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setIsOwnerAuthenticated(false);
    setOwnerEmail(null);
    setAuthMode('unauthenticated');
    setAuthError(null);
  };

  return (
    <OwnerAuthContext.Provider
      value={{
        isOwnerAuthenticated,
        isLoadingAuth,
        ownerEmail,
        authMode,
        authError,
        isSupabaseReady: isSupabaseConfigured,
        isDevPreviewAllowed: isDevDemoAuthAllowed,
        signInWithSupabase,
        signInDevPreviewOwner,
        signOutOwner,
      }}
    >
      {children}
    </OwnerAuthContext.Provider>
  );
};

export const useOwnerAuth = (): OwnerAuthContextType => {
  const context = useContext(OwnerAuthContext);
  if (!context) {
    throw new Error('useOwnerAuth must be used within an OwnerAuthProvider');
  }
  return context;
};
