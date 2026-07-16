
INSERT INTO public.panel_users (email, full_name, password_hash, role, permissions, active)
VALUES (
  'gesikabarber@painel.com',
  'Gesika',
  extensions.crypt('admin123', extensions.gen_salt('bf', 10)),
  'admin',
  '{"dashboard":true,"appointments":true,"services":true,"barbers":true,"finance":true,"commands":true,"cashier":true,"commissions":true,"credit":true,"inventory":true,"suppliers":true,"store":true,"coupons":true,"reviews":true,"settings":true,"fila":true}'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = extensions.crypt('admin123', extensions.gen_salt('bf', 10)),
  role = 'admin',
  active = true,
  full_name = EXCLUDED.full_name,
  permissions = EXCLUDED.permissions;
