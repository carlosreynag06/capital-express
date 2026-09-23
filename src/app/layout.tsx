import type { Metadata } from 'next';
import './globals.css';
import './readability.css';
export const metadata: Metadata = {
  title: 'Capital Express · Gestión de préstamos',
  description:
    'Tu cartera, bajo control. Gestión de clientes, préstamos y cobros en República Dominicana.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-DO">
      <body>{children}</body>
    </html>
  );
}
