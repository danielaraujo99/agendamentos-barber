
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_inv_mov_created ON public.store_inventory_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_inv_mov_product ON public.store_inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_spent ON public.store_customers (total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_sort ON public.products (active, sort_order);

-- Default keys for theme + promo modal
INSERT INTO public.store_settings (key, value) VALUES
  ('store_theme', 'default'),
  ('promo_modal_enabled', 'false'),
  ('promo_modal_title', 'Promoção especial!'),
  ('promo_modal_subtitle', 'Aproveite descontos exclusivos por tempo limitado'),
  ('promo_modal_cta', 'Aproveitar agora'),
  ('promo_modal_coupon', ''),
  ('promo_modal_icon', 'gift')
ON CONFLICT DO NOTHING;

-- Enable realtime for store_settings (theme switch in real time)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.store_settings REPLICA IDENTITY FULL;
