-- Update profiles table to use crypto_address as unique identifier instead of user_email
-- This ensures one profile per wallet address, which aligns with web3 best practices

-- Remove the old unique constraint on user_email
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_email_key;

-- Add unique constraint on crypto_address to prevent duplicate profiles for same wallet
ALTER TABLE public.profiles ADD CONSTRAINT profiles_crypto_address_key UNIQUE (crypto_address);

-- Update RLS policies to be more permissive since we're using wallet-based auth
-- Users should be able to view profiles by crypto_address for wallet-based lookups