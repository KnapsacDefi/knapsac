-- Add database indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_lending_pool_id_status ON public.lending_pool(id, status);
CREATE INDEX IF NOT EXISTS idx_portfolio_lending_pool_id ON public.portfolio(lending_pool_id);
CREATE INDEX IF NOT EXISTS idx_lending_pool_status_closing ON public.lending_pool(status, closing_date);

-- Create a database function to calculate funding progress efficiently
CREATE OR REPLACE FUNCTION get_pool_funding_progress(pool_id uuid)
RETURNS TABLE(
  total_lent numeric,
  funding_progress numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_amt numeric;
  total_funded numeric;
  progress_pct numeric;
BEGIN
  -- Get target amount
  SELECT target_amount INTO target_amt
  FROM lending_pool 
  WHERE id = pool_id;
  
  -- Calculate total lent
  SELECT COALESCE(SUM(lend_amount), 0) INTO total_funded
  FROM portfolio 
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