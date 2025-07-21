# 🚀 Instruções de Deploy - Start Chat

## ✅ Correções Aplicadas na Build

### 🔧 Problemas Resolvidos
1. **MIME Type CSS**: Paths dos assets agora são relativos
2. **Configuração .htaccess**: Melhorada com headers de segurança e CORS
3. **Banco de Dados**: Migration criada para corrigir estrutura da tabela subscriptions

### 📦 Conteúdo da Pasta `dist`
A pasta `dist` agora contém:
- ✅ `index.html` com paths relativos (`./assets/...`)
- ✅ `.htaccess` melhorado com configurações robustas
- ✅ Todos os assets compilados e otimizados
- ✅ Favicons e arquivos estáticos

## 🗃️ Correções do Banco de Dados

### Migration Criada: `20250719290000-fix-subscriptions-structure.sql`

Esta migration corrige:
- ➕ Adiciona campo `user_id` à tabela `subscriptions`
- 🔒 Atualiza políticas RLS para funcionar com autenticação
- 🔗 Cria função para vincular códigos de acesso a usuários
- 🧪 Cria subscription de desenvolvimento para testes

### Como Aplicar a Migration

#### Opção 1: Supabase CLI (Recomendado)
```bash
# No diretório do projeto
supabase db push
```

#### Opção 2: Dashboard do Supabase
1. Acesse o Dashboard do Supabase
2. Vá em "SQL Editor"
3. Execute o conteúdo do arquivo `supabase/migrations/20250719290000-fix-subscriptions-structure.sql`

## 🌐 Deploy da Aplicação

### 1. Upload dos Arquivos
Faça upload de **todo o conteúdo** da pasta `dist` para sua hospedagem:

```
dist/
├── assets/          # 📁 Arquivos JS/CSS compilados
├── lovable-uploads/ # 📁 Uploads existentes  
├── index.html       # 🏠 Página principal
├── .htaccess        # ⚙️ Configuração do servidor
├── favicon.*        # 🖼️ Ícones
├── robots.txt       # 🤖 SEO
└── placeholder.svg  # 📷 Placeholder
```

### 2. Verificar Configurações

#### Variáveis de Ambiente (Se necessário)
Certifique-se que sua hospedagem tem acesso às variáveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### Configuração Apache
O arquivo `.htaccess` inclui:
- ✅ MIME types forçados para CSS/JS
- ✅ Fallback para SPA (React Router)
- ✅ Headers de segurança
- ✅ CORS configurado
- ✅ Cache otimizado

## 🧪 Teste Após Deploy

### 1. Verificar Carregamento
- [ ] CSS carrega corretamente (sem erro MIME type)
- [ ] JavaScript carrega sem erros
- [ ] Favicon aparece
- [ ] Navegação funciona

### 2. Verificar Autenticação
- [ ] Login/cadastro funcionam
- [ ] Conexão com Supabase estabelecida
- [ ] Dados persistem corretamente

### 3. Verificar Chat
- [ ] Interface carrega completamente
- [ ] Conversas são salvas
- [ ] IA responde (se Edge Functions configuradas)

## 🚨 Troubleshooting

### Se ainda houver problemas de CSS/JS:
1. Verifique se o `.htaccess` foi enviado
2. Confirme que o servidor suporta `.htaccess`
3. Teste em modo incógnito (cache)

### Se houver erros de banco:
1. Execute a migration `20250719290000-fix-subscriptions-structure.sql`
2. Verifique se as tabelas `subscriptions` e `user_roles` existem
3. Confirme as políticas RLS

### Se a IA não responder:
1. Verifique Edge Functions no Supabase
2. Confirme se `OPENAI_API_KEY` está configurada
3. Teste as funções via Dashboard

## ✅ Checklist Final

- [ ] Upload da pasta `dist` completa
- [ ] Migration aplicada no banco
- [ ] Teste de carregamento da página
- [ ] Teste de login/cadastro  
- [ ] Teste de chat (se Edge Functions configuradas)
- [ ] Verificar console do navegador (sem erros)

---

**Build criada em**: Janeiro 2025  
**Status**: ✅ Corrigida e otimizada  
**Pronta para produção**: SIM 🚀 