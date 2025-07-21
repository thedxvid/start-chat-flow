# API e Integrações

## 🔗 Visão Geral das Integrações

O Sistema Start integra-se com várias APIs externas e serviços para fornecer funcionalidades completas de chat com IA, autenticação e pagamentos.

## 🧠 Integração OpenAI

### Configuração
A integração com OpenAI é feita através de **Supabase Edge Functions**, garantindo segurança e escalabilidade.

```typescript
// Configuração base
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
```

### Modelo Utilizado
- **Modelo**: `gpt-4.1-mini-2025-04-14`
- **Temperature**: 0.7 (criatividade balanceada)
- **Max Tokens**: 2000
- **System Prompt**: Personalidade da "Nathi"

### Edge Function: chat-nathi

#### Endpoint
```
POST /functions/v1/chat-nathi
```

#### Request Body
```typescript
interface ChatRequest {
  messages: Message[];
  conversationId?: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}
```

#### Response
```typescript
interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}
```

#### Implementação
```typescript
serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    
    // Prepara mensagens para OpenAI
    const openAIMessages = [
      { role: 'system', content: NATHI_PROMPT },
      ...messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Chama OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-nathi function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Prompt da Nathi
O sistema utiliza um prompt extensivo que define a personalidade da IA:

```typescript
const NATHI_PROMPT = `
OBJETIVO
Atue como mentora do usuário nos temas em <foco> com o principal objetivo de ajudar o usuário a criar o seu produto digital, seja e-book, curso on-line ou mentoria.

PAPEL
Você é Nathalia Carvalho IA, uma versão IA da Nathi, sua criadora...

// Prompt completo com mais de 3000 palavras definindo:
// - Personalidade e tom de voz
// - Conhecimento específico
// - Fluxo de atendimento estruturado
// - Regras de comportamento
// - Casos de uso específicos
`;
```

## 🔐 Integração Supabase

### Cliente Supabase
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wpqthkvidfmjyroaijiq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "...";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

### Autenticação
```typescript
// Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign Up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: { full_name: 'John Doe' }
  }
});

// Sign Out
await supabase.auth.signOut();
```

### Database Operations
```typescript
// Select com RLS
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('conversations')
  .insert({
    user_id: user.id,
    title: 'Nova Conversa',
    messages: JSON.stringify([])
  });

// Update
const { data, error } = await supabase
  .from('conversations')
  .update({ title: 'Título Atualizado' })
  .eq('id', conversationId);

// Delete
const { data, error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', conversationId);
```

### Real-time Subscriptions
```typescript
// Escutar mudanças em tempo real
const subscription = supabase
  .channel('conversations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'conversations',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

## 💳 Integração Kiwify (Webhook)

### Edge Function: kiwify-webhook

#### Endpoint
```
POST /functions/v1/kiwify-webhook
```

#### Request (Webhook do Kiwify)
```typescript
interface KiwifyWebhook {
  order_id: string;
  order_status: string;
  customer_email: string;
  product_id: string;
  product_name: string;
  payment_method: string;
  // ... outros campos
}
```

#### Implementação
```typescript
serve(async (req) => {
  try {
    const webhookData = await req.json();
    
    // Verifica assinatura do webhook (segurança)
    const signature = req.headers.get('x-kiwify-signature');
    if (!verifyWebhookSignature(signature, webhookData)) {
      throw new Error('Invalid webhook signature');
    }
    
    // Processa o webhook
    switch (webhookData.order_status) {
      case 'paid':
        await createOrUpdateSubscription(webhookData);
        break;
      case 'refunded':
        await cancelSubscription(webhookData);
        break;
      case 'expired':
        await expireSubscription(webhookData);
        break;
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function createOrUpdateSubscription(data: KiwifyWebhook) {
  // Busca usuário pelo email
  const { data: user } = await supabase.auth.admin.listUsers({
    filter: { email: data.customer_email }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Cria/atualiza assinatura
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      kiwify_order_id: data.order_id,
      plan_type: mapProductToPlan(data.product_id),
      status: 'active',
      expires_at: calculateExpirationDate(data)
    });
}
```

## 🎨 Integração com Bibliotecas UI

### React Query Integration
```typescript
// Hook personalizado para chat
export const useNathiChat = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    messages: Message[], 
    conversationId?: string
  ): Promise<string | null> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-nathi', {
        body: { messages, conversationId }
      });

      if (error) throw new Error('Erro ao processar mensagem');
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

      return data.message;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao conversar com a mentora.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading };
};
```

### Toast Notifications (Sonner)
```typescript
import { toast } from 'sonner';

// Success toast
toast.success('Conversa criada com sucesso!');

// Error toast
toast.error('Erro ao criar conversa');

// Loading toast
const loadingToast = toast.loading('Processando...');
toast.dismiss(loadingToast);

// Custom toast
toast('Custom message', {
  description: 'Descrição adicional',
  action: {
    label: 'Ação',
    onClick: () => console.log('Ação executada'),
  },
});
```

## 📡 APIs Internas

### useConversations Hook
```typescript
interface ConversationsAPI {
  conversations: Conversation[];
  loading: boolean;
  createConversation: (title: string, firstMessage: string) => Promise<string | null>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  duplicateConversation: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reloadConversations: () => Promise<void>;
}
```

### useAuth Hook
```typescript
interface AuthAPI {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isSubscribed: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
}
```

## 🔧 Error Handling

### Padrão de Tratamento de Erros
```typescript
// Wrapper para chamadas de API
async function apiCall<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    toast.error(errorMessage);
    return null;
  }
}

// Uso
const result = await apiCall(
  () => supabase.from('conversations').select('*'),
  'Erro ao carregar conversas'
);
```

### Status Codes
```typescript
// OpenAI API errors
switch (response.status) {
  case 401:
    throw new Error('API key inválida');
  case 429:
    throw new Error('Rate limit excedido');
  case 500:
    throw new Error('Erro interno da OpenAI');
  default:
    throw new Error(`Erro HTTP: ${response.status}`);
}
```

## 🚀 Rate Limiting e Otimização

### Debouncing
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSave = useDebouncedCallback(
  async (content: string) => {
    await saveConversation(content);
  },
  1000 // 1 segundo
);
```

### Caching Strategy
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

## 📊 Monitoramento e Logs

### Structured Logging
```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

function log(entry: LogEntry) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}
```

### Metrics Collection
```typescript
// Métricas de uso da API
const metrics = {
  openai_requests: 0,
  openai_tokens: 0,
  conversation_created: 0,
  errors: 0,
};

// Incrementar métricas
function incrementMetric(name: keyof typeof metrics, value = 1) {
  metrics[name] += value;
}
```

---

Esta documentação cobre todas as principais integrações do sistema, fornecendo exemplos práticos e padrões de implementação seguros e escaláveis. 