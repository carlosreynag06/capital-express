import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

for (const path of ['src/app/globals.css', 'src/app/readability.css']) {
  assert.doesNotMatch(readFileSync(path, 'utf8'), /font-size:\s*\d/);
}

const session = JSON.parse(readFileSync('.local/session.json', 'utf8'));
const api = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await api.auth.setSession(session);
const { data, error } = await api.rpc('portfolio_snapshot');
if (error) throw error;
const customer = data.customers.find((item) => item.full_name.includes('Pedro Antonio'));
assert(customer);
const loan = data.loans.find((item) => item.customer_id === customer.id);
const payment = data.payments.find((item) => item.loan_id === loan.id);
assert(loan && payment);

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const state = JSON.parse(readFileSync('.local/browser-state.json', 'utf8'));
state.origins[0].origin = base;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ storageState: state, locale: 'es-DO' });
const page = await context.newPage();
const routes = [
  ['dashboard', '/'],
  ['customers', '/clientes'],
  ['customer', `/clientes/${customer.id}`],
  ['loans', '/prestamos'],
  ['payments', '/pagos'],
  ['collections', '/cobros'],
  ['reports', '/reportes'],
  ['help', '/ayuda'],
  ['receipt', `/recibos/${payment.id}`],
  ['statement', `/estados/${loan.id}`],
];

async function assertReadable(screen, name) {
  const small = await screen.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter(
        (element) =>
          element.getClientRects().length &&
          getComputedStyle(element).visibility !== 'hidden' &&
          [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()),
      )
      .map((element) => ({
        size: parseFloat(getComputedStyle(element).fontSize),
        text: element.textContent.trim().slice(0, 45),
      }))
      .filter(({ size }) => size < 12),
  );
  assert.deepEqual(small, [], `${name} has undersized text`);
  console.log(`${name}: no visible text below 12px`);
}

try {
  for (const viewport of [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 390, height: 844, label: 'mobile' },
  ]) {
    await page.setViewportSize(viewport);
    for (const [name, path] of routes) {
      await page.goto(base + path);
      await page.waitForFunction(
        () => document.querySelector('h1') || document.querySelector('.document'),
      );
      await assertReadable(page, `${viewport.label}/${name}`);
    }
  }
  const login = await browser.newContext({ locale: 'es-DO' });
  const loginPage = await login.newPage();
  await loginPage.goto(base);
  await loginPage.locator('h1').first().waitFor();
  await assertReadable(loginPage, 'login');
  await login.close();
} finally {
  await browser.close();
}
