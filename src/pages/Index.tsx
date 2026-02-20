
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuthSimple';
import { useConversations } from '@/hooks/useConversations';
import { useNathiChat } from '@/hooks/useNathiChat';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { AdminButton } from '@/components/AdminButton';
import {
  Settings,
  LogOut,
  Send,
  Loader2,
  ArrowRight,
  Sparkles,
  FileText,
  BarChart3,
  PenTool,
  Megaphone,
  HelpCircle,
} from 'lucide-react';
import type { Message } from '@/types/chat';
import { toast } from 'sonner';

const Index = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { conversations, createConversation, updateConversation, deleteConversation, duplicateConversation, toggleFavorite } = useConversations();
  const { sendMessage } = useNathiChat();
  const [searchParams] = useSearchParams();
  const [initialMessage, setInitialMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const forceStartScreen = searchParams.get('new') === 'true';

  if (conversations.length > 0 && !forceStartScreen) {
    return <ChatLayout />;
  }

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/?conversationId=${conversationId}`);
  };

  const handleNewChat = () => {
    navigate('/?new=true');
  };

  const handleBackToChat = () => {
    if (conversations.length > 0) {
      navigate('/');
    }
  };

  const handleStartChat = async () => {
    if (!initialMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const title = initialMessage.trim().split(' ').slice(0, 5).join(' ') + (initialMessage.split(' ').length > 5 ? '...' : '');
      const conversationId = await createConversation(title, initialMessage.trim());

      if (conversationId) {
        const userMessage: Message = {
          id: Date.now().toString(),
          content: initialMessage.trim(),
          sender: 'user',
          timestamp: new Date()
        };

        const aiResponse = await sendMessage([userMessage], conversationId);

        if (aiResponse) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date()
          };

          await updateConversation(conversationId, {
            messages: [userMessage, aiMessage],
            lastMessage: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
            timestamp: new Date()
          });
        }

        setInitialMessage('');
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast.error('Erro ao iniciar conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartChat();
    }
  };

  const quickActions = [
    {
      icon: FileText,
      label: 'Criar e-book',
      prompt: 'Quero criar um e-book. Pode me ajudar a estruturar do zero?',
    },
    {
      icon: BarChart3,
      label: 'Curso online',
      prompt: 'Quero lançar um curso online. Por onde devo começar?',
    },
    {
      icon: PenTool,
      label: 'Mentoria',
      prompt: 'Quero montar uma mentoria profissional. Como estruturo isso?',
    },
    {
      icon: Megaphone,
      label: 'Marketing digital',
      prompt: 'Preciso de uma estratégia de marketing digital. Pode me guiar?',
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setInitialMessage(prompt);
  };

  // Tela com conversas existentes + forceStartScreen
  if (conversations.length > 0) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-80 border-r border-border/40 bg-card">
          <ChatSidebar
            conversations={conversations}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            activeConversationId={undefined}
            onRenameConversation={async (id, newTitle) => {
              await updateConversation(id, { title: newTitle });
            }}
            onDeleteConversation={async (id) => {
              await deleteConversation(id);
            }}
            onToggleFavorite={toggleFavorite}
            onDuplicateConversation={async (id) => {
              await duplicateConversation(id);
            }}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <MainContent
            initialMessage={initialMessage}
            setInitialMessage={setInitialMessage}
            isLoading={isLoading}
            handleStartChat={handleStartChat}
            handleKeyPress={handleKeyPress}
            quickActions={quickActions}
            handleQuickAction={handleQuickAction}
            user={user}
            isAdmin={isAdmin}
            signOut={signOut}
            navigate={navigate}
            showBack
            handleBackToChat={handleBackToChat}
          />
        </div>
      </div>
    );
  }

  // Tela inicial sem conversas
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainContent
        initialMessage={initialMessage}
        setInitialMessage={setInitialMessage}
        isLoading={isLoading}
        handleStartChat={handleStartChat}
        handleKeyPress={handleKeyPress}
        quickActions={quickActions}
        handleQuickAction={handleQuickAction}
        user={user}
        isAdmin={isAdmin}
        signOut={signOut}
        navigate={navigate}
      />
    </div>
  );
};

// ─── Sub-componente separado para reuso ───
function MainContent({
  initialMessage,
  setInitialMessage,
  isLoading,
  handleStartChat,
  handleKeyPress,
  quickActions,
  handleQuickAction,
  user,
  isAdmin,
  signOut,
  navigate,
  showBack,
  handleBackToChat,
}: any) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header minimalista */}
      <header className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBackToChat}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              ← Voltar
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground tracking-tight">Sistema Start</span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">by Nathalia Ouro</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <AdminButton />
          <button
            onClick={() => navigate('/suporte')}
            title="Central de Suporte"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            title="Configurações"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={signOut}
            title="Sair"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Conteúdo central */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-10">

          {/* Hero */}
          <div className="text-center space-y-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-2"
              style={{ background: 'hsl(42 55% 50% / 0.1)', color: 'hsl(42 55% 38%)' }}
            >
              <Sparkles className="h-3 w-3" />
              Mentora IA especializada em marketing digital
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              Como posso te{' '}
              <span style={{ color: 'hsl(42 55% 46%)' }}>ajudar hoje?</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Sou a Nathi, sua mentora expert. Estou aqui para te guiar na criação de produtos digitais e estratégias que vendem.
            </p>
          </div>

          {/* Input */}
          <div className="relative group">
            <Textarea
              placeholder="Descreva seu projeto ou dúvida..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full min-h-[120px] sm:min-h-[140px] pr-14 text-sm sm:text-base resize-none rounded-2xl border border-border/60 bg-card shadow-sm focus:shadow-md focus:border-primary/40 transition-all placeholder:text-muted-foreground/60 px-5 py-4"
            />
            <button
              onClick={handleStartChat}
              disabled={!initialMessage.trim() || isLoading}
              className="absolute bottom-4 right-4 h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                background: initialMessage.trim() && !isLoading ? 'hsl(42 55% 50%)' : 'hsl(40 12% 88%)',
                color: initialMessage.trim() && !isLoading ? '#ffffff' : 'hsl(30 8% 60%)',
              }}
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>

          {/* Quick actions */}
          <div>
            <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-widest">
              Começar com
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action: any, index: number) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="group flex flex-col items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left"
                >
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'hsl(42 55% 50% / 0.1)' }}
                  >
                    <action.icon className="h-4 w-4" style={{ color: 'hsl(42 55% 46%)' }} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </div>
                  <ArrowRight
                    className="h-3 w-3 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: 'hsl(42 55% 50%)' }}
                  />
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="text-center py-4 px-6">
        <p className="text-xs text-muted-foreground/50">
          Sistema Start by Nathalia Ouro · IA especializada em marketing digital
        </p>
      </footer>
    </div>
  );
}

export default Index;
