truncate table
  public.monthly_liquidations,
  public.renewals,
  public.payments,
  public.payment_schedule,
  public.loans,
  public.customers,
  public.collectors
restart identity cascade;

insert into public.collectors (id, full_name, phone, notes, active) values
  ('00000000-0000-0000-0000-000000000101', 'Rafael Santos', '(809) 555-7001', 'Ruta diaria zona oeste y centro.', true),
  ('00000000-0000-0000-0000-000000000102', 'Carlos Núñez', '(829) 555-7002', 'Ruta diaria zona este y semanal.', true),
  ('00000000-0000-0000-0000-000000000103', 'Laura Méndez', '(849) 555-7003', 'Apoyo administrativo y cobros especiales.', true);

insert into public.customers (
  id, full_name, phone, address, identification_number, notes, references_text, assigned_collector_id, status
) values
  ('00000000-0000-0000-0000-000000000001', 'Marisol De la Cruz', '(809) 555-2104', 'Los Ciruelos, Puerto Plata', '037-0043921-8', 'Cliente puntual, negocio de comida en casa.', 'Ana P. / Colmado La Fe', '00000000-0000-0000-0000-000000000101', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Joel Martínez', '(829) 555-4418', 'Ensanche Dubocq, Puerto Plata', '037-1129845-2', 'Atraso recurrente, revisar renovación con cuidado.', 'Miguel M. / Taller Joel', '00000000-0000-0000-0000-000000000101', 'late'),
  ('00000000-0000-0000-0000-000000000003', 'Yudelka Peña', '(849) 555-3190', 'Padre Las Casas, Puerto Plata', '037-0938481-7', 'Cliente elegible para renovación.', 'Juana P. / Salón Yudelka', '00000000-0000-0000-0000-000000000102', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'Ramón Batista', '(809) 555-9021', 'Costambar, Puerto Plata', '037-9938214-0', 'Historial limpio. Puede aplicar a monto mayor.', 'Francis B. / Ferretería Norte', '00000000-0000-0000-0000-000000000102', 'paid'),
  ('00000000-0000-0000-0000-000000000005', 'Claudia Rosario', '(829) 555-7812', 'Cristo Rey, Puerto Plata', '037-2048193-5', 'Vende ropa por encargo. Buen flujo semanal.', 'Lina R. / Boutique Claudia', '00000000-0000-0000-0000-000000000101', 'active'),
  ('00000000-0000-0000-0000-000000000006', 'Andrés Peralta', '(849) 555-6744', 'San Marcos, Puerto Plata', '037-7742011-9', 'Cliente con negocio de repuestos. Solicita renovaciones frecuentes.', 'Nelson P. / Repuestos La 30', '00000000-0000-0000-0000-000000000102', 'active'),
  ('00000000-0000-0000-0000-000000000007', 'Nathalie Gómez', '(809) 555-3380', 'El Javillar, Puerto Plata', '037-6639104-1', 'Pago diario en ruta de la tarde.', 'Carolina G. / Estética Nath', '00000000-0000-0000-0000-000000000101', 'active'),
  ('00000000-0000-0000-0000-000000000008', 'Luis Almanzar', '(829) 555-0449', 'Avenida Colón, Puerto Plata', '037-8812376-0', 'Revisar antes de aprobar renovación.', 'José A. / Taller Colón', '00000000-0000-0000-0000-000000000102', 'late'),
  ('00000000-0000-0000-0000-000000000009', 'Estefany Mejía', '(849) 555-9027', 'Urbanización Atlántica, Puerto Plata', '037-5483920-6', 'Cliente nueva, todavía no cumple regla de renovación.', 'Marta M. / Colmado Atlántico', '00000000-0000-0000-0000-000000000101', 'active'),
  ('00000000-0000-0000-0000-000000000010', 'Héctor Polanco', '(809) 555-1185', 'La Javilla, Puerto Plata', '037-3382190-4', 'Pago semanal, seguimiento los sábados.', 'Ramón P. / Ruta La Javilla', '00000000-0000-0000-0000-000000000102', 'active'),
  ('00000000-0000-0000-0000-000000000011', 'Milagros Reyes', '(849) 555-8122', 'Bello Costero, Puerto Plata', '037-6671204-3', 'Pago mensual por nómina informal.', 'Luz R. / Cafetería Milagros', '00000000-0000-0000-0000-000000000103', 'active'),
  ('00000000-0000-0000-0000-000000000012', 'Santiago Lora', '(809) 555-3302', 'Barrio Haití, Puerto Plata', '037-8817722-5', 'Cliente con pago parcial reciente.', 'Pedro L. / Mecánica Lora', '00000000-0000-0000-0000-000000000101', 'active'),
  ('00000000-0000-0000-0000-000000000013', 'Carolina Vásquez', '(829) 555-6280', 'Torre Alta, Puerto Plata', '037-5519044-2', 'Adelantó dos cuotas esta semana.', 'Nuria V. / Tienda Carolina', '00000000-0000-0000-0000-000000000102', 'active'),
  ('00000000-0000-0000-0000-000000000014', 'Pedro Jiménez', '(809) 555-7745', 'Maimón, Puerto Plata', '037-8801148-0', 'Caso defaulted para pruebas de cartera.', 'Ricardo J. / Colmado Maimón', '00000000-0000-0000-0000-000000000103', 'defaulted'),
  ('00000000-0000-0000-0000-000000000015', 'Rosa Tavárez', '(849) 555-2229', 'Ginebra Arzeno, Puerto Plata', '037-6738201-4', 'Préstamo cancelado antes de desembolso.', 'Dania T. / Familia Tavárez', '00000000-0000-0000-0000-000000000101', 'inactive'),
  ('00000000-0000-0000-0000-000000000016', 'Emanuel Cruz', '(829) 555-4930', 'San Felipe, Puerto Plata', '037-3304981-7', 'Renovación reciente completada.', 'Omar C. / Barbería Emanuel', '00000000-0000-0000-0000-000000000102', 'active'),
  ('00000000-0000-0000-0000-000000000017', 'Gloria Espinal', '(809) 555-6154', 'Los Domínguez, Puerto Plata', '037-1192020-6', 'Ciclo diario nuevo, sin atrasos.', 'María E. / Gloria Shop', '00000000-0000-0000-0000-000000000101', 'active'),
  ('00000000-0000-0000-0000-000000000018', 'Tomás Ferreira', '(849) 555-0198', 'Altos de Chavón, Puerto Plata', '037-4420911-3', 'Mensual con garantía verbal.', 'Nelson F. / Ferretería Ferreira', '00000000-0000-0000-0000-000000000103', 'active'),
  ('00000000-0000-0000-0000-000000000019', 'Anabel Rivas', '(829) 555-3838', 'Cerro Alto, Puerto Plata', '037-2901147-9', 'Semanal con buen historial.', 'Clara R. / Repostería Anabel', '00000000-0000-0000-0000-000000000102', 'active'),
  ('00000000-0000-0000-0000-000000000020', 'Víctor Peña', '(809) 555-6464', 'Sabana Grande, Puerto Plata', '037-8812210-2', 'Pagado completo por saldo anticipado.', 'Raúl P. / Ruta Sabana', '00000000-0000-0000-0000-000000000101', 'paid');

insert into public.loans (
  id, loan_number, customer_id, principal, payment_amount, frequency, total_payments, paid_amount,
  start_date, end_date, late_fee_percentage, grace_days, collector_id, notes, status, renewed_from_loan_id
) values
  ('10000000-0000-0000-0000-000000001201', 'CE-1201', '00000000-0000-0000-0000-000000000001', 5000, 145, 'daily', 45, 3335, '2026-04-13', '2026-06-03', 4, 3, '00000000-0000-0000-0000-000000000101', 'Diario estándar, buen comportamiento.', 'active', null),
  ('10000000-0000-0000-0000-000000001202', 'CE-1202', '00000000-0000-0000-0000-000000000002', 8000, 235, 'daily', 45, 4230, '2026-04-07', '2026-05-28', 5, 2, '00000000-0000-0000-0000-000000000101', 'Atrasado, cubrió dos cuotas juntas.', 'late', null),
  ('10000000-0000-0000-0000-000000001203', 'CE-1203', '00000000-0000-0000-0000-000000000003', 5000, 145, 'daily', 45, 4350, '2026-03-31', '2026-05-21', 4, 3, '00000000-0000-0000-0000-000000000102', 'Elegible para renovación por regla del 50%.', 'active', null),
  ('10000000-0000-0000-0000-000000001204', 'CE-1204', '00000000-0000-0000-0000-000000000005', 6000, 175, 'daily', 45, 4200, '2026-04-09', '2026-05-30', 4, 3, '00000000-0000-0000-0000-000000000101', 'Pagos constantes.', 'active', null),
  ('10000000-0000-0000-0000-000000001205', 'CE-1205', '00000000-0000-0000-0000-000000000006', 10000, 315, 'daily', 45, 8820, '2026-04-02', '2026-05-23', 5, 3, '00000000-0000-0000-0000-000000000102', 'Cliente con alto potencial de renovación.', 'active', null),
  ('10000000-0000-0000-0000-000000001206', 'CE-1206', '00000000-0000-0000-0000-000000000007', 5000, 145, 'daily', 45, 4930, '2026-03-24', '2026-05-14', 4, 3, '00000000-0000-0000-0000-000000000101', 'Casi al cierre.', 'active', null),
  ('10000000-0000-0000-0000-000000001207', 'CE-1207', '00000000-0000-0000-0000-000000000008', 7000, 210, 'daily', 45, 4830, '2026-04-10', '2026-05-31', 5, 2, '00000000-0000-0000-0000-000000000102', 'Atrasado con mora.', 'late', null),
  ('10000000-0000-0000-0000-000000001208', 'CE-1208', '00000000-0000-0000-0000-000000000009', 4000, 125, 'daily', 45, 1750, '2026-04-23', '2026-06-13', 4, 3, '00000000-0000-0000-0000-000000000101', 'Cliente nueva, bajo 50%.', 'active', null),
  ('10000000-0000-0000-0000-000000001209', 'CE-1209', '00000000-0000-0000-0000-000000000010', 12000, 1850, 'weekly', 10, 11100, '2026-03-28', '2026-06-06', 3, 4, '00000000-0000-0000-0000-000000000102', 'Semanal, seis pagos realizados.', 'active', null),
  ('10000000-0000-0000-0000-000000001210', 'CE-1210', '00000000-0000-0000-0000-000000000011', 15000, 5700, 'monthly', 3, 5700, '2026-04-15', '2026-06-15', 3, 5, '00000000-0000-0000-0000-000000000103', 'Mensual, primer pago hecho.', 'active', null),
  ('10000000-0000-0000-0000-000000001211', 'CE-1211', '00000000-0000-0000-0000-000000000012', 3500, 110, 'daily', 45, 1980, '2026-04-18', '2026-06-09', 4, 3, '00000000-0000-0000-0000-000000000101', 'Incluye media cuota para pruebas.', 'active', null),
  ('10000000-0000-0000-0000-000000001212', 'CE-1212', '00000000-0000-0000-0000-000000000013', 4500, 140, 'daily', 45, 3220, '2026-04-14', '2026-06-04', 4, 3, '00000000-0000-0000-0000-000000000102', 'Pago adelantado de dos cuotas.', 'active', null),
  ('10000000-0000-0000-0000-000000001213', 'CE-1213', '00000000-0000-0000-0000-000000000014', 5000, 145, 'daily', 45, 870, '2026-03-10', '2026-04-30', 6, 2, '00000000-0000-0000-0000-000000000103', 'Defaulted para pruebas.', 'defaulted', null),
  ('10000000-0000-0000-0000-000000001214', 'CE-1214', '00000000-0000-0000-0000-000000000015', 5000, 145, 'daily', 45, 0, '2026-05-03', '2026-06-24', 4, 3, '00000000-0000-0000-0000-000000000101', 'Cancelado antes de iniciar.', 'cancelled', null),
  ('10000000-0000-0000-0000-000000001215', 'CE-1215', '00000000-0000-0000-0000-000000000016', 5000, 145, 'daily', 45, 4350, '2026-03-20', '2026-05-11', 4, 3, '00000000-0000-0000-0000-000000000102', 'Cerrado por renovación.', 'renewed', null),
  ('10000000-0000-0000-0000-000000001216', 'CE-1216', '00000000-0000-0000-0000-000000000016', 5000, 145, 'daily', 45, 580, '2026-05-08', '2026-06-29', 4, 3, '00000000-0000-0000-0000-000000000102', 'Nuevo ciclo renovado.', 'active', '10000000-0000-0000-0000-000000001215'),
  ('10000000-0000-0000-0000-000000001217', 'CE-1217', '00000000-0000-0000-0000-000000000017', 3000, 95, 'daily', 45, 570, '2026-05-01', '2026-06-22', 4, 3, '00000000-0000-0000-0000-000000000101', 'Nuevo ciclo activo.', 'active', null),
  ('10000000-0000-0000-0000-000000001218', 'CE-1218', '00000000-0000-0000-0000-000000000018', 18000, 6800, 'monthly', 3, 0, '2026-05-05', '2026-07-05', 3, 5, '00000000-0000-0000-0000-000000000103', 'Mensual sin pagos todavía.', 'active', null),
  ('10000000-0000-0000-0000-000000001219', 'CE-1219', '00000000-0000-0000-0000-000000000019', 9000, 1380, 'weekly', 8, 5520, '2026-04-11', '2026-05-30', 3, 4, '00000000-0000-0000-0000-000000000102', 'Semanal, adelantos correctos.', 'active', null),
  ('10000000-0000-0000-0000-000000001220', 'CE-1220', '00000000-0000-0000-0000-000000000020', 6500, 205, 'daily', 45, 9225, '2026-03-17', '2026-05-07', 4, 3, '00000000-0000-0000-0000-000000000101', 'Saldado completo anticipado.', 'paid', null);

insert into public.payments (
  id, loan_id, customer_id, collector_id, payment_date, amount, payment_number, frequency, status, late_fee_amount, notes
) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '2026-05-08', 145, 23, 'daily', 'on_time', 0, 'Cobro regular en ruta.'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', '2026-05-08', 470, 18, 'daily', 'late', 55, 'Cubrió dos cuotas atrasadas.'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000102', '2026-05-07', 145, 30, 'daily', 'on_time', 0, 'Cliente elegible para renovación.'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000001204', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000101', '2026-05-08', 175, 24, 'daily', 'on_time', 0, 'Pago en efectivo.'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000001205', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000102', '2026-05-08', 315, 28, 'daily', 'on_time', 0, 'Pago recibido en taller.'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000001206', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000101', '2026-05-08', 145, 34, 'daily', 'on_time', 0, 'Sin novedad.'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000001207', '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000102', '2026-05-07', 210, 23, 'daily', 'late', 42, 'Pago fuera de fecha.'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000001209', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000102', '2026-05-02', 1850, 6, 'weekly', 'on_time', 0, 'Pago semanal.'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000001210', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000103', '2026-05-15', 5700, 1, 'monthly', 'on_time', 0, 'Primer pago mensual.'),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000001211', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000101', '2026-05-06', 55, 18, 'daily', 'on_time', 0, 'Media cuota.'),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000001212', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000102', '2026-05-06', 280, 23, 'daily', 'on_time', 0, 'Adelantó dos cuotas.'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000001213', '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000103', '2026-04-02', 145, 6, 'daily', 'late', 75, 'Último pago antes de default.'),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000001215', '00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000102', '2026-05-08', 2175, 30, 'daily', 'closed', 0, 'Cierre por renovación.'),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000001216', '00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000102', '2026-05-09', 290, 2, 'daily', 'on_time', 0, 'Primeros pagos del nuevo ciclo.'),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000001217', '00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000101', '2026-05-08', 95, 6, 'daily', 'on_time', 0, 'Pago diario.'),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000001219', '00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000102', '2026-05-02', 1380, 4, 'weekly', 'on_time', 0, 'Pago semanal adelantado.'),
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000001220', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000101', '2026-05-07', 9225, 45, 'daily', 'closed', 0, 'Saldado completo.'),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000001208', '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000101', '2026-05-08', 125, 14, 'daily', 'on_time', 0, 'Cliente nueva.'),
  ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000001218', '00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000103', '2026-05-05', 0, 1, 'monthly', 'on_time', 0, 'Préstamo desembolsado sin pago todavía.'),
  ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '2026-04-30', 3190, 22, 'daily', 'on_time', 0, 'Pagos acumulados abril.');

