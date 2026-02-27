
Objetivo imediato: fazer o botão “Reenviar” funcionar de forma confiável para todos os usuários (inclusive os que hoje retornam 500), com diagnóstico claro por usuário e fallback automático para não travar operação urgente.

Diagnóstico com base no que já vi:
1) O erro atual ocorre na chamada `POST /functions/v1/send-user-credentials` com status 500 (confirmado no console da sua captura).
2) No front (`useAdmin.ts`), o fluxo de reenvio ainda usa `supabase.functions.invoke(...)`, que:
   - perde detalhes úteis de erro em alguns cenários;
   - não faz fallback para outra função equivalente;
   - não aplica timeout/control de retry igual ao fluxo de criação.
3) Existe função redundante `resend-credentials` no backend com lógica equivalente, mas o front não usa como contingência.
4) Portanto, hoje um erro transitório/deployment/data-specific no `send-user-credentials` derruba o reenvio de parte dos usuários.

Plano de correção (implementação):
1) Fortalecer o reenvio no frontend (`src/hooks/useAdmin.ts`)
   - Refatorar `resetUserCredentials` para usar `fetch` direto com timeout (mesmo padrão robusto já usado em `createUser`).
   - Capturar e logar corpo de resposta completo (`status`, `response text/json`) para diagnóstico real por e-mail.
   - Normalizar payload antes do envio:
     - `fullName` fallback seguro;
     - `planType` sanitizado (`free|premium|pro`, default premium).
   - Melhorar retorno para UI com mensagem objetiva por usuário (ex.: “senha atualizada, email pendente”, “falha definitiva”, etc.).

2) Implementar fallback automático de função
   - Fluxo tentará:
     1. `send-user-credentials` (primária)
     2. se falhar non-2xx/erro de rede: `resend-credentials` (fallback)
   - Critério de sucesso: qualquer uma retornar `{ success: true }`.
   - Critério de erro final: ambas falharem, devolvendo motivo consolidado.

3) Blindar UX no Admin para operação urgente
   - Em caso de falha, mostrar toast com motivo real resumido (não apenas “non-2xx”).
   - Em caso de sucesso parcial (senha atualizada mas email falhou), mostrar mensagem clara sem mascarar.
   - Manter estado de loading por usuário e impedir clique duplo durante processamento.

4) Reforçar resiliência no backend (mínimo necessário)
   - Revisar `supabase/functions/send-user-credentials/index.ts` e `supabase/functions/resend-credentials/index.ts` para:
     - validação defensiva de entrada (nunca quebrar por campo inesperado);
     - retorno estruturado consistente em erro;
     - logs com marcador de etapa para identificar exatamente onde quebra para e-mails específicos.
   - Não alterar regra de negócio principal, apenas estabilidade/observabilidade.

5) Validação obrigatória pós-correção (fim a fim)
   - Teste 1: reenvio individual para as duas usuárias que falharam.
   - Teste 2: reenvio para uma usuária que já funcionava (regressão).
   - Teste 3: reenvio em massa com mistura de casos.
   - Confirmar no painel:
     - nenhum erro genérico “Edge Function returned a non-2xx” sem detalhe;
     - taxa de sucesso >0 para todos os casos válidos;
     - mensagens de erro acionáveis quando houver problema real externo (ex.: provedor de email).

Riscos e mitigação:
- Risco: função primária pode continuar instável para alguns dados.
  Mitigação: fallback automático para `resend-credentials`.
- Risco: erro externo do provedor de email.
  Mitigação: resposta diferenciada de “sucesso parcial” + detalhe no toast/log.
- Risco: timeout em rede.
  Mitigação: abort controller + mensagem explícita de timeout.

Critério de pronto:
- Você clica “Reenviar” nos usuários que falhavam e o fluxo conclui com sucesso (ou com erro claro e específico, sem falha cega).
- O painel deixa de exibir apenas erro genérico e passa a mostrar motivo real.
- Reenvio em massa não quebra por um único usuário com problema.
