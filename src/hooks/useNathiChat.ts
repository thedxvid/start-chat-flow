import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { toast } from 'sonner';

export const useNathiChat = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    messages: Message[],
    conversationId?: string
  ): Promise<string | null> => {
    setIsLoading(true);

    try {
      console.log('Enviando mensagem para', conversationId === 'suporte' ? 'Aurora' : 'Nathi', ':', { conversationId, messageCount: messages.length });

      const { data, error } = await supabase.functions.invoke('chat-nathi', {
        body: {
          messages,
          conversationId
        }
      });

      if (error) {
        console.error('Erro na função chat-nathi:', error);
        throw new Error('Erro ao processar mensagem');
      }

      if (!data?.success) {
        console.error('Resposta de erro da API:', data);
        throw new Error(data?.error || 'Erro desconhecido');
      }

      console.log('Resposta recebida com sucesso');
      return data.message;

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao conversar com a IA. Tente novamente.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendMessage,
    isLoading
  };
};