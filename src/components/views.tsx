'use client';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  HandCoins,
  Plus,
  Search,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Portfolio,
  Loan,
  Customer,
  compactMoney,
  money,
  date,
  interest,
  nextDate,
  isOpen,
  sum,
  repaid,
  reference,
  daysBetween,
  exportCSV,
  statusLabels,
} from '@/lib/model';
import { Action } from './forms';
import { Avatar, Badge, Empty, Metric, MovementIcon, PageHead, PanelHead } from './ui';
export type ViewProps = { data: Portfolio; onAction: (a: Action) => void };
const monthStart = (today: string) => today.slice(0, 7) + '-01';
const nameOf = (data: Portfolio, l: Loan) =>
  data.customers.find((c) => c.id === l.customer_id)?.full_name || '';
export function Dashboard({ data, onAction }: ViewProps) {
  const open = data.loans.filter(isOpen),
    overdue = open.filter((l) => l.status === 'overdue'),
    near = open.filter((l) => repaid(l) > 75),
    recent = data.payments.slice(0, 4),
    monthly = data.payments.filter((p) => p.paid_on >= monthStart(data.today)),
    soon = open
      .filter((l) => daysBetween(data.today, nextDate(data, l)) <= 7)
      .sort((a, b) => nextDate(data, a).localeCompare(nextDate(data, b))),
    today = open.filter((l) => nextDate(data, l) === data.today);
  const [chartRange, setChartRange] = useState('6');
  const months = Array.from({ length: Number(chartRange) }, (_, i) => {
    const d = new Date(`${data.today.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - Number(chartRange) + 1 + i);
    const key = d.toISOString().slice(0, 7);
    const p = data.payments.filter((p) => p.paid_on.startsWith(key));
    return {
      key,
      label: d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', ''),
      interest: sum(p, (x) => x.interest_paid),
      principal: sum(p, (x) => x.principal_paid),
    };
  });
  const max = Math.max(...months.map((m) => m.interest + m.principal), 1000);
  return (
    <>
      <PageHead
        eyebrow="UNA VISTA CLARA DE TU NEGOCIO"
        title="Tu cartera, al día."
        description="Cada cliente, cada pago y cada oportunidad, en un solo lugar."
      >
        <span className="date-pill">
          <CalendarDays size={16} />
          {date(data.today, true)}
        </span>
        <button className="btn primary" onClick={() => onAction({ type: 'loan' })}>
          <Plus size={17} />
          Nuevo préstamo
        </button>
      </PageHead>
      <div className="metrics">
        <Metric
          accent
          title="Capital pendiente"
          value={money(sum(open, (l) => l.principal))}
          icon={<Wallet size={19} />}
          caption={
            <>
              <span className="metric-tag">CARTERA ACTIVA</span>
              {open.length} préstamos abiertos
            </>
          }
        />
        <Metric
          title="Interés pendiente"
          value={money(sum(open, (l) => interest(data, l)))}
          icon={<HandCoins size={19} />}
          caption={<>Por cobrar en el período actual</>}
        />
        <Metric
          title="Interés cobrado"
          value={money(sum(monthly, (p) => p.interest_paid))}
          icon={<TrendingUp size={19} />}
          caption={
            <>
              <span className="positive-dot" />
              Recibido este mes
            </>
          }
        />
        <Metric
          title="Préstamos activos"
          value={String(open.length).padStart(2, '0')}
          icon={<Users size={19} />}
          caption={
            <>
              <span className="warning-dot" />
              {overdue.length} vencidos requieren atención
            </>
          }
        />
      </div>
      <div className="dashboard-main">
        <section className="panel cash-panel">
          <div className="panel-head">
            <div>
              <h2>Así se mueve tu cartera</h2>
              <p>Dinero recibido, separado con claridad.</p>
            </div>
            <select
              className="small-select"
              aria-label="Período del gráfico"
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
            >
              <option value="6">Últimos 6 meses</option>
              <option value="3">Últimos 3 meses</option>
            </select>
          </div>
          <div className="chart-summary">
            <strong>{compactMoney(sum(months, (m) => m.interest + m.principal))}</strong>
            <span>total cobrado en el período</span>
            <div className="chart-legend">
              <span>
                <i />
                Capital
              </span>
              <span>
                <i />
                Interés
              </span>
            </div>
          </div>
          <div className="chart">
            <div className="chart-labels">
              {[1, 0.75, 0.5, 0.25, 0].map((n) => (
                <span key={n}>{Math.round((max * n) / 1000)} mil</span>
              ))}
            </div>
            <div className="chart-plot">
              <div className="grid-lines">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} />
                ))}
              </div>
              <div className="chart-bars">
                {months.map((m) => (
                  <div className="chart-column" key={m.key}>
                    <div
                      className={`bar-stack ${m.key === data.today.slice(0, 7) ? 'current' : ''}`}
                      style={{ height: `${((m.interest + m.principal) / max) * 100}%` }}
                      title={`${m.label}: capital ${money(m.principal)}, interés ${money(m.interest)}`}
                    >
                      <div className="bar-interest" style={{ flex: m.interest || 0.0001 }} />
                      <div className="bar-principal" style={{ flex: m.principal || 0.0001 }} />
                    </div>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-foot">
            <span>
              <ShieldMini />
              Solo pagos recibidos; no incluye interés capitalizado.
            </span>
            <Link href="/reportes">
              Ver reporte <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="panel next-payments">
          <PanelHead
            title="Próximos pagos"
            subtitle="Un paso adelante en tus cobros."
            href="/prestamos"
          />
          <div className="due-summary">
            <span className="calendar-icon">
              <CalendarDays size={19} />
            </span>
            <div>
              <strong>
                {today.length} {today.length === 1 ? 'pago para hoy' : 'pagos para hoy'}
              </strong>
              <span>{compactMoney(sum(today, (l) => interest(data, l)))} en interés pendiente</span>
            </div>
          </div>
          <div className="due-list">
            {soon.slice(0, 4).map((l, i) => {
              const d = nextDate(data, l);
              return (
                <Link
                  href={`/clientes/${l.customer_id}?prestamo=${l.id}`}
                  className="due-item"
                  key={l.id}
                >
                  <span className={`day-box ${i === 0 ? 'featured' : ''}`}>
                    <strong>{new Date(d + 'T12:00:00').getDate()}</strong>
                    <small>
                      {new Date(d + 'T12:00:00').toLocaleDateString('es-DO', { month: 'short' })}
                    </small>
                  </span>
                  <div>
                    <strong>{nameOf(data, l).split(' ').slice(0, 2).join(' ')}</strong>
                    <small>
                      {reference(l)} · {l.rate}% quincenal
                    </small>
                  </div>
                  <span className="due-amount">
                    {compactMoney(interest(data, l))}
                    <small>Interés pendiente</small>
                  </span>
                </Link>
              );
            })}
            {!soon.length && (
              <Empty
                title="Sin pagos próximos"
                detail="No hay vencimientos en los siguientes 7 días."
              />
            )}
          </div>
          <Link href="/prestamos" className="panel-bottom-link">
            Consultar calendario de pagos <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      {overdue.length > 0 && (
        <Link href="/cobros" className="attention-strip">
          <span className="attention-icon">
            <TriangleAlert size={19} />
          </span>
          <div>
            <strong>{overdue.length} préstamos necesitan tu atención</strong>
            <span>
              Da seguimiento a los pagos vencidos y mantén la comunicación con tus clientes.
            </span>
          </div>
          <span className="attention-action">
            Gestionar cobros <ArrowRight size={16} />
          </span>
        </Link>
      )}
      <section className="panel portfolio-panel">
        <PanelHead
          title="Tu cartera de préstamos"
          subtitle="Los números importantes, sin perder el detalle."
          href="/prestamos"
          action="Ver cartera completa"
        />
        <LoanTable data={data} loans={open.slice(0, 5)} compact />
        <div className="table-bottom">
          <span>
            {data.customers.filter((c) => !c.archived).length} clientes · {open.length} préstamos
            abiertos
          </span>
          <span className="mini-legend">
            <i /> Actualizado con tus registros
          </span>
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <PanelHead title="Últimos pagos recibidos" href="/pagos" />
          {recent.map((p) => {
            const l = data.loans.find((l) => l.id === p.loan_id)!;
            return (
              <Link href={`/recibos/${p.id}`} className="recent-payment" key={p.id}>
                <MovementIcon />
                <div>
                  <strong>{nameOf(data, l)}</strong>
                  <small>
                    {date(p.paid_on)} · {p.method}
                  </small>
                </div>
                <div className="align-right">
                  <strong>{money(p.amount)}</strong>
                  <small className="green">Pago registrado</small>
                </div>
                <ChevronRight size={16} />
              </Link>
            );
          })}
          {!recent.length && (
            <Empty title="Aún no hay pagos" detail="Registra tu primer pago para verlo aquí." />
          )}
        </section>
        <section className="panel near-panel">
          <PanelHead
            title="Cada vez más cerca"
            subtitle="Clientes con más del 75% del capital saldado."
          />
          <div className="near-count">
            <span>
              <CheckCheck size={25} />
            </span>
            <strong>{near.length}</strong>
            <div>
              {near.length === 1 ? 'préstamo' : 'préstamos'}
              <small>en la recta final</small>
            </div>
          </div>
          {near.slice(0, 2).map((l) => (
            <Link href={`/clientes/${l.customer_id}`} className="near-loan" key={l.id}>
              <div>
                <strong>{nameOf(data, l)}</strong>
                <span>{repaid(l).toFixed(0)}% saldado</span>
              </div>
              <div className="progress">
                <i style={{ width: `${repaid(l)}%` }} />
              </div>
              <small>{money(l.principal)} de capital por saldar</small>
            </Link>
          ))}
        </section>
      </div>
      <section className="panel recent-events">
        <PanelHead
          title="Últimos vencimientos y capitalizaciones"
          subtitle="Interés no pagado que pasó a formar parte del capital."
        />
        {data.capitalizations.slice(0, 3).map((c) => {
          const l = data.loans.find((l) => l.id === c.loan_id)!;
          return (
            <div className="event-row" key={c.id}>
              <span className="event-marker amber" />
              <div>
                <Link href={`/clientes/${l.customer_id}`}>{nameOf(data, l)}</Link>
                <p>
                  Vencimiento del {date(c.due_on)} · Interés pagado: {money(c.interest_paid)}
                </p>
              </div>
              <span>
                {money(c.amount)}
                <small>Capitalizado el {date(c.occurred_on)}</small>
              </span>
            </div>
          );
        })}
      </section>
    </>
  );
}
function ShieldMini() {
  return <CheckCheck size={13} />;
}
export function LoanTable({
  data,
  loans,
  compact = false,
}: {
  data: Portfolio;
  loans: Loan[];
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Monto prestado</th>
            <th>Capital pendiente</th>
            <th>Interés pendiente</th>
            {!compact && <th>Tasa</th>}
            <th>Próximo pago</th>
            <th>Estado</th>
            {!compact && <th>Garante</th>}
            <th aria-label="Ver detalle" />
          </tr>
        </thead>
        <tbody>
          {loans.map((l, i) => {
            const c = data.customers.find((c) => c.id === l.customer_id)!,
              g = data.cosigners.find((g) => g.customer_id === c.id);
            return (
              <tr key={l.id}>
                <td>
                  <Link className="customer-cell" href={`/clientes/${c.id}?prestamo=${l.id}`}>
                    <Avatar name={c.full_name} index={i} />
                    <span>
                      <strong>{c.full_name}</strong>
                      <small>{c.phone}</small>
                    </span>
                  </Link>
                </td>
                <td>{money(l.original_principal)}</td>
                <td className="strong-number">{money(l.principal)}</td>
                <td>{money(interest(data, l))}</td>
                {!compact && <td>{l.rate}%</td>}
                <td>
                  {isOpen(l) ? (
                    <>
                      <span>{date(nextDate(data, l))}</span>
                      {l.overdue_since && (
                        <small className="red">
                          {daysBetween(l.overdue_since, data.today)} días de atraso
                        </small>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <Badge status={l.status} />
                </td>
                {!compact && <td className="cosigner-name">{g?.full_name}</td>}
                <td>
                  <Link
                    className="row-link"
                    aria-label={`Ver préstamo de ${c.full_name}`}
                    href={`/clientes/${c.id}?prestamo=${l.id}`}
                  >
                    <ChevronRight size={17} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!loans.length && <Empty />}
    </div>
  );
}
function SearchBox({
  value,
  set,
  placeholder = 'Buscar por nombre o teléfono…',
}: {
  value: string;
  set: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );
}
export function Customers({ data, onAction }: ViewProps) {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || ''),
    [archived, setArchived] = useState('active');
  const q = search;
  const rows = data.customers.filter(
    (c) =>
      (archived === 'all' || c.archived === (archived === 'archived')) &&
      `${c.full_name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="RELACIONES QUE CRECEN"
        title="Tus clientes"
        description="Toda la información de tus clientes y sus garantes, en un solo lugar."
      >
        <button className="btn primary" onClick={() => onAction({ type: 'customer' })}>
          <Plus size={17} />
          Nuevo cliente
        </button>
      </PageHead>
      <div className="summary-pills">
        <span>
          <Users size={18} />
          <strong>{data.customers.filter((c) => !c.archived).length}</strong> clientes activos
        </span>
        <span>
          <Wallet size={18} />
          <strong>{data.loans.filter(isOpen).length}</strong> préstamos abiertos
        </span>
        <span>
          <CheckCheck size={18} />
          <strong>{data.loans.filter((l) => l.status === 'paid').length}</strong> préstamos saldados
        </span>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchBox value={search} set={setSearch} />
          <select
            aria-label="Estado del cliente"
            value={archived}
            onChange={(e) => setArchived(e.target.value)}
          >
            <option value="active">Clientes activos</option>
            <option value="archived">Archivados</option>
            <option value="all">Todos los clientes</option>
          </select>
          <span className="results-count">{rows.length} clientes</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Ubicación</th>
                <th>Garante</th>
                <th>Préstamos</th>
                <th>Capital pendiente</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const loans = data.loans.filter((l) => l.customer_id === c.id),
                  open = loans.filter(isOpen),
                  g = data.cosigners.find((g) => g.customer_id === c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link className="customer-cell" href={`/clientes/${c.id}`}>
                        <Avatar name={c.full_name} index={i} />
                        <span>
                          <strong>{c.full_name}</strong>
                          <small>{c.phone}</small>
                        </span>
                      </Link>
                    </td>
                    <td className="address-cell">{c.address}</td>
                    <td>{g?.full_name}</td>
                    <td>
                      {loans.length}
                      <small>{open.length} abiertos</small>
                    </td>
                    <td className="strong-number">{money(sum(open, (l) => l.principal))}</td>
                    <td>
                      {c.archived ? (
                        <span className="badge cancelled">Archivado</span>
                      ) : (
                        <Badge
                          status={
                            open.some((l) => l.status === 'overdue')
                              ? 'overdue'
                              : open.length
                                ? 'active'
                                : 'paid'
                          }
                        />
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/clientes/${c.id}`}
                        className="row-link"
                        aria-label={`Ver a ${c.full_name}`}
                      >
                        <ChevronRight size={17} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
        <div className="table-bottom">
          <span>{rows.length} clientes encontrados</span>
          <span>Los datos de demostración son ficticios.</span>
        </div>
      </section>
    </>
  );
}
export function LoanList({ data, onAction }: ViewProps) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [schedule, setSchedule] = useState('all');
  const rows = data.loans.filter(
    (l) =>
      (status === 'all' || l.status === status) &&
      `${nameOf(data, l)} ${reference(l)}`.toLowerCase().includes(search.toLowerCase()) &&
      (schedule === 'all' ||
        (isOpen(l) &&
          (schedule === 'today'
            ? nextDate(data, l) === data.today
            : daysBetween(data.today, nextDate(data, l)) <= 7))),
  );
  return (
    <>
      <PageHead
        eyebrow="CADA PRÉSTAMO, EN PERSPECTIVA"
        title="Cartera de préstamos"
        description="Consulta saldos, fechas y el historial completo de tu cartera."
      >
        <button
          className="btn"
          onClick={() =>
            exportCSV(
              'cartera-capital-express.csv',
              [
                'Referencia',
                'Cliente',
                'Monto prestado',
                'Capital pendiente',
                'Interés pendiente',
                'Tasa',
                'Próximo pago',
                'Estado',
              ],
              rows.map((l) => [
                reference(l),
                nameOf(data, l),
                l.original_principal,
                l.principal,
                interest(data, l),
                l.rate,
                nextDate(data, l),
                statusLabels[l.status],
              ]),
            )
          }
        >
          <Download size={16} />
          Exportar
        </button>
        <button className="btn primary" onClick={() => onAction({ type: 'loan' })}>
          <Plus size={17} />
          Nuevo préstamo
        </button>
      </PageHead>
      <section className="panel">
        <div className="tabs">
          {[
            ['all', 'Todos'],
            ['active', 'Al día'],
            ['overdue', 'Vencidos'],
            ['restructured', 'Renegociados'],
            ['paid', 'Saldados'],
          ].map(([v, label]) => (
            <button key={v} onClick={() => setStatus(v)} className={status === v ? 'selected' : ''}>
              {label}
              <span>{data.loans.filter((l) => v === 'all' || l.status === v).length}</span>
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <SearchBox value={search} set={setSearch} placeholder="Buscar cliente o referencia…" />
          <select
            value={schedule}
            aria-label="Filtrar próximos pagos"
            onChange={(e) => setSchedule(e.target.value)}
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Pagos de hoy</option>
            <option value="soon">Próximos 7 días</option>
          </select>
          <span className="results-count">{rows.length} préstamos</span>
        </div>
        <LoanTable data={data} loans={rows} />
      </section>
    </>
  );
}
export function Payments({ data, onAction }: ViewProps) {
  const [search, setSearch] = useState(''),
    [from, setFrom] = useState(monthStart(data.today)),
    [to, setTo] = useState(data.today);
  const rows = data.payments.filter(
    (p) =>
      p.paid_on >= from &&
      p.paid_on <= to &&
      nameOf(
        data,
        data.loans.find((l) => l.id === p.loan_id)!,
      )
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="CADA ABONO HACE LA DIFERENCIA"
        title="Pagos recibidos"
        description="Un registro claro de cada peso cobrado y su aplicación."
      >
        <button className="btn primary" onClick={() => onAction({ type: 'payment' })}>
          <Plus size={17} />
          Registrar pago
        </button>
      </PageHead>
      <div className="metrics three">
        <Metric
          title="Total recibido"
          value={money(sum(rows, (p) => p.amount))}
          icon={<ArrowDownLeft size={19} />}
          caption={`${rows.length} pagos en el período`}
        />
        <Metric
          title="Interés cobrado"
          value={money(sum(rows, (p) => p.interest_paid))}
          icon={<TrendingUp size={19} />}
          caption="Interés efectivamente recibido"
        />
        <Metric
          title="Abono a capital"
          value={money(sum(rows, (p) => p.principal_paid))}
          icon={<Wallet size={19} />}
          caption="Capital recuperado en el período"
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchBox value={search} set={setSearch} />
          <label className="inline-label">
            Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="inline-label">
            Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button
            className="btn"
            onClick={() =>
              exportCSV(
                'pagos-capital-express.csv',
                ['Fecha', 'Recibo', 'Cliente', 'Monto', 'Interés', 'Capital', 'Forma de pago'],
                rows.map((p) => [
                  p.paid_on,
                  p.receipt,
                  nameOf(
                    data,
                    data.loans.find((l) => l.id === p.loan_id)!,
                  ),
                  p.amount,
                  p.interest_paid,
                  p.principal_paid,
                  p.method,
                ]),
              )
            }
          >
            <Download size={16} />
            CSV
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente / recibo</th>
                <th>Fecha</th>
                <th>Pago recibido</th>
                <th>Interés pagado</th>
                <th>Abono a capital</th>
                <th>Forma de pago</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const l = data.loans.find((l) => l.id === p.loan_id)!;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/recibos/${p.id}`}>
                        <strong>{nameOf(data, l)}</strong>
                        <small>
                          REC-{String(p.receipt).padStart(5, '0')} · {reference(l)}
                        </small>
                      </Link>
                    </td>
                    <td>{date(p.paid_on, true)}</td>
                    <td className="strong-number green">{money(p.amount)}</td>
                    <td>{money(p.interest_paid)}</td>
                    <td>{money(p.principal_paid)}</td>
                    <td>{p.method}</td>
                    <td>
                      <Link className="text-link" href={`/recibos/${p.id}`}>
                        Ver recibo <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <Empty
              title="Sin pagos en este período"
              detail="Cambia las fechas o registra un nuevo pago."
            />
          )}
        </div>
      </section>
    </>
  );
}
export function Collections({ data, onAction }: ViewProps) {
  const [bucket, setBucket] = useState('all');
  const overdue = data.loans.filter((l) => l.status === 'overdue'),
    rows = overdue
      .filter((l) => {
        const d = daysBetween(l.overdue_since!, data.today);
        return (
          bucket === 'all' ||
          (bucket === '1' && d <= 15) ||
          (bucket === '2' && d > 15 && d <= 30) ||
          (bucket === '3' && d > 30)
        );
      })
      .sort((a, b) => a.overdue_since!.localeCompare(b.overdue_since!));
  return (
    <>
      <PageHead
        eyebrow="CERCA DE TUS CLIENTES"
        title="Gestión de cobros"
        description="Prioriza los pendientes y da seguimiento a cada conversación."
      >
        <button className="btn primary" onClick={() => onAction({ type: 'note' })}>
          <Plus size={17} />
          Registrar contacto
        </button>
      </PageHead>
      <div className="metrics three">
        <Metric
          title="Préstamos vencidos"
          value={String(overdue.length)}
          icon={<TriangleAlert size={19} />}
          caption="Requieren seguimiento"
        />
        <Metric
          title="Capital en préstamos vencidos"
          value={money(sum(overdue, (l) => l.principal))}
          icon={<Wallet size={19} />}
          caption="Incluye el interés ya capitalizado"
        />
        <Metric
          title="Interés pendiente de cobro"
          value={money(sum(overdue, (l) => interest(data, l)))}
          icon={<Clock3 size={19} />}
          caption="De los préstamos vencidos"
        />
      </div>
      <section className="panel">
        <div className="tabs">
          {[
            ['all', 'Todos los vencidos'],
            ['1', '1–15 días'],
            ['2', '16–30 días'],
            ['3', 'Más de 30 días'],
          ].map(([v, s]) => (
            <button key={v} className={v === bucket ? 'selected' : ''} onClick={() => setBucket(v)}>
              {s}
            </button>
          ))}
        </div>
        <div className="collection-grid">
          {rows.map((l) => {
            const c = data.customers.find((c) => c.id === l.customer_id)!,
              note = data.notes.find((n) => n.customer_id === c.id);
            return (
              <article className="collection-card" key={l.id}>
                <div className="collection-card-head">
                  <Avatar name={c.full_name} />
                  <div>
                    <Link href={`/clientes/${c.id}`}>
                      <strong>{c.full_name}</strong>
                    </Link>
                    <small>{c.phone}</small>
                  </div>
                  <span className="overdue-days">
                    {daysBetween(l.overdue_since!, data.today)} días
                  </span>
                </div>
                <div className="collection-balance">
                  <span>
                    Capital pendiente<strong>{money(l.principal)}</strong>
                  </span>
                  <span>
                    Interés pendiente<strong>{money(interest(data, l))}</strong>
                  </span>
                </div>
                <div className="last-note">
                  <small>ÚLTIMO CONTACTO · {note ? date(note.created_at) : 'SIN REGISTRO'}</small>
                  <p>{note?.note || 'Registra una conversación para empezar el seguimiento.'}</p>
                  {note?.promised_on && (
                    <span>
                      Promesa de pago: {date(note.promised_on)} · {money(note.promised_amount || 0)}
                    </span>
                  )}
                </div>
                <div className="collection-actions">
                  <button
                    className="btn"
                    onClick={() => onAction({ type: 'note', customerId: c.id })}
                  >
                    Registrar contacto
                  </button>
                  <button
                    className="text-link"
                    onClick={() => onAction({ type: 'payment', loanId: l.id })}
                  >
                    Registrar pago <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!rows.length && (
          <Empty title="Sin préstamos en este grupo" detail="Selecciona otro período de atraso." />
        )}
      </section>
    </>
  );
}
export function Reports({ data }: ViewProps) {
  const [from, setFrom] = useState(monthStart(data.today)),
    [to, setTo] = useState(data.today),
    [customer, setCustomer] = useState('all'),
    [status, setStatus] = useState('all'),
    [range, setRange] = useState('month');
  const loans = data.loans.filter(
      (l) =>
        (customer === 'all' || l.customer_id === customer) &&
        (status === 'all' || l.status === status),
    ),
    ids = new Set(loans.map((l) => l.id)),
    inRange = (d: string) => d >= from && d <= to,
    payments = data.payments.filter((p) => ids.has(p.loan_id) && inRange(p.paid_on)),
    caps = data.capitalizations.filter((c) => ids.has(c.loan_id) && inRange(c.occurred_on)),
    disbursed = loans.filter((l) => inRange(l.disbursed_on)),
    open = loans.filter(isOpen),
    total = sum(payments, (p) => p.amount),
    ip = sum(payments, (p) => p.interest_paid),
    pp = sum(payments, (p) => p.principal_paid),
    capitalized = sum(caps, (c) => c.amount);
  function preset(v: string) {
    setRange(v);
    setTo(data.today);
    if (v === 'today') setFrom(data.today);
    if (v === 'month') setFrom(monthStart(data.today));
    if (v === 'week') {
      const d = new Date(data.today + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      setFrom(d.toISOString().slice(0, 10));
    }
  }
  return (
    <>
      <PageHead
        eyebrow="DECISIONES CON RESPALDO"
        title="Reportes de tu negocio"
        description="Distingue lo cobrado, lo prestado y lo que está por recuperar."
      >
        <button
          className="btn"
          onClick={() =>
            exportCSV(
              'reporte-capital-express.csv',
              ['Concepto', 'Monto RD$', 'Desde', 'Hasta'],
              [
                ['Pagos recibidos', total, from, to],
                ['Interés cobrado', ip, from, to],
                ['Capital cobrado', pp, from, to],
                ['Monto desembolsado', sum(disbursed, (l) => l.original_principal), from, to],
                ['Interés capitalizado (no efectivo)', capitalized, from, to],
                ['Capital pendiente actual', sum(open, (l) => l.principal), data.today, data.today],
                [
                  'Interés pendiente actual',
                  sum(open, (l) => interest(data, l)),
                  data.today,
                  data.today,
                ],
                ['Cantidad de pagos', payments.length, from, to],
                ['Períodos con interés sin pagar', caps.length, from, to],
              ],
            )
          }
        >
          <Download size={17} />
          Exportar reporte
        </button>
      </PageHead>
      <section className="panel report-filters">
        <div className="segmented">
          {[
            ['today', 'Hoy'],
            ['week', 'Esta semana'],
            ['month', 'Este mes'],
            ['custom', 'Personalizado'],
          ].map(([v, label]) => (
            <button key={v} className={range === v ? 'selected' : ''} onClick={() => preset(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="report-filter-row">
          <label>
            Desde
            <input
              aria-label="Reporte desde"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setRange('custom');
              }}
            />
          </label>
          <label>
            Hasta
            <input
              aria-label="Reporte hasta"
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                setTo(e.target.value);
                setRange('custom');
              }}
            />
          </label>
          <label>
            Cliente
            <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="all">Todos los clientes</option>
              {data.customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado del préstamo
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([v, label]) => (
                <option value={v} key={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {from > to && (
        <div className="error-box">La fecha inicial debe ser anterior a la fecha final.</div>
      )}
      <div className="metrics">
        <Metric
          accent
          title="Pagos recibidos"
          value={money(total)}
          caption={`${payments.length} pagos registrados`}
          icon={<ArrowDownLeft size={19} />}
        />
        <Metric
          title="Interés cobrado"
          value={money(ip)}
          caption="Efectivo recibido por interés"
          icon={<TrendingUp size={19} />}
        />
        <Metric
          title="Capital recuperado"
          value={money(pp)}
          caption="Abonos al capital de préstamos"
          icon={<Wallet size={19} />}
        />
        <Metric
          title="Dinero prestado"
          value={money(sum(disbursed, (l) => l.original_principal))}
          caption={`${disbursed.length} desembolsos en el período`}
          icon={<ArrowUpRight size={19} />}
        />
      </div>
      <div className="report-grid">
        <section className="panel">
          <PanelHead
            title="Lo que está por recuperar"
            subtitle={`Saldos actuales al ${date(data.today, true)}`}
          />
          <div className="report-lines">
            <div>
              <span>Capital pendiente</span>
              <strong>{money(sum(open, (l) => l.principal))}</strong>
            </div>
            <div>
              <span>Interés pendiente</span>
              <strong>{money(sum(open, (l) => interest(data, l)))}</strong>
            </div>
            <div className="total-line">
              <span>Saldo total pendiente</span>
              <strong>
                {money(sum(open, (l) => sum([l.principal, interest(data, l)], (x) => x)))}
              </strong>
            </div>
          </div>
        </section>
        <section className="panel">
          <PanelHead
            title="Interés capitalizado"
            subtitle="Interés no pagado convertido en capital."
          />
          <div className="capitalized-total">
            {money(capitalized)}
            <span>{caps.length} períodos cerrados con interés sin pagar</span>
          </div>
          <div className="note-banner">
            Este importe no es dinero recibido y no se incluye en el interés cobrado.
          </div>
        </section>
      </div>
      <section className="panel">
        <PanelHead
          title="Antigüedad de la cartera vencida"
          subtitle="Capital pendiente de los préstamos según su primer atraso sin regularizar."
        />
        <div className="aging-grid">
          {[
            { label: '1–15 días', min: 1, max: 15 },
            { label: '16–30 días', min: 16, max: 30 },
            { label: 'Más de 30 días', min: 31, max: Infinity },
          ].map((b) => {
            const list = open.filter(
              (l) =>
                l.status === 'overdue' &&
                l.overdue_since &&
                daysBetween(l.overdue_since, data.today) >= b.min &&
                daysBetween(l.overdue_since, data.today) <= b.max,
            );
            return (
              <div className="aging-card" key={b.label}>
                <span>{b.label}</span>
                <strong>{money(sum(list, (l) => l.principal))}</strong>
                <small>{list.length} préstamos vencidos</small>
                <div className="progress amber">
                  <i style={{ width: `${(list.length / Math.max(open.length, 1)) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <PanelHead
          title="Detalle de movimientos"
          subtitle={`${date(from, true)} — ${date(to, true)}`}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Interés cobrado</th>
                <th>Capital cobrado</th>
                <th>Capitalizado</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...payments.map((p) => ({
                  id: p.id,
                  date: p.paid_on,
                  loan: p.loan_id,
                  type: 'Pago recibido',
                  ip: p.interest_paid,
                  pp: p.principal_paid,
                  cap: 0,
                })),
                ...caps.map((c) => ({
                  id: c.id,
                  date: c.occurred_on,
                  loan: c.loan_id,
                  type: 'Interés capitalizado',
                  ip: 0,
                  pp: 0,
                  cap: c.amount,
                })),
              ]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((r) => (
                  <tr key={r.id}>
                    <td>{date(r.date)}</td>
                    <td>
                      {nameOf(
                        data,
                        data.loans.find((l) => l.id === r.loan)!,
                      )}
                    </td>
                    <td>{r.type}</td>
                    <td>{money(r.ip)}</td>
                    <td>{money(r.pp)}</td>
                    <td>{money(r.cap)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!payments.length && !caps.length && (
            <Empty
              title="Sin movimientos en este período"
              detail="Selecciona otras fechas para consultar la historia."
            />
          )}
        </div>
      </section>
    </>
  );
}
