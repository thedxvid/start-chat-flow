
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuthSimple';
import { useConversations } from '@/hooks/useConversations';
import { useNathiChat } from '@/hooks/useNathiChat';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { AdminButton } from '@/components/AdminButton';
import { 
  Paperclip, 
  Search, 
  Mic, 
  BarChart3, 
  FileText, 
  PenTool, 
  Sparkles, 
  MoreHorizontal, 
  LogOut, 
  Settings, 
  Crown,
  ArrowLeft,
  Send,
  Loader2
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

  // Verifica se deve forçar mostrar a tela inicial
  const forceStartScreen = searchParams.get('new') === 'true';
  
  // Se há conversas existentes E não está forçando a tela inicial, mostra o chat layout
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
      // Gera um título baseado na mensagem inicial
      const title = initialMessage.trim().split(' ').slice(0, 5).join(' ') + (initialMessage.split(' ').length > 5 ? '...' : '');
      
      // Cria a conversa com a mensagem inicial
      const conversationId = await createConversation(title, initialMessage.trim());
      
      if (conversationId) {
        // Prepara as mensagens para enviar para a IA
        const userMessage: Message = {
          id: Date.now().toString(),
          content: initialMessage.trim(),
          sender: 'user',
          timestamp: new Date()
        };

        // Envia mensagem para a Nathi IA
        const aiResponse = await sendMessage([userMessage], conversationId);
        
        if (aiResponse) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date()
          };

          // Atualiza a conversa com a resposta da IA
          await updateConversation(conversationId, {
            messages: [userMessage, aiMessage],
            lastMessage: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
            timestamp: new Date()
          });
        }

        setInitialMessage('');
        toast.success('Conversa iniciada com a Nathi!');
        // Navega para o chat sem forçar nova conversa
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
      label: "Criar e-book",
      description: "Estruture seu e-book do zero",
      color: "from-blue-500 to-blue-600",
      prompt: "Oi Nathi! Quero criar um e-book e não sei por onde começar"
    },
    {
      icon: BarChart3,
      label: "Curso online", 
      description: "Desenvolva um curso completo",
      color: "from-green-500 to-green-600",
      prompt: "Olá! Gostaria de criar um curso online mas tenho dúvidas"
    },
    {
      icon: PenTool,
      label: "Mentoria",
      description: "Monte sua mentoria profissional",
      color: "from-purple-500 to-purple-600",
      prompt: "Oi! Quero estruturar uma mentoria, pode me ajudar?"
    },
    {
      icon: Sparkles,
      label: "Marketing digital",
      description: "Estratégias e táticas eficazes",
      color: "from-orange-500 to-orange-600",
      prompt: "Olá Nathi! Preciso de ajuda com estratégias de marketing digital"
    }
  ];

  const handleQuickAction = (prompt: string) => {
    setInitialMessage(prompt);
  };

  // Se há conversas, mostra o layout com sidebar
  if (conversations.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-border/50 bg-card/50 backdrop-blur-sm">
          <ChatSidebar
            conversations={conversations}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            activeConversationId={null}
            onRenameConversation={async (id, newTitle) => {
              await updateConversation(id, { title: newTitle });
              toast.success('Conversa renomeada!');
            }}
            onDeleteConversation={async (id) => {
              await deleteConversation(id);
              toast.success('Conversa excluída!');
            }}
            onToggleFavorite={toggleFavorite}
            onDuplicateConversation={async (id) => {
              await duplicateConversation(id);
              toast.success('Conversa duplicada!');
            }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBackToChat}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Chat
              </Button>
            </div>
            <h1 className="text-xl font-bold text-foreground">Nova Conversa</h1>
            <div className="flex items-center gap-2">
              <AdminButton />
              <Button
                onClick={() => navigate('/settings')}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                onClick={signOut}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-4xl w-full space-y-8">
              {/* Hero Section */}
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center mb-6">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-foreground">
                  Olá! Como posso te ajudar hoje?
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Sou a Nathi, sua mentora expert em marketing digital. Vamos criar algo incrível juntos!
                </p>
              </div>

              {/* Input Area */}
              <div className="relative max-w-3xl mx-auto">
                <Textarea
                  placeholder="Conte-me sobre seu projeto ou objetivo..."
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="min-h-[120px] pr-16 text-base resize-none border-2 border-border/50 focus:border-primary rounded-2xl"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    💡 Dica: Seja específico sobre seus objetivos
                  </Badge>
                  <Button
                    onClick={handleStartChat}
                    disabled={!initialMessage.trim() || isLoading}
                    size="sm"
                    className="rounded-xl"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {quickActions.map((action, index) => (
                  <Card
                    key={index}
                    className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-primary/20"
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center flex-shrink-0`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground mb-2">
                          {action.label}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela inicial sem conversas
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Start Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <AdminButton />
          <Button
            onClick={() => navigate('/settings')}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={signOut}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center mb-6">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Olá! Como posso te ajudar hoje?
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sou a Nathi, sua mentora expert em marketing digital. Vamos criar algo incrível juntos!
            </p>
          </div>

          {/* Input Area */}
          <div className="relative max-w-3xl mx-auto">
            <Textarea
              placeholder="Conte-me sobre seu projeto ou objetivo..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[120px] pr-16 text-base resize-none border-2 border-border/50 focus:border-primary rounded-2xl"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                💡 Dica: Seja específico sobre seus objetivos
              </Badge>
              <Button
                onClick={handleStartChat}
                disabled={!initialMessage.trim() || isLoading}
                size="sm"
                className="rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-primary/20"
                onClick={() => handleQuickAction(action.prompt)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center flex-shrink-0`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground mb-2">
                      {action.label}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
