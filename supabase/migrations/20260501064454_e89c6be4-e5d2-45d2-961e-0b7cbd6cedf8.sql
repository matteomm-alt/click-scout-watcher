ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Anche verifichiamo se communications ha is_urgent (usato dal hook notifiche). Se non esiste, lo aggiungiamo.
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;