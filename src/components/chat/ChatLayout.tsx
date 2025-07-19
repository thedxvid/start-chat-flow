import { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { StatsModal } from '@/components/stats/StatsModal';
import { ConversationMenu } from '@/components/conversation/ConversationMenu';
import { Button } from '@/components/ui/button';
import { Menu, X, Settings, BarChart3 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useKeyboard } from '@/hooks/useKeyboard';
import type { Message, Conversation, ChatSettings } from '@/types/chat';
import { defaultChatSettings, generateConversationTitle } from '@/utils/chatUtils';

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sample data for demonstration
  useEffect(() => {
    const sampleConversations: Conversation[] = [
      {
        id: '1',
        title: 'Como começar meu negócio?',
        lastMessage: 'Ótimas dicas! Vou começar com o planejamento financeiro.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30),
        isFavorite: false,
        messages: [
          {
            id: 'm1',
            content: 'Olá! Estou pensando em abrir meu próprio negócio, mas não sei por onde começar. Você pode me ajudar?',
            sender: 'user',
            timestamp: new Date(Date.now() - 1000 * 60 * 45)
          },
          {
            id: 'm2',
            content: 'Claro! Fico feliz em ajudar você a dar esse passo importante. Vamos começar com algumas perguntas essenciais:\n\n1. **Identifique sua paixão e expertise**: O que você ama fazer e em que é bom?\n2. **Pesquise o mercado**: Existe demanda para sua ideia?\n3. **Defina seu público-alvo**: Quem são seus clientes ideais?\n4. **Faça um plano de negócios**: Inclua análise financeira, estratégias de marketing e operações.\n\nQual dessas áreas você gostaria de explorar primeiro?',
            sender: 'ai',
            timestamp: new Date(Date.now() - 1000 * 60 * 43)
          },
          {
            id: 'm3',
            content: 'Ótimas dicas! Vou começar com o planejamento financeiro.',
            sender: 'user',
            timestamp: new Date(Date.now() - 1000 * 60 * 30)
          }
        ]
      },
      {
        id: '2',
        title: 'Estratégias de marketing digital',
        lastMessage: 'Perfeito! O Instagram e LinkedIn serão ideais para seu público.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        isFavorite: true,
        messages: [
          {
            id: 'm4',
            content: 'Preciso de ajuda com marketing digital para minha startup. Quais plataformas devo focar?',
            sender: 'user',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
          },
          {
            id: 'm5',
            content: 'Excelente pergunta! A escolha das plataformas depende do seu público-alvo e tipo de negócio. Aqui estão as principais opções:\n\n📱 **Instagram**: Ideal para produtos visuais, público jovem (18-34 anos)\n💼 **LinkedIn**: Perfeito para B2B, networking profissional\n📘 **Facebook**: Alcance amplo, ótimo para anúncios segmentados\n🎵 **TikTok**: Tendências, público Gen Z\n🐦 **Twitter**: Notícias, engajamento em tempo real\n\nQual é o seu segmento e público-alvo?',
            sender: 'ai',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 2)
          },
          {
            id: 'm6',
            content: 'Minha startup é de consultoria em tecnologia, focada em empresas médias.',
            sender: 'user',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 5)
          },
          {
            id: 'm7',
            content: 'Perfeito! Para consultoria em tecnologia B2B, recomendo:\n\n🎯 **LinkedIn** (prioridade máxima):\n- Publique artigos sobre tendências tech\n- Conecte com tomadores de decisão\n- Participe de grupos do setor\n\n📸 **Instagram**:\n- Mostre bastidores da empresa\n- Cases de sucesso visuais\n- Stories com dicas rápidas\n\n📧 **Email Marketing**:\n- Newsletter semanal com insights\n- Nurturing de leads qualificados\n\nComece com LinkedIn e depois expanda!',
            sender: 'ai',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 8)
          },
          {
            id: 'm8',
            content: 'Perfeito! O Instagram e LinkedIn serão ideais para seu público.',
            sender: 'user',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 10)
          }
        ]
      }
    ];
    
    setConversations(sampleConversations);
    setActiveConversationId(sampleConversations[0].id);
  }, []);

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'Nova conversa',
      lastMessage: '',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
      messages: []
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const updatedMessages = [...conv.messages, userMessage];
        const title = conv.messages.length === 0 
          ? content.substring(0, 50) + (content.length > 50 ? '...' : '')
          : conv.title;
        
        return {
          ...conv,
          title,
          messages: updatedMessages,
          lastMessage: content,
          timestamp: new Date()
        };
      }
      return conv;
    }));

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(content),
        sender: 'ai',
        timestamp: new Date()
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversationId) {
          const updatedMessages = [...conv.messages, aiMessage];
          return {
            ...conv,
            messages: updatedMessages,
            lastMessage: aiMessage.content.substring(0, 50) + '...',
            timestamp: new Date()
          };
        }
        return conv;
      }));

      setIsTyping(false);
    }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5s
  };

  const generateAIResponse = (userMessage: string): string => {
    // Simple AI response simulation
    const responses = [
      `Entendo sua pergunta sobre "${userMessage.substring(0, 30)}...". Deixe-me ajudar você com algumas sugestões práticas:\n\n1. Primeiro, vamos analisar o contexto atual\n2. Identificar as melhores estratégias\n3. Criar um plano de ação específico\n\nVocê gostaria que eu detalhe algum desses pontos?`,
      
      `Ótima pergunta! Com base no que você compartilhou, posso sugerir algumas abordagens eficazes:\n\n✅ **Estratégia imediata**: Comece com pequenos passos\n✅ **Médio prazo**: Desenvolva um plano estruturado\n✅ **Longo prazo**: Monitore e ajuste conforme necessário\n\nQual aspecto você gostaria de explorar primeiro?`,
      
      `Vejo que você está focado em melhorar essa área. Aqui estão minhas recomendações:\n\n🎯 **Foco principal**: Defina objetivos claros\n📊 **Métricas**: Estabeleça indicadores de sucesso\n🔄 **Iteração**: Ajuste baseado nos resultados\n\nPrecisa de mais detalhes sobre algum ponto específico?`,
      
      `Perfeito! Essa é uma questão muito importante. Com minha experiência, posso te orientar da seguinte forma:\n\n💡 **Insight chave**: A consistência é fundamental\n🚀 **Ação prática**: Comece hoje mesmo\n📈 **Resultados**: Monitore o progresso regularmente\n\nVamos detalhar um plano específico para sua situação?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
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
          isTyping={isTyping}
        />
      </div>
    </div>
  );
}