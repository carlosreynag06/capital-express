create sequence if not exists public.loan_number_seq start 2000;

create or replace function public.get_payment_due_date(
  p_start_date date,
  p_payment_number integer,
  p_frequency public.payment_frequency
)
returns date
language plpgsql
stable
as $$
declare
  current_due date := p_start_date;
  counted integer := 0;
begin
  if p_payment_number < 1 then
    raise exception 'payment_number must be greater than zero';
  end if;

  if p_frequency = 'daily' then
    while counted < p_payment_number loop
      if extract(dow from current_due) <> 0 then
        counted := counted + 1;
      end if;

      if counted < p_payment_number then
        current_due := current_due + 1;
      end if;
    end loop;

    return current_due;
  end if;

  if p_frequency = 'weekly' then
    return p_start_date + ((p_payment_number - 1) * interval '7 days')::interval;
  end if;

  return (p_start_date + ((p_payment_number - 1) * interval '1 month'))::date;
end;
$$;

create or replace function public.calculate_loan_end_date(
  p_start_date date,
  p_total_payments integer,
  p_frequency public.payment_frequency
)
returns date
language sql
stable
as $$
  select public.get_payment_due_date(p_start_date, p_total_payments, p_frequency);
$$;

create or replace function public.sync_customer_status(p_customer_id uuid)
returns public.customer_status
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status public.customer_status;
begin
  if exists (
    select 1 from public.loans
    where customer_id = p_customer_id and status in ('late', 'defaulted')
  ) then
    next_status := 'late';
  elsif exists (
    select 1 from public.loans
    where customer_id = p_customer_id and status = 'active'
  ) then
    next_status := 'active';
  elsif exists (
    select 1 from public.loans
    where customer_id = p_customer_id and status = 'paid'
  ) then
    next_status := 'paid';
  else
    next_status := 'inactive';
  end if;

  update public.customers
  set status = next_status
  where id = p_customer_id;

  return next_status;
end;
$$;

