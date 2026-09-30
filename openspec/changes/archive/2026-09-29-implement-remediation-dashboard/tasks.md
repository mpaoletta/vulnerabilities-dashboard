## 1. Infraestructura

- [x] 1.1 Versionar `docs/design_handoff_remediacion_dashboard/` y agregar `.DS_Store` a `.gitignore`
- [x] 1.2 Borrar el contenido de ejemplo de la semilla (`src/App.*`, `src/index.css`, `src/assets/*`, `public/icons.svg`) y dejar `main.tsx` montando un `App` vacío
- [x] 1.3 Agregar las dependencias: `@fontsource-variable/dm-sans` (runtime) y `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` y `@testing-library/jest-dom` (dev). Configurar `test` en `vite.config.ts` y los scripts `test` y `test:watch`
- [x] 1.4 Copiar `prototype/demo-data.js` a `public/demo-data.js` y `prototype/assets/abeja-roja.png` a `src/assets/`. Usar el isotipo como favicon y poner el título «remediación automatizada de vulnerabilidades · redbee» en `index.html`
- [x] 1.5 Crear `src/styles/redbee-ds.css` (tokens del DS sin `@font-face`) y `src/styles/tokens.css` (alias de la UI, tema `[data-theme="dark"]`, `tabular-nums`, foco teal 2px/2px, `@keyframes rbpulse` y reset base)

## 2. Datos y dominio

- [x] 2.1 `src/data/types.ts`: tipos del modelo (`Dataset`, `Meta`, `EstimationModel`, `Fleet`, `FleetRepository`, `RepositoryDetail`, `PlanLevel`, `DependencyUpdate`, `ResidualPackage`, `SastFile`, `SastFinding`, `SecretFile`, `SecretFinding`, `Estimate`, `DemoState`) derivados de `data/demo-data.json`
- [x] 2.2 `src/data/source.ts`: `loadDataset()`, que inyecta `demo-data.js` una sola vez y resuelve `window.RB_DATA`. Más un `DatasetProvider` y `useDataset()` con estados de carga y error
- [x] 2.3 `src/domain/format.ts`: `n`, `t`, `usd`, `sevLabel` y los helpers de color (`sevBg`/`sevFg`, `typeBg`/`typeFg`, `phColor`), con sus tests
- [x] 2.4 `src/domain/items.ts`: port de `itemsFor` (ids `d:`, `s:` y `k:`, `l4`, `codeReal` y `secretReal`), memoizado por slug
- [x] 2.5 `src/domain/selection.ts`: selección por defecto, `setSel`, `only` y las acciones masivas de las 3 tabs (Critical + High, sin cambio de código, excluir nivel 4, por regla, solo activos, solo verificados y excluir falsos positivos)
- [x] 2.6 `src/domain/estimate.ts`: port de `estimate()`, con el test de paridad sobre los 70 repos contra `estimate` del dataset y casos de deselección parcial SAST y de secretos
- [x] 2.7 `src/domain/phases.ts`: `phaseStatus`, `blockedBy`, `nextAfter`, `progress` y `ringGradient` (84° + 6°, capa `running`), con sus tests
- [x] 2.8 `src/domain/flows.ts`: port de `flowsFor` y de la derivación del estado de QA (pendiente / parcial / verificado), con sus tests

## 3. Shell de la app

- [x] 3.1 `src/app/useHashRoute.ts`: parseo de las 4 rutas, `navigate()`, fallback al Portfolio y redirección de `#/tour`, con sus tests
- [x] 3.2 `src/app/store.ts`: reducer y contexto con los slices `theme`, `portfolio`, `tab`, `sel`, `open`, `phases`, `qa` y `tour`, más la persistencia `rb-theme` y `rb-qa-v2` con try/catch
- [x] 3.3 `src/components/`: `Card`, `SectionLabel`, `Kpi`, `Pill`, `StackedBar`, `MicroBar`, `PhaseRing` (`role="img"` + `aria-label`), `Donut`, `Hexagon` y `TriCheckbox`, cada uno con su CSS Module
- [x] 3.4 `src/app/Header.tsx`: header sticky con isotipo, título, bajada, nav activa, leyenda de estados y botones Ver guía, Modo demo y Tema, con sus hovers
- [x] 3.5 `src/app/App.tsx`: `DatasetProvider`, store, header y switch de vistas con el contenedor `max-width: 1780px`

## 4. Vista Portfolio

- [x] 4.1 KPIs (5 tarjetas) y distribuciones (4 barras apiladas con leyenda y colores por clave), con `data-tour="kpis"` y `data-tour="dist-tipo"`
- [x] 4.2 Panel «Vulnerabilidades por tipo» (corregibles/residuales y nota del repo con más secretos) y panel «Complejidad ciclomática · escala log» (top 9)
- [x] 4.3 Toolbar de la tabla: búsqueda, 4 selects «X: todos» y contador «n de N repositorios»
- [x] 4.4 Tabla: thead sticky con orden por columna (↑/↓, texto ascendente y números descendente), columnas con pills, micro-barras (Secretos en log), Residual y Est. fix, filas focuseables (Enter/click → `#/repo/:slug` + scroll arriba) y `data-tour` `tabla`/`col-potential`/`col-prog`/`row-{slug}`
- [x] 4.5 Columna Progreso con `PhaseRing` de 34px y nota al pie de honestidad de datos

