# Capital Express

Aplicación de gestión de clientes y préstamos para Capital Express, República Dominicana. Interfaz en español, autenticación con Supabase y un libro de movimientos calculado en PostgreSQL.

## Ejecutar

Requiere Node.js 24 LTS y npm. Desde esta carpeta:

```powershell
npm.cmd install
npm.cmd run dev
```

Abre **http://127.0.0.1:3000** e inicia sesión con el correo y la contraseña del propietario existente en Supabase. No se crea otra cuenta de autenticación.

El entorno local ya está conectado al proyecto **Capital Express** (`dulxhtufmqmmmxdsinhc`). `.env.local` contiene la configuración y está excluido de Git. El servidor solo necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; el token de administración es exclusivo de las herramientas de configuración y pruebas.

Para una nueva instalación, copia `.env.example` a `.env.local` e introduce las variables del mismo proyecto. También puedes definir `SUPABASE_ACCESS_TOKEN` en el entorno y ejecutar `node scripts/connect.mjs`: localiza el proyecto existente y escribe la configuración sin imprimir las credenciales. No crea proyectos.

Si tu equipo utiliza certificados corporativos, Node 24 admite `NODE_OPTIONS=--use-system-ca`. No desactives la validación TLS.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

## Funciones

- Resumen de cartera con capital, interés pendiente, interés cobrado, vencimientos, pagos recientes y préstamos con más del 75% saldado.
- Clientes con garante obligatorio, edición y archivo reversible. El archivo no elimina la historia y requiere cerrar los préstamos pendientes.
- Perfil del cliente en una página completa, con todos sus préstamos actuales y anteriores.
- Creación de préstamos con monto, tasa negociable, desembolso e inicio del ciclo independientes.
- Registro de pagos con desglose previo, aviso de interés parcial y protección contra envíos duplicados.
- Cierre automático de períodos e interés capitalizado, sin cargos por mora.
- Renegociación de tasa y calendario con conservación de condiciones anteriores.
- Notas de llamadas, WhatsApp, visitas y acuerdos. Registrar una nota no envía mensajes.
- Recibos y estados de cuenta imprimibles y descargables en PDF, con fuentes incorporadas.
- Reportes filtrados por fecha, cliente y estado; antigüedad de la cartera y exportación CSV compatible con Excel.

## Reglas contables

1. **Tasa inicial:** 10% por período, editable por préstamo. Las tasas permiten hasta cuatro decimales.
2. **Calendario estándar:** días 15 y 30. En febrero se sustituye el día 30 por el último día del mes. Se pueden negociar otros dos días mensuales. No se suman 15 días sucesivamente.
3. **Primer período:** inicia en la fecha elegida, independientemente del desembolso. Su vencimiento es la siguiente fecha del calendario acordado.
4. **Pago:** cubre primero el interés pendiente del período abierto; el resto reduce capital. Un segundo abono en el mismo período no vuelve a cobrar interés ya pagado.
5. **Período siguiente:** el interés se calcula sobre el capital que quedó al cerrar el período, con redondeo decimal a dos posiciones.
6. **Vencimiento:** se permite pagar durante todo el día de vencimiento, en `America/Santo_Domingo`. Al día siguiente, el interés sin pagar se capitaliza una sola vez. No se cobra ni registra una penalidad.
7. **Estado vencido:** conserva la primera fecha de atraso hasta cubrir el interés vigente o formalizar una renegociación. El préstamo solo se salda cuando capital e interés llegan a cero.
8. **Renegociación:** conserva el interés ya calculado; su remanente pasa a la nueva fecha. La nueva tasa se usa en los períodos siguientes. Los períodos y cálculos anteriores no se reescriben.
9. **Fechas históricas:** no se permiten pagos futuros ni pagos anteriores al último movimiento o a un período ya cerrado. No se reescribe un libro cerrado para insertar un pago retroactivo.
10. **Reportes:** interés cobrado significa dinero recibido. Las capitalizaciones se muestran aparte. Los filtros temporales se aplican a los movimientos; los saldos pendientes son actuales.

Los cálculos que cambian saldos se realizan exclusivamente en funciones PostgreSQL con `numeric`. Las previsiones y sumas del cliente usan `decimal.js`. Cada préstamo se bloquea durante una operación financiera. Una clave de envío evita duplicar pagos, incluso en solicitudes simultáneas; un reintento con valores distintos se rechaza.