create or replace function public.generate_payment_schedule(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  loan_record public.loans%rowtype;
  paid_count integer;
begin
  select * into loan_record
  from public.loans
  where id = p_loan_id;

  if not found then
    raise exception 'loan % not found', p_loan_id;
  end if;

  paid_count := least(
    loan_record.total_payments,
    floor(loan_record.paid_amount / loan_record.payment_amount)::integer
  );

  delete from public.payment_schedule
  where loan_id = p_loan_id;

  insert into public.payment_schedule (loan_id, payment_number, due_date, expected_amount, status)
  select
    loan_record.id,
    payment_number,
    public.get_payment_due_date(loan_record.start_date, payment_number, loan_record.frequency),
    loan_record.payment_amount,
    case
      when loan_record.status = 'cancelled' then 'skipped'::public.schedule_status
      when loan_record.status in ('paid', 'renewed') or payment_number <= paid_count then 'paid'::public.schedule_status
      when loan_record.status in ('late', 'defaulted')
        and public.get_payment_due_date(loan_record.start_date, payment_number, loan_record.frequency) < current_date
        then 'late'::public.schedule_status
      else 'pending'::public.schedule_status
    end
  from generate_series(1, loan_record.total_payments) as payment_number;
end;
$$;

create or replace function public.refresh_loan_status(
  p_loan_id uuid,
  p_today date default current_date
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  loan_record public.loans%rowtype;
  next_payment_number integer;
  next_due_date date;
  paid_count integer;
  total_expected numeric(12, 2);
  next_status public.loan_status;
begin
  select * into loan_record
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'loan % not found', p_loan_id;
  end if;

  if loan_record.status in ('renewed', 'defaulted', 'cancelled') then
    perform public.generate_payment_schedule(p_loan_id);
    return loan_record;
  end if;

  total_expected := loan_record.payment_amount * loan_record.total_payments;
  paid_count := least(loan_record.total_payments, floor(loan_record.paid_amount / loan_record.payment_amount)::integer);

  if loan_record.paid_amount >= total_expected then
    next_status := 'paid';
  else
    next_payment_number := least(loan_record.total_payments, paid_count + 1);
    next_due_date := public.get_payment_due_date(loan_record.start_date, next_payment_number, loan_record.frequency);

    if p_today > (next_due_date + loan_record.grace_days) then
      next_status := 'late';
    else
      next_status := 'active';
    end if;
  end if;

  update public.loans
  set status = next_status
  where id = p_loan_id
  returning * into loan_record;

  perform public.generate_payment_schedule(p_loan_id);
  perform public.sync_customer_status(loan_record.customer_id);

  return loan_record;
end;
$$;

create or replace function public.create_loan(
  p_customer_id uuid,
  p_principal numeric,
  p_payment_amount numeric,
  p_frequency public.payment_frequency,
  p_total_payments integer,
  p_start_date date,
  p_late_fee_percentage numeric default 0,
  p_grace_days integer default 0,
  p_collector_id uuid default null,
  p_notes text default null,
  p_loan_number text default null,
  p_renewed_from_loan_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_loan_id uuid;
  resolved_loan_number text;
  resolved_collector_id uuid;
begin
  if p_principal <= 0 or p_payment_amount <= 0 or p_total_payments <= 0 then
    raise exception 'principal, payment amount, and total payments must be greater than zero';
  end if;

  select coalesce(p_collector_id, assigned_collector_id)
  into resolved_collector_id
  from public.customers
  where id = p_customer_id;

  if not found then
    raise exception 'customer % not found', p_customer_id;
  end if;

  resolved_loan_number := coalesce(p_loan_number, 'CE-' || nextval('public.loan_number_seq')::text);

  insert into public.loans (
    loan_number,
    customer_id,
    principal,
    payment_amount,
    frequency,
    total_payments,
    paid_amount,
    start_date,
    end_date,
    late_fee_percentage,
    grace_days,
    collector_id,
    notes,
    status,
    renewed_from_loan_id
  ) values (
    resolved_loan_number,
    p_customer_id,
    p_principal,
    p_payment_amount,
    p_frequency,
    p_total_payments,
    0,
    p_start_date,
    public.calculate_loan_end_date(p_start_date, p_total_payments, p_frequency),
    coalesce(p_late_fee_percentage, 0),
    coalesce(p_grace_days, 0),
    resolved_collector_id,
    p_notes,
    'active',
    p_renewed_from_loan_id
  )
  returning id into new_loan_id;

  perform public.generate_payment_schedule(new_loan_id);
  perform public.sync_customer_status(p_customer_id);

  return new_loan_id;
end;
$$;

create or replace function public.register_payment(
  p_loan_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_collector_id uuid default null,
  p_late_fee_amount numeric default 0,
  p_notes text default null,
  p_status public.payment_status default null,
  p_created_by uuid default auth.uid()
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  loan_record public.loans%rowtype;
  inserted_payment public.payments%rowtype;
  total_expected numeric(12, 2);
  remaining numeric(12, 2);
  applied_amount numeric(12, 2);
  new_paid_amount numeric(12, 2);
  covered_payment_number integer;
  resolved_status public.payment_status;
  resolved_collector_id uuid;
  next_due_date date;
begin
  if p_amount < 0 or coalesce(p_late_fee_amount, 0) < 0 then
    raise exception 'payment amount and late fee must be zero or greater';
  end if;

  select * into loan_record
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'loan % not found', p_loan_id;
  end if;

  if loan_record.status in ('paid', 'renewed', 'defaulted', 'cancelled') then
    raise exception 'loan % cannot receive payments while status is %', p_loan_id, loan_record.status;
  end if;

  total_expected := loan_record.payment_amount * loan_record.total_payments;
  remaining := greatest(0, total_expected - loan_record.paid_amount);

  if remaining <= 0 then
    raise exception 'loan % has no remaining balance', p_loan_id;
  end if;

  applied_amount := least(p_amount, remaining);
  new_paid_amount := loan_record.paid_amount + applied_amount;
  covered_payment_number := greatest(
    1,
    least(loan_record.total_payments, floor(new_paid_amount / loan_record.payment_amount)::integer)
  );

  next_due_date := public.get_payment_due_date(
    loan_record.start_date,
    least(loan_record.total_payments, floor(loan_record.paid_amount / loan_record.payment_amount)::integer + 1),
    loan_record.frequency
  );

  resolved_status := coalesce(
    p_status,
    case
      when new_paid_amount >= total_expected then 'closed'::public.payment_status
      when p_payment_date > (next_due_date + loan_record.grace_days) then 'late'::public.payment_status
      else 'on_time'::public.payment_status
    end
  );
  resolved_collector_id := coalesce(p_collector_id, loan_record.collector_id);

  insert into public.payments (
    loan_id,
    customer_id,
    collector_id,
    payment_date,
    amount,
    payment_number,
    frequency,
    status,
    late_fee_amount,
    notes,
    created_by
  ) values (
    loan_record.id,
    loan_record.customer_id,
    resolved_collector_id,
    p_payment_date,
    applied_amount,
    covered_payment_number,
    loan_record.frequency,
    resolved_status,
    coalesce(p_late_fee_amount, 0),
    p_notes,
    p_created_by
  )
  returning * into inserted_payment;

  update public.loans
  set
    paid_amount = new_paid_amount,
    status = case
      when new_paid_amount >= total_expected then 'paid'::public.loan_status
      when resolved_status = 'late' then 'late'::public.loan_status
      else status
    end
  where id = loan_record.id;

  perform public.refresh_loan_status(loan_record.id, p_payment_date);

  return inserted_payment;
end;
$$;

create or replace function public.payoff_loan(
  p_loan_id uuid,
  p_payment_date date default current_date,
  p_collector_id uuid default null,
  p_late_fee_amount numeric default 0,
  p_notes text default 'Saldo completo',
  p_created_by uuid default auth.uid()
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  loan_record public.loans%rowtype;
  remaining numeric(12, 2);
begin
  select * into loan_record
  from public.loans
  where id = p_loan_id;

  if not found then
    raise exception 'loan % not found', p_loan_id;
  end if;

  remaining := greatest(0, loan_record.payment_amount * loan_record.total_payments - loan_record.paid_amount);

  return public.register_payment(
    p_loan_id,
    remaining,
    p_payment_date,
    p_collector_id,
    p_late_fee_amount,
    p_notes,
    'closed',
    p_created_by
  );
end;
$$;

create or replace function public.renew_loan(
  p_original_loan_id uuid,
  p_new_principal numeric default null,
  p_start_date date default current_date,
  p_payment_amount numeric default null,
  p_frequency public.payment_frequency default null,
  p_total_payments integer default null,
  p_late_fee_percentage numeric default null,
  p_grace_days integer default null,
  p_collector_id uuid default null,
  p_notes text default null,
  p_processed_by uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original_loan public.loans%rowtype;
  new_loan_id uuid;
  total_expected numeric(12, 2);
  payoff_balance numeric(12, 2);
  resolved_principal numeric(12, 2);
  amount_to_customer numeric(12, 2);
begin
  select * into original_loan
  from public.loans
  where id = p_original_loan_id
  for update;

  if not found then
    raise exception 'loan % not found', p_original_loan_id;
  end if;

  if original_loan.status not in ('active', 'late') then
    raise exception 'loan % cannot be renewed while status is %', p_original_loan_id, original_loan.status;
  end if;

  total_expected := original_loan.payment_amount * original_loan.total_payments;
  payoff_balance := greatest(0, total_expected - original_loan.paid_amount);
  resolved_principal := coalesce(p_new_principal, original_loan.principal);
  amount_to_customer := greatest(0, resolved_principal - payoff_balance);

  update public.loans
  set status = 'renewed'
  where id = original_loan.id;

  new_loan_id := public.create_loan(
    original_loan.customer_id,
    resolved_principal,
    coalesce(p_payment_amount, original_loan.payment_amount),
    coalesce(p_frequency, original_loan.frequency),
    coalesce(p_total_payments, original_loan.total_payments),
    p_start_date,
    coalesce(p_late_fee_percentage, original_loan.late_fee_percentage),
    coalesce(p_grace_days, original_loan.grace_days),
    coalesce(p_collector_id, original_loan.collector_id),
    p_notes,
    null,
    original_loan.id
  );

  insert into public.renewals (
    original_loan_id,
    new_loan_id,
    customer_id,
    renewal_date,
    original_principal,
    total_expected_repayment,
    amount_already_paid,
    payoff_balance,
    amount_given_to_customer,
    new_principal,
    processed_by,
    notes
  ) values (
    original_loan.id,
    new_loan_id,
    original_loan.customer_id,
    p_start_date,
    original_loan.principal,
    total_expected,
    original_loan.paid_amount,
    payoff_balance,
    amount_to_customer,
    resolved_principal,
    p_processed_by,
    p_notes
  );

  perform public.generate_payment_schedule(original_loan.id);
  perform public.sync_customer_status(original_loan.customer_id);

  return new_loan_id;
end;
$$;

create or replace function public.calculate_monthly_liquidation(p_month date)
returns table (
  liquidation_month date,
  total_collected numeric,
  payment_collected numeric,
  principal_recovered numeric,
  profit_collected numeric,
  late_fees_collected numeric,
  operating_expenses numeric,
  net_profit numeric,
  distributable_profit numeric,
  investor_share numeric,
  partner_share numeric,
  deficit numeric,
  payment_count integer,
  expense_count integer,
  status public.liquidation_status
)
language sql
stable
as $$
  with month_bounds as (
    select
      date_trunc('month', p_month)::date as month_start,
      (date_trunc('month', p_month) + interval '1 month')::date as month_end
  ),
  ordered_payments as (
    select
      p.*,
      l.principal,
      coalesce(
        sum(p.amount) over (
          partition by p.loan_id
          order by p.payment_date, p.created_at, p.id
          rows between unbounded preceding and 1 preceding
        ),
        0
      ) as prior_paid
    from public.payments p
    join public.loans l on l.id = p.loan_id
  ),
  monthly_payments as (
    select
      op.*,
      least(op.amount, greatest(0, op.principal - op.prior_paid)) as principal_part,
      greatest(0, op.amount - least(op.amount, greatest(0, op.principal - op.prior_paid))) as profit_part
    from ordered_payments op
    cross join month_bounds mb
    where op.payment_date >= mb.month_start
      and op.payment_date < mb.month_end
  ),
  payment_totals as (
    select
      coalesce(sum(amount), 0)::numeric as payment_collected,
      coalesce(sum(principal_part), 0)::numeric as principal_recovered,
      coalesce(sum(profit_part), 0)::numeric as profit_collected,
      coalesce(sum(late_fee_amount), 0)::numeric as late_fees_collected,
      count(*)::integer as payment_count
    from monthly_payments
  ),
  expense_totals as (
    select
      coalesce(sum(e.amount), 0)::numeric as operating_expenses,
      count(e.*)::integer as expense_count
    from public.expenses e
    cross join month_bounds mb
    where e.expense_date >= mb.month_start
      and e.expense_date < mb.month_end
  ),
  existing as (
    select ml.status
    from public.monthly_liquidations ml
    cross join month_bounds mb
    where ml.liquidation_month = mb.month_start
  ),
  final as (
    select
      mb.month_start as liquidation_month,
      pt.payment_collected + pt.late_fees_collected as total_collected,
      pt.payment_collected,
      pt.principal_recovered,
      pt.profit_collected,
      pt.late_fees_collected,
      et.operating_expenses,
      pt.profit_collected + pt.late_fees_collected - et.operating_expenses as net_profit,
      greatest(0, pt.profit_collected + pt.late_fees_collected - et.operating_expenses) as distributable_profit,
      pt.payment_count,
      et.expense_count,
      coalesce((select status from existing limit 1), 'draft'::public.liquidation_status) as status
    from month_bounds mb
    cross join payment_totals pt
    cross join expense_totals et
  )
  select
    f.liquidation_month,
    f.total_collected,
    f.payment_collected,
    f.principal_recovered,
    f.profit_collected,
    f.late_fees_collected,
    f.operating_expenses,
    f.net_profit,
    f.distributable_profit,
    f.distributable_profit * 0.6 as investor_share,
    f.distributable_profit * 0.4 as partner_share,
    greatest(0, -f.net_profit) as deficit,
    f.payment_count,
    f.expense_count,
    f.status
  from final f;
$$;

create or replace function public.confirm_monthly_liquidation(
  p_month date,
  p_confirmed_by uuid default auth.uid(),
  p_notes text default null
)
returns public.monthly_liquidations
language plpgsql
security definer
set search_path = public
as $$
declare
  calc record;
  saved_record public.monthly_liquidations%rowtype;
  month_start date := date_trunc('month', p_month)::date;
begin
  if exists (
    select 1
    from public.monthly_liquidations
    where liquidation_month = month_start and status = 'confirmed'
  ) then
    raise exception 'monthly liquidation for % is already confirmed', month_start;
  end if;

  select * into calc
  from public.calculate_monthly_liquidation(month_start);

  insert into public.monthly_liquidations (
    liquidation_month,
    close_date,
    total_collected,
    principal_recovered,
    profit_collected,
    late_fees_collected,
    operating_expenses,
    net_profit,
    investor_share,
    partner_share,
    status,
    confirmed_by,
    confirmed_at,
    notes
  ) values (
    month_start,
    month_start + interval '29 days',
    calc.total_collected,
    calc.principal_recovered,
    calc.profit_collected,
    calc.late_fees_collected,
    calc.operating_expenses,
    calc.net_profit,
    calc.investor_share,
    calc.partner_share,
    'confirmed',
    p_confirmed_by,
    now(),
    p_notes
  )
  on conflict (liquidation_month)
  do update set
    total_collected = excluded.total_collected,
    principal_recovered = excluded.principal_recovered,
    profit_collected = excluded.profit_collected,
    late_fees_collected = excluded.late_fees_collected,
    operating_expenses = excluded.operating_expenses,
    net_profit = excluded.net_profit,
    investor_share = excluded.investor_share,
    partner_share = excluded.partner_share,
    status = 'confirmed',
    confirmed_by = excluded.confirmed_by,
    confirmed_at = excluded.confirmed_at,
    notes = excluded.notes
  returning * into saved_record;

  return saved_record;
end;
$$;

grant execute on function public.get_payment_due_date(date, integer, public.payment_frequency) to authenticated;
grant execute on function public.calculate_loan_end_date(date, integer, public.payment_frequency) to authenticated;
grant execute on function public.generate_payment_schedule(uuid) to authenticated;
grant execute on function public.refresh_loan_status(uuid, date) to authenticated;
grant execute on function public.create_loan(uuid, numeric, numeric, public.payment_frequency, integer, date, numeric, integer, uuid, text, text, uuid) to authenticated;
grant execute on function public.register_payment(uuid, numeric, date, uuid, numeric, text, public.payment_status, uuid) to authenticated;
grant execute on function public.payoff_loan(uuid, date, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.renew_loan(uuid, numeric, date, numeric, public.payment_frequency, integer, numeric, integer, uuid, text, uuid) to authenticated;
grant execute on function public.calculate_monthly_liquidation(date) to authenticated;
grant execute on function public.confirm_monthly_liquidation(date, uuid, text) to authenticated;
