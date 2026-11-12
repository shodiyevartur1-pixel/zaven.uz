import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getConfiguredOwnerEmail,
  isDevDemoAuthAllowed,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';

export type AuthMode = 'supabase' | 'dev_demo' | 'unauthenticated';

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

  const allowedOwnerEmail = getConfiguredOwnerEmail();

  // Verify whether a signed-in Supabase user is the allowlisted single owner
  const verifySupabaseOwner = async (
    email: string | undefined
  ): Promise<boolean> => {
    if (!email || !supabase) return false;
    const normalized = email.toLowerCase();

    // 1. If VITE_OWNER_EMAIL is set, enforce exact match immediately
    if (allowedOwnerEmail && normalized !== allowedOwnerEmail) {
      return false;
    }

    // 2. Query `public.owner_allowlist` table (protected by RLS)
    try {
      const { data, error } = await supabase
        .from('owner_allowlist')
        .select('email')
        .ilike('email', normalized)
        .maybeSingle();

      if (!error && data?.email) {
        return true;
      }
    } catch {
      // Fall through to Edge Function or env match
    }

    // 3. Fallback if VITE_OWNER_EMAIL matched
    return Boolean(allowedOwnerEmail && normalized === allowedOwnerEmail);
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoadingAuth(true);

      // Priority 1: Real Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
          const isVerified = await verifySupabaseOwner(session.user.email);
          if (isMounted) {
            if (isVerified) {
              setIsOwnerAuthenticated(true);
              setOwnerEmail(session.user.email);
              setAuthMode('supabase');
            } else {
              await supabase.auth.signOut();
              setIsOwnerAuthenticated(false);
              setOwnerEmail(null);
              setAuthMode('unauthenticated');
              setAuthError(
                'Ushbu email doʻkon egasi (Owner) sifatida ruxsatlar roʻyxatiga kiritilmagan.'
              );
            }
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
      } = configuredSupabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user?.email) {
          const isVerified = await verifySupabaseOwner(session.user.email);
          if (isVerified) {
            setIsOwnerAuthenticated(true);
            setOwnerEmail(session.user.email);
            setAuthMode('supabase');
            setAuthError(null);
          } else {
            await configuredSupabase.auth.signOut();
            setIsOwnerAuthenticated(false);
            setOwnerEmail(null);
            setAuthMode('unauthenticated');
          }
        } else if (authMode === 'supabase') {
          setIsOwnerAuthenticated(false);
          setOwnerEmail(null);
          setAuthMode('unauthenticated');
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
    if (allowedOwnerEmail && cleanEmail !== allowedOwnerEmail) {
      setAuthError(
        'Ruxsat rad etildi: Faqat doʻkon egasi (Owner) hisobiga kirish mumkin.'
      );
      return false;
    }

    setIsLoadingAuth(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user?.email) {
      setIsLoadingAuth(false);
      setAuthError(
        error?.message ||
          'Login yoki parol notoʻgʻri. Iltimos, qaytadan tekshiring.'
      );
      return false;
    }

    const verified = await verifySupabaseOwner(data.user.email);
    if (!verified) {
      await supabase.auth.signOut();
      setIsLoadingAuth(false);
      setAuthError(
        'Ushbu hisob owner_allowlist jadvalida tasdiqlanmagan. Kirish rad etildi.'
      );
      return false;
    }

    setIsOwnerAuthenticated(true);
    setOwnerEmail(data.user.email);
    setAuthMode('supabase');
    setIsLoadingAuth(false);
    return true;
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
