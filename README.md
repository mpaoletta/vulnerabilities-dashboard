# vulnerabilities-dashboard

Dashboard web para seguir y operar la remediación automatizada de vulnerabilidades que ejecuta
`sbom-security-orchestrator` (review → fixdeps → fixcode → fixsecrets). Implementa el handoff de
diseño de `docs/design_handoff_remediacion_dashboard/`, con alta fidelidad visual y de comportamiento.

- **Portfolio** (`#/dashboard`): KPIs, distribuciones y la tabla de repositorios, filtrable y ordenable.
- **Proyecto** (`#/repo/:slug`): perfil del repo, selección de vulnerabilidades, estimación en vivo y
  ejecución secuencial simulada de las fases.
- **Remediados** (`#/remediados`): resultado por repo y checklist de QA de los flujos impactados.
- **Guía / Modo demo**: tour de 21 pasos, manual («Ver guía») o en kiosco con loop («Modo demo» o `#/tour`).

Stack: React 19 + TypeScript + Vite, con CSS Modules y DM Sans servida desde el bundle
(`@fontsource-variable/dm-sans`), así que funciona offline. No usa router ni librería de estado.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (hace proxy de `/api` a `127.0.0.1:8000`) |
| `npm run build` | Type-check (`tsc -b`) y build de producción en `dist/` |
| `npm run preview` | Sirve el build |
| `npm test` | Tests (Vitest + Testing Library, jsdom) |
| `npm run test:watch` | Tests en modo watch |
| `npm run lint` | oxlint |

## Estructura

```
src/
  data/        acceso a datos y tipos del modelo (único punto que conoce la fuente)
  domain/      lógica pura portada del prototipo: format, items, selection, estimate, phases, flows
  app/         shell: App, Header, routing por hash, store (useReducer) y runner de fases
  components/  primitivos: Card, Kpi, Pill, StackedBar, MicroBar, PhaseRing, Donut, Hexagon, TriCheckbox
  views/       portfolio/, project/, remediated/
  tour/        guion, geometría del spotlight, engine y overlay de la guía
  styles/      tokens del DS redbee (redbee-ds.css) y alias de la UI (tokens.css)
```

Persistencia en `localStorage`: `rb-theme` (tema) y `rb-qa-v2` (checks de QA). La selección y las
ejecuciones de fases viven sólo en memoria.

## Fuente de datos (demo)

Hoy los datos salen de `public/demo-data.js`, una copia de
`docs/design_handoff_remediacion_dashboard/prototype/demo-data.js` que define `window.RB_DATA`
(70 repos, todos con detalle). Se sirve como asset estático, fuera del bundle.

## Swap a la API

El único módulo que conoce la fuente es **`src/data/source.ts`**: `loadDataset(): Promise<Dataset>`
inyecta el script y devuelve `window.RB_DATA` tipado. Para conectar `vulnerabilities-api` alcanza con
reemplazar esa función por un `fetch('/api/…')` que devuelva el mismo `Dataset`. Si el contrato de la
API difiere, se ajusta `src/data/types.ts` o se adapta la respuesta dentro de `source.ts`. El resto de
la app consume el dataset a través de `useDataset()` y no cambia.
