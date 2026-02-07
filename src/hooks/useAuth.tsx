import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isModerator: boolean;
  canAccessBackoffice: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; canAccessBackoffice: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const canAccessBackoffice = isAdmin || isModerator;

  const checkRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return 'user';
      }
      return data?.role || 'user';
    } catch {
      return 'user';
    }
  };

  useEffect(() => {
    // Timeout de sécurité : si après 5s on est toujours en loading, on arrête
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setSession(null);
          setUser(null);
          setRole('user');
          setIsLoading(false);
          return;
        }

        if (!session) {
          setSession(null);
          setUser(null);
          setRole('user');
          setIsLoading(false);
          return;
        }

        // On a une session
        setSession(session);
        setUser(session.user);

        const userRole = await checkRole(session.user.id);
        setRole(userRole);
        setIsLoading(false);

      } catch {
        setIsLoading(false);
      }
    };

    initialize();

    // Listener simple pour les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole('user');
        }

        // Pour les autres événements, on met juste à jour la session
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error, canAccessBackoffice: false };
    }

    if (data.user) {
      const userRole = await checkRole(data.user.id);

      if (userRole === 'user') {
        await supabase.auth.signOut();
        return {
          error: new Error('Accès réservé aux administrateurs et modérateurs'),
          canAccessBackoffice: false
        };
      }

      setUser(data.user);
      setSession(data.session);
      setRole(userRole);
      return { error: null, canAccessBackoffice: true };
    }

    return { error: new Error('Erreur de connexion'), canAccessBackoffice: false };
  };

  const signOut = async () => {
    setRole('user');
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, role, isAdmin, isModerator, canAccessBackoffice, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
