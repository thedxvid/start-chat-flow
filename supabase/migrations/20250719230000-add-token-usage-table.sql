-- Create token_usage table for tracking OpenAI token consumption
CREATE TABLE public.token_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
    tokens_used integer NOT NULL DEFAULT 0,
    model_used text NOT NULL DEFAULT 'gpt-4.1-mini-2025-04-14',
    cost_usd decimal(10,6) DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for token_usage
CREATE POLICY "Users can view their own token usage" 
ON public.token_usage 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all token usage" 
ON public.token_usage 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
));

CREATE POLICY "System can insert token usage" 
ON public.token_usage 
FOR INSERT 
WITH CHECK (true);  -- Allow system to insert for any user

-- Create indexes for performance
CREATE INDEX idx_token_usage_user_id ON public.token_usage(user_id);
CREATE INDEX idx_token_usage_created_at ON public.token_usage(created_at DESC);
CREATE INDEX idx_token_usage_conversation_id ON public.token_usage(conversation_id);

-- Add trigger for updated_at
CREATE TRIGGER update_token_usage_updated_at
BEFORE UPDATE ON public.token_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user token stats
CREATE OR REPLACE FUNCTION public.get_user_token_stats(target_user_id uuid)
RETURNS TABLE (
    total_tokens bigint,
    total_cost numeric,
    conversation_count bigint,
    avg_tokens_per_conversation numeric,
    last_used_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COUNT(DISTINCT conversation_id) as conversation_count,
        CASE 
            WHEN COUNT(DISTINCT conversation_id) > 0 
            THEN COALESCE(SUM(tokens_used), 0)::numeric / COUNT(DISTINCT conversation_id)
            ELSE 0
        END as avg_tokens_per_conversation,
        MAX(created_at) as last_used_at
    FROM public.token_usage 
    WHERE user_id = target_user_id;
$$;

-- Create function to log token usage (will be called from Edge Function)
CREATE OR REPLACE FUNCTION public.log_token_usage(
    target_user_id uuid,
    target_conversation_id uuid,
    tokens integer,
    model text DEFAULT 'gpt-4.1-mini-2025-04-14',
    cost numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage_id uuid;
BEGIN
    INSERT INTO public.token_usage (
        user_id,
        conversation_id,
        tokens_used,
        model_used,
        cost_usd
    )
    VALUES (
        target_user_id,
        target_conversation_id,
        tokens,
        model,
        cost
    )
    RETURNING id INTO usage_id;
    
    RETURN usage_id;
END;
$$; 