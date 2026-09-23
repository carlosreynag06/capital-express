import { Application } from '@/components/application';
import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando Capital Express…</p>}>
      <Application />
    </Suspense>
  );
}
