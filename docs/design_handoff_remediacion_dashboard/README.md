# Handoff: Dashboard de remediación automatizada de vulnerabilidades

## Resumen
Dashboard web para seguir y operar un pipeline de remediación de vulnerabilidades sobre un portfolio de repositorios (70 en la demo). El pipeline tiene cuatro fases: **review** (escanea y arma el plan), **fixdeps** (dependencias), **fixcode** (hallazgos SAST) y **fixsecrets** (secretos). Hay tres vistas y una guía interactiva:

1. **Portfolio** (`#/dashboard`): estado de todos los repos, KPIs, distribuciones y una tabla que se puede ordenar y filtrar.
2. **Proyecto** (`#/repo/:slug`): perfil del repo, selección de las vulnerabilidades a reparar, estimación en vivo y ejecución **secuencial** de las fases.
3. **Remediados** (`#/remediados`): resultado por repo y checklist de QA de los flujos afectados.
4. **Guía / Modo demo**: un tour con spotlight de 21 pasos. Tiene un modo manual y un modo kiosco en loop (para stand de conferencia).

Idioma de la UI: español rioplatense (con voseo). Marca: redbee, **siempre en minúscula**.

## Sobre los archivos de diseño
Los archivos de `prototype/` son **referencias de diseño hechas en HTML**: prototipos que muestran cómo se ve y cómo se comporta el producto. **No son código para producción.** La tarea es **recrear estos diseños en el entorno del codebase de destino** (React, Vue, etc.), con sus patrones y librerías. Si todavía no hay codebase, elegí el framework que mejor encaje. Recomendamos React + TypeScript, con un router por hash o por path.

- `Dashboard Remediacion.dc.html` es el fuente del prototipo. Es un "Design Component": un template con holes `{{ }}` más una clase de lógica (`class Component`) que se comporta como un componente de clase de React. Todo el comportamiento y los cálculos están en la función `renderVals()` y en los métodos de esa clase: sirven como especificación ejecutable.
- `Dashboard Remediacion (offline).html` es el mismo prototipo en un solo archivo autocontenido. Abrilo con doble clic para verlo funcionando.
- `demo-data.js` y `data/demo-data.json` tienen el dataset de la demo (`window.RB_DATA`).

## Fidelidad
**Alta fidelidad (hifi).** Los colores, la tipografía, el espaciado, los estados y las interacciones son finales. Recreá la UI con precisión usando los tokens de `tokens/colors_and_type.css`, que es el design system de redbee.

---

## Layout global

- **Fondo**: `--bg` (blanco). **Fuente**: DM Sans (variable, pesos 100–1000), con `font-variant-numeric: tabular-nums` en todo el documento.
- **Contenedor de las vistas**: `max-width: 1780px; margin: 0 auto; padding: 22px 24px 40px`, en columna flex con `gap: 16px` (portfolio) o `14px` (proyecto y remediados).
- **Tarjetas**: `border: 1px solid var(--line); border-radius: 4px; background: var(--card)`, sin sombra (el brand prohíbe sombras). El padding va de `15px 17px` en las tarjetas chicas a `20px 22px` en las del hero.
- **Label de sección** (usado en todas las tarjetas): 10.5px, peso 700, `letter-spacing: 0.08em`, UPPERCASE, color `--fg3`.
- **Cifra grande (KPI)**: 40px, peso 300, `line-height: 0.92`, `letter-spacing: -0.03em`.

### Header (sticky, en todas las vistas)
- `position: sticky; top: 0; z-index: 40; background: var(--bg); border-bottom: 1px solid var(--line); padding: 12px 24px`. Flex con `gap: 18px` y wrap.
- Isotipo `assets/abeja-roja.png`, de 26px de alto.
- Bloque de título, con `border-left: 1px solid var(--line)` y `padding-left: 18px`:
  - «remediación automatizada de vulnerabilidades»: 14px, peso 700.
  - «portfolio · {N} repositorios · nombres anonimizados»: 10.5px, UPPERCASE, `letter-spacing: 0.07em`, color `--fg3`.
