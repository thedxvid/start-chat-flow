

## Reenviar para os 42 usuarios com erro

### O que sera feito

Adicionar um botao "Reenviar para Falhos" na tela de resultados do reenvio em massa. Quando o usuario clica, o sistema pega apenas os emails que falharam do `bulkResetResults` e executa o `bulkResetCredentials` novamente somente para esses usuarios.

### Alteracao

**`src/pages/Admin.tsx`**

1. Adicionar uma funcao `handleRetryFailed` que:
   - Filtra os resultados com `success === false` do `bulkResetResults`
   - Busca os dados completos (nome, plano) dos usuarios correspondentes na lista `users`
   - Chama `bulkResetCredentials` apenas para esses usuarios
   - Atualiza os resultados na tela

2. Adicionar um botao "Reenviar para Falhos" no `DialogFooter`, visivel apenas quando existem resultados com erros:
   - Aparece ao lado do botao "Fechar" quando `bulkResetResults` tem itens com `success === false`
   - Ao clicar, reseta o progresso e executa apenas para os que falharam

### Detalhes tecnicos

```typescript
const handleRetryFailed = async () => {
  const failedEmails = bulkResetResults?.filter(r => !r.success) || [];
  if (failedEmails.length === 0) return;

  const usersList = failedEmails.map(f => {
    const user = users.find(u => u.email === f.email);
    return {
      email: f.email,
      fullName: user?.profile?.full_name || f.email,
      planType: user?.subscription?.plan_type || 'premium'
    };
  });

  setBulkResetting(true);
  setBulkResetProgress(0);
  setBulkResetTotal(usersList.length);
  setBulkResetResults(null);

  const results = await bulkResetCredentials(usersList, (current, total) => {
    setBulkResetProgress(current);
    setBulkResetTotal(total);
  });

  setBulkResetResults(results);
  setBulkResetting(false);
};
```

Botao no DialogFooter:
```tsx
{bulkResetResults && bulkResetResults.filter(r => !r.success).length > 0 && (
  <Button onClick={handleRetryFailed} disabled={bulkResetting}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Reenviar para {bulkResetResults.filter(r => !r.success).length} Falho(s)
  </Button>
)}
```

Nenhum outro arquivo precisa ser alterado. A funcao `bulkResetCredentials` do hook ja suporta receber qualquer lista de usuarios.

