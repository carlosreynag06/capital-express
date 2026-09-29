import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const api = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await api.auth.setSession(JSON.parse(readFileSync('.local/session.json', 'utf8')));
const { data, error } = await api.rpc('portfolio_snapshot');
if (error) throw error;
const customer = data.customers.find((item) => {
  const loans = data.loans.filter((loan) => loan.customer_id === item.id);
  return loans.length > 1 && loans.some((loan) => loan.status === 'paid');
});
assert(customer);
const loans = data.loans.filter((loan) => loan.customer_id === customer.id);
const paidLoan = loans.find((loan) => loan.status === 'paid');
const currentLoan = loans.find((loan) => loan.status !== 'paid');
assert(paidLoan && currentLoan);
const capitalizedLoan = data.loans.find((loan) =>
  data.capitalizations.some((capitalization) => capitalization.loan_id === loan.id),
);
assert(capitalizedLoan);
const multiPaymentLoan = [...data.loans].sort(
  (a, b) =>
    data.payments.filter((payment) => payment.loan_id === b.id).length -
    data.payments.filter((payment) => payment.loan_id === a.id).length,
)[0];
assert(data.payments.filter((payment) => payment.loan_id === multiPaymentLoan.id).length >= 3);
const reference = (loan) => `CE-${String(loan.reference).padStart(4, '0')}`;
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const state = JSON.parse(readFileSync('.local/browser-state.json', 'utf8'));
state.origins[0].origin = base;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ storageState: state, locale: 'es-DO' });
const page = await context.newPage();
mkdirSync('.local/screenshots/loan-history', { recursive: true });

try {
  for (const viewport of [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 390, height: 844, label: 'mobile' },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/clientes/${customer.id}`);
    await page.getByRole('heading', { name: customer.full_name, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Historial de préstamos' }).click();
    await page.screenshot({
      path: `.local/screenshots/loan-history/loan-list-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    const historical = page.locator('.historical-loan').filter({ hasText: reference(paidLoan) });
    await historical.getByRole('button', { name: 'Ver pagos' }).click();
    await page.getByRole('heading', { name: `Pagos de ${reference(paidLoan)}` }).waitFor();
    const paymentCount = data.payments.filter((payment) => payment.loan_id === paidLoan.id).length;
    const capitalizations = data.capitalizations.filter(
      (cap) => cap.loan_id === paidLoan.id,
    ).length;
    assert.equal(
      await page.locator('.payment-history-table tbody tr').count(),
      1 + paymentCount + capitalizations,
    );
    assert.equal(
      await page.locator('.payment-history-table a[href^="/recibos/"]').count(),
      paymentCount,
    );
    if (viewport.label === 'mobile') {
      assert.equal(
        await page.locator('.payment-history-cards .payment-movement').count(),
        1 + paymentCount + capitalizations,
      );
      assert(await page.locator('.payment-history-cards').isVisible());
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert(!overflow, `${viewport.label} has horizontal page overflow`);
    await page.screenshot({
      path: `.local/screenshots/loan-history/payments-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByRole('button', { name: 'Puntualidad', exact: true }).click();
    await page.getByRole('heading', { name: `Puntualidad de ${reference(paidLoan)}` }).waitFor();
    assert.equal(
      await page.locator('.behavior-cycle').count(),
      data.periods.filter(
        (period) => period.loan_id === paidLoan.id && period.closure !== 'restructured',
      ).length,
    );
    await page.screenshot({
      path: `.local/screenshots/loan-history/behavior-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByRole('button', { name: 'Historial de préstamos' }).click();
    await page
      .locator('.historical-loan')
      .filter({ hasText: reference(currentLoan) })
      .getByRole('button', { name: 'Ver pagos' })
      .click();
    await page.getByRole('heading', { name: `Pagos de ${reference(currentLoan)}` }).waitFor();
    await page.goto(
      `${base}/clientes/${capitalizedLoan.customer_id}?prestamo=${capitalizedLoan.id}`,
    );
    await page.getByRole('button', { name: 'Puntualidad', exact: true }).click();
    await page.getByText('de interés capitalizado', { exact: false }).first().waitFor();
    await page.screenshot({
      path: `.local/screenshots/loan-history/behavior-capitalized-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.goto(
      `${base}/clientes/${multiPaymentLoan.customer_id}?prestamo=${multiPaymentLoan.id}`,
    );
    await page.getByRole('button', { name: 'Ver pagos', exact: true }).click();
    await page.getByRole('heading', { name: `Pagos de ${reference(multiPaymentLoan)}` }).waitFor();
    for (const payment of data.payments.filter((item) => item.loan_id === multiPaymentLoan.id)) {
      const row = page.locator('.payment-history-table tbody tr').filter({
        has: page.locator(`a[href="/recibos/${payment.id}"]`),
      });
      assert.equal(await row.count(), 1);
      assert(
        (await row.textContent()).includes(
          Number(payment.principal_after).toLocaleString('es-DO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        ),
      );
    }
    await page.screenshot({
      path: `.local/screenshots/loan-history/payments-multiple-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    console.log(`${viewport.label}: past and current loan ledgers and punctuality view verified`);
  }
} finally {
  await browser.close();
}
