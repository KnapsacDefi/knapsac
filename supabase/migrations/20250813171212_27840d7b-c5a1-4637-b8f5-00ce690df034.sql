-- Create lending_pool table
CREATE TABLE public.lending_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  monthly_interest NUMERIC NOT NULL,
  closing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  min_lend_period INTEGER NOT NULL,
  max_lend_period INTEGER NOT NULL,
  recipient_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio table
CREATE TABLE public.portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lending_pool_id UUID NOT NULL REFERENCES public.lending_pool(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  lend_amount NUMERIC NOT NULL,
  lend_token TEXT NOT NULL,
  chain TEXT NOT NULL,
  lend_period INTEGER NOT NULL,
  lend_transaction_hash TEXT,
  recipient_address TEXT NOT NULL,
  claim_date TIMESTAMP WITH TIME ZONE,
  claim_transaction_hash TEXT,
  claim_amount NUMERIC,
  payment_token TEXT,
  claim_currency TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lending_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

-- Create policies for lending_pool
CREATE POLICY "Users can view published lending pools" 
ON public.lending_pool 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Users can view their own lending pools" 
ON public.lending_pool 
FOR SELECT 
USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create their own lending pools" 
ON public.lending_pool 
FOR INSERT 
WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own lending pools" 
ON public.lending_pool 
FOR UPDATE 
USING (user_id = auth.jwt() ->> 'sub');

-- Create policies for portfolio
CREATE POLICY "Users can view their own portfolio" 
ON public.portfolio 
FOR SELECT 
USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create their own portfolio entries" 
ON public.portfolio 
FOR INSERT 
WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own portfolio entries" 
ON public.portfolio 
FOR UPDATE 
USING (user_id = auth.jwt() ->> 'sub');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_lending_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_lending_pool_updated_at
BEFORE UPDATE ON public.lending_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_lending_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at
BEFORE UPDATE ON public.portfolio
FOR EACH ROW
EXECUTE FUNCTION public.update_lending_updated_at_column();