import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('public/fonts', { recursive: true });
for (const name of ['Lato-Regular.ttf', 'Lato-Bold.ttf', 'OFL.txt']) {
  const response = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/lato/${name}`,
  );
  if (!response.ok) throw new Error(`Font download failed (${response.status})`);
  writeFileSync(`public/fonts/${name}`, Buffer.from(await response.arrayBuffer()));
}
console.log('Open Font License Lato fonts installed for self-contained PDF exports.');
