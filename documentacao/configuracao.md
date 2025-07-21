# Configuração e Setup do Projeto

## 🚀 Requisitos do Sistema

### Requisitos Mínimos
- **Node.js**: 18.0.0 ou superior
- **npm**: 9.0.0 ou superior (ou yarn/pnpm)
- **Git**: Para controle de versão
- **Editor**: VS Code recomendado

### Requisitos de Desenvolvimento
- **TypeScript**: Conhecimento básico
- **React**: Conhecimento intermediário
- **PostgreSQL**: Básico (via Supabase)
- **Tailwind CSS**: Básico

## 📦 Instalação do Projeto

### 1. Clone do Repositório
```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Entre no diretório
cd start-chat-flow

# Instale as dependências
npm install
```

### 2. Configuração das Variáveis de Ambiente

#### Arquivo `.env.local`
Crie um arquivo `.env.local` na raiz do projeto:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://wpqthkvidfmjyroaijiq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration (para Edge Functions)
OPENAI_API_KEY=sk-...

# Kiwify Configuration (para webhooks)
KIWIFY_WEBHOOK_SECRET=seu_webhook_secret

# Development
VITE_APP_ENV=development
```

#### Variáveis Obrigatórias
```typescript
interface RequiredEnvVars {
  VITE_SUPABASE_URL: string;        // URL do projeto Supabase
  VITE_SUPABASE_ANON_KEY: string;   // Chave pública do Supabase
  OPENAI_API_KEY: string;           // Chave da API OpenAI
}
```

### 3. Verificação da Instalação
```bash
# Verificar se tudo está funcionando
npm run dev

# Deve abrir em http://localhost:8080
```

## ⚙️ Configuração do Supabase

### 1. Criação do Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Anote a URL e a chave pública

### 2. Configuração do Banco de Dados

#### Executar Migrações
```bash
# Instalar Supabase CLI
npm install -g @supabase/cli

# Login no Supabase
supabase login

# Conectar ao projeto remoto
supabase link --project-ref SEU_PROJECT_ID

# Aplicar migrações
supabase db push
```

#### Estrutura Básica do Banco
```sql
-- Executar no SQL Editor do Supabase

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
-- (Veja arquivo banco-de-dados.md para políticas completas)
```

### 3. Configuração de Edge Functions

#### Deploy das Funções
```bash
# Deploy da função de chat
supabase functions deploy chat-nathi

# Deploy da função de webhook
supabase functions deploy kiwify-webhook

# Configurar secrets
supabase secrets set OPENAI_API_KEY=sk-...
```

#### Teste das Funções
```bash
# Testar localmente
supabase functions serve

# Testar função específica
curl -X POST http://localhost:54321/functions/v1/chat-nathi \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"content": "Olá", "sender": "user"}]}'
```

## 🔧 Configuração do OpenAI

### 1. Obter API Key
1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta ou faça login
3. Vá em "API Keys"
4. Crie uma nova chave
5. Configure limites de uso

### 2. Configuração de Modelos
```typescript
// Configuração padrão no chat-nathi
const OPENAI_CONFIG = {
  model: 'gpt-4.1-mini-2025-04-14',
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};
```

### 3. Monitoramento de Uso
- Configure alertas de uso na plataforma OpenAI
- Implemente rate limiting nas Edge Functions
- Monitore custos regularmente

## 💳 Configuração do Kiwify

### 1. Configuração do Webhook

#### No Painel Kiwify
1. Acesse as configurações do produto
2. Configure o webhook URL:
   ```
   https://SEU_PROJETO.supabase.co/functions/v1/kiwify-webhook
   ```
3. Configure os eventos:
   - Pagamento aprovado
   - Reembolso
   - Cancelamento

#### Teste do Webhook
```bash
# Teste manual do webhook
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/kiwify-webhook \
  -H "Content-Type: application/json" \
  -H "x-kiwify-signature: test" \
  -d '{
    "order_id": "test123",
    "order_status": "paid",
    "customer_email": "test@example.com",
    "product_id": "produto123"
  }'
```

## 🎨 Configuração do Tema

### 1. Personalização de Cores
```css
/* src/index.css */
:root {
  /* Cores primárias */
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  
  /* Cores do chat */
  --chat-user: 240 100% 95%;
  --chat-ai: 210 40% 96%;
  
  /* Personalize conforme necessário */
}
```

### 2. Configuração do Tailwind
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Suas cores customizadas
        brand: {
          primary: '#1a1a1a',
          secondary: '#f5f5f5',
        }
      }
    }
  }
}
```

## 🚀 Scripts de Desenvolvimento

### Scripts Disponíveis
```json
{
  "scripts": {
    "dev": "vite",                          // Servidor de desenvolvimento
    "build": "vite build",                   // Build para produção
    "build:dev": "vite build --mode development", // Build de desenvolvimento
    "preview": "vite preview",               // Preview do build
    "lint": "eslint .",                      // Verificar linting
    "type-check": "tsc --noEmit"            // Verificar tipos
  }
}
```

### Comandos Úteis
```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview da build
npm run preview

# Verificar erros de TypeScript
npm run type-check

# Verificar linting
npm run lint
```

## 🔍 Configuração de Debug

### 1. VS Code Configuration
Crie `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug React App",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["--host"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 2. Browser DevTools
```typescript
// Habilitar logs detalhados em desenvolvimento
if (import.meta.env.DEV) {
  console.log('Debug mode enabled');
  
  // Expor objetos úteis globalmente
  (window as any).supabase = supabase;
  (window as any).queryClient = queryClient;
}
```

## 📱 Configuração PWA

### 1. Manifest
```json
// public/manifest.json
{
  "name": "Sistema Start",
  "short_name": "Start",
  "description": "Mentoria digital com IA",
  "theme_color": "#1a1a1a",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### 2. Service Worker (Futuro)
```typescript
// Configuração básica para cache offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## 🧪 Configuração de Testes

### 1. Setup Básico
```bash
# Instalar dependências de teste
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### 2. Configuração do Vitest
```typescript
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### 3. Setup de Testes
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));
```

## 🌐 Deploy em Produção

### 1. Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente na dashboard
```

### 2. Netlify
```bash
# Build do projeto
npm run build

# Upload da pasta dist para Netlify
```

### 3. Variáveis de Produção
```bash
# Configurar no painel do provedor
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=chave_publica_producao
VITE_APP_ENV=production
```

## 🔒 Configuração de Segurança

### 1. Supabase RLS
```sql
-- Verificar se RLS está ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 2. CORS Headers
```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 3. Rate Limiting
```typescript
// Implementar em Edge Functions
const rateLimiter = new Map();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  
  // Limpar requests antigos (> 1 minuto)
  const recentRequests = userRequests.filter(
    (time: number) => now - time < 60000
  );
  
  if (recentRequests.length >= 10) {
    return false; // Rate limit excedido
  }
  
  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}
```

## 📊 Monitoramento

### 1. Logs Estruturados
```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

function log(entry: LogEntry) {
  if (import.meta.env.PROD) {
    // Enviar para serviço de logging
    console.log(JSON.stringify(entry));
  } else {
    console.log(entry.message, entry.context);
  }
}
```

### 2. Error Tracking
```typescript
// Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log({
      level: 'error',
      message: error.message,
      context: { stack: error.stack, errorInfo },
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

Este guia de configuração fornece todos os passos necessários para **configurar**, **desenvolver** e **deployar** o Sistema Start com segurança e eficiência. 