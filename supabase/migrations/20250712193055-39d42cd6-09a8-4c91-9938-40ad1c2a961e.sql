-- Create nonce tracking table for signature replay protection
CREATE TABLE public.signature_nonces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(wallet_address, signature_hash)
);

-- Enable RLS
ALTER TABLE public.signature_nonces ENABLE ROW LEVEL SECURITY;

-- RLS policies - only edge functions can manage nonces
CREATE POLICY "Nonces insertable through edge functions only" 
ON public.signature_nonces 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Nonces viewable through edge functions only" 
ON public.signature_nonces 
FOR SELECT 
USING (false);

-- Create index for performance
CREATE INDEX idx_signature_nonces_wallet_created ON public.signature_nonces(wallet_address, created_at);

-- Create cleanup function for old nonces (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM public.signature_nonces 
  WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create rate limiting table
CREATE TABLE public.rate_limit_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for rate limiting
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rate limit insertable through edge functions only" 
ON public.rate_limit_tracker 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Rate limit viewable through edge functions only" 
ON public.rate_limit_tracker 
FOR SELECT 
USING (false);

CREATE POLICY "Rate limit updatable through edge functions only" 
ON public.rate_limit_tracker 
FOR UPDATE 
USING (false);

-- Create index for rate limiting performance
CREATE INDEX idx_rate_limit_wallet_operation ON public.rate_limit_tracker(wallet_address, operation_type);

-- Create function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_wallet_address TEXT,
  p_operation_type TEXT,
  p_max_attempts INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  current_window_start TIMESTAMP WITH TIME ZONE;
  current_attempts INTEGER;
BEGIN
  current_window_start := now() - interval '1 minute' * p_window_minutes;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limit_tracker 
  WHERE wallet_address = p_wallet_address 
    AND operation_type = p_operation_type 
    AND window_start < current_window_start;
  
  -- Get current attempts in window
  SELECT COALESCE(SUM(attempt_count), 0) 
  INTO current_attempts
  FROM public.rate_limit_tracker
  WHERE wallet_address = p_wallet_address 
    AND operation_type = p_operation_type 
    AND window_start >= current_window_start;
  
  -- Check if rate limit exceeded
  IF current_attempts >= p_max_attempts THEN
    RETURN false;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.rate_limit_tracker (wallet_address, operation_type, attempt_count, window_start, last_attempt)
  VALUES (p_wallet_address, p_operation_type, 1, now(), now())
  ON CONFLICT (wallet_address, operation_type) 
  DO UPDATE SET 
    attempt_count = rate_limit_tracker.attempt_count + 1,
    last_attempt = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;