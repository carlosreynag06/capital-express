'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Portfolio } from '@/lib/model';
import { Brand, Loading } from './ui';
import { Dashboard, Customers, LoanList, Payments, Collections, Reports } from './views';
import { CustomerProfile, DocumentView } from './profile';
import type { Action } from './forms';
const ActionForm = dynamic(() => import('./forms').then((m) => m.ActionForm));

const nav = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/prestamos', label: 'Préstamos', icon: Wallet },
  { href: '/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/cobros', label: 'Gestión de cobros', icon: ClipboardList },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
];
export function Application() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [data, setData] = useState<Portfolio | null>(null),
    [error, setError] = useState(''),
    [refreshing, setRefreshing] = useState(false),
    [action, setAction] = useState<Action | null>(null),
    [toast, setToast] = useState(''),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState('');
  const path = usePathname(),
    router = useRouter(),
    query = useSearchParams();
  useEffect(() => {
    try {
      const s = supabase();
      s.auth.getSession().then(({ data, error }) => {
        if (error) setError('No pudimos recuperar la sesión. Inicia sesión de nuevo.');
        setSession(data.session);
        setReady(true);
      });
      const { data: sub } = s.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (!session) setData(null);
      });
      return () => sub.subscription.unsubscribe();
    } catch (e) {
      setError((e as Error).message);
      setReady(true);
    }
  }, []);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase().rpc('portfolio_snapshot');
      if (error) throw error;
      setData(data as Portfolio);
      setError('');
    } catch (e) {
      setError((e as Error).message || 'No se pudo cargar la cartera. Intenta nuevamente.');
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    if (session) {
      void refresh();
      const timer = setInterval(() => {
        if (document.visibilityState === 'visible') void refresh();
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [session, refresh]);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function done(message: string, href?: string) {
    setAction(null);
    setToast(message);
    await refresh();
    if (href) router.push(href);
  }
  if (!ready) return <Loading />;
  if (!session) return <Login externalError={error} />;
  if (!data)
    return (
      <div className="startup">
        <Brand />
        {error ? (
          <div className="error-box">
            {error}
            <button className="btn" onClick={() => void refresh()}>
              Reintentar
            </button>
            <button className="btn" onClick={() => supabase().auth.signOut()}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <Loading />
        )}
      </div>
    );
  if (path.startsWith('/recibos/') || path.startsWith('/estados/'))
    return <DocumentView data={data} path={path} />;
  const section = nav.find((n) => (n.href === '/' ? path === '/' : path.startsWith(n.href)));
  const overdue = data.loans.filter((l) => l.status === 'overdue').length;
  const props = { data, onAction: setAction };
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="mobile-overlay"
          onClick={() => setMenu(false)}
          aria-label="Cerrar menú"
        />
      )}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Link href="/" aria-label="Capital Express, inicio">
          <Brand />
        </Link>
        <div className="workspace">
          <span className="workspace-icon">CE</span>
          <div>
            Capital Express<small>República Dominicana</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">PRINCIPAL</div>
        <nav>
          {nav.map((n) => (
            <Link className={section?.href === n.href ? 'active' : ''} key={n.href} href={n.href}>
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.href === '/cobros' && overdue > 0 && <b>{overdue}</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-symbol">
              <ShieldCheck size={21} />
            </span>
            <h3>Tu cartera, bajo control.</h3>
            <p>
              Cada movimiento cuenta.
              <br />
              Cada registro queda.
            </p>
            <Link href="/ayuda">
              Conoce tu espacio <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link className="support-link" href="/ayuda">
            <CircleHelp size={18} />
            Guía de uso
          </Link>
          <div className="owner">
            <span className="owner-avatar">CE</span>
            <div>
              Administración<small>Propietario</small>
            </div>
            <button
              className="icon-btn"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={() => supabase().auth.signOut()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>Mi espacio</span>
            <span className="slash">/</span>
            <strong>{section?.label || 'Guía de uso'}</strong>
          </div>
          <div className="topbar-actions">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/clientes?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Buscar en la cartera"
                placeholder="Buscar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <Link
              href="/cobros"
              className="notification"
              title={`${overdue} préstamos vencidos`}
              aria-label="Ver cobros pendientes"
            >
              <Bell size={19} />
              {overdue > 0 && <i />}
            </Link>
            <span className="topbar-divider" />
            <span className="owner-avatar small">CE</span>
          </div>
        </header>
        <main className="content">
          {error && (
            <div className="error-box">
              {error}
              <button onClick={() => void refresh()}>Reintentar</button>
            </div>
          )}
          {path === '/' ? (
            <Dashboard {...props} />
          ) : path === '/clientes' ? (
            <Customers key={query.toString()} {...props} />
          ) : path.startsWith('/clientes/') ? (
            <CustomerProfile
              key={`${path}?${query.toString()}`}
              {...props}
              id={path.split('/')[2]}
            />
          ) : path === '/prestamos' ? (
            <LoanList {...props} />
          ) : path === '/pagos' ? (
            <Payments {...props} />
          ) : path === '/cobros' ? (
            <Collections {...props} />
          ) : path === '/reportes' ? (
            <Reports {...props} />
          ) : path === '/ayuda' ? (
            <Help />
          ) : (
            <div className="empty">
              <h1>Página no encontrada</h1>
              <Link href="/">Volver al resumen</Link>
            </div>
          )}
          <footer className="page-footer">
            <span>
              © {new Date().getFullYear()} Capital Express <i /> Todos los montos en pesos
              dominicanos
            </span>
            <span className="connection">
              <i className={refreshing ? 'syncing' : ''} />
              {refreshing ? 'Actualizando…' : 'Conectado a Supabase'}
            </span>
          </footer>
        </main>
      </div>
      {action && (
        <ActionForm action={action} data={data} close={() => setAction(null)} done={done} />
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={18} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function Login({ externalError }: { externalError: string }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-brand">
        <Brand />
        <div className="login-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="login-emblem">
            <ArrowUpRight size={90} strokeWidth={1.3} />
          </div>
          <div className="floating-tag">
            <ShieldCheck size={17} /> Cada movimiento, respaldado.
          </div>
        </div>
        <div className="login-pitch">
          <span className="eyebrow">CAPITAL QUE IMPULSA</span>
          <h1>
            Más claridad.
            <br />
            Mejores decisiones.
          </h1>
          <p>
            Todo lo que necesitas para cuidar de tus clientes
            <br />y hacer crecer tu cartera, en un solo lugar.
          </p>
        </div>
        <small>Hecho para tu negocio. Pensado en tu tranquilidad.</small>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <span className="login-icon">
            <Wallet size={25} />
          </span>
          <span className="eyebrow">BIENVENIDO A TU ESPACIO</span>
          <h2>Vamos a seguir creciendo.</h2>
          <p>Inicia sesión para gestionar tu cartera.</p>
          <form onSubmit={submit}>
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="username"
                required
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {(error || externalError) && (
              <div role="alert" className="error-box">
                {error || externalError}
              </div>
            )}
            <button className="btn primary login-submit" disabled={busy}>
              {busy ? 'Iniciando sesión…' : 'Entrar a Capital Express'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-safe">
            <ShieldCheck size={15} /> Acceso privado y seguro
          </div>
        </div>
        <span className="login-copyright">Capital Express · República Dominicana</span>
      </section>
    </div>
  );
}
function Help() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">TU ESPACIO DE TRABAJO</div>
          <h1>Una cartera más clara.</h1>
          <p>Lo esencial para trabajar con Capital Express.</p>
        </div>
      </div>
      <div className="help-grid">
        {[
          {
            icon: Users,
            title: 'Clientes y garantes',
            text: 'Registra los datos del cliente y su garante. Abre el nombre del cliente para consultar su perfil completo. Archivar conserva toda la historia y requiere saldar los préstamos pendientes.',
          },
          {
            icon: CalendarDays,
            title: 'Fechas que sí coinciden',
            text: 'El desembolso y el inicio del ciclo son fechas independientes. El calendario estándar vence los días 15 y 30; en febrero se usa el último día del mes. Puedes negociar otros dos días.',
          },
          {
            icon: CreditCard,
            title: 'Cada pago, bien aplicado',
            text: 'Primero se cubre el interés pendiente. El resto abona a capital. Si el pago no cubre todo el interés, se muestra el faltante. El interés siguiente se calcula sobre el capital actualizado.',
          },
          {
            icon: Wallet,
            title: 'Interés capitalizado',
            text: 'Al día siguiente de un vencimiento, el interés que quedó sin pagar se suma al capital. No se cobran cargos por mora. Cada capitalización queda registrada por separado y nunca cuenta como dinero cobrado.',
          },
          {
            icon: ClipboardList,
            title: 'Renegociar sin perder historia',
            text: 'Una renegociación conserva el interés ya calculado y cambia las condiciones para los períodos siguientes. El interés pendiente pasa a la nueva fecha acordada. Las promesas de pago en notas no cambian el calendario.',
          },
          {
            icon: BarChart3,
            title: 'Cobros y reportes',
            text: 'Los reportes de cobros usan la fecha de cada transacción. El capital pendiente y el interés pendiente representan el saldo actual. Descarga CSV, recibos y estados de cuenta para tus archivos.',
          },
        ].map((x) => (
          <section className="panel help-card" key={x.title}>
            <x.icon size={25} />
            <h2>{x.title}</h2>
            <p>{x.text}</p>
          </section>
        ))}
      </div>
      <div className="info-strip">
        <ShieldCheck size={20} />
        <span>
          Los registros marcados como demostración son ficticios. Los préstamos reales usan el mismo
          proceso de cálculo y registro.
        </span>
      </div>
    </>
  );
}
