## Context

- El repo es la semilla `react-ts` de create-vite 9: React 19.3, Vite 8.3, TypeScript 6.0 y oxlint.
  `vite.config.ts` ya hace proxy de `/api` a `127.0.0.1:8000` para el futuro `vulnerabilities-api`.
- La fuente de verdad es `docs/design_handoff_remediacion_dashboard/`:
  - `README.md` especifica la UI en alta fidelidad.
  - `prototype/Dashboard Remediacion.dc.html` es un "Design Component": un template más una
    `class Component` cuyos métodos (`itemsFor`, `selFor`, `estimate`, `phaseStatus`, `blockedBy`,
    `startPhase`, `flowsFor`, `pickDemoRepos`, `tourSteps`, `tourMeasure`, `renderVals`) son la
    especificación ejecutable del comportamiento.
  - `tokens/colors_and_type.css` es el design system de redbee. Su `@font-face` referencia
    `fonts/DMSans-*.ttf`, que **no vienen en el handoff**.
  - `prototype/demo-data.js` (`window.RB_DATA`, 2,3 MB) es idéntico a `data/demo-data.json`:
    70 repos, todos con detalle.
- La carpeta `docs/` todavía no está versionada.
- Hay dos repos hermanos: `sbom-security-orchestrator` produce los datos y `vulnerabilities-api`
  (FastAPI) los va a servir. Este change **no** toca la API. En el próximo se modela el contrato a
  partir de lo que esta UI consume.
- Validé contra el dataset que el modelo de estimación del prototipo, con la selección completa,
  reproduce `estimate` en los 70 repos. Los segundos y USD coinciden exactamente. Las unidades de
  fixsecrets en el dataset son `secretTypes + secretFiles`, mientras que el panel las muestra
  desglosadas como «tipos · archivos».

## Goals / Non-Goals

**Goals:**
- Implementar las 3 vistas, el header y la guía/modo demo con fidelidad visual y de comportamiento
  respecto del prototipo.
- Aislar el acceso a datos en un módulo que sea lo único a cambiar al conectar la API.
- Portar la lógica de dominio del prototipo a funciones TypeScript puras y testeadas.

**Non-Goals:**
- Modelar o consumir `vulnerabilities-api`: queda para un change posterior.
- Ejecutar remediaciones reales. Las fases son una simulación de 10 ticks, como en el prototipo.
- Persistir selección o ejecuciones más allá de la memoria. Sólo se persisten tema y QA.
- i18n: la UI es sólo en español rioplatense.
- Tests de regresión visual automatizados. La fidelidad se valida lado a lado contra el prototipo.

## Decisions

### D1. Dataset: `demo-data.js` como asset estático, cargado por el módulo de datos
Copiar `prototype/demo-data.js` a `public/demo-data.js`. `src/data/source.ts` expone
`loadDataset(): Promise<Dataset>`, que inyecta el `<script>` una sola vez, espera `onload` y devuelve
`window.RB_DATA` tipado. `src/data/types.ts` define el modelo. Un `DatasetProvider` resuelve la
promesa, muestra los estados de carga y error, y entrega el dataset por contexto
(`useDataset()`). Ningún otro módulo toca `window.RB_DATA`.

- *Por qué:* es literalmente el archivo que pidió el usuario, queda fuera del bundle (no infla el
  chunk JS ni el HMR) y la firma asíncrona ya tiene la forma que va a tener `fetch('/api/...')`.
- *Alternativas:*
  - `import data from './demo-data.json'`: suma 3,6 MB al bundle y hace más lento el type-check y el HMR.
  - `fetch('/demo-data.json')`: sería igual de válido, pero se descarta porque el pedido explícito
    fue usar `demo-data.js`.

  El swap a la API cambia sólo `source.ts` (y eventualmente `types.ts`).

### D2. Routing por hash propio, sin librería
Un hook `useHashRoute()` parsea `location.hash` a
`{ name: 'dashboard' | 'repo' | 'remediados', slug? }`, escucha `hashchange` y expone `navigate()`.
`#/tour` se resuelve en `App`: redirige a `#/dashboard` y arranca el kiosco.

- *Por qué:* son 4 rutas fijas, el prototipo usa hash y la guía escribe `location.hash` directamente.
- *Alternativa:* React Router en modo hash agrega una dependencia y una capa de abstracción que la
  guía tendría que atravesar.

