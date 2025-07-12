-- Drop rate limiting database objects
DROP TABLE IF EXISTS public.rate_limit_tracker CASCADE;
DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer) CASCADE;