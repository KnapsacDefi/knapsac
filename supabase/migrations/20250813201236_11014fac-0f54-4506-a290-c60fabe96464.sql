-- Add expected_claim_date column to portfolio table
ALTER TABLE public.portfolio 
ADD COLUMN expected_claim_date TIMESTAMP WITH TIME ZONE;

-- Update existing records to calculate expected_claim_date using closing_date + lend_period
UPDATE public.portfolio 
SET expected_claim_date = (
  SELECT lp.closing_date + INTERVAL '1 day' * portfolio.lend_period
  FROM public.lending_pool lp 
  WHERE lp.id = portfolio.lending_pool_id
);

-- Make column NOT NULL after populating existing data
ALTER TABLE public.portfolio 
ALTER COLUMN expected_claim_date SET NOT NULL;