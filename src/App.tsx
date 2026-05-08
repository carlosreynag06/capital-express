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
  Receipt,
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

const initialExpenses: Expense[] = [
  { id: 1, type: 'Gasolina motor', amount: 1850, date: '2026-05-05', description: 'Gasolina semana 1 de mayo', owner: 'Rafael Santos' },
  { id: 2, type: 'Papelería', amount: 620, date: '2026-05-02', description: 'Libretas y lapiceros para cobros', owner: 'Admin' },
  { id: 3, type: 'Gestión de cobro', amount: 1400, date: '2026-04-30', description: 'Comisión cobro cierre de abril', owner: 'Carlos Núñez' },
]

const initialLiquidationRecords: LiquidationRecord[] = [
  {
    month: '2026-04',
    monthLabel: 'Abril 2026',
    closeDateLabel: '30 abril',
    totalCollected: 32450,
    paymentCollected: 31980,
    principalRecovered: 18700,
    profitCollected: 13280,
    lateFeesCollected: 470,
    expensesTotal: 5330,
    netProfit: 8420,
    distributableProfit: 8420,
    investor: 5052,
    partner: 3368,
    deficit: 0,
    paymentCount: 27,
    expenseCount: 5,
    status: 'Confirmada',
    confirmedAt: '2026-04-30',
  },
  {
    month: '2026-03',
    monthLabel: 'Marzo 2026',
    closeDateLabel: '30 marzo',
    totalCollected: 28750,
    paymentCollected: 28420,
    principalRecovered: 17120,
    profitCollected: 11300,
    lateFeesCollected: 330,
    expensesTotal: 5355,
    netProfit: 6275,
    distributableProfit: 6275,
    investor: 3765,
    partner: 2510,
    deficit: 0,
    paymentCount: 22,
    expenseCount: 4,
    status: 'Confirmada',
    confirmedAt: '2026-03-30',
  },
]

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
}

type AppData = {
  customers: Customer[]
  loans: Loan[]
  payments: PaymentRecord[]
  expenses: Expense[]
  liquidations: LiquidationRecord[]
  monthlyLiquidation: MonthlyLiquidation
  collectors: CollectorLookup
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
  }

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

