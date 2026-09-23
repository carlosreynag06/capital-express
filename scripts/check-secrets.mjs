import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const blocked = [];
for (const name of files) {
  if ((name.startsWith('.env') && name !== '.env.example') || name.startsWith('.local/'))
    blocked.push(name);
  if (/\.(ttf|png|jpg|woff2?)$/.test(name)) continue;
  const content = execFileSync('git', ['show', `:${name}`], { encoding: 'utf8' });
  if (
    /sbp_[a-f0-9]{40,}|sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
      content,
    )
  )
    blocked.push(name);
  for (const token of content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    try {
      if (
        JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role'
      )
        blocked.push(name);
    } catch {}
  }
}
if (blocked.length)
  throw new Error(
    `Potential private credential or local file is staged: ${[...new Set(blocked)].join(', ')}`,
  );
if (process.env.SUPABASE_ACCESS_TOKEN) {
  function inspect(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) inspect(full);
      else if (readFileSync(full).includes(Buffer.from(process.env.SUPABASE_ACCESS_TOKEN)))
        throw new Error('Setup credential found in browser build.');
    }
  }
  inspect('.next/static');
}
console.log(
  `PASS: ${files.length} staged files scanned; no private credentials or local sessions. Browser build contains no setup token.`,
);
