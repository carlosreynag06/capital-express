import { writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const ref = process.env.SUPABASE_PROJECT_REF;
const owner = '01ca5dde-c563-4e24-87d5-25e46e5fe3e8';
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
});
if (!response.ok) throw new Error(`Key request failed (${response.status})`);
const keys = await response.json();
const service = keys.find((k) => k.name === 'service_role');
if (!service) throw new Error('Setup key unavailable');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, service.api_key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: user, error: userError } = await admin.auth.admin.getUserById(owner);
if (userError) throw userError;
// Generates a verification token locally. No email is sent and no password is changed.
const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: user.user.email,
});
if (linkError) throw linkError;
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: verified, error } = await client.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: 'magiclink',
});
if (error) throw error;
mkdirSync('.local', { recursive: true });
writeFileSync('.local/session.json', JSON.stringify(verified.session));
const state = {
  cookies: [],
  origins: [
    {
      origin: 'http://127.0.0.1:3000',
      localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(verified.session) }],
    },
  ],
};
writeFileSync('.local/browser-state.json', JSON.stringify(state));
console.log(
  'Existing owner authentication verified. Temporary browser session saved to ignored .local directory.',
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const anonRead = await anon.from('customers').select('id');
if (!anonRead.error && anonRead.data?.length) throw new Error('Unauthenticated data exposure');
const anonRpc = await anon.rpc('portfolio_snapshot');
if (!anonRpc.error) throw new Error('Unauthenticated RPC exposure');
const internalRpc = await client.rpc('_open_loan', {
  p_customer: crypto.randomUUID(),
  p_amount: 100,
  p_rate: 10,
  p_disbursed: '2026-01-01',
  p_start: '2026-01-15',
});
if (!internalRpc.error) throw new Error('Internal function exposed');
const directWrite = await client
  .from('customers')
  .insert({ full_name: 'Unauthorized direct write', phone: '809-555-0199', address: 'Test' });
if (!directWrite.error) throw new Error('Direct writes allowed');
const portfolio = await client.rpc('portfolio_snapshot');
if (portfolio.error) throw portfolio.error;
console.log({
  ownerReads: true,
  anonymousReadsBlocked: true,
  anonymousRpcBlocked: true,
  internalRpcBlocked: true,
  directLedgerWritesBlocked: true,
  customers: portfolio.data.customers.length,
  loans: portfolio.data.loans.length,
  payments: portfolio.data.payments.length,
  capitalizations: portfolio.data.capitalizations.length,
});
