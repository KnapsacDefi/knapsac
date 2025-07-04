
-- Add signed_terms_hash field to profiles table
ALTER TABLE public.profiles ADD COLUMN signed_terms_hash TEXT;

-- Create subscriptions table for managing startup subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  subscription_type TEXT CHECK (subscription_type IN ('early_bird', 'standard')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  amount_paid DECIMAL(10,2) NOT NULL,
  transaction_hash TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create wallet_balances table for managing startup deposits
CREATE TABLE public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  balance DECIMAL(15,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Enable Row Level Security
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_balances
CREATE POLICY "Users can view their own balance" 
  ON public.wallet_balances 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance record" 
  ON public.wallet_balances 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" 
  ON public.wallet_balances 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create deposit_transactions table for tracking deposits
CREATE TABLE public.deposit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL(15,6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  transaction_hash TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposit_transactions
CREATE POLICY "Users can view their own deposit transactions" 
  ON public.deposit_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposit transactions" 
  ON public.deposit_transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
