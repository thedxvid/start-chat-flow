import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  role?: string;
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

      await fetchUsers();
      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        throw error;
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserSubscription = async (userId: string, planType: string, status: string) => {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_type: planType,
          status: status,
          expires_at: status === 'active' ? expirationDate.toISOString() : null
        });

      if (error) {
        throw error;
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;

    try {
      // First get all users from auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
      }

      // Then get profiles, subscriptions, and roles
      const userIds = authUsers.users.map(u => u.id);
      
      const [profilesResult, subscriptionsResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        supabase.from('subscriptions').select('user_id, status, plan_type, expires_at').in('user_id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
      ]);

      // Get token stats for all users
      const tokenStatsPromises = userIds.map(async (userId) => {
        try {
          const { data, error } = await supabase.rpc('get_user_token_stats', {
            target_user_id: userId
          });
          
          if (error) {
            console.warn(`Error fetching token stats for user ${userId}:`, error);
            return { userId, stats: null };
          }

          return { 
            userId, 
            stats: data && data.length > 0 ? data[0] : null 
          };
        } catch (error) {
          console.warn(`Error fetching token stats for user ${userId}:`, error);
          return { userId, stats: null };
        }
      });

      const tokenStatsResults = await Promise.all(tokenStatsPromises);
      const tokenStatsMap = new Map(tokenStatsResults.map(result => [result.userId, result.stats]));

      const enrichedUsers: UserWithProfile[] = authUsers.users.map(user => {
        const profile = profilesResult.data?.find(p => p.user_id === user.id);
        const subscription = subscriptionsResult.data?.find(s => s.user_id === user.id);
        const roleData = rolesResult.data?.find(r => r.user_id === user.id);
        const tokenStats = tokenStatsMap.get(user.id);

        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          profile: profile ? { 
            full_name: profile.full_name,
            avatar_url: profile.avatar_url 
          } : undefined,
          subscription: subscription ? {
            status: subscription.status,
            plan_type: subscription.plan_type,
            expires_at: subscription.expires_at
          } : undefined,
          role: roleData?.role || 'user',
          tokenStats: tokenStats ? {
            total_tokens: Number(tokenStats.total_tokens) || 0,
            total_cost: Number(tokenStats.total_cost) || 0,
            conversation_count: Number(tokenStats.conversation_count) || 0,
            avg_tokens_per_conversation: Number(tokenStats.avg_tokens_per_conversation) || 0,
            last_used_at: tokenStats.last_used_at || ''
          } : undefined
        };
      });

      setUsers(enrichedUsers);

      // Calculate total token usage and cost
      const totalTokens = enrichedUsers.reduce((acc, user) => {
        return acc + (user.tokenStats?.total_tokens || 0);
      }, 0);

      const totalCostSum = enrichedUsers.reduce((acc, user) => {
        return acc + (user.tokenStats?.total_cost || 0);
      }, 0);

      setTotalTokenUsage(totalTokens);
      setTotalCost(totalCostSum);

    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

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
    fetchUsers
  };
}