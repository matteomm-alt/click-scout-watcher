import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'society_admin' | 'coach';

interface UserRole {
  role: AppRole;
  society_id: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: UserRole[];
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);

  const loadRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, society_id')
      .eq('user_id', userId);
    if (error) {
      console.error('Failed to load roles', error);
      setRoles([]);
      return;
    }
    setRoles((data ?? []) as UserRole[]);
  };

  useEffect(() => {
    // 1. Listener PRIMA di getSession (richiesto)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Defer per evitare deadlock dentro il callback
          setTimeout(() => loadRoles(newSession.user.id), 0);
        } else {
          setRoles([]);
        }
      }
    );

    // 2. Carica sessione corrente
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadRoles(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const refreshRoles = async () => {
    if (user) await loadRoles(user.id);
  };

  const isSuperAdmin = roles.some((r) => r.role === 'super_admin');

  return (
    <AuthContext.Provider
      value={{ session, user, loading, roles, isSuperAdmin, signOut, refreshRoles }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
