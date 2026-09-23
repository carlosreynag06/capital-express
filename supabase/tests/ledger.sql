begin;
select set_config('request.jwt.claim.sub','01ca5dde-c563-4e24-87d5-25e46e5fe3e8',true);
do $$
declare c uuid; l uuid; p uuid; req uuid:=gen_random_uuid(); balance numeric; due numeric; before_history jsonb; after_history jsonb;
begin
 if next_payment_date('2026-10-15')<>'2026-10-30' or next_payment_date('2026-10-30')<>'2026-11-15' or next_payment_date('2026-02-15')<>'2026-02-28' or next_payment_date('2028-02-15')<>'2028-02-29' then raise exception 'FAIL: calendar'; end if;
 c:=save_customer(null,'Prueba transaccional','809-555-0199','Dirección de prueba','Garante de prueba','829-555-0199','Dirección del garante');
 l:=_open_loan(c,10000,10,'2026-01-12','2026-01-15');
 p:=_record_payment(l,2000,'2026-01-30','Efectivo','Prueba',req);
 if (select principal from loans where id=l)<>9000 then raise exception 'FAIL: first payment'; end if;
 if _record_payment(l,2000,'2026-01-30','Efectivo','Prueba',req)<>p or (select count(*) from payments where loan_id=l)<>1 then raise exception 'FAIL: idempotency'; end if;
 perform _record_payment(l,2900,'2026-02-15','Efectivo','Prueba',gen_random_uuid());
 perform _record_payment(l,2000,'2026-02-28','Efectivo','Prueba',gen_random_uuid());
 if (select principal from loans where id=l)<>5700 then raise exception 'FAIL: sequence'; end if;
 perform _accrue(l,'2026-03-01');
 if (select interest_due from periods where loan_id=l and not closed)<>570 then raise exception 'FAIL: declining interest'; end if;
 select jsonb_agg(x) into before_history from payments x where loan_id=l;
 perform _restructure(l,8,'2026-03-01','2026-03-15',15,30,'Tasa negociada','2026-03-01');
 select jsonb_agg(x) into after_history from payments x where loan_id=l;
 if before_history<>after_history then raise exception 'FAIL: historical payment mutation'; end if;
 if (select rate from loans where id=l)<>8 then raise exception 'FAIL: restructure'; end if;
 l:=_open_loan(c,10000,10,'2026-01-12','2026-01-15');
 perform _record_payment(l,600,'2026-01-30','Efectivo','Parcial',gen_random_uuid());
 if (select principal_paid from payments where loan_id=l)<>0 then raise exception 'FAIL: partial allocation'; end if;
 perform _accrue(l,'2026-01-31'); perform _accrue(l,'2026-01-31');
 if (select principal from loans where id=l)<>10400 or (select interest_due from periods where loan_id=l and not closed)<>1040 or (select count(*) from capitalizations where loan_id=l)<>1 then raise exception 'FAIL: partial capitalization'; end if;
 l:=_open_loan(c,10000,10,'2026-01-12','2026-01-15');
 perform _accrue(l,'2026-02-16');
 if (select principal from loans where id=l)<>12100 or (select interest_due from periods where loan_id=l and not closed)<>1210 then raise exception 'FAIL: missed compounding'; end if;
 begin perform _record_payment(l,999999,'2026-02-16','Efectivo','Exceso',gen_random_uuid()); raise exception 'FAIL: overpayment accepted'; exception when raise_exception then if sqlerrm='FAIL: overpayment accepted' then raise; end if; end;
 if exists(select 1 from loans x where x.principal<>x.original_principal+coalesce((select sum(amount) from capitalizations where loan_id=x.id),0)-coalesce((select sum(principal_paid) from payments where loan_id=x.id),0)) then raise exception 'FAIL: principal reconciliation'; end if;
 if exists(select 1 from payments where amount<>interest_paid+principal_paid or principal_before-principal_paid<>principal_after or interest_before-interest_paid<>interest_remaining) then raise exception 'FAIL: payment reconciliation'; end if;
 if exists(select 1 from loans where status='paid' and principal<>0) then raise exception 'FAIL: paid balance'; end if;
 if (select count(*) from customers where is_demo)<>15 then raise exception 'FAIL: exactly 15 demo customers required'; end if;
end $$;
select 'PASS: calendar, allocation, declining interest, idempotency, partial interest, capitalization, compounding, restructuring history, overpayment, portfolio reconciliation, 15 demo customers' as result;
-- An authenticated JWT for any other user still has no business access.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
begin
 if exists(select 1 from customers) or exists(select 1 from payments) or exists(select 1 from loans) then raise exception 'FAIL: non-owner RLS'; end if;
 begin perform portfolio_snapshot(); raise exception 'FAIL: non-owner RPC'; exception when insufficient_privilege then null; end;
 begin perform save_customer(null,'Unauthorized fixture','809-555-0199','Test address','Test guarantor','829-555-0199','Test address'); raise exception 'FAIL: non-owner mutation'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: authenticated non-owner blocked by RLS and read/write RPC authorization' as security_result;
rollback;
