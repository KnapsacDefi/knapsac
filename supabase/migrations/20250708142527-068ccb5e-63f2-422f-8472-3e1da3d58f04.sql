-- Make user_email optional since crypto_address is the primary user identifier
-- This aligns with Web3 best practices where wallet addresses are the primary identity

-- Make user_email nullable since it's not the primary identifier anymore
ALTER TABLE public.profiles ALTER COLUMN user_email DROP NOT NULL;

-- Update the default value for user_email to be empty string when not provided
ALTER TABLE public.profiles ALTER COLUMN user_email SET DEFAULT '';

-- Add a comment to clarify the table structure
COMMENT ON COLUMN public.profiles.crypto_address IS 'Primary user identifier - wallet address';
COMMENT ON COLUMN public.profiles.user_email IS 'Optional metadata - email address from Privy auth';

-- Ensure crypto_address remains the unique constraint (already exists from previous migration)
-- No changes needed for the unique constraint on crypto_address