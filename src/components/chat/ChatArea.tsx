import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

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
    if (inputValue.trim() && !isTyping) {
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

  const formatTimestamp = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Agora';
    }
    return dateObj.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      // ✅ CORREÇÃO: Tratamento seguro do timestamp
      const timestamp = typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp;
      
      if (isNaN(timestamp.getTime())) {
        // Se timestamp inválido, usar data atual
        timestamp.setTime(Date.now());
      }
      
      const dateKey = timestamp.toLocaleDateString('pt-BR', {
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
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background/95 to-muted/20">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-2xl">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Bem-vindo ao Start Chat
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Sua mentora expert está pronta para ajudar você a criar produtos digitais incríveis. 
              Inicie uma nova conversa para começar!
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                🎯 Marketing Digital
              </Badge>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                📚 E-books
              </Badge>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                🎓 Cursos Online
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center shadow-lg">
            <img 
              src="/lovable-uploads/2004ae96-8379-47a2-9892-02c1385bf95c.png" 
              alt="Mentora Expert" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-primary flex items-center justify-center"><Bot class="h-5 w-5 text-white" /></div>';
              }}
            />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Nathi - Mentora Expert</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-muted-foreground">
                {isTyping ? 'Digitando...' : 'Online agora'}
              </p>
            </div>
          </div>
          {isTyping && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Pensando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-6">
                <Separator className="flex-1" />
                <Badge variant="outline" className="text-xs text-muted-foreground bg-background/80">
                  {date}
                </Badge>
                <Separator className="flex-1" />
              </div>
              
              <div className="space-y-4">
                {dayMessages.map((message, index) => {
                  const isFirst = index === 0 || dayMessages[index - 1].sender !== message.sender;
                  const isLast = index === dayMessages.length - 1 || dayMessages[index + 1].sender !== message.sender;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''} ${!isFirst ? 'mt-1' : ''}`}
                    >
                      {/* Avatar */}
                      {isFirst && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                          message.sender === 'user' 
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-white' 
                            : 'bg-gradient-primary overflow-hidden'
                        }`}>
                          {message.sender === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <img 
                              src="/lovable-uploads/6e7516e8-25b6-4f1e-8ceb-de974ccd23d8.png" 
                              alt="Mentora Expert" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<Bot class="h-4 w-4 text-white" />';
                              }}
                            />
                          )}
                        </div>
                      )}
                      {!isFirst && <div className="w-8" />}

                      {/* Message Bubble */}
                      <div className={`max-w-[75%] ${message.sender === 'user' ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block p-4 rounded-2xl shadow-lg transition-all hover:shadow-xl ${
                            message.sender === 'user'
                              ? 'bg-gradient-to-br from-primary to-primary/90 text-white rounded-br-md'
                              : 'bg-card border border-border/50 text-foreground rounded-bl-md'
                          } ${!isFirst ? (message.sender === 'user' ? 'rounded-tr-md' : 'rounded-tl-md') : ''}`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        {isLast && (
                          <p className={`text-xs text-muted-foreground mt-2 ${
                            message.sender === 'user' ? 'text-right' : 'text-left'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary overflow-hidden flex-shrink-0 shadow-md">
                <img 
                  src="/lovable-uploads/6e7516e8-25b6-4f1e-8ceb-de974ccd23d8.png" 
                  alt="Mentora Expert" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<Bot class="h-4 w-4 text-white" />';
                  }}
                />
              </div>
              <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-bl-md shadow-lg max-w-[75%]">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Converse com a Nathi sobre seus projetos..."
                className="w-full p-4 text-sm border border-border/50 rounded-2xl bg-background/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none min-h-[52px] max-h-[120px] shadow-sm transition-all"
                rows={1}
                disabled={isTyping}
              />
              {inputValue.length > 0 && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {inputValue.length}/2000
                </div>
              )}
            </div>
            <Button
              onClick={handleSend}
              size="sm"
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-primary hover:bg-primary-hover text-white shadow-lg min-w-[52px] h-[52px] rounded-2xl transition-all hover:scale-105 disabled:hover:scale-100"
            >
              {isTyping ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Enter para enviar • Shift + Enter para nova linha</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Conectado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}