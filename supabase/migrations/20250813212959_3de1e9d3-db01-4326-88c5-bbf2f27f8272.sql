-- Fix security warnings by setting search_path for database functions
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_lending_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_nonces()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.signature_nonces 
  WHERE created_at < now() - interval '1 hour';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pool_funding_progress(pool_id uuid)
RETURNS TABLE(
  total_lent numeric,
  funding_progress numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_amt numeric;
  total_funded numeric;
  progress_pct numeric;
BEGIN
  -- Get target amount
  SELECT target_amount INTO target_amt
  FROM public.lending_pool 
  WHERE id = pool_id;
  
  -- Calculate total lent
  SELECT COALESCE(SUM(lend_amount), 0) INTO total_funded
  FROM public.portfolio 
  WHERE lending_pool_id = pool_id;
  
  -- Calculate progress percentage
  IF target_amt > 0 THEN
    progress_pct := (total_funded / target_amt) * 100;
  ELSE
    progress_pct := 0;
  END IF;
  
  RETURN QUERY SELECT total_funded, LEAST(progress_pct, 100);
END;
$$;