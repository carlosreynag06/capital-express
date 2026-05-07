# Capital Express

Frontend prototype for a Puerto Plata money lending operation. This first phase is intentionally mock-data only and focuses on the core workflow:

- Dashboard financiero
- Clientes con ficha de detalle
- Asignación de préstamos
- Apertura de préstamo y cálculo de renovación
- Cuotas, liquidación mensual y reportes PDF simulados

## Stack

- Vite
- React
- TypeScript
- Lucide React
- Recharts
- Custom responsive CSS

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Notes

Liquidation is presented as a manual review flow. The UI separates principal recovery, gross profit, operating expenses, net profit, and partner distribution.
