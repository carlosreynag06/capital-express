import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const session = JSON.parse(readFileSync('.local/session.json', 'utf8'));
const api = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await api.auth.setSession(session);
const { data, error } = await api.rpc('portfolio_snapshot');
if (error) throw error;
const customer = data.customers.find((c) => c.full_name === 'Pedro Antonio Jiménez');
assert(customer);

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const state = JSON.parse(readFileSync('.local/browser-state.json', 'utf8'));
state.origins[0].origin = base;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ storageState: state, locale: 'es-DO' });
const page = await context.newPage();
const screens = [
  { name: 'dashboard', path: '/', heading: 'Tu cartera, al día.' },
  { name: 'customer', path: `/clientes/${customer.id}`, heading: customer.full_name },
  { name: 'loans', path: '/prestamos', heading: 'Cartera de préstamos' },
  { name: 'payments', path: '/pagos', heading: 'Pagos recibidos' },
  { name: 'reports', path: '/reportes', heading: 'Reportes de tu negocio' },
];
mkdirSync('.local/screenshots/review', { recursive: true });
try {
  for (const viewport of [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 390, height: 844, label: 'mobile' },
  ]) {
    await page.setViewportSize(viewport);
    for (const screen of screens) {
      await page.goto(base + screen.path);
      await page.getByRole('heading', { name: screen.heading, exact: true }).waitFor();
      await page.screenshot({
        path: `.local/screenshots/review/${screen.name}-${viewport.label}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      const details = await page.evaluate(() => {
        const brand = document.querySelector('.sidebar .brand-name');
        const metric = document.querySelector('.metric');
        const metricLabel = metric?.querySelector('.metric-label');
        const title = document.querySelector('h1');
        return {
          brand:
            `${brand?.firstChild?.textContent || ''}${brand?.querySelector('.brand-light')?.textContent || ''}`
              .trim()
              .replace(/\s+/g, ' '),
          metricBackground: metric && getComputedStyle(metric).backgroundColor,
          labelSize: metricLabel && parseFloat(getComputedStyle(metricLabel).fontSize),
          titleSize: title && parseFloat(getComputedStyle(title).fontSize),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(details.brand, 'Capital Express');
      if (details.metricBackground) assert.equal(details.metricBackground, 'rgb(255, 255, 255)');
      if (details.labelSize) assert(details.labelSize >= 12);
      assert(!details.overflow);
      console.log(`${screen.name}-${viewport.label}`, details);
    }
  }
} finally {
  await browser.close();
}