with recursive schedules as (
  select
    id as loan_id,
    1 as payment_number,
    start_date as due_date,
    frequency,
    total_payments,
    payment_amount,
    paid_amount,
    status as loan_status
  from public.loans
  union all
  select
    loan_id,
    payment_number + 1,
    case
      when frequency = 'daily' then
        case
          when extract(dow from due_date + interval '1 day') = 0 then (due_date + interval '2 days')::date
          else (due_date + interval '1 day')::date
        end
      when frequency = 'weekly' then (due_date + interval '7 days')::date
      else (due_date + interval '1 month')::date
    end,
    frequency,
    total_payments,
    payment_amount,
    paid_amount,
    loan_status
  from schedules
  where payment_number < total_payments
)
insert into public.payment_schedule (loan_id, payment_number, due_date, expected_amount, status)
select
  loan_id,
  payment_number,
  due_date,
  payment_amount,
  case
    when loan_status in ('paid', 'renewed') or payment_number <= floor(paid_amount / payment_amount) then 'paid'::public.schedule_status
    when loan_status in ('late', 'defaulted') and due_date < current_date then 'late'::public.schedule_status
    else 'pending'::public.schedule_status
  end
from schedules;

insert into public.renewals (
  id, original_loan_id, new_loan_id, customer_id, renewal_date, original_principal,
  total_expected_repayment, amount_already_paid, payoff_balance, amount_given_to_customer,
  new_principal, notes
) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000001215', '10000000-0000-0000-0000-000000001216', '00000000-0000-0000-0000-000000000016', '2026-05-08', 5000, 6525, 4350, 2175, 2825, 5000, 'Renovación estándar con cálculo de balance pendiente.');

insert into public.expenses (id, expense_type, amount, expense_date, description, entered_by_name) values
  ('40000000-0000-0000-0000-000000000001', 'Gasolina motor', 1850, '2026-05-05', 'Gasolina semana 1 de mayo', 'Rafael Santos'),
  ('40000000-0000-0000-0000-000000000002', 'Papelería', 620, '2026-05-02', 'Libretas y lapiceros para cobros', 'Admin'),
  ('40000000-0000-0000-0000-000000000003', 'Gestión de cobro', 1400, '2026-04-30', 'Comisión cobro cierre de abril', 'Carlos Núñez'),
  ('40000000-0000-0000-0000-000000000004', 'Mantenimiento motor', 2100, '2026-05-10', 'Cambio de aceite y frenos', 'Rafael Santos'),
  ('40000000-0000-0000-0000-000000000005', 'Material oficina', 980, '2026-05-11', 'Folders, clips y recibos', 'Admin');

insert into public.monthly_liquidations (
  id, liquidation_month, close_date, total_collected, principal_recovered, profit_collected,
  late_fees_collected, operating_expenses, net_profit, investor_share, partner_share,
  status, confirmed_at, notes
) values
  ('50000000-0000-0000-0000-000000000001', '2026-04-01', '2026-04-30', 32450, 18700, 13280, 470, 5330, 8420, 5052, 3368, 'confirmed', '2026-04-30 18:30:00-04', 'Cierre importado para pruebas de historial.'),
  ('50000000-0000-0000-0000-000000000002', '2026-03-01', '2026-03-30', 28750, 17120, 11300, 330, 5355, 6275, 3765, 2510, 'confirmed', '2026-03-30 18:10:00-04', 'Cierre importado para pruebas de historial.');
