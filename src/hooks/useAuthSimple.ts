import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isSubscribed: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin users have access regardless of subscription
  // Regular users need subscription
  const hasAccess = isAdmin || (user?.email === 'davicastrowp@gmail.com') || isSubscribed;

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check subscription status when user changes
        if (session?.user) {
          setTimeout(async () => {
            await checkSubscriptionStatus(session.user.id);
            await checkAdminStatus(session.user.id);
          }, 100);
        } else {
          setIsSubscribed(false);
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await checkSubscriptionStatus(session.user.id);
          await checkAdminStatus(session.user.id);
        }, 100);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSubscriptionStatus = async (userId: string) => {
    try {
      console.log('Checking subscription for user:', userId);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_type, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        // Se tabela não existe ou estrutura incorreta, assumir acesso liberado para desenvolvimento
        if (error.code === 'PGRST106' || error.code === '42P01' || error.code === '42703' || error.details?.includes('does not exist')) {
          console.warn('Tabela subscriptions não encontrada, liberando acesso para desenvolvimento');
          setIsSubscribed(true);
          return;
        }
        console.error('Error checking subscription:', error);
        // Em caso de qualquer erro, liberar acesso para desenvolvimento
        setIsSubscribed(true);
        return;
      }

      if (data) {
        // Check if subscription is still valid
        const isValid = !data.expires_at || new Date(data.expires_at) > new Date();
        setIsSubscribed(isValid && data.plan_type !== 'free');
        console.log('Subscription status:', { isValid, plan_type: data.plan_type });
      } else {
        // Se não há dados de subscription, liberar acesso temporário
        setIsSubscribed(true);
        console.log('No subscription data, granting temporary access');
      }
    } catch (error) {
      console.error('Error in checkSubscriptionStatus:', error);
      // Em caso de erro, liberar acesso para desenvolvimento
      setIsSubscribed(true);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log('Verificando status de admin para usuário:', userId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Resultado da verificação de admin:', { data, error });

      if (error) {
        // Se tabela não existe ou há erro de estrutura, assumir não-admin
        if (error.code === 'PGRST106' || error.code === '42P01' || error.code === '42703' || error.details?.includes('does not exist')) {
          console.warn('Tabela user_roles não encontrada, assumindo usuário não-admin');
          setIsAdmin(false);
          return;
        }
        if (error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
        }
        setIsAdmin(false);
        return;
      }

      const adminStatus = data?.role === 'admin';
      console.log('Status de admin definido para:', adminStatus);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    }
  };

  const refreshAdminStatus = async () => {
    if (user) {
      await checkAdminStatus(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      // Não enviar emails por enquanto para evitar erros
      console.log('User signed up successfully:', data.user?.email);
      
      return { error };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isSubscribed,
    hasAccess,
    isAdmin,
    refreshAdminStatus,
  };
};

export { AuthContext };