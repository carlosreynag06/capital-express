import {
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Download,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import './App.css'

type CustomerStatus = 'Activo' | 'Atrasado' | 'Pagado' | 'Inactivo'
type LoanStatus = 'Activo' | 'Atrasado' | 'Renovado' | 'Pagado'
type Frequency = 'Diario' | 'Semanal' | 'Mensual'

type Customer = {
  id: number
  name: string
  phone: string
  address: string
  cedula: string
  collector: string
  status: CustomerStatus
  notes: string
  references: string
}

type Loan = {
  id: number
  customerId: number
  principal: number
  paymentAmount: number
  frequency: Frequency
  payments: number
  paidPayments: number
  startDate: string
  endDate: string
  collector: string
  lateFee: number
  graceDays: number
  status: LoanStatus
}

type DashboardTotals = {
  capital: number
  lentOut: number
  expected: number
  collectedToday: number
  principalRecovered: number
  grossProfit: number
  expensesTotal: number
  netProfit: number
  investor: number
  partner: number
}

const customers: Customer[] = [
  {
    id: 1,
    name: 'Marisol De la Cruz',
    phone: '(809) 555-2104',
    address: 'Los Ciruelos, Puerto Plata',
    cedula: '037-0043921-8',
    collector: 'Rafael Santos',
    status: 'Activo',
    notes: 'Cliente puntual, negocio de comida en casa.',
    references: 'Ana P. / Colmado La Fe',
  },
  {
    id: 2,
    name: 'Joel Martínez',
    phone: '(829) 555-4418',
    address: 'Ensanche Dubocq, Puerto Plata',
    cedula: '037-1129845-2',
    collector: 'Rafael Santos',
    status: 'Atrasado',
    notes: 'Debe regularizar dos cuotas antes del viernes.',
    references: 'Pedro M. / Taller Joel',
  },
  {
    id: 3,
    name: 'Yudelka Peña',
    phone: '(849) 555-3190',
    address: 'Padre Las Casas, Puerto Plata',
    cedula: '037-0938481-7',
    collector: 'Carlos Núñez',
    status: 'Activo',
    notes: 'Interesada en renovación al llegar al pago 30.',
    references: 'Miguel A. / Salón Yudy',
  },
  {
    id: 4,
    name: 'Ramón Batista',
    phone: '(809) 555-9021',
    address: 'Costambar, Puerto Plata',
    cedula: '037-9938214-0',
    collector: 'Carlos Núñez',
    status: 'Pagado',
    notes: 'Historial limpio. Puede aplicar a monto mayor.',
    references: 'Francis B. / Ferretería Norte',
  },
]

const initialLoans: Loan[] = [
  {
    id: 1201,
    customerId: 1,
    principal: 5000,
    paymentAmount: 145,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 23,
    startDate: '2026-04-13',
    endDate: '2026-06-03',
    collector: 'Rafael Santos',
    lateFee: 4,
    graceDays: 3,
    status: 'Activo',
  },
  {
    id: 1202,
    customerId: 2,
    principal: 8000,
    paymentAmount: 235,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 18,
    startDate: '2026-04-07',
    endDate: '2026-05-28',
    collector: 'Rafael Santos',
    lateFee: 5,
    graceDays: 2,
    status: 'Atrasado',
  },
  {
    id: 1203,
    customerId: 3,
    principal: 5000,
    paymentAmount: 145,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 30,
    startDate: '2026-03-31',
    endDate: '2026-05-21',
    collector: 'Carlos Núñez',
    lateFee: 4,
    graceDays: 3,
    status: 'Activo',
  },
]

const loanHistory = [
  { customerId: 1, id: 1094, principal: 4000, total: 5200, closed: '2026-03-18', status: 'Pagado' },
  { customerId: 2, id: 1110, principal: 5000, total: 6525, closed: '2026-03-25', status: 'Renovado' },
  { customerId: 3, id: 1088, principal: 5000, total: 6525, closed: '2026-02-28', status: 'Pagado' },
  { customerId: 4, id: 1122, principal: 7000, total: 9100, closed: '2026-04-30', status: 'Pagado' },
]

const collectionsTrend = [
  { day: 'Lun', value: 10450 },
  { day: 'Mar', value: 12890 },
  { day: 'Mié', value: 11260 },
  { day: 'Jue', value: 14705 },
  { day: 'Vie', value: 16180 },
  { day: 'Sáb', value: 13500 },
]

const payments = [
  { customer: 'Marisol De la Cruz', amount: 145, cuota: '23/45', date: 'Hoy', status: 'A tiempo' },
  { customer: 'Joel Martínez', amount: 470, cuota: '17-18/45', date: 'Hoy', status: 'Tarde' },
  { customer: 'Yudelka Peña', amount: 145, cuota: '30/45', date: 'Ayer', status: 'A tiempo' },
  { customer: 'Ramón Batista', amount: 320, cuota: 'Final', date: '30 Abr', status: 'Cerrado' },
]

const expenses = [
  { type: 'Gasolina motor', amount: 1850, date: '05 May', owner: 'Rafael' },
  { type: 'Papelería', amount: 620, date: '02 May', owner: 'Admin' },
  { type: 'Gestión de cobro', amount: 1400, date: '30 Abr', owner: 'Carlos' },
]

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(value)

function getCustomer(id: number) {
  return customers.find((customer) => customer.id === id) ?? customers[0]
}

function App() {
  const [activeView, setActiveView] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [renewalPreview, setRenewalPreview] = useState<Loan | null>(null)

  const totals = useMemo(() => {
    const lentOut = initialLoans
      .filter((loan) => loan.status === 'Activo' || loan.status === 'Atrasado')
      .reduce((sum, loan) => sum + loan.principal, 0)
    const expected = initialLoans.reduce((sum, loan) => sum + loan.paymentAmount * loan.payments, 0)
    const collected = initialLoans.reduce((sum, loan) => sum + loan.paymentAmount * loan.paidPayments, 0)
    const principalRecovered = Math.min(collected, initialLoans.reduce((sum, loan) => sum + loan.principal, 0))
    const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const grossProfit = Math.max(0, collected - principalRecovered)
    const netProfit = grossProfit - expensesTotal

    return {
      capital: 500000,
      lentOut,
      expected,
      collectedToday: 7600,
      principalRecovered,
      grossProfit,
      expensesTotal,
      netProfit,
      investor: netProfit * 0.6,
      partner: netProfit * 0.4,
    }
  }, [])

  const activeLoans = initialLoans.filter((loan) => loan.status === 'Activo' || loan.status === 'Atrasado')
  const eligibleRenewals = initialLoans.filter((loan) => loan.paidPayments >= 30)

  function openLoan(loan: Loan) {
    setSelectedLoan(loan)
    setRenewalPreview(null)
    setActiveView('Préstamos')
  }

  function calculateRenewal(loan: Loan) {
    setRenewalPreview(loan)
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">CE</div>
          <div>
            <strong>Capital Express</strong>
            <span>Puerto Plata</span>
          </div>
        </div>

        <nav>
          {[
            ['Dashboard', LayoutDashboard],
            ['Clientes', Users],
            ['Préstamos', HandCoins],
            ['Cuotas', ReceiptText],
            ['Liquidación', Coins],
            ['Reportes', FileText],
          ].map(([label, Icon]) => (
            <button
              className={activeView === label ? 'nav-item active' : 'nav-item'}
              key={label as string}
              onClick={() => {
                setActiveView(label as string)
                setMenuOpen(false)
              }}
            >
              <Icon size={18} />
              {label as string}
            </button>
          ))}
        </nav>

        <div className="session-card">
          <ShieldCheck size={18} />
          <div>
            <strong>Administrador</strong>
            <span>Acceso completo</span>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">Sistema de préstamos</p>
            <h1>{activeView}</h1>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Buscar cliente, préstamo o cuota" />
            </div>
            <button className="primary-button" onClick={() => setShowLoanForm(true)}>
              <Plus size={18} />
              Nuevo préstamo
            </button>
          </div>
        </header>

        {activeView === 'Dashboard' && (
          <Dashboard
            totals={totals}
            activeLoans={activeLoans}
            eligibleRenewals={eligibleRenewals}
            onOpenLoan={openLoan}
          />
        )}
        {activeView === 'Clientes' && (
          <CustomersView
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onCloseCustomer={() => setSelectedCustomer(null)}
            onOpenLoan={openLoan}
          />
        )}
        {activeView === 'Préstamos' && (
          <LoansView
            selectedLoan={selectedLoan}
            renewalPreview={renewalPreview}
            onOpenLoan={openLoan}
            onCloseLoan={() => {
              setSelectedLoan(null)
              setRenewalPreview(null)
            }}
            onRenew={calculateRenewal}
            onNewLoan={() => setShowLoanForm(true)}
          />
        )}
        {activeView === 'Cuotas' && <PaymentsView />}
        {activeView === 'Liquidación' && <LiquidationView totals={totals} />}
        {activeView === 'Reportes' && <ReportsView />}
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      {showLoanForm && <LoanForm onClose={() => setShowLoanForm(false)} />}
    </div>
  )
}

function Dashboard({
  totals,
  activeLoans,
  eligibleRenewals,
  onOpenLoan,
}: {
  totals: DashboardTotals
  activeLoans: Loan[]
  eligibleRenewals: Loan[]
  onOpenLoan: (loan: Loan) => void
}) {
  return (
    <section className="content-grid">
      <div className="metric-grid">
        <Metric icon={Banknote} label="Capital disponible" value={formatMoney(totals.capital - totals.lentOut)} />
        <Metric icon={HandCoins} label="Dinero prestado" value={formatMoney(totals.lentOut)} />
        <Metric icon={ClipboardList} label="Préstamos activos" value={activeLoans.length.toString()} />
        <Metric icon={CalendarDays} label="Cobrado hoy" value={formatMoney(totals.collectedToday)} />
      </div>

      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">Resumen de mayo</p>
          <h2>Control claro entre principal, ganancia y gastos.</h2>
          <p>
            La liquidación se calcula para revisión, con confirmación manual el día 30. Nada se distribuye
            automáticamente.
          </p>
        </div>
        <div className="profit-stack">
          <span>Ganancia neta estimada</span>
          <strong>{formatMoney(totals.netProfit)}</strong>
          <div>
            <small>Inversionista 60%: {formatMoney(totals.investor)}</small>
            <small>Socio cobrador 40%: {formatMoney(totals.partner)}</small>
          </div>
        </div>
      </section>

      <section className="panel chart-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cobros esperados</p>
            <h2>Movimiento semanal</h2>
          </div>
          <BarChart3 size={20} />
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={collectionsTrend}>
              <defs>
                <linearGradient id="collectionGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2f5d8c" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2f5d8c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Area type="monotone" dataKey="value" stroke="#2f5d8c" fill="url(#collectionGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Renovaciones</p>
            <h2>Clientes elegibles</h2>
          </div>
          <RefreshCcw size={20} />
        </div>
        <div className="stack-list">
          {eligibleRenewals.map((loan) => (
            <button className="list-row interactive" key={loan.id} onClick={() => onOpenLoan(loan)}>
              <div>
                <strong>{getCustomer(loan.customerId).name}</strong>
                <span>Pago {loan.paidPayments} de {loan.payments}</span>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}

function CustomersView({
  selectedCustomer,
  onSelectCustomer,
  onCloseCustomer,
  onOpenLoan,
}: {
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer) => void
  onCloseCustomer: () => void
  onOpenLoan: (loan: Loan) => void
}) {
  const customerLoans = initialLoans.filter((loan) => loan.customerId === selectedCustomer?.id)

  return (
    <section className="customers-layout">
      <div className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cartera</p>
            <h2>Clientes registrados</h2>
          </div>
          <button className="secondary-button">
            <Plus size={17} />
            Nuevo cliente
          </button>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefono</th>
                <th>Direccion</th>
                <th>Cobrador</th>
                <th>Estado</th>
                <th>Prestamos</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const loans = initialLoans.filter((loan) => loan.customerId === customer.id)

                return (
                  <tr className="interactive-row" key={customer.id} onClick={() => onSelectCustomer(customer)}>
                    <td>
                      <div className="table-person">
                        <div className="avatar">{customer.name.slice(0, 2)}</div>
                        <div>
                          <strong>{customer.name}</strong>
                          <span>{customer.cedula}</span>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{customer.address}</td>
                    <td>{customer.collector}</td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td>{loans.length} activos</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <DetailDrawer onClose={onCloseCustomer} label="Cerrar ficha del cliente">
          <aside className="detail-sheet">
            <div className="sheet-header">
              <div>
                <p className="eyebrow">Ficha del cliente</p>
                <h2>{selectedCustomer.name}</h2>
              </div>
              <button className="icon-button" onClick={onCloseCustomer} aria-label="Cerrar ficha del cliente">
                <X size={17} />
              </button>
            </div>
            <div className="info-grid">
              <Info label="Telefono" value={selectedCustomer.phone} />
              <Info label="Cedula" value={selectedCustomer.cedula} />
              <Info label="Direccion" value={selectedCustomer.address} />
              <Info label="Cobrador" value={selectedCustomer.collector} />
              <Info label="Referencias" value={selectedCustomer.references} />
              <Info label="Notas" value={selectedCustomer.notes} />
            </div>

            <div className="sheet-section">
              <h3>Prestamos activos</h3>
              {customerLoans.map((loan) => (
                <button className="loan-mini" key={loan.id} onClick={() => onOpenLoan(loan)}>
                  <div>
                    <strong>#{loan.id} · {formatMoney(loan.principal)}</strong>
                    <span>{loan.frequency} · {loan.paidPayments}/{loan.payments} cuotas</span>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>

            <div className="sheet-section">
              <h3>Historial reciente</h3>
              {payments
                .filter((payment) => payment.customer === selectedCustomer.name)
                .map((payment) => (
                  <div className="history-row" key={`${payment.customer}-${payment.cuota}`}>
                    <span>{payment.date}</span>
                    <strong>{formatMoney(payment.amount)}</strong>
                    <small>{payment.status}</small>
                  </div>
                ))}
            </div>

            <div className="sheet-section">
              <h3>Historial de prestamos</h3>
              {loanHistory
                .filter((loan) => loan.customerId === selectedCustomer.id)
                .map((loan) => (
                  <div className="history-row" key={loan.id}>
                    <span>#{loan.id} · {loan.closed}</span>
                    <strong>{formatMoney(loan.total)}</strong>
                    <small>{loan.status}</small>
                  </div>
                ))}
            </div>
          </aside>
        </DetailDrawer>
      )}
    </section>
  )
}

function LoansView({
  selectedLoan,
  renewalPreview,
  onOpenLoan,
  onCloseLoan,
  onRenew,
  onNewLoan,
}: {
  selectedLoan: Loan | null
  renewalPreview: Loan | null
  onOpenLoan: (loan: Loan) => void
  onCloseLoan: () => void
  onRenew: (loan: Loan) => void
  onNewLoan: () => void
}) {
  return (
    <section className="loans-layout">
      <div className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Operación</p>
            <h2>Préstamos</h2>
          </div>
          <button className="primary-button" onClick={onNewLoan}>
            <Plus size={17} />
            Asignar préstamo
          </button>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Principal</th>
                <th>Cuota</th>
                <th>Progreso</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initialLoans.map((loan) => (
                <tr className="interactive-row" key={loan.id} onClick={() => onOpenLoan(loan)}>
                  <td>{getCustomer(loan.customerId).name}</td>
                  <td>{formatMoney(loan.principal)}</td>
                  <td>{formatMoney(loan.paymentAmount)} · {loan.frequency}</td>
                  <td>{loan.paidPayments}/{loan.payments}</td>
                  <td><StatusBadge status={loan.status} /></td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenLoan(loan)
                      }}
                      aria-label="Abrir préstamo"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLoan && (
        <DetailDrawer onClose={onCloseLoan} label="Cerrar detalle del préstamo">
          <LoanDetail
            loan={selectedLoan}
            renewalPreview={renewalPreview}
            onClose={onCloseLoan}
            onRenew={() => onRenew(selectedLoan)}
          />
        </DetailDrawer>
      )}
    </section>
  )
}

function DetailDrawer({
  children,
  label,
  onClose,
}: {
  children: ReactNode
  label: string
  onClose: () => void
}) {
  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" onClick={onClose} aria-label={label} />
      {children}
    </div>
  )
}

function LoanDetail({
  loan,
  renewalPreview,
  onClose,
  onRenew,
}: {
  loan: Loan
  renewalPreview: Loan | null
  onClose: () => void
  onRenew: () => void
}) {
  const totalExpected = loan.paymentAmount * loan.payments
  const alreadyPaid = loan.paymentAmount * loan.paidPayments
  const remaining = Math.max(0, totalExpected - alreadyPaid)
  const progress = Math.round((loan.paidPayments / loan.payments) * 100)

  return (
    <aside className="detail-sheet loan-detail">
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Préstamo #{loan.id}</p>
          <h2>{getCustomer(loan.customerId).name}</h2>
        </div>
        <div className="sheet-actions">
          <StatusBadge status={loan.status} />
          <button className="icon-button" onClick={onClose} aria-label="Cerrar detalle del préstamo">
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="progress-block">
        <div>
          <span>Progreso de cuotas</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="info-grid">
        <Info label="Principal original" value={formatMoney(loan.principal)} />
        <Info label="Total esperado" value={formatMoney(totalExpected)} />
        <Info label="Pagado por cliente" value={formatMoney(alreadyPaid)} />
        <Info label="Balance para cierre" value={formatMoney(remaining)} />
        <Info label="Inicio" value={loan.startDate} />
        <Info label="Final calculado" value={loan.endDate} />
        <Info label="Mora" value={`${loan.lateFee}% después de ${loan.graceDays} días`} />
        <Info label="Cobrador" value={loan.collector} />
      </div>

      <button className="renew-button" onClick={onRenew}>
        <RefreshCcw size={18} />
        Renovar Préstamo
      </button>

      {renewalPreview && renewalPreview.id === loan.id && (
        <div className="renewal-box">
          <p className="eyebrow">Cálculo automático</p>
          <h3>Renovación simulada</h3>
          <div className="calc-line"><span>Balance a cerrar</span><strong>{formatMoney(remaining)}</strong></div>
          <div className="calc-line"><span>Nuevo principal</span><strong>{formatMoney(loan.principal)}</strong></div>
          <div className="calc-line"><span>Nueva cuota</span><strong>{formatMoney(loan.paymentAmount)}</strong></div>
          <div className="calc-line"><span>Nuevo total esperado</span><strong>{formatMoney(totalExpected)}</strong></div>
          <small>Al confirmar, el préstamo actual quedaría como renovado y se abriría un nuevo ciclo desde el día 1.</small>
        </div>
      )}
    </aside>
  )
}

function LoanForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-layer">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Asignación</p>
            <h2>Nuevo préstamo</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Cliente
            <select defaultValue={customers[0].id}>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>{customer.name}</option>
              ))}
            </select>
          </label>
          <label>
            Principal
            <input defaultValue="5000" />
          </label>
          <label>
            Fecha de inicio
            <input type="date" defaultValue="2026-05-08" />
          </label>
          <label>
            Frecuencia
            <select defaultValue="Diario">
              <option>Diario</option>
              <option>Semanal</option>
              <option>Mensual</option>
            </select>
          </label>
          <label>
            Monto de cuota
            <input defaultValue="145" />
          </label>
          <label>
            Número de cuotas
            <input defaultValue="45" />
          </label>
          <label>
            Mora %
            <input defaultValue="4" />
          </label>
          <label>
            Gracia en días
            <input defaultValue="3" />
          </label>
          <label>
            Cobrador
            <select defaultValue="Rafael Santos">
              <option>Rafael Santos</option>
              <option>Carlos Núñez</option>
            </select>
          </label>
          <label className="full-span">
            Notas
            <textarea defaultValue="Ruta asignada para cobro diario de lunes a sábado." />
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" onClick={onClose}>
            <CheckCircle2 size={18} />
            Guardar préstamo
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentsView() {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Cuotas</p>
          <h2>Pagos recientes</h2>
        </div>
        <button className="secondary-button">
          <Plus size={17} />
          Registrar pago
        </button>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Cuota</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={`${payment.customer}-${payment.cuota}`}>
                <td>{payment.customer}</td>
                <td>{payment.cuota}</td>
                <td>{payment.date}</td>
                <td>{formatMoney(payment.amount)}</td>
                <td><StatusBadge status={payment.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LiquidationView({ totals }: { totals: DashboardTotals }) {
  return (
    <section className="liquidation-layout">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cierre manual · 30 de mayo</p>
            <h2>Liquidación mensual</h2>
          </div>
          <Coins size={21} />
        </div>
        <div className="liquidation-lines">
          <Calc label="Total cobrado" value={formatMoney(43520)} />
          <Calc label="Principal recuperado" value={formatMoney(totals.principalRecovered)} />
          <Calc label="Ganancia sobre principal" value={formatMoney(totals.grossProfit)} />
          <Calc label="Gastos operativos" value={`-${formatMoney(totals.expensesTotal)}`} />
          <Calc label="Ganancia neta" value={formatMoney(totals.netProfit)} strong />
          <Calc label="Inversionista 60%" value={formatMoney(totals.investor)} />
          <Calc label="Socio cobrador 40%" value={formatMoney(totals.partner)} />
        </div>
        <button className="confirm-button">
          <CheckCircle2 size={18} />
          Revisar y confirmar manualmente
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Gastos</p>
            <h2>Operación del mes</h2>
          </div>
          <ReceiptText size={20} />
        </div>
        <div className="stack-list">
          {expenses.map((expense) => (
            <div className="list-row" key={expense.type}>
              <div>
                <strong>{expense.type}</strong>
                <span>{expense.date} · {expense.owner}</span>
              </div>
              <strong>{formatMoney(expense.amount)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReportsView() {
  const reports = [
    'Reporte de préstamo por cliente',
    'Historial de pagos del cliente',
    'Préstamos activos',
    'Pagos atrasados',
    'Renovaciones y refinanciamientos',
    'Liquidación mensual',
    'Gastos operativos',
    'Distribución de socios',
  ]

  return (
    <section className="reports-grid">
      {reports.map((report) => (
        <button className="report-card" key={report}>
          <FileText size={22} />
          <span>{report}</span>
          <small>Exportar PDF</small>
          <Download size={18} />
        </button>
      ))}
    </section>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  return (
    <article className="metric-card">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Calc({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'calc-line strong' : 'calc-line'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status ${status.toLowerCase().replace(/\s/g, '-')}`}>{status}</span>
}

export default App
