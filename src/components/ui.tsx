'use client';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, X, LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { initials, statusLabels } from '@/lib/model';
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-name">
        Capital <span className="brand-light">Express</span>
        <small>GESTIÓN DE PRÉSTAMOS</small>
      </span>
    </div>
  );
}
export function Avatar({
  name,
  index = 0,
  large = false,
}: {
  name: string;
  index?: number;
  large?: boolean;
}) {
  return (
    <span className={`avatar tone-${index % 5} ${large ? 'large' : ''}`}>{initials(name)}</span>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {statusLabels[status] || status}
    </span>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="head-actions">{children}</div>
    </div>
  );
}
export function Metric({
  title,
  value,
  caption,
  icon,
  accent = false,
}: {
  title: string;
  value: string;
  caption: React.ReactNode;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="metric-label">
        {title}
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="metric-caption">{caption}</div>
    </div>
  );
}
export function PanelHead({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {action || 'Ver todos'} <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Empty({
  title = 'No hay resultados',
  detail = 'Prueba con otros filtros.',
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="empty">
      <span>↗</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={30} />
      <p>Cargando tu cartera…</p>
    </div>
  );
}
export function Dialog({
  title,
  description,
  children,
  close,
  busy,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  close: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      className="dialog"
    >
      <div className="dialog-head">
        <div>
          <h2 id="dialog-title">{title}</h2>
          <p id="dialog-description">{description}</p>
        </div>
        <button disabled={busy} className="icon-btn" onClick={close} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function MovementIcon({ incoming = true }: { incoming?: boolean }) {
  return (
    <span className={`movement-icon ${incoming ? '' : 'out'}`}>
      {incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
    </span>
  );
}
