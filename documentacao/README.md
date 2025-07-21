# Sistema Start - Chat Flow

## 📋 Visão Geral

O **Sistema Start** é uma aplicação web de chat com IA desenvolvida para servir como uma mentora digital especializada em marketing digital e criação de produtos digitais. A aplicação incorpora a personalidade da "Nathi" (Nathalia Carvalho), oferecendo mentoria personalizada para usuários que desejam criar e-books, cursos online ou mentorias.

## 🎯 Objetivo Principal

Auxiliar empreendedores digitais na criação de produtos digitais através de conversas estruturadas com uma IA que simula a experiência e personalidade da mentora Nathalia Carvalho.

## 🚀 Funcionalidades Principais

### 💬 Sistema de Chat Inteligente
- Interface de chat moderna e responsiva
- Conversas persistentes com histórico completo
- Integração com OpenAI GPT-4 via Supabase Edge Functions
- Personalidade única da IA "Nathi" com conhecimento específico

### 👤 Autenticação e Controle de Acesso
- Sistema completo de autenticação via Supabase
- Controle de assinatura (usuários pagos vs gratuitos)
- Sistema de roles (admin e usuários regulares)
- Proteção de rotas sensíveis

### 📊 Gerenciamento de Conversas
- Criação, edição e exclusão de conversas
- Sistema de favoritos
- Busca e filtros avançados
- Duplicação de conversas
- Organização por data de criação/atualização

### 🎨 Interface Moderna
- Design responsivo com Tailwind CSS
- Tema claro/escuro
- Componentes shadcn/ui
- Animações suaves e transições
- Layout adaptativo para mobile e desktop

### 💳 Sistema de Assinatura
- Integração com Kiwify para pagamentos
- Webhook para processamento automático
- Controle de acesso baseado em status de assinatura
- Planos free e premium

## 🏗️ Arquitetura

### Frontend
- **React 18** com TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **React Query** para gerenciamento de estado
- **React Router** para navegação

### Backend
- **Supabase** como BaaS (Backend as a Service)
- **PostgreSQL** como banco de dados
- **Supabase Edge Functions** para lógica de negócio
- **OpenAI GPT-4** para IA conversacional

### Banco de Dados
- `profiles` - Perfis dos usuários
- `conversations` - Histórico de conversas
- `subscriptions` - Controle de assinatura
- `user_roles` - Sistema de permissões

## 📁 Estrutura do Projeto

```
start-chat-flow/
├── src/
│   ├── components/           # Componentes React
│   │   ├── auth/            # Autenticação
│   │   ├── chat/            # Interface de chat
│   │   ├── ui/              # Componentes base (shadcn/ui)
│   │   └── ...
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Páginas da aplicação
│   ├── types/               # Definições TypeScript
│   ├── integrations/        # Integrações (Supabase)
│   └── utils/               # Utilitários
├── supabase/
│   ├── functions/           # Edge Functions
│   └── migrations/          # Migrações do banco
├── documentacao/            # Documentação do projeto
└── ...
```

## 🔧 Tecnologias Utilizadas

- **React 18** - Framework principal
- **TypeScript** - Linguagem de desenvolvimento
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Biblioteca de componentes
- **Supabase** - Backend as a Service
- **OpenAI API** - Inteligência Artificial
- **React Query** - Gerenciamento de estado
- **React Router** - Roteamento
- **Sonner** - Notificações toast

## 📖 Documentação Adicional

- [Arquitetura Detalhada](./arquitetura.md)
- [Tecnologias e Stack](./tecnologias.md)
- [Banco de Dados](./banco-de-dados.md)
- [API e Integrações](./api-integracoes.md)
- [Funcionalidades](./funcionalidades.md)
- [Configuração e Setup](./configuracao.md)
- [Guia de Desenvolvimento](./desenvolvimento.md)

## 🚀 Como Executar

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente
4. Execute: `npm run dev`

Para instruções detalhadas, consulte o [Guia de Configuração](./configuracao.md).

## 📝 Licença

Este projeto é propriedade privada e não está disponível sob licença open source.

---

**Desenvolvido com ❤️ para transformar o mundo do marketing digital** 