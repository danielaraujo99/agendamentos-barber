
-- Waitlist (Fila de espera) real-time system
CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_phone text,
  service_name text,
  notes text,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','calling','in_service','done','cancelled','no_show')),
  called_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_status_created ON public.waitlist_entries (status, created_at);
CREATE INDEX idx_waitlist_user ON public.waitlist_entries (user_id);

GRANT SELECT ON public.waitlist_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Public read (fila é pública para exibir)
CREATE POLICY "Waitlist is publicly readable"
  ON public.waitlist_entries FOR SELECT
  USING (true);

-- Usuário autenticado pode entrar na fila (só como ele mesmo)
CREATE POLICY "Users can join waitlist"
  ON public.waitlist_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode cancelar/atualizar a própria entrada; admin pode tudo
CREATE POLICY "Users can update own entry"
  ON public.waitlist_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own entry"
  ON public.waitlist_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.waitlist_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist_entries;
