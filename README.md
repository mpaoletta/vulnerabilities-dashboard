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
| `npm run build:review` | Build de la edición review (sólo lectura) en `dist-review/` |
| `npm run check:review-bundle` | Verifica que `dist-review/` no incluya la UI de ejecución |
| `npm run preview` | Sirve el build |
| `npm run preview:review` | Sirve el build de la edición review |
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

## Edición review (sólo lectura)

Edición para distribuir a clientes: corren el review de `sbom-security-orchestrator` sobre sus
repositorios y ven el backlog de problemas a remediar y la estimación de tiempo y costo, con la misma UI.
Es idéntica a la edición full salvo que no incluye la ejecución de la remediación:

- en la vista Proyecto no están «Fases de remediación», la franja de cierre ni el botón
  «Ejecutar las 3 fases en secuencia» (la selección y la estimación en vivo siguen funcionando);
- no existe la vista Remediados: se quita de la nav y `#/remediados` muestra el Portfolio;
- la guía omite los 2 pasos de ejecución (fases y flujos de QA) y queda en 19 pasos.

La edición se fija en build time con `VITE_EDITION=review` (lo define `.env.review`, que usa
`vite build --mode review`) y no se puede cambiar en runtime. El único punto que la conoce es
`src/app/edition.ts`; el bundler poda las ramas de ejecución del bundle review.

```sh
npm run build:review          # genera dist-review/
npm run check:review-bundle   # confirma que no quedó UI de ejecución
npm run preview:review        # lo sirve localmente
```

Para usarlo con los datos de un cliente, reemplazá `dist-review/demo-data.js` por el dataset que
produjo su review (mismo formato: define `window.RB_DATA`, ver abajo) y serví `dist-review/` como
sitio estático.

## Fuente de datos

Los datos salen de **`vulnerabilities-api`** (proyecto hermano), de una de dos fuentes:

- **Demo** (por defecto): `GET {VITE_API_BASE_URL}/dataset`, el dataset de la demo (70 repos, copia de
  `docs/design_handoff_remediacion_dashboard/data/demo-data.json`).
- **Portfolio**: `GET {VITE_API_BASE_URL}/v1/tenants/{tenant}/dataset` con `Authorization: Bearer <key>`,
  los datos reales que publicó `sbom-security-orchestrator` para ese cliente.

Para conectar un portfolio tocá «Fuente: demo» en el header e ingresá el slug del portfolio y una API key
**de sólo lectura** (`scope: read`, ver el README de la API). La conexión se guarda sólo en
`sessionStorage` (`rb-connection`): se pierde al cerrar la pestaña y nunca va en la URL. «Usar demo» la
borra. Con datos reales, el header no dice «nombres anonimizados», la nota de la tabla los describe como
reales y Remediados no muestra el PR simulado.

### Ejecución real de la remediación

Con un portfolio conectado, las tarjetas de fase y «Ejecutar las 3 fases en secuencia» dejan de simular:
encolan un **job** en la API (`POST …/repositories/{slug}/jobs`) con la selección de la grilla, traducida a
unidades del ledger (paquete para dependencias, archivo + severidad para código, archivo para secretos; con
un listado recortado y todo seleccionado se envía `mode: "all"`). La tarjeta sigue el job cada 3 s, retoma
uno activo al abrir el repo y recarga el dataset al terminar. Lo ejecuta `sbom-security-orchestrator worker`
en la máquina de los clones; **los cambios quedan commiteados en el clone local, no se pushean**.

- Hace falta una key **`operate`** (o `write`); con una `read` los botones quedan deshabilitados con el motivo.
- Si ningún worker conectado tiene el repo clonado, se pide confirmación: el job queda en cola hasta que
  aparezca uno, y se puede cancelar mientras esté en cola.
- Con la demo, la ejecución sigue siendo la simulación de siempre; la edición `review` no muestra nada de esto.
- Código: `src/data/jobs.ts` (cliente), `src/domain/jobSelection.ts` (selección → job), `src/app/jobRunner.ts`
  (runner real; `phaseRunner.ts` elige entre éste y el simulado).

### Review desde el dashboard

Con un portfolio conectado, el portfolio muestra **«Sin review»**: los clones que anuncian los workers en
línea y todavía no tienen review (`GET …/unreviewed-repositories`, releído cada 15 s). «Ejecutar review»
encola un job `phases: ["review"]` que corre el worker que tiene el clone. Al terminar bien, el dataset se
recarga y el repo pasa a la flota. La vista de un repo revisado ofrece «Re-ejecutar review», con
confirmación porque reemplaza el review vigente. Mismos motivos de bloqueo que las fases (key `read`, sin
worker, job activo). Código: `src/app/reviewRunner.ts`, `src/components/ReviewControls.tsx`,
`src/views/portfolio/UnreviewedSection.tsx`.

Para correr la app hace falta la API levantada:

```bash
cd ../vulnerabilities-api && uv run fastapi dev src/vulnerabilities_api/main.py   # :8000
npm run dev                                                                       # :5173
```

`npm run dev` y `npm run preview` reenvían `/api` a `127.0.0.1:8000`. Para un build desplegado detrás
de otra URL, definí `VITE_API_BASE_URL` en build time (por ejemplo `https://api.ejemplo/api`).

El único lugar que conoce la fuente es **`src/data/`**: `source.ts` (`loadDataset(connection)`) y
`connection.ts` (la conexión guardada). `src/data/types.ts` es el contrato del lado cliente y coincide con
los modelos de respuesta de la API. El resto de la app consume el dataset con `useDataset()`. Los tests
no usan red: inyectan el dataset del handoff (o `src/test/tenant-dataset.json`, generado por la API con
fixtures sintéticos) con el `load` de `App`.
