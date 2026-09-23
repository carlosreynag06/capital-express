begin;
-- Idempotent: development records are identifiable and never duplicated.
do $$
declare
 names text[]:=array['Adriana Méndez Rosario','Carlos Peña Castillo','Valentina Núñez Díaz','José Miguel Santana','María Fernanda Cruz','Rafael Alberto Ortiz','Camila Rodríguez Santos','Luis Emilio Vargas','Gabriela Reyes Guzmán','Pedro Antonio Jiménez','Daniela Batista Rojas','Andrés Manuel de León','Lucía Isabel Cabrera','Francisco Javier Paredes','Yanelis Altagracia Moreno'];
 guarantors text[]:=array['Roberto Méndez Pérez','Ana Isabel Castillo','Miguel Ángel Núñez','Carmen Rosa Santana','Julio César Cruz','Teresa Ortiz Medina','Manuel Rodríguez Peña','Rosa Elena Vargas','Ricardo Reyes Díaz','Marta Jiménez Santos','Fernando Batista Cruz','Elena de León Rojas','Ramón Cabrera Ortiz','Patricia Paredes Gil','Héctor Moreno Báez'];
 neighborhoods text[]:=array['Los Prados','Ensanche Ozama','Bella Vista','Los Jardines','Alma Rosa','Villa Mella','El Millón','Gazcue','Arroyo Hondo','Naco','Ensanche Quisqueya','Santiago Centro','Piantini','San Isidro','Los Alcarrizos'];
 amounts numeric[]:=array[25000,40000,20000,15000,10000,35000,10000,50000,18000,30000,12000,45000,22000,28000,60000];
 cid uuid; lid uuid; old_lid uuid; p periods%rowtype; l loans%rowtype;
 today date:=business_today(); anchor date; start_date date; last_due date; rate_n numeric; principal_part numeric; iteration int;
begin
 if exists(select 1 from customers where is_demo) then return; end if;
 anchor:=date_trunc('month',today)::date+14;
 if anchor>=today then anchor:=(date_trunc('month',today)-interval '1 month')::date+14; end if;
 last_due:=anchor;
 while next_payment_date(last_due)<today loop last_due:=next_payment_date(last_due); end loop;
 for i in 1..15 loop
  insert into customers(full_name,phone,address,is_demo) values(names[i],format('(809) 555-%s',lpad((100+i)::text,4,'0')),format('Calle Los Almendros %s, %s, República Dominicana',i*3,neighborhoods[i]),true) returning id into cid;
  insert into cosigners(customer_id,full_name,phone,address) values(cid,guarantors[i],format('(829) 555-%s',lpad((200+i)::text,4,'0')),format('Calle Las Palmas %s, %s, República Dominicana',i*2,neighborhoods[i]));
  -- Several repeat customers have a complete, reconciled earlier loan.
  if i in (2,10,12,15) then
   start_date:=(date_trunc('month',today)-interval '5 months')::date+14;
   old_lid:=_open_loan(cid,10000+i*500,10,start_date-3,start_date,15,30,true);
   perform _record_payment(old_lid,(10000+i*500)*1.1,next_payment_date(start_date),'Transferencia','Préstamo anterior saldado.',gen_random_uuid());
   if i=12 then
    start_date:=(date_trunc('month',today)-interval '4 months')::date+14;
    old_lid:=_open_loan(cid,25000,10,start_date-2,start_date,15,30,true);
    perform _record_payment(old_lid,27500,next_payment_date(start_date),'Efectivo','Saldo total del segundo préstamo.',gen_random_uuid());
   end if;
  end if;
  rate_n:=case when i=8 then 8 when i=9 then 12 else 10 end;
  start_date:=case when i in (1,12,13) then last_due when i in (5,7,14) then (date_trunc('month',last_due)-interval '1 month')::date+29 else (date_trunc('month',today)-interval '2 months')::date+14 end;
  lid:=_open_loan(cid,amounts[i],rate_n,start_date-3,start_date,15,30,true);
  iteration:=0;
  loop
   select * into p from periods where loan_id=lid and not closed;
   select * into l from loans where id=lid;
   exit when not found or l.status='paid' or p.due_on>=today;
   iteration:=iteration+1;
   if i in (5,6,14,15) then null;
   elsif i=7 then
    if iteration=1 then perform _record_payment(lid,600,p.due_on,'Efectivo','Abono parcial al interés; quedan RD$400.',gen_random_uuid()); end if;
   elsif i=11 then perform _record_payment(lid,l.principal+p.interest_due-p.interest_paid,p.due_on,'Transferencia','Pago total del préstamo.',gen_random_uuid()); exit;
   else
    principal_part:=case when i=3 and iteration<=2 then amounts[i]*0.45 when i in (3,4) then 0 else least(l.principal,round(amounts[i]*0.08,2)) end;
    perform _record_payment(lid,p.interest_due-p.interest_paid+principal_part,p.due_on,case when i%2=0 then 'Transferencia' else 'Efectivo' end,'Pago quincenal recibido.',gen_random_uuid());
   end if;
   perform _accrue(lid,p.due_on+1);
  end loop;
  if i=10 then perform _restructure(lid,8,last_due,next_payment_date(last_due),15,30,'Se acordó reducir la tasa al 8%. Se conserva el interés del período vigente.',last_due); end if;
  perform _accrue(lid,today);
  if i in (5,6,7,10,14,15) then
   insert into collection_notes(customer_id,contact_type,note,promised_on,promised_amount,created_at) values(cid,'Llamada',case when i=6 then 'No contestó. Se volverá a llamar mañana en la tarde.' when i=15 then 'Se contactó al garante y se explicó el saldo pendiente. Solicitó conversar con el cliente.' else 'Conversamos sobre el saldo pendiente. El cliente se comprometió a abonar en la próxima quincena.' end,next_payment_date(today),3000,now()-interval '2 days');
   insert into collection_notes(customer_id,contact_type,note,created_at) values(cid,'WhatsApp','Se envió el detalle del préstamo y un recordatorio de la próxima fecha de pago.',now()-interval '1 day');
  end if;
 end loop;
end $$;
commit;
