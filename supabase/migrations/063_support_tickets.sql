-- Support-Ticket-System: Mitglieder stellen Anfragen, Admins beantworten sie,
-- Antwortzeit (first_response_at - created_at) wird gemessen.

-- ============================================================
-- 1) support_tickets
-- ============================================================
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  category text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now(),
  first_response_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on support_tickets (user_id, created_at desc);
create index if not exists idx_support_tickets_status on support_tickets (status, created_at desc);

alter table support_tickets enable row level security;

create policy "support_tickets_select_own_or_admin"
on support_tickets for select
using (
  auth.uid() = user_id
  or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "support_tickets_insert_own"
on support_tickets for insert
with check (auth.uid() = user_id);

create policy "support_tickets_update_admin"
on support_tickets for update
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============================================================
-- 2) support_ticket_messages
-- ============================================================
create table if not exists support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  sender_id uuid references profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_ticket_messages_ticket on support_ticket_messages (ticket_id, created_at asc);

alter table support_ticket_messages enable row level security;

create policy "support_ticket_messages_select_own_or_admin"
on support_ticket_messages for select
using (
  exists (
    select 1 from support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
      )
  )
);

create policy "support_ticket_messages_insert_own"
on support_ticket_messages for insert
with check (
  sender_type = 'user'
  and sender_id = auth.uid()
  and exists (
    select 1 from support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

create policy "support_ticket_messages_insert_admin"
on support_ticket_messages for insert
with check (
  sender_type = 'admin'
  and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- ============================================================
-- 3) updated_at Trigger fuer support_tickets
-- ============================================================
create or replace function support_tickets_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_tickets_updated_at on support_tickets;
create trigger trg_support_tickets_updated_at
before update on support_tickets
for each row execute function support_tickets_set_updated_at();

-- ============================================================
-- 4) Antwortzeit-Trigger: erster Admin-Post setzt first_response_at
-- ============================================================
-- security definer, damit der Trigger unabhaengig von der RLS-Policy des
-- ausloesenden Requests zuverlaessig (race-sicher) auf support_tickets
-- schreiben kann.
create or replace function support_ticket_messages_set_first_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_type = 'admin' then
    update support_tickets
    set first_response_at = coalesce(first_response_at, now()),
        updated_at = now()
    where id = new.ticket_id;
  else
    update support_tickets
    set updated_at = now()
    where id = new.ticket_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_support_ticket_messages_first_response on support_ticket_messages;
create trigger trg_support_ticket_messages_first_response
after insert on support_ticket_messages
for each row execute function support_ticket_messages_set_first_response();
