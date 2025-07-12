-- Fix RLS policies for profiles table to allow service role access
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Profiles viewable through edge functions only" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insertable through edge functions only" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable through edge functions only" ON public.profiles;

-- Create new policies that allow service role access
CREATE POLICY "Allow service role to view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role to update profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.role() = 'service_role');