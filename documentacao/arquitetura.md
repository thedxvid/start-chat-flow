# Arquitetura do Sistema

## 📐 Visão Geral da Arquitetura

O Sistema Start segue uma arquitetura moderna baseada em componentes, utilizando o padrão **JAMstack** (JavaScript, APIs, Markup) com **Supabase** como Backend as a Service.

## 🏗️ Arquitetura de Alto Nível

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│    Frontend (SPA)   │◄──►│   Supabase BaaS    │◄──►│   OpenAI API        │
│                     │    │                     │    │                     │
│  React + TypeScript │    │  PostgreSQL + Auth │    │   GPT-4 Turbo       │
│  Tailwind + Vite    │    │  Edge Functions     │    │                     │
│                     │    │  Real-time          │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## 🎯 Princípios Arquiteturais

### 1. **Separação de Responsabilidades**
- **Frontend**: Interface de usuário e experiência
- **Backend**: Lógica de negócio e persistência
- **IA**: Processamento de linguagem natural

### 2. **Escalabilidade**
- Componentes modulares e reutilizáveis
- Hooks customizados para lógica compartilhada
- Edge Functions para processamento distribuído

### 3. **Manutenibilidade**
- Código TypeScript fortemente tipado
- Estrutura de pastas organizada
- Padrões de desenvolvimento consistentes

### 4. **Performance**
- React Query para cache inteligente
- Componentes otimizados com React 18
- Lazy loading e code splitting

## 📦 Arquitetura de Componentes

### Estrutura Hierárquica

```
App
├── AuthProvider (Contexto de autenticação)
│   ├── ProtectedRoute (Proteção de rotas)
│   │   ├── Index (Página principal)
│   │   │   ├── ChatLayout (Layout do chat)
│   │   │   │   ├── ChatSidebar (Barra lateral)
│   │   │   │   └── ChatArea (Área de conversa)
│   │   │   └── QuickSuggestions (Sugestões rápidas)
│   │   ├── Auth (Autenticação)
│   │   ├── Landing (Página inicial)
│   │   └── Admin (Painel admin)
│   └── UI Components (shadcn/ui)
```

### Padrões de Componentes

#### 1. **Smart Components** (Containers)
- Gerenciam estado e lógica de negócio
- Fazem chamadas para APIs
- Exemplos: `ChatLayout`, `Index`, `Auth`

#### 2. **Dumb Components** (Presentational)
- Focados apenas em UI
- Recebem dados via props
- Exemplos: `Button`, `Card`, `Avatar`

#### 3. **Custom Hooks**
- Encapsulam lógica reutilizável
- Gerenciam estado complexo
- Exemplos: `useAuth`, `useConversations`, `useNathiChat`

## 🔄 Fluxo de Dados

### 1. **Fluxo de Autenticação**
```
User Input → AuthProvider → Supabase Auth → Database → UI Update
```

### 2. **Fluxo de Conversação**
```
User Message → ChatArea → useNathiChat → Edge Function → OpenAI → Database → UI Update
```

### 3. **Fluxo de Persistência**
```
Component → Custom Hook → Supabase Client → PostgreSQL → Real-time Subscription → UI Update
```

## 🏪 Padrões de Estado

### 1. **Estado Local**
- `useState` para estado simples de componente
- `useReducer` para estado complexo

### 2. **Estado Global**
- **React Context** para autenticação
- **React Query** para cache de servidor

### 3. **Estado do Servidor**
- **Supabase Real-time** para sincronização
- **React Query** para cache e invalidação

## 🔌 Arquitetura de Integração

### Supabase Integration Layer
```typescript
// Client Configuration
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

### Edge Functions Architecture
```typescript
// Chat Function
serve(async (req) => {
  // CORS handling
  // Request validation
  // OpenAI API call
  // Response formatting
});
```

### React Query Integration
```typescript
// Data fetching with cache
const { data, isLoading, error } = useQuery({
  queryKey: ['conversations', userId],
  queryFn: () => fetchConversations(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## 🛡️ Arquitetura de Segurança

### 1. **Row Level Security (RLS)**
```sql
-- Política de segurança no Supabase
CREATE POLICY "Users can only access their own conversations" 
ON conversations 
FOR ALL 
USING (user_id = auth.uid());
```

### 2. **Autenticação JWT**
- Tokens automáticos via Supabase Auth
- Refresh tokens para sessões longas
- Middleware de autenticação no frontend

### 3. **Validação de Tipos**
- TypeScript em tempo de compilação
- Validação de schema com Zod
- Tipos gerados automaticamente do Supabase

## 📱 Arquitetura Responsiva

### Mobile-First Design
```scss
// Breakpoints
sm: 640px   // Smartphone
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large Desktop
```

### Adaptive Components
- **ChatSidebar**: Drawer no mobile, sidebar no desktop
- **ChatLayout**: Stack vertical no mobile, horizontal no desktop
- **Navigation**: Menu hambúrguer no mobile, barra fixa no desktop

## 🔧 Arquitetura de Build

### Development
```bash
vite dev server → Hot Module Replacement → TypeScript compilation
```

### Production
```bash
vite build → TypeScript compilation → Tree shaking → Bundle optimization
```

### Deployment
```bash
Build artifacts → Static hosting → CDN → Edge functions deployment
```

## 📈 Considerações de Escalabilidade

### 1. **Performance Frontend**
- Code splitting por rotas
- Lazy loading de componentes
- Memoização seletiva

### 2. **Performance Backend**
- Connection pooling no Supabase
- Índices otimizados no PostgreSQL
- Cache em Edge Functions

### 3. **Escalabilidade Horizontal**
- Stateless Edge Functions
- Database clustering via Supabase
- CDN para assets estáticos

## 🔍 Monitoramento e Observabilidade

### Logging
- Console logs estruturados
- Error boundaries para React
- Supabase logs para backend

### Métricas
- Performance do usuário
- Uso de API da OpenAI
- Métricas de conversação

### Alertas
- Erros críticos via Supabase
- Limites de uso da OpenAI
- Problemas de autenticação

---

Esta arquitetura foi projetada para ser **escalável**, **manutenível** e **performática**, seguindo as melhores práticas da indústria para aplicações web modernas. 