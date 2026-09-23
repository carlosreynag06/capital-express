create table public.app_owners (
  user_id uuid primary key references auth.users(id), created_at timestamptz not null default now()
);
insert into public.app_owners(user_id) values ('01ca5dde-c563-4e24-87d5-25e46e5fe3e8');

create function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from app_owners where user_id=auth.uid())
$$;
create function public.require_owner() returns void language plpgsql stable security definer set search_path=public as $$
begin if not is_owner() then raise exception 'No tiene permiso para acceder a Capital Express.' using errcode='42501'; end if; end $$;
create function public.business_today() returns date language sql stable as $$ select (now() at time zone 'America/Santo_Domingo')::date $$;

create table public.customers (
 id uuid primary key default gen_random_uuid(), full_name text not null check(length(trim(full_name)) between 2 and 150),
 phone text not null check(length(trim(phone)) between 7 and 30), address text not null check(length(trim(address)) between 3 and 500),
 archived boolean not null default false, is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.cosigners (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null unique references customers(id),
 full_name text not null check(length(trim(full_name)) between 2 and 150), phone text not null check(length(trim(phone)) between 7 and 30),
 address text not null check(length(trim(address)) between 3 and 500), created_at timestamptz not null default now()
);
create table public.loans (
 id uuid primary key default gen_random_uuid(), reference bigint generated always as identity unique,
 customer_id uuid not null references customers(id), original_principal numeric(16,2) not null check(original_principal>0),
 principal numeric(16,2) not null check(principal>=0), rate numeric(7,4) not null default 10 check(rate>0 and rate<=100),
 disbursed_on date not null, cycle_start date not null, first_due date not null, next_due date not null,
 day_one int not null default 15 check(day_one between 1 and 27), day_two int not null default 30 check(day_two between 2 and 31),
 status text not null default 'active' check(status in ('active','overdue','paid','restructured','cancelled')),
 overdue_since date, restructured boolean not null default false, is_demo boolean not null default false,
 created_at timestamptz not null default now(), check(day_one<day_two), check(cycle_start>=disbursed_on), check(first_due>cycle_start)
);
create index on loans(customer_id);
create index on loans(next_due) where status not in ('paid','cancelled');
create table public.periods (
 id uuid primary key default gen_random_uuid(), loan_id uuid not null references loans(id), starts_on date not null, due_on date not null,
 opening_principal numeric(16,2) not null, rate numeric(7,4) not null, interest_due numeric(16,2) not null check(interest_due>=0),
 interest_paid numeric(16,2) not null default 0 check(interest_paid>=0 and interest_paid<=interest_due),
 closed boolean not null default false, closure text, unique(loan_id,starts_on,due_on)
);
create unique index one_open_period on periods(loan_id) where not closed;
create table public.payments (
 id uuid primary key default gen_random_uuid(), receipt bigint generated always as identity unique,
 loan_id uuid not null references loans(id), period_id uuid not null references periods(id), paid_on date not null,
 amount numeric(16,2) not null check(amount>0), interest_paid numeric(16,2) not null, principal_paid numeric(16,2) not null,
 principal_before numeric(16,2) not null, principal_after numeric(16,2) not null, interest_before numeric(16,2) not null,
 interest_remaining numeric(16,2) not null, rate numeric(7,4) not null, next_due date not null, next_interest numeric(16,2) not null,
 method text not null check(method in ('Efectivo','Transferencia','Depósito')), note text not null default '',
 request_id uuid not null unique, created_at timestamptz not null default now(),
 check(amount=interest_paid+principal_paid), check(principal_after=principal_before-principal_paid)
);
create index on payments(loan_id,paid_on);
create table public.capitalizations (
 id uuid primary key default gen_random_uuid(), loan_id uuid not null references loans(id), period_id uuid not null unique references periods(id),
 occurred_on date not null, due_on date not null, principal_before numeric(16,2) not null, interest_due numeric(16,2) not null,
 interest_paid numeric(16,2) not null, amount numeric(16,2) not null check(amount>0), principal_after numeric(16,2) not null,
 rate numeric(7,4) not null, check(amount=interest_due-interest_paid), check(principal_after=principal_before+amount)
);
create index on capitalizations(loan_id,occurred_on);
create table public.restructurings (
 id uuid primary key default gen_random_uuid(), loan_id uuid not null references loans(id), occurred_on date not null,
 principal numeric(16,2) not null, interest numeric(16,2) not null, old_terms jsonb not null, new_terms jsonb not null,
 note text not null default '', created_at timestamptz not null default now()
);
create index on restructurings(loan_id);
create table public.loan_events (
 id uuid primary key default gen_random_uuid(), loan_id uuid not null references loans(id), occurred_on date not null,
 kind text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on loan_events(loan_id,occurred_on);
create table public.collection_notes (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id), contact_type text not null,
 note text not null check(length(trim(note)) between 1 and 2000), promised_on date, promised_amount numeric(16,2) check(promised_amount>0),
 created_at timestamptz not null default now()
);
create index on collection_notes(customer_id,created_at);

create function public.next_payment_date(p_date date, p_one int default 15, p_two int default 30) returns date language plpgsql immutable as $$
declare base date := date_trunc('month',p_date)::date; last_day int; candidate date; day_n int;
begin
 if p_one<1 or p_one>27 or p_two<=p_one or p_two>31 then raise exception 'Calendario de pago inválido.'; end if;
 for i in 0..1 loop
  last_day := extract(day from (base+interval '1 month -1 day'))::int;
  foreach day_n in array array[p_one,p_two] loop
   candidate := base+(least(day_n,last_day)-1);
   if candidate>p_date then return candidate; end if;
  end loop;
  base := (base+interval '1 month')::date;
 end loop;
 raise exception 'No se pudo calcular la fecha.';
end $$;

-- Internal functions are deliberately not callable from the Data API.
create function public._open_loan(p_customer uuid,p_amount numeric,p_rate numeric,p_disbursed date,p_start date,p_one int default 15,p_two int default 30,p_demo boolean default false) returns uuid
language plpgsql security definer set search_path=public as $$
declare lid uuid; due date;
begin
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_rate is null or p_rate<=0 or p_rate>100 then raise exception 'Revise el monto y la tasa de interés.'; end if;
 if p_start is null or p_disbursed is null or p_start<p_disbursed then raise exception 'El inicio del ciclo no puede ser anterior al desembolso.'; end if;
 if not exists(select 1 from customers c join cosigners s on s.customer_id=c.id where c.id=p_customer and not c.archived) then raise exception 'Seleccione un cliente activo con garante.'; end if;
 due:=next_payment_date(p_start,p_one,p_two);
 insert into loans(customer_id,original_principal,principal,rate,disbursed_on,cycle_start,first_due,next_due,day_one,day_two,is_demo)
 values(p_customer,p_amount,p_amount,p_rate,p_disbursed,p_start,due,due,p_one,p_two,p_demo) returning id into lid;
 insert into periods(loan_id,starts_on,due_on,opening_principal,rate,interest_due) values(lid,p_start,due,p_amount,p_rate,round(p_amount*p_rate/100,2));
 insert into loan_events(loan_id,occurred_on,kind,detail) values(lid,p_disbursed,'created',jsonb_build_object('principal',p_amount,'rate',p_rate,'cycle_start',p_start,'first_due',due));
 return lid;
end $$;

create function public._accrue(p_loan uuid,p_asof date) returns void language plpgsql security definer set search_path=public as $$
declare l loans%rowtype; p periods%rowtype; unpaid numeric(16,2); due date;
begin
 select * into l from loans where id=p_loan for update;
 if not found or l.status in ('paid','cancelled') then return; end if;
 select * into p from periods where loan_id=l.id and not closed for update;
 while p.due_on<p_asof loop
  unpaid:=p.interest_due-p.interest_paid;
  if unpaid>0 then
   insert into capitalizations(loan_id,period_id,occurred_on,due_on,principal_before,interest_due,interest_paid,amount,principal_after,rate)
   values(l.id,p.id,p.due_on+1,p.due_on,l.principal,p.interest_due,p.interest_paid,unpaid,l.principal+unpaid,p.rate);
   insert into loan_events(loan_id,occurred_on,kind,detail) values(l.id,p.due_on+1,'capitalized',jsonb_build_object('principal_before',l.principal,'amount',unpaid,'principal_after',l.principal+unpaid,'rate',p.rate,'due_on',p.due_on));
   l.principal:=l.principal+unpaid; l.overdue_since:=coalesce(l.overdue_since,p.due_on); l.status:='overdue';
  end if;
  update periods set closed=true,closure=case when unpaid>0 then 'capitalized' else 'paid' end where id=p.id;
  due:=next_payment_date(p.due_on,l.day_one,l.day_two);
  insert into periods(loan_id,starts_on,due_on,opening_principal,rate,interest_due) values(l.id,p.due_on,due,l.principal,l.rate,round(l.principal*l.rate/100,2)) returning * into p;
 end loop;
 update loans set principal=l.principal,overdue_since=l.overdue_since,status=l.status,next_due=p.due_on where id=l.id;
end $$;

create function public._record_payment(p_loan uuid,p_amount numeric,p_date date,p_method text,p_note text,p_request uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare l loans%rowtype; p periods%rowtype; pid uuid; ip numeric(16,2); pp numeric(16,2); remaining numeric(16,2); new_due date;
begin
 select * into l from loans where id=p_loan for update;
 if not found then raise exception 'Préstamo no encontrado.'; end if;
 select id into pid from payments where request_id=p_request;
 if pid is not null then return pid; end if;
 if l.status in ('paid','cancelled') then raise exception 'Este préstamo está cerrado.'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_date is null then raise exception 'Ingrese un pago válido con un máximo de dos decimales.'; end if;
 if p_date<l.disbursed_on or p_date<coalesce((select max(occurred_on) from loan_events where loan_id=l.id),l.disbursed_on) then raise exception 'No se puede registrar un pago anterior al último movimiento.'; end if;
 perform _accrue(l.id,p_date);
 select * into l from loans where id=l.id;
 select * into p from periods where loan_id=l.id and not closed for update;
 if p_date<p.starts_on and p.starts_on<>l.cycle_start then raise exception 'El período indicado ya está cerrado.'; end if;
 remaining:=p.interest_due-p.interest_paid;
 if p_amount>l.principal+remaining then raise exception 'El pago supera el saldo pendiente.'; end if;
 ip:=least(p_amount,remaining); pp:=p_amount-ip;
 new_due:=case when remaining-ip=0 then next_payment_date(p.due_on,l.day_one,l.day_two) else p.due_on end;
 insert into payments(loan_id,period_id,paid_on,amount,interest_paid,principal_paid,principal_before,principal_after,interest_before,interest_remaining,rate,next_due,next_interest,method,note,request_id)
 values(l.id,p.id,p_date,p_amount,ip,pp,l.principal,l.principal-pp,remaining,remaining-ip,p.rate,new_due,round((l.principal-pp)*l.rate/100,2),p_method,coalesce(p_note,''),p_request) returning id into pid;
 update periods set interest_paid=interest_paid+ip where id=p.id;
 update loans set principal=l.principal-pp,overdue_since=case when remaining-ip=0 then null else overdue_since end,
 status=case when l.principal-pp=0 and remaining-ip=0 then 'paid' when remaining-ip=0 then case when restructured then 'restructured' else 'active' end else status end where id=l.id;
 insert into loan_events(loan_id,occurred_on,kind,detail) values(l.id,p_date,'payment',jsonb_build_object('payment_id',pid,'amount',p_amount,'interest_paid',ip,'principal_paid',pp,'principal_after',l.principal-pp,'rate',p.rate));
 if l.principal-pp=0 and remaining-ip=0 then
  update periods set closed=true,closure='paid' where id=p.id;
  insert into loan_events(loan_id,occurred_on,kind) values(l.id,p_date,'paid');
 end if;
 return pid;
end $$;

create function public._restructure(p_loan uuid,p_rate numeric,p_start date,p_due date,p_one int,p_two int,p_note text,p_date date) returns uuid language plpgsql security definer set search_path=public as $$
declare l loans%rowtype; p periods%rowtype; rid uuid; terms jsonb;
begin
 perform _accrue(p_loan,p_date);
 select * into l from loans where id=p_loan for update;
 if not found or l.status in ('paid','cancelled') then raise exception 'Solo se pueden renegociar préstamos abiertos.'; end if;
 if p_rate is null or p_rate<=0 or p_rate>100 or p_start is null or p_due is null or p_start<p_date or p_due<=p_start or p_due<>next_payment_date(p_start,p_one,p_two) then raise exception 'Revise la tasa y las fechas del nuevo calendario.'; end if;
 select * into p from periods where loan_id=l.id and not closed for update;
 terms:=jsonb_build_object('rate',p_rate,'cycle_start',p_start,'next_due',p_due,'day_one',p_one,'day_two',p_two);
 insert into restructurings(loan_id,occurred_on,principal,interest,old_terms,new_terms,note) values(l.id,p_date,l.principal,p.interest_due-p.interest_paid,
 jsonb_build_object('rate',l.rate,'cycle_start',l.cycle_start,'next_due',p.due_on,'day_one',l.day_one,'day_two',l.day_two),terms,coalesce(p_note,'')) returning id into rid;
 update periods set closed=true,closure='restructured' where id=p.id;
 insert into periods(loan_id,starts_on,due_on,opening_principal,rate,interest_due) values(l.id,p_start,p_due,l.principal,p.rate,p.interest_due-p.interest_paid);
 update loans set rate=p_rate,cycle_start=p_start,next_due=p_due,day_one=p_one,day_two=p_two,restructured=true,status='restructured',overdue_since=null where id=l.id;
 insert into loan_events(loan_id,occurred_on,kind,detail) values(l.id,p_date,'restructured',jsonb_build_object('restructuring_id',rid,'previous_rate',l.rate,'new_terms',terms,'interest_carried',p.interest_due-p.interest_paid));
 return rid;
end $$;

create function public.save_customer(p_id uuid,p_name text,p_phone text,p_address text,p_cosigner text,p_cosigner_phone text,p_cosigner_address text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
 perform require_owner();
 if p_id is null then insert into customers(full_name,phone,address) values(trim(p_name),trim(p_phone),trim(p_address)) returning id into cid;
 else update customers set full_name=trim(p_name),phone=trim(p_phone),address=trim(p_address) where id=p_id returning id into cid; end if;
 if cid is null then raise exception 'Cliente no encontrado.'; end if;
 insert into cosigners(customer_id,full_name,phone,address) values(cid,trim(p_cosigner),trim(p_cosigner_phone),trim(p_cosigner_address))
 on conflict(customer_id) do update set full_name=excluded.full_name,phone=excluded.phone,address=excluded.address;
 return cid;
end $$;
create function public.archive_customer(p_id uuid,p_archived boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform require_owner();
 if p_archived and exists(select 1 from loans where customer_id=p_id and status not in ('paid','cancelled')) then raise exception 'El cliente tiene préstamos pendientes. Cierre sus saldos antes de archivarlo.'; end if;
 update customers set archived=p_archived where id=p_id;
end $$;
create function public.create_loan(p_customer uuid,p_amount numeric,p_rate numeric,p_disbursed date,p_start date,p_one int default 15,p_two int default 30) returns uuid language plpgsql security definer set search_path=public as $$
declare lid uuid;
begin perform require_owner();
 if p_disbursed>business_today() then raise exception 'El desembolso no puede estar en el futuro.'; end if;
 lid:=_open_loan(p_customer,p_amount,p_rate,p_disbursed,p_start,p_one,p_two);
 perform _accrue(lid,business_today()); return lid;
end $$;
create function public.record_payment(p_loan uuid,p_amount numeric,p_date date,p_method text,p_note text,p_request uuid) returns uuid language plpgsql security definer set search_path=public as $$
begin perform require_owner(); if p_date>business_today() then raise exception 'No se puede registrar un pago futuro.'; end if;
 return _record_payment(p_loan,p_amount,p_date,p_method,p_note,p_request);
end $$;
create function public.restructure_loan(p_loan uuid,p_rate numeric,p_start date,p_due date,p_one int,p_two int,p_note text) returns uuid language plpgsql security definer set search_path=public as $$
begin perform require_owner(); return _restructure(p_loan,p_rate,p_start,p_due,p_one,p_two,p_note,business_today()); end $$;
create function public.add_note(p_customer uuid,p_type text,p_note text,p_promised date default null,p_amount numeric default null) returns uuid language plpgsql security definer set search_path=public as $$
declare nid uuid;
begin perform require_owner(); insert into collection_notes(customer_id,contact_type,note,promised_on,promised_amount) values(p_customer,p_type,p_note,p_promised,p_amount) returning id into nid; return nid; end $$;
create function public.refresh_portfolio() returns void language plpgsql security definer set search_path=public as $$
declare l record;
begin perform require_owner(); for l in select id from loans where status not in ('paid','cancelled') order by id loop perform _accrue(l.id,business_today()); end loop; end $$;

-- A single snapshot avoids inconsistent totals across concurrent reads.
create function public.portfolio_snapshot() returns jsonb language plpgsql security definer set search_path=public as $$
begin
 perform require_owner(); perform refresh_portfolio();
 return jsonb_build_object(
 'today',business_today(),
 'customers',(select coalesce(jsonb_agg(c order by c.full_name),'[]') from customers c),
 'cosigners',(select coalesce(jsonb_agg(c),'[]') from cosigners c),
 'loans',(select coalesce(jsonb_agg(l order by l.reference desc),'[]') from loans l),
 'periods',(select coalesce(jsonb_agg(p),'[]') from periods p),
 'payments',(select coalesce(jsonb_agg(p order by p.paid_on desc,p.created_at desc),'[]') from payments p),
 'capitalizations',(select coalesce(jsonb_agg(c order by c.occurred_on desc),'[]') from capitalizations c),
 'restructurings',(select coalesce(jsonb_agg(r order by r.created_at desc),'[]') from restructurings r),
 'events',(select coalesce(jsonb_agg(e order by e.occurred_on desc,e.created_at desc),'[]') from loan_events e),
 'notes',(select coalesce(jsonb_agg(n order by n.created_at desc),'[]') from collection_notes n));
end $$;

do $$ declare t text; begin
 foreach t in array array['app_owners','customers','cosigners','loans','periods','payments','capitalizations','restructurings','loan_events','collection_notes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select public.is_owner()))',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_owner(),public.business_today(),public.next_payment_date(date,int,int) to authenticated;
grant execute on function public.save_customer(uuid,text,text,text,text,text,text),public.archive_customer(uuid,boolean),public.create_loan(uuid,numeric,numeric,date,date,int,int),public.record_payment(uuid,numeric,date,text,text,uuid),public.restructure_loan(uuid,numeric,date,date,int,int,text),public.add_note(uuid,text,text,date,numeric),public.refresh_portfolio(),public.portfolio_snapshot() to authenticated;
