
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendWelcomeEmail, sendAdminNotification } from '@/lib/resend';

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
  const { toast } = useToast();

  // Admin users have access regardless of subscription
  // Regular users need subscription
  const hasAccess = isAdmin || (user?.email === 'davicastrowp@gmail.com') || isSubscribed;

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check subscription status when user changes
        if (session?.user) {
          setTimeout(async () => {
            await checkSubscriptionStatus(session.user.id);
            await checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setIsSubscribed(false);
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await checkSubscriptionStatus(session.user.id);
          await checkAdminStatus(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSubscriptionStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_type, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        // ✅ CORREÇÃO: Se tabela não existe, assumir acesso liberado para desenvolvimento
        if (error.code === 'PGRST106' || error.code === '42P01') {
          console.warn('Tabela subscriptions não encontrada, liberando acesso para desenvolvimento');
          setIsSubscribed(true);
          return;
        }
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
        return;
      }

      if (data) {
        // Check if subscription is still valid
        const isValid = !data.expires_at || new Date(data.expires_at) > new Date();
        setIsSubscribed(isValid && data.plan_type !== 'free');
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error in checkSubscriptionStatus:', error);
      // ✅ CORREÇÃO: Em caso de erro, liberar acesso para desenvolvimento
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
        if (error.code === 'PGRST106' || error.code === '42P01') {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
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

    // Se o cadastro foi bem-sucedido, enviar email de boas-vindas
    if (!error && data.user && data.user.email) {
      try {
        // Enviar email de boas-vindas
        const emailResult = await sendWelcomeEmail(data.user.email, fullName);
        
        if (emailResult.success) {
          console.log('Email de boas-vindas enviado com sucesso');
        } else {
          console.error('Erro ao enviar email de boas-vindas:', emailResult.error);
        }

        // Notificar admin sobre novo usuário
        await sendAdminNotification('Novo usuário cadastrado', {
          email: data.user.email,
          fullName: fullName,
          userId: data.user.id,
          createdAt: new Date().toISOString()
        });

      } catch (emailError) {
        console.error('Erro no envio de emails:', emailError);
        // Não retornar erro para não quebrar o fluxo de cadastro
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
