import { writeFileSync } from 'node:fs';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN in your local environment first.');
const headers = { Authorization: `Bearer ${token}` };
const response = await fetch('https://api.supabase.com/v1/projects', { headers });
if (!response.ok) throw new Error(`Could not list existing projects (${response.status})`);
const projects = await response.json();
const candidates = projects.filter((p) =>
  process.env.SUPABASE_PROJECT_REF
    ? p.id === process.env.SUPABASE_PROJECT_REF
    : p.name.toLowerCase() === 'capital express',
);
if (candidates.length !== 1)
  throw new Error('Set SUPABASE_PROJECT_REF to identify the existing Capital Express project.');
const project = candidates[0];
const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${project.id}/api-keys`, {
  headers,
});
if (!keyResponse.ok)
  throw new Error(`Could not obtain runtime configuration (${keyResponse.status})`);
const keys = await keyResponse.json(),
  anon = keys.find((k) => k.name === 'anon');
if (!anon) throw new Error('Project public key was not found.');
writeFileSync(
  '.env.local',
  `NEXT_PUBLIC_SUPABASE_URL=https://${project.id}.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon.api_key}\nSUPABASE_PROJECT_REF=${project.id}\nSUPABASE_ACCESS_TOKEN=${token}\n`,
);
console.log(
  `Connected existing project: ${project.name}. Configuration saved to ignored .env.local.`,
);
