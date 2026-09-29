import assert from 'node:assert/strict';
import { loanBehavior } from '../src/lib/loan-behavior.ts';

const loanId = 'loan-1';
const period = (id, starts_on, due_on, closure = null) => ({
  id,
  loan_id: loanId,
  starts_on,
  due_on,
  interest_due: 1000,
  interest_paid: 0,
  closure,
});
const payment = (id, period_id, paid_on, amount = 1000) => ({
  id,
  loan_id: loanId,
  period_id,
  paid_on,
  amount,
  created_at: `${paid_on}T12:00:00Z`,
});
const capitalization = (id, period_id, due_on, amount) => ({
  id,
  loan_id: loanId,
  period_id,
  due_on,
  amount,
});

const journey = loanBehavior(
  {
    today: '2026-03-10',
    periods: [
      period('jan15', '2026-01-01', '2026-01-15', 'capitalized'),
      period('jan30', '2026-01-15', '2026-01-30', 'capitalized'),
      period('feb15', '2026-01-30', '2026-02-15', 'capitalized'),
      period('feb28', '2026-02-15', '2026-02-28'),
    ],
    payments: [
      payment('within-grace', 'jan30', '2026-01-18'),
      payment('late', 'feb28', '2026-02-19'),
    ],
    capitalizations: [
      capitalization('cap1', 'jan15', '2026-01-15', 1000),
      capitalization('cap2', 'feb15', '2026-02-15', 1000),
    ],
  },
  loanId,
);
assert.deepEqual(
  journey.cycles.map(({ id, status, daysLate }) => [id, status, daysLate]),
  [
    ['feb28', 'missed', null],
    ['feb15', 'late', 4],
    ['jan30', 'missed', null],
    ['jan15', 'on_time', 3],
  ],
);
assert.deepEqual(
  [journey.onTime, journey.late, journey.missed, journey.averageLateDays],
  [1, 1, 2, 4],
);
assert.equal(journey.cycles.at(-1).capitalized, 1000);

const grace = loanBehavior(
  {
    today: '2026-01-18',
    periods: [period('jan15', '2026-01-01', '2026-01-15')],
    payments: [],
    capitalizations: [capitalization('cap', 'jan15', '2026-01-15', 1000)],
  },
  loanId,
);
assert.equal(grace.cycles[0].status, 'grace');
assert.equal(grace.missed, 0);

const afterGrace = loanBehavior(
  {
    today: '2026-01-19',
    periods: [period('jan15', '2026-01-01', '2026-01-15')],
    payments: [],
    capitalizations: [],
  },
  loanId,
);
assert.equal(afterGrace.cycles[0].status, 'missed');

const dueDay = loanBehavior(
  {
    today: '2026-02-05',
    periods: [
      period('jan15', '2026-01-01', '2026-01-15'),
      period('jan30', '2026-01-15', '2026-01-30'),
    ],
    payments: [payment('on-due', 'jan30', '2026-01-30', 600)],
    capitalizations: [capitalization('partial', 'jan30', '2026-01-30', 400)],
  },
  loanId,
);
assert.equal(dueDay.cycles[0].status, 'on_time');
assert.equal(dueDay.cycles[0].capitalized, 400);
assert.equal(dueDay.cycles[1].status, 'missed');

const sameDay = loanBehavior(
  {
    today: '2026-01-19',
    periods: [
      period('jan15', '2026-01-01', '2026-01-15'),
      period('jan30', '2026-01-15', '2026-01-30'),
    ],
    payments: [
      payment('part-1', 'jan30', '2026-01-18', 400),
      payment('part-2', 'jan30', '2026-01-18', 600),
    ],
    capitalizations: [],
  },
  loanId,
);
assert.equal(sameDay.cycles[1].payments.length, 2);
assert.equal(sameDay.cycles[1].status, 'on_time');
assert.equal(sameDay.cycles[0].status, 'upcoming');

const restructured = loanBehavior(
  {
    today: '2026-02-05',
    periods: [
      period('old', '2026-01-01', '2026-02-15', 'restructured'),
      period('new', '2026-01-25', '2026-02-15'),
    ],
    payments: [],
    capitalizations: [],
  },
  loanId,
);
assert.deepEqual(
  restructured.cycles.map(({ id }) => id),
  ['new'],
);
assert.equal(restructured.cycles[0].status, 'upcoming');

const paymentBeforeRestructuring = loanBehavior(
  {
    today: '2026-02-05',
    periods: [
      period('old', '2026-01-01', '2026-02-15', 'restructured'),
      period('new', '2026-01-25', '2026-02-15'),
    ],
    payments: [payment('before-change', 'old', '2026-01-20')],
    capitalizations: [],
  },
  loanId,
);
assert.equal(paymentBeforeRestructuring.cycles[0].payments.length, 1);

console.log(
  'PASS: grace, lateness, missed dates, same-day payments, capitalization and restructuring',
);
