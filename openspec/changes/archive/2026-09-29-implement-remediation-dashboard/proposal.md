## Why

`vulnerabilities-dashboard` hoy es la semilla vacía de Vite. Tenemos un handoff de diseño
hi-fi y final (`docs/design_handoff_remediacion_dashboard`) que especifica una UI completa
para seguir y operar la remediación que ejecuta `sbom-security-orchestrator`
(review → fixdeps → fixcode → fixsecrets). La queremos implementada **a rajatabla** en
React + TypeScript antes de modelar la API: si la UI queda cerrada sobre el dataset de demo,
el contrato que le pidamos a `vulnerabilities-api` en el próximo change sale de lo que la
pantalla realmente consume, no de suposiciones.

## What Changes

- Reemplazar el contenido de la semilla (`src/App.tsx`, `src/App.css`, `src/index.css`, assets
  de ejemplo) por la aplicación del handoff.
- **Shell global** (handoff §«Layout global» y §«Header»): header sticky con isotipo redbee,
  título, nav Portfolio/Remediados, leyenda de estados, botones «Ver guía», «Modo demo» y
  tema claro/oscuro. Routing por hash: `#/dashboard`, `#/repo/:slug`, `#/remediados`, `#/tour`.
- **Vista Portfolio** (§«Vista 1»): 5 KPIs, 4 distribuciones, vulnerabilidades por tipo,
  complejidad ciclomática en escala log y tabla de repositorios filtrable y ordenable, con el
  anillo de progreso de 4 fases.
- **Vista Proyecto** (§«Vista 2»): header y facts del repo, hero (tipo, tamaño/complejidad,
  potencial de remediación), scatter del portfolio, plan por nivel, grilla de selección con
  tabs, grupos colapsables y acciones masivas, panel de **estimación en vivo**, **ejecución
  secuencial simulada** de fases y franja de cierre.
- **Vista Remediados** (§«Vista 3»): una tarjeta por repo remediado con resultados, estimado
  por fase, PR simulado y checklist de QA de los flujos impactados, persistida en
  `localStorage`.
- **Guía interactiva y Modo demo** (§«Guía interactiva y Modo demo»): tour de 21 pasos con
  spotlight, placas y burbuja. Tiene modo manual y modo kiosco en loop, y los pasos operan la UI.
- **Design system**: tokens de `tokens/colors_and_type.css`, alias de la UI, tema oscuro y
  tipografía DM Sans.
- **Fuente de datos**: el dataset `demo-data.js` (`window.RB_DATA`) servido como asset
  estático, detrás de un único módulo de acceso a datos tipado. Ese módulo es el único
  punto que va a cambiar cuando exista la API.
- Tests de la lógica de dominio (estimación, selección, progreso, secuencia de fases,
  derivación de flujos de QA) y tests de componentes de las vistas.

## Capabilities

### New Capabilities
- `dashboard-shell`: layout global, header, routing por hash, tema claro/oscuro, tokens y
  tipografía, accesibilidad transversal y comportamiento responsive.
- `demo-dataset`: carga del dataset de demo, tipos del modelo de datos, formato de valores
  (números, tiempos, USD) y el módulo de acceso a datos que va a reemplazar la API.
- `portfolio-view`: vista `#/dashboard` (KPIs, distribuciones, paneles y tabla de repos).
- `project-view`: vista `#/repo/:slug` (perfil, selección de vulnerabilidades, estimación en
  vivo y ejecución secuencial simulada de fases).
- `remediated-view`: vista `#/remediados` (resultado por repo y checklist de QA persistido).
- `guided-tour`: guía interactiva manual y modo demo kiosco.

### Modified Capabilities
<!-- Ninguna: no hay specs previas en openspec/specs/. -->

## Impact

- **Código**: se reescribe `src/` completo. Módulos nuevos: `src/data/` (acceso y tipos),
  `src/domain/` (estimación, selección, fases, flujos, formato), `src/styles/` (tokens),
  `src/app/` (shell, routing, estado), `src/views/portfolio|project|remediated/`,
  `src/tour/` y `src/components/` (anillo, donut, hexágono, pills, barras).
- **Assets**: `public/demo-data.js` (copia de
  `docs/design_handoff_remediacion_dashboard/prototype/demo-data.js`, 2,3 MB) y el isotipo
  `abeja-roja.png`.
- **Dependencias**: runtime `@fontsource-variable/dm-sans`, porque el handoff no incluye los
  archivos de fuente. Dev: `vitest`, `@testing-library/react`, `@testing-library/user-event`,
  `jsdom`. No se agrega router ni librería de estado.
- **Sin impacto** en `vulnerabilities-api` ni en `sbom-security-orchestrator`. Modelar la API
  y conectar el dashboard a ella queda para un change posterior.
- **Rollback**: el change es aditivo sobre una semilla sin usuarios. Si hace falta, se
  revierte el commit.
