import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import expertAvatar from '@/assets/expert-avatar.png';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatAreaProps {
  conversationId?: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isTyping?: boolean;
}

export function ChatArea({ 
  conversationId, 
  messages, 
  onSendMessage, 
  isTyping = false 
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 5 * 24; // 5 lines * 24px line height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = message.timestamp.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  if (!conversationId) {
    return (
      <div className="flex flex-col h-full bg-gradient-chat">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
              <Bot className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Bem-vindo ao Sistema Start
            </h2>
            <p className="text-muted-foreground mb-6">
              Sua mentora expert está pronta para ajudar. Inicie uma nova conversa para começar!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                Expert em Marketing
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Respostas Rápidas
              </Badge>
              <Badge variant="secondary" className="text-xs">
                24/7 Disponível
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gradient-chat">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center shadow-chat">
            <img 
              src="/lovable-uploads/2004ae96-8379-47a2-9892-02c1385bf95c.png" 
              alt="Mentora Expert" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Mentora Expert</h2>
            <p className="text-sm text-muted-foreground">
              {isTyping ? 'Digitando...' : 'Online'}
            </p>
          </div>
          {isTyping && (
            <div className="ml-auto">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              <div className="flex items-center gap-2 my-4">
                <Separator className="flex-1" />
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {date}
                </Badge>
                <Separator className="flex-1" />
              </div>
              
              <div className="space-y-4">
                {dayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === 'user' 
                        ? 'bg-chat-user text-chat-user-foreground' 
                        : 'bg-gradient-primary overflow-hidden'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                         <img 
                           src="/lovable-uploads/6e7516e8-25b6-4f1e-8ceb-de974ccd23d8.png" 
                           alt="Mentora Expert" 
                           className="w-full h-full object-cover"
                         />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[70%] ${message.sender === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block p-3 rounded-lg shadow-message ${
                          message.sender === 'user'
                            ? 'bg-chat-user text-chat-user-foreground rounded-br-sm'
                            : 'bg-chat-ai text-chat-ai-foreground rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${
                        message.sender === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary overflow-hidden flex-shrink-0">
                 <img 
                   src="/lovable-uploads/6e7516e8-25b6-4f1e-8ceb-de974ccd23d8.png" 
                   alt="Mentora Expert" 
                   className="w-full h-full object-cover"
                 />
              </div>
              <div className="bg-chat-ai text-chat-ai-foreground p-3 rounded-lg rounded-bl-sm shadow-message">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Converse com sua mentora expert..."
              className="w-full p-3 pr-4 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[44px] max-h-[120px]"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            size="sm"
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-elegant min-w-[44px] h-[44px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Enter para enviar • Shift + Enter para nova linha
        </p>
      </div>
    </div>
  );
}