import {
  Portfolio,
  Loan,
  Payment,
  money,
  date,
  interest,
  nextDate,
  isOpen,
  reference,
  statusLabels,
  sum,
} from './model';
export async function downloadDocument(data: Portfolio, loan: Loan, payment?: Payment) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ putOnlyUsedFonts: true }),
    customer = data.customers.find((c) => c.id === loan.customer_id)!;
  const fontData = await Promise.all(
    ['Lato-Regular.ttf', 'Lato-Bold.ttf'].map(async (name) => {
      const response = await fetch(`/fonts/${name}`);
      if (!response.ok) throw new Error('No se pudo preparar el documento. Intenta nuevamente.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { name, data: btoa(binary) };
    }),
  );
  for (const font of fontData) {
    doc.addFileToVFS(font.name, font.data);
    doc.addFont(font.name, 'Lato', font.name.includes('Bold') ? 'bold' : 'normal');
  }
  doc.setFont('Lato', 'normal');
  const title = payment ? 'Recibo de pago' : 'Estado de cuenta',
    id = payment ? `REC-${String(payment.receipt).padStart(5, '0')}` : reference(loan);
  doc.setFillColor(18, 37, 48);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Capital Express', 16, 18);
  doc.setFontSize(10);
  doc.text(`${title} | ${id}`, 16, 29);
  doc.text(date(payment?.paid_on || data.today, true), 194, 29, { align: 'right' });
  doc.setTextColor(35, 50, 60);
  doc.setFontSize(13);
  doc.text(customer.full_name, 16, 53);
  doc.setFontSize(10);
  doc.text(`${customer.phone} | ${reference(loan)}`, 16, 61);
  const address = doc.splitTextToSize(customer.address, 175);
  doc.text(address, 16, 68);
  let y = 72 + address.length * 4;
  if (customer.is_demo) {
    doc.setTextColor(130, 100, 40);
    doc.text('Documento de demostración. Datos ficticios.', 16, y);
    y += 8;
    doc.setTextColor(35, 50, 60);
  }
  const addTable = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: 16, right: 16, top: 20, bottom: 20 },
      theme: 'striped',
      styles: { font: 'Lato', fontSize: 9, cellPadding: 3.5 },
      rowPageBreak: 'avoid',
      headStyles: { fillColor: [22, 111, 87] },
      columnStyles: { 0: { cellWidth: head.length === 2 ? 95 : 'auto' } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  };
  const section = (name: string) => {
    if (y > 235) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(name, 16, y);
    y += 5;
  };
  if (payment) {
    addTable(
      ['Detalle del pago', 'Monto / valor'],
      [
        ['Pago recibido', money(payment.amount)],
        ['Fecha del pago', date(payment.paid_on, true)],
        ['Forma de pago', payment.method],
        ['Interés pagado', money(payment.interest_paid)],
        ['Abono a capital', money(payment.principal_paid)],
        ['Capital antes del pago', money(payment.principal_before)],
        ['Interés antes del pago', money(payment.interest_before)],
        ['Tasa aplicada', `${payment.rate}%`],
        ['Capital pendiente', money(payment.principal_after)],
        ['Interés aún sin pagar', money(payment.interest_remaining)],
        [
          'Próximo pago',
          payment.principal_after + payment.interest_remaining === 0
            ? 'Préstamo saldado'
            : date(payment.next_due, true),
        ],
        ['Interés esperado del próximo período', money(payment.next_interest)],
      ],
    );
    if (payment.note) {
      section('Nota del pago');
      addTable(['Nota'], [[payment.note]]);
    }
  } else {
    addTable(
      ['Resumen del préstamo', 'Monto / valor'],
      [
        ['Monto prestado', money(loan.original_principal)],
        ['Desembolso', date(loan.disbursed_on, true)],
        ['Tasa vigente', `${loan.rate}%`],
        ['Inicio del ciclo vigente', date(loan.cycle_start, true)],
        ['Próximo pago', isOpen(loan) ? date(nextDate(data, loan), true) : 'Préstamo cerrado'],
        ['Capital pendiente', money(loan.principal)],
        ['Interés pendiente', money(interest(data, loan))],
        ['Saldo total', money(sum([loan.principal, interest(data, loan)], (x) => x))],
        ['Estado', statusLabels[loan.status]],
      ],
    );
    section('Pagos recibidos');
    const payments = data.payments.filter((p) => p.loan_id === loan.id);
    addTable(
      ['Fecha', 'Pago', 'Interés', 'Capital', 'Tasa'],
      payments.length
        ? payments.map((p) => [
            date(p.paid_on, true),
            money(p.amount),
            money(p.interest_paid),
            money(p.principal_paid),
            `${p.rate}%`,
          ])
        : [['Sin pagos', '', '', '', '']],
    );
    section('Vencimientos e interés capitalizado');
    const caps = data.capitalizations.filter((c) => c.loan_id === loan.id);
    addTable(
      ['Vencimiento', 'Interés debido', 'Interés pagado', 'Capitalizado'],
      caps.length
        ? caps.map((c) => [
            date(c.due_on, true),
            money(c.interest_due),
            money(c.interest_paid),
            money(c.amount),
          ])
        : [['Sin capitalizaciones', '', '', '']],
    );
    section('Renegociaciones');
    const restructures = data.restructurings.filter((r) => r.loan_id === loan.id);
    addTable(
      ['Fecha', 'Condiciones anteriores', 'Nuevas condiciones', 'Acuerdo'],
      restructures.length
        ? restructures.map((r) => [
            date(r.occurred_on, true),
            `${r.old_terms.rate}% | días ${r.old_terms.day_one}/${r.old_terms.day_two} | vence ${r.old_terms.next_due}`,
            `${r.new_terms.rate}% | días ${r.new_terms.day_one}/${r.new_terms.day_two} | vence ${r.new_terms.next_due}`,
            `${r.note}\nCapital: ${money(r.principal)}. Interés: ${money(r.interest)}.`,
          ])
        : [['Sin renegociaciones', '', '', '']],
    );
  }
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(105, 115, 120);
    doc.text('Capital Express | Montos en pesos dominicanos (RD$)', 16, 286);
    doc.text(`${i} / ${count}`, 194, 286, { align: 'right' });
  }
  doc.save(`${payment ? 'recibo' : 'estado'}-${id}.pdf`);
}
