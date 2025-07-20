-- Create transactions table for withdrawal tracking
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'withdrawal_wallet', 'withdrawal_mobile_money'
  token_symbol TEXT NOT NULL, -- 'USDC', 'USDT', 'G$'
  chain TEXT NOT NULL, -- 'ethereum', 'celo', 'base'
  amount DECIMAL(20, 6) NOT NULL,
  recipient_address TEXT, -- for wallet withdrawals
  recipient_phone TEXT, -- for mobile money withdrawals
  recipient_currency TEXT, -- for mobile money (GHS, NGN, etc.)
  mobile_network TEXT, -- for mobile money
  conversion_rate DECIMAL(20, 6), -- USD to local currency rate
  transaction_hash TEXT,
  order_id TEXT, -- paybox order ID
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  paybox_response JSONB, -- store full paybox API response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_wallet_address ON public.transactions(wallet_address);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_transactions_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create restrictive RLS policies (only accessible through edge functions)
CREATE POLICY "Transactions viewable through edge functions only" 
ON public.transactions 
FOR SELECT 
USING (false);

CREATE POLICY "Transactions insertable through edge functions only" 
ON public.transactions 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Transactions updatable through edge functions only" 
ON public.transactions 
FOR UPDATE 
USING (false);