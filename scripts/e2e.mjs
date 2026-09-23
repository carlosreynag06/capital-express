import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { query } from './manage.mjs';

const session = JSON.parse(readFileSync('.local/session.json', 'utf8'));
const api = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await api.auth.setSession(session);
const state = JSON.parse(readFileSync('.local/browser-state.json', 'utf8'));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
state.origins[0].origin = base;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  storageState: state,
  viewport: { width: 1440, height: 1000 },
  locale: 'es-DO',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.setDefaultTimeout(20000);
mkdirSync('.local/screenshots', { recursive: true });
let testCustomer;
const testName = `Prueba E2E ${Date.now()}`;
async function snapshot() {
  const r = await api.rpc('portfolio_snapshot');
  assert.ifError(r.error);
  return r.data;
}
async function go(path, title) {
  await page.goto(base + path);
  await page.getByRole('heading', { name: title, exact: true }).waitFor();
}
async function saveDialog() {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
async function pay(amount) {
  await page.getByRole('button', { name: 'Registrar pago', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Monto recibido (RD$)').fill(String(amount));
  if (amount === 600)
    await page.getByText('Este pago no cubre todo el interés.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Confirmar pago', exact: true }).click();
  await page.waitForURL('**/recibos/**');
  await page.getByText('Pago recibido', { exact: true }).waitFor();
}
try {
  await go('/', 'Tu cartera, al día.');
  let portfolio = await snapshot();
  assert.equal(portfolio.customers.length, 15);
  const exactPrincipal =
    portfolio.loans
      .filter((l) => !['paid', 'cancelled'].includes(l.status))
      .reduce((s, l) => s + Math.round(l.principal * 100), 0) / 100;
  await page
    .getByText(`RD$ ${exactPrincipal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, {
      exact: true,
    })
    .first()
    .waitFor();
  await page.screenshot({ path: '.local/screenshots/dashboard-desktop.png', fullPage: true });
  for (const [path, title] of [
    ['/clientes', 'Tus clientes'],
    ['/prestamos', 'Cartera de préstamos'],
    ['/pagos', 'Pagos recibidos'],
    ['/cobros', 'Gestión de cobros'],
    ['/reportes', 'Reportes de tu negocio'],
  ]) {
    await go(path, title);
  }
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await page.getByRole('button', { name: 'Este mes', exact: true }).click();
  let downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar reporte' }).click();
  let download = await downloadPromise;
  await download.saveAs('.local/screenshots/reporte.csv');
  assert(readFileSync('.local/screenshots/reporte.csv', 'utf8').includes('Interés cobrado'));
  await go('/clientes', 'Tus clientes');
  await page.getByLabel('Buscar en la cartera').fill('Valentina');
  await page.getByLabel('Buscar en la cartera').press('Enter');
  await page.waitForURL('**q=Valentina');
  await page.getByRole('link').filter({ hasText: 'Valentina Núñez Díaz' }).first().waitFor();
  await page.getByLabel('Buscar por nombre o teléfono…').fill('');
  assert.equal(await page.locator('tbody tr').count(), 15);
  await page.getByLabel('Buscar en la cartera').fill('Rafael');
  await page.getByLabel('Buscar en la cartera').press('Enter');
  await page.waitForURL('**q=Rafael');
  await page.getByRole('link').filter({ hasText: 'Rafael Alberto Ortiz' }).first().waitFor();
  assert.equal(await page.locator('tbody tr').count(), 1);
  await go('/clientes', 'Tus clientes');
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre completo', { exact: true }).fill(testName);
  await dialog.getByLabel('Teléfono', { exact: true }).fill('(809) 555-0199');
  await dialog.getByLabel('Dirección', { exact: true }).fill('Calle de prueba 10, Santo Domingo');
  await dialog.getByLabel('Nombre completo del garante').fill('Garante E2E Ficticio');
  await dialog.getByLabel('Teléfono del garante').fill('(829) 555-0199');
  await dialog.getByLabel('Dirección del garante').fill('Dirección de prueba, Santo Domingo');
  await saveDialog();
  await page.waitForURL('**/clientes/*');
  testCustomer = page.url().split('/').pop();
  await page.getByRole('heading', { name: testName, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Editar datos' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Dirección', { exact: true })
    .fill('Dirección editada 20, Santo Domingo');
  await saveDialog();
  await page.getByText('Dirección editada 20, Santo Domingo', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Nuevo préstamo', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Monto prestado (RD$)').fill('10000');
  assert.equal(
    await page.getByRole('dialog').getByLabel('Interés por período (%)').inputValue(),
    '10',
  );
  await page.getByRole('button', { name: 'Crear préstamo', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Registrar pago', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Registrar pago', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Archivar cliente', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: 'El cliente tiene préstamos pendientes' })
    .waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await pay(600);
  portfolio = await snapshot();
  const loan = portfolio.loans.find((l) => l.customer_id === testCustomer);
  let p = portfolio.payments.find((p) => p.loan_id === loan.id);
  assert.equal(p.interest_paid, 600);
  assert.equal(p.principal_paid, 0);
  assert.equal(p.interest_remaining, 400);
  assert.equal(p.principal_after, 10000);
  downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  download = await downloadPromise;
  await download.saveAs('.local/screenshots/recibo.pdf');
  assert(readFileSync('.local/screenshots/recibo.pdf').subarray(0, 5).toString() === '%PDF-');
  await page.getByRole('link', { name: 'Volver al cliente' }).click();
  await page.getByRole('heading', { name: testName }).waitFor();
  await page.getByRole('button', { name: 'Gestión de cobros', exact: false }).click();
  await page.getByRole('button', { name: 'Registrar contacto', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Nota', { exact: true })
    .fill('Prueba de promesa de pago que no cambia el calendario.');
  await page.getByRole('dialog').getByLabel('Promesa de pago (opcional)').fill('2026-12-30');
  await page.getByRole('dialog').getByLabel('Monto prometido (RD$)').fill('2000');
  await saveDialog();
  await page
    .getByText('Prueba de promesa de pago que no cambia el calendario.', { exact: true })
    .waitFor();
  portfolio = await snapshot();
  assert.equal(portfolio.loans.find((l) => l.id === loan.id).next_due, loan.next_due);
  await page.getByRole('button', { name: 'Resumen financiero', exact: true }).click();
  await page.getByRole('button', { name: 'Renegociar préstamo', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nueva tasa por período (%)').fill('8');
  await page
    .getByRole('dialog')
    .getByLabel('Motivo o acuerdo (opcional)')
    .fill('Prueba de renegociación al 8%.');
  await page.getByRole('dialog').getByRole('checkbox').check();
  await saveDialog();
  portfolio = await snapshot();
  assert.equal(portfolio.loans.find((l) => l.id === loan.id).rate, 8);
  assert.equal(portfolio.payments.find((x) => x.id === p.id).rate, 10);
  assert.equal(portfolio.restructurings.filter((r) => r.loan_id === loan.id).length, 1);
  await pay(1400);
  portfolio = await snapshot();
  assert.equal(portfolio.loans.find((l) => l.id === loan.id).principal, 9000);
  const payments = portfolio.payments.filter((x) => x.loan_id === loan.id);
  assert(
    payments.some(
      (x) => x.interest_paid === 400 && x.principal_paid === 1000 && x.next_interest === 720,
    ),
  );
  await page.getByRole('link', { name: 'Volver al cliente' }).click();
  await page.getByRole('link', { name: 'Estado de cuenta', exact: true }).click();
  await page.getByText('ESTADO DE CUENTA', { exact: true }).waitFor();
  downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  download = await downloadPromise;
  await download.saveAs('.local/screenshots/estado.pdf');
  assert(readFileSync('.local/screenshots/estado.pdf').subarray(0, 5).toString() === '%PDF-');
  await page.getByRole('link', { name: 'Volver al cliente' }).click();
  await pay(9000);
  portfolio = await snapshot();
  assert.equal(portfolio.loans.find((l) => l.id === loan.id).status, 'paid');
  await page.getByRole('link', { name: 'Volver al cliente' }).click();
  await page.getByRole('button', { name: 'Archivar cliente', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Restaurar cliente', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await go('/', 'Tu cartera, al día.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '.local/screenshots/dashboard-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  assert((await page.locator('.sidebar').boundingBox())?.x < 0);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await page.getByRole('heading', { name: 'Tus clientes' }).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const historyCustomer = portfolio.customers.find((c) => c.full_name === 'Andrés Manuel de León');
  await page.goto(`${base}/clientes/${historyCustomer.id}`);
  await page.getByRole('button', { name: 'Historial de préstamos', exact: true }).click();
  assert.equal(await page.locator('.historical-loan').count(), 3);
  await page
    .locator('.historical-loan')
    .last()
    .getByRole('button', { name: 'Ver detalle' })
    .click();
  await page.getByRole('button', { name: 'Historial de pagos', exact: false }).click();
  assert((await page.locator('tbody tr').count()) > 0);
  await page.goto(`${base}/clientes/${historyCustomer.id}`);
  await page.getByRole('heading', { name: historyCustomer.full_name, exact: true }).waitFor();
  await page.screenshot({ path: '.local/screenshots/customer-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar a Capital Express' }).waitFor();
  await page.goto(`${base}/clientes/${historyCustomer.id}`);
  await page.getByRole('button', { name: 'Entrar a Capital Express' }).waitFor();
  assert.equal(
    await page.getByRole('heading', { name: historyCustomer.full_name, exact: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: dashboard totals, navigation, search, customer create/edit, loan creation, partial payment, PDF receipt, communication note, schedule preservation, restructuring, historical rates, principal allocation, PDF statement, payoff, archive/restore, mobile layout, historical loans, sign-out and protected routes.',
  );
} finally {
  // Only remove the unique E2E fixture created by this run, never the demo portfolio.
  if (!testCustomer) {
    const r = await query(`select id from customers where full_name='${testName}'`);
    testCustomer = r[0]?.id;
  }
  if (testCustomer && /^[a-f0-9-]{36}$/.test(testCustomer))
    await query(
      `begin; delete from loan_events where loan_id in (select id from loans where customer_id='${testCustomer}'); delete from restructurings where loan_id in (select id from loans where customer_id='${testCustomer}'); delete from capitalizations where loan_id in (select id from loans where customer_id='${testCustomer}'); delete from payments where loan_id in (select id from loans where customer_id='${testCustomer}'); delete from periods where loan_id in (select id from loans where customer_id='${testCustomer}'); delete from loans where customer_id='${testCustomer}'; delete from collection_notes where customer_id='${testCustomer}'; delete from cosigners where customer_id='${testCustomer}'; delete from customers where id='${testCustomer}'; commit;`,
    );
  await browser.close();
}
