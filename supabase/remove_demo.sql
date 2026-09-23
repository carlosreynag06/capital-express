-- Explicit administrative utility, NOT a migration. Removes only demo fixtures.
-- Refuses removal if real loans or later activity have become attached to demo customers.
begin;
do $$
begin
 if exists(select 1 from loans l join customers c on c.id=l.customer_id where c.is_demo and not l.is_demo) then
  raise exception 'Hay préstamos reales asociados a clientes de demostración. Revise esos clientes antes de continuar.';
 end if;
 if exists(select 1 from payments p join loans l on l.id=p.loan_id join customers c on c.id=l.customer_id where c.is_demo and p.created_at>c.created_at+interval '1 minute') then
  raise exception 'Hay pagos posteriores al sembrado de demostración. No se borrarán automáticamente.';
 end if;
end $$;
delete from loan_events where loan_id in(select id from loans where is_demo);
delete from restructurings where loan_id in(select id from loans where is_demo);
delete from capitalizations where loan_id in(select id from loans where is_demo);
delete from payments where loan_id in(select id from loans where is_demo);
delete from periods where loan_id in(select id from loans where is_demo);
delete from loans where is_demo;
delete from collection_notes where customer_id in(select id from customers where is_demo);
delete from cosigners where customer_id in(select id from customers where is_demo);
delete from customers where is_demo;
commit;