## Base de datos y autorización

Las migraciones están en `supabase/migrations/` y se aplican en orden con:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

La herramienta registra las migraciones ejecutadas en `capital_migrations.applied`. Usa la API de administración del proyecto existente. El esquema está dividido en `customers`, `cosigners`, `loans`, `periods`, `payments`, `capitalizations`, `restructurings`, `loan_events`, `collection_notes` y `app_owners`.

El usuario **01ca5dde-c563-4e24-87d5-25e46e5fe3e8** es el propietario inicial. Todas las tablas tienen RLS. El rol autenticado puede leer solo si está autorizado como propietario y no puede escribir directamente en las tablas. Cada función pública comprueba la autorización; las funciones internas no son ejecutables por usuarios de la API. No hay sistema de empleados, nómina ni RR. HH.

Un trabajo `pg_cron` cierra períodos vencidos a las **00:05 de Santo Domingo**. La consulta autenticada de cartera también realiza una puesta al día antes de devolver un único conjunto coherente de registros. Por ello los cierres se recuperan si el proyecto estuvo temporalmente suspendido.

## Datos de demostración

`supabase/seed.sql` crea exactamente **15 clientes ficticios**, todos con garante, y **20 préstamos** con pagos, capitalizaciones, renegociaciones y notas coherentes. Incluye las situaciones del encargo: pago parcial de interés, morosidad prolongada, tasas negociadas, un préstamo casi saldado, pagos solo de interés y clientes recurrentes.

El proceso es repetible sin duplicados: si ya existen datos de demostración, no vuelve a insertarlos. Las fechas se calculan con relación a la fecha de ejecución. Los saldos evolucionan con los cierres posteriores. Los registros se identifican con `is_demo`; los formularios crean datos reales con `is_demo=false`.

No elimines directamente movimientos de producción. Para retirar únicamente los datos ficticios, existe `supabase/remove_demo.sql`, que valida su identificación y requiere ejecución explícita de un administrador. No se ejecuta desde la aplicación ni desde el proceso de migración.

## Verificación

```powershell
npm.cmd run test:db
npm.cmd run test:auth
npm.cmd run test:concurrency
# Con el servidor local ejecutándose:
npm.cmd run test:e2e
npm.cmd run test:pdf
```

- `test:db`: pruebas transaccionales con rollback de fechas, reparto de pagos, capitalización, interés parcial, historial, conciliación y aislamiento RLS de un usuario no autorizado.
- `test:auth`: verifica al propietario existente mediante un enlace de autenticación generado localmente; no envía correo, no cambia la contraseña ni crea otro usuario. Comprueba bloqueo anónimo, funciones internas y escrituras directas. Guarda una sesión temporal en `.local/`, excluida de Git.
- `test:concurrency`: comprueba reintentos simultáneos, pagos concurrentes distintos, precisión y límites. Crea y retira solo su cliente temporal.
- `test:e2e`: usa Chrome y Playwright para probar creación, edición, pagos, PDF, notas, renegociación, saldos, archivo, historial, búsqueda, reportes y vista móvil. Retira su cliente temporal incluso si falla una prueba. Cierra sesión al finalizar; para otra ejecución, vuelve a ejecutar `test:auth`.
- `test:pdf`: extrae texto y renderiza las exportaciones de prueba para inspección visual.

Las capturas y los documentos de prueba están en `.local/screenshots/`, fuera del repositorio. Las herramientas administrativas y las pruebas necesitan el token de configuración; el funcionamiento normal de la aplicación no lo utiliza.

## Organización

```text
src/app/                  Página, configuración visual y estilos adaptables
src/components/           Navegación, vistas, perfiles y formularios
src/lib/                  Cliente Supabase, tipos, decimales, CSV y PDF
supabase/migrations/      Esquema, restricciones, autorización y reglas financieras
supabase/seed.sql          Cartera ficticia reconciliada
supabase/tests/           Pruebas del libro de movimientos y RLS
scripts/                 Conexión, migración y verificación
public/fonts/            Fuentes PDF con licencia SIL Open Font License
```

Repositorio: **https://github.com/carlosreynag06/capital-express**, rama `main`.

La aplicación está preparada para ejecutarse localmente. Publicarla en un dominio es un paso independiente; configura únicamente las dos variables públicas de Supabase en el entorno de ejecución y usa HTTPS.
