
-- Add show_all_tokens boolean column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN show_all_tokens BOOLEAN DEFAULT false;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.profiles.show_all_tokens IS 'User preference to show all tokens or just USDC on withdraw page';
