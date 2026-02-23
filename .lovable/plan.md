

# Plano: Corrigir Modulos do Suporte, Upload de Imagem no Chat e Responsividade Mobile

## 1. Remover Modulos 12 e 13 do Suporte

No arquivo `src/pages/Suporte.tsx`, os modulos com id 12 ("Estrutura") e id 13 ("Estrutura Ativa") serao removidos do array `MODULES`. Os modulos restantes (14, 15, 16) terao seus ids renumerados para 12, 13, 14 respectivamente, mantendo a sequencia correta.

Tambem sera atualizado o arquivo `documentacao_agente_suporte.md` para refletir a mesma mudanca, removendo os modulos correspondentes e ajustando a numeracao.

## 2. Upload de Imagem Funcionando no Chat Principal

Atualmente, o chat principal (`ChatArea.tsx`) nao possui opcao de upload de imagem. Sera adicionado:

- Um botao de anexo (icone de imagem/clip) ao lado do textarea de input
- Um input file hidden que aceita imagens
- Preview da imagem selecionada com botao de remover
- A imagem sera exibida na bolha da mensagem do usuario

**Nota**: A imagem sera enviada como base64 para exibicao local. A IA (OpenAI) nao recebera a imagem diretamente pois o modelo `gpt-4o-mini` via edge function nao esta configurado para processar imagens - mas o usuario vera a imagem anexada na conversa.

## 3. Responsividade Mobile

### Landing Page (`src/pages/Landing.tsx`)
- Reduzir tamanho do titulo hero em telas pequenas (text-3xl em mobile)
- Ajustar padding do header para mobile
- Tornar botoes do header mais compactos em mobile (esconder texto "Entrar", manter icone)
- Ajustar espacamento das secoes de features e benefits
- Cards de features em coluna unica no mobile

### Index Page (`src/pages/Index.tsx`)
- A sidebar fixa de 80px no layout com conversas nao aparece corretamente em mobile - sera escondida em telas pequenas
- Quick actions em 2 colunas no mobile (ja esta assim)
- Ajustar padding e tamanhos de fonte para telas menores

### Suporte Page (`src/pages/Suporte.tsx`)
- Ajustar titulo hero para telas menores
- Melhorar espacamento dos cards de categorias em mobile
- Floating chat window ocupar mais largura em mobile

### ChatLayout / ChatArea
- Ja possuem boa responsividade, apenas pequenos ajustes de padding

## Detalhes Tecnicos

| Arquivo | Acao |
|---|---|
| `src/pages/Suporte.tsx` | Remover modulos 12 e 13, renumerar restantes |
| `documentacao_agente_suporte.md` | Remover modulos 12 e 13 da documentacao |
| `src/components/chat/ChatArea.tsx` | Adicionar upload de imagem (botao, preview, exibicao) |
| `src/pages/Landing.tsx` | Melhorar responsividade mobile (fontes, padding, layout) |
| `src/pages/Index.tsx` | Esconder sidebar em mobile, ajustar layout |
| `src/components/chat/ChatLayout.tsx` | Pequenos ajustes de responsividade |

