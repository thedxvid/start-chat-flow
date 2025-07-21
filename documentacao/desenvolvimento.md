# Guia de Desenvolvimento

## 🎯 Princípios de Desenvolvimento

### Filosofia do Projeto
- **Simplicidade**: Prefira soluções simples e diretas
- **Manutenibilidade**: Código limpo e bem documentado
- **Escalabilidade**: Arquitetura preparada para crescimento
- **Performance**: Otimização contínua da experiência do usuário
- **Segurança**: Segurança por design em todas as camadas

### Regras Gerais
1. **Sempre responda em português brasileiro**
2. **Prefira soluções simples** antes de implementar soluções complexas
3. **Evite duplicação de código** - reutilize componentes e funções
4. **Considere diferentes ambientes**: dev, test e prod
5. **Seja cauteloso** - faça apenas as mudanças solicitadas
6. **Mantenha código bem estruturado** e organizado
7. **Evite arquivos com mais de 200-300 linhas**

## 📁 Estrutura e Organização

### Estrutura de Arquivos
```
src/
├── components/          # Componentes React reutilizáveis
│   ├── auth/           # Componentes de autenticação
│   ├── chat/           # Componentes do chat
│   ├── ui/             # Componentes base (shadcn/ui)
│   └── [feature]/      # Componentes por funcionalidade
├── hooks/              # Custom hooks
├── pages/              # Páginas da aplicação
├── types/              # Definições TypeScript
├── utils/              # Funções utilitárias
├── integrations/       # Integrações externas
└── lib/                # Configurações e helpers
```

### Convenções de Nomenclatura

#### Arquivos e Pastas
```typescript
// Componentes: PascalCase
ChatArea.tsx
UserProfile.tsx

// Hooks: camelCase com prefixo 'use'
useAuth.ts
useConversations.ts

// Utilities: camelCase
chatUtils.ts
dateHelpers.ts

// Types: camelCase
chat.ts
user.ts

// Pastas: kebab-case
chat-sidebar/
user-profile/
```

#### Variáveis e Funções
```typescript
// Variáveis: camelCase
const userMessage = "Hello";
const isLoading = false;

// Constantes: SCREAMING_SNAKE_CASE
const API_ENDPOINTS = {
  CHAT: '/api/chat',
  AUTH: '/api/auth'
};

// Funções: camelCase
function handleSubmit() {}
const formatDate = (date: Date) => {};

// Componentes: PascalCase
const ChatMessage = () => {};
```

## 🏗️ Padrões de Componentes

### 1. Componentes Funcionais
```typescript
// Template básico para componentes
import React from 'react';

interface ComponentNameProps {
  // Props tipadas
  title: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  onAction,
  children
}) => {
  // Hooks no topo
  const [state, setState] = useState<string>('');
  
  // Handlers
  const handleClick = () => {
    onAction?.();
  };
  
  // Early returns para condições
  if (!title) {
    return null;
  }
  
  // JSX
  return (
    <div className="component-wrapper">
      <h2>{title}</h2>
      {children}
      <button onClick={handleClick}>Action</button>
    </div>
  );
};
```

### 2. Custom Hooks
```typescript
// Pattern para custom hooks
import { useState, useEffect, useCallback } from 'react';

interface UseFeatureOptions {
  initialValue?: string;
  onError?: (error: Error) => void;
}

interface UseFeatureReturn {
  data: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useFeature = (options: UseFeatureOptions = {}): UseFeatureReturn => {
  const { initialValue = null, onError } = options;
  
  const [data, setData] = useState<string | null>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [onError]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
```

### 3. Context Providers
```typescript
// Pattern para Context
import React, { createContext, useContext, useReducer } from 'react';

interface State {
  user: User | null;
  loading: boolean;
}

type Action = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: State = {
  user: null,
  loading: false
};

const StateContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

function stateReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within StateProvider');
  }
  return context;
};
```

## 🔧 Padrões de Desenvolvimento

### 1. Error Handling
```typescript
// Pattern para tratamento de erros
async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Ocorreu um erro'
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    
    // Log estruturado
    if (error instanceof Error) {
      console.error({
        message: errorMessage,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    // Notificação ao usuário
    toast.error(errorMessage);
    
    return null;
  }
}

// Uso
const result = await handleAsyncOperation(
  () => supabase.from('conversations').select('*'),
  'Erro ao carregar conversas'
);
```

### 2. API Calls com Supabase
```typescript
// Pattern para operações com Supabase
interface DatabaseOperation<T> {
  operation: () => Promise<{ data: T | null; error: any }>;
  successMessage?: string;
  errorMessage: string;
}

async function executeDbOperation<T>({
  operation,
  successMessage,
  errorMessage
}: DatabaseOperation<T>): Promise<T | null> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      throw new Error(error.message || errorMessage);
    }
    
    if (successMessage) {
      toast.success(successMessage);
    }
    
    return data;
  } catch (error) {
    console.error(errorMessage, error);
    toast.error(errorMessage);
    return null;
  }
}

// Uso
const conversations = await executeDbOperation({
  operation: () => supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId),
  errorMessage: 'Erro ao carregar conversas'
});
```

### 3. Loading States
```typescript
// Pattern para estados de loading
const useAsyncOperation = <T>() => {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null
  });
  
  const execute = async (operation: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await operation();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  };
  
  return { ...state, execute };
};
```

## 🎨 Padrões de Estilização