function applyPaymentToLoan(loan: Loan, amount: number, paymentStatus: PaymentRecord['status'] = 'A tiempo') {
  const totalExpected = loan.paymentAmount * loan.payments
  const paidAmount = Math.min(totalExpected, getLoanPaidAmount(loan) + amount)
  const paidPayments = Math.min(loan.payments, Math.floor(paidAmount / loan.paymentAmount))
  const status =
    paidAmount >= totalExpected
      ? ('Pagado' as LoanStatus)
      : paymentStatus === 'Tarde'
        ? ('Atrasado' as LoanStatus)
        : loan.status

  return {
    ...loan,
    paidAmount,
    paidPayments,
    status,
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

function getCustomerStatusFromLoans(loans: Loan[], customer: Customer): CustomerStatus {
  const customerLoans = loans.filter((loan) => loan.customerId === customer.id)

  if (customerLoans.some((loan) => loan.status === 'Atrasado')) {
    return 'Atrasado'
  }

  if (customerLoans.some((loan) => loan.status === 'Activo')) {
    return 'Activo'
  }

  if (customerLoans.some((loan) => loan.status === 'Pagado')) {
    return 'Pagado'
  }

  return customer.status
}

function syncCustomerStatuses(customers: Customer[], loans: Loan[]) {
  return customers.map((customer) => ({
    ...customer,
    status: getCustomerStatusFromLoans(loans, customer),
  }))
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

function refreshLoanStatuses(loans: Loan[], today: string): Loan[] {
  return loans.map((loan) => {
    if (loan.status !== 'Activo' && loan.status !== 'Atrasado') return loan
    const overdue = isLoanOverdue(loan, today)
    const newStatus: LoanStatus = overdue ? 'Atrasado' : 'Activo'
    return loan.status === newStatus ? loan : { ...loan, status: newStatus }
  })
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

void [
  initialCustomers,
  initialLoans,
  initialPayments,
  initialExpenses,
  initialLiquidationRecords,
  applyPaymentToLoan,
  syncCustomerStatuses,
  refreshLoanStatuses,
]

function App() {
  const [activeView, setActiveView] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [loanRecords, setLoanRecords] = useState<Loan[]>([])
  const [customerRecords, setCustomerRecords] = useState<Customer[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [renewalPreview, setRenewalPreview] = useState<Loan | null>(null)
  const [loanCustomerId, setLoanCustomerId] = useState<number | undefined>()
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
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
  const [collectorLookup, setCollectorLookup] = useState<CollectorLookup>({ byId: new Map(), byName: new Map() })
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [appError, setAppError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const refreshData = useCallback(async () => {
    setDataLoading(true)
    setAppError(null)

    try {
      const data = await loadAppData(liquidationMonth)
      setCustomerRecords(data.customers)
      setLoanRecords(data.loans)
      setPaymentRecords(data.payments)
      setExpenseRecords(data.expenses)
      setLiquidationRecords(data.liquidations)
      setMonthlyLiquidation(data.monthlyLiquidation)
      setCollectorLookup(data.collectors)
      setSelectedCustomer((customer) => data.customers.find((record) => record.dbId === customer?.dbId) ?? null)
      setSelectedLoan((loan) => data.loans.find((record) => record.dbId === loan?.dbId) ?? null)
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudieron cargar los datos.')
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

  function openLoan(loan: Loan) {
    setSelectedLoan(loan)
    setRenewalPreview(null)
    setActiveView('Préstamos')
  }

  function calculateRenewal(loan: Loan) {
    setRenewalPreview(loan)
  }

  async function createLoanFromForm(loan: Loan) {
    const customer = customerRecords.find((record) => record.id === loan.customerId)
    if (!customer?.dbId) {
      setAppError('Selecciona un cliente válido antes de asignar el préstamo.')
      return
    }

    setActionPending(true)
    setAppError(null)

    try {
      const { error } = await supabase.rpc('create_loan', {
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

      await refreshData()
      setSelectedCustomer(customer)
      setRenewalPreview(null)
      setShowLoanForm(false)
      setLoanCustomerId(undefined)
      setActiveView('Préstamos')
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudo crear el préstamo.')
    } finally {
      setActionPending(false)
    }
  }

  async function confirmRenewal(loan: Loan) {
    if (!loan.dbId) {
      setAppError('No se encontró el préstamo en Supabase.')
      return
    }

    setActionPending(true)
    setAppError(null)

    try {
      const { error } = await supabase.rpc('renew_loan', {
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

      await refreshData()
      setRenewalPreview(null)
      setActiveView('Préstamos')
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudo renovar el préstamo.')
    } finally {
      setActionPending(false)
    }
  }

  function openPaymentContext(context: PaymentContext) {
    setPaymentContext(context)
    setActiveView('Cuotas')
  }

  async function registerPayment(payment: PaymentRecord) {
    const loan = loanRecords.find((record) => record.id === payment.loanId)
    if (!loan?.dbId) {
      setAppError('No se encontró el préstamo en Supabase.')
      return
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
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'No se pudo registrar el pago.')
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
            Cuotas
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
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo registrar el gasto.')
              } finally {
                setActionPending(false)
              }
            }}
            onEditExpense={async (expense) => {
              if (!expense.dbId) {
                setAppError('No se encontró el gasto en Supabase.')
                return
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
              } catch (error) {
                setAppError(error instanceof Error ? error.message : 'No se pudo actualizar el gasto.')
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
                assigned_collector_id: collectorLookup.byName.get(customer.collector) ?? null,
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
                assigned_collector_id: collectorLookup.byName.get(customer.collector) ?? null,
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
                  <div className="avatar">{customer.name.slice(0, 2)}</div>
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
  const term = searchTerm.toLowerCase()
  const visibleCustomers = searchTerm
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.cedula.includes(term) ||
        c.address.toLowerCase().includes(term)
      )
    : customers
  const customerLoans = loans.filter(
    (loan) =>
      loan.customerId === selectedCustomer?.id &&
      (loan.status === 'Activo' || loan.status === 'Atrasado'),
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
              {visibleCustomers.map((customer) => {
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
}: {
  loans: Loan[]
  customers: Customer[]
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
}) {
  const [openActions, setOpenActions] = useState<number | null>(null)
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

  return (
    <section className="loans-layout">
      <PageBanner
        variant="prestamos"
        eyebrow="Capital en movimiento"
        title="Préstamos"
        text="Asignación, progreso, saldos, renovaciones y cierres de cada préstamo."
      />

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
              {visibleLoans.map((loan) => {
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
            </tbody>
          </table>
        </div>
      </div>

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
                  <td>{row.actualDate ?? '—'}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{row.mora > 0 ? formatMoney(row.mora) : '—'}</td>
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
  onCreate: (customer: Customer) => void
  onUpdate: (customer: Customer) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const customer: Customer = {
      id: initialCustomer?.id ?? nextId,
      dbId: initialCustomer?.dbId,
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      cedula: String(form.get('cedula') || ''),
      collector: String(form.get('collector') || ''),
      collectorDbId: initialCustomer?.collectorDbId,
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
  const initialCustomerId = defaultCustomerId ?? customers[0]?.id ?? 0
  const initialCustomer = customers.find((c) => c.id === initialCustomerId)
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId)
  const [selectedCollector, setSelectedCollector] = useState(initialCustomer?.collector ?? 'Rafael Santos')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const startDate = String(form.get('startDate') || formatDateInput(new Date()))
    const frequency = String(form.get('frequency') || 'Diario') as Frequency
    const payments = Number(form.get('payments') || 45)
    const loan: Loan = {
      id: nextId,
      customerId: selectedCustomerId,
      customerDbId: initialCustomer?.dbId,
      principal: Number(form.get('principal') || 0),
      paymentAmount: Number(form.get('paymentAmount') || 0),
      frequency,
      payments,
      paidPayments: 0,
      paidAmount: 0,
      startDate,
      endDate: calculateEndDate(startDate, payments, frequency),
      collector: selectedCollector,
      collectorDbId: initialCustomer?.collectorDbId,
      lateFee: Number(form.get('lateFee') || 0),
      graceDays: Number(form.get('graceDays') || 0),
      notes: String(form.get('notes') || ''),
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
            <select
              name="customerId"
              value={selectedCustomerId}
              onChange={(e) => {
                const nextCustomerId = Number(e.target.value)
                const nextCustomer = customers.find((c) => c.id === nextCustomerId)
                setSelectedCustomerId(nextCustomerId)
                setSelectedCollector(nextCustomer?.collector ?? 'Rafael Santos')
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
              <option>Rafael Santos</option>
              <option>Carlos Núñez</option>
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
  onRegisterPayment: (payment: PaymentRecord) => void
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(Boolean(context))
  const [selectedPaymentLoan, setSelectedPaymentLoan] = useState<Loan | null>(loan)
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
              {visiblePayments.map((payment) => {
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
              {activeLoans.map((loanRecord) => {
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
            </tbody>
          </table>
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
  const [selectedLoanId, setSelectedLoanId] = useState(defaultLoan?.id ?? 0)
  const currentLoan = candidateLoans.find((loan) => loan.id === selectedLoanId) ?? defaultLoan
  const defaultCustomer = currentLoan ? getCustomer(customers, currentLoan.customerId) : null
  const currentProgress = currentLoan ? getLoanProgress(currentLoan) : null
  const [amount, setAmount] = useState(currentLoan?.paymentAmount ?? 0)
  const [status, setStatus] = useState<PaymentRecord['status']>(currentLoan?.status === 'Atrasado' ? 'Tarde' : 'A tiempo')
  const [lateFeeAmount, setLateFeeAmount] = useState(
    currentLoan?.status === 'Atrasado' ? Math.round(currentLoan.paymentAmount * (currentLoan.lateFee / 100)) : 0,
  )
  const [collectorState, setCollectorState] = useState(currentLoan?.collector ?? 'Rafael Santos')
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
                setCollectorState(nextLoan?.collector ?? 'Rafael Santos')
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
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: {
  expenses: Expense[]
  nextExpenseId: number
  onAddExpense: (expense: Expense) => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (id: number) => void
}) {
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

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
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td><strong>{expense.type}</strong></td>
                  <td>{expense.description || '—'}</td>
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
            </tbody>
          </table>
        </div>
      </div>

      {showExpenseForm && (
        <ExpenseForm
          nextId={nextExpenseId}
          onClose={() => setShowExpenseForm(false)}
          onCreate={(expense) => {
            onAddExpense(expense)
            setShowExpenseForm(false)
          }}
        />
      )}
      {editingExpense && (
        <ExpenseForm
          nextId={nextExpenseId}
          initialExpense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onCreate={(expense) => {
            onEditExpense(expense)
            setEditingExpense(null)
          }}
        />
      )}
    </section>
  )
}

function ExpenseForm({
  nextId,
  initialExpense,
  onClose,
  onCreate,
}: {
  nextId: number
  initialExpense?: Expense
  onClose: () => void
  onCreate: (expense: Expense) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    onCreate(expense)
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
            <select name="owner" defaultValue={initialExpense?.owner ?? 'Admin'}>
              <option>Admin</option>
              <option>Rafael Santos</option>
              <option>Carlos Núñez</option>
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
