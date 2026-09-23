drop function if exists public.validate_loan_precision();
create or replace function public.record_payment(p_loan uuid,p_amount numeric,p_date date,p_method text,p_note text,p_request uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare existing payments%rowtype;
begin
 perform require_owner();
 if p_request is null then raise exception 'Falta la referencia del pago.'; end if;
 if p_date>business_today() then raise exception 'No se puede registrar un pago futuro.'; end if;
 -- Serializes retries of one request across connections before checking its payload.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from payments where request_id=p_request;
 if found and (existing.loan_id<>p_loan or existing.amount<>p_amount or existing.paid_on<>p_date or existing.method<>p_method or existing.note<>coalesce(p_note,'')) then
  raise exception 'La referencia de envío ya corresponde a otro pago. Vuelve a abrir el formulario.';
 end if;
 return _record_payment(p_loan,p_amount,p_date,p_method,p_note,p_request);
end $$;
