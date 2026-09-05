-- Gutscheine/Rabattcodes (Stripe-backed) + Notiz-Spalte fuer die Zahlungsstoerungs-Uebersicht.
-- Stripe ist Source of Truth fuer Redemption-Limits/Gueltigkeit (coupons + promotion_codes API);
-- die lokale Tabelle spiegelt nur Metadaten fuer die Admin-Liste.

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  stripe_promotion_code_id text,
  stripe_coupon_id text,
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_redemptions integer,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupons_active on coupons (active);

alter table coupons enable row level security;

create policy "coupons_admin_all"
on coupons for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- Platzhalter fuer spaeteres lokales Redemption-Tracking (aktuell ungenutzt,
-- siehe Abschlussbericht: Einloesungen werden live via
-- stripe.promotionCodes.retrieve(id).times_redeemed gezaehlt).
create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  stripe_checkout_session_id text,
  redeemed_at timestamptz not null default now()
);

create index if not exists idx_coupon_redemptions_coupon on coupon_redemptions (coupon_id);

alter table coupon_redemptions enable row level security;

create policy "coupon_redemptions_admin_all"
on coupon_redemptions for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- Manuelle Admin-Notiz fuer die Zahlungsstoerungs-Uebersicht (additiv, ungefaehrlich).
alter table profiles add column if not exists dunning_admin_note text;