- Nav: dos links, «Portfolio» (`#/dashboard`) y «Remediados» (`#/remediados`). 13px, peso 600, `padding: 7px 13px`, radio 4px, fondo `--bg2` en hover.
- A la derecha:
  - Leyenda de estados: cuadrados de 9px + 11px peso 600. Hecha = teal, corriendo = red, pendiente = line, no aplica = line2 con borde.
  - Botón **Ver guía**: secundario, con borde `--line`. En hover el borde y el texto pasan a red.
  - Botón **Modo demo**: primario rojo con texto blanco. En hover el fondo pasa a bordó.
  - Botón **Tema oscuro / Tema claro**: secundario.
- Botones secundarios: 12px, peso 600, `padding: 7px 12px`, `border: 1px solid var(--line)`, fondo `--card`, radio 4px.

---

## Vista 1: Portfolio (`#/dashboard`)

**Para qué sirve**: ver de un vistazo el estado de todo el portfolio y entrar a un repo.

1. **KPIs**: grid `repeat(auto-fit, minmax(230px,1fr))` con `gap: 12px` y 5 tarjetas, cada una con label, cifra y nota de 12px en `--fg3`.
   - **Repositorios** = `fleet.repositoryCount`. Nota: «X compilan · Y con build roto» (se cuenta `compiles`).
   - **Vulnerabilidades** = deps + código + secretos activos. Nota con el desglose.
   - **Residuales sin fix** = `totals.potential`. Nota: «quedan abiertas tras el nivel 3 del plan».
   - **Review acumulado** = `totals.reviewSeconds`. Nota: LOC analizadas.
   - **Fix estimado** = Σ(`estimate.total.seconds − reviewSeconds`). Nota: unidades y USD.
2. **Distribuciones**: grid `minmax(300px,1fr)` con 4 tarjetas (Tipo de proyecto, Tamaño (LOC), Estado de avance, Lenguaje). Cada tarjeta tiene una barra apilada de 12px de alto, con segmentos separados por `gap: 2px` y radio 2px, y abajo la leyenda «**n** clave» en 12px.
   - Colores de Tipo: A = teal, B = red, N/A = gray.
   - Colores de Tamaño: L = bordó, M = amarillo, S = fg2.
   - Colores de Estado: remediated = teal, review-done = line, in-progress = red.
3. Dos paneles en grid `minmax(390px,1fr)`:
   - **Vulnerabilidades por tipo**: 3 filas (Dependencias, Código (SAST), Secretos activos). Cada fila lleva label, total en 24px peso 300, detalle alineado a la derecha y una barra de 13px (corregibles en teal + residuales en bordó sobre fondo `--line2`). Al pie hay una nota sobre el repo con más secretos.
   - **Complejidad ciclomática · escala log**: el top 9 por complejidad, con una barra roja de 10px de alto y ancho `max(3%, log10(c)/log10(max)·100%)`, nombre de 150px con ellipsis y valor de 62px a la derecha.
4. **Tabla de repositorios** (tarjeta con `overflow: hidden`):
   - **Toolbar** (`padding: 11px 13px`, borde inferior): input de búsqueda de 210px, 4 selects (Tipo / Tamaño / Lenguaje / Estado, la primera opción es «X: todos») y a la derecha el contador «n de N repositorios».
   - Cuerpo con `max-height: 64vh; overflow: auto`. El `thead` es sticky y usa fondo `--bg2`.
   - **Encabezados**: 10px, peso 700, UPPERCASE, `letter-spacing: 0.07em`, color `--fg3`. Se pueden clickear para ordenar y muestran ↑/↓. Las columnas de texto arrancan en orden ascendente y las numéricas en descendente.
   - **Columnas**: Repositorio (600) · Tipo (pill 10px/700, A = teal/blanco, B = red/blanco, N/A = line/fg3) · Stack (fg3, ellipsis de 200px) · LOC (+ letra de tamaño en 10px/700 fg3) · Deps / Código / Secretos (número + micro-barra de 6px de alto con radio 999; ancho = valor/max·42 + 2 px, y en Secretos escala log; colores bordó / red / amarillo) · Residual (bordó en 700, o «—» en fg3) · Est. fix (fg3) · Progreso.
   - **Progreso**: un anillo de 34px (conic-gradient con máscara radial al 61–63%) de **4 segmentos de 84°** con 6° de separación, uno por fase en orden review, fixdeps, fixcode, fixsecrets. Colores: done = teal, pending = line, not-applicable = line2. El segmento `running` va en una capa aparte en rojo, con la animación `rbpulse` (opacity 1 → 0.25 → 1, 1.3s ease-in-out infinite). En el centro va el % en 9.5px/700. Tiene `title`/`aria-label` con el estado de cada fase.
   - Filas: `padding: 6px 10px`, `border-bottom: 1px solid var(--line2)`, fondo `--bg2` en hover. Un click o Enter navegan a `#/repo/:slug` y hacen scroll arriba.
   - Pie (11px, fg3): nota de honestidad sobre los datos anonimizados y estimados.

