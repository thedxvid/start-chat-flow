import { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { useNathiChat } from '@/hooks/useNathiChat';
import type { Message, Conversation } from '@/types/chat';

export function ChatLayout() {
  const navigate = useNavigate();
  const { conversations, updateConversation } = useConversations();
  const { sendMessage, isLoading } = useNathiChat();
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Set first conversation as active when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

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
    }
  };

  const activeConversation = conversations.find(conv => conv.id === activeConversationId);

  return (
    <div className="h-screen flex bg-background">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50 bg-card shadow-chat"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition-transform duration-300 ease-in-out
        w-80 md:w-96 flex-shrink-0 relative z-40
        ${isSidebarOpen ? 'md:relative' : ''}
      `}>
        <ChatSidebar
          conversations={conversations}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          activeConversationId={activeConversationId}
        />
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 min-w-0">
        <ChatArea
          conversationId={activeConversationId}
          messages={activeConversation?.messages || []}
          onSendMessage={handleSendMessage}
          isTyping={isLoading}
        />
      </div>
    </div>
  );
}