### D3. Estado: un store con `useReducer` y contexto, y los timers fuera del reducer
`src/app/store.ts` define un único reducer con los slices del handoff (§«Estado sugerido»):
- `theme`
- `portfolio { q, fType, fSize, fLang, fStage, sortK, sortD }`
- `tab`
- `sel[slug]` y `open[slug|group]`
- `phases[slug:fase] { run, done, pct, msg, snap }`
- `qa`
- `tour`

Los efectos con tiempo (ticks de fase de 420 ms, encadenado a 500 ms y tick de la guía de 200 ms)
viven en *controllers* (`usePhaseRunner`, `useTourEngine`) que guardan los `setInterval` en refs, los
limpian al desmontar y despachan acciones.

- *Por qué:* replica el `setState` del componente de clase sin librerías, mantiene el reducer puro y
  testeable, y los controllers se prueban con fake timers.
- *Alternativa:* Zustand o Redux Toolkit. Hoy no se justifican; se puede revisar cuando llegue el
  estado del servidor, donde probablemente convenga TanStack Query para la API.

### D4. Dominio portado 1:1 a funciones puras en `src/domain/`
- `format.ts`: `n`, `t`, `usd` y `sevLabel`.
- `items.ts`: `itemsFor` y los ids `d:`, `s:` y `k:`.
- `selection.ts`: `defaultSelection`, `setSel`, `only` y los helpers de acciones masivas.
- `estimate.ts`: `estimate(row, detail, meta, sel)`.
- `phases.ts`: `phaseStatus`, `blockedBy`, `nextAfter`, `progress` y `ringGradient`.
- `flows.ts`: `flowsFor`.
- `tour/steps.ts`: `pickDemoRepos` y `buildTourSteps`.
- `tour/placement.ts`: la geometría de `tourMeasure`.

Los ids, las fórmulas y los textos se copian del prototipo; cualquier desviación es un bug. Las
derivaciones pesadas (`itemsFor` sobre repos con miles de hallazgos) se memoizan por slug.

- *Por qué:* el `.dc.html` es la especificación ejecutable. Portarla sin reinterpretar es la forma más
  barata de lograr que se cumpla «a rajatabla» y deja cada regla cubierta por un test.

### D5. Estilos: tokens globales y CSS Modules por componente
- `src/styles/tokens.css` importa los valores de `colors_and_type.css` (copiado a
  `src/styles/redbee-ds.css` sin el `@font-face`) y define los alias de la UI, el tema
  `[data-theme="dark"]`, `tabular-nums`, el foco teal y `@keyframes rbpulse`.
- Cada componente tiene su `*.module.css`.
- Los valores que dependen de los datos (anchos de barras, conic-gradients y posiciones del scatter
  y de la guía) van como `style` inline o como custom properties (`--w`, `--deg`), igual que en el
  prototipo.

- *Por qué:* CSS Modules viene nativo en Vite y evita colisiones sin sumar dependencias. Además, los
  valores del handoff (px exactos) se trasladan literalmente.
- *Alternativas:* Tailwind obligaría a traducir cada px a clases arbitrarias y alejaría el código del
  README. CSS-in-JS suma runtime.

### D6. Tipografía: `@fontsource-variable/dm-sans`
El handoff no trae los `.ttf`. El paquete sirve DM Sans variable (ejes `opsz` y `wght`) desde el
bundle, así que funciona offline, algo necesario para el modo kiosco en stand. `--font` pasa a ser
`'DM Sans Variable', 'DM Sans', system-ui, sans-serif`.

- *Alternativa:* Google Fonts depende de la red en el stand.
- Si redbee provee los archivos del DS, se reemplaza por un `@font-face` local sin tocar componentes.

### D7. Componentes primitivos reutilizables
`src/components/` contiene: `PhaseRing` (anillo de 4 segmentos con capa `running` pulsante), `Donut`,
`Hexagon`, `Pill` (tipo, severidad y estado), `StackedBar`, `MicroBar`, `Card`, `SectionLabel`,
`Kpi` y `TriCheckbox`.

Las vistas (`src/views/portfolio|project|remediated/`) se componen con ellos. Los atributos
`data-tour` se ponen en las vistas, no en los primitivos.