---

## Vista 2: Proyecto (`#/repo/:slug`)

**Para qué sirve**: entender el repo, elegir qué reparar, ver la estimación y ejecutar las fases.

1. Link «← Volver al portfolio» (12px/600, fg3).
2. **Header del repo**: slug en h1 de 32px/700 con `letter-spacing: -0.02em`, y al lado el stack, LOC y componentes del SBOM en 12.5px fg3. A la derecha, 4 facts (label de 10px UPPERCASE + valor de 14px/700):
   - Compilación: «OK · N s» en teal, o «falla» en bordó.
   - Tests: «N casos · baseline verde», o «· X ya fallaban».
   - Review.
   - Estado.
3. **Hero**: grid `minmax(300px,1fr)` con `gap: 14px` y 3 tarjetas (`padding: 20px 22px`, flex con `gap: 20px`).
   - **Tipo**: hexágono pointy-top de 96×110px (`clip-path: polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)`) con la letra en 52px/700. Fondo: B = red, A = teal, N/A = line.
     - Titular de 20px/700: «Bloqueado por arquitectura» (B), «Remediable automáticamente» (A) o «Sin vulnerabilidades».
     - Red rule de 72×2px.
     - Texto explicativo de 12px fg3: «Bloqueado por: {classification.blocking[].packageName}» o `classification.rationale`.
   - **Tamaño y complejidad**: hexágono negro con la letra S/M/L en blanco (`--bg`). Al lado, LOC en 30px/300 + «LOC · rango», y 3 barras de 7px en teal (Complejidad y Cognitiva, normalizadas contra el máximo del portfolio, y Duplicación en %).
   - **Potencial de remediación**: donut de 116px (conic teal con máscara al 66–68%) con el % en el centro en 28px/700 + «REMEDIABLE» en 9.5px. Remediable = (total − potential)/total, y el prototipo muestra «99,9%» cuando el valor redondeado daría 100% sin serlo. Al lado, la cifra en 30px/700 teal + «de N vulnerabilidades» + la nota.
   - Si el repo no tiene vulnerabilidades: donut en `--line`, «—» y el texto «El review no encontró vulnerabilidades…».
4. Dos paneles en grid `minmax(370px,1fr)`:
   - **Tamaño vs. complejidad en el portfolio**: scatter de 220px de alto con ejes de 1px `--line` a la izquierda y abajo, los dos en escala log. Sólo entran los repos con complejidad > 0. Puntos de 11px en gray y el repo actual en 18px rojo, con label rojo de 11px/700. Posición: x = 6 + norm·86 %, y = 8 + norm·82 %.
   - **Plan de dependencias por nivel**: una fila por nivel (del 1 al 4) más «Residual». Cada fila lleva nombre en 12.5px/700, meta en 11px fg3, valor en 17px/700 y una barra de 12px. Colores: teal para lo que se aplica, amarillo para el nivel 4 (`applied: false`), bordó para el residual. Al pie, leyenda de los 3 colores.
