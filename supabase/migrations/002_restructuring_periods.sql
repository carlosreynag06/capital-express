-- Renegotiation may retain the same date range. Closed period versions are immutable.
alter table public.periods drop constraint periods_loan_id_starts_on_due_on_key;
-- first_due is the ORIGINAL first payment date; cycle_start is the CURRENT agreement.
alter table public.loans drop constraint loans_check2;
alter table public.loans add constraint first_due_after_disbursement check(first_due>disbursed_on);