## 5. Vista Proyecto

- [x] 5.1 Link de volver, header del repo y 4 facts (Compilación, Tests, Review y Estado), con `data-tour` `repo-header`/`repo-facts`
- [x] 5.2 Hero: tarjeta Tipo (hexágono, titular, red rule y bloqueante/rationale), Tamaño y complejidad (hexágono negro + 3 barras normalizadas) y Potencial (donut, regla de «99,9%» y estado vacío), con `data-tour` `hero`/`hero-tipo`
- [x] 5.3 Scatter log-log de tamaño vs. complejidad y panel «Plan de dependencias por nivel» con la leyenda de 3 colores (`data-tour="plan-levels"`)
- [x] 5.4 Grilla: tabs, barra de acciones masivas por tab con contador y grupos colapsables con header sticky, `TriCheckbox`, apertura por defecto de 1 a 40 filas y grupo Residual no seleccionable (`data-tour` `bulk`/`grid`/`grupo-n{nivel}`/`grupo-res`)
- [x] 5.5 Filas por tab: grid de columnas del handoff, flags de dependencias, pills de severidad, secretos activos/falsos positivos tachados y render sólo de los grupos abiertos
- [x] 5.6 Panel «Estimación en vivo» sticky: filas por fase, bloque «Nivel 4 · aparte», totales de fix sin review, «Se corrigen» / «Quedan abiertas», botón «Ejecutar las 3 fases en secuencia» y disclaimer (`data-tour="estimacion"`). Apilado debajo en pantallas de menos de 1100px
- [x] 5.7 `usePhaseRunner`: 10 ticks de 420 ms, mensajes de paso, snapshot al arrancar, una fase por vez por repo, encadenado a 500 ms y cleanup de timers
- [x] 5.8 Tarjetas de «Fases de remediación» (anillo de 84px, stats, barra con transición, mensaje y labels/estados del botón) y franja de cierre (`data-tour="fases"`)

## 6. Vista Remediados

- [x] 6.1 Título y resumen, y una tarjeta por repo con `stage === 'remediated'`: header con link, pill de tipo, stack y pill de QA
- [x] 6.2 Grid de 4 columnas: Dependencias, Código y secretos, Estimado por fase y Pull request (simulado)
- [x] 6.3 Checklist «Flujos impactados»: contador, barra roja, filas `label` con checkbox, pill de tipo, detalle y sello, persistido en `rb-qa-v2` (`data-tour="flows-{slug}"`)

## 7. Guía interactiva y Modo demo

- [x] 7.1 `src/tour/steps.ts`: port de `pickDemoRepos` y `tourSteps` (actos 0–4, 21 pasos + cierre y textos derivados del dataset), con sus tests
- [x] 7.2 `src/tour/placement.ts`: port de `tourMeasure` (padding, clip, orden abajo/arriba/derecha/izquierda y recorte del foco), con tests sobre viewports sintéticos
- [x] 7.3 `useTourEngine`: tick de 200 ms, auto-avance a `seconds/2`, modo manual (pausado y sin cierre) vs. kiosco (loop), teclado ← / → / Esc, pausa por interacción con gracia de 1,5 s, reanudación a los 45 s, cursor oculto a los 5 s, re-medición en resize y scroll, y 10 reintentos de target
- [x] 7.4 Aplicación de pasos sobre el store: ruta, tab, `expand` y `selectCritical`
- [x] 7.5 `TourOverlay` en portal: spotlight (con `prefers-reduced-motion`), placa con diagrama, burbuja `role="dialog"` con controles y anillo del paso, barra inferior y escalado de tipografía en kiosco
- [x] 7.6 Conectar «Ver guía», «Modo demo» y el deep link `#/tour`

## 8. Testing y verificación

- [x] 8.1 Tests RTL del Portfolio: filtro combinado, orden asc/desc, contador y Enter en una fila
- [x] 8.2 Tests RTL del Proyecto: selección por defecto, checkbox tri-estado, recálculo de la estimación y secuencia y bloqueo de fases con fake timers (sin timers colgados al desmontar)
- [x] 8.3 Tests RTL de Remediados y del shell: persistencia de QA y tema, y `localStorage` que lanza excepciones
- [x] 8.4 Tests RTL de la guía: navegación ← / → / Esc, cierre en modo manual y salto de target ausente
- [x] 8.5 `npm run build`, `npm run lint` y `npm test` en verde
- [x] 8.6 Validación visual lado a lado contra `Dashboard Remediacion (offline).html` (claro/oscuro, 1440px y 900px) en las 3 vistas y la guía, corrigiendo desvíos
- [x] 8.7 Actualizar el `README.md` del repo (qué es, scripts, fuente de datos demo y dónde se hace el swap a la API)
