import { readFileSync, readdirSync } from 'node:fs';
export async function query(sql) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}
const command = process.argv[2];
if (command === 'migrate') {
  await query(
    'create schema if not exists capital_migrations; create table if not exists capital_migrations.applied (name text primary key, applied_at timestamptz not null default now())',
  );
  const applied = await query('select name from capital_migrations.applied');
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if (applied.some((a) => a.name === file)) continue;
    await query(
      `begin;\n${readFileSync(`supabase/migrations/${file}`, 'utf8')}\ninsert into capital_migrations.applied(name) values ('${file}'); commit;`,
    );
    console.log(`Applied ${file}`);
  }
} else if (command === 'seed') {
  await query(readFileSync('supabase/seed.sql', 'utf8'));
  console.log('Development portfolio seeded.');
} else if (command === 'test') {
  console.log(await query(readFileSync('supabase/tests/ledger.sql', 'utf8')));
} else if (command === 'inspect') {
  console.log(
    await query("select table_name from information_schema.tables where table_schema='public';"),
  );
  console.log(
    await query(
      "select id, email_confirmed_at is not null as confirmed from auth.users where id='01ca5dde-c563-4e24-87d5-25e46e5fe3e8'",
    ),
  );
}
