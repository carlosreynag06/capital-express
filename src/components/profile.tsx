'use client';
import { useState } from 'react';
import Decimal from 'decimal.js';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Download,
  FileText,
  HandCoins,
  History,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  Portfolio,
  Loan,
  money,
  compactMoney,
  date,
  reference,
  repaid,
  interest,
  isOpen,
  sum,
  nextDate,
  nextScheduled,
  statusLabels,
} from '@/lib/model';
import { Avatar, Badge, Brand, Empty, Metric, PageHead, PanelHead } from './ui';
import { ViewProps } from './views';
import { downloadDocument } from '@/lib/documents';
import { loanBehavior } from '@/lib/loan-behavior';
import { LoanBehaviorPanel, PaymentHistory } from './loan-history';
export function CustomerProfile({ data, onAction, id }: ViewProps & { id: string }) {
  const params = useSearchParams(),
    customer = data.customers.find((c) => c.id === id),
    cosigner = data.cosigners.find((c) => c.customer_id === id),
    loans = data.loans.filter((l) => l.customer_id === id),
    [selected, setSelected] = useState(
      params.get('prestamo') || loans.find(isOpen)?.id || loans[0]?.id,
    ),
    [tab, setTab] = useState('summary');
  const loan = loans.find((l) => l.id === selected) || loans[0],
    payments = data.payments.filter((p) => p.loan_id === loan?.id),
    caps = data.capitalizations.filter((c) => c.loan_id === loan?.id),
    restructures = data.restructurings.filter((r) => r.loan_id === loan?.id),
    events = data.events.filter((e) => e.loan_id === loan?.id),
    notes = data.notes.filter((n) => n.customer_id === id);
  if (!customer)
    return (
      <Empty
        title="Cliente no encontrado"
        detail="Regresa a la lista de clientes para continuar."
      />
    );
  const due = loan ? interest(data, loan) : 0;
  const behavior = loan ? loanBehavior(data, loan.id) : null;
  const schedule: string[] = [];
  if (loan) {
    let d = nextDate(data, loan);
    for (let i = 0; i < 6; i++) {
      schedule.push(d);
      d = nextScheduled(d, loan.day_one, loan.day_two);
    }
  }
  const tabs = [
    ['summary', 'Resumen financiero'],
    ['payments', 'Historial de pagos'],
    ['behavior', 'Puntualidad'],
    ['events', 'Movimientos'],
    ['notes', 'Gestión de cobros'],
    ['history', 'Historial de préstamos'],
  ];
  return (
    <>
      <Link className="back-link" href="/clientes">
        <ArrowLeft size={15} />
        Todos los clientes
      </Link>
      <div className="customer-profile-head">
        <Avatar name={customer.full_name} large />
        <div>
          <div className="profile-name">
            <h1>{customer.full_name}</h1>
            {customer.is_demo && <span className="demo-badge">Demostración</span>}
            {customer.archived && <span className="badge cancelled">Archivado</span>}
          </div>
          <p>Cliente de Capital Express · {loans.length} préstamos en su historial</p>
        </div>
        <div className="head-actions">
          <button
            className="btn"
            onClick={() => onAction({ type: 'editCustomer', customerId: id })}
          >
            <Pencil size={15} />
            Editar datos
          </button>
          <button
            className="icon-btn bordered"
            title={customer.archived ? 'Restaurar cliente' : 'Archivar cliente'}
            aria-label={customer.archived ? 'Restaurar cliente' : 'Archivar cliente'}
            onClick={() => onAction({ type: 'archive', customerId: id })}
          >
            <Archive size={17} />
          </button>
        </div>
      </div>
      <div className="contact-grid">
        <section className="panel contact-card">
          <div className="contact-title">
            <span>DATOS DEL CLIENTE</span>
            <span className="tiny-icon">
              <Phone size={15} />
            </span>
          </div>
          <a href={`tel:${customer.phone.replace(/\D/g, '')}`}>
            <Phone size={15} />
            {customer.phone}
          </a>
          <p>
            <MapPin size={15} />
            {customer.address}
          </p>
        </section>
        <section className="panel contact-card">
          <div className="contact-title">
            <span>GARANTE</span>
            <ShieldCheck size={17} />
          </div>
          <strong>{cosigner?.full_name}</strong>
          <div className="guarantor-details">
            <a href={`tel:${cosigner?.phone.replace(/\D/g, '')}`}>
              <Phone size={15} />
              {cosigner?.phone}
            </a>
            <p>
              <MapPin size={15} />
              {cosigner?.address}
            </p>
          </div>
        </section>
      </div>
      <div className="profile-loan-title">
        <div>
          <h2>{loan ? reference(loan) : 'Sin préstamos'}</h2>
          {loan && <Badge status={loan.status} />}
          <select
            aria-label="Seleccionar préstamo del cliente"
            value={selected || ''}
            onChange={(e) => {
              setSelected(e.target.value);
              setTab('summary');
            }}
          >
            {loans.map((l) => (
              <option value={l.id} key={l.id}>
                {reference(l)} · {money(l.original_principal)} · {statusLabels[l.status]}
              </option>
            ))}
          </select>
        </div>
        <div className="head-actions">
          {loan && (
            <button className="btn" onClick={() => setTab('payments')}>
              <History size={16} />
              Ver pagos
            </button>
          )}
          {loan && (
            <Link className="btn" href={`/estados/${loan.id}`}>
              <FileText size={16} />
              Estado de cuenta
            </Link>
          )}
          {loan && isOpen(loan) && (
            <button
              className="btn primary"
              onClick={() => onAction({ type: 'payment', loanId: loan.id })}
            >
              <Plus size={16} />
              Registrar pago
            </button>
          )}
          <button
            className="btn"
            disabled={customer.archived}
            onClick={() => onAction({ type: 'loan', customerId: id })}
          >
            <Plus size={16} />
            Nuevo préstamo
          </button>
        </div>
      </div>
      <div className="profile-tabs tabs">
        {tabs.map(([v, label]) => (
          <button key={v} className={v === tab ? 'selected' : ''} onClick={() => setTab(v)}>
            {label}
            {v === 'payments' && <span>{payments.length}</span>}
            {v === 'notes' && <span>{notes.length}</span>}
          </button>
        ))}
      </div>
      {!loan && tab !== 'notes' && (
        <Empty
          title="El próximo paso: su primer préstamo"
          detail="Crea un préstamo para comenzar el historial financiero."
        />
      )}
      {loan && tab === 'summary' && (
        <>
          <div className="metrics three">
            <Metric
              accent
              title="Capital pendiente"
              value={money(loan.principal)}
              icon={<Wallet size={20} />}
              caption={`De ${money(loan.original_principal)} prestados`}
            />
            <Metric
              title="Interés pendiente"
              value={compactMoney(due)}
              icon={<HandCoins size={20} />}
              caption={`${loan.rate}% por período · Se aplica al capital vigente`}
            />
            <Metric
              title="Saldo total pendiente"
              value={money(sum([loan.principal, due], (x) => x))}
              icon={<FileText size={20} />}
              caption="Capital más interés del período"
            />
          </div>
          <div className="profile-main-grid">
            <section className="panel">
              <PanelHead title="Condiciones del préstamo" />
              <dl className="terms-grid">
                <div>
                  <dt>Monto prestado</dt>
                  <dd>{money(loan.original_principal)}</dd>
                </div>
                <div>
                  <dt>Tasa vigente</dt>
                  <dd>{loan.rate}% por período</dd>
                </div>
                <div>
                  <dt>Fecha de desembolso</dt>
                  <dd>{date(loan.disbursed_on, true)}</dd>
                </div>
                <div>
                  <dt>Inicio del ciclo vigente</dt>
                  <dd>{date(loan.cycle_start, true)}</dd>
                </div>
                <div>
                  <dt>Primer pago original</dt>
                  <dd>{date(loan.first_due, true)}</dd>
                </div>
                <div>
                  <dt>Próximo pago</dt>
                  <dd>{isOpen(loan) ? date(nextDate(data, loan), true) : 'Préstamo cerrado'}</dd>
                </div>
                <div>
                  <dt>Calendario acordado</dt>
                  <dd>
                    Días {loan.day_one} y {loan.day_two}
                  </dd>
                </div>
                <div>
                  <dt>Interés capitalizado acumulado</dt>
                  <dd>{money(sum(caps, (c) => c.amount))}</dd>
                </div>
                <div>
                  <dt>Interés aún sin pagar del período</dt>
                  <dd>{money(due)}</dd>
                </div>
                <div>
                  <dt>Interés cobrado acumulado</dt>
                  <dd>{money(sum(payments, (p) => p.interest_paid))}</dd>
                </div>
              </dl>
              {isOpen(loan) && (
                <div className="panel-action-footer">
                  <span>¿Acordaron otras condiciones?</span>
                  <button
                    className="text-link"
                    onClick={() => onAction({ type: 'restructure', loanId: loan.id })}
                  >
                    <RefreshCw size={15} />
                    Renegociar préstamo
                  </button>
                </div>
              )}
            </section>
            <section className="panel progress-panel">
              <span className="eyebrow">EL CAMINO A LA META</span>
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(#159876 ${repaid(loan) * 3.6}deg,#edf1f4 0deg)`,
                }}
              >
                <div>
                  <strong>
                    {repaid(loan).toFixed(0)}
                    <small>%</small>
                  </strong>
                  <span>del capital saldado</span>
                </div>
              </div>
              <h3>
                {loan.status === 'paid' ? 'Un compromiso cumplido.' : 'Cada abono te acerca.'}
              </h3>
              <p>
                Reducción neta del capital original.
                <br />
                El interés capitalizado puede aumentar el saldo.
              </p>
              <div>
                <span>Total abonado a capital</span>
                <strong>{money(sum(payments, (p) => p.principal_paid))}</strong>
              </div>
            </section>
          </div>
          {isOpen(loan) && (
            <section className="panel">
              <PanelHead
                title="Calendario de próximos pagos"
                subtitle="Interés estimado si el capital no cambia. No incluye futuros intereses sin pagar."
              />
              <div className="schedule-grid">
                {schedule.map((d, i) => (
                  <div className={i === 0 ? 'current' : ''} key={d}>
                    <CalendarDays size={19} />
                    <span>{date(d, true)}</span>
                    <strong>
                      {money(
                        i === 0 && due > 0
                          ? due
                          : new Decimal(loan.principal)
                              .times(loan.rate)
                              .div(100)
                              .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                              .toNumber(),
                      )}
                    </strong>
                    <small>{i === 0 ? 'Próximo interés' : 'Interés estimado'}</small>
                  </div>
                ))}
              </div>
            </section>
          )}
          {restructures.length > 0 && (
            <section className="panel">
              <PanelHead
                title="Acuerdos de renegociación"
                subtitle="Las condiciones anteriores permanecen registradas."
              />
              {restructures.map((r) => (
                <div className="restructure-record" key={r.id}>
                  <strong>{date(r.occurred_on, true)}</strong>
                  <p>{r.note || 'Nuevas condiciones acordadas.'}</p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Condición</th>
                          <th>Antes</th>
                          <th>Después</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Tasa</td>
                          <td>{r.old_terms.rate}%</td>
                          <td>{r.new_terms.rate}%</td>
                        </tr>
                        <tr>
                          <td>Días de pago</td>
                          <td>
                            {r.old_terms.day_one} y {r.old_terms.day_two}
                          </td>
                          <td>
                            {r.new_terms.day_one} y {r.new_terms.day_two}
                          </td>
                        </tr>
                        <tr>
                          <td>Inicio del ciclo</td>
                          <td>{date(r.old_terms.cycle_start, true)}</td>
                          <td>{date(r.new_terms.cycle_start, true)}</td>
                        </tr>
                        <tr>
                          <td>Próximo pago</td>
                          <td>{date(r.old_terms.next_due, true)}</td>
                          <td>{date(r.new_terms.next_due, true)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <small>
                    Al renegociar: {money(r.principal)} de capital y {money(r.interest)} de interés
                    pendiente.
                  </small>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {loan && tab === 'payments' && (
        <section className="panel">
          <PanelHead
            title={`Pagos de ${reference(loan)}`}
            subtitle="Cada pago y cambio de capital de este préstamo, en orden cronológico."
          />
          <PaymentHistory loan={loan} payments={payments} capitalizations={caps} />
        </section>
      )}
      {loan && behavior && tab === 'behavior' && (
        <LoanBehaviorPanel loan={loan} behavior={behavior} />
      )}
      {loan && tab === 'events' && (
        <>
          <section className="panel">
            <PanelHead
              title="La historia de este préstamo"
              subtitle="Cada movimiento conserva su fecha y sus valores originales."
            />
            <div className="timeline">
              {events.map((e) => (
                <div className="timeline-item" key={e.id}>
                  <span className={`event-marker ${e.kind === 'capitalized' ? 'amber' : ''}`} />
                  <div>
                    <span className="event-date">{date(e.occurred_on, true)}</span>
                    <h3>
                      {(
                        {
                          created: 'Préstamo desembolsado',
                          payment: 'Pago recibido',
                          capitalized: 'Interés capitalizado',
                          restructured: 'Préstamo renegociado',
                          paid: 'Préstamo saldado',
                        } as Record<string, string>
                      )[e.kind] || e.kind}
                    </h3>
                    <p>
                      {e.kind === 'created'
                        ? `${money(Number(e.detail.principal))} · Tasa: ${e.detail.rate}%`
                        : e.kind === 'payment'
                          ? `${money(Number(e.detail.amount))} recibido · ${money(Number(e.detail.interest_paid))} de interés · ${money(Number(e.detail.principal_paid))} a capital`
                          : e.kind === 'capitalized'
                            ? `${money(Number(e.detail.amount))} de interés sin pagar añadido al capital. Capital: ${money(Number(e.detail.principal_before))} → ${money(Number(e.detail.principal_after))}`
                            : e.kind === 'restructured'
                              ? `Tasa anterior: ${e.detail.previous_rate}%. Se conserva la historia del acuerdo.`
                              : 'Capital e interés totalmente saldados.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <PanelHead title="Detalle del interés capitalizado" />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Capital anterior</th>
                    <th>Interés original</th>
                    <th>Interés pagado</th>
                    <th>Capitalizado</th>
                    <th>Capital posterior</th>
                    <th>Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {caps.map((c) => (
                    <tr key={c.id}>
                      <td>{date(c.occurred_on)}</td>
                      <td>{money(c.principal_before)}</td>
                      <td>{money(c.interest_due)}</td>
                      <td>{money(c.interest_paid)}</td>
                      <td>{money(c.amount)}</td>
                      <td>{money(c.principal_after)}</td>
                      <td>{c.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!caps.length && (
                <Empty
                  title="Sin intereses capitalizados"
                  detail="Este préstamo no registra capitalizaciones."
                />
              )}
            </div>
          </section>
        </>
      )}
      {tab === 'notes' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Conversaciones y acuerdos</h2>
              <p>Las promesas de pago no modifican el calendario del préstamo.</p>
            </div>
            <button
              className="btn primary"
              onClick={() => onAction({ type: 'note', customerId: id })}
            >
              <Plus size={16} />
              Registrar contacto
            </button>
          </div>
          <div className="notes-list">
            {notes.map((n) => (
              <article className="communication-note" key={n.id}>
                <span className="note-icon">
                  <MessageSquare size={18} />
                </span>
                <div>
                  <div>
                    <strong>{n.contact_type}</strong>
                    <small>
                      {new Date(n.created_at).toLocaleString('es-DO', {
                        timeZone: 'America/Santo_Domingo',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </small>
                  </div>
                  <p>{n.note}</p>
                  {n.promised_on && (
                    <span className="promise">
                      Prometió pagar el {date(n.promised_on, true)}
                      {n.promised_amount ? ` · ${money(n.promised_amount)}` : ''}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!notes.length && (
            <Empty
              title="La conversación empieza aquí"
              detail="Registra llamadas, mensajes y acuerdos con el cliente."
            />
          )}
        </section>
      )}
      {tab === 'history' && (
        <section className="panel">
          <PanelHead
            title="Todos sus préstamos"
            subtitle="Los préstamos saldados siempre permanecen disponibles."
          />
          <div className="loan-history-list">
            {loans.map((l) => (
              <div className="historical-loan" key={l.id}>
                <span className="historical-icon">
                  <History size={23} />
                </span>
                <div>
                  <strong>
                    {reference(l)} · {money(l.original_principal)}
                  </strong>
                  <small>Desembolsado el {date(l.disbursed_on, true)}</small>
                </div>
                <Badge status={l.status} />
                <div className="align-right">
                  <small>Capital pendiente</small>
                  <strong>{money(l.principal)}</strong>
                </div>
                <div className="historical-actions">
                  <button
                    className="btn"
                    onClick={() => {
                      setSelected(l.id);
                      setTab('summary');
                    }}
                  >
                    Ver detalle <ArrowRight size={15} />
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setSelected(l.id);
                      setTab('payments');
                    }}
                  >
                    Ver pagos <ArrowRight size={15} />
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setSelected(l.id);
                      setTab('behavior');
                    }}
                  >
                    Puntualidad <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
export function DocumentView({ data, path }: { data: Portfolio; path: string }) {
  const [downloading, setDownloading] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const receipt = path.startsWith('/recibos/'),
    id = path.split('/')[2],
    payment = receipt ? data.payments.find((p) => p.id === id) : undefined,
    loan = data.loans.find((l) => l.id === (receipt ? payment?.loan_id : id)),
    customer = data.customers.find((c) => c.id === loan?.customer_id);
  if (!loan || !customer || (receipt && !payment))
    return <Empty title="Documento no encontrado" detail="Regresa al historial del cliente." />;
  const payments = data.payments.filter((p) => p.loan_id === loan.id),
    caps = data.capitalizations.filter((c) => c.loan_id === loan.id),
    restructures = data.restructurings.filter((r) => r.loan_id === loan.id);
  const principal = payment?.principal_after ?? loan.principal,
    ip = payment?.interest_remaining ?? interest(data, loan);
  return (
    <div className="document-screen">
      <div className="document-toolbar">
        <Link className="back-link" href={`/clientes/${customer.id}?prestamo=${loan.id}`}>
          <ArrowLeft size={17} />
          Volver al cliente
        </Link>
        <div>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </button>
          <button
            className="btn primary"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              setDocumentError('');
              try {
                await downloadDocument(data, loan, payment);
              } catch {
                setDocumentError(
                  'No se pudo descargar el PDF. Intenta nuevamente o usa la opción Imprimir.',
                );
              } finally {
                setDownloading(false);
              }
            }}
          >
            <Download size={16} />
            {downloading ? 'Preparando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>
      {documentError && (
        <div className="error-box" role="alert">
          {documentError}
        </div>
      )}
      <article className="document">
        <div className="document-header">
          <Brand />
          <div>
            <span>{receipt ? 'RECIBO DE PAGO' : 'ESTADO DE CUENTA'}</span>
            <strong>
              {receipt ? `REC-${String(payment!.receipt).padStart(5, '0')}` : reference(loan)}
            </strong>
            <small>{date(payment?.paid_on || data.today, true)}</small>
          </div>
        </div>
        {customer.is_demo && (
          <div className="document-demo">Documento de demostración · Datos ficticios</div>
        )}
        <div className="document-customer">
          <div>
            <small>CLIENTE</small>
            <h2>{customer.full_name}</h2>
            <p>
              {customer.phone}
              <br />
              {customer.address}
            </p>
          </div>
          <div>
            <small>PRÉSTAMO</small>
            <h3>{reference(loan)}</h3>
            <p>
              {receipt ? `Pago en ${payment!.method.toLowerCase()}` : statusLabels[loan.status]}
              <br />
              Desembolso: {date(loan.disbursed_on, true)}
            </p>
          </div>
        </div>
        {receipt ? (
          <>
            <div className="receipt-total">
              <span>Pago recibido</span>
              <strong>{money(payment!.amount)}</strong>
              <CheckCheck size={35} />
            </div>
            <dl className="receipt-lines">
              <div>
                <dt>Interés pagado</dt>
                <dd>{money(payment!.interest_paid)}</dd>
              </div>
              <div>
                <dt>Abono a capital</dt>
                <dd>{money(payment!.principal_paid)}</dd>
              </div>
              <div>
                <dt>Capital antes del pago</dt>
                <dd>{money(payment!.principal_before)}</dd>
              </div>
              <div>
                <dt>Interés antes del pago</dt>
                <dd>{money(payment!.interest_before)}</dd>
              </div>
              <div>
                <dt>Tasa aplicada al período</dt>
                <dd>{payment!.rate}%</dd>
              </div>
            </dl>
            <h3>Así queda tu préstamo</h3>
            <dl className="receipt-lines">
              <div>
                <dt>Capital pendiente</dt>
                <dd>{money(principal)}</dd>
              </div>
              <div>
                <dt>Interés aún sin pagar</dt>
                <dd>{money(ip)}</dd>
              </div>
              <div>
                <dt>Próximo pago</dt>
                <dd>{principal + ip === 0 ? 'Préstamo saldado' : date(payment!.next_due, true)}</dd>
              </div>
              <div>
                <dt>Interés esperado del próximo período</dt>
                <dd>{money(payment!.next_interest)}</dd>
              </div>
            </dl>
            {payment!.note && <div className="document-note">{payment!.note}</div>}
          </>
        ) : (
          <>
            <dl className="receipt-lines">
              <div>
                <dt>Monto prestado</dt>
                <dd>{money(loan.original_principal)}</dd>
              </div>
              <div>
                <dt>Tasa vigente</dt>
                <dd>{loan.rate}%</dd>
              </div>
              <div>
                <dt>Inicio del ciclo vigente</dt>
                <dd>{date(loan.cycle_start, true)}</dd>
              </div>
              <div>
                <dt>Próximo pago</dt>
                <dd>{isOpen(loan) ? date(nextDate(data, loan), true) : 'Préstamo cerrado'}</dd>
              </div>
              <div>
                <dt>Capital pendiente</dt>
                <dd>{money(principal)}</dd>
              </div>
              <div>
                <dt>Interés pendiente</dt>
                <dd>{money(ip)}</dd>
              </div>
              <div className="total-line">
                <dt>Saldo total</dt>
                <dd>{money(sum([principal, ip], (x) => x))}</dd>
              </div>
            </dl>
            <h3>Pagos recibidos</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Interés</th>
                    <th>Capital</th>
                    <th>Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{date(p.paid_on, true)}</td>
                      <td>{money(p.amount)}</td>
                      <td>{money(p.interest_paid)}</td>
                      <td>{money(p.principal_paid)}</td>
                      <td>{p.rate}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{money(sum(payments, (p) => p.amount))}</td>
                    <td>{money(sum(payments, (p) => p.interest_paid))}</td>
                    <td>{money(sum(payments, (p) => p.principal_paid))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <h3>Vencimientos e interés capitalizado</h3>
            {!caps.length ? (
              <p>Sin capitalizaciones registradas.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Vencimiento</th>
                    <th>Interés debido</th>
                    <th>Interés pagado</th>
                    <th>Capitalizado</th>
                  </tr>
                </thead>
                <tbody>
                  {caps.map((c) => (
                    <tr key={c.id}>
                      <td>{date(c.due_on, true)}</td>
                      <td>{money(c.interest_due)}</td>
                      <td>{money(c.interest_paid)}</td>
                      <td>{money(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <h3>Renegociaciones</h3>
            {!restructures.length ? (
              <p>Sin renegociaciones registradas.</p>
            ) : (
              restructures.map((r) => (
                <div key={r.id} className="document-note">
                  <strong>{date(r.occurred_on, true)}</strong>
                  <p>
                    Tasa: {r.old_terms.rate}% → {r.new_terms.rate}%. Días de pago:{' '}
                    {r.old_terms.day_one}/{r.old_terms.day_two} → {r.new_terms.day_one}/
                    {r.new_terms.day_two}. Próximo pago: {date(r.old_terms.next_due, true)} →{' '}
                    {date(r.new_terms.next_due, true)}.
                  </p>
                  <p>
                    Capital: {money(r.principal)} · Interés pendiente: {money(r.interest)}.
                  </p>
                  <p>{r.note}</p>
                </div>
              ))
            )}
          </>
        )}
        <div className="document-footer">
          <ShieldCheck size={20} />
          <p>
            {receipt
              ? 'Este recibo conserva los valores del momento del pago.'
              : 'Este estado refleja los movimientos registrados hasta la fecha de emisión.'}
            <br />
            Capital Express · Todos los montos en pesos dominicanos (RD$).
          </p>
          <strong>Gracias por tu confianza.</strong>
        </div>
      </article>
    </div>
  );
}
