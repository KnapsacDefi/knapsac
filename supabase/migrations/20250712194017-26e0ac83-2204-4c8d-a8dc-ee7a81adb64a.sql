-- Fix the rate limit function by adding the missing unique constraint
ALTER TABLE public.rate_limit_tracker 
ADD CONSTRAINT rate_limit_tracker_wallet_operation_unique 
UNIQUE (wallet_address, operation_type);

-- Update the function to handle the conflict properly
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
  
  -- Update or insert rate limit record with proper constraint
  INSERT INTO public.rate_limit_tracker (wallet_address, operation_type, attempt_count, window_start, last_attempt)
  VALUES (p_wallet_address, p_operation_type, 1, now(), now())
  ON CONFLICT (wallet_address, operation_type) 
  DO UPDATE SET 
    attempt_count = public.rate_limit_tracker.attempt_count + 1,
    last_attempt = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;