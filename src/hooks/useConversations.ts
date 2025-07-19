
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Conversation } from '@/types/chat';

export function useConversations() {
  const { user, hasAccess } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations when user is authenticated and has access
  useEffect(() => {
    if (user && hasAccess) {
      loadConversations();
    } else {
      setConversations([]);
      setLoading(false);
    }
  }, [user, hasAccess]);

  const loadConversations = async () => {
    if (!user || !hasAccess) return;

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
    if (!user || !hasAccess) {
      toast({
        title: 'Acesso negado',
        description: 'Você precisa ter uma assinatura ativa para criar conversas.',
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
    if (!user || !hasAccess) return;

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
    if (!user || !hasAccess) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida com sucesso.',
      });
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
    if (!user || !hasAccess) return;

    const original = conversations.find(conv => conv.id === id);
    if (!original) return;

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
      
      toast({
        title: 'Conversa duplicada',
        description: 'Uma nova conversa foi criada com o mesmo contexto.',
      });
    } catch (error) {
      console.error('Error duplicating conversation:', error);
      toast({
        title: 'Erro ao duplicar conversa',
        description: 'Não foi possível duplicar a conversa.',
        variant: 'destructive',
      });
    }
  };

  const toggleFavorite = async (id: string) => {
    if (!user || !hasAccess) return;

    const conversation = conversations.find(conv => conv.id === id);
    if (!conversation) return;

    const newFavoriteStatus = !conversation.isFavorite;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => 
        prev.map(conv => 
          conv.id === id 
            ? { ...conv, isFavorite: newFavoriteStatus }
            : conv
        )
      );

      toast({
        title: newFavoriteStatus ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
        description: newFavoriteStatus 
          ? 'A conversa foi adicionada aos seus favoritos.'
          : 'A conversa foi removida dos seus favoritos.',
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Erro ao alterar favorito',
        description: 'Não foi possível alterar o status de favorito.',
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
    toggleFavorite,
    reloadConversations: loadConversations
  };
}
