import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return false;
      }
      return data?.is_admin === true;
    } catch {
      return false;
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
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        if (!session) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // On a une session
        setSession(session);
        setUser(session.user);

        const adminStatus = await checkAdmin(session.user.id);
        setIsAdmin(adminStatus);
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
          setIsAdmin(false);
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
      return { error: error as Error, isAdmin: false };
    }

    if (data.user) {
      const adminStatus = await checkAdmin(data.user.id);

      if (!adminStatus) {
        await supabase.auth.signOut();
        return {
          error: new Error('Accès réservé aux administrateurs'),
          isAdmin: false
        };
      }

      setUser(data.user);
      setSession(data.session);
      setIsAdmin(true);
      return { error: null, isAdmin: true };
    }

    return { error: new Error('Erreur de connexion'), isAdmin: false };
  };

  const signOut = async () => {
    setIsAdmin(false);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signIn, signOut }}>
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
