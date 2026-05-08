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
  Pencil,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import type { FormEvent, MouseEvent, ReactNode } from 'react'
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

type PaymentContext = {
  customerId: number
  loanId?: number
  source: 'cliente' | 'prestamo'
}

type PaymentRecord = {
  id: number
  customerId: number
  loanId: number
  date: string
  amount: number
  paymentNumber: number
  frequency: Frequency
  collector: string
  notes: string
  status: 'A tiempo' | 'Tarde' | 'Cerrado'
  lateFeeAmount: number
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

const initialCustomers: Customer[] = [
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
  {
    id: 5,
    name: 'Claudia Rosario',
    phone: '(829) 555-7812',
    address: 'Cristo Rey, Puerto Plata',
    cedula: '037-2048193-5',
    collector: 'Rafael Santos',
    status: 'Activo',
    notes: 'Vende ropa por encargo. Buen flujo semanal.',
    references: 'Lina R. / Boutique Claudia',
  },
  {
    id: 6,
    name: 'Andrés Peralta',
    phone: '(849) 555-6744',
    address: 'San Marcos, Puerto Plata',
    cedula: '037-7742011-9',
    collector: 'Carlos Núñez',
    status: 'Activo',
    notes: 'Cliente con negocio de repuestos. Solicita renovaciones frecuentes.',
    references: 'Nelson P. / Repuestos La 30',
  },
  {
    id: 7,
    name: 'Nathalie Gómez',
    phone: '(809) 555-3380',
    address: 'El Javillar, Puerto Plata',
    cedula: '037-6639104-1',
    collector: 'Rafael Santos',
    status: 'Activo',
    notes: 'Pago diario en ruta de la tarde.',
    references: 'Carolina G. / Estética Nath',
  },
  {
    id: 8,
    name: 'Luis Almanzar',
    phone: '(829) 555-0449',
    address: 'Avenida Colón, Puerto Plata',
    cedula: '037-8812376-0',
    collector: 'Carlos Núñez',
    status: 'Atrasado',
    notes: 'Revisar antes de aprobar renovación.',
    references: 'José A. / Taller Colón',
  },
  {
    id: 9,
    name: 'Estefany Mejía',
    phone: '(849) 555-9027',
    address: 'Urbanización Atlántica, Puerto Plata',
    cedula: '037-5483920-6',
    collector: 'Rafael Santos',
    status: 'Activo',
    notes: 'Cliente nueva, todavía no cumple regla de renovación.',
    references: 'Marta M. / Colmado Atlántico',
  },
  {
    id: 10,
    name: 'Héctor Polanco',
    phone: '(809) 555-1185',
    address: 'La Javilla, Puerto Plata',
    cedula: '037-3382190-4',
    collector: 'Carlos Núñez',
    status: 'Activo',
    notes: 'Pago semanal, seguimiento los sábados.',
    references: 'Ramón P. / Ruta La Javilla',
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
  {
    id: 1204,
    customerId: 5,
    principal: 6000,
    paymentAmount: 175,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 24,
    startDate: '2026-04-09',
    endDate: '2026-05-30',
    collector: 'Rafael Santos',
    lateFee: 4,
    graceDays: 3,
    status: 'Activo',
  },
  {
    id: 1205,
    customerId: 6,
    principal: 10000,
    paymentAmount: 315,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 28,
    startDate: '2026-04-02',
    endDate: '2026-05-23',
    collector: 'Carlos Núñez',
    lateFee: 5,
    graceDays: 3,
    status: 'Activo',
  },
  {
    id: 1206,
    customerId: 7,
    principal: 5000,
    paymentAmount: 145,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 34,
    startDate: '2026-03-24',
    endDate: '2026-05-14',
    collector: 'Rafael Santos',
    lateFee: 4,
    graceDays: 3,
    status: 'Activo',
  },
  {
    id: 1207,
    customerId: 8,
    principal: 7000,
    paymentAmount: 210,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 23,
    startDate: '2026-04-10',
    endDate: '2026-05-31',
    collector: 'Carlos Núñez',
    lateFee: 5,
    graceDays: 2,
    status: 'Atrasado',
  },
  {
    id: 1208,
    customerId: 9,
    principal: 4000,
    paymentAmount: 125,
    frequency: 'Diario',
    payments: 45,
    paidPayments: 14,
    startDate: '2026-04-23',
    endDate: '2026-06-13',
    collector: 'Rafael Santos',
    lateFee: 4,
    graceDays: 3,
    status: 'Activo',
  },
  {
    id: 1209,
    customerId: 10,
    principal: 12000,
    paymentAmount: 1850,
    frequency: 'Semanal',
    payments: 10,
    paidPayments: 6,
    startDate: '2026-03-28',
    endDate: '2026-06-06',
    collector: 'Carlos Núñez',
    lateFee: 3,
    graceDays: 4,
    status: 'Activo',
  },
]

const loanHistory = [
  { customerId: 1, id: 1094, principal: 4000, total: 5200, closed: '2026-03-18', status: 'Pagado' },
  { customerId: 2, id: 1110, principal: 5000, total: 6525, closed: '2026-03-25', status: 'Renovado' },
  { customerId: 3, id: 1088, principal: 5000, total: 6525, closed: '2026-02-28', status: 'Pagado' },
  { customerId: 4, id: 1122, principal: 7000, total: 9100, closed: '2026-04-30', status: 'Pagado' },
  { customerId: 5, id: 1136, principal: 5000, total: 6525, closed: '2026-04-12', status: 'Pagado' },
  { customerId: 6, id: 1144, principal: 8000, total: 10350, closed: '2026-04-18', status: 'Renovado' },
  { customerId: 7, id: 1151, principal: 3500, total: 4550, closed: '2026-03-30', status: 'Pagado' },
  { customerId: 10, id: 1160, principal: 9000, total: 11700, closed: '2026-04-20', status: 'Pagado' },
]

const collectionsTrend = [
  { day: 'Lun', value: 10450 },
  { day: 'Mar', value: 12890 },
  { day: 'Mié', value: 11260 },
  { day: 'Jue', value: 14705 },
  { day: 'Vie', value: 16180 },
  { day: 'Sáb', value: 13500 },
]

const initialPayments: PaymentRecord[] = [
  { id: 1, customerId: 1, loanId: 1201, amount: 145, paymentNumber: 23, frequency: 'Diario', date: '2026-05-08', collector: 'Rafael Santos', notes: 'Cobro regular en ruta.', status: 'A tiempo', lateFeeAmount: 0 },
  { id: 2, customerId: 2, loanId: 1202, amount: 470, paymentNumber: 18, frequency: 'Diario', date: '2026-05-08', collector: 'Rafael Santos', notes: 'Cubrió dos cuotas atrasadas.', status: 'Tarde', lateFeeAmount: 55 },
  { id: 3, customerId: 3, loanId: 1203, amount: 145, paymentNumber: 30, frequency: 'Diario', date: '2026-05-07', collector: 'Carlos Núñez', notes: 'Cliente elegible para renovación.', status: 'A tiempo', lateFeeAmount: 0 },
  { id: 4, customerId: 4, loanId: 1122, amount: 320, paymentNumber: 45, frequency: 'Diario', date: '2026-04-30', collector: 'Carlos Núñez', notes: 'Préstamo cerrado.', status: 'Cerrado', lateFeeAmount: 0 },
  { id: 5, customerId: 5, loanId: 1204, amount: 175, paymentNumber: 24, frequency: 'Diario', date: '2026-05-08', collector: 'Rafael Santos', notes: 'Pago en efectivo.', status: 'A tiempo', lateFeeAmount: 0 },
  { id: 6, customerId: 6, loanId: 1205, amount: 315, paymentNumber: 28, frequency: 'Diario', date: '2026-05-08', collector: 'Carlos Núñez', notes: 'Pago recibido en taller.', status: 'A tiempo', lateFeeAmount: 0 },
  { id: 7, customerId: 7, loanId: 1206, amount: 145, paymentNumber: 34, frequency: 'Diario', date: '2026-05-08', collector: 'Rafael Santos', notes: 'Sin novedad.', status: 'A tiempo', lateFeeAmount: 0 },
  { id: 8, customerId: 8, loanId: 1207, amount: 210, paymentNumber: 23, frequency: 'Diario', date: '2026-05-07', collector: 'Carlos Núñez', notes: 'Pago fuera de fecha.', status: 'Tarde', lateFeeAmount: 42 },
  { id: 9, customerId: 10, loanId: 1209, amount: 1850, paymentNumber: 6, frequency: 'Semanal', date: '2026-05-02', collector: 'Carlos Núñez', notes: 'Pago semanal.', status: 'A tiempo', lateFeeAmount: 0 },
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

function getCustomer(customers: Customer[], id: number) {
  return customers.find((customer) => customer.id === id) ?? null
}

function getRenewalMath(loan: Loan, newPrincipal = loan.principal) {
  const totalExpected = loan.paymentAmount * loan.payments
  const alreadyPaid = loan.paymentAmount * loan.paidPayments
  const payoffBalance = Math.max(0, totalExpected - alreadyPaid)
  const amountToCustomer = Math.max(0, newPrincipal - payoffBalance)

  return {
    totalExpected,
    alreadyPaid,
    payoffBalance,
    newPrincipal,
    amountToCustomer,
  }
}

function getNextId(records: Array<{ id: number }>) {
  return Math.max(0, ...records.map((record) => record.id)) + 1
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function calculateEndDate(startDate: string, payments: number, frequency: Frequency) {
  const date = new Date(`${startDate}T12:00:00`)
  let counted = 0

  while (counted < payments) {
    if (frequency === 'Diario') {
      if (date.getDay() !== 0) {
        counted += 1
      }

      if (counted < payments) {
        date.setDate(date.getDate() + 1)
      }
    } else {
      counted += 1

      if (counted < payments) {
        date.setDate(date.getDate() + (frequency === 'Semanal' ? 7 : 30))
      }
    }
  }

  return formatDateInput(date)
}

function App() {
  const [activeView, setActiveView] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [customerRecords, setCustomerRecords] = useState<Customer[]>(initialCustomers)
  const [loanRecords, setLoanRecords] = useState<Loan[]>(initialLoans)
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(initialPayments)
  const [renewalPreview, setRenewalPreview] = useState<Loan | null>(null)
  const [loanCustomerId, setLoanCustomerId] = useState<number | undefined>()
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null)

  const totals = useMemo(() => {
    const lentOut = loanRecords
      .filter((loan) => loan.status === 'Activo' || loan.status === 'Atrasado')
      .reduce((sum, loan) => sum + loan.principal, 0)
    const expected = loanRecords.reduce((sum, loan) => sum + loan.paymentAmount * loan.payments, 0)
    const collected = loanRecords.reduce((sum, loan) => sum + loan.paymentAmount * loan.paidPayments, 0)
    const collectedToday = paymentRecords
      .filter((payment) => payment.date === formatDateInput(new Date()))
      .reduce((sum, payment) => sum + payment.amount + payment.lateFeeAmount, 0)
    const principalRecovered = Math.min(collected, loanRecords.reduce((sum, loan) => sum + loan.principal, 0))
    const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const grossProfit = Math.max(0, collected - principalRecovered)
    const netProfit = grossProfit - expensesTotal

    return {
      capital: 500000,
      lentOut,
      expected,
      collectedToday,
      principalRecovered,
      grossProfit,
      expensesTotal,
      netProfit,
      investor: netProfit * 0.6,
      partner: netProfit * 0.4,
    }
  }, [loanRecords, paymentRecords])

  const activeLoans = loanRecords.filter((loan) => loan.status === 'Activo' || loan.status === 'Atrasado')
  const eligibleRenewals = loanRecords.filter(
    (loan) =>
      (loan.status === 'Activo' || loan.status === 'Atrasado') &&
      loan.paidPayments >= Math.ceil(loan.payments * 0.5),
  )

  function openLoan(loan: Loan) {
    setSelectedLoan(loan)
    setRenewalPreview(null)
    setActiveView('Préstamos')
  }

  function calculateRenewal(loan: Loan) {
    setRenewalPreview(loan)
  }

  function createLoanFromForm(loan: Loan) {
    setLoanRecords((records) => [...records, loan])
    setSelectedLoan(loan)
    setSelectedCustomer(customerRecords.find((customer) => customer.id === loan.customerId) ?? null)
    setRenewalPreview(null)
    setShowLoanForm(false)
    setLoanCustomerId(undefined)
    setActiveView('Préstamos')
  }

  function confirmRenewal(loan: Loan) {
    const newLoan: Loan = {
      ...loan,
      id: getNextId(loanRecords),
      paidPayments: 0,
      startDate: formatDateInput(new Date()),
      endDate: calculateEndDate(formatDateInput(new Date()), loan.payments, loan.frequency),
      status: 'Activo',
    }
    const renewedLoan = { ...loan, status: 'Renovado' as LoanStatus }

    setLoanRecords((records) => [
      ...records.map((record) => (record.id === loan.id ? renewedLoan : record)),
      newLoan,
    ])
    setSelectedLoan(newLoan)
    setRenewalPreview(null)
    setActiveView('Préstamos')
  }

  function openPaymentContext(context: PaymentContext) {
    setPaymentContext(context)
    setActiveView('Cuotas')
  }

  function registerPayment(payment: PaymentRecord) {
    setPaymentRecords((records) => [payment, ...records])
    setLoanRecords((records) =>
      records.map((loan) => {
        if (loan.id !== payment.loanId) {
          return loan
        }

        const paidPayments = Math.min(loan.payments, Math.max(loan.paidPayments, payment.paymentNumber))
        return {
          ...loan,
          paidPayments,
          status: paidPayments >= loan.payments ? 'Pagado' : loan.status,
        }
      }),
    )
    setSelectedLoan((loan) =>
      loan?.id === payment.loanId
        ? {
            ...loan,
            paidPayments: Math.min(loan.payments, Math.max(loan.paidPayments, payment.paymentNumber)),
            status: Math.min(loan.payments, Math.max(loan.paidPayments, payment.paymentNumber)) >= loan.payments ? 'Pagado' : loan.status,
          }
        : loan,
    )
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
            <button
              className="primary-button"
              onClick={() => {
                setLoanCustomerId(undefined)
                setShowLoanForm(true)
              }}
            >
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
            customers={customerRecords}
            onOpenLoan={openLoan}
          />
        )}
        {activeView === 'Clientes' && (
          <CustomersView
            customers={customerRecords}
            loans={loanRecords}
            payments={paymentRecords}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onCloseCustomer={() => setSelectedCustomer(null)}
            onNewCustomer={() => setShowCustomerForm(true)}
            onNewLoan={(customer) => {
              setLoanCustomerId(customer.id)
              setShowLoanForm(true)
            }}
            onEditCustomer={(customer) => {
              setEditingCustomer(customer)
              setShowCustomerForm(true)
            }}
            onDeleteCustomer={(customer) => {
              setCustomerRecords((records) => records.filter((record) => record.id !== customer.id))
              setLoanRecords((records) => records.filter((loan) => loan.customerId !== customer.id))
              if (selectedCustomer?.id === customer.id) {
                setSelectedCustomer(null)
              }
              if (selectedLoan?.customerId === customer.id) {
                setSelectedLoan(null)
                setRenewalPreview(null)
              }
              if (paymentContext?.customerId === customer.id) {
                setPaymentContext(null)
              }
            }}
            onGoPayments={(context) => openPaymentContext(context)}
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
            onConfirmRenewal={confirmRenewal}
            onNewLoan={() => {
              setLoanCustomerId(undefined)
              setShowLoanForm(true)
            }}
            onPayOffLoan={(loan) => {
              const paidLoan = { ...loan, paidPayments: loan.payments, status: 'Pagado' as LoanStatus }
              setLoanRecords((records) => records.map((record) => (record.id === loan.id ? paidLoan : record)))
              setSelectedLoan(paidLoan)
              setRenewalPreview(null)
            }}
            onOpenCustomer={(customer) => {
              setSelectedCustomer(customer)
              setActiveView('Clientes')
            }}
            onGoPayments={(context) => openPaymentContext(context)}
            loans={loanRecords}
            customers={customerRecords}
          />
        )}
        {activeView === 'Cuotas' && (
          <PaymentsView
            context={paymentContext}
            customer={paymentContext ? getCustomer(customerRecords, paymentContext.customerId) : null}
            loan={paymentContext?.loanId ? loanRecords.find((loan) => loan.id === paymentContext.loanId) ?? null : null}
            customers={customerRecords}
            loans={loanRecords}
            payments={paymentRecords}
            nextId={getNextId(paymentRecords)}
            onRegisterPayment={registerPayment}
          />
        )}
        {activeView === 'Liquidación' && <LiquidationView totals={totals} />}
        {activeView === 'Reportes' && <ReportsView />}
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      {showLoanForm && (
        <LoanForm
          customers={customerRecords}
          defaultCustomerId={loanCustomerId}
          nextId={getNextId(loanRecords)}
          onClose={() => {
            setShowLoanForm(false)
            setLoanCustomerId(undefined)
          }}
          onCreate={createLoanFromForm}
        />
      )}
      {showCustomerForm && (
        <CustomerForm
          initialCustomer={editingCustomer}
          onClose={() => {
            setShowCustomerForm(false)
            setEditingCustomer(null)
          }}
          onCreate={(customer) => {
            setCustomerRecords((records) => [...records, customer])
            setSelectedCustomer(customer)
            setShowCustomerForm(false)
          }}
          onUpdate={(customer) => {
            setCustomerRecords((records) => records.map((record) => (record.id === customer.id ? customer : record)))
            setSelectedCustomer(customer)
            setEditingCustomer(null)
            setShowCustomerForm(false)
          }}
          nextId={getNextId(customerRecords)}
        />
      )}
    </div>
  )
}

function Dashboard({
  totals,
  activeLoans,
  eligibleRenewals,
  customers,
  onOpenLoan,
}: {
  totals: DashboardTotals
  activeLoans: Loan[]
  eligibleRenewals: Loan[]
  customers: Customer[]
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

      <section className="panel renewal-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Renovaciones</p>
            <h2>Clientes elegibles</h2>
          </div>
          <span className="rule-chip">Regla 50% de vida del préstamo</span>
        </div>
        <div className="renewal-grid">
          {eligibleRenewals.map((loan) => {
            const customer = getCustomer(customers, loan.customerId)
            if (!customer) {
              return null
            }
            const progress = Math.round((loan.paidPayments / loan.payments) * 100)
            const renewal = getRenewalMath(loan)

            return (
              <button className="renewal-card" key={loan.id} onClick={() => onOpenLoan(loan)}>
                <div className="renewal-card-top">
                  <div className="avatar">{customer.name.slice(0, 2)}</div>
                  <div>
                    <strong>{customer.name}</strong>
                    <span>Préstamo #{loan.id} · {loan.frequency}</span>
                  </div>
                </div>
                <div className="renewal-progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="renewal-facts">
                  <span>{loan.paidPayments}/{loan.payments} cuotas</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="renewal-money">
                  <span>Pagado: {formatMoney(renewal.alreadyPaid)}</span>
                  <span>Balance a cerrar: {formatMoney(renewal.payoffBalance)}</span>
                </div>
                <div className="receive-box">
                  <span>Recibiría al renovar</span>
                  <strong>{formatMoney(renewal.amountToCustomer)}</strong>
                </div>
              </button>
            )
          })}
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
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Area type="monotone" dataKey="value" stroke="#1d4ed8" fill="url(#collectionGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel profit-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Liquidación</p>
            <h2>Estimado mensual</h2>
          </div>
          <RefreshCcw size={20} />
        </div>
        <div className="profit-stack light">
          <span>Ganancia neta estimada</span>
          <strong>{formatMoney(totals.netProfit)}</strong>
          <div>
            <small>Inversionista 60%: {formatMoney(totals.investor)}</small>
            <small>Socio cobrador 40%: {formatMoney(totals.partner)}</small>
          </div>
        </div>
      </section>
    </section>
  )
}

function CustomersView({
  customers,
  loans,
  payments,
  selectedCustomer,
  onSelectCustomer,
  onCloseCustomer,
  onNewCustomer,
  onNewLoan,
  onEditCustomer,
  onDeleteCustomer,
  onGoPayments,
  onOpenLoan,
}: {
  customers: Customer[]
  loans: Loan[]
  payments: PaymentRecord[]
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer) => void
  onCloseCustomer: () => void
  onNewCustomer: () => void
  onNewLoan: (customer: Customer) => void
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (customer: Customer) => void
  onGoPayments: (context: PaymentContext) => void
  onOpenLoan: (loan: Loan) => void
}) {
  const [openActions, setOpenActions] = useState<number | null>(null)
  const customerLoans = loans.filter(
    (loan) =>
      loan.customerId === selectedCustomer?.id &&
      (loan.status === 'Activo' || loan.status === 'Atrasado'),
  )

  return (
    <section className="customers-layout">
      <div className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cartera</p>
            <h2>Clientes registrados</h2>
          </div>
          <button className="primary-button" onClick={onNewCustomer}>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const customerActiveLoans = loans.filter(
                  (loan) =>
                    loan.customerId === customer.id &&
                    (loan.status === 'Activo' || loan.status === 'Atrasado'),
                )

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
                    <td>{customerActiveLoans.length} activos</td>
                    <td>
                      <QuickActions
                        isOpen={openActions === customer.id}
                        label="Acciones del cliente"
                        onRequestClose={() => setOpenActions(null)}
                        onToggle={(event) => {
                          event.stopPropagation()
                          setOpenActions(openActions === customer.id ? null : customer.id)
                        }}
                        actions={[
                          {
                            label: 'Asignar préstamo',
                            icon: HandCoins,
                            onSelect: () => {
                              onSelectCustomer(customer)
                              onNewLoan(customer)
                              setOpenActions(null)
                            },
                          },
                          {
                            label: 'Editar cliente',
                            icon: Pencil,
                            onSelect: () => {
                              onEditCustomer(customer)
                              setOpenActions(null)
                            },
                          },
                          {
                            label: 'Registrar pago',
                            icon: ReceiptText,
                            onSelect: () => {
                              onGoPayments({ customerId: customer.id, loanId: customerActiveLoans[0]?.id, source: 'cliente' })
                              setOpenActions(null)
                            },
                          },
                          {
                            label: 'Eliminar cliente',
                            icon: Trash2,
                            tone: 'danger',
                            onSelect: () => {
                              onDeleteCustomer(customer)
                              setOpenActions(null)
                            },
                          },
                          ...(customerActiveLoans[0]
                            ? [
                                {
                                  label: 'Abrir préstamo activo',
                                  icon: HandCoins,
                                  onSelect: () => {
                                    onOpenLoan(customerActiveLoans[0])
                                    setOpenActions(null)
                                  },
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
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
                .filter((payment) => payment.customerId === selectedCustomer.id)
                .map((payment) => (
                  <div className="history-row" key={payment.id}>
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
  loans,
  customers,
  selectedLoan,
  renewalPreview,
  onOpenLoan,
  onCloseLoan,
  onRenew,
  onConfirmRenewal,
  onNewLoan,
  onPayOffLoan,
  onOpenCustomer,
  onGoPayments,
}: {
  loans: Loan[]
  customers: Customer[]
  selectedLoan: Loan | null
  renewalPreview: Loan | null
  onOpenLoan: (loan: Loan) => void
  onCloseLoan: () => void
  onRenew: (loan: Loan) => void
  onConfirmRenewal: (loan: Loan) => void
  onNewLoan: () => void
  onPayOffLoan: (loan: Loan) => void
  onOpenCustomer: (customer: Customer) => void
  onGoPayments: (context: PaymentContext) => void
}) {
  const [openActions, setOpenActions] = useState<number | null>(null)

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
              {loans.map((loan) => {
                const customer = getCustomer(customers, loan.customerId)
                if (!customer) {
                  return null
                }

                return (
                  <tr className="interactive-row" key={loan.id} onClick={() => onOpenLoan(loan)}>
                    <td>
                      <div className="table-person">
                        <div className="avatar">{customer.name.slice(0, 2)}</div>
                        <div>
                          <strong>{customer.name}</strong>
                          <span>Préstamo #{loan.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatMoney(loan.principal)}</td>
                    <td>{formatMoney(loan.paymentAmount)} · {loan.frequency}</td>
                    <td>{loan.paidPayments}/{loan.payments}</td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td>
                      <QuickActions
                        isOpen={openActions === loan.id}
                        label="Acciones del préstamo"
                        onRequestClose={() => setOpenActions(null)}
                        onToggle={(event) => {
                          event.stopPropagation()
                          setOpenActions(openActions === loan.id ? null : loan.id)
                        }}
                        actions={[
                          {
                            label: 'Saldar préstamo',
                            icon: CheckCircle2,
                            onSelect: () => {
                              onPayOffLoan(loan)
                              setOpenActions(null)
                            },
                          },
                          {
                            label: 'Renovar préstamo',
                            icon: RefreshCcw,
                            onSelect: () => {
                              onOpenLoan(loan)
                              onRenew(loan)
                              setOpenActions(null)
                            },
                          },
                          {
                            label: 'Registrar pago',
                            icon: ReceiptText,
                            onSelect: () => {
                              onGoPayments({ customerId: customer.id, loanId: loan.id, source: 'prestamo' })
                              setOpenActions(null)
                            },
                          },
                          {
                            label: 'Ver cliente',
                            icon: Users,
                            onSelect: () => {
                              onOpenCustomer(customer)
                              setOpenActions(null)
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLoan && (
        <DetailDrawer onClose={onCloseLoan} label="Cerrar detalle del préstamo">
          <LoanDetail
            loan={selectedLoan}
            customer={getCustomer(customers, selectedLoan.customerId)}
            renewalPreview={renewalPreview}
            onClose={onCloseLoan}
            onRenew={() => onRenew(selectedLoan)}
            onConfirmRenewal={() => onConfirmRenewal(selectedLoan)}
          />
        </DetailDrawer>
      )}
    </section>
  )
}

function QuickActions({
  actions,
  isOpen,
  label,
  onRequestClose,
  onToggle,
}: {
  actions: Array<{ label: string; icon: LucideIcon; onSelect: () => void; tone?: 'danger' }>
  isOpen: boolean
  label: string
  onRequestClose: () => void
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="quick-actions" onClick={(event) => event.stopPropagation()}>
      <button className="icon-button" onClick={onToggle} aria-label={label} aria-expanded={isOpen}>
        <MoreHorizontal size={18} />
      </button>
      {isOpen && (
        <>
          <button className="quick-actions-backdrop" onClick={onRequestClose} aria-label="Cerrar acciones" />
          <div className="quick-menu">
            {actions.map((action) => {
              const Icon = action.icon

              return (
                <button
                  className={action.tone === 'danger' ? 'danger-action' : undefined}
                  key={action.label}
                  onClick={action.onSelect}
                >
                  <Icon size={15} />
                  {action.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
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
  customer,
  renewalPreview,
  onClose,
  onRenew,
  onConfirmRenewal,
}: {
  loan: Loan
  customer: Customer | null
  renewalPreview: Loan | null
  onClose: () => void
  onRenew: () => void
  onConfirmRenewal: () => void
}) {
  const renewal = getRenewalMath(loan)
  const progress = Math.round((loan.paidPayments / loan.payments) * 100)

  return (
    <aside className="detail-sheet loan-detail">
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Préstamo #{loan.id}</p>
          <h2>{customer?.name ?? 'Cliente no disponible'}</h2>
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
        <Info label="Total esperado" value={formatMoney(renewal.totalExpected)} />
        <Info label="Pagado por cliente" value={formatMoney(renewal.alreadyPaid)} />
        <Info label="Balance para cierre" value={formatMoney(renewal.payoffBalance)} />
        <Info label="Inicio" value={loan.startDate} />
        <Info label="Final calculado" value={loan.endDate} />
        <Info label="Mora" value={`${loan.lateFee}% después de ${loan.graceDays} días`} />
        <Info label="Cobrador" value={loan.collector} />
      </div>

      <button className="renew-button" onClick={onRenew}>
        <RefreshCcw size={18} />
        Calcular renovación
      </button>

      {renewalPreview && renewalPreview.id === loan.id && (
        <div className="renewal-box">
          <p className="eyebrow">Cálculo automático</p>
          <h3>Renovación simulada</h3>
          <div className="calc-line"><span>Pagado por cliente</span><strong>{formatMoney(renewal.alreadyPaid)}</strong></div>
          <div className="calc-line"><span>Balance a cerrar</span><strong>{formatMoney(renewal.payoffBalance)}</strong></div>
          <div className="calc-line"><span>Nuevo principal</span><strong>{formatMoney(renewal.newPrincipal)}</strong></div>
          <div className="calc-line strong"><span>Cliente recibe</span><strong>{formatMoney(renewal.amountToCustomer)}</strong></div>
          <div className="calc-line"><span>Nueva cuota</span><strong>{formatMoney(loan.paymentAmount)}</strong></div>
          <div className="calc-line"><span>Nuevo total esperado</span><strong>{formatMoney(renewal.totalExpected)}</strong></div>
          <small>Al confirmar, el préstamo actual quedaría como renovado y se abriría un nuevo ciclo desde el día 1.</small>
          <button className="renew-button compact" onClick={onConfirmRenewal}>
            <CheckCircle2 size={18} />
            Confirmar renovación
          </button>
        </div>
      )}
    </aside>
  )
}

function CustomerForm({
  initialCustomer,
  nextId,
  onClose,
  onCreate,
  onUpdate,
}: {
  initialCustomer: Customer | null
  nextId: number
  onClose: () => void
  onCreate: (customer: Customer) => void
  onUpdate: (customer: Customer) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const customer: Customer = {
      id: initialCustomer?.id ?? nextId,
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      cedula: String(form.get('cedula') || ''),
      collector: String(form.get('collector') || ''),
      status: String(form.get('status') || 'Activo') as CustomerStatus,
      references: String(form.get('references') || ''),
      notes: String(form.get('notes') || ''),
    }

    if (initialCustomer) {
      onUpdate(customer)
    } else {
      onCreate(customer)
    }
  }

  return (
    <div className="modal-layer">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Onboarding</p>
            <h2>{initialCustomer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Nombre completo
            <input name="name" defaultValue={initialCustomer?.name} placeholder="Ej. Laura Méndez" required />
          </label>
          <label>
            Teléfono
            <input name="phone" defaultValue={initialCustomer?.phone} placeholder="(809) 555-0000" required />
          </label>
          <label>
            Cédula / identificación
            <input name="cedula" defaultValue={initialCustomer?.cedula} placeholder="037-0000000-0" />
          </label>
          <label className="wide-span">
            Dirección
            <input
              name="address"
              defaultValue={initialCustomer?.address}
              placeholder="Sector, ciudad o punto de referencia"
              required
            />
          </label>
          <label>
            Cobrador asignado
            <select name="collector" defaultValue={initialCustomer?.collector ?? 'Rafael Santos'}>
              <option>Rafael Santos</option>
              <option>Carlos Núñez</option>
            </select>
          </label>
          <label>
            Estado
            <select name="status" defaultValue={initialCustomer?.status ?? 'Activo'}>
              <option>Activo</option>
              <option>Atrasado</option>
              <option>Pagado</option>
              <option>Inactivo</option>
            </select>
          </label>
          <label className="full-span">
            Referencias
            <textarea
              name="references"
              defaultValue={initialCustomer?.references}
              placeholder="Nombre, teléfono, negocio o relación de la referencia"
            />
          </label>
          <label className="full-span">
            Notas
            <textarea
              name="notes"
              defaultValue={initialCustomer?.notes}
              placeholder="Observaciones del cliente, negocio, ruta o condiciones iniciales"
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            {initialCustomer ? 'Actualizar cliente' : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

function LoanForm({
  customers,
  defaultCustomerId,
  nextId,
  onClose,
  onCreate,
}: {
  customers: Customer[]
  defaultCustomerId?: number
  nextId: number
  onClose: () => void
  onCreate: (loan: Loan) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const startDate = String(form.get('startDate') || formatDateInput(new Date()))
    const frequency = String(form.get('frequency') || 'Diario') as Frequency
    const payments = Number(form.get('payments') || 45)
    const loan: Loan = {
      id: nextId,
      customerId: Number(form.get('customerId') || customers[0]?.id),
      principal: Number(form.get('principal') || 0),
      paymentAmount: Number(form.get('paymentAmount') || 0),
      frequency,
      payments,
      paidPayments: 0,
      startDate,
      endDate: calculateEndDate(startDate, payments, frequency),
      collector: String(form.get('collector') || ''),
      lateFee: Number(form.get('lateFee') || 0),
      graceDays: Number(form.get('graceDays') || 0),
      status: 'Activo',
    }

    onCreate(loan)
  }

  return (
    <div className="modal-layer">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Asignación</p>
            <h2>Nuevo préstamo</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Cliente
            <select name="customerId" defaultValue={defaultCustomerId ?? customers[0]?.id}>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>{customer.name}</option>
              ))}
            </select>
          </label>
          <label>
            Principal
            <input name="principal" defaultValue="5000" />
          </label>
          <label>
            Fecha de inicio
            <input name="startDate" type="date" defaultValue={formatDateInput(new Date())} />
          </label>
          <label>
            Frecuencia
            <select name="frequency" defaultValue="Diario">
              <option>Diario</option>
              <option>Semanal</option>
              <option>Mensual</option>
            </select>
          </label>
          <label>
            Monto de cuota
            <input name="paymentAmount" defaultValue="145" />
          </label>
          <label>
            Número de cuotas
            <input name="payments" defaultValue="45" />
          </label>
          <label>
            Mora %
            <input name="lateFee" defaultValue="4" />
          </label>
          <label>
            Gracia en días
            <input name="graceDays" defaultValue="3" />
          </label>
          <label>
            Cobrador
            <select name="collector" defaultValue="Rafael Santos">
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
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            Guardar préstamo
          </button>
        </div>
      </form>
    </div>
  )
}

function PaymentsView({
  context,
  customer,
  loan,
  customers,
  loans,
  payments,
  nextId,
  onRegisterPayment,
}: {
  context: PaymentContext | null
  customer: Customer | null
  loan: Loan | null
  customers: Customer[]
  loans: Loan[]
  payments: PaymentRecord[]
  nextId: number
  onRegisterPayment: (payment: PaymentRecord) => void
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(Boolean(context))
  const [selectedPaymentLoan, setSelectedPaymentLoan] = useState<Loan | null>(loan)
  const activeLoans = loans.filter((loanRecord) => loanRecord.status === 'Activo' || loanRecord.status === 'Atrasado')
  const collectedToday = payments
    .filter((payment) => payment.date === formatDateInput(new Date()))
    .reduce((sum, payment) => sum + payment.amount + payment.lateFeeAmount, 0)
  const lateFees = payments.reduce((sum, payment) => sum + payment.lateFeeAmount, 0)
  const latePayments = payments.filter((payment) => payment.status === 'Tarde').length

  return (
    <section className="payments-layout">
      <div className="metric-grid compact">
        <Metric icon={ReceiptText} label="Cobrado hoy" value={formatMoney(collectedToday)} />
        <Metric icon={ClipboardList} label="Cuotas registradas" value={payments.length.toString()} />
        <Metric icon={CalendarDays} label="Pagos tarde" value={latePayments.toString()} />
        <Metric icon={Coins} label="Mora cobrada" value={formatMoney(lateFees)} />
      </div>

      {context && customer && (
        <div className="context-strip full-span">
          <div>
            <span>Contexto seleccionado</span>
            <strong>
              {customer.name}
              {loan ? ` · Préstamo #${loan.id}` : ''}
            </strong>
          </div>
          <small>{context.source === 'prestamo' ? 'Acción desde préstamos' : 'Acción desde clientes'}</small>
        </div>
      )}

      <section className="panel table-panel full-span">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cuotas</p>
            <h2>Pagos recientes</h2>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setSelectedPaymentLoan(loan)
              setShowPaymentForm(true)
            }}
          >
            <Plus size={17} />
            Registrar pago
          </button>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Préstamo</th>
                <th>Cuota</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Mora</th>
                <th>Cobrador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const paymentCustomer = getCustomer(customers, payment.customerId)
                const paymentLoan = loans.find((loanRecord) => loanRecord.id === payment.loanId)

                return (
                  <tr key={payment.id}>
                    <td>{paymentCustomer?.name ?? 'Cliente eliminado'}</td>
                    <td>#{payment.loanId}</td>
                    <td>{payment.paymentNumber}/{paymentLoan?.payments ?? '-'}</td>
                    <td>{payment.date}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{formatMoney(payment.lateFeeAmount)}</td>
                    <td>{payment.collector}</td>
                    <td><StatusBadge status={payment.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Pendientes</p>
            <h2>Próximas cuotas</h2>
          </div>
          <CalendarDays size={20} />
        </div>
        <div className="stack-list">
          {activeLoans.slice(0, 6).map((loanRecord) => {
            const loanCustomer = getCustomer(customers, loanRecord.customerId)
            const nextPayment = Math.min(loanRecord.payments, loanRecord.paidPayments + 1)

            return (
              <button
                className="list-row interactive"
                key={loanRecord.id}
                onClick={() => {
                  setSelectedPaymentLoan(loanRecord)
                  setShowPaymentForm(true)
                }}
              >
                <div>
                  <strong>{loanCustomer?.name ?? 'Cliente no disponible'}</strong>
                  <span>Cuota {nextPayment}/{loanRecord.payments} · {formatMoney(loanRecord.paymentAmount)}</span>
                </div>
                <StatusBadge status={loanRecord.status === 'Atrasado' ? 'Tarde' : 'A tiempo'} />
              </button>
            )
          })}
        </div>
      </section>

      {showPaymentForm && (
        <PaymentForm
          context={context}
          customers={customers}
          loans={activeLoans}
          selectedLoan={selectedPaymentLoan}
          nextId={nextId}
          onClose={() => setShowPaymentForm(false)}
          onSubmit={(payment) => {
            onRegisterPayment(payment)
            setShowPaymentForm(false)
          }}
        />
      )}
    </section>
  )
}

function PaymentForm({
  context,
  customers,
  loans,
  selectedLoan,
  nextId,
  onClose,
  onSubmit,
}: {
  context: PaymentContext | null
  customers: Customer[]
  loans: Loan[]
  selectedLoan: Loan | null
  nextId: number
  onClose: () => void
  onSubmit: (payment: PaymentRecord) => void
}) {
  const candidateLoans = context?.customerId
    ? loans.filter((loan) => loan.customerId === context.customerId)
    : loans
  const defaultLoan =
    (selectedLoan && candidateLoans.some((loan) => loan.id === selectedLoan.id) ? selectedLoan : null) ??
    candidateLoans.find((loan) => loan.id === context?.loanId) ??
    candidateLoans[0]
  const defaultCustomer = defaultLoan ? getCustomer(customers, defaultLoan.customerId) : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const loanId = Number(form.get('loanId') || defaultLoan?.id)
    const loan = loans.find((loanRecord) => loanRecord.id === loanId) ?? defaultLoan
    if (!loan) {
      return
    }

    const status = String(form.get('status') || 'A tiempo') as PaymentRecord['status']
    const payment: PaymentRecord = {
      id: nextId,
      customerId: loan.customerId,
      loanId: loan.id,
      date: String(form.get('date') || formatDateInput(new Date())),
      amount: Number(form.get('amount') || loan.paymentAmount),
      paymentNumber: Math.min(loan.payments, Number(form.get('paymentNumber') || loan.paidPayments + 1)),
      frequency: loan.frequency,
      collector: String(form.get('collector') || loan.collector),
      notes: String(form.get('notes') || ''),
      status,
      lateFeeAmount: Number(form.get('lateFeeAmount') || 0),
    }

    onSubmit(payment)
  }

  return (
    <div className="modal-layer">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Registro de cuota</p>
            <h2>Registrar pago</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        {defaultCustomer && defaultLoan && (
          <div className="context-strip">
            <div>
              <span>Aplicando a</span>
              <strong>{defaultCustomer.name} · Préstamo #{defaultLoan.id}</strong>
            </div>
            <small>{defaultLoan.frequency}</small>
          </div>
        )}
        <div className="form-grid">
          <label className="wide-span">
            Préstamo
            <select name="loanId" defaultValue={defaultLoan?.id}>
              {candidateLoans.map((loan) => {
                const customer = getCustomer(customers, loan.customerId)

                return (
                  <option value={loan.id} key={loan.id}>
                    #{loan.id} · {customer?.name ?? 'Cliente no disponible'}
                  </option>
                )
              })}
            </select>
          </label>
          <label>
            Fecha
            <input name="date" type="date" defaultValue={formatDateInput(new Date())} />
          </label>
          <label>
            Monto pagado
            <input name="amount" defaultValue={defaultLoan?.paymentAmount ?? 0} />
          </label>
          <label>
            Número de cuota
            <input name="paymentNumber" defaultValue={defaultLoan ? Math.min(defaultLoan.payments, defaultLoan.paidPayments + 1) : 1} />
          </label>
          <label>
            Estado
            <select name="status" defaultValue={defaultLoan?.status === 'Atrasado' ? 'Tarde' : 'A tiempo'}>
              <option>A tiempo</option>
              <option>Tarde</option>
              <option>Cerrado</option>
            </select>
          </label>
          <label>
            Mora cobrada
            <input name="lateFeeAmount" defaultValue={defaultLoan?.status === 'Atrasado' ? Math.round(defaultLoan.paymentAmount * (defaultLoan.lateFee / 100)) : 0} />
          </label>
          <label>
            Cobrador
            <select name="collector" defaultValue={defaultLoan?.collector ?? 'Rafael Santos'}>
              <option>Rafael Santos</option>
              <option>Carlos Núñez</option>
            </select>
          </label>
          <label className="full-span">
            Notas
            <textarea name="notes" placeholder="Notas del cobro, ruta, promesa de pago o comprobante manual" />
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            Guardar pago
          </button>
        </div>
      </form>
      </div>
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
