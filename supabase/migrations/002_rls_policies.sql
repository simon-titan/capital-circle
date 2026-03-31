create policy "profiles_select_own_or_admin"
on profiles for select
using (auth.uid() = id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "profiles_update_own_or_admin"
on profiles for update
using (auth.uid() = id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "courses_select_authenticated"
on courses for select
using (auth.uid() is not null);

create policy "courses_admin_write"
on courses for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "modules_select_authenticated"
on modules for select
using (auth.uid() is not null);

create policy "modules_admin_write"
on modules for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "progress_select_own_or_admin"
on user_progress for select
using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "progress_write_own_or_admin"
on user_progress for all
using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "quizzes_select_authenticated"
on quizzes for select
using (auth.uid() is not null);

create policy "quizzes_admin_write"
on quizzes for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "events_select_authenticated"
on events for select
using (auth.uid() is not null);

create policy "events_admin_write"
on events for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "homework_select_authenticated"
on homework for select
using (auth.uid() is not null);

create policy "homework_admin_write"
on homework for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "discord_invites_select_own_or_admin"
on discord_invites for select
using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "discord_invites_admin_write"
on discord_invites for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
