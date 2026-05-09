import {
  Banknote,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Download,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sun,
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import './App.css'

type CustomerStatus = 'Activo' | 'Atrasado' | 'Pagado' | 'Inactivo'
type LoanStatus = 'Activo' | 'Atrasado' | 'Renovado' | 'Pagado'
type Frequency = 'Diario' | 'Semanal' | 'Mensual'

type Customer = {
  id: number
  dbId?: string
  name: string
  phone: string
  address: string
  cedula: string
  collector: string
  collectorDbId?: string
  status: CustomerStatus
  notes: string
  references: string
}

type Collector = {
  id: number
  dbId?: string
  name: string
  phone: string
  address: string
  cedula: string
  notes: string
  active: boolean
}

type Loan = {
  id: number
  dbId?: string
  customerId: number
  customerDbId?: string
  principal: number
  paymentAmount: number
  frequency: Frequency
  payments: number
  paidPayments: number
  paidAmount?: number
  startDate: string
  endDate: string
  collector: string
  collectorDbId?: string
  lateFee: number
  graceDays: number
  notes?: string
  status: LoanStatus
}

type PaymentContext = {
  customerId: number
  loanId?: number
  source: 'cliente' | 'prestamo'
}

type Expense = {
  id: number
  dbId?: string
  type: string
  amount: number
  date: string
  description: string
  owner: string
}

type PaymentRecord = {
  id: number
  dbId?: string
  customerId: number
  customerDbId?: string
  loanId: number
  loanDbId?: string
  date: string
  amount: number
  paymentNumber: number
  frequency: Frequency
  collector: string
  collectorDbId?: string
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
  totalCollected: number
  investor: number
  partner: number
}

type MonthlyLiquidation = {
  month: string
  monthLabel: string
  closeDateLabel: string
  totalCollected: number
  paymentCollected: number
  principalRecovered: number
  profitCollected: number
  lateFeesCollected: number
  expensesTotal: number
  netProfit: number
  distributableProfit: number
  investor: number
  partner: number
  deficit: number
  paymentCount: number
  expenseCount: number
  status: 'Pendiente' | 'Confirmada'
}

type LiquidationRecord = MonthlyLiquidation & {
  dbId?: string
  confirmedAt: string
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(value)

function getMonthKey(date: string) {
  return date.slice(0, 7)
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1, 1, 12)

  return new Intl.DateTimeFormat('es-DO', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getCloseDateLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1, 30, 12)

  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function getWeeklyCollectionTrend(payments: PaymentRecord[]) {
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const today = new Date(`${formatDateInput(new Date())}T12:00:00`)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const key = formatDateInput(date)
    const value = payments
      .filter((payment) => payment.date === key)
      .reduce((sum, payment) => sum + payment.amount + payment.lateFeeAmount, 0)

    return { day: labels[date.getDay()], value }
  })
}

const dbCustomerStatus: Record<string, CustomerStatus> = {
  active: 'Activo',
  late: 'Atrasado',
  paid: 'Pagado',
  defaulted: 'Atrasado',
  inactive: 'Inactivo',
}

const dbLoanStatus: Record<string, LoanStatus> = {
  active: 'Activo',
  paid: 'Pagado',
  renewed: 'Renovado',
  late: 'Atrasado',
  defaulted: 'Atrasado',
  cancelled: 'Pagado',
}

const dbFrequency: Record<string, Frequency> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

const dbPaymentStatus: Record<string, PaymentRecord['status']> = {
  on_time: 'A tiempo',
  late: 'Tarde',
  closed: 'Cerrado',
}

const toDbCustomerStatus: Record<CustomerStatus, string> = {
  Activo: 'active',
  Atrasado: 'late',
  Pagado: 'paid',
  Inactivo: 'inactive',
}

const toDbFrequency: Record<Frequency, string> = {
  Diario: 'daily',
  Semanal: 'weekly',
  Mensual: 'monthly',
}

const toDbPaymentStatus: Record<PaymentRecord['status'], string> = {
  'A tiempo': 'on_time',
  Tarde: 'late',
  Cerrado: 'closed',
}

function parseDisplayNumber(value: string | null | undefined, fallback: number) {
  const match = value?.match(/\d+/g)?.join('')
  return match ? Number(match) : fallback
}

type CollectorLookup = {
  byId: Map<string, string>
  byName: Map<string, string>
  names: string[]
}

type AppData = {
  customers: Customer[]
  loans: Loan[]
  payments: PaymentRecord[]
  expenses: Expense[]
  liquidations: LiquidationRecord[]
  monthlyLiquidation: MonthlyLiquidation
  collectors: CollectorLookup
  collectorRecords: Collector[]
}

type DbRow = Record<string, unknown>

function dbString(row: DbRow, key: string, fallback = '') {
  const value = row[key]
  return typeof value === 'string' ? value : fallback
}

function dbNumber(row: DbRow, key: string, fallback = 0) {
  const value = row[key]
  return typeof value === 'number' || typeof value === 'string' ? Number(value) : fallback
}

function mapLiquidation(row: DbRow): LiquidationRecord {
  const month = dbString(row, 'liquidation_month').slice(0, 7)

  return {
    dbId: dbString(row, 'id'),
    month,
    monthLabel: getMonthLabel(month),
    closeDateLabel: getCloseDateLabel(month),
    totalCollected: dbNumber(row, 'total_collected'),
    paymentCollected: dbNumber(row, 'total_collected') - dbNumber(row, 'late_fees_collected'),
    principalRecovered: dbNumber(row, 'principal_recovered'),
    profitCollected: dbNumber(row, 'profit_collected'),
    lateFeesCollected: dbNumber(row, 'late_fees_collected'),
    expensesTotal: dbNumber(row, 'operating_expenses'),
    netProfit: dbNumber(row, 'net_profit'),
    distributableProfit: Math.max(0, dbNumber(row, 'net_profit')),
    investor: dbNumber(row, 'investor_share'),
    partner: dbNumber(row, 'partner_share'),
    deficit: Math.max(0, -dbNumber(row, 'net_profit')),
    paymentCount: 0,
    expenseCount: 0,
    status: dbString(row, 'status') === 'confirmed' ? 'Confirmada' : 'Pendiente',
    confirmedAt: dbString(row, 'confirmed_at', dbString(row, 'close_date')),
  }
}

function mapMonthlyLiquidation(row: DbRow, month: string): MonthlyLiquidation {
  return {
    month,
    monthLabel: getMonthLabel(month),
    closeDateLabel: getCloseDateLabel(month),
    totalCollected: dbNumber(row, 'total_collected'),
    paymentCollected: dbNumber(row, 'payment_collected'),
    principalRecovered: dbNumber(row, 'principal_recovered'),
    profitCollected: dbNumber(row, 'profit_collected'),
    lateFeesCollected: dbNumber(row, 'late_fees_collected'),
    expensesTotal: dbNumber(row, 'operating_expenses'),
    netProfit: dbNumber(row, 'net_profit'),
    distributableProfit: dbNumber(row, 'distributable_profit'),
    investor: dbNumber(row, 'investor_share'),
    partner: dbNumber(row, 'partner_share'),
    deficit: dbNumber(row, 'deficit'),
    paymentCount: dbNumber(row, 'payment_count'),
    expenseCount: dbNumber(row, 'expense_count'),
    status: dbString(row, 'status') === 'confirmed' ? 'Confirmada' : 'Pendiente',
  }
}

