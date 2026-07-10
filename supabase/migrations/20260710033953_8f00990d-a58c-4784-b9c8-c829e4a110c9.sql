
-- Allow panel admin (custom session, non-Supabase auth) to write business settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.business_settings;
DROP POLICY IF EXISTS "Anyone can manage settings" ON public.business_settings;

CREATE POLICY "Anyone can manage settings"
ON public.business_settings
FOR ALL
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO anon, authenticated;
GRANT ALL ON public.business_settings TO service_role;
