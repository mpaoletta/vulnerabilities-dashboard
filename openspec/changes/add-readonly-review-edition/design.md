# Design

## Context

Ver proposal.md (Why). Estado actual relevante:

- `App.tsx` monta `usePhaseRunner` y lo expone vía `PhaseRunnerContext`; `ProjectView` lo consume para
  `EstimatePanel.onRunAll` y `PhaseCards` lo usa para cada botón «Ejecutar {fase}». `PhaseCards` también
  renderiza la franja de cierre.
- `Header` tiene la nav hardcodeada (Portfolio / Remediados); `resolveRoute` decide la vista efectiva.
- `tourSteps(D)` arma una lista estática cacheada por dataset; los pasos de ejecución son el de
  `[data-tour="fases"]` (acto 3) y el de `[data-tour="flows-…"]` con `route: '#/remediados'` (acto 4).
- Los datos llegan sólo por `src/data/source.ts` (`loadDataset`), que no se toca.

## Goals / Non-Goals

**Goals:**
- Un único punto de verdad para la edición, resuelto en build time y eliminable por el bundler.
- Que la edición review no incluya código ejecutable de la simulación de fases ni de Remediados en su bundle
  (o al menos que sea inalcanzable), para que la distribución no filtre el flujo de ejecución.
- Cero cambios visibles en la edición full.

**Non-Goals:**
- Un sistema genérico de feature flags o de permisos por usuario.
- Cambiar textos de la edición review (p. ej. renombrar «Selección de vulnerabilidades a reparar»).
- Ocultar datos de avance que vienen del dataset (columna Progreso, distribución «Estado de avance»,
  fact «Estado», leyenda del header): no disparan ejecución y en un dataset de cliente reflejan
  simplemente `review` hecho.

## Decisions

### D1. Flag de build `VITE_EDITION` en `src/app/edition.ts`
```ts
export const EDITION: 'full' | 'review' = import.meta.env.VITE_EDITION === 'review' ? 'review' : 'full'
export const READONLY = EDITION === 'review'
```
Vite reemplaza `import.meta.env.VITE_EDITION` por un literal, así que `READONLY` es constante y los
`if (READONLY)` / `READONLY ? null : <X/>` se podan en el build de producción.
- *Alternativa: flag en runtime (query `?readonly`, config en `demo-data.js`).* Descartada: el cliente
  podría reactivar la ejecución y el código viajaría igual en el bundle.
- *Alternativa: segundo entry point / app separada.* Descartada: duplica el shell y rompe la paridad.
- *Alternativa: Vite `mode` (`--mode review` + `.env.review`).* Es equivalente; se usa como mecanismo
  del script (`vite build --mode review` con `.env.review` que define `VITE_EDITION=review` y
  `outDir: dist-review` vía `vite.config.ts` según `mode`). Así el build full no cambia.

### D2. Ocultar en el punto de composición, no dentro de cada componente
- `App.tsx`: en review no llama a `usePhaseRunner`; provee un `PhaseRunnerContext` nulo/no-op sólo si
  algún consumidor queda montado (no debería). `RemediatedView` se importa y renderiza sólo si `!READONLY`.
- `ProjectView.tsx`: `{!READONLY && <PhaseCards … />}`; `EstimatePanel` recibe `onRunAll` opcional y no
  renderiza el botón cuando falta. `ProjectView` deja de llamar `usePhaseRunnerContext()` en review.
- `Header.tsx`: el link Remediados se renderiza sólo si `!READONLY`.
- `route.ts`: `resolveRoute` trata `remediados` como desconocida cuando `READONLY`. Se agrega un
  parámetro opcional `readonly = READONLY` para poder testear ambas ramas sin rebuild.
- `tour/steps.ts`: al final de `tourSteps`, en review se filtran los pasos con target `fases` o
  `flows-*` (marcados con un campo `execution: true` para no depender de strings) y se recalculan `idx`.

Hooks: `usePhaseRunner` no puede llamarse condicionalmente dentro de un componente que se re-renderiza
con distinto valor, pero `READONLY` es constante por build, por lo que la condición es estable y no
viola las reglas de hooks. Aun así, para claridad, se envuelve en un componente `ExecutionShell` que sólo
existe en full.

### D3. Parámetro inyectable para tests
Los tests corren con la edición full (sin `VITE_EDITION`). Para cubrir review sin un segundo runner:
- Funciones puras (`resolveRoute`, `tourSteps`/filtro) reciben la edición por parámetro con default.
- Para componentes, `vi.mock('../app/edition', () => ({ EDITION: 'review', READONLY: true }))` en un
  archivo de test dedicado (`*.review.test.tsx`).
- *Alternativa: proyecto Vitest adicional con `env: { VITE_EDITION: 'review' }`.* Queda como mejora si
  los mocks se vuelven frágiles.

### D4. Datos sin cambios
El acceso a datos sigue detrás de `src/data/source.ts`; la edición no afecta `loadDataset` ni el
contrato. El cliente reemplaza `public/demo-data.js` (o el del bundle) por el output de su review.

## Test strategy

- **Unit**: `edition.ts` (valores válidos/ inválidos vía `vi.stubEnv` + import dinámico);
  `resolveRoute(…, readonly)` para `remediados`; filtro de pasos de la guía (N_full − 2, sin `fases` ni
  `flows-*`, idx consecutivos, ningún `route: '#/remediados'`).
- **Componentes (review mockeado)**: Header sin «Remediados»; ProjectView sin botones «Ejecutar…», sin
  `data-tour="fases"` ni franja de cierre, con disclaimer; `#/remediados` muestra Portfolio; «Solo Critical
  + High» sigue recalculando la estimación.
- **Paridad**: test que renderiza `#/dashboard` y el panel de estimación de un repo en full y en review
  y compara el `textContent` de `<main>` / del panel.
- **Regresión full**: la suite existente debe pasar sin cambios.
- **Build**: `npm run build:review` genera `dist-review/`; un chequeo (`grep`) de que el bundle no
  contiene strings exclusivos de ejecución («commiteado · gate verde», «Ejecutar las 3 fases»).
- **Manual**: abrir `dist-review` con `vite preview --outDir dist-review` y recorrer Portfolio, un repo,
  `#/remediados` y el Modo demo.

## Risks / Trade-offs

- [Paridad se rompe con cambios futuros a la edición full] → test de paridad automático y los
  `READONLY` concentrados en pocos puntos de composición.
- [El tree-shaking no elimina un módulo de ejecución por un import con side effects] → chequeo de strings
  sobre el bundle en el paso de build/test.
- [Mocks de módulo frágiles al reorganizar imports] → funciones puras con parámetro inyectable; migrar a
  proyecto Vitest con env si hace falta.
- [Textos de la guía y del panel que siguen hablando de «ejecución» (p. ej. placas de proceso)] → se
  aceptan: explican el servicio; cambiarlos rompería la paridad pedida.

## Migration Plan

Aditivo. `npm run build` sigue produciendo la edición full en `dist/`. La edición review se publica desde
`dist-review/`. Rollback: no publicar `dist-review`; borrar el flag no afecta la edición full.

## Open Questions

- Nombre y empaquetado del entregable al cliente (zip con `dist-review` + instrucciones para reemplazar
  `demo-data.js`, o imagen estática). No afecta la implementación de la edición.
