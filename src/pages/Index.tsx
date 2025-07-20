import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useNathiChat } from '@/hooks/useNathiChat';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { Paperclip, Search, Mic, BarChart3, FileText, PenTool, Sparkles, MoreHorizontal, LogOut, Settings, Crown } from 'lucide-react';
import type { Message } from '@/types/chat';
import { toast } from 'sonner';

const Index = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { conversations, createConversation, updateConversation } = useConversations();
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
    navigate(`/chat/${conversationId}`);
  };

  const handleNewChat = () => {
    navigate('/?new=true');
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
    { icon: FileText, label: 'Criar e-book', action: () => setInitialMessage('Oi Nathi! Quero criar um e-book e não sei por onde começar') },
    { icon: BarChart3, label: 'Curso online', action: () => setInitialMessage('Olá! Gostaria de criar um curso online mas tenho dúvidas') },
    { icon: PenTool, label: 'Mentoria', action: () => setInitialMessage('Oi! Quero estruturar uma mentoria, pode me ajudar?') },
    { icon: Sparkles, label: 'Marketing digital', action: () => setInitialMessage('Olá Nathi! Preciso de ajuda com estratégias de marketing digital') },
  ];

  // Se há conversas, mostra o layout com sidebar
  if (conversations.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-border/50 bg-card/50 backdrop-blur-sm">
          <ChatSidebar
            conversations={conversations}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            activeConversationId={null}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border/50">
            <h1 className="text-xl font-bold text-foreground">Sistema Start</h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin')}
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
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
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">Sistema Start</h1>
              <p className="text-muted-foreground text-lg">Como posso ajudá-lo hoje?</p>
            </div>

            {/* Chat Input */}
            <div className="w-full max-w-3xl mb-8">
              <div className="relative bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
                <Textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pergunte alguma coisa..."
                  className="w-full min-h-[120px] p-4 border-0 bg-transparent resize-none focus:ring-0 focus:outline-none text-base placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
                
                {/* Bottom Bar */}
                <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="ml-1 text-sm">Anexar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Search className="h-4 w-4" />
                      <span className="ml-1 text-sm">Buscar</span>
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Mic className="h-4 w-4" />
                      <span className="ml-1 text-sm">Voz</span>
                    </Button>
                    <Button
                      onClick={handleStartChat}
                      disabled={!initialMessage.trim() || isLoading}
                      size="sm"
                      className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-50"
                    >
                      {isLoading ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.action}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-card hover:bg-card-hover border-border text-foreground hover:text-primary transition-all duration-200"
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>

            {/* Additional Actions */}
            <div className="mt-6">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Mais opções
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Ao enviar mensagens, você aceita nossos Termos e nossa Política de Privacidade
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tela inicial sem conversas
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Sistema Start</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <Crown className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Sistema Start</h1>
          <p className="text-muted-foreground text-lg">Como posso ajudá-lo hoje?</p>
        </div>

        {/* Chat Input */}
        <div className="w-full max-w-3xl mb-8">
          <div className="relative bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            <Textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pergunte alguma coisa..."
              className="w-full min-h-[120px] p-4 border-0 bg-transparent resize-none focus:ring-0 focus:outline-none text-base placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            
            {/* Bottom Bar */}
            <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="ml-1 text-sm">Anexar</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Search className="h-4 w-4" />
                  <span className="ml-1 text-sm">Buscar</span>
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Mic className="h-4 w-4" />
                  <span className="ml-1 text-sm">Voz</span>
                </Button>
                <Button
                  onClick={handleStartChat}
                  disabled={!initialMessage.trim() || isLoading}
                  size="sm"
                  className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 bg-card hover:bg-card-hover border-border text-foreground hover:text-primary transition-all duration-200"
            >
              <action.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Additional Actions */}
        <div className="mt-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Mais opções
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Ao enviar mensagens, você aceita nossos Termos e nossa Política de Privacidade
        </p>
      </div>
    </div>
  );
};

export default Index;