### 1. Tailwind Classes
```typescript
// Organize classes por categoria
const styles = {
  container: "flex flex-col min-h-screen bg-background",
  header: "flex items-center justify-between p-4 border-b border-border",
  content: "flex-1 overflow-hidden",
  sidebar: "w-80 bg-card border-r border-border",
  main: "flex-1 flex flex-col"
};

// Use o pattern cn() para classes condicionais
import { cn } from '@/lib/utils';

const buttonVariants = cn(
  "inline-flex items-center justify-center rounded-md",
  "px-4 py-2 text-sm font-medium transition-colors",
  {
    "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
    "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
    "border border-input hover:bg-accent hover:text-accent-foreground": variant === "outline"
  }
);
```

### 2. Componentes Reutilizáveis
```typescript
// Crie variantes com class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button: React.FC<ButtonProps> = ({ 
  className, 
  variant, 
  size, 
  ...props 
}) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};
```

## 🔍 Testing Patterns

### 1. Testes de Componentes
```typescript
// Pattern para testes de componentes
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should apply correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText('Delete');
    
    expect(button).toHaveClass('bg-destructive');
  });
});
```

### 2. Testes de Hooks
```typescript
// Pattern para testes de hooks
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });
  
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## 📝 Documentação de Código

### 1. JSDoc Comments
```typescript
/**
 * Hook para gerenciar conversas do usuário
 * 
 * @param userId - ID do usuário
 * @param options - Opções de configuração
 * @returns Objeto com conversas e métodos de manipulação
 * 
 * @example
 * ```tsx
 * const { conversations, createConversation } = useConversations(userId);
 * 
 * const handleCreate = async () => {
 *   await createConversation('Título', 'Primeira mensagem');
 * };
 * ```
 */
export const useConversations = (
  userId: string,
  options: ConversationOptions = {}
): ConversationHook => {
  // Implementação...
};
```

### 2. README Components
```typescript
// ComponentName/README.md
/**
 * # ChatMessage Component
 * 
 * Componente para exibir mensagens no chat.
 * 
 * ## Props
 * - `message`: Objeto da mensagem
 * - `isOwn`: Se a mensagem é do usuário atual
 * - `onEdit`: Callback para edição (opcional)
 * 
 * ## Example
 * ```tsx
 * <ChatMessage 
 *   message={message} 
 *   isOwn={message.sender === 'user'}
 *   onEdit={handleEdit}
 * />
 * ```
 */
```

## 🚀 Performance Optimization

### 1. React Optimization
```typescript
// Memoização seletiva
const ExpensiveComponent = React.memo(({ data, onAction }) => {
  // Componente pesado...
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id;
});

// useMemo para cálculos pesados
const processedData = useMemo(() => {
  return expensiveCalculation(rawData);
}, [rawData]);

// useCallback para funções
const handleSubmit = useCallback((data: FormData) => {
  onSubmit(data);
}, [onSubmit]);
```

### 2. Code Splitting
```typescript
// Lazy loading de páginas
import { lazy, Suspense } from 'react';

const AdminPage = lazy(() => import('./pages/Admin'));
const SettingsPage = lazy(() => import('./pages/Settings'));

// No Router
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/admin" element={<AdminPage />} />
</Suspense>
```

### 3. Bundle Optimization
```typescript
// Importações específicas
import { Button } from '@/components/ui/button';
// ❌ import * as UI from '@/components/ui';

// Dynamic imports
const loadFeature = async () => {
  const { heavyFeature } = await import('./heavyFeature');
  return heavyFeature;
};
```

## 🐛 Debugging

### 1. Logging Pattern
```typescript
// Logger utilitário
interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const logger = {
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`🐛 ${message}`, data);
    }
  },
  
  info: (message: string, data?: any) => {
    console.log(`ℹ️ ${message}`, data);
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${message}`, data);
  },
  
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`, error);
    
    // Em produção, enviar para serviço de monitoramento
    if (import.meta.env.PROD) {
      // sendToErrorService(message, error);
    }
  }
};
```

### 2. Debug Tools
```typescript
// Dev tools para debugging
if (import.meta.env.DEV) {
  // Expor objetos úteis globalmente
  (window as any).debug = {
    supabase,
    queryClient,
    logger,
    utils: {
      clearCache: () => queryClient.clear(),
      getAuthUser: () => supabase.auth.getUser(),
    }
  };
}
```

## 📦 Deployment

### 1. Build Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});
```

### 2. Environment Checks
```typescript
// Verificações de ambiente
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## 🔄 Fluxo de Desenvolvimento

### 1. Feature Development
```bash
# 1. Criar branch para feature
git checkout -b feature/nova-funcionalidade

# 2. Desenvolvimento
npm run dev

# 3. Testes
npm run test

# 4. Build e verificação
npm run build
npm run type-check
npm run lint

# 5. Commit e push
git add .
git commit -m "feat: adicionar nova funcionalidade"
git push origin feature/nova-funcionalidade
```

### 2. Code Review Checklist
- [ ] Código segue os padrões estabelecidos
- [ ] Testes implementados e passando
- [ ] Documentação atualizada
- [ ] Performance considerada
- [ ] Segurança verificada
- [ ] Acessibilidade implementada
- [ ] Mobile responsivo

---

Este guia de desenvolvimento estabelece **padrões consistentes** e **melhores práticas** para manter a qualidade e manutenibilidade do código do Sistema Start. 