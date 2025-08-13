-- Add admin policies for lending_pool table to enable full management from Supabase dashboard

-- Allow service role to view all lending pools
CREATE POLICY "Allow service role to view all lending pools" 
ON public.lending_pool 
FOR SELECT 
USING (auth.role() = 'service_role');

-- Allow service role to update all lending pools
CREATE POLICY "Allow service role to update all lending pools" 
ON public.lending_pool 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Allow service role to delete lending pools
CREATE POLICY "Allow service role to delete lending pools" 
ON public.lending_pool 
FOR DELETE 
USING (auth.role() = 'service_role');

-- Allow service role to insert lending pools
CREATE POLICY "Allow service role to insert lending pools" 
ON public.lending_pool 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');