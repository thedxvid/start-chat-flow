import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  password: string;
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
      // Create user via Supabase Auth Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.fullName
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Set role if specified
      if (userData.role === 'admin') {
        await supabase.rpc('make_user_admin', {
          user_email: userData.email
        });
      }

      // Create subscription if plan type specified
      if (userData.planType && userData.planType !== 'free') {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

        await supabase
          .from('subscriptions')
          .insert({
            user_id: authData.user.id,
            plan_type: userData.planType,
            status: 'active',
            expires_at: expirationDate.toISOString()
          });
      }

      // Enviar email de boas-vindas se solicitado
      if (userData.sendWelcomeEmail) {
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
      return { success: true, user: authData.user };
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
      // Get users from auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        throw authError;
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      // Get subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*');

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('*');

      // Get token usage stats
      const { data: tokenStats } = await supabase
        .from('token_usage')
        .select(`
          user_id,
          tokens_used,
          cost,
          created_at
        `);

      // Combine data
      const usersWithData = authUsers.users.map(authUser => {
        const profile = profiles?.find(p => p.user_id === authUser.id);
        const subscription = subscriptions?.find(s => s.user_id === authUser.id);
        const role = userRoles?.find(r => r.user_id === authUser.id);
        
        // Calculate token stats for this user
        const userTokens = tokenStats?.filter(t => t.user_id === authUser.id) || [];
        const totalTokens = userTokens.reduce((sum, t) => sum + (t.tokens_used || 0), 0);
        const totalCost = userTokens.reduce((sum, t) => sum + (t.cost || 0), 0);
        const conversationCount = userTokens.length;
        const avgTokensPerConversation = conversationCount > 0 ? totalTokens / conversationCount : 0;
        const lastUsedAt = userTokens.length > 0 ? 
          Math.max(...userTokens.map(t => new Date(t.created_at).getTime())) : null;

        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          profile: profile ? {
            full_name: profile.full_name || '',
            avatar_url: profile.avatar_url
          } : undefined,
          subscription: subscription ? {
            status: subscription.status,
            plan_type: subscription.plan_type,
            expires_at: subscription.expires_at
          } : undefined,
          role: role?.role || 'user',
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