import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Conversation } from '@/types/chat';

export function useConversations() {
  const { user, isSubscribed } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations when user is authenticated
  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setLoading(false);
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedConversations: Conversation[] = data.map(conv => ({
        id: conv.id,
        title: conv.title,
        lastMessage: conv.last_message || '',
        timestamp: new Date(conv.updated_at),
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
        isFavorite: conv.is_favorite || false,
        messages: Array.isArray(conv.messages) ? conv.messages as any[] : []
      }));

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erro ao carregar conversas',
        description: 'Não foi possível carregar suas conversas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (title: string, firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    // Check subscription limits for free users
    if (!isSubscribed && conversations.length >= 3) {
      toast({
        title: 'Limite atingido',
        description: 'Usuários gratuitos podem ter até 3 conversas. Faça upgrade para Premium!',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const newConversation = {
        user_id: user.id,
        title,
        last_message: firstMessage,
        is_favorite: false,
        messages: JSON.stringify([{
          id: crypto.randomUUID(),
          content: firstMessage,
          sender: 'user',
          timestamp: new Date().toISOString()
        }])
      };

      const { data, error } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single();

      if (error) throw error;

      const formattedConv: Conversation = {
        id: data.id,
        title: data.title,
        lastMessage: data.last_message,
        timestamp: new Date(data.updated_at),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        isFavorite: data.is_favorite,
        messages: Array.isArray(data.messages) ? JSON.parse(data.messages as unknown as string) : []
      };

      setConversations(prev => [formattedConv, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Erro ao criar conversa',
        description: 'Não foi possível criar a conversa.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    if (!user) return;

    try {
      const dbUpdates: any = {};
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.lastMessage) dbUpdates.last_message = updates.lastMessage;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
      if (updates.messages) dbUpdates.messages = JSON.stringify(updates.messages);
      
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('conversations')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => 
        prev.map(conv => 
          conv.id === id 
            ? { ...conv, ...updates, timestamp: new Date() }
            : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: 'Erro ao atualizar conversa',
        description: 'Não foi possível atualizar a conversa.',
        variant: 'destructive',
      });
    }
  };

  const deleteConversation = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== id));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Erro ao excluir conversa',
        description: 'Não foi possível excluir a conversa.',
        variant: 'destructive',
      });
    }
  };

  const duplicateConversation = async (id: string) => {
    if (!user) return;

    const original = conversations.find(conv => conv.id === id);
    if (!original) return;

    // Check subscription limits for free users
    if (!isSubscribed && conversations.length >= 3) {
      toast({
        title: 'Limite atingido',
        description: 'Usuários gratuitos podem ter até 3 conversas. Faça upgrade para Premium!',
        variant: 'destructive',
      });
      return;
    }

    try {
      const duplicatedConv = {
        user_id: user.id,
        title: `${original.title} (Cópia)`,
        last_message: original.lastMessage,
        is_favorite: false,
        messages: JSON.stringify(original.messages)
      };

      const { data, error } = await supabase
        .from('conversations')
        .insert(duplicatedConv)
        .select()
        .single();

      if (error) throw error;

      const formattedConv: Conversation = {
        id: data.id,
        title: data.title,
        lastMessage: data.last_message,
        timestamp: new Date(data.updated_at),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        isFavorite: data.is_favorite,
        messages: Array.isArray(data.messages) ? JSON.parse(data.messages as unknown as string) : []
      };

      setConversations(prev => [formattedConv, ...prev]);
    } catch (error) {
      console.error('Error duplicating conversation:', error);
      toast({
        title: 'Erro ao duplicar conversa',
        description: 'Não foi possível duplicar a conversa.',
        variant: 'destructive',
      });
    }
  };

  return {
    conversations,
    loading,
    createConversation,
    updateConversation,
    deleteConversation,
    duplicateConversation,
    reloadConversations: loadConversations
  };
}