5. Título h2 «Selección de vulnerabilidades a reparar» (20px/700) + subtítulo.
6. Grid `minmax(0,1fr) 350px` con `align-items: start`:
   - **Grilla con tabs**: Dependencias / Código (SAST) / Secretos. Tab de 13px/700 con `padding: 12px 20px`. La activa lleva borde inferior de 2px red y texto fg; las inactivas, texto fg3.
     - **Barra de acciones masivas** (fondo `--bg2`): pills de 11.5px/600 con borde `--line`, que en hover pasan a borde y texto rojos. A la derecha, «n de N seleccionadas».
       - Dependencias: Seleccionar todo · Deseleccionar todo · Solo Critical + High · Sin cambio de código · Excluir nivel 4.
       - Código: Seleccionar todo · Deseleccionar todo · una pill por regla (usa el último segmento del nombre de la regla).
       - Secretos: Seleccionar todo · Deseleccionar todo · Solo activos · Solo verificados · Excluir falsos positivos.
     - **Cuerpo** con `height: 430px; overflow: auto`, organizado en **grupos colapsables** con header sticky:
       - Checkbox de grupo de 15px con estados vacío / «–» (parcial) / «✓» (todo, fondo rojo).
       - Chevron ▼/▶, título en 12.5px/700, meta en 11.5px fg3 y contador a la derecha.
       - Un grupo arranca abierto si tiene entre 1 y 40 filas.
     - **Grupos por tab**:
       - Dependencias: un grupo por nivel del plan, más el grupo **Residual — sin fix disponible**, que no se puede seleccionar (filas con opacity 0.55 y checkbox deshabilitado).
       - Código: un grupo por archivo.
       - Secretos: un grupo por archivo.
     - **Fila**: grid `22px minmax(90px,1.15fr) minmax(90px,1.05fr) 70px 64px 68px minmax(60px,1fr) 92px` con `gap: 8px`, `padding: 5px 13px`, 12px.
       - Columnas: checkbox · nombre (mono 11.5px/600) · destino (mono 11px fg3, «actual → objetivo» o la regla) · pill de severidad · tipo · alcance · info (CVEs o mensaje) · flag a la derecha.
       - Flags de dependencias: «bump simple» (fg3), «cambio de código» (red), «requiere migración» (amber), «sin fix» (bordó).
       - Pills de severidad: Critical = bordó/blanco, High = red/blanco, Medium = amarillo/negro, Low = line/negro.
       - Secretos: la pill dice «activo» (amarillo) o «falso pos.» (line). Los falsos positivos van tachados, con opacity 0.5 y **deseleccionados por defecto**.
     - **Selección por defecto**: todos los updates de los niveles 1–3, todo el SAST y todos los secretos activos. El nivel 4 arranca sin seleccionar.
   - **Panel «Estimación en vivo»** (`aside`, sticky en `top: 76px`):
     - Una fila por fase (review, fixdeps, fixcode, fixsecrets): nombre en mono 12.5px/700, tiempo en 14px/700, unidades, barra teal de 5px relativa al máximo y costo.
     - Bloque «Nivel 4 · aparte», si el repo tiene nivel 4: label amber, «n de N seleccionadas · tiempo · USD» y la aclaración de que no se aplica automáticamente.
     - Bloque con fondo `--bg2`: **Tiempo de fix** en 28px/700 y **Costo de fix** en 19px/700. Estos totales **no incluyen review**.
     - «Se corrigen» (teal) / «Quedan abiertas» (bordó), barra teal de 10px y nota del residual.
     - Botón primario de ancho completo, «Ejecutar las 3 fases en secuencia» (14px/700, `padding: 13px`, rojo, en hover bordó). Al pie, un disclaimer de 10.5px que aclara que tiempo y costo son proyecciones.
7. **Fases de remediación**: título + nota + «se ejecutan en secuencia: fixdeps → fixcode → fixsecrets» (11.5px/700 red). Grid `minmax(320px,1fr)` con 3 tarjetas:
   - Anillo de 84px con el % en el centro (20px/700) · nombre de la fase en mono 15px/700 · unidades · estado (12.5px/700, coloreado).
   - Tres stats separadas por líneas `--line2`: Corrige / Tiempo / Costo (label de 10px UPPERCASE + valor de 19px/700).
   - Barra de 6px con `transition: width .35s linear` + mensaje de paso en mono 11px fg3.
   - Botón de ancho completo, 13.5px/700, `padding: 12px`. Rojo cuando está habilitado; `--line2`/fg3 cuando está hecho, bloqueado o no aplica.
   - Labels del botón: «Ejecutar {fase}», «Ejecutando… N%», «Ejecutada», «Requiere {fase previa}» o «Sin trabajo pendiente».
8. **Franja de cierre** (fondo `--bg2`, grid de 4): Estado después de la remediación · Vulnerabilidades abiertas · Fix ejecutado (estimado) · Costo ejecutado (estimado). Valores en 24px/700.

---

## Vista 3: Remediados (`#/remediados`)

**Para qué sirve**: revisar el resultado y que QA tilde los flujos que verificó.

