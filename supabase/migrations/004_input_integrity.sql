-- Explicit finite bounds also reject PostgreSQL numeric NaN.
alter table public.loans add constraint finite_original_principal check(original_principal < 100000000000000);
alter table public.loans add constraint finite_principal check(principal < 100000000000000);
alter table public.collection_notes add constraint finite_promised_amount check(promised_amount < 100000000000000);

-- Guard inputs before any implicit numeric-column rounding can occur.
create function public.validate_loan_precision() returns trigger language plpgsql set search_path=public as $$
begin
 if new.rate<>round(new.rate,4) then raise exception 'La tasa admite un máximo de cuatro decimales.'; end if;
 return new;
end $$;
revoke execute on function public.validate_loan_precision() from public,anon,authenticated;

-- Idempotency is scoped to the same payment, not just a reused client identifier.
create or replace function public.record_payment(p_loan uuid,p_amount numeric,p_date date,p_method text,p_note text,p_request uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare existing payments%rowtype;
begin
 perform require_owner();
 if p_date>business_today() then raise exception 'No se puede registrar un pago futuro.'; end if;
 select * into existing from payments where request_id=p_request;
 if found and (existing.loan_id<>p_loan or existing.amount<>p_amount or existing.paid_on<>p_date or existing.method<>p_method or existing.note<>coalesce(p_note,'')) then
  raise exception 'La referencia de envío ya corresponde a otro pago. Vuelve a abrir el formulario.';
 end if;
 return _record_payment(p_loan,p_amount,p_date,p_method,p_note,p_request);
end $$;

create or replace function public.create_loan(p_customer uuid,p_amount numeric,p_rate numeric,p_disbursed date,p_start date,p_one int default 15,p_two int default 30) returns uuid language plpgsql security definer set search_path=public as $$
declare lid uuid;
begin
 perform require_owner();
 if p_disbursed>business_today() then raise exception 'El desembolso no puede estar en el futuro.'; end if;
 if p_rate<>round(p_rate,4) then raise exception 'La tasa admite un máximo de cuatro decimales.'; end if;
 lid:=_open_loan(p_customer,p_amount,p_rate,p_disbursed,p_start,p_one,p_two);
 perform _accrue(lid,business_today()); return lid;
end $$;
create or replace function public.restructure_loan(p_loan uuid,p_rate numeric,p_start date,p_due date,p_one int,p_two int,p_note text) returns uuid language plpgsql security definer set search_path=public as $$
begin
 perform require_owner();
 if p_rate<>round(p_rate,4) then raise exception 'La tasa admite un máximo de cuatro decimales.'; end if;
 return _restructure(p_loan,p_rate,p_start,p_due,p_one,p_two,p_note,business_today());
end $$;
