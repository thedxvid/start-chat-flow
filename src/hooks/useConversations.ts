
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Conversation } from '@/types/chat';

export function useConversations() {
  const { user, hasAccess } = useAuth();
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

      const formattedConversations: Conversation[] = data.map(conv => {
        // ✅ CORREÇÃO: Tratamento correto do JSON
        let messages: any[] = [];
        
        if (typeof conv.messages === 'string') {
          try {
            const parsedMessages = JSON.parse(conv.messages);
            // ✅ CORREÇÃO: Garantir que timestamps sejam Date objects
            messages = parsedMessages.map((msg: any) => ({
              ...msg,
              timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
            }));
          } catch (e) {
            console.error('Erro ao fazer parse das mensagens:', e);
            messages = [];
          }
        } else if (Array.isArray(conv.messages)) {
          // ✅ CORREÇÃO: Garantir que timestamps sejam Date objects
          messages = conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
          }));
        }

        return {
          id: conv.id,
          title: conv.title,
          lastMessage: conv.last_message || '',
          timestamp: new Date(conv.updated_at),
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at),
          isFavorite: conv.is_favorite || false,
          messages: messages
        };
      });

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Não foi possível carregar suas conversas');
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (title: string, firstMessage: string): Promise<string | null> => {
    if (!user || !hasAccess) {
      toast.error('Você precisa ter uma assinatura ativa para criar conversas');
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

      // ✅ CORREÇÃO: Tratamento correto do JSON na criação
      let messages: any[] = [];
      
      if (typeof data.messages === 'string') {
        try {
          const parsedMessages = JSON.parse(data.messages);
          // ✅ CORREÇÃO: Garantir que timestamps sejam Date objects
          messages = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
          }));
        } catch (e) {
          console.error('Erro ao fazer parse das mensagens na criação:', e);
          messages = [];
        }
      } else if (Array.isArray(data.messages)) {
        // ✅ CORREÇÃO: Garantir que timestamps sejam Date objects
        messages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
        }));
      }

      const formattedConv: Conversation = {
        id: data.id,
        title: data.title,
        lastMessage: data.last_message,
        timestamp: new Date(data.updated_at),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        isFavorite: data.is_favorite,
        messages: messages
      };

      setConversations(prev => [formattedConv, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Não foi possível criar a conversa');
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
      toast.error('Não foi possível atualizar a conversa');
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
      
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Não foi possível excluir a conversa');
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

      // ✅ CORREÇÃO: Tratamento correto do JSON na duplicação
      let messages: any[] = [];
      
      if (typeof data.messages === 'string') {
        try {
          const parsedMessages = JSON.parse(data.messages);
          // ✅ CORREÇÃO: Garantir que timestamps sejam Date objects
          messages = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
          }));
        } catch (e) {
          console.error('Erro ao fazer parse das mensagens na duplicação:', e);
          messages = [];
        }
      } else if (Array.isArray(data.messages)) {
        // ✅ CORREÇÃO: Garantir que timestamps sejam Date objects
        messages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
        }));
      }

      const formattedConv: Conversation = {
        id: data.id,
        title: data.title,
        lastMessage: data.last_message,
        timestamp: new Date(data.updated_at),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        isFavorite: data.is_favorite,
        messages: messages
      };

      setConversations(prev => [formattedConv, ...prev]);
      
    } catch (error) {
      console.error('Error duplicating conversation:', error);
      toast.error('Não foi possível duplicar a conversa');
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

    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Não foi possível alterar o status de favorito');
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