- Título h1 de 28px/700 + resumen («N repos · X corregidas · tiempo y USD estimados»).
- Una tarjeta por repo con `demoState.stage === 'remediated'`:
  - **Header**: slug como link de 18px/700 · pill de tipo · stack · a la derecha, la pill de estado de QA: «pendiente de QA» (line), «verificación parcial» (amarillo) o «verificado» (teal/blanco).
  - **Grid de 4 columnas** `minmax(225px,1fr)`, separadas por líneas `--line2`:
    - Dependencias: corregidas en 28px/700 «de N», barra teal y residuales en bordó.
    - Código y secretos: hallazgos SAST, secretos activos y unidades de trabajo.
    - Estimado por fase: una fila por fase con tiempo · costo, más el total.
    - Pull request (simulado): «PR #n» en mono red, commits y archivos, y la rama `remediation/{slug}`.
  - **Flujos impactados — verificación manual de QA**:
    - Arriba, el contador «n de N flujos verificados» y una barra roja de 6px.
    - Lista de filas `label` con grid `22px minmax(170px,1.1fr) 96px minmax(180px,1.5fr) 170px`: checkbox · nombre · pill de tipo (dependencia / código / secretos / transversal) · detalle en mono · sello «{responsable} · dd/mm hh:mm» o «sin verificar».
    - Los flujos se derivan de los datos: los 4 updates que más corrigen, los 3 primeros archivos SAST, «Configuración y credenciales» si el repo tiene secretos, y siempre «Smoke test de toda la app».

---

## Guía interactiva y Modo demo

- **Ver guía**: modo manual. Arranca pausado, se navega con ← / → y se sale con Escape o con «Salir». En este modo el paso de cierre se omite y la guía termina en el último paso.
- **Modo demo**: modo kiosco. Avanza solo y hace loop. También se puede abrir con el hash `#/tour`.
  - Toda la tipografía de la guía se agranda (~1,35×).
  - El cursor se oculta a los 5 s de inactividad.
  - Cualquier click o tecla fuera del diálogo pausa la guía, que se reanuda sola a los 45 s (se ignora el click que la lanzó, durante 1,5 s).
- **Duración de cada paso**: `step.seconds / 2`. Los segundos del guion se aceleraron a la mitad.
- **Capas** (`position: fixed`):
  - **Spotlight** (z 900): rectángulo con `box-shadow: 0 0 0 9999px rgba(2,2,2,.72)`, `outline: 2px solid red`, `outline-offset: 2px`, radio 6px y transición de left/top/width/height en .4s ease (sin transición si hay `prefers-reduced-motion`). Padding por defecto de 8px. Su alto se recorta con `clip`, y en ningún caso se sale del viewport.
  - **Placa** (z 940), para los pasos conceptuales: overlay de `rgba(2,2,2,.9)` con eyebrow rojo, título blanco de 44px (64px en kiosco), red rule de 96×3px, cuerpo de 19px (26px en kiosco) y, opcionalmente, un diagrama de nodos mono con borde de color unidos por →.
  - **Burbuja** (z 950): tarjeta con `border-top: 3px solid red`, radio 6px, `box-shadow: 0 18px 50px rgba(2,2,2,.45)` y ancho de 400px (560px en kiosco). Se ubica debajo, arriba, a la derecha o a la izquierda del foco, en ese orden de preferencia. Si no entra en ningún lado, recorta el foco para no taparlo. Adentro: eyebrow «Acto n · … · paso x de N», título, cuerpo y controles (‹ Anterior · Pausar/Reanudar · **Siguiente ›**, que lleva un anillo de progreso del paso · Salir).
  - **Barra de progreso** inferior (z 960): 4px (6px en kiosco), roja.
- **Los pasos operan la UI de verdad**: navegan a la ruta, cambian de tab, expanden grupos y aplican «solo Critical + High». Los textos se generan con los datos (totales, el repo con más secretos, el repo principal elegido por puntaje, el paquete del swap del nivel 3, el paquete bloqueante). Los targets se marcan con `data-tour="…"`: kpis, dist-tipo, tabla, col-potential, col-prog, row-{slug}, repo-header, repo-facts, hero, hero-tipo, plan-levels, bulk, grid, grupo-n{nivel}, grupo-res, estimacion, fases, flows-{slug}.
- El foco se vuelve a medir con resize, scroll y en cada tick (200ms). Si un target no aparece después de 10 intentos cada 150ms, el paso se saltea.
- El guion completo y los criterios originales están en `data/prompt-guia-demo.md`, y el array de pasos está en `tourSteps()` del prototipo. Diferencia con el guion original: se sacó el paso del log de ejecución y se agregó el de fases secuenciales.

---

## Interacciones y comportamiento

- **Routing por hash**: `#/dashboard`, `#/repo/:slug`, `#/remediados`, `#/tour`. Si el slug no existe, se cae al portfolio.
- **Estimación en vivo**: se recalcula con cada cambio de selección, con `meta.estimationModel` (C = `compileTimeSeconds` del repo, O = 60 s de overhead por fase):
  - **fixdeps**: una unidad por update seleccionado de los niveles 1–3.
    - Bump simple: `90 + 1.4·C` s y USD 0.85.
    - Con cambio de código (`requiresCodeChange`): `210 + 1.8·C` s y USD 1.60.
    - Se suma O si hay al menos una unidad.
    - El nivel 4 se calcula igual, pero se muestra **aparte**.
  - **fixcode**: una unidad por par (archivo × severidad): `120 + 1.0·C` s y USD 0.40 por unidad, + O.
  - **fixsecrets**: triage por tipo (`45` s, USD 0.12) + reescritura por archivo con secretos activos (`100 + 0.5·C` s, USD 0.35), + O.
  - **review**: tiempo real `reviewSeconds`, USD 3.20. **No suma** al «Tiempo de fix».
  - Vulns corregidas: `fixesCount` de los updates, más los totales reales por archivo y severidad (código) y por archivo (secretos). Con todo seleccionado, el panel tiene que coincidir exactamente con `estimate` del dataset.
- **Ejecución secuencial** (requisito): las fases van en el orden fixdeps → fixcode → fixsecrets.
  - Una fase sólo se habilita cuando las anteriores están `done` o `not-applicable`. Si no, el botón queda deshabilitado con «Requiere {fase}» y el estado muestra «en espera de {fase}».
  - Nunca corren dos fases a la vez en el mismo repo.
  - «Ejecutar las 3 fases en secuencia» arranca la primera fase pendiente y encadena la siguiente 500 ms después de que la anterior termina.
  - La simulación dura 10 ticks de 420 ms, con mensajes del tipo «step i/N — paquete» o «archivo», y cierra con «commiteado · gate verde».
  - **Snapshot**: al arrancar una fase se congelan sus unidades, tiempo, costo y vulns. Si después se cambia la selección, sólo se recalculan las fases que siguen pendientes.
- **Persistencia** (localStorage): `rb-theme` (light/dark) y `rb-qa-v2` (mapa `fid → {by, at}` con los checks de QA). La selección y las ejecuciones viven sólo en memoria, por repo.
- **Tema oscuro**: se pone `data-theme="dark"` en `<html>` y se redefinen `--bg #020202`, `--bg2 #0E0E0E`, `--card #0B0B0B`, `--line #2A2A28`, `--line2 #171716`, `--fg #FFF`, `--fg2 #E4E4E0`, `--fg3 #9A9A94`, `--gray #4A4A47`. Esta paleta es propia de la UI, porque el DS sólo define fondos claros.
- **Estados vacíos**:
  - Repo sin vulnerabilidades: donut neutro, «nada para remediar» y fases en «Sin trabajo pendiente».
  - Fase sin unidades: «no aplica», con el segmento del anillo en `--line2`.
- **Accesibilidad**:
  - Las filas de la tabla tienen `tabindex="0"` y se abren con Enter.
  - Los anillos tienen `role="img"` y `aria-label`.
  - Los checkboxes tienen `aria-label`.
  - Los diálogos de la guía tienen `role="dialog"` y `aria-live="polite"`.
  - Focus visible: 2px teal con 2px de offset (regla del DS).
- **Responsive**: todos los grids usan `auto-fit/minmax` y la toolbar y los headers hacen wrap. El layout 1fr + 350px del proyecto está pensado para ≥ 1100px, así que en pantallas angostas conviene apilar el panel debajo.

## Estado (sugerido)
- Ruta: `route`, `slug`.
- Portfolio: `q`, `fType`, `fSize`, `fLang`, `fStage`, `sortK`, `sortD`.
- Proyecto: `tab`, `sel[slug][itemId]: boolean`, `open[slug|groupKey]: boolean`.
- Fases: `phRun`, `phDone`, `phPct`, `phMsg`, `phRes`, todos con clave `slug:fase`, y `chain: boolean`.
- QA: `qa[fid]`. Tema: `theme`.
- Guía: `{ on, kiosk, i, paused, elapsed, spot, bubble, idleSince }`.

