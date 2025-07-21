-- Criar tabela de assinaturas com códigos de acesso
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kiwify_order_id TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  plan_type TEXT NOT NULL DEFAULT 'premium' CHECK (plan_type IN ('free', 'premium', 'vip')),
  access_code TEXT UNIQUE NOT NULL,
  user_email_registered TEXT,
  registration_completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX idx_subscriptions_access_code ON subscriptions(access_code);
CREATE INDEX idx_subscriptions_customer_email ON subscriptions(customer_email);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_kiwify_order_id ON subscriptions(kiwify_order_id);

-- Habilitar RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa consulte códigos de acesso (para validação)
CREATE POLICY "Allow public access code validation" ON subscriptions
  FOR SELECT
  USING (true);

-- Política para permitir que apenas o service role modifique registros
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Comentários da tabela
COMMENT ON TABLE subscriptions IS 'Tabela para gerenciar assinaturas e códigos de acesso';
COMMENT ON COLUMN subscriptions.access_code IS 'Código único gerado para cada compra, usado para cadastro';
COMMENT ON COLUMN subscriptions.kiwify_order_id IS 'ID do pedido no Kiwify';
COMMENT ON COLUMN subscriptions.status IS 'Status da assinatura: pending, active, cancelled, expired';
COMMENT ON COLUMN subscriptions.plan_type IS 'Tipo do plano: free, premium, vip'; 