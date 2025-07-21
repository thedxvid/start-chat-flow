import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthSimple';
import { sendWelcomeEmail, sendAdminNotification } from '@/lib/resend';

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
  subscription?: {
    status: string;
    plan_type: string;
    expires_at: string;
  };
 
  tokenStats?: {
    total_tokens: number;
    total_cost: number;
    conversation_count: number;
    avg_tokens_per_conversation: number;
    last_used_at: string;
  };
}

interface CreateUserData {
  email: string;
  fullName: string;
  role?: 'user' | 'admin';
  planType?: 'free' | 'premium' | 'pro';
  sendWelcomeEmail?: boolean;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [totalTokenUsage, setTotalTokenUsage] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
      }

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const makeUserAdmin = async (email: string) => {
    try {
      const { error } = await supabase.rpc('make_user_admin', {
        user_email: email
      });

      if (error) {
        throw error;
      }

      await fetchUsers();

      // Notificar admin sobre nova promoção
      await sendAdminNotification('Usuário promovido a admin', {
        promotedEmail: email,
        promotedBy: user?.email,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error making user admin:', error);
      return { success: false, error: error.message };
    }
  };

  const createUser = async (userData: CreateUserData) => {
    try {
      // Usar nova função corrigida v3
      const { data, error } = await supabase.rpc('create_admin_user_v3', {
        user_email: userData.email,
        user_full_name: userData.fullName,
        user_role: userData.role || 'user',
        plan_type: userData.planType || 'free'
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw new Error(`Erro na função do banco: ${error.message}`);
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Falha ao criar usuário - resposta inválida';
        console.error('Admin user creation failed:', data);
        throw new Error(errorMsg);
      }

      // Enviar email de boas-vindas se solicitado
      if (userData.sendWelcomeEmail !== false) {
        try {
          const emailResult = await sendWelcomeEmail(userData.email, userData.fullName);
          if (!emailResult.success) {
            console.error('Erro ao enviar email de boas-vindas:', emailResult.error);
          }
        } catch (emailError) {
          console.error('Erro no envio de email:', emailError);
        }
      }

      // Notificar admin sobre criação de usuário
      await sendAdminNotification('Usuário criado via painel admin', {
        newUser: {
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role || 'user',
          planType: userData.planType || 'free'
        },
        createdBy: user?.email,
        timestamp: new Date().toISOString()
      });

      await fetchUsers();
      
      return { 
        success: true, 
        message: data.message || 'Usuário criado com sucesso! Ele receberá instruções por email.'
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw error;
      }

      // Notificar admin sobre exclusão de usuário
      await sendAdminNotification('Usuário excluído', {
        deletedUser: {
          id: userId,
          email: userEmail
        },
        deletedBy: user?.email,
        timestamp: new Date().toISOString()
      });

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserSubscription = async (
    userId: string, 
    planType: 'free' | 'premium' | 'pro',
    userEmail?: string
  ) => {
    try {
      if (planType === 'free') {
        // Remove subscription
        await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', userId);
      } else {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        // Insert or update subscription
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_type: planType,
            status: 'active',
            expires_at: expirationDate.toISOString()
          });
      }

      // Notificar admin sobre mudança de assinatura
      await sendAdminNotification('Assinatura atualizada', {
        user: {
          id: userId,
          email: userEmail
        },
        newPlan: planType,
        updatedBy: user?.email,
        timestamp: new Date().toISOString()
      });

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchUsers = async () => {
    try {
      // Usar nova função RPC corrigida v3
      const { data: adminUsers, error } = await supabase.rpc('get_admin_users_v3');
      
      if (error) {
        throw error;
      }

      // Get token usage stats
      const { data: tokenStats } = await supabase
        .from('token_usage')
        .select(`
          user_id,
          tokens_used,
          cost,
          created_at
        `);

      // Process data from RPC function
      const usersWithData = (adminUsers || []).map((userData: any) => {
        // Calculate token stats for this user
        const userTokens = tokenStats?.filter(t => t.user_id === userData.user_id) || [];
        const totalTokens = userTokens.reduce((sum, t) => sum + (t.tokens_used || 0), 0);
        const totalCost = userTokens.reduce((sum, t) => sum + (t.cost || 0), 0);
        const conversationCount = userTokens.length;
        const avgTokensPerConversation = conversationCount > 0 ? totalTokens / conversationCount : 0;
        const lastUsedAt = userTokens.length > 0 ? 
          Math.max(...userTokens.map(t => new Date(t.created_at).getTime())) : null;

        return {
          id: userData.user_id,
          email: userData.email || '',
          created_at: userData.created_at,
          profile: {
            full_name: userData.full_name || '',
            avatar_url: null
          },
          subscription: {
            status: userData.status || 'inactive',
            plan_type: userData.plan_type || 'free',
            expires_at: null
          },
          role: userData.role || 'user',
          tokenStats: {
            total_tokens: totalTokens,
            total_cost: totalCost,
            conversation_count: conversationCount,
            avg_tokens_per_conversation: avgTokensPerConversation,
            last_used_at: lastUsedAt ? new Date(lastUsedAt).toISOString() : ''
          }
        };
      });

      setUsers(usersWithData);

      // Calculate totals
      const totalTokens = usersWithData.reduce((sum, user) => 
        sum + (user.tokenStats?.total_tokens || 0), 0);
      const totalCostValue = usersWithData.reduce((sum, user) => 
        sum + (user.tokenStats?.total_cost || 0), 0);

      setTotalTokenUsage(totalTokens);
      setTotalCost(totalCostValue);

    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Função para reenviar email de boas-vindas
  const resendWelcomeEmail = async (email: string, fullName: string) => {
    try {
      const result = await sendWelcomeEmail(email, fullName);
      
      if (result.success) {
        // Notificar admin sobre reenvio
        await sendAdminNotification('Email de boas-vindas reenviado', {
          recipient: email,
          resentBy: user?.email,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error resending welcome email:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    isAdmin,
    loading,
    users,
    totalTokenUsage,
    totalCost,
    makeUserAdmin,
    createUser,
    deleteUser,
    updateUserSubscription,
    fetchUsers,
    resendWelcomeEmail
  };
}