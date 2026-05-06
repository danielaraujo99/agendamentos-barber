
-- store_customers
CREATE TABLE public.store_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage store_customers" ON public.store_customers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_store_customers_updated BEFORE UPDATE ON public.store_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- store_suppliers
CREATE TABLE public.store_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage store_suppliers" ON public.store_suppliers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_store_suppliers_updated BEFORE UPDATE ON public.store_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- store_inventory_movements
CREATE TABLE public.store_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  type text NOT NULL CHECK (type IN ('in','out','adjust')),
  qty integer NOT NULL,
  unit_cost numeric,
  supplier_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage store_inventory_movements" ON public.store_inventory_movements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_store_inventory_movements_product ON public.store_inventory_movements(product_id);

-- store_settings
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage store_settings" ON public.store_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone view store_settings" ON public.store_settings FOR SELECT USING (true);
CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- store_panel_users
CREATE TABLE public.store_panel_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'manager',
  permissions jsonb NOT NULL DEFAULT '{"dashboard":true,"products":true,"categories":true,"inventory":true,"suppliers":true,"customers":true,"orders":true,"coupons":true,"finance":true,"reviews":true,"whatsapp":false,"settings":false}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_panel_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage store_panel_users" ON public.store_panel_users
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_store_panel_users_updated BEFORE UPDATE ON public.store_panel_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- verify_store_panel_login
CREATE OR REPLACE FUNCTION public.verify_store_panel_login(_email text, _plain text)
RETURNS TABLE(id uuid, email text, full_name text, role text, permissions jsonb, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.permissions, u.active
  FROM public.store_panel_users u
  WHERE u.email = lower(trim(_email))
    AND u.active = true
    AND u.password_hash = extensions.crypt(_plain, u.password_hash);
END;
$$;
