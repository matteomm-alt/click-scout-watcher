# Migrazioni

Il database di produzione (progetto Supabase `gifvnvnwhbtjsxajzrse`) è stato creato il
2 novembre 2026 con sei migrazioni riassuntive (`01_types_and_functions` … `06_storage_society_assets`),
applicate dal connettore Supabase e **non presenti come file in questa cartella**.

I file con data fino al 2026-11-01 sono la storia precedente (progetto Lovable): il database
li contiene già, ma **non sono registrati** in `supabase_migrations.schema_migrations`.
Vanno considerati solo storici: non rieseguirli sul database di produzione.

Le migrazioni valide da qui in poi sono quelle dal 2026-11-16 in avanti
(`athletes_coach_set_null`, `privacy_infortuni_condivisione`, `attendance_summary`, …).
Ognuna va applicata al database e aggiunta qui con lo stesso nome.

Attenzione: ricostruire un database da zero partendo da questa cartella NON garantisce uno schema
identico a quello di produzione. Per creare un secondo ambiente serve prima una linea di base
estratta dal database reale.
