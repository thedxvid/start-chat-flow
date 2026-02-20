import { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { useNathiChat } from '@/hooks/useNathiChat';
import { toast } from 'sonner';
import type { Message, Conversation } from '@/types/chat';

export function ChatLayout() {
  const navigate = useNavigate();
  const {
    conversations,
    updateConversation,
    deleteConversation,
    duplicateConversation,
    toggleFavorite
  } = useConversations();
  const { sendMessage, isLoading } = useNathiChat();
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Fechado por padrão no mobile

  // Set first conversation as active when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewChat = () => {
    // Navega para a tela inicial forçando mostrar a interface de nova conversa
    navigate('/?new=true');
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await updateConversation(id, { title: newTitle });
      toast.success('Conversa renomeada com sucesso!');
    } catch (error) {
      console.error('Erro ao renomear conversa:', error);
      toast.error('Erro ao renomear conversa');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);

      // Se a conversa deletada estava ativa, seleciona outra
      if (activeConversationId === id) {
        const remainingConversations = conversations.filter(c => c.id !== id);
        if (remainingConversations.length > 0) {
          setActiveConversationId(remainingConversations[0].id);
        } else {
          // Se não há mais conversas, volta para a tela inicial
          navigate('/?new=true');
        }
      }

      toast.success('Conversa excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast.error('Erro ao excluir conversa');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      toast.error('Erro ao alterar favorito');
    }
  };

  const handleDuplicateConversation = async (id: string) => {
    try {
      await duplicateConversation(id);
      toast.success('Conversa duplicada com sucesso!');
    } catch (error) {
      console.error('Erro ao duplicar conversa:', error);
      toast.error('Erro ao duplicar conversa');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || isLoading) return;

    const activeConversation = conversations.find(conv => conv.id === activeConversationId);
    if (!activeConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to conversation
    const updatedMessages = [...activeConversation.messages, userMessage];

    // Update conversation with user message
    await updateConversation(activeConversationId, {
      messages: updatedMessages,
      lastMessage: content,
      timestamp: new Date()
    });

    // Send message to Nathi AI
    try {
      const aiResponse = await sendMessage(updatedMessages, activeConversationId);

      if (aiResponse) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        };

        const finalMessages = [...updatedMessages, aiMessage];

        // Update conversation with AI response
        await updateConversation(activeConversationId, {
          messages: finalMessages,
          lastMessage: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem para a Nathi:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const activeConversation = conversations.find(conv => conv.id === activeConversationId);

  return (
    <div className="h-screen flex bg-background overflow-hidden relative">
      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:relative top-0 left-0 h-full z-40
        w-72 sm:w-80 md:w-80 lg:w-96 flex-shrink-0
        bg-background md:bg-transparent
        shadow-2xl md:shadow-none
        ${!isSidebarOpen ? 'pointer-events-none md:pointer-events-auto' : ''}
      `}>
        <ChatSidebar
          conversations={conversations}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          activeConversationId={activeConversationId}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onToggleFavorite={handleToggleFavorite}
          onDuplicateConversation={handleDuplicateConversation}
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Mobile overlay — captures touch/click to close sidebar */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsSidebarOpen(false); }}
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 min-w-0 h-full">
        <ChatArea
          conversationId={activeConversationId}
          messages={activeConversation?.messages || []}
          onSendMessage={handleSendMessage}
          isTyping={isLoading}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>
    </div>
  );
}