async function loadAppData(month = getMonthKey(formatDateInput(new Date()))): Promise<AppData> {
  const [
    collectorsResult,
    customersResult,
    loansResult,
    paymentsResult,
    expensesResult,
    liquidationsResult,
    monthlyLiquidationResult,
  ] = await Promise.all([
    supabase.from('collectors').select('*').order('full_name'),
    supabase.from('customers').select('*').order('created_at'),
    supabase.from('loans').select('*').order('created_at'),
    supabase.from('payments').select('*').order('payment_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    supabase.from('monthly_liquidations').select('*').order('liquidation_month', { ascending: false }),
    supabase.rpc('calculate_monthly_liquidation', { p_month: `${month}-01` }),
  ])

  const error =
    collectorsResult.error ??
    customersResult.error ??
    loansResult.error ??
    paymentsResult.error ??
    expensesResult.error ??
    liquidationsResult.error ??
    monthlyLiquidationResult.error

  if (error) {
    throw error
  }

  const collectorLookup: CollectorLookup = {
    byId: new Map((collectorsResult.data ?? []).map((collector: DbRow) => [dbString(collector, 'id'), dbString(collector, 'full_name')])),
    byName: new Map((collectorsResult.data ?? []).map((collector: DbRow) => [dbString(collector, 'full_name'), dbString(collector, 'id')])),
    names: (collectorsResult.data ?? []).map((collector: DbRow) => dbString(collector, 'full_name')).filter(Boolean),
  }
  const collectorRecords = (collectorsResult.data ?? []).map((collector: DbRow, index) => ({
    id: index + 1,
    dbId: dbString(collector, 'id'),
    name: dbString(collector, 'full_name'),
    phone: dbString(collector, 'phone'),
    address: dbString(collector, 'address'),
    cedula: dbString(collector, 'identification_number'),
    notes: dbString(collector, 'notes'),
    active: collector.active !== false,
  } satisfies Collector))

  const customerDbToDisplay = new Map<string, number>()
  const customers = (customersResult.data ?? []).map((customer: DbRow, index) => {
    const customerId = dbString(customer, 'id')
    const collectorId = dbString(customer, 'assigned_collector_id')
    const displayId = parseDisplayNumber(dbString(customer, 'identification_number'), index + 1)
    customerDbToDisplay.set(customerId, displayId)

    return {
      id: displayId,
      dbId: customerId,
      name: dbString(customer, 'full_name'),
      phone: dbString(customer, 'phone'),
      address: dbString(customer, 'address'),
      cedula: dbString(customer, 'identification_number'),
      collector: collectorLookup.byId.get(collectorId) ?? 'Sin cobrador',
      collectorDbId: collectorId || undefined,
      status: dbCustomerStatus[dbString(customer, 'status')] ?? 'Activo',
      notes: dbString(customer, 'notes'),
      references: dbString(customer, 'references_text'),
    } satisfies Customer
  })

  const loanDbToDisplay = new Map<string, number>()
  const loans = (loansResult.data ?? []).map((loan: DbRow, index) => {
    const loanId = dbString(loan, 'id')
    const customerId = dbString(loan, 'customer_id')
    const collectorId = dbString(loan, 'collector_id')
    const paymentAmount = dbNumber(loan, 'payment_amount')
    const totalPayments = dbNumber(loan, 'total_payments')
    const paidAmount = dbNumber(loan, 'paid_amount')
    const displayId = parseDisplayNumber(dbString(loan, 'loan_number'), 1200 + index)
    loanDbToDisplay.set(loanId, displayId)

    return {
      id: displayId,
      dbId: loanId,
      customerId: customerDbToDisplay.get(customerId) ?? 0,
      customerDbId: customerId,
      principal: dbNumber(loan, 'principal'),
      paymentAmount,
      frequency: dbFrequency[dbString(loan, 'frequency')] ?? 'Diario',
      payments: totalPayments,
      paidPayments: Math.min(totalPayments, Math.floor(paidAmount / paymentAmount)),
      paidAmount,
      startDate: dbString(loan, 'start_date'),
      endDate: dbString(loan, 'end_date'),
      collector: collectorLookup.byId.get(collectorId) ?? 'Sin cobrador',
      collectorDbId: collectorId || undefined,
      lateFee: dbNumber(loan, 'late_fee_percentage'),
      graceDays: dbNumber(loan, 'grace_days'),
      notes: dbString(loan, 'notes'),
      status: dbLoanStatus[dbString(loan, 'status')] ?? 'Activo',
    } satisfies Loan
  })

  const payments = (paymentsResult.data ?? []).map((payment: DbRow, index) => ({
    id: index + 1,
    dbId: dbString(payment, 'id'),
    customerId: customerDbToDisplay.get(dbString(payment, 'customer_id')) ?? 0,
    customerDbId: dbString(payment, 'customer_id'),
    loanId: loanDbToDisplay.get(dbString(payment, 'loan_id')) ?? 0,
    loanDbId: dbString(payment, 'loan_id'),
    date: dbString(payment, 'payment_date'),
    amount: dbNumber(payment, 'amount'),
    paymentNumber: dbNumber(payment, 'payment_number'),
    frequency: dbFrequency[dbString(payment, 'frequency')] ?? 'Diario',
    collector: collectorLookup.byId.get(dbString(payment, 'collector_id')) ?? 'Sin cobrador',
    collectorDbId: dbString(payment, 'collector_id') || undefined,
    notes: dbString(payment, 'notes'),
    status: dbPaymentStatus[dbString(payment, 'status')] ?? 'A tiempo',
    lateFeeAmount: dbNumber(payment, 'late_fee_amount'),
  } satisfies PaymentRecord))

  const expenses = (expensesResult.data ?? []).map((expense: DbRow, index) => ({
    id: index + 1,
    dbId: dbString(expense, 'id'),
    type: dbString(expense, 'expense_type'),
    amount: dbNumber(expense, 'amount'),
    date: dbString(expense, 'expense_date'),
    description: dbString(expense, 'description'),
    owner: dbString(expense, 'entered_by_name'),
  } satisfies Expense))

  return {
    customers,
    loans,
    payments,
    expenses,
    liquidations: (liquidationsResult.data ?? []).map(mapLiquidation),
    monthlyLiquidation: mapMonthlyLiquidation((monthlyLiquidationResult.data ?? [])[0] ?? {}, month),
    collectors: collectorLookup,
    collectorRecords,
  }
}

function getCustomer(customers: Customer[], id: number) {
  return customers.find((customer) => customer.id === id) ?? null
}

function getRenewalMath(loan: Loan, newPrincipal = loan.principal) {
  const totalExpected = loan.paymentAmount * loan.payments
  const alreadyPaid = getLoanPaidAmount(loan)
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

function getLoanPaidAmount(loan: Loan) {
  return loan.paidAmount ?? loan.paymentAmount * loan.paidPayments
}

function getLoanProgress(loan: Loan) {
  const totalExpected = loan.paymentAmount * loan.payments
  const paidAmount = getLoanPaidAmount(loan)

  return {
    paidAmount,
    paidPayments: Math.min(loan.payments, Math.floor(paidAmount / loan.paymentAmount)),
    totalExpected,
    remaining: Math.max(0, totalExpected - paidAmount),
    percent: totalExpected > 0 ? Math.min(100, Math.round((paidAmount / totalExpected) * 100)) : 0,
  }
}


function calculateMonthlyLiquidation({
  month,
  loans,
  payments,
  expenses,
  confirmed,
}: {
  month: string
  loans: Loan[]
  payments: PaymentRecord[]
  expenses: Expense[]
  confirmed?: LiquidationRecord
}): MonthlyLiquidation {
  const monthlyPayments = payments
    .filter((payment) => getMonthKey(payment.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  const monthlyExpenses = expenses.filter((expense) => getMonthKey(expense.date) === month)
  const paymentCollected = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const lateFeesCollected = monthlyPayments.reduce((sum, payment) => sum + payment.lateFeeAmount, 0)
  const expensesTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const recordedByLoan = new Map<number, number>()
  const monthlyByLoan = new Map<number, PaymentRecord[]>()

  payments.forEach((payment) => {
    recordedByLoan.set(payment.loanId, (recordedByLoan.get(payment.loanId) ?? 0) + payment.amount)
    if (getMonthKey(payment.date) === month) {
      monthlyByLoan.set(payment.loanId, [...(monthlyByLoan.get(payment.loanId) ?? []), payment])
    }
  })

  let principalRecovered = 0
  let profitCollected = 0

  loans.forEach((loan) => {
    const loanPayments = monthlyByLoan.get(loan.id)
    if (!loanPayments?.length) {
      return
    }

    const recordedLoanTotal = recordedByLoan.get(loan.id) ?? 0
    const inferredUnrecordedBefore = Math.max(0, getLoanPaidAmount(loan) - recordedLoanTotal)
    const recordedBeforeMonth = payments
      .filter((payment) => payment.loanId === loan.id && payment.date < `${month}-01`)
      .reduce((sum, payment) => sum + payment.amount, 0)
    let principalCovered = Math.min(loan.principal, inferredUnrecordedBefore + recordedBeforeMonth)

    loanPayments
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .forEach((payment) => {
        const principalPart = Math.min(payment.amount, Math.max(0, loan.principal - principalCovered))
        principalCovered += principalPart
        principalRecovered += principalPart
        profitCollected += Math.max(0, payment.amount - principalPart)
      })
  })

  const netProfit = profitCollected + lateFeesCollected - expensesTotal
  const distributableProfit = Math.max(0, netProfit)

  return {
    month,
    monthLabel: getMonthLabel(month),
    closeDateLabel: getCloseDateLabel(month),
    totalCollected: paymentCollected + lateFeesCollected,
    paymentCollected,
    principalRecovered,
    profitCollected,
    lateFeesCollected,
    expensesTotal,
    netProfit,
    distributableProfit,
    investor: distributableProfit * 0.6,
    partner: distributableProfit * 0.4,
    deficit: Math.max(0, -netProfit),
    paymentCount: monthlyPayments.length,
    expenseCount: monthlyExpenses.length,
    status: confirmed ? 'Confirmada' : 'Pendiente',
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

function getNextDueDate(startDate: string, paidPayments: number, frequency: Frequency): string {
  const date = new Date(`${startDate}T12:00:00`)
  let counted = 0
  const target = paidPayments + 1

  while (counted < target) {
    if (frequency === 'Diario') {
      if (date.getDay() !== 0) counted += 1
      if (counted < target) date.setDate(date.getDate() + 1)
    } else {
      counted += 1
      if (counted < target) date.setDate(date.getDate() + (frequency === 'Semanal' ? 7 : 30))
    }
  }

  return formatDateInput(date)
}

function isLoanOverdue(loan: Loan, today: string): boolean {
  if (loan.status === 'Pagado' || loan.status === 'Renovado') return false
  const progress = getLoanProgress(loan)
  if (progress.paidPayments >= loan.payments) return false

  const nextDueDateStr = getNextDueDate(loan.startDate, progress.paidPayments, loan.frequency)
  const graceEnd = new Date(`${nextDueDateStr}T12:00:00`)
  graceEnd.setDate(graceEnd.getDate() + loan.graceDays)

  return new Date(`${today}T12:00:00`) > graceEnd
}


type ScheduleRow = {
  n: number
  scheduledDate: string
  actualDate: string | null
  amount: number
  mora: number
  balance: number
  status: string
}

function buildSchedule(loan: Loan, payments: PaymentRecord[], today: string): ScheduleRow[] {
  const totalExpected = loan.paymentAmount * loan.payments
  const overdue = isLoanOverdue(loan, today)
  const rows: ScheduleRow[] = []

  for (let n = 1; n <= loan.payments; n++) {
    const scheduledDate = getNextDueDate(loan.startDate, n - 1, loan.frequency)
    const record = payments.find((p) => p.loanId === loan.id && p.paymentNumber === n)
    const balance = Math.max(0, totalExpected - n * loan.paymentAmount)
    let status: string
    let actualDate: string | null = null
    let mora = 0

    if (record) {
      status = record.status
      actualDate = record.date
      mora = record.lateFeeAmount
    } else if (n <= loan.paidPayments) {
      status = 'A tiempo'
    } else if (n === loan.paidPayments + 1) {
      status = overdue ? 'Atrasado' : 'Próxima'
    } else {
      status = 'Pendiente'
    }

    rows.push({ n, scheduledDate, actualDate, amount: loan.paymentAmount, mora, balance, status })
  }

  return rows
}


function App() {
  const [activeView, setActiveView] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showCollectorForm, setShowCollectorForm] = useState(false)
  const [loanRecords, setLoanRecords] = useState<Loan[]>([])
  const [customerRecords, setCustomerRecords] = useState<Customer[]>([])
  const [collectorRecords, setCollectorRecords] = useState<Collector[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [renewalPreview, setRenewalPreview] = useState<Loan | null>(null)
  const [loanCustomerId, setLoanCustomerId] = useState<number | undefined>()
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingCollector, setEditingCollector] = useState<Collector | null>(null)
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null)
  const [expenseRecords, setExpenseRecords] = useState<Expense[]>([])
  const [liquidationRecords, setLiquidationRecords] = useState<LiquidationRecord[]>([])
  const [liquidationMonth] = useState(getMonthKey(formatDateInput(new Date())))
  const [monthlyLiquidation, setMonthlyLiquidation] = useState<MonthlyLiquidation>(() =>
    calculateMonthlyLiquidation({
      month: getMonthKey(formatDateInput(new Date())),
      loans: [],
      payments: [],
      expenses: [],
    }),
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [collectorLookup, setCollectorLookup] = useState<CollectorLookup>({ byId: new Map(), byName: new Map(), names: [] })
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [appError, setAppError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.localStorage.getItem('capital-express-theme') === 'dark' ? 'dark' : 'light',
  )

  const refreshData = useCallback(async (): Promise<AppData | null> => {
    setDataLoading(true)
    setAppError(null)

    try {
      const data = await loadAppData(liquidationMonth)
      setCustomerRecords(data.customers)
      setCollectorRecords(data.collectorRecords)
      setLoanRecords(data.loans)
      setPaymentRecords(data.payments)
      setExpenseRecords(data.expenses)
      setLiquidationRecords(data.liquidations)
      setMonthlyLiquidation(data.monthlyLiquidation)
      setCollectorLookup(data.collectors)
      setSelectedCustomer((customer) => data.customers.find((record) => record.dbId === customer?.dbId) ?? null)
      setSelectedLoan((loan) => data.loans.find((record) => record.dbId === loan?.dbId) ?? null)
      return data
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudieron cargar los datos.')
      return null
    } finally {
      setDataLoading(false)
    }
  }, [liquidationMonth])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setAuthLoading(false)
      if (data.session) {
        void refreshData()
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        void refreshData()
      } else {
        setCustomerRecords([])
        setCollectorRecords([])
        setLoanRecords([])
        setPaymentRecords([])
        setExpenseRecords([])
        setLiquidationRecords([])
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [refreshData])

  useEffect(() => {
    window.localStorage.setItem('capital-express-theme', theme)
  }, [theme])

  const totals = useMemo(() => {
    const lentOut = loanRecords
      .filter((loan) => loan.status === 'Activo' || loan.status === 'Atrasado')
      .reduce((sum, loan) => sum + loan.principal, 0)
    const expected = loanRecords.reduce((sum, loan) => sum + loan.paymentAmount * loan.payments, 0)
    const collected = loanRecords.reduce((sum, loan) => sum + getLoanPaidAmount(loan), 0)
    const lateFeesCollected = paymentRecords.reduce((sum, payment) => sum + payment.lateFeeAmount, 0)
    const collectedToday = paymentRecords
      .filter((payment) => payment.date === formatDateInput(new Date()))
      .reduce((sum, payment) => sum + payment.amount + payment.lateFeeAmount, 0)
    const principalRecovered = loanRecords.reduce((sum, loan) => sum + Math.min(getLoanPaidAmount(loan), loan.principal), 0)
    const expensesTotal = expenseRecords.reduce((sum, expense) => sum + expense.amount, 0)
    const grossProfit = Math.max(0, collected - principalRecovered) + lateFeesCollected
    const netProfit = grossProfit - expensesTotal
    const totalCollected = collected + lateFeesCollected

    return {
      capital: 500000,
      lentOut,
      expected,
      collectedToday,
      principalRecovered,
      grossProfit,
      expensesTotal,
      netProfit,
      totalCollected,
      investor: netProfit * 0.6,
      partner: netProfit * 0.4,
    }
  }, [loanRecords, paymentRecords, expenseRecords])

  const activeLoans = loanRecords.filter((loan) => loan.status === 'Activo' || loan.status === 'Atrasado')
  const eligibleRenewals = loanRecords.filter(
    (loan) =>
      (loan.status === 'Activo' || loan.status === 'Atrasado') &&
      getLoanPaidAmount(loan) >= loan.paymentAmount * loan.payments * 0.5,
  )
  const collectorOptions = collectorLookup.names.length ? collectorLookup.names : ['Rafael Santos', 'Carlos Núñez']

  function openLoan(loan: Loan) {
    setSelectedLoan(loan)
    setRenewalPreview(null)
    setActiveView('Préstamos')
  }

  function calculateRenewal(loan: Loan) {
    setRenewalPreview(loan)
  }

  async function createLoanFromForm(loan: Loan): Promise<boolean> {
    const customer = customerRecords.find((record) => record.id === loan.customerId)
    if (!customer?.dbId) {
      setAppError('Selecciona un cliente válido antes de asignar el préstamo.')
      return false
    }

    setActionPending(true)
    setAppError(null)

    try {
      const { data: createdLoanId, error } = await supabase.rpc('create_loan', {
        p_customer_id: customer.dbId,
        p_principal: loan.principal,
        p_payment_amount: loan.paymentAmount,
        p_frequency: toDbFrequency[loan.frequency],
        p_total_payments: loan.payments,
        p_start_date: loan.startDate,
        p_late_fee_percentage: loan.lateFee,
        p_grace_days: loan.graceDays,
        p_collector_id: collectorLookup.byName.get(loan.collector) ?? loan.collectorDbId ?? customer.collectorDbId ?? null,
        p_notes: loan.notes ?? null,
      })

      if (error) throw error

      const refreshed = await refreshData()
      const refreshedCustomer = refreshed?.customers.find((record) => record.dbId === customer.dbId) ?? customer
      const refreshedLoan = refreshed?.loans.find((record) => record.dbId === createdLoanId) ?? null
      setSelectedCustomer(refreshedCustomer)
      setSelectedLoan(refreshedLoan)
      setRenewalPreview(null)
      setShowLoanForm(false)
      setLoanCustomerId(undefined)
      setActiveView('Préstamos')
      return true
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudo crear el préstamo.')
      return false
    } finally {
      setActionPending(false)
    }
  }

  async function confirmRenewal(loan: Loan): Promise<boolean> {
    if (!loan.dbId) {
      setAppError('No se encontró el préstamo en Supabase.')
      return false
    }

    setActionPending(true)
    setAppError(null)

    try {
      const { data: renewedLoanId, error } = await supabase.rpc('renew_loan', {
        p_original_loan_id: loan.dbId,
        p_new_principal: loan.principal,
        p_start_date: formatDateInput(new Date()),
        p_payment_amount: loan.paymentAmount,
        p_frequency: toDbFrequency[loan.frequency],
        p_total_payments: loan.payments,
        p_late_fee_percentage: loan.lateFee,
        p_grace_days: loan.graceDays,
        p_collector_id: loan.collectorDbId ?? null,
        p_notes: 'Renovación procesada desde Capital Express.',
      })

      if (error) throw error

      const refreshed = await refreshData()
      const refreshedLoan = refreshed?.loans.find((record) => record.dbId === renewedLoanId) ?? null
      const refreshedCustomer = refreshedLoan
        ? refreshed?.customers.find((record) => record.id === refreshedLoan.customerId) ?? null
        : null
      setSelectedLoan(refreshedLoan)
      setSelectedCustomer(refreshedCustomer)
      setRenewalPreview(null)
      setActiveView('Préstamos')
      return true
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudo renovar el préstamo.')
      return false
    } finally {
      setActionPending(false)
    }
  }

  function openPaymentContext(context: PaymentContext) {
    setPaymentContext(context)
    setActiveView('Cuotas')
  }

  async function registerPayment(payment: PaymentRecord): Promise<boolean> {
    const loan = loanRecords.find((record) => record.id === payment.loanId)
    if (!loan?.dbId) {
      setAppError('No se encontró el préstamo en Supabase.')
      return false
    }

    setActionPending(true)
    setAppError(null)

    try {
      const { error } = await supabase.rpc('register_payment', {
        p_loan_id: loan.dbId,
        p_amount: payment.amount,
        p_payment_date: payment.date,
        p_collector_id: collectorLookup.byName.get(payment.collector) ?? payment.collectorDbId ?? loan.collectorDbId ?? null,
        p_late_fee_amount: payment.lateFeeAmount,
        p_notes: payment.notes || null,
        p_status: toDbPaymentStatus[payment.status],
      })

      if (error) throw error

      await refreshData()
      return true
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudo registrar el pago.')
      return false
    } finally {
      setActionPending(false)
    }
  }

  if (authLoading) {
    return <AppState title="Conectando" message="Validando la sesión de Supabase." />
  }

  if (!session) {
    return <LoginScreen />
  }

  if (dataLoading && customerRecords.length === 0) {
    return <AppState title="Cargando datos" message="Sincronizando clientes, préstamos, cuotas y liquidaciones desde Supabase." />
  }

  return (
    <div className={`app-shell ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">CE</div>
          <div>
            <strong>Capital Express</strong>
            <span>Puerto Plata</span>
          </div>
        </div>

        <nav>
          <button
            className={activeView === 'Dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Dashboard'); setMenuOpen(false) }}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <p className="nav-section">Operaciones</p>

          <button
            className={activeView === 'Clientes' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Clientes'); setMenuOpen(false) }}
          >
            <Users size={18} />
            Clientes
          </button>
          <button
            className={activeView === 'Préstamos' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Préstamos'); setMenuOpen(false) }}
          >
            <HandCoins size={18} />
            Préstamos
          </button>
          <button
            className={activeView === 'Cuotas' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Cuotas'); setMenuOpen(false) }}
          >
            <ReceiptText size={18} />
            Pagos
          </button>

          <p className="nav-section">Finanzas</p>

          <button
            className={activeView === 'Gastos' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Gastos'); setMenuOpen(false) }}
          >
            <Receipt size={18} />
            Gastos
          </button>
          <button
            className={activeView === 'Liquidación' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Liquidación'); setMenuOpen(false) }}
          >
            <Coins size={18} />
            Liquidación
          </button>
          <button
            className={activeView === 'Reportes' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveView('Reportes'); setMenuOpen(false) }}
          >
            <FileText size={18} />
            Reportes
          </button>
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
              <input
                placeholder="Buscar cliente, préstamo o cuota"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              type="button"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </button>
            <button className="secondary-button" onClick={() => supabase.auth.signOut()}>
              Salir
            </button>
          </div>
        </header>

        {(dataLoading || actionPending || appError) && (
          <div className={appError ? 'app-alert error' : 'app-alert'}>
            <strong>{appError ? 'Atención' : actionPending ? 'Guardando cambios' : 'Cargando datos'}</strong>
            <span>{appError ?? 'Sincronizando con Supabase.'}</span>
            {appError && (
              <button className="secondary-button" onClick={() => void refreshData()}>
                Reintentar
              </button>
            )}
          </div>
        )}

        {activeView === 'Dashboard' && (
          <Dashboard
            totals={totals}
            activeLoans={activeLoans}
            eligibleRenewals={eligibleRenewals}
            customers={customerRecords}
            collectionTrend={getWeeklyCollectionTrend(paymentRecords)}
            onOpenLoan={openLoan}
          />
        )}
        {activeView === 'Clientes' && (
          <CustomersView
            customers={customerRecords}
            searchTerm={searchTerm}
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
            onDeleteCustomer={async (customer) => {
              if (!customer.dbId) {
                setAppError('No se encontró el cliente en Supabase.')
                return
              }

              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.from('customers').delete().eq('id', customer.dbId)
                if (error) throw error

                await refreshData()
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
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo eliminar el cliente.')
              } finally {
                setActionPending(false)
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
            payments={paymentRecords}
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
            onPayOffLoan={async (loan) => {
              if (!loan.dbId) {
                setAppError('No se encontró el préstamo en Supabase.')
                return
              }

              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.rpc('payoff_loan', {
                  p_loan_id: loan.dbId,
                  p_payment_date: formatDateInput(new Date()),
                  p_collector_id: loan.collectorDbId ?? null,
                  p_late_fee_amount: 0,
                  p_notes: 'Saldo completo registrado desde Capital Express.',
                })

                if (error) throw error

                await refreshData()
                setRenewalPreview(null)
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo saldar el préstamo.')
              } finally {
                setActionPending(false)
              }
            }}
            onOpenCustomer={(customer) => {
              setSelectedCustomer(customer)
              setActiveView('Clientes')
            }}
            onGoPayments={(context) => openPaymentContext(context)}
            searchTerm={searchTerm}
            loans={loanRecords}
            customers={customerRecords}
            collectors={collectorRecords}
            onNewCollector={() => setShowCollectorForm(true)}
            onEditCollector={(collector) => {
              setEditingCollector(collector)
              setShowCollectorForm(true)
            }}
            onDeleteCollector={async (collector) => {
              if (!collector.dbId) {
                setAppError('No se encontró el cobrador en Supabase.')
                return
              }

              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.from('collectors').delete().eq('id', collector.dbId)
                if (error) throw error
                await refreshData()
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo eliminar el cobrador.')
              } finally {
                setActionPending(false)
              }
            }}
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
            searchTerm={searchTerm}
            nextId={getNextId(paymentRecords)}
            collectorOptions={collectorOptions}
            onRegisterPayment={registerPayment}
          />
        )}
        {activeView === 'Gastos' && (
          <GastosView
            expenses={expenseRecords}
            nextExpenseId={getNextId(expenseRecords)}
            onAddExpense={async (expense) => {
              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.from('expenses').insert({
                  expense_type: expense.type,
                  amount: expense.amount,
                  expense_date: expense.date,
                  description: expense.description || null,
                  entered_by_name: expense.owner,
                })
                if (error) throw error
                await refreshData()
                return true
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo registrar el gasto.')
                return false
              } finally {
                setActionPending(false)
              }
            }}
            onEditExpense={async (expense) => {
              if (!expense.dbId) {
                setAppError('No se encontró el gasto en Supabase.')
                return false
              }

              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.from('expenses').update({
                  expense_type: expense.type,
                  amount: expense.amount,
                  expense_date: expense.date,
                  description: expense.description || null,
                  entered_by_name: expense.owner,
                }).eq('id', expense.dbId)
                if (error) throw error
                await refreshData()
                return true
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo actualizar el gasto.')
                return false
              } finally {
                setActionPending(false)
              }
            }}
            onDeleteExpense={async (id) => {
              const expense = expenseRecords.find((record) => record.id === id)
              if (!expense?.dbId) {
                setAppError('No se encontró el gasto en Supabase.')
                return
              }

              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.from('expenses').delete().eq('id', expense.dbId)
                if (error) throw error
                await refreshData()
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.')
              } finally {
                setActionPending(false)
              }
            }}
            ownerOptions={['Admin', ...collectorOptions]}
          />
        )}
        {activeView === 'Liquidación' && (
          <LiquidationView
            liquidation={monthlyLiquidation}
            history={liquidationRecords}
            onConfirm={async (liquidation) => {
              setActionPending(true)
              setAppError(null)

              try {
                const { error } = await supabase.rpc('confirm_monthly_liquidation', {
                  p_month: `${liquidation.month}-01`,
                  p_notes: 'Confirmado manualmente desde Capital Express.',
                })
                if (error) throw error
                await refreshData()
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo confirmar la liquidación.')
              } finally {
                setActionPending(false)
              }
            }}
          />
        )}
        {activeView === 'Reportes' && <ReportsView />}
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      {showLoanForm && (
        <LoanForm
          customers={customerRecords}
          defaultCustomerId={loanCustomerId}
          nextId={getNextId(loanRecords)}
          collectorOptions={collectorOptions}
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
          onCreate={async (customer) => {
            setActionPending(true)
            setAppError(null)

            try {
              const { error } = await supabase.from('customers').insert({
                full_name: customer.name,
                phone: customer.phone,
                address: customer.address,
                identification_number: customer.cedula || null,
                notes: customer.notes || null,
                references_text: customer.references || null,
                status: toDbCustomerStatus[customer.status],
              })
              if (error) throw error
              await refreshData()
              setShowCustomerForm(false)
            } catch (error) {
              setAppError(error instanceof Error ? error.message : 'No se pudo crear el cliente.')
            } finally {
              setActionPending(false)
            }
          }}
          onUpdate={async (customer) => {
            if (!customer.dbId) {
              setAppError('No se encontró el cliente en Supabase.')
              return
            }

            setActionPending(true)
            setAppError(null)

            try {
              const { error } = await supabase.from('customers').update({
                full_name: customer.name,
                phone: customer.phone,
                address: customer.address,
                identification_number: customer.cedula || null,
                notes: customer.notes || null,
                references_text: customer.references || null,
                status: toDbCustomerStatus[customer.status],
              }).eq('id', customer.dbId)
              if (error) throw error
              await refreshData()
              setEditingCustomer(null)
              setShowCustomerForm(false)
            } catch (error) {
              setAppError(error instanceof Error ? error.message : 'No se pudo actualizar el cliente.')
            } finally {
              setActionPending(false)
            }
          }}
          nextId={getNextId(customerRecords)}
        />
      )}
      {showCollectorForm && (
        <CollectorForm
          initialCollector={editingCollector}
          nextId={getNextId(collectorRecords)}
          onClose={() => {
            setShowCollectorForm(false)
            setEditingCollector(null)
          }}
          onCreate={async (collector) => {
            setActionPending(true)
            setAppError(null)

            try {
              const { error } = await supabase.from('collectors').insert({
                full_name: collector.name,
                phone: collector.phone || null,
                address: collector.address || null,
                identification_number: collector.cedula || null,
                notes: collector.notes || null,
                active: collector.active,
              })
              if (error) throw error
              await refreshData()
              setShowCollectorForm(false)
            } catch (error) {
              setAppError(error instanceof Error ? error.message : 'No se pudo crear el cobrador.')
            } finally {
              setActionPending(false)
            }
          }}
          onUpdate={async (collector) => {
            if (!collector.dbId) {
              setAppError('No se encontró el cobrador en Supabase.')
              return
            }

            setActionPending(true)
            setAppError(null)

            try {
              const { error } = await supabase.from('collectors').update({
                full_name: collector.name,
                phone: collector.phone || null,
                address: collector.address || null,
                identification_number: collector.cedula || null,
                notes: collector.notes || null,
                active: collector.active,
              }).eq('id', collector.dbId)
              if (error) throw error
              await refreshData()
              setEditingCollector(null)
              setShowCollectorForm(false)
            } catch (error) {
              setAppError(error instanceof Error ? error.message : 'No se pudo actualizar el cobrador.')
            } finally {
              setActionPending(false)
            }
          }}
        />
      )}
    </div>
  )
}

function AppState({ title, message }: { title: string; message: string }) {
  return (
    <main className="standalone-state">
      <div className="brand-mark">CE</div>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
    }

    setLoading(false)
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand">
          <div className="brand-mark">CE</div>
          <div>
            <strong>Capital Express</strong>
            <span>Puerto Plata</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">Acceso administrador</p>
          <h1>Iniciar sesión</h1>
        </div>
        {error && (
          <div className="app-alert error">
            <strong>Atención</strong>
            <span>{error}</span>
          </div>
        )}
        <label>
          Correo
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="primary-button" type="submit" disabled={loading}>
          <ShieldCheck size={18} />
          {loading ? 'Validando' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

function Pagination({
  total,
  page,
  perPage,
  onPageChange,
}: {
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)
  return (
    <div className="pagination">
      <span className="pagination-info">{start}–{end} de {total}</span>
      <div className="pagination-controls">
        <button
          className="icon-button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="pagination-page">{page} / {totalPages}</span>
        <button
          className="icon-button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function Dashboard({
  totals,
  activeLoans,
  eligibleRenewals,
  customers,
  collectionTrend,
  onOpenLoan,
}: {
  totals: DashboardTotals
  activeLoans: Loan[]
  eligibleRenewals: Loan[]
  customers: Customer[]
  collectionTrend: Array<{ day: string; value: number }>
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
          {eligibleRenewals.length === 0 && <EmptyState message="No hay clientes elegibles para renovación en este momento." />}
          {eligibleRenewals.map((loan) => {
            const customer = getCustomer(customers, loan.customerId)
            if (!customer) {
              return null
            }
            const progress = getLoanProgress(loan)
            const renewal = getRenewalMath(loan)

            return (
              <button className="renewal-card" key={loan.id} onClick={() => onOpenLoan(loan)}>
                <div className="renewal-card-top">
                  <div className="avatar soft-avatar">{customer.name.slice(0, 2)}</div>
                  <div>
                    <strong>{customer.name}</strong>
                    <span>Préstamo #{loan.id} · {loan.frequency}</span>
                  </div>
                </div>
                <div className="renewal-progress">
                  <span style={{ width: `${progress.percent}%` }} />
                </div>
                <div className="renewal-facts">
                  <span>{progress.paidPayments}/{loan.payments} cuotas cubiertas</span>
                  <strong>{progress.percent}%</strong>
                </div>
                <div className="renewal-money">
                  <span>Pagado: {formatMoney(progress.paidAmount)}</span>
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
            <AreaChart data={collectionTrend}>
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
  searchTerm,
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
  searchTerm: string
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
  const [page, setPage] = useState(1)
  const term = searchTerm.toLowerCase()
  const visibleCustomers = searchTerm
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.cedula.includes(term) ||
        c.address.toLowerCase().includes(term)
      )
    : customers
  const perPage = 10
  const totalPages = Math.max(1, Math.ceil(visibleCustomers.length / perPage))
  const safePage = Math.min(page, totalPages)
  const pageCustomers = visibleCustomers.slice((safePage - 1) * perPage, safePage * perPage)
  const customerLoans = loans.filter(
    (loan) =>
      loan.customerId === selectedCustomer?.id &&
      (loan.status === 'Activo' || loan.status === 'Atrasado'),
  )
  const customerLoanHistory = loans.filter(
    (loan) =>
      loan.customerId === selectedCustomer?.id &&
      loan.status !== 'Activo' &&
      loan.status !== 'Atrasado',
  )

  return (
    <section className="customers-layout">
      <PageBanner
        variant="clientes"
        eyebrow="Cartera activa"
        title="Clientes"
        text="Seguimiento de contactos, cobradores, historial y préstamos activos."
      />

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
              {pageCustomers.map((customer) => {
                const customerActiveLoans = loans.filter(
                  (loan) =>
                    loan.customerId === customer.id &&
                    (loan.status === 'Activo' || loan.status === 'Atrasado'),
                )

                return (
                  <tr className="interactive-row" key={customer.id} onClick={() => onSelectCustomer(customer)}>
                    <td>
                      <div className="table-person">
                        <div className="avatar soft-avatar">{customer.name.slice(0, 2)}</div>
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
              {visibleCustomers.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="No hay clientes para mostrar." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={visibleCustomers.length} page={safePage} perPage={perPage} onPageChange={setPage} />
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
                    <span>{loan.frequency} · {getLoanProgress(loan).paidPayments}/{loan.payments} cuotas</span>
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
              {customerLoanHistory.map((loan) => (
                <div className="history-row" key={loan.id}>
                  <span>#{loan.id} · {loan.endDate}</span>
                  <strong>{formatMoney(loan.paymentAmount * loan.payments)}</strong>
                  <small>{loan.status}</small>
                </div>
              ))}
              {customerLoanHistory.length === 0 && <EmptyState message="No hay préstamos cerrados todavía." />}
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
  collectors,
  payments,
  searchTerm,
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
  onNewCollector,
  onEditCollector,
  onDeleteCollector,
}: {
  loans: Loan[]
  customers: Customer[]
  collectors: Collector[]
  payments: PaymentRecord[]
  searchTerm: string
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
  onNewCollector: () => void
  onEditCollector: (collector: Collector) => void
  onDeleteCollector: (collector: Collector) => void
}) {
  const [openActions, setOpenActions] = useState<number | null>(null)
  const [openCollectorActions, setOpenCollectorActions] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'prestamos' | 'cobradores'>('prestamos')
  const [page, setPage] = useState(1)
  const [collectorsPage, setCollectorsPage] = useState(1)
  const term = searchTerm.toLowerCase()
  const visibleLoans = searchTerm
    ? loans.filter((loan) => {
        const customer = getCustomer(customers, loan.customerId)
        return (
          String(loan.id).includes(term) ||
          customer?.name.toLowerCase().includes(term) ||
          loan.status.toLowerCase().includes(term) ||
          loan.collector.toLowerCase().includes(term)
        )
      })
    : loans
  const visibleCollectors = searchTerm
    ? collectors.filter((collector) =>
        collector.name.toLowerCase().includes(term) ||
        collector.phone.includes(term) ||
        collector.cedula.includes(term) ||
        collector.address.toLowerCase().includes(term)
      )
    : collectors
  const perPage = 10
  const loansTotalPages = Math.max(1, Math.ceil(visibleLoans.length / perPage))
  const safePage = Math.min(page, loansTotalPages)
  const pageLoans = visibleLoans.slice((safePage - 1) * perPage, safePage * perPage)
  const collectorsTotalPages = Math.max(1, Math.ceil(visibleCollectors.length / perPage))
  const safeCollectorsPage = Math.min(collectorsPage, collectorsTotalPages)
  const pageCollectors = visibleCollectors.slice((safeCollectorsPage - 1) * perPage, safeCollectorsPage * perPage)

  return (
    <section className="loans-layout">
      <PageBanner
        variant="prestamos"
        eyebrow="Capital en movimiento"
        title="Préstamos"
        text="Asignación, progreso, saldos, renovaciones y cierres de cada préstamo."
      />

      <div className="view-tabs" role="tablist" aria-label="Secciones de préstamos">
        <button
          className={activeTab === 'prestamos' ? 'active' : undefined}
          onClick={() => setActiveTab('prestamos')}
          role="tab"
          aria-selected={activeTab === 'prestamos'}
        >
          Préstamos
        </button>
        <button
          className={activeTab === 'cobradores' ? 'active' : undefined}
          onClick={() => setActiveTab('cobradores')}
          role="tab"
          aria-selected={activeTab === 'cobradores'}
        >
          Cobradores
        </button>
      </div>

      {activeTab === 'prestamos' && (
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
              {pageLoans.map((loan) => {
                const customer = getCustomer(customers, loan.customerId)
                if (!customer) {
                  return null
                }

                return (
                  <tr className="interactive-row" key={loan.id} onClick={() => onOpenLoan(loan)}>
                    <td>
                      <div className="table-person">
                        <div className="avatar soft-avatar">{customer.name.slice(0, 2)}</div>
                        <div>
                          <strong>{customer.name}</strong>
                          <span>Préstamo #{loan.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatMoney(loan.principal)}</td>
                    <td>{formatMoney(loan.paymentAmount)} · {loan.frequency}</td>
                    <td>{getLoanProgress(loan).paidPayments}/{loan.payments}</td>
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
              {visibleLoans.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No hay préstamos para mostrar." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={visibleLoans.length} page={safePage} perPage={perPage} onPageChange={setPage} />
      </div>
      )}

      {activeTab === 'cobradores' && (
        <div className="panel table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Equipo de cobro</p>
              <h2>Cobradores</h2>
            </div>
            <button className="primary-button" onClick={onNewCollector}>
              <Plus size={17} />
              Nuevo cobrador
            </button>
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Cobrador</th>
                  <th>Teléfono</th>
                  <th>Cédula</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageCollectors.map((collector) => (
                  <tr key={collector.id}>
                    <td>
                      <div className="table-person">
                        <div className="avatar soft-avatar">{collector.name.slice(0, 2)}</div>
                        <div>
                          <strong>{collector.name}</strong>
                          <span>{collector.notes || 'Ruta de cobro'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{collector.phone || '-'}</td>
                    <td>{collector.cedula || '-'}</td>
                    <td>{collector.address || '-'}</td>
                    <td><StatusBadge status={collector.active ? 'Activo' : 'Inactivo'} /></td>
                    <td>
                      <QuickActions
                        isOpen={openCollectorActions === collector.id}
                        label="Acciones del cobrador"
                        onRequestClose={() => setOpenCollectorActions(null)}
                        onToggle={(event) => {
                          event.stopPropagation()
                          setOpenCollectorActions(openCollectorActions === collector.id ? null : collector.id)
                        }}
                        actions={[
                          {
                            label: 'Editar cobrador',
                            icon: Pencil,
                            onSelect: () => {
                              onEditCollector(collector)
                              setOpenCollectorActions(null)
                            },
                          },
                          {
                            label: 'Eliminar cobrador',
                            icon: Trash2,
                            tone: 'danger',
                            onSelect: () => {
                              onDeleteCollector(collector)
                              setOpenCollectorActions(null)
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {visibleCollectors.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState message="No hay cobradores para mostrar." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={visibleCollectors.length} page={safeCollectorsPage} perPage={perPage} onPageChange={setCollectorsPage} />
        </div>
      )}

      {selectedLoan && (
        <DetailDrawer onClose={onCloseLoan} label="Cerrar detalle del préstamo">
          <LoanDetail
            loan={selectedLoan}
            customer={getCustomer(customers, selectedLoan.customerId)}
            payments={payments}
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
  payments,
  renewalPreview,
  onClose,
  onRenew,
  onConfirmRenewal,
}: {
  loan: Loan
  customer: Customer | null
  payments: PaymentRecord[]
  renewalPreview: Loan | null
  onClose: () => void
  onRenew: () => void
  onConfirmRenewal: () => void
}) {
  const renewal = getRenewalMath(loan)
  const progress = getLoanProgress(loan)
  const today = formatDateInput(new Date())
  const [showSchedule, setShowSchedule] = useState(false)
  const schedule = buildSchedule(loan, payments, today)
  const nextDue =
    loan.status !== 'Pagado' && loan.status !== 'Renovado' && progress.paidPayments < loan.payments
      ? getNextDueDate(loan.startDate, progress.paidPayments, loan.frequency)
      : null
  const overdue = nextDue !== null && isLoanOverdue(loan, today)
  const moraPerPayment = Math.round(loan.paymentAmount * (loan.lateFee / 100))

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
          <strong>{progress.percent}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <div className="info-grid">
        <Info label="Principal original" value={formatMoney(loan.principal)} />
        <Info label="Total esperado" value={formatMoney(renewal.totalExpected)} />
        <Info label="Pagado por cliente" value={formatMoney(renewal.alreadyPaid)} />
        <Info label="Balance para cierre" value={formatMoney(renewal.payoffBalance)} />
        <Info label="Cuotas cubiertas" value={`${progress.paidPayments}/${loan.payments}`} />
        <Info label="Inicio" value={loan.startDate} />
        <Info label="Final calculado" value={loan.endDate} />
        {nextDue && <Info label="Próxima cuota vence" value={nextDue} />}
        {overdue && <Info label="Mora por cuota" value={formatMoney(moraPerPayment)} />}
        <Info label="Mora" value={`${loan.lateFee}% después de ${loan.graceDays} días`} />
        <Info label="Cobrador" value={loan.collector} />
        {loan.notes && <Info label="Notas" value={loan.notes} />}
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

      <button className="schedule-toggle" onClick={() => setShowSchedule(!showSchedule)}>
        <span>
          <CalendarDays size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Cronograma de cuotas ({loan.payments} cuotas)
        </span>
        <ChevronRight size={15} style={{ transform: showSchedule ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {showSchedule && (
        <div className="schedule-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha prog.</th>
                <th>Cobrado</th>
                <th>Cuota</th>
                <th>Mora</th>
                <th>Saldo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.n} className={row.status === 'Próxima' ? 'schedule-row-next' : undefined}>
                  <td>{row.n}</td>
                  <td>{row.scheduledDate}</td>
                  <td>{row.actualDate ?? '-'}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{row.mora > 0 ? formatMoney(row.mora) : '-'}</td>
                  <td>{formatMoney(row.balance)}</td>
                  <td><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
  onCreate: (customer: Customer) => void | Promise<void>
  onUpdate: (customer: Customer) => void | Promise<void>
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const customer: Customer = {
      id: initialCustomer?.id ?? nextId,
      dbId: initialCustomer?.dbId,
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      cedula: String(form.get('cedula') || ''),
      collector: initialCustomer?.collector ?? 'Sin cobrador',
      collectorDbId: initialCustomer?.collectorDbId,
      status: String(form.get('status') || 'Activo') as CustomerStatus,
      references: String(form.get('references') || ''),
      notes: String(form.get('notes') || ''),
    }

    if (initialCustomer) {
      await onUpdate(customer)
    } else {
      await onCreate(customer)
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

function CollectorForm({
  initialCollector,
  nextId,
  onClose,
  onCreate,
  onUpdate,
}: {
  initialCollector: Collector | null
  nextId: number
  onClose: () => void
  onCreate: (collector: Collector) => void | Promise<void>
  onUpdate: (collector: Collector) => void | Promise<void>
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const collector: Collector = {
      id: initialCollector?.id ?? nextId,
      dbId: initialCollector?.dbId,
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      cedula: String(form.get('cedula') || ''),
      notes: String(form.get('notes') || ''),
      active: form.get('active') === 'on',
    }

    if (initialCollector) {
      await onUpdate(collector)
    } else {
      await onCreate(collector)
    }
  }

  return (
    <div className="modal-layer">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Equipo de cobro</p>
            <h2>{initialCollector ? 'Editar cobrador' : 'Nuevo cobrador'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Nombre completo
            <input name="name" defaultValue={initialCollector?.name} placeholder="Ej. Rafael Santos" required />
          </label>
          <label>
            Teléfono
            <input name="phone" defaultValue={initialCollector?.phone} placeholder="(809) 555-0000" required />
          </label>
          <label>
            Cédula
            <input name="cedula" defaultValue={initialCollector?.cedula} placeholder="037-0000000-0" />
          </label>
          <label className="wide-span">
            Dirección
            <input
              name="address"
              defaultValue={initialCollector?.address}
              placeholder="Sector, ciudad o punto de referencia"
              required
            />
          </label>
          <label className="toggle-field">
            <input name="active" type="checkbox" defaultChecked={initialCollector?.active ?? true} />
            Cobrador activo
          </label>
          <label className="full-span">
            Notas
            <textarea
              name="notes"
              defaultValue={initialCollector?.notes}
              placeholder="Ruta, horario, zona asignada u observaciones internas"
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            {initialCollector ? 'Actualizar cobrador' : 'Guardar cobrador'}
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
  collectorOptions,
  onClose,
  onCreate,
}: {
  customers: Customer[]
  defaultCustomerId?: number
  nextId: number
  collectorOptions: string[]
  onClose: () => void
  onCreate: (loan: Loan) => boolean | Promise<boolean>
}) {
  const initialCustomerId = defaultCustomerId ?? customers[0]?.id ?? 0
  const initialCustomer = customers.find((c) => c.id === initialCustomerId)
  const initialCollector = collectorOptions.includes(initialCustomer?.collector ?? '')
    ? initialCustomer?.collector
    : collectorOptions[0]
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId)
  const [selectedCollector, setSelectedCollector] = useState(initialCollector ?? collectorOptions[0])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
    const startDate = String(form.get('startDate') || formatDateInput(new Date()))
    const frequency = String(form.get('frequency') || 'Diario') as Frequency
    const payments = Number(form.get('payments') || 45)
    const loan: Loan = {
      id: nextId,
      customerId: selectedCustomerId,
      customerDbId: selectedCustomer?.dbId,
      principal: Number(form.get('principal') || 0),
      paymentAmount: Number(form.get('paymentAmount') || 0),
      frequency,
      payments,
      paidPayments: 0,
      paidAmount: 0,
      startDate,
      endDate: calculateEndDate(startDate, payments, frequency),
      collector: selectedCollector,
      collectorDbId: selectedCustomer?.collectorDbId,
      lateFee: Number(form.get('lateFee') || 0),
      graceDays: Number(form.get('graceDays') || 0),
      notes: String(form.get('notes') || ''),
      status: 'Activo',
    }

    await onCreate(loan)
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
            <select
              name="customerId"
              value={selectedCustomerId}
              onChange={(e) => {
                const nextCustomerId = Number(e.target.value)
                const nextCustomer = customers.find((c) => c.id === nextCustomerId)
                setSelectedCustomerId(nextCustomerId)
                setSelectedCollector(
                  collectorOptions.includes(nextCustomer?.collector ?? '')
                    ? nextCustomer?.collector ?? collectorOptions[0]
                    : collectorOptions[0],
                )
              }}
            >
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>{customer.name}</option>
              ))}
            </select>
          </label>
          <label>
            Principal
            <input name="principal" type="number" min="0" defaultValue="5000" />
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
            <input name="paymentAmount" type="number" min="0" defaultValue="145" />
          </label>
          <label>
            Número de cuotas
            <input name="payments" type="number" min="1" defaultValue="45" />
          </label>
          <label>
            Mora %
            <input name="lateFee" type="number" min="0" defaultValue="4" />
          </label>
          <label>
            Gracia en días
            <input name="graceDays" type="number" min="0" defaultValue="3" />
          </label>
          <label>
            Cobrador
            <select name="collector" value={selectedCollector} onChange={(e) => setSelectedCollector(e.target.value)}>
              {collectorOptions.map((collector) => (
                <option key={collector}>{collector}</option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Notas
            <textarea name="notes" placeholder="Notas del préstamo, ruta, condiciones o acuerdos especiales" />
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
  searchTerm,
  nextId,
  collectorOptions,
  onRegisterPayment,
}: {
  context: PaymentContext | null
  customer: Customer | null
  loan: Loan | null
  customers: Customer[]
  loans: Loan[]
  payments: PaymentRecord[]
  searchTerm: string
  nextId: number
  collectorOptions: string[]
  onRegisterPayment: (payment: PaymentRecord) => Promise<boolean>
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(Boolean(context))
  const [selectedPaymentLoan, setSelectedPaymentLoan] = useState<Loan | null>(loan)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const activeLoans = loans.filter((loanRecord) => loanRecord.status === 'Activo' || loanRecord.status === 'Atrasado')
  const term = searchTerm.toLowerCase()
  const visiblePayments = searchTerm
    ? payments.filter((p) => {
        const c = getCustomer(customers, p.customerId)
        return (
          c?.name.toLowerCase().includes(term) ||
          String(p.loanId).includes(term) ||
          p.collector.toLowerCase().includes(term) ||
          p.date.includes(term)
        )
      })
    : payments
  const perPage = 10
  const paymentsTotal = Math.max(1, Math.ceil(visiblePayments.length / perPage))
  const safePaymentsPage = Math.min(paymentsPage, paymentsTotal)
  const pagePayments = visiblePayments.slice((safePaymentsPage - 1) * perPage, safePaymentsPage * perPage)
  const upcomingTotal = Math.max(1, Math.ceil(activeLoans.length / perPage))
  const safeUpcomingPage = Math.min(upcomingPage, upcomingTotal)
  const pageUpcoming = activeLoans.slice((safeUpcomingPage - 1) * perPage, safeUpcomingPage * perPage)
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
              {pagePayments.map((payment) => {
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
              {visiblePayments.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No hay pagos registrados todavía." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={visiblePayments.length} page={safePaymentsPage} perPage={perPage} onPageChange={setPaymentsPage} />
      </section>

      <section className="panel table-panel full-span">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Pendientes</p>
            <h2>Próximas cuotas</h2>
          </div>
          <CalendarDays size={20} />
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Préstamo</th>
                <th>Próxima cuota</th>
                <th>Vence</th>
                <th>Monto</th>
                <th>Saldo</th>
                <th>Cobrador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pageUpcoming.map((loanRecord) => {
                const loanCustomer = getCustomer(customers, loanRecord.customerId)
                const progress = getLoanProgress(loanRecord)
                const nextPayment = Math.min(loanRecord.payments, progress.paidPayments + 1)
                const nextDueDate = getNextDueDate(loanRecord.startDate, progress.paidPayments, loanRecord.frequency)

                return (
                  <tr
                    className="interactive-row"
                    key={loanRecord.id}
                    onClick={() => {
                      setSelectedPaymentLoan(loanRecord)
                      setShowPaymentForm(true)
                    }}
                  >
                    <td>{loanCustomer?.name ?? 'Cliente no disponible'}</td>
                    <td>#{loanRecord.id}</td>
                    <td>{nextPayment}/{loanRecord.payments}</td>
                    <td>{nextDueDate}</td>
                    <td>{formatMoney(loanRecord.paymentAmount)}</td>
                    <td>{formatMoney(progress.remaining)}</td>
                    <td>{loanRecord.collector}</td>
                    <td><StatusBadge status={loanRecord.status === 'Atrasado' ? 'Tarde' : 'A tiempo'} /></td>
                  </tr>
                )
              })}
              {activeLoans.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No hay cuotas pendientes." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={activeLoans.length} page={safeUpcomingPage} perPage={perPage} onPageChange={setUpcomingPage} />
      </section>

      {showPaymentForm && (
        <PaymentForm
          context={context}
          customers={customers}
          loans={activeLoans}
          selectedLoan={selectedPaymentLoan}
          nextId={nextId}
          collectorOptions={collectorOptions}
          onClose={() => setShowPaymentForm(false)}
          onSubmit={async (payment) => {
            const saved = await onRegisterPayment(payment)
            if (saved) {
              setShowPaymentForm(false)
            }
            return saved
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
  collectorOptions,
  onClose,
  onSubmit,
}: {
  context: PaymentContext | null
  customers: Customer[]
  loans: Loan[]
  selectedLoan: Loan | null
  nextId: number
  collectorOptions: string[]
  onClose: () => void
  onSubmit: (payment: PaymentRecord) => boolean | Promise<boolean>
}) {
  const candidateLoans = context?.customerId
    ? loans.filter((loan) => loan.customerId === context.customerId)
    : loans
  const defaultLoan =
    (selectedLoan && candidateLoans.some((loan) => loan.id === selectedLoan.id) ? selectedLoan : null) ??
    candidateLoans.find((loan) => loan.id === context?.loanId) ??
    candidateLoans[0]
  const [selectedLoanId, setSelectedLoanId] = useState(defaultLoan?.id ?? 0)
  const currentLoan = candidateLoans.find((loan) => loan.id === selectedLoanId) ?? defaultLoan
  const defaultCustomer = currentLoan ? getCustomer(customers, currentLoan.customerId) : null
  const currentProgress = currentLoan ? getLoanProgress(currentLoan) : null
  const [amount, setAmount] = useState(currentLoan?.paymentAmount ?? 0)
  const [status, setStatus] = useState<PaymentRecord['status']>(currentLoan?.status === 'Atrasado' ? 'Tarde' : 'A tiempo')
  const [lateFeeAmount, setLateFeeAmount] = useState(
    currentLoan?.status === 'Atrasado' ? Math.round(currentLoan.paymentAmount * (currentLoan.lateFee / 100)) : 0,
  )
  const [collectorState, setCollectorState] = useState(currentLoan?.collector ?? collectorOptions[0])
  const nextDue =
    currentLoan && currentProgress && currentProgress.paidPayments < currentLoan.payments
      ? getNextDueDate(currentLoan.startDate, currentProgress.paidPayments, currentLoan.frequency)
      : null
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0
  const safeLateFeeAmount = Number.isFinite(lateFeeAmount) ? Math.max(0, lateFeeAmount) : 0
  const effectiveAmount =
    currentLoan && currentProgress
      ? Math.min(currentProgress.remaining, status === 'Cerrado' ? Math.max(safeAmount, currentProgress.remaining) : safeAmount)
      : safeAmount
  const coveredPaymentNumber =
    currentLoan && currentProgress
      ? Math.min(currentLoan.payments, Math.floor((currentProgress.paidAmount + effectiveAmount) / currentLoan.paymentAmount))
      : 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const loan = currentLoan
    if (!loan) {
      return
    }

    const loanProgress = getLoanProgress(loan)
    const paidAfterPayment = Math.min(loanProgress.totalExpected, loanProgress.paidAmount + effectiveAmount)
    const payment: PaymentRecord = {
      id: nextId,
      customerId: loan.customerId,
      loanId: loan.id,
      loanDbId: loan.dbId,
      customerDbId: loan.customerDbId,
      date: String(form.get('date') || formatDateInput(new Date())),
      amount: effectiveAmount,
      paymentNumber: Math.min(loan.payments, Math.floor(paidAfterPayment / loan.paymentAmount)),
      frequency: loan.frequency,
      collector: String(form.get('collector') || loan.collector),
      collectorDbId: loan.collectorDbId,
      notes: String(form.get('notes') || ''),
      status,
      lateFeeAmount: safeLateFeeAmount,
    }

    await onSubmit(payment)
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
        {defaultCustomer && currentLoan && (
          <div className="context-strip">
            <div>
              <span>Aplicando a</span>
              <strong>{defaultCustomer.name} · Préstamo #{currentLoan.id}</strong>
            </div>
            <small>{currentLoan.frequency}{nextDue ? ` · vence ${nextDue}` : ''}</small>
          </div>
        )}
        <div className="form-grid">
          <label className="wide-span">
            Préstamo
            <select
              name="loanId"
              value={selectedLoanId}
              onChange={(event) => {
                const nextLoanId = Number(event.target.value)
                const nextLoan = candidateLoans.find((loan) => loan.id === nextLoanId)
                setSelectedLoanId(nextLoanId)
                setAmount(nextLoan?.paymentAmount ?? 0)
                setStatus(nextLoan?.status === 'Atrasado' ? 'Tarde' : 'A tiempo')
                setLateFeeAmount(nextLoan?.status === 'Atrasado' ? Math.round(nextLoan.paymentAmount * (nextLoan.lateFee / 100)) : 0)
                setCollectorState(nextLoan?.collector ?? collectorOptions[0])
              }}
            >
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
            <input name="amount" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
          </label>
          <label>
            Cuota que cubrirá
            <input
              name="paymentNumber"
              value={coveredPaymentNumber}
              readOnly
            />
          </label>
          <label>
            Estado
            <select
              name="status"
              value={status}
              onChange={(event) => {
                const nextStatus = event.target.value as PaymentRecord['status']
                setStatus(nextStatus)
                if (nextStatus === 'Cerrado' && currentProgress) {
                  setAmount(currentProgress.remaining)
                } else if (status === 'Cerrado') {
                  setAmount(currentLoan?.paymentAmount ?? 0)
                }
              }}
            >
              <option>A tiempo</option>
              <option>Tarde</option>
              <option>Cerrado</option>
            </select>
          </label>
          <label>
            Mora cobrada
            <input name="lateFeeAmount" value={lateFeeAmount} onChange={(event) => setLateFeeAmount(Number(event.target.value))} />
          </label>
          <label>
            Cobrador
            <select name="collector" value={collectorState} onChange={(e) => setCollectorState(e.target.value)}>
              {collectorOptions.map((collector) => (
                <option key={collector}>{collector}</option>
              ))}
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

function LiquidationView({
  liquidation,
  history,
  onConfirm,
}: {
  liquidation: MonthlyLiquidation
  history: LiquidationRecord[]
  onConfirm: (liquidation: MonthlyLiquidation) => void
}) {
  const profitMargin = liquidation.totalCollected > 0
    ? Math.round((liquidation.netProfit / liquidation.totalCollected) * 100)
    : 0
  const alreadyConfirmed = history.some((record) => record.month === liquidation.month)

  return (
    <section className="liquidation-layout">
      <div className="metric-grid compact">
        <Metric icon={Coins} label="Ganancia neta" value={formatMoney(liquidation.netProfit)} />
        <Metric icon={Banknote} label="Inversionista 60%" value={formatMoney(liquidation.investor)} />
        <Metric icon={HandCoins} label="Socio cobrador 40%" value={formatMoney(liquidation.partner)} />
        <Metric icon={CalendarDays} label="Cierre programado" value={liquidation.closeDateLabel} />
      </div>

      <div className="panel liquidation-summary">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cierre manual · {liquidation.closeDateLabel}</p>
            <h2>Liquidación mensual</h2>
          </div>
          <StatusBadge status={liquidation.status} />
        </div>

        <div className="liquidation-hero">
          <div>
            <span>Ganancia neta disponible</span>
            <strong>{formatMoney(liquidation.netProfit)}</strong>
            <small>
              {liquidation.deficit > 0
                ? `Déficit operativo: ${formatMoney(liquidation.deficit)}.`
                : `Margen estimado: ${profitMargin}% después de gastos operativos.`}
            </small>
          </div>
          <div>
            <span>Total cobrado</span>
            <strong>{formatMoney(liquidation.totalCollected)}</strong>
            <small>{liquidation.paymentCount} pagos y {liquidation.expenseCount} gastos del mes.</small>
          </div>
        </div>

        <div className="responsive-table">
          <table className="liquidation-table">
            <thead>
              <tr>
                <th>Principal recuperado</th>
                <th>Ganancia sobre principal</th>
                <th>Mora cobrada</th>
                <th>Gastos operativos</th>
                <th>Ganancia neta</th>
                <th>Inversionista 60%</th>
                <th>Socio cobrador 40%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatMoney(liquidation.principalRecovered)}</td>
                <td>{formatMoney(liquidation.profitCollected)}</td>
                <td>{formatMoney(liquidation.lateFeesCollected)}</td>
                <td>-{formatMoney(liquidation.expensesTotal)}</td>
                <td><strong>{formatMoney(liquidation.netProfit)}</strong></td>
                <td>{formatMoney(liquidation.investor)}</td>
                <td>{formatMoney(liquidation.partner)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          className="confirm-button"
          disabled={alreadyConfirmed}
          onClick={() => onConfirm(liquidation)}
        >
          <CheckCircle2 size={18} />
          {alreadyConfirmed ? 'Liquidación confirmada' : 'Revisar y confirmar manualmente'}
        </button>
      </div>

      <div className="panel full-span">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Historial</p>
            <h2>Cierres anteriores</h2>
          </div>
          <Download size={21} />
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Total cobrado</th>
                <th>Principal</th>
                <th>Ganancia</th>
                <th>Mora</th>
                <th>Gastos</th>
                <th>Ganancia neta</th>
                <th>Inversionista</th>
                <th>Socio cobrador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((close) => (
                <tr key={close.month}>
                  <td><strong>{close.monthLabel}</strong></td>
                  <td>{formatMoney(close.totalCollected)}</td>
                  <td>{formatMoney(close.principalRecovered)}</td>
                  <td>{formatMoney(close.profitCollected)}</td>
                  <td>{formatMoney(close.lateFeesCollected)}</td>
                  <td>-{formatMoney(close.expensesTotal)}</td>
                  <td>{formatMoney(close.netProfit)}</td>
                  <td>{formatMoney(close.investor)}</td>
                  <td>{formatMoney(close.partner)}</td>
                  <td><StatusBadge status={close.status} /></td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState message="No hay cierres confirmados todavía." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function GastosView({
  expenses,
  nextExpenseId,
  ownerOptions,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: {
  expenses: Expense[]
  nextExpenseId: number
  ownerOptions: string[]
  onAddExpense: (expense: Expense) => Promise<boolean>
  onEditExpense: (expense: Expense) => Promise<boolean>
  onDeleteExpense: (id: number) => void | Promise<void>
}) {
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [page, setPage] = useState(1)
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const perPage = 10
  const totalPages = Math.max(1, Math.ceil(expenses.length / perPage))
  const safePage = Math.min(page, totalPages)
  const pageExpenses = expenses.slice((safePage - 1) * perPage, safePage * perPage)

  return (
    <section className="expenses-layout">
      <PageBanner
        variant="gastos"
        eyebrow="Operación"
        title="Gastos"
        text="Control de combustible, materiales, salarios y costos operativos del mes."
      />

      <div className="panel full-span">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Operación</p>
            <h2>Gastos del mes</h2>
          </div>
          <button className="primary-button" onClick={() => setShowExpenseForm(true)}>
            <Plus size={17} />
            Nuevo gasto
          </button>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr className="summary-row">
                <td colSpan={4}>Total gastos del mes</td>
                <td>{formatMoney(total)}</td>
                <td>{expenses.length} registros</td>
              </tr>
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Registrado por</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td><strong>{expense.type}</strong></td>
                  <td>{expense.description || '-'}</td>
                  <td>{expense.date}</td>
                  <td>{expense.owner}</td>
                  <td>{formatMoney(expense.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="icon-button"
                        onClick={() => setEditingExpense(expense)}
                        aria-label="Editar gasto"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        style={{ color: '#b42318', background: '#fff1f0' }}
                        onClick={() => onDeleteExpense(expense.id)}
                        aria-label="Eliminar gasto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No hay gastos registrados para este periodo." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={expenses.length} page={safePage} perPage={perPage} onPageChange={setPage} />
      </div>

      {showExpenseForm && (
        <ExpenseForm
          nextId={nextExpenseId}
          ownerOptions={ownerOptions}
          onClose={() => setShowExpenseForm(false)}
          onCreate={async (expense) => {
            const saved = await onAddExpense(expense)
            if (saved) {
              setShowExpenseForm(false)
            }
            return saved
          }}
        />
      )}
      {editingExpense && (
        <ExpenseForm
          nextId={nextExpenseId}
          initialExpense={editingExpense}
          ownerOptions={ownerOptions}
          onClose={() => setEditingExpense(null)}
          onCreate={async (expense) => {
            const saved = await onEditExpense(expense)
            if (saved) {
              setEditingExpense(null)
            }
            return saved
          }}
        />
      )}
    </section>
  )
}

function ExpenseForm({
  nextId,
  initialExpense,
  ownerOptions,
  onClose,
  onCreate,
}: {
  nextId: number
  initialExpense?: Expense
  ownerOptions: string[]
  onClose: () => void
  onCreate: (expense: Expense) => boolean | Promise<boolean>
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const expense: Expense = {
      id: initialExpense?.id ?? nextId,
      type: String(form.get('type') || ''),
      amount: Number(form.get('amount') || 0),
      date: String(form.get('date') || formatDateInput(new Date())),
      description: String(form.get('description') || ''),
      owner: String(form.get('owner') || 'Admin'),
    }
    await onCreate(expense)
  }

  return (
    <div className="modal-layer">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Gastos operativos</p>
            <h2>{initialExpense ? 'Editar gasto' : 'Registrar gasto'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label className="wide-span">
            Tipo de gasto
            <input name="type" defaultValue={initialExpense?.type} placeholder="Ej. Gasolina motor, Papelería" required />
          </label>
          <label>
            Monto
            <input name="amount" type="number" min="0" defaultValue={initialExpense?.amount ?? 0} required />
          </label>
          <label>
            Fecha
            <input name="date" type="date" defaultValue={initialExpense?.date ?? formatDateInput(new Date())} />
          </label>
          <label>
            Registrado por
            <select name="owner" defaultValue={initialExpense?.owner ?? ownerOptions[0]}>
              {ownerOptions.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Descripción
            <textarea name="description" defaultValue={initialExpense?.description} placeholder="Descripción detallada del gasto" />
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            {initialExpense ? 'Actualizar gasto' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </div>
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
    <section className="reports-layout">
      <PageBanner
        variant="reportes"
        eyebrow="Documentos"
        title="Reportes"
        text="Exportes manuales para clientes, préstamos, pagos, gastos y distribución de socios."
      />

      <div className="reports-grid">
        {reports.map((report) => (
          <button className="report-card" key={report}>
            <FileText size={22} />
            <span>{report}</span>
            <small>Exportar PDF</small>
            <Download size={18} />
          </button>
        ))}
      </div>
    </section>
  )
}

function PageBanner({
  variant,
  eyebrow,
  title,
  text,
}: {
  variant: 'clientes' | 'prestamos' | 'reportes' | 'gastos'
  eyebrow: string
  title: string
  text: string
}) {
  return (
    <section className={`page-banner banner-${variant}`}>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{text}</span>
      </div>
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

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status ${status.toLowerCase().replace(/\s/g, '-')}`}>{status}</span>
}

export default App
