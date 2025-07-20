-- Enable Row Level Security on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create restrictive RLS policies for transactions table
CREATE POLICY "Transactions viewable through edge functions only" 
ON public.transactions 
FOR SELECT 
USING (false);

CREATE POLICY "Transactions insertable through edge functions only" 
ON public.transactions 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Transactions updatable through edge functions only" 
ON public.transactions 
FOR UPDATE 
USING (false);