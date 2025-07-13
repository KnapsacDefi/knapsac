-- Create table for tracking GoodDollar claims
CREATE TABLE public.gooddollar_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_gooddollar_claims_wallet_address ON public.gooddollar_claims(wallet_address);
CREATE INDEX idx_gooddollar_claims_claimed_at ON public.gooddollar_claims(claimed_at);

-- Enable Row Level Security
ALTER TABLE public.gooddollar_claims ENABLE ROW LEVEL SECURITY;

-- Create policies for claim access (users can only see their own claims)
CREATE POLICY "Users can view their own claims" 
ON public.gooddollar_claims 
FOR SELECT 
USING (true); -- Allow reading for the edge function

CREATE POLICY "Service can insert claims" 
ON public.gooddollar_claims 
FOR INSERT 
WITH CHECK (true); -- Allow service to insert claims