## Datos
- `data/demo-data.json` es el dataset completo que usa el prototipo.
  - `meta`: reglas, `estimationModel` y notas.
  - `fleet`: `repositoryCount`, `totals`, `distributions` y `repositories[]` (resumen por repo).
  - `repositories[slug]`: detalle por repo (`classification`, `dependencies.plan.levels[].updates[]`, `residualByPackage[]`, `sast.files[].findings[]`, `secrets.files[].findings[]`, `estimate`, `unitDetail`).
- `data/demo-data.source.json` es el export original, antes de los ajustes de la demo.
- **Ajustes que se hicieron sobre el export original**:
  - Se agregaron 13 repos Python/FastAPI y .NET, generados con el mismo modelo.
  - Se sacaron los 111.235 secretos de `altair-core`.
  - Los listados de SAST y secretos estaban recortados; se completaron hasta los totales reales, y las filas agregadas llevan `inferred: true`.
  - Se recalcularon `estimate`, `totals` y `distributions`.
- Los nombres de los repositorios son de fantasía (anonimizados). Los estados de avance, los PRs y las proyecciones son de demo.

## Tokens de diseño
Fuente: `tokens/colors_and_type.css` (redbee DS). Los alias que usa la UI son:

| Alias | Token | Hex |
|---|---|---|
| `--red` | `--rb-red` | #FF0001 |
| `--bordo` | `--rb-bordo` | #9F0000 |
| `--teal` | `--rb-teal` | #01BCBA |
| `--amber` | `--rb-yellow` | #FFBF00 |
| `--bg` / `--card` | `--rb-white` | #FFFFFF |
| `--bg2` / `--line2` | `--rb-tiza` | #F1F1EF |
| `--line` | `--rb-gray-mid` | (ver css) |
| `--fg` | `--rb-black` | #020202 |
| `--fg2` | `--rb-dark` | #373737 |
| `--fg3` | `--rb-text-muted` | (ver css) |
| `--gray` | — | #B9B9B4 |
| `--mono` | — | ui-monospace, SFMono-Regular, Menlo, Consolas |

- **Semántica de estados**: hecho = teal · en curso = red (con pulso) · parcial / frontera = amarillo · sin fix = bordó · pendiente = line · no aplica = line2. El verde no está en la paleta.
- **Reglas del brand**:
  - El teal nunca va como fondo grande (sólo en barras, anillos y pills chicas).
  - Sin sombras en la UI; la única excepción es la burbuja de la guía.
  - Sin gradientes decorativos (los conic-gradient son de datos).
  - Radios de 2–6px; el hexágono es la forma orgánica.
  - La red rule mide 72×2px.
- **Tipografía**: DM Sans. Escala usada: 9.5 / 10 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 15 / 17 / 19 / 20 / 24 / 28 / 30 / 32 / 40 / 52px. Pesos 300 (cifras hero), 600, 700. Labels UPPERCASE con `letter-spacing` de 0.06–0.1em.
- **Espaciado**: gaps de 7 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22px, y paddings de tarjeta de 15–22px.

## Assets
- `prototype/assets/abeja-roja.png`: isotipo de redbee (va en el header). Si el codebase tiene su propio sistema de marca, usá los assets de ese sistema.
- La fuente DM Sans y los tokens vienen de `tokens/colors_and_type.css`. El `@font-face` apunta a archivos del DS, así que tomalos del design system de redbee.
- Los iconos no se usan: la UI se resuelve con tipografía, hexágonos y barras.

## Archivos
- `prototype/Dashboard Remediacion.dc.html`: fuente del prototipo (template + lógica).
- `prototype/Dashboard Remediacion (offline).html`: versión autocontenida, para ver el prototipo sin servidor.
- `prototype/demo-data.js` y `prototype/support.js`: dataset y runtime del prototipo, necesarios para abrir el `.dc.html` desde un servidor local.
- `data/demo-data.json`: dataset legible.
- `data/demo-data.source.json`: export original.
- `data/prompt-guia-demo.md`: especificación original de la guía.
- `tokens/colors_and_type.css`: tokens del design system.
