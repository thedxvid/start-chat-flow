
Objetivo: eliminar definitivamente o bloqueio indevido de “Acesso Premium Necessário” após redefinição de senha para usuários já existentes, com correção no fluxo de reset comum (não só no painel admin) e com validação ponta a ponta.

Diagnóstico confirmado no código atual:
1) O reset “normal” (tela Auth > Esqueceu a senha > link de recuperação) passa por `src/pages/Auth.tsx` (`supabase.auth.updateUser`) e não aciona nenhuma rotina de renovação/sincronização de assinatura.
2) A renovação de assinatura já existe nas funções de credenciais admin (`send-user-credentials` / `resend-credentials`), mas:
   - não cobre o fluxo de reset comum;
   - atualiza apenas a primeira subscription encontrada (`subData[0]`), o que é frágil para usuários com histórico/duplicidade de registros.
3) A checagem no cliente (`useAuthSimple.ts`) está suscetível a inconsistências de dados antigos (múltiplas linhas, legado por email, expiração antiga), causando falso bloqueio.

Plano de implementação aprovado para “funcionar agora” e para todos os próximos resets:
1) Criar uma Edge Function dedicada ao pós-reset (fluxo comum)
- Arquivo novo: `supabase/functions/refresh-subscription-after-reset/index.ts`.
- Responsabilidade:
  - validar usuário autenticado via JWT (usar token do próprio usuário recuperado);
  - localizar subscriptions relacionadas por `user_id` e fallback por `customer_email`;
  - identificar plano pago existente do usuário (premium/pro/vip, conforme dados existentes);
  - reativar/normalizar assinatura para o usuário com `status='active'` e `expires_at=now()+180 dias`;
  - vincular registros legados (`user_id is null`) ao `user_id` atual quando for o mesmo email;
  - se não houver registro pago prévio, não promover automaticamente (evita dar premium a quem não tinha).
- Retorno claro: `{ success, renewed, normalizedCount, planType, expiresAt }`.

2) Acoplar essa função ao reset de senha já existente
- Arquivo: `src/pages/Auth.tsx`.
- No `handleResetPassword`, após `supabase.auth.updateUser({ password })`:
  - chamar `supabase.functions.invoke('refresh-subscription-after-reset')`;
  - se falhar, mostrar toast de aviso e log detalhado (não silencioso);
  - manter UX atual de limpeza de recovery mode e redirecionamento.
- Resultado: todo usuário que redefinir senha pelo fluxo padrão terá assinatura sincronizada antes do próximo login.

3) Tornar o reset via admin 100% robusto para bases com múltiplas assinaturas
- Arquivos:
  - `supabase/functions/send-user-credentials/index.ts`
  - `supabase/functions/resend-credentials/index.ts`
- Ajuste do bloco de renovação:
  - parar de atualizar apenas `subData[0]`;
  - atualizar por filtro de usuário/email (todas as linhas relevantes) e normalizar legado;
  - garantir criação de registro ativo apenas quando realmente não existir assinatura paga vinculável.
- Resultado: evita que uma linha antiga/expirada continue derrubando acesso.

4) Fortalecer leitura de assinatura no cliente para evitar falso negativo
- Arquivo: `src/hooks/useAuthSimple.ts` (`checkSubscriptionStatus`).
- Melhorias:
  - buscar assinaturas do usuário com ordenação determinística e tratar múltiplas linhas;
  - considerar “assinatura válida” se existir ao menos uma ativa e não expirada;
  - fallback por email para casos legados (quando necessário e seguro).
- Resultado: reduz risco de bloqueio por ordem aleatória/registro antigo.

5) Configuração e segurança
- Arquivo: `supabase/config.toml`
  - adicionar bloco da nova função (`[functions.refresh-subscription-after-reset]`) com `verify_jwt = true` (somente usuário autenticado recuperado executa).
- Manter CORS e validações conforme padrão já usado no projeto.

Validação obrigatória (fim-a-fim) para garantir que “está funcionando agora”:
1) Caso real: `leticia.ascoleze@gmail.com`
- Executar “Esqueci a senha” → abrir link → redefinir senha.
- Fazer login com a nova senha.
- Confirmar que NÃO aparece “Acesso Premium Necessário”.
- Confirmar nos logs da nova Edge Function: `renewed: true`, plano e nova expiração.

2) Regressão admin
- No painel admin, usar “Reenviar” para um usuário premium existente.
- Confirmar login com nova senha sem bloqueio premium.

3) Regressão de segurança
- Testar usuário free resetando senha.
- Confirmar que não é promovido indevidamente para premium.

4) Verificação de dados
- Conferir que registros legados por email (quando existirem) foram vinculados ao `user_id`.
- Conferir `status='active'` e `expires_at` renovado em 180 dias para planos pagos já existentes.

Riscos e mitigação:
- Bases com histórico inconsistente (linhas duplicadas): mitigado com normalização por usuário/email e lógica idempotente.
- Divergência de nomenclatura de plano (`pro`/`vip`): função tratará ambos como pagos.
- Falha de função no meio do reset: usuário recebe aviso explícito e logs detalhados para ação imediata.

Critério de pronto:
- Usuários pagos existentes que redefinem senha (fluxo comum ou admin) entram sem bloqueio premium.
- Fluxo validado com teste E2E real e logs confirmando renovação/sincronização.
