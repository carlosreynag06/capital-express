import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { query } from './manage.mjs';
const api = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await api.auth.setSession(JSON.parse(readFileSync('.local/session.json', 'utf8')));
const today = (await api.rpc('portfolio_snapshot')).data.today;
const created = await api.rpc('save_customer', {
  p_id: null,
  p_name: `Prueba concurrencia ${Date.now()}`,
  p_phone: '809-555-0199',
  p_address: 'Dirección de prueba',
  p_cosigner: 'Garante de prueba',
  p_cosigner_phone: '829-555-0199',
  p_cosigner_address: 'Dirección de prueba',
});
assert.ifError(created.error);
const cid = created.data;
try {
  const loan = await api.rpc('create_loan', {
    p_customer: cid,
    p_amount: 10000,
    p_rate: 10,
    p_disbursed: today,
    p_start: today,
  });
  assert.ifError(loan.error);
  const payload = {
    p_loan: loan.data,
    p_amount: 2000,
    p_date: today,
    p_method: 'Efectivo',
    p_note: 'Prueba de concurrencia',
    p_request: crypto.randomUUID(),
  };
  const duplicate = await Promise.all([
    api.rpc('record_payment', payload),
    api.rpc('record_payment', payload),
  ]);
  duplicate.forEach((r) => assert.ifError(r.error));
  assert.equal(duplicate[0].data, duplicate[1].data);
  let stored = await api.from('loans').select('principal').eq('id', loan.data).single();
  assert.equal(stored.data.principal, 9000);
  const conflict = await api.rpc('record_payment', { ...payload, p_amount: 2500 });
  assert(conflict.error);
  const parallel = await Promise.all([
    api.rpc('record_payment', { ...payload, p_amount: 1000, p_request: crypto.randomUUID() }),
    api.rpc('record_payment', { ...payload, p_amount: 1000, p_request: crypto.randomUUID() }),
  ]);
  parallel.forEach((r) => assert.ifError(r.error));
  stored = await api.from('loans').select('principal').eq('id', loan.data).single();
  assert.equal(stored.data.principal, 7000);
  const paymentCount = await api
    .from('payments')
    .select('id', { count: 'exact' })
    .eq('loan_id', loan.data);
  assert.equal(paymentCount.count, 3);
  const invalid = await api.rpc('create_loan', {
    p_customer: cid,
    p_amount: 'NaN',
    p_rate: 10,
    p_disbursed: today,
    p_start: today,
  });
  assert(invalid.error);
  const invalidRate = await api.rpc('create_loan', {
    p_customer: cid,
    p_amount: 10000,
    p_rate: 8.12345,
    p_disbursed: today,
    p_start: today,
  });
  assert(invalidRate.error);
  const precisionLoan = await api.rpc('create_loan', {
    p_customer: cid,
    p_amount: '999.95',
    p_rate: '8.1250',
    p_disbursed: today,
    p_start: today,
  });
  assert.ifError(precisionLoan.error);
  const period = await api
    .from('periods')
    .select('interest_due')
    .eq('loan_id', precisionLoan.data)
    .eq('closed', false)
    .single();
  assert.equal(period.data.interest_due, 81.25);
  const interestOnly = await api.rpc('record_payment', {
    ...payload,
    p_loan: precisionLoan.data,
    p_amount: '81.25',
    p_request: crypto.randomUUID(),
  });
  assert.ifError(interestOnly.error);
  stored = await api.from('loans').select('principal').eq('id', precisionLoan.data).single();
  assert.equal(stored.data.principal, 999.95);
  console.log(
    'PASS: concurrent duplicate retry, conflicting retry rejected, simultaneous distinct payments serialized, exact balance, NaN rejection, rate precision, fractional cent rounding, interest-only payment.',
  );
} finally {
  assert(/^[a-f0-9-]{36}$/.test(cid));
  await query(
    `begin; delete from loan_events where loan_id in (select id from loans where customer_id='${cid}'); delete from restructurings where loan_id in (select id from loans where customer_id='${cid}'); delete from capitalizations where loan_id in (select id from loans where customer_id='${cid}'); delete from payments where loan_id in (select id from loans where customer_id='${cid}'); delete from periods where loan_id in (select id from loans where customer_id='${cid}'); delete from loans where customer_id='${cid}'; delete from collection_notes where customer_id='${cid}'; delete from cosigners where customer_id='${cid}'; delete from customers where id='${cid}'; commit;`,
  );
}
