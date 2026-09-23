import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
for (const name of ['recibo', 'estado']) {
  const pdf = await getDocument({
    data: new Uint8Array(readFileSync(`.local/screenshots/${name}.pdf`)),
    useSystemFonts: true,
  }).promise;
  let text = '';
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1.3 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    writeFileSync(`.local/screenshots/${name}-${n}.png`, canvas.toBuffer('image/png'));
    text += (await page.getTextContent()).items.map((i) => i.str).join(' ') + '\n';
  }
  assert(text.includes('Capital Express'));
  assert(text.includes(name === 'recibo' ? 'Recibo de pago' : 'Estado de cuenta'));
  assert(text.includes('Interés'));
  assert(!/NaN|undefined/.test(text));
  console.log(
    `PASS: ${name}, ${pdf.numPages} page(s), Spanish text and values extracted; pages rendered for inspection.`,
  );
  writeFileSync(`.local/screenshots/${name}.txt`, text);
}
