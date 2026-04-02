-- Fix: RLS-Policy für user_progress INSERT benötigt WITH CHECK (nicht nur USING).
-- USING gilt nur für SELECT/UPDATE/DELETE (Row-Filter), WITH CHECK für INSERT/UPDATE (neue Zeilen).
-- Ohne WITH CHECK schlägt der UPSERT beim ersten Eintrag (INSERT) lautlos fehl.

drop policy if exists "progress_write_own_or_admin" on user_progress;

-- SELECT-Policy bleibt unverändert (nur USING nötig)
drop policy if exists "progress_select_own_or_admin" on user_progress;
create policy "progress_select_own_or_admin"
on user_progress for select
using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- INSERT: WITH CHECK stellt sicher, dass nur eigene Zeilen eingefügt werden können
create policy "progress_insert_own_or_admin"
on user_progress for insert
with check (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- UPDATE: USING filtert welche Zeilen geändert werden dürfen
create policy "progress_update_own_or_admin"
on user_progress for update
using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
with check (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- DELETE: nur eigene Zeilen
create policy "progress_delete_own_or_admin"
on user_progress for delete
using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
