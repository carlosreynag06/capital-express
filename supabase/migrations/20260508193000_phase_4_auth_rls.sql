-- Phase 4: admin-only access now, with a clean path for future collector users.

create table if not exists public.user_collector_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  collector_id uuid not null references public.collectors(id) on delete cascade,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique (profile_id, collector_id)
);

create index if not exists user_collector_assignments_profile_idx
on public.user_collector_assignments(profile_id)
where active;

create index if not exists user_collector_assignments_collector_idx
on public.user_collector_assignments(collector_id)
where active;

alter table public.user_collector_assignments enable row level security;

insert into public.profiles (id, full_name, role)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', users.email, 'Administrador'),
  'admin'::public.app_role
from auth.users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Administrador'),
    'admin'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select profiles.role
  from public.profiles
  where profiles.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin'::public.app_role, false);
$$;

create or replace function public.current_collector_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select assignments.collector_id
  from public.user_collector_assignments assignments
  join public.profiles profiles on profiles.id = assignments.profile_id
  where assignments.profile_id = auth.uid()
    and assignments.active
    and profiles.role = 'collector'
  order by assignments.assigned_at desc
  limit 1;
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required'
      using errcode = '42501';
  end if;
end;
$$;

drop policy if exists "authenticated full access profiles" on public.profiles;
drop policy if exists "authenticated full access collectors" on public.collectors;
drop policy if exists "authenticated full access customers" on public.customers;
drop policy if exists "authenticated full access loans" on public.loans;
drop policy if exists "authenticated full access payment schedule" on public.payment_schedule;
drop policy if exists "authenticated full access payments" on public.payments;
drop policy if exists "authenticated full access renewals" on public.renewals;
drop policy if exists "authenticated full access expenses" on public.expenses;
drop policy if exists "authenticated full access monthly liquidations" on public.monthly_liquidations;

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "collectors admin manage" on public.collectors;
create policy "collectors admin manage"
on public.collectors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers admin manage" on public.customers;
create policy "customers admin manage"
on public.customers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "loans admin manage" on public.loans;
create policy "loans admin manage"
on public.loans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payment schedule admin manage" on public.payment_schedule;
create policy "payment schedule admin manage"
on public.payment_schedule
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payments admin manage" on public.payments;
create policy "payments admin manage"
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "renewals admin manage" on public.renewals;
create policy "renewals admin manage"
on public.renewals
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "expenses admin manage" on public.expenses;
create policy "expenses admin manage"
on public.expenses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "monthly liquidations admin manage" on public.monthly_liquidations;
create policy "monthly liquidations admin manage"
on public.monthly_liquidations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "collector assignments admin manage" on public.user_collector_assignments;
create policy "collector assignments admin manage"
on public.user_collector_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "collector assignments self read" on public.user_collector_assignments;
create policy "collector assignments self read"
on public.user_collector_assignments
for select
to authenticated
using (profile_id = auth.uid());

alter function public.create_loan(uuid, numeric, numeric, public.payment_frequency, integer, date, numeric, integer, uuid, text, text, uuid)
security invoker;

alter function public.register_payment(uuid, numeric, date, uuid, numeric, text, public.payment_status, uuid)
security invoker;

alter function public.payoff_loan(uuid, date, uuid, numeric, text, uuid)
security invoker;

alter function public.renew_loan(uuid, numeric, date, numeric, public.payment_frequency, integer, numeric, integer, uuid, text, uuid)
security invoker;

alter function public.confirm_monthly_liquidation(date, uuid, text)
security invoker;

alter function public.sync_customer_status(uuid)
security invoker;

alter function public.generate_payment_schedule(uuid)
security invoker;

alter function public.refresh_loan_status(uuid, date)
security invoker;

revoke execute on function public.sync_customer_status(uuid) from public, anon;
revoke execute on function public.generate_payment_schedule(uuid) from public, anon;
revoke execute on function public.refresh_loan_status(uuid, date) from public, anon;

revoke execute on function public.create_loan(uuid, numeric, numeric, public.payment_frequency, integer, date, numeric, integer, uuid, text, text, uuid) from public, anon;
revoke execute on function public.register_payment(uuid, numeric, date, uuid, numeric, text, public.payment_status, uuid) from public, anon;
revoke execute on function public.payoff_loan(uuid, date, uuid, numeric, text, uuid) from public, anon;
revoke execute on function public.renew_loan(uuid, numeric, date, numeric, public.payment_frequency, integer, numeric, integer, uuid, text, uuid) from public, anon;
revoke execute on function public.calculate_monthly_liquidation(date) from public, anon;
revoke execute on function public.confirm_monthly_liquidation(date, uuid, text) from public, anon;

grant execute on function public.create_loan(uuid, numeric, numeric, public.payment_frequency, integer, date, numeric, integer, uuid, text, text, uuid) to authenticated;
grant execute on function public.register_payment(uuid, numeric, date, uuid, numeric, text, public.payment_status, uuid) to authenticated;
grant execute on function public.payoff_loan(uuid, date, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.renew_loan(uuid, numeric, date, numeric, public.payment_frequency, integer, numeric, integer, uuid, text, uuid) to authenticated;
grant execute on function public.calculate_monthly_liquidation(date) to authenticated;
grant execute on function public.confirm_monthly_liquidation(date, uuid, text) to authenticated;
grant execute on function public.sync_customer_status(uuid) to authenticated;
grant execute on function public.generate_payment_schedule(uuid) to authenticated;
grant execute on function public.refresh_loan_status(uuid, date) to authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_collector_id() to authenticated;
