-- Add wallet_address column to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN wallet_address TEXT;

-- Update existing subscriptions to use wallet address from profiles
UPDATE public.subscriptions 
SET wallet_address = (
  SELECT p.crypto_address 
  FROM public.profiles p 
  WHERE p.id = subscriptions.user_id
);

-- Make wallet_address not null after updating existing data
ALTER TABLE public.subscriptions ALTER COLUMN wallet_address SET NOT NULL;

-- Add unique constraint on wallet_address
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_wallet_address_unique UNIQUE (wallet_address);

-- Update RLS policies to use wallet_address
DROP POLICY IF EXISTS "Subscriptions viewable through edge functions only" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions insertable through edge functions only" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions updatable through edge functions only" ON public.subscriptions;

CREATE POLICY "Subscriptions viewable through edge functions only" 
ON public.subscriptions 
FOR SELECT 
USING (false);

CREATE POLICY "Subscriptions insertable through edge functions only" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Subscriptions updatable through edge functions only" 
ON public.subscriptions 
FOR UPDATE 
USING (false);