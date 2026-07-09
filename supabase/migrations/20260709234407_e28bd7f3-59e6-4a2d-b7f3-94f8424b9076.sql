
-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-advance: when active entry finishes, promote next waiting to "calling"
CREATE OR REPLACE FUNCTION public.advance_waitlist_on_finish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_id UUID;
  currently_calling INT;
BEGIN
  IF NEW.status IN ('done','cancelled','no_show')
     AND OLD.status IN ('waiting','calling','in_service') THEN
    SELECT COUNT(*) INTO currently_calling
      FROM public.waitlist_entries
      WHERE status IN ('calling','in_service');
    IF currently_calling = 0 THEN
      SELECT id INTO next_id
        FROM public.waitlist_entries
        WHERE status = 'waiting'
        ORDER BY created_at ASC
        LIMIT 1;
      IF next_id IS NOT NULL THEN
        UPDATE public.waitlist_entries
          SET status = 'calling', called_at = now()
          WHERE id = next_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_auto_advance ON public.waitlist_entries;
CREATE TRIGGER trg_waitlist_auto_advance
  AFTER UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.advance_waitlist_on_finish();

ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
