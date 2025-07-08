-- Wallet-Based Security Implementation for Privy Auth
-- Since we're using Privy auth (not Supabase auth), we need wallet-based RLS policies

-- First, drop the existing overly permissive policies on profiles table
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create more restrictive RLS policies that work with wallet-based auth
-- These policies will be used in conjunction with edge functions for validation

-- Allow viewing profiles only through authenticated edge functions
CREATE POLICY "Profiles viewable through edge functions only" 
ON public.profiles 
FOR SELECT 
USING (false); -- Block direct access, force through edge functions

-- Allow inserting profiles only through authenticated edge functions
CREATE POLICY "Profiles insertable through edge functions only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (false); -- Block direct access, force through edge functions

-- Allow updating profiles only through authenticated edge functions  
CREATE POLICY "Profiles updatable through edge functions only" 
ON public.profiles 
FOR UPDATE 
USING (false); -- Block direct access, force through edge functions

-- Add unique constraint on crypto_address if it doesn't exist
-- This prevents duplicate profiles for the same wallet
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_crypto_address_key'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_crypto_address_key UNIQUE (crypto_address);
    END IF;
END $$;

-- Update subscriptions RLS policies to be more restrictive
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Create restrictive subscription policies (will be handled through edge functions)
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

-- Add audit logging table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log table
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow edge functions to write to audit log
CREATE POLICY "Audit log write through edge functions only" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (false);

-- Allow reading audit logs for debugging (admin access only)
CREATE POLICY "Audit log read for debugging" 
ON public.security_audit_log 
FOR SELECT 
USING (false);

-- Add comments for clarity
COMMENT ON TABLE public.profiles IS 'User profiles with wallet-based access control through edge functions';
COMMENT ON TABLE public.subscriptions IS 'User subscriptions with wallet-based access control through edge functions';
COMMENT ON TABLE public.security_audit_log IS 'Security audit trail for wallet-based operations';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_wallet_address ON public.security_audit_log (wallet_address);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_crypto_address ON public.profiles (crypto_address);