ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS medical_cert_expiry date;
ALTER TABLE public.convocation_players ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS quantity_by_size jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 0;