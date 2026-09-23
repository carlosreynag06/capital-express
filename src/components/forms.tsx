'use client';
import { useState } from 'react';
import Decimal from 'decimal.js';
import { ArrowRight, Check, Info, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Portfolio, interest, isOpen, money, nextScheduled, reference } from '@/lib/model';
import { Dialog } from './ui';
export type Action = {
  type: 'customer' | 'editCustomer' | 'loan' | 'payment' | 'restructure' | 'note' | 'archive';
  customerId?: string;
  loanId?: string;
};
export function ActionForm({
  action,
  data,
  close,
  done,
}: {
  action: Action;
  data: Portfolio;
  close: () => void;
  done: (message: string, href?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [loanId, setLoanId] = useState(action.loanId || data.loans.find(isOpen)?.id || ''),
    [amount, setAmount] = useState(''),
    [rate, setRate] = useState(String(data.loans.find((l) => l.id === action.loanId)?.rate || 10)),
    [start, setStart] = useState(data.today),
    [disbursed, setDisbursed] = useState(data.today),
    [one, setOne] = useState(data.loans.find((l) => l.id === action.loanId)?.day_one || 15),
    [two, setTwo] = useState(data.loans.find((l) => l.id === action.loanId)?.day_two || 30),
    [requestId] = useState(() => crypto.randomUUID());
  const customer = data.customers.find((c) => c.id === action.customerId),
    guarantor = data.cosigners.find((c) => c.customer_id === action.customerId),
    loan = data.loans.find((l) => l.id === loanId),
    due = loan ? interest(data, loan) : 0;
  const amountDecimal = new Decimal(amount || 0),
    interestPart = Decimal.min(amountDecimal, due),
    principalPart = Decimal.max(amountDecimal.minus(due), 0),
    remaining = Decimal.max(new Decimal(due).minus(amountDecimal), 0),
    nextInterest = loan
      ? Decimal.max(new Decimal(loan.principal).minus(principalPart), 0)
          .times(loan.rate)
          .div(100)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toNumber()
      : 0;
  const partial = action.type === 'payment' && amountDecimal.gt(0) && amountDecimal.lt(due);
  const titles = {
    customer: ['Nuevo cliente', 'Empecemos con sus datos y los de su garante.'],
    editCustomer: ['Editar cliente', 'Mantén sus datos de contacto actualizados.'],
    loan: ['Nuevo préstamo', 'Define el monto, las fechas y las condiciones acordadas.'],
    payment: ['Registrar pago', 'Cada peso se aplica primero al interés y luego al capital.'],
    restructure: [
      'Renegociar préstamo',
      'Acuerda nuevas condiciones conservando toda la historia.',
    ],
    note: ['Registrar contacto', 'Deja constancia de la conversación y los acuerdos.'],
    archive: [
      customer?.archived ? 'Restaurar cliente' : 'Archivar cliente',
      'Sus préstamos, recibos y movimientos se conservarán.',
    ],
  };
  const validCalendar = one >= 1 && one <= 27 && two > one && two <= 31;
  const next = validCalendar ? nextScheduled(start, one, two) : '';
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const s = (key: string) => String(f.get(key) || '').trim();
    let fn = '',
      params: Record<string, unknown> = {},
      message = '',
      href = '';
    try {
      if (action.type === 'customer' || action.type === 'editCustomer') {
        fn = 'save_customer';
        params = {
          p_id: action.customerId || null,
          p_name: s('name'),
          p_phone: s('phone'),
          p_address: s('address'),
          p_cosigner: s('cosigner'),
          p_cosigner_phone: s('cosigner_phone'),
          p_cosigner_address: s('cosigner_address'),
        };
        message = 'Los datos del cliente se guardaron correctamente.';
      }
      if (action.type === 'loan') {
        fn = 'create_loan';
        params = {
          p_customer: s('customer'),
          p_amount: amount,
          p_rate: rate,
          p_disbursed: disbursed,
          p_start: start,
          p_one: one,
          p_two: two,
        };
        message = 'Préstamo creado correctamente.';
        href = `/clientes/${s('customer')}`;
      }
      if (action.type === 'payment') {
        fn = 'record_payment';
        params = {
          p_loan: loanId,
          p_amount: amount,
          p_date: s('date'),
          p_method: s('method'),
          p_note: s('note'),
          p_request: requestId,
        };
        message = 'Pago registrado. Tu recibo está listo.';
      }
      if (action.type === 'restructure') {
        fn = 'restructure_loan';
        params = {
          p_loan: action.loanId,
          p_rate: rate,
          p_start: start,
          p_due: next,
          p_one: one,
          p_two: two,
          p_note: s('note'),
        };
        message = 'Las nuevas condiciones quedaron registradas.';
      }
      if (action.type === 'note') {
        fn = 'add_note';
        params = {
          p_customer: s('customer'),
          p_type: s('contact_type'),
          p_note: s('note'),
          p_promised: s('promised') || null,
          p_amount: s('promised_amount') || null,
        };
        message = 'Contacto registrado en el historial.';
      }
      if (action.type === 'archive') {
        fn = 'archive_customer';
        params = { p_id: action.customerId, p_archived: !customer?.archived };
        message = customer?.archived
          ? 'Cliente restaurado.'
          : 'Cliente archivado. Su historia se conserva.';
      }
      const { data: result, error } = await supabase().rpc(fn, params);
      if (error) throw error;
      if (action.type === 'customer') href = `/clientes/${result}`;
      if (action.type === 'payment') href = `/recibos/${result}`;
      await done(message, href || undefined);
    } catch (e) {
      const raw = (e as Error).message;
      setError(
        /constraint|invalid input|violates|permission denied|Failed to fetch/i.test(raw)
          ? 'No se pudo guardar. Revisa los datos y tu conexión; luego intenta de nuevo.'
          : raw || 'Ocurrió un error al guardar. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }
  const customerSelect = (
    <label>
      Cliente
      <select name="customer" required defaultValue={action.customerId || ''}>
        <option value="" disabled>
          Selecciona un cliente
        </option>
        {data.customers
          .filter((c) => !c.archived)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
      </select>
    </label>
  );
  const schedule = (
    <>
      <div className="form-section-title">Calendario de pagos</div>
      <div className="form-grid">
        <label>
          Primer día del mes
          <input
            aria-label="Primer día del mes"
            type="number"
            required
            min="1"
            max="27"
            value={one}
            onChange={(e) => setOne(Number(e.target.value))}
          />
        </label>
        <label>
          Segundo día del mes
          <input
            type="number"
            required
            min={one + 1}
            max="31"
            value={two}
            onChange={(e) => setTwo(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="form-hint">
        En meses cortos se usa el último día del mes. Las fechas no se desplazan al sumar días.
      </div>
    </>
  );
  return (
    <Dialog
      title={titles[action.type][0]}
      description={titles[action.type][1]}
      close={close}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="dialog-body">
          <fieldset disabled={busy}>
            {(action.type === 'customer' || action.type === 'editCustomer') && (
              <>
                <div className="form-section-title">Datos del cliente</div>
                <label>
                  Nombre completo
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={150}
                    defaultValue={customer?.full_name}
                    placeholder="Nombre y apellidos"
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    name="phone"
                    type="tel"
                    required
                    minLength={7}
                    maxLength={30}
                    defaultValue={customer?.phone}
                    placeholder="(809) 000-0000"
                  />
                </label>
                <label>
                  Dirección
                  <input
                    name="address"
                    required
                    minLength={3}
                    maxLength={500}
                    defaultValue={customer?.address}
                    placeholder="Calle, número, sector y ciudad"
                  />
                </label>
                <div className="form-section-title">
                  Datos del garante <span>Obligatorio</span>
                </div>
                <label>
                  Nombre completo del garante
                  <input
                    name="cosigner"
                    required
                    minLength={2}
                    maxLength={150}
                    defaultValue={guarantor?.full_name}
                  />
                </label>
                <label>
                  Teléfono del garante
                  <input
                    type="tel"
                    name="cosigner_phone"
                    required
                    minLength={7}
                    maxLength={30}
                    defaultValue={guarantor?.phone}
                  />
                </label>
                <label>
                  Dirección del garante
                  <input
                    name="cosigner_address"
                    required
                    minLength={3}
                    maxLength={500}
                    defaultValue={guarantor?.address}
                  />
                </label>
              </>
            )}
            {action.type === 'loan' && (
              <>
                {customerSelect}
                <div className="form-grid">
                  <label>
                    Monto prestado (RD$)
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999999"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                  <label>
                    Interés por período (%)
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      max="100"
                      required
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Fecha de desembolso
                    <input
                      type="date"
                      required
                      max={data.today}
                      value={disbursed}
                      onChange={(e) => {
                        setDisbursed(e.target.value);
                        if (start < e.target.value) setStart(e.target.value);
                      }}
                    />
                  </label>
                  <label>
                    Inicio del ciclo de pago
                    <input
                      type="date"
                      required
                      min={disbursed}
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-hint">
                  El interés inicia con el ciclo acordado, aunque el dinero se entregue antes.
                </div>
                {schedule}
                <div className="payment-preview">
                  <div>
                    <span>Primer pago</span>
                    <strong>{next || 'Revisa los días'}</strong>
                  </div>
                  <div>
                    <span>Interés del primer período</span>
                    <strong>
                      {money(
                        new Decimal(amount || 0)
                          .times(rate || 0)
                          .div(100)
                          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                          .toNumber(),
                      )}
                    </strong>
                  </div>
                </div>
              </>
            )}
            {action.type === 'payment' && (
              <>
                <label>
                  Préstamo
                  <select value={loanId} onChange={(e) => setLoanId(e.target.value)} required>
                    {data.loans.filter(isOpen).map((l) => (
                      <option key={l.id} value={l.id}>
                        {data.customers.find((c) => c.id === l.customer_id)?.full_name} ·{' '}
                        {reference(l)}
                      </option>
                    ))}
                  </select>
                </label>
                {loan && (
                  <div className="loan-balance-preview">
                    <span>
                      Capital pendiente<strong>{money(loan.principal)}</strong>
                    </span>
                    <span>
                      Interés pendiente<strong>{money(due)}</strong>
                    </span>
                  </div>
                )}
                <label>
                  Monto recibido (RD$)
                  <input
                    autoFocus
                    className="amount-input"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    max={loan ? new Decimal(loan.principal).plus(due).toNumber() : 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Fecha del pago
                    <input
                      type="date"
                      name="date"
                      required
                      max={data.today}
                      min={loan?.disbursed_on}
                      defaultValue={data.today}
                    />
                  </label>
                  <label>
                    Forma de pago
                    <select name="method">
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                      <option>Depósito</option>
                    </select>
                  </label>
                </div>
                <div className="payment-preview">
                  <h3>Así se aplicará este pago</h3>
                  <div>
                    <span>Al interés pendiente</span>
                    <strong>{money(interestPart.toNumber())}</strong>
                  </div>
                  <div>
                    <span>Abono a capital</span>
                    <strong>{money(principalPart.toNumber())}</strong>
                  </div>
                  <div className="preview-total">
                    <span>Capital después del pago</span>
                    <strong>
                      {money(
                        Decimal.max(
                          new Decimal(loan?.principal || 0).minus(principalPart),
                          0,
                        ).toNumber(),
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Interés del próximo período</span>
                    <strong>{money(nextInterest)}</strong>
                  </div>
                </div>
                {partial && (
                  <div className="warning-box">
                    <TriangleAlert size={20} />
                    <span>
                      Este pago no cubre todo el interés. Quedarán{' '}
                      <strong>{money(remaining.toNumber())}</strong> pendientes. Si no se pagan al
                      vencimiento, se sumarán al capital.
                    </span>
                  </div>
                )}
                <label>
                  Nota (opcional)
                  <textarea
                    name="note"
                    maxLength={2000}
                    placeholder="Referencia de transferencia u otro detalle"
                  />
                </label>
                <div className="form-hint">
                  El registro se conserva en el historial. Revisa el monto antes de confirmar.
                </div>
              </>
            )}
            {action.type === 'restructure' && (
              <>
                <div className="info-strip small">
                  <Info size={18} />
                  <span>
                    El interés ya calculado se conserva y pasa a la nueva fecha de pago. La nueva
                    tasa se aplica a los períodos siguientes.
                  </span>
                </div>
                <label>
                  Nueva tasa por período (%)
                  <input
                    type="number"
                    required
                    step="0.0001"
                    min="0.0001"
                    max="100"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </label>
                <label>
                  Nuevo inicio del ciclo
                  <input
                    type="date"
                    required
                    min={data.today}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                {schedule}
                <div className="payment-preview">
                  <div>
                    <span>Nuevo próximo pago</span>
                    <strong>{next}</strong>
                  </div>
                  <div>
                    <span>Interés que se conserva</span>
                    <strong>{money(due)}</strong>
                  </div>
                </div>
                <label>
                  Motivo o acuerdo (opcional)
                  <textarea
                    name="note"
                    maxLength={2000}
                    placeholder="Describe lo acordado con el cliente"
                  />
                </label>
                <label className="check-label">
                  <input type="checkbox" required />
                  Confirmo las nuevas condiciones acordadas con el cliente.
                </label>
              </>
            )}
            {action.type === 'note' && (
              <>
                {customerSelect}
                <label>
                  Tipo de contacto
                  <select name="contact_type">
                    <option>Llamada</option>
                    <option>WhatsApp</option>
                    <option>Visita a la oficina</option>
                    <option>Contacto con garante</option>
                    <option>Acuerdo de pago</option>
                    <option>Sin respuesta</option>
                  </select>
                </label>
                <label>
                  Nota
                  <textarea
                    required
                    name="note"
                    maxLength={2000}
                    placeholder="¿Qué se conversó o acordó?"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Promesa de pago (opcional)
                    <input type="date" name="promised" />
                  </label>
                  <label>
                    Monto prometido (RD$)
                    <input type="number" name="promised_amount" step="0.01" min="0.01" />
                  </label>
                </div>
                <div className="info-strip small">
                  <Info size={18} />
                  <span>Una promesa de pago no modifica el calendario oficial del préstamo.</span>
                </div>
              </>
            )}
            {action.type === 'archive' && (
              <div className="archive-confirm">
                <ShieldCheck size={35} />
                <h3>
                  {customer?.archived ? 'Restaurar a' : 'Archivar a'} {customer?.full_name}
                </h3>
                <p>
                  {customer?.archived
                    ? 'Volverá a aparecer entre tus clientes activos.'
                    : 'Dejará de aparecer entre los clientes activos. Esta acción se puede deshacer y no elimina registros financieros.'}
                </p>
              </div>
            )}
          </fieldset>
          {error && (
            <div role="alert" className="error-box">
              {error}
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button type="button" className="btn" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button
            className="btn primary"
            disabled={
              busy ||
              ((action.type === 'loan' || action.type === 'restructure') && !validCalendar) ||
              (action.type === 'payment' && !loan)
            }
          >
            {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{' '}
            {busy
              ? 'Guardando…'
              : action.type === 'payment'
                ? 'Confirmar pago'
                : action.type === 'archive'
                  ? 'Confirmar'
                  : action.type === 'loan'
                    ? 'Crear préstamo'
                    : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
