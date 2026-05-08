create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('admin', 'collector');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.customer_status as enum ('active', 'late', 'paid', 'defaulted', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.loan_status as enum ('active', 'paid', 'renewed', 'late', 'defaulted', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_frequency as enum ('daily', 'weekly', 'monthly');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('on_time', 'late', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.schedule_status as enum ('pending', 'paid', 'late', 'skipped');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.liquidation_status as enum ('draft', 'confirmed', 'voided');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collectors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  address text not null,
  identification_number text,
  notes text,
  references_text text,
  assigned_collector_id uuid references public.collectors(id) on delete set null,
  status public.customer_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  principal numeric(12, 2) not null check (principal > 0),
  payment_amount numeric(12, 2) not null check (payment_amount > 0),
  frequency public.payment_frequency not null default 'daily',
  total_payments integer not null check (total_payments > 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  start_date date not null,
  end_date date not null,
  late_fee_percentage numeric(6, 2) not null default 0 check (late_fee_percentage >= 0),
  grace_days integer not null default 0 check (grace_days >= 0),
  collector_id uuid references public.collectors(id) on delete set null,
  notes text,
  status public.loan_status not null default 'active',
  renewed_from_loan_id uuid references public.loans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  payment_number integer not null check (payment_number > 0),
  due_date date not null,
  expected_amount numeric(12, 2) not null check (expected_amount > 0),
  status public.schedule_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (loan_id, payment_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  collector_id uuid references public.collectors(id) on delete set null,
  payment_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_number integer not null check (payment_number > 0),
  frequency public.payment_frequency not null,
  status public.payment_status not null default 'on_time',
  late_fee_amount numeric(12, 2) not null default 0 check (late_fee_amount >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  original_loan_id uuid not null references public.loans(id) on delete cascade,
  new_loan_id uuid not null references public.loans(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  renewal_date date not null,
  original_principal numeric(12, 2) not null,
  total_expected_repayment numeric(12, 2) not null,
  amount_already_paid numeric(12, 2) not null,
  payoff_balance numeric(12, 2) not null,
  amount_given_to_customer numeric(12, 2) not null default 0,
  new_principal numeric(12, 2) not null,
  processed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_type text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null,
  description text,
  entered_by_name text not null,
  entered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_liquidations (
  id uuid primary key default gen_random_uuid(),
  liquidation_month date not null unique,
  close_date date not null,
  total_collected numeric(12, 2) not null default 0,
  principal_recovered numeric(12, 2) not null default 0,
  profit_collected numeric(12, 2) not null default 0,
  late_fees_collected numeric(12, 2) not null default 0,
  operating_expenses numeric(12, 2) not null default 0,
  net_profit numeric(12, 2) not null default 0,
  investor_share numeric(12, 2) not null default 0,
  partner_share numeric(12, 2) not null default 0,
  status public.liquidation_status not null default 'draft',
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_collector_idx on public.customers(assigned_collector_id);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists loans_customer_idx on public.loans(customer_id);
create index if not exists loans_status_idx on public.loans(status);
create index if not exists loans_collector_idx on public.loans(collector_id);
create index if not exists payment_schedule_loan_due_idx on public.payment_schedule(loan_id, due_date);
create index if not exists payments_loan_date_idx on public.payments(loan_id, payment_date);
create index if not exists payments_customer_date_idx on public.payments(customer_id, payment_date);
create index if not exists expenses_date_idx on public.expenses(expense_date);
create index if not exists monthly_liquidations_month_idx on public.monthly_liquidations(liquidation_month);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_collectors_updated_at on public.collectors;
create trigger set_collectors_updated_at
before update on public.collectors
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_loans_updated_at on public.loans;
create trigger set_loans_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_monthly_liquidations_updated_at on public.monthly_liquidations;
create trigger set_monthly_liquidations_updated_at
before update on public.monthly_liquidations
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.collectors enable row level security;
alter table public.customers enable row level security;
alter table public.loans enable row level security;
alter table public.payment_schedule enable row level security;
alter table public.payments enable row level security;
alter table public.renewals enable row level security;
alter table public.expenses enable row level security;
alter table public.monthly_liquidations enable row level security;

drop policy if exists "authenticated full access profiles" on public.profiles;
create policy "authenticated full access profiles"
on public.profiles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access collectors" on public.collectors;
create policy "authenticated full access collectors"
on public.collectors
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access customers" on public.customers;
create policy "authenticated full access customers"
on public.customers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access loans" on public.loans;
create policy "authenticated full access loans"
on public.loans
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access payment schedule" on public.payment_schedule;
create policy "authenticated full access payment schedule"
on public.payment_schedule
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access payments" on public.payments;
create policy "authenticated full access payments"
on public.payments
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access renewals" on public.renewals;
create policy "authenticated full access renewals"
on public.renewals
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access expenses" on public.expenses;
create policy "authenticated full access expenses"
on public.expenses
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full access monthly liquidations" on public.monthly_liquidations;
create policy "authenticated full access monthly liquidations"
on public.monthly_liquidations
for all
to authenticated
using (true)
with check (true);
