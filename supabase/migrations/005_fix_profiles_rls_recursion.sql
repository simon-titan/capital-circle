-- Fix infinite recursion on profiles policies.
-- Old policies referenced profiles inside profiles policy checks.

drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_update_own_or_admin" on profiles;
drop policy if exists "profiles_insert_own" on profiles;

-- MVP-safe, non-recursive policies:
-- authenticated users can read profile data (needed for members/admin views in current MVP)
create policy "profiles_select_authenticated"
on profiles for select
using (auth.uid() is not null);

-- users can insert their own profile row
create policy "profiles_insert_own"
on profiles for insert
with check (auth.uid() = id);

-- users can update their own profile row
create policy "profiles_update_own"
on profiles for update
using (auth.uid() = id);