### D8. Guía como overlay en portal, conducida por acciones del store
`src/tour/` contiene:
- `TourProvider`, con el estado en el store.
- `useTourEngine`: tick de 200 ms, auto-avance a `seconds/2`, pausa y reanudación a los 45 s en
  kiosco, ocultamiento del cursor y listeners de teclado, click, resize y scroll.
- `TourOverlay`: spotlight, placa, burbuja y barra, montados con `createPortal` en `document.body`.

Un paso se aplica despachando las mismas acciones que usa la UI (`navigate`, `setTab`, `expand` y
`selectOnly`), así que la guía opera la app real. La medición usa `querySelector('[data-tour=…]')`
con 10 reintentos de 150 ms.

### D9. Performance de la grilla
Sólo se renderizan las filas de los grupos abiertos. Los grupos de más de 40 filas arrancan cerrados,
según el handoff.

- Si algún repo del dataset (por ejemplo, los de miles de hallazgos SAST) degrada el scroll del
  cuerpo de 430px, se agrega virtualización (`@tanstack/react-virtual`) sólo dentro de los grupos,
  sin cambiar la API de los componentes.
- Queda como contingencia: no se agrega por defecto.

### D10. Estrategia de testing
Se agregan `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` y
`@testing-library/jest-dom`.

- **Unit (dominio):**
  - `format`, con los casos de la spec.
  - `estimate`: test de paridad sobre los 70 repos, cargando
    `docs/.../data/demo-data.json` en el test, más casos de deselección parcial.
  - `selection` (defaults y acciones masivas), `phases` (bloqueo, encadenado y progreso), `flows` y
    `pickDemoRepos`/`buildTourSteps` (21 + 1 pasos y textos derivados).
  - `placement`, con viewports sintéticos.
- **Componentes (RTL):**
  - Portfolio: filtros, orden, contador y Enter en una fila.
  - Proyecto: checkbox tri-estado, recálculo de la estimación y secuencia de fases con fake timers.
  - Remediados: persistencia de QA en `localStorage` y storage que lanza excepciones.
  - Guía: ←, →, Escape y salto de target ausente.
- **Fidelidad visual (manual):** checklist de comparación lado a lado con
  `Dashboard Remediacion (offline).html`, en tema claro y oscuro, a 1440px y 900px de ancho.
- Scripts: `npm test` (`vitest run`) y `npm run test:watch`. `npm run build` y `npm run lint` siguen
  siendo gates.

## Risks / Trade-offs

- **[Riesgo]** Parsear un script de 2,3 MB en el arranque → **Mitigación:** se carga una sola vez,
  con un estado de carga visible. Se sirve con cache estática. Pasa a ser irrelevante con la API
  paginada del próximo change.
- **[Riesgo]** Divergencias sutiles con el prototipo (redondeos, textos o casos borde como «99,9%») →
  **Mitigación:** el dominio es un port 1:1 con tests derivados del `.dc.html`, y el test de paridad
  cubre los 70 repos.
- **[Riesgo]** Timers de fases y de la guía que quedan vivos al navegar o desmontar →
  **Mitigación:** los controllers guardan los intervals en refs con cleanup, y hay tests con fake
  timers que verifican que no queden timers pendientes.
- **[Trade-off]** Un reducer único crece. Es aceptable para el tamaño actual, y se particiona por
  slice si hace falta.
- **[Trade-off]** TypeScript queda en 6.0 (el que fija el template) aunque la 7 ya salió. Subir a la
  7 es un cambio aparte.
- **[Riesgo]** Licencia o fidelidad de la fuente → **Mitigación:** DM Sans es OFL (fontsource), y se
  sustituye por los archivos del DS si redbee los entrega.

## Migration Plan

Es aditivo sobre una semilla sin usuarios:
1. Versionar `docs/` e ignorar `.DS_Store`.
2. Implementar por fases, según `tasks.md`.
3. `npm run build`, `npm run lint` y `npm test` en verde.
4. Validación visual contra el prototipo.

Rollback: revertir los commits del change.

## Open Questions

- ¿redbee puede proveer los archivos DM Sans del DS y el isotipo oficial? Mientras tanto, se usan
  fontsource y `abeja-roja.png` del handoff.
- ¿El responsable de QA («QA · m.rodriguez», un prop en el prototipo) tiene que ser configurable en
  este change, o se resuelve con la identidad del usuario cuando exista la API?
