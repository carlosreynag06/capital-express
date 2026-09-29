import type { Payment, Portfolio } from './model';

export type BehaviorStatus = 'on_time' | 'late' | 'missed' | 'grace' | 'upcoming';

export type BehaviorCycle = {
  id: string;
  dueOn: string;
  interestDue: number;
  interestPaid: number;
  payments: Payment[];
  capitalized: number;
  status: BehaviorStatus;
  daysLate: number | null;
};

export type LoanBehavior = {
  cycles: BehaviorCycle[];
  onTime: number;
  late: number;
  missed: number;
  averageLateDays: number | null;
};

const dayNumber = (value: string) => Date.parse(`${value.slice(0, 10)}T12:00:00Z`) / 86400000;
const daysAfter = (due: string, paid: string) => Math.max(0, dayNumber(paid) - dayNumber(due));

/**
 * A payment made after capitalization belongs to the new ledger period. For
 * punctuality, its first cash date is instead paired with the most recent
 * unpaid due date, unless it was made on the new due date itself. This keeps
 * the reporting grace period separate from the ledger's interest allocation.
 */
export function loanBehavior(
  data: Pick<Portfolio, 'today' | 'periods' | 'payments' | 'capitalizations'>,
  loanId: string,
): LoanBehavior {
  const periods = data.periods
    .filter((period) => period.loan_id === loanId && period.closure !== 'restructured')
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.starts_on.localeCompare(b.starts_on));
  const cycles = periods.map((period) => ({
    id: period.id,
    dueOn: period.due_on,
    interestDue: period.interest_due,
    interestPaid: period.interest_paid,
    payments: [] as Payment[],
    capitalized: 0,
    status: 'upcoming' as BehaviorStatus,
    daysLate: null as number | null,
  }));
  const byPeriod = new Map<string, (typeof cycles)[number]>(
    cycles.map((cycle) => [cycle.id, cycle]),
  );

  for (const capitalization of data.capitalizations.filter((item) => item.loan_id === loanId)) {
    const cycle = byPeriod.get(capitalization.period_id);
    if (cycle) cycle.capitalized += capitalization.amount;
  }

  const payments = data.payments
    .filter((payment) => payment.loan_id === loanId)
    .sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.created_at.localeCompare(b.created_at));
  const paymentGroups = new Map<string, Payment[]>();
  for (const payment of payments) {
    const key = `${payment.paid_on}:${payment.period_id}`;
    paymentGroups.set(key, [...(paymentGroups.get(key) || []), payment]);
  }
  for (const group of paymentGroups.values()) {
    const firstPayment = group[0];
    const bookedCycle =
      byPeriod.get(firstPayment.period_id) ||
      cycles.find((cycle) => cycle.dueOn >= firstPayment.paid_on) ||
      cycles.at(-1);
    if (!bookedCycle) continue;
    const previousUnpaid = [...cycles]
      .reverse()
      .find(
        (cycle) =>
          cycle.dueOn < firstPayment.paid_on &&
          cycle.dueOn < bookedCycle.dueOn &&
          cycle.payments.length === 0,
      );
    const cycle =
      previousUnpaid && firstPayment.paid_on < bookedCycle.dueOn ? previousUnpaid : bookedCycle;
    cycle.payments.push(...group);
  }

  let onTime = 0;
  let late = 0;
  let missed = 0;
  let totalLateDays = 0;
  for (const cycle of cycles) {
    const firstPayment = cycle.payments[0];
    if (firstPayment) {
      cycle.daysLate = daysAfter(cycle.dueOn, firstPayment.paid_on);
      cycle.status = cycle.daysLate <= 3 ? 'on_time' : 'late';
      if (cycle.status === 'on_time') onTime++;
      else {
        late++;
        totalLateDays += cycle.daysLate;
      }
    } else if (dayNumber(data.today) < dayNumber(cycle.dueOn)) {
      cycle.status = 'upcoming';
    } else if (daysAfter(cycle.dueOn, data.today) <= 3) {
      cycle.status = 'grace';
    } else {
      cycle.status = 'missed';
      missed++;
    }
  }

  return {
    cycles: cycles.reverse(),
    onTime,
    late,
    missed,
    averageLateDays: late ? totalLateDays / late : null,
  };
}
