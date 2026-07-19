ALTER TABLE public.technical_guidelines 
ALTER COLUMN content TYPE jsonb 
USING CASE 
  WHEN content IS NULL THEN NULL
  WHEN content = '' THEN NULL
  ELSE content::jsonb 
END;

ALTER TABLE public.technical_guidelines 
ALTER COLUMN common_errors TYPE jsonb 
USING CASE 
  WHEN common_errors IS NULL THEN NULL
  WHEN common_errors = '' THEN NULL
  ELSE common_errors::jsonb 
END;