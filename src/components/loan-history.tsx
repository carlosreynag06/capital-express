import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import type { Capitalization, Loan, Payment } from '@/lib/model';
import { date, money, reference, sum } from '@/lib/model';
import type { BehaviorCycle, LoanBehavior } from '@/lib/loan-behavior';
import { Empty, PanelHead } from './ui';

export function PaymentHistory({
  loan,
  payments,
  capitalizations,
}: {
  loan: Loan;
  payments: Payment[];
  capitalizations: Capitalization[];
}) {
  const movements = [
    ...payments.map((payment) => ({ kind: 'payment' as const, date: payment.paid_on, payment })),
    ...capitalizations.map((capitalization) => ({
      kind: 'capitalization' as const,
      date: capitalization.occurred_on,
      capitalization,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  return (
    <>
      <div className="payment-history-summary">
        <div>
          <span>Pagos registrados</span>
          <strong>{payments.length}</strong>
        </div>
        <div>
          <span>Total recibido</span>
          <strong>{money(sum(payments, (payment) => payment.amount))}</strong>
        </div>
        <div>
          <span>Interés pagado</span>
          <strong>{money(sum(payments, (payment) => payment.interest_paid))}</strong>
        </div>
        <div>
          <span>Abonado a capital</span>
          <strong>{money(sum(payments, (payment) => payment.principal_paid))}</strong>
        </div>
      </div>
      <p className="payment-history-note">
        Cada pago aparece con su recibo y el capital antes y después. El interés capitalizado se
        muestra en orden cronológico, pero no es dinero recibido ni cuenta como pago.
      </p>
      <div className="table-scroll payment-history-table">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento / recibo</th>
              <th>Pago recibido</th>
              <th>Interés pagado</th>
              <th>Abono a capital</th>
              <th>Interés capitalizado</th>
              <th>Capital antes</th>
              <th>Capital después</th>
            </tr>
          </thead>
          <tbody>
            <tr className="ledger-opening">
              <td>{date(loan.disbursed_on, true)}</td>
              <td>Desembolso inicial</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td className="strong-number">{money(loan.original_principal)}</td>
            </tr>
            {movements.map((movement) => {
              if (movement.kind === 'capitalization') {
                const capitalization = movement.capitalization;
                return (
                  <tr className="ledger-capitalization" key={capitalization.id}>
                    <td>{date(capitalization.occurred_on, true)}</td>
                    <td>
                      <strong>Interés capitalizado</strong>
                      <small>Venció el {date(capitalization.due_on, true)}</small>
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{money(capitalization.amount)}</td>
                    <td>{money(capitalization.principal_before)}</td>
                    <td className="strong-number">{money(capitalization.principal_after)}</td>
                  </tr>
                );
              }
              const payment = movement.payment;
              return (
                <tr key={payment.id}>
                  <td>{date(payment.paid_on, true)}</td>
                  <td>
                    <Link href={`/recibos/${payment.id}`} className="text-link">
                      REC-{String(payment.receipt).padStart(5, '0')}
                      <ArrowUpRight size={14} />
                    </Link>
                    <small>{payment.method}</small>
                  </td>
                  <td className="strong-number">{money(payment.amount)}</td>
                  <td>{money(payment.interest_paid)}</td>
                  <td>{money(payment.principal_paid)}</td>
                  <td>—</td>
                  <td>{money(payment.principal_before)}</td>
                  <td className="strong-number">{money(payment.principal_after)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="payment-history-cards">
        <article className="payment-movement opening">
          <span>Desembolso inicial · {date(loan.disbursed_on, true)}</span>
          <strong>{money(loan.original_principal)}</strong>
          <p>Capital inicial del préstamo</p>
        </article>
        {movements.map((movement) => {
          if (movement.kind === 'capitalization') {
            const capitalization = movement.capitalization;
            return (
              <article className="payment-movement capitalization" key={capitalization.id}>
                <span>{date(capitalization.occurred_on, true)}</span>
                <strong>Interés capitalizado · {money(capitalization.amount)}</strong>
                <p>No es un pago recibido.</p>
                <div className="payment-capital-change">
                  <span>Capital antes: {money(capitalization.principal_before)}</span>
                  <span>Capital después: {money(capitalization.principal_after)}</span>
                </div>
              </article>
            );
          }
          const payment = movement.payment;
          return (
            <article className="payment-movement" key={payment.id}>
              <span>Pago del {date(payment.paid_on, true)}</span>
              <strong>{money(payment.amount)}</strong>
              <Link href={`/recibos/${payment.id}`} className="text-link">
                REC-{String(payment.receipt).padStart(5, '0')} · {payment.method}
                <ArrowUpRight size={14} />
              </Link>
              <dl>
                <div>
                  <dt>Interés pagado</dt>
                  <dd>{money(payment.interest_paid)}</dd>
                </div>
                <div>
                  <dt>Abono a capital</dt>
                  <dd>{money(payment.principal_paid)}</dd>
                </div>
              </dl>
              <div className="payment-capital-change">
                <span>Capital antes: {money(payment.principal_before)}</span>
                <span>Capital después: {money(payment.principal_after)}</span>
              </div>
            </article>
          );
        })}
      </div>
      {!payments.length && (
        <Empty
          title="Todavía no hay pagos"
          detail="El desembolso y cualquier capitalización se muestran arriba."
        />
      )}
      <div className="payment-history-footer">
        <span>{payments.length} recibos de pago en este préstamo</span>
        <Link href={`/estados/${loan.id}`} className="btn">
          <FileText size={16} />
          Ver estado de cuenta
        </Link>
      </div>
    </>
  );
}

const statusLabels = {
  on_time: 'Dentro del plazo',
  late: 'Pago tardío',
  missed: 'Sin pago',
  grace: 'En período de gracia',
  upcoming: 'Próximo vencimiento',
};

function timing(cycle: BehaviorCycle) {
  if (cycle.status === 'on_time') {
    if (cycle.daysLate === 0) return 'Primer pago recibido en fecha o antes del vencimiento.';
    return `Primer pago recibido ${cycle.daysLate} ${cycle.daysLate === 1 ? 'día' : 'días'} después del vencimiento, dentro de los 3 días de gracia.`;
  }
  if (cycle.status === 'late') {
    return `Primer pago recibido ${cycle.daysLate} días después del vencimiento.`;
  }
  if (cycle.status === 'grace') return 'Todavía está dentro de los 3 días de gracia.';
  if (cycle.status === 'upcoming') return 'Esta fecha aún no ha llegado.';
  return 'No se registró un pago para este vencimiento.';
}

export function LoanBehaviorPanel({ loan, behavior }: { loan: Loan; behavior: LoanBehavior }) {
  const assessed = behavior.onTime + behavior.late + behavior.missed;
  return (
    <section className="panel behavior-panel">
      <PanelHead
        title={`Puntualidad de ${reference(loan)}`}
        subtitle="El recorrido de cada vencimiento y el primer pago recibido para esa fecha."
      />
      <div className="behavior-summary">
        <div>
          <span>Con pago en plazo</span>
          <strong>
            {behavior.onTime} / {assessed}
          </strong>
        </div>
        <div>
          <span>Con pago tardío</span>
          <strong>{behavior.late}</strong>
        </div>
        <div>
          <span>Sin pago</span>
          <strong>{behavior.missed}</strong>
        </div>
        <div>
          <span>Atraso medio de pagos tardíos</span>
          <strong>
            {behavior.averageLateDays === null
              ? '—'
              : `${new Intl.NumberFormat('es-DO', { maximumFractionDigits: 1 }).format(behavior.averageLateDays)} días`}
          </strong>
        </div>
      </div>
      <p className="behavior-method">
        Para medir puntualidad, cada pago se compara con el vencimiento pendiente más reciente.
        Cuenta dentro del plazo hasta 3 días después; desde el cuarto día es tardío. El promedio
        incluye solo vencimientos con pago tardío. Un abono parcial puede dejar interés pendiente:
        las capitalizaciones se muestran por separado. No se aplican recargos por mora.
      </p>
      <div className="behavior-list">
        {behavior.cycles.map((cycle) => (
          <article className="behavior-cycle" key={cycle.id}>
            <div className="behavior-cycle-top">
              <div>
                <span>Vencimiento</span>
                <strong>{date(cycle.dueOn, true)}</strong>
              </div>
              <span className={`behavior-status ${cycle.status}`}>
                {statusLabels[cycle.status]}
              </span>
            </div>
            <p>{timing(cycle)}</p>
            <div className="behavior-cycle-details">
              <span>Interés del período: {money(cycle.interestDue)}</span>
              {cycle.payments.length > 0 && (
                <>
                  <span>Primer pago: {date(cycle.payments[0].paid_on, true)}</span>
                  <span>
                    {cycle.payments.length} {cycle.payments.length === 1 ? 'pago' : 'pagos'} ·{' '}
                    {money(sum(cycle.payments, (payment) => payment.amount))} recibido
                  </span>
                </>
              )}
              {cycle.capitalized > 0 && (
                <span className="behavior-capitalized">
                  {money(cycle.capitalized)} de interés capitalizado
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
