# Proposal

## Why

Queremos distribuir el dashboard a clientes para que corran el review (sbom-security-orchestrator) sobre
sus propios repositorios y vean, con la misma UI, el backlog de problemas a remediar y una estimación del
costo de remediarlos. Hoy la app mezcla ese análisis con la ejecución simulada de la remediación (fases,
PRs, QA), que en manos de un cliente no corresponde: la ejecución es el servicio que ofrece redbee.

## What Changes

- Nueva **edición review (sólo lectura)** del dashboard, seleccionada en build time con `VITE_EDITION=review`
  y un script `npm run build:review` que genera un bundle distribuible aparte. La edición por defecto
  (`full`) no cambia.
- La edición review es **idéntica** a la actual salvo que oculta las partes de ejecución de la remediación:
  - Vista Proyecto: la sección «Fases de remediación» (tarjetas fixdeps / fixcode / fixsecrets), la franja
    de cierre («Fix ejecutado», «Costo ejecutado»…) y el botón «Ejecutar las 3 fases en secuencia» del
    panel «Estimación en vivo». El resto del panel (estimación por fase, totales, se corrigen / quedan
    abiertas, disclaimer) se mantiene.
  - Header: el link «Remediados» desaparece de la nav.
  - Routing: `#/remediados` cae al Portfolio, igual que una ruta desconocida.
  - Guía / Modo demo: se omiten los pasos cuyo target es parte de la ejecución (`fases`, `flows-{slug}`).
- Se mantienen sin cambios: Portfolio completo, perfil y hero del repo, plan por nivel, grilla de selección
  con acciones masivas (la selección define el backlog) y la estimación en vivo de tiempo y costo.
- El controller de ejecución (`usePhaseRunner`) no se monta en la edición review, de modo que no hay
  forma de disparar una ejecución ni por UI ni por la guía.
- Fuera de alcance: exportar el backlog (CSV/PDF), carga de datasets por el usuario desde la UI y cambios
  al modelo de estimación. Quedan como posibles changes siguientes.

## Capabilities

### New Capabilities
- `readonly-edition`: edición de build «review» sólo lectura — cómo se selecciona y construye, qué partes
  de ejecución oculta (vista Proyecto, nav, ruta Remediados, pasos de la guía) y la garantía de que todo lo
  demás queda idéntico a la edición full.

### Modified Capabilities
<!-- Ninguna: los specs existentes siguen describiendo la edición full, que no cambia. Las diferencias
     de la edición review viven íntegramente en `readonly-edition`. -->

## Impact

- **Módulos afectados** (`src/`):
  - `src/app/edition.ts` (nuevo): única fuente de verdad de la edición.
  - `src/app/App.tsx`: montaje condicional del phase runner y de `RemediatedView`.
  - `src/app/Header.tsx`: nav condicional.
  - `src/app/route.ts`: `resolveRoute` trata `remediados` como desconocida en review.
  - `src/views/project/ProjectView.tsx`, `EstimatePanel.tsx`: ocultan `PhaseCards` y el botón de ejecución.
  - `src/tour/steps.ts`: filtra los pasos de ejecución.
  - `src/vite-env.d.ts`, `package.json`, `vite.config.ts`: tipado de `VITE_EDITION`, script `build:review`
    y `outDir` separado.
- **Handoff de diseño**: no hay sección nueva; se reutilizan tal cual las secciones «Vista Proyecto»,
  «Header» y «Guía» del README de `docs/design_handoff_remediacion_dashboard`, quitando los bloques de
  ejecución («Fases de remediación», franja de cierre, «Remediados»).
- **Datos**: sin cambios en el contrato del dataset. Desde `add-dashboard-read-api` el dashboard lee el
  dataset de `vulnerabilities-api`: el cliente apunta el build a su API (`VITE_API_BASE_URL`) en lugar de
  reemplazar `demo-data.js`.
- **Dependencias**: ninguna nueva.
