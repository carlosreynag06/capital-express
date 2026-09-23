import Decimal from 'decimal.js';
export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  archived: boolean;
  is_demo: boolean;
};
export type Cosigner = {
  id: string;
  customer_id: string;
  full_name: string;
  phone: string;
  address: string;
};
export type Loan = {
  id: string;
  reference: number;
  customer_id: string;
  original_principal: number;
  principal: number;
  rate: number;
  disbursed_on: string;
  cycle_start: string;
  first_due: string;
  next_due: string;
  day_one: number;
  day_two: number;
  status: string;
  overdue_since: string | null;
  restructured: boolean;
  is_demo: boolean;
};
export type Period = {
  id: string;
  loan_id: string;
  starts_on: string;
  due_on: string;
  opening_principal: number;
  rate: number;
  interest_due: number;
  interest_paid: number;
  closed: boolean;
  closure: string | null;
};
export type Payment = {
  id: string;
  receipt: number;
  loan_id: string;
  period_id: string;
  paid_on: string;
  amount: number;
  interest_paid: number;
  principal_paid: number;
  principal_before: number;
  principal_after: number;
  interest_before: number;
  interest_remaining: number;
  rate: number;
  next_due: string;
  next_interest: number;
  method: string;
  note: string;
  created_at: string;
};
export type Capitalization = {
  id: string;
  loan_id: string;
  period_id: string;
  occurred_on: string;
  due_on: string;
  principal_before: number;
  interest_due: number;
  interest_paid: number;
  amount: number;
  principal_after: number;
  rate: number;
};
export type Terms = {
  rate: number;
  cycle_start: string;
  next_due: string;
  day_one: number;
  day_two: number;
};
export type Restructuring = {
  id: string;
  loan_id: string;
  occurred_on: string;
  principal: number;
  interest: number;
  old_terms: Terms;
  new_terms: Terms;
  note: string;
};
export type LoanEvent = {
  id: string;
  loan_id: string;
  occurred_on: string;
  kind: string;
  detail: Record<string, string | number | Terms>;
};
export type Note = {
  id: string;
  customer_id: string;
  contact_type: string;
  note: string;
  promised_on: string | null;
  promised_amount: number | null;
  created_at: string;
};
export type Portfolio = {
  today: string;
  customers: Customer[];
  cosigners: Cosigner[];
  loans: Loan[];
  periods: Period[];
  payments: Payment[];
  capitalizations: Capitalization[];
  restructurings: Restructuring[];
  events: LoanEvent[];
  notes: Note[];
};
export const money = (v: number | string = 0) =>
  `RD$ ${new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))}`;
export const compactMoney = (v: number) =>
  `RD$ ${new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(v)}`;
export const date = (v: string, full = false) =>
  new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString('es-DO', {
    day: 'numeric',
    month: full ? 'long' : 'short',
    ...(full ? { year: 'numeric' as const } : {}),
  });
export const sum = <T>(items: T[], get: (x: T) => number) =>
  items.reduce((a, x) => a.plus(get(x)), new Decimal(0)).toNumber();
export const statusLabels: Record<string, string> = {
  active: 'Al día',
  overdue: 'Vencido',
  paid: 'Saldado',
  restructured: 'Renegociado',
  cancelled: 'Cancelado',
};
export const isOpen = (l: Loan) => !['paid', 'cancelled'].includes(l.status);
export function interest(data: Portfolio, l: Loan) {
  const p = data.periods.find((p) => p.loan_id === l.id && !p.closed);
  return p ? new Decimal(p.interest_due).minus(p.interest_paid).toNumber() : 0;
}
export function nextDate(data: Portfolio, l: Loan) {
  return interest(data, l) === 0 && isOpen(l)
    ? nextScheduled(l.next_due, l.day_one, l.day_two)
    : l.next_due;
}
export function nextScheduled(value: string, one = 15, two = 30) {
  const d = new Date(`${value}T12:00:00Z`);
  for (let m = 0; m < 2; m++) {
    const y = d.getUTCFullYear(),
      month = d.getUTCMonth() + m,
      last = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
    for (const day of [one, two]) {
      const c = new Date(Date.UTC(y, month, Math.min(day, last), 12));
      if (c > d) return c.toISOString().slice(0, 10);
    }
  }
  return value;
}
export const daysBetween = (a: string, b: string) =>
  Math.floor(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000,
  );
export const repaid = (l: Loan) =>
  Math.max(
    0,
    Math.min(
      100,
      new Decimal(l.original_principal)
        .minus(l.principal)
        .div(l.original_principal)
        .times(100)
        .toNumber(),
    ),
  );
export const initials = (n: string) =>
  n
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
export const reference = (l: Loan) => `CE-${String(l.reference).padStart(4, '0')}`;
export function exportCSV(name: string, headers: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) =>
    `"${String(v)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const blob = new Blob(
    ['\uFEFF' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')],
    { type: 'text/csv;charset=utf-8;' },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
