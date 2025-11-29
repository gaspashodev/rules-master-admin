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
      console.log('[Auth] Checking admin for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] checkAdmin error:', error);
        return false;
      }
      console.log('[Auth] Admin status:', data?.is_admin);
      return data?.is_admin === true;
    } catch (err) {
      console.error('[Auth] checkAdmin exception:', err);
      return false;
    }
  };

  useEffect(() => {
    console.log('[Auth] useEffect starting...');
    
    // Timeout de sécurité : si après 5s on est toujours en loading, on arrête
    const safetyTimeout = setTimeout(() => {
      console.warn('[Auth] Safety timeout reached, forcing isLoading=false');
      setIsLoading(false);
    }, 5000);

    const initialize = async () => {
      try {
        console.log('[Auth] Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] getSession error:', error);
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        console.log('[Auth] Session:', session ? 'exists' : 'null');

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
        
        console.log('[Auth] Init complete, isAdmin:', adminStatus);
        setIsLoading(false);
        
      } catch (err) {
        console.error('[Auth] initialize exception:', err);
        setIsLoading(false);
      }
    };

    initialize();

    // Listener simple pour les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[Auth] onAuthStateChange:', event);
        
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
    console.log('[Auth] signIn attempt...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[Auth] signIn error:', error);
      return { error: error as Error, isAdmin: false };
    }
    
    if (data.user) {
      const adminStatus = await checkAdmin(data.user.id);
      
      if (!adminStatus) {
        console.log('[Auth] User is not admin, signing out');
        await supabase.auth.signOut();
        return { 
          error: new Error('Accès réservé aux administrateurs'), 
          isAdmin: false 
        };
      }
      
      setUser(data.user);
      setSession(data.session);
      setIsAdmin(true);
      console.log('[Auth] signIn success');
      return { error: null, isAdmin: true };
    }
    
    return { error: new Error('Erreur de connexion'), isAdmin: false };
  };

  const signOut = async () => {
    console.log('[Auth] signOut');
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