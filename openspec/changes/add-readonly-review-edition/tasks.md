# Tasks

## 1. Infraestructura

- [x] 1.1 Crear `src/app/edition.ts` con `EDITION` y `READONLY` derivados de `import.meta.env.VITE_EDITION` (sólo `'review'` activa la edición review); verificar con un unit test que usa `vi.stubEnv` + import dinámico para `review`, `full`, vacío y un valor inválido
- [x] 1.2 Tipar `VITE_EDITION?: 'full' | 'review'` en `ImportMetaEnv` (`src/vite-env.d.ts`); verificar con `npm run build` sin errores de `tsc`
- [x] 1.3 Agregar `.env.review` con `VITE_EDITION=review` y hacer que `vite.config.ts` use `build.outDir = 'dist-review'` cuando `mode === 'review'`; verificar que `npm run build` sigue escribiendo en `dist/`
- [x] 1.4 Agregar el script `build:review` (`tsc -b && vite build --mode review`) y `preview:review` en `package.json`; verificar que `npm run build:review` genera `dist-review/index.html`

## 2. Implementación

- [x] 2.1 `route.ts`: agregar parámetro `readonly = READONLY` a `resolveRoute` para que `remediados` resuelva a `dashboard` en review; verificar con tests de `resolveRoute` para ambas ediciones
- [x] 2.2 `Header.tsx`: renderizar el link «Remediados» sólo en full; verificar con un test de Header en review (mock de `edition`) que la nav tiene sólo «Portfolio»
- [x] 2.3 `App.tsx`: extraer el montaje de `usePhaseRunner` + `PhaseRunnerContext` a un componente que sólo existe en full, y renderizar `RemediatedView` sólo en full; verificar que la suite existente de App sigue verde
- [x] 2.4 `EstimatePanel.tsx`: hacer `onRunAll` opcional y omitir el bloque del botón (manteniendo el disclaimer) cuando falta; verificar con un test que sin `onRunAll` no hay botón y sí disclaimer
- [x] 2.5 `ProjectView.tsx`: en review no consumir `usePhaseRunnerContext`, no pasar `onRunAll` y no renderizar `PhaseCards` (fases + franja de cierre); verificar con un test en review que no hay botones «Ejecutar…», ni `data-tour="fases"`, ni «Fix ejecutado»
- [x] 2.6 `tour/steps.ts`: marcar con `execution: true` los pasos de `fases` y `flows-*`, y filtrarlos (recalculando `idx`) cuando la edición es review, con la edición inyectable por parámetro; verificar con un test que en review hay N_full − 2 pasos, idx consecutivos y ningún `route: '#/remediados'`

## 3. Testing

- [x] 3.1 Agregar `src/app/App.review.test.tsx` (mock de `edition` a review): `#/remediados` muestra Portfolio y no el checklist de QA; en `#/repo/{slug}` «Solo Critical + High» recalcula la estimación; verificar con `npm test`
- [x] 3.2 Test de paridad: renderizar `#/dashboard` y el panel «Estimación en vivo» de un repo en full y en review, y comparar el `textContent` de `<main>` y de las filas/totales del panel (excluyendo el botón); verificar con `npm test`
- [x] 3.3 Test de la guía en review: recorrer los pasos en modo manual y comprobar que el contador «paso x de N» usa el N reducido y ningún paso navega a `#/remediados`; verificar con `npm test`
- [x] 3.4 Chequeo del bundle: después de `npm run build:review`, `npm run check:review-bundle` (`scripts/check-review-bundle.mjs`) verifica que `dist-review/assets/*.js` no contiene strings exclusivos de la UI de ejecución («Ejecutar las 3 fases en secuencia», «Fases de remediación», «Fix ejecutado (estimado)», «flujos verificados», «Pull request (simulado)», mensajes `step …` del runner). El reducer compartido conserva los casos `phase/*` (inertes: nadie los despacha en review)
- [x] 3.5 Regresión y lint: `npm test`, `npm run lint` y `npm run build` pasan sin cambios en la edición full
- [ ] 3.6 Verificación manual: `npm run preview:review`, recorrer Portfolio, un repo tipo A y uno tipo B, `#/remediados` y una vuelta de Modo demo; comparar lado a lado con la edición full

## 4. Documentación

- [x] 4.1 Documentar en `README.md` la edición review: cómo construirla, dónde queda el bundle y cómo reemplazar `demo-data.js` con el output del review del cliente; verificar que los comandos del README funcionan tal cual
