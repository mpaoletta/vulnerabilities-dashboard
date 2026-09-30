## ADDED Requirements

### Requirement: Perfil del repositorio
La vista `#/repo/:slug` SHALL mostrar el link «← Volver al portfolio» y un header con el slug
(h1 32px/700) y, al lado, stack, LOC y componentes del SBOM. A la derecha van 4 facts:
- **Compilación**: «OK · N s» en teal, o «falla» en bordó.
- **Tests**: «N casos · baseline verde» o «· X ya fallaban».
- **Review**.
- **Estado**.

#### Scenario: Build roto
- **GIVEN** un repo con `compiles: false`
- **THEN** el fact Compilación dice «falla» en `--bordo`

### Requirement: Hero de clasificación, tamaño y potencial
La vista SHALL mostrar 3 tarjetas hero:

- **Tipo**: hexágono pointy-top de 96×110px con la letra y fondo B = red, A = teal o N/A = line.
  - Titular: «Bloqueado por arquitectura», «Remediable automáticamente» o «Sin vulnerabilidades».
  - Red rule de 72×2px.
  - Texto: «Bloqueado por: {classification.blocking[].packageName}» o `classification.rationale`.
- **Tamaño y complejidad**: hexágono negro con S/M/L, LOC en 30px/300 y 3 barras teal de 7px.
  Complejidad y Cognitiva se normalizan contra el máximo del portfolio; Duplicación va en %.
- **Potencial de remediación**: donut de 116px con remediable = (total − potential)/total.
  Si el valor redondeado da 100% sin serlo, se muestra «99,9%». Si no hay vulnerabilidades, el
  donut va en `--line`, muestra «—» y el texto «El review no encontró vulnerabilidades…».

#### Scenario: Casi todo remediable
- **GIVEN** un repo con 2000 vulnerabilidades y `potential = 1`
- **THEN** el donut muestra «99,9%» y no «100%»

#### Scenario: Repo tipo B
- **GIVEN** un repo tipo B con un paquete bloqueante
- **THEN** el hexágono es rojo con «B», el titular es «Bloqueado por arquitectura» y el texto nombra el paquete bloqueante

### Requirement: Scatter y plan por nivel
La vista SHALL mostrar dos paneles:
- Un scatter log-log «Tamaño vs. complejidad en el portfolio» de 220px de alto. Sólo incluye repos
  con complejidad > 0, con puntos grises de 11px, y el repo actual va en 18px rojo con label. La
  posición es x = 6 + norm·86 % e y = 8 + norm·82 %.
- Un panel «Plan de dependencias por nivel» con una fila por nivel (1–4) más «Residual». Las barras
  van en teal para lo que se aplica, amarillo para el nivel 4 (`applied: false`) y bordó para el
  residual, con la leyenda de los 3 colores.

#### Scenario: Repo sin complejidad
- **GIVEN** el repo actual tiene `complexity = 0`
- **THEN** el scatter no dibuja el punto rojo del repo y no falla

### Requirement: Grilla de selección con tabs, grupos y filas
La vista SHALL mostrar una grilla con tabs Dependencias / Código (SAST) / Secretos, donde la tab
activa lleva borde inferior de 2px rojo. El cuerpo tiene `height: 430px` con scroll y grupos
colapsables con header sticky.

Grupos por tab:
- **Dependencias**: un grupo por nivel del plan más «Residual — sin fix disponible», que no se puede
  seleccionar (opacity 0.55, checkbox deshabilitado).
- **Código**: un grupo por archivo.
- **Secretos**: un grupo por archivo.

Cada grupo tiene un checkbox de 3 estados (vacío / «–» parcial / «✓» con fondo rojo), chevron ▼/▶,
título, meta y contador. Un grupo MUST arrancar abierto si y sólo si tiene entre 1 y 40 filas.

Las filas usan el grid de columnas del handoff: checkbox, nombre mono, destino («actual → objetivo»
o regla), pill de severidad, tipo, alcance, info y flag.
- Flags de dependencias: «bump simple», «cambio de código», «requiere migración», «sin fix».
- Pills de severidad: Critical = bordó, High = red, Medium = amarillo, Low = line.
- Secretos: la pill dice «activo» o «falso pos.»; los falsos positivos van tachados con opacity 0.5.

#### Scenario: Checkbox de grupo parcial
- **GIVEN** un grupo con 5 filas de las que hay 2 seleccionadas
- **THEN** el checkbox del grupo muestra «–»
- **WHEN** se hace click en el checkbox del grupo
- **THEN** quedan seleccionadas las 5 filas y el checkbox muestra «✓»

#### Scenario: Grupo grande cerrado
- **GIVEN** un grupo con 120 filas
- **THEN** el grupo arranca colapsado (▶)

### Requirement: Selección por defecto y acciones masivas
La selección SHALL guardarse en memoria por repo. Por defecto incluye todos los updates de los
niveles 1–3, todos los hallazgos SAST y todos los secretos que no son falsos positivos; el nivel 4 y
los falsos positivos arrancan sin seleccionar. La barra de acciones masivas MUST ofrecer:
- **Dependencias**: Seleccionar todo · Deseleccionar todo · Solo Critical + High · Sin cambio de código · Excluir nivel 4.
- **Código**: Seleccionar todo · Deseleccionar todo · una pill por regla (con el último segmento del nombre).
- **Secretos**: Seleccionar todo · Deseleccionar todo · Solo activos · Solo verificados · Excluir falsos positivos.

A la derecha va el contador «n de N seleccionadas».

#### Scenario: Selección inicial
- **WHEN** se abre un repo por primera vez
- **THEN** están seleccionados los niveles 1–3, todo el SAST y los secretos activos, y no el nivel 4 ni los falsos positivos

#### Scenario: Solo Critical + High
- **WHEN** en Dependencias se elige «Solo Critical + High»
- **THEN** quedan seleccionados sólo los updates con severidad CRITICAL o HIGH, y la estimación se recalcula

#### Scenario: Selección conservada al navegar
- **GIVEN** el usuario cambió la selección del repo X
- **WHEN** va al Portfolio y vuelve a X
- **THEN** la selección de X se mantiene

### Requirement: Estimación en vivo
El panel «Estimación en vivo» (sticky en `top: 76px`) SHALL recalcularse con cada cambio de selección
usando `meta.estimationModel`, con C = `compileTimeSeconds` del repo y O = `phaseOverheadSeconds`:

- **fixdeps**: una unidad por update seleccionado de los niveles 1–3. Un bump cuesta
  `bumpSeconds + bumpCompileFactor·C` y `bumpUsd`. Uno con `requiresCodeChange` cuesta
  `codeChangeSeconds + codeChangeCompileFactor·C` y `codeChangeUsd`. Se suma O si hay al menos una unidad.
- **Nivel 4**: se calcula con la fórmula de cambio de código y se muestra aparte, en el bloque
  «Nivel 4 · aparte». No suma a los totales.
- **fixcode**: las unidades son `unitDetail.sastFiles` menos los pares (archivo × severidad) sin
  ningún hallazgo seleccionado. Cada unidad cuesta `secondsPerFile + compileFactor·C` y `usdPerFile`,
  + O. Las vulns corregidas son `vulnerabilities.code` menos el total real de los pares deseleccionados.
- **fixsecrets**: triage por tipo seleccionado (`triageSecondsPerType`, `triageUsdPerType`) más
  reescritura por archivo con secretos activos seleccionados (`secondsPerFile + compileFactor·C`,
  `usdPerFile`), + O.
- **review**: `reviewSeconds` y `reviewUsd`. No suma a «Tiempo de fix» ni a «Costo de fix».

El panel MUST mostrar una fila por fase, «Se corrigen» / «Quedan abiertas», la barra de corrección, el
botón «Ejecutar las 3 fases en secuencia» y el disclaimer de proyección.

#### Scenario: Paridad con el dataset
- **GIVEN** cualquier repo del dataset con la selección completa: niveles 1–3, todo el SAST y todos los secretos activos
- **WHEN** se calcula la estimación
- **THEN** los segundos y USD por fase coinciden con `repositories[slug].estimate` (tolerancia de redondeo de 0,1 s y 0,01 USD)
- **AND** las unidades de fixdeps y fixcode coinciden con `estimate.{fase}.units`, y las de fixsecrets coinciden con tipos de triage + archivos (`estimate.fixsecrets.units = unitDetail.secretTypes + unitDetail.secretFiles`)
- **EXCEPT** que, como en el prototipo, los tipos de secreto cuyos hallazgos son todos falsos positivos arrancan deseleccionados y no suman triage; en esos repos (vega-web y antares-api en el dataset de demo) fixsecrets queda por debajo del dataset en `triageSecondsPerType` y `triageUsdPerType` por cada uno de esos tipos

#### Scenario: Tipos de secreto sólo con falsos positivos
- **GIVEN** un repo con un tipo de secreto cuyos hallazgos son todos falsos positivos
- **WHEN** se calcula la estimación con la selección por defecto
- **THEN** ese tipo no cuenta como unidad de triage de fixsecrets

#### Scenario: Deseleccionar un archivo SAST
- **GIVEN** un archivo con hallazgos HIGH y MEDIUM
- **WHEN** se deseleccionan todos sus hallazgos
- **THEN** fixcode resta 2 unidades y resta de las corregidas el total real de ambos pares

### Requirement: Ejecución secuencial simulada de fases
La sección «Fases de remediación» SHALL mostrar 3 tarjetas (fixdeps, fixcode, fixsecrets). Cada una
tiene un anillo de 84px con %, unidades, estado, las stats Corrige / Tiempo / Costo, una barra de 6px
con `transition: width .35s linear`, un mensaje de paso y un botón.

- Una fase MUST habilitarse sólo cuando las anteriores están `done` o `not-applicable`. Si no, el botón
  dice «Requiere {fase}» y el estado dice «en espera de {fase}».
- Nunca MUST correr más de una fase a la vez en el mismo repo.
- La simulación dura 10 ticks de 420 ms, con mensajes «step i/N — paquete» o de archivo, y termina en
  «commiteado · gate verde».
- Al arrancar una fase, sus unidades, tiempo, costo y vulns MUST congelarse (snapshot); los cambios de
  selección posteriores sólo afectan a las fases pendientes.
- «Ejecutar las 3 fases en secuencia» arranca la primera fase pendiente y encadena la siguiente 500 ms
  después de que termina la anterior.
- Labels del botón: «Ejecutar {fase}», «Ejecutando… N%», «Ejecutada», «Requiere {fase previa}» y
  «Sin trabajo pendiente».

El estado inicial de cada fase sale de `demoState.phases`, y las ejecuciones viven sólo en memoria.

#### Scenario: Fase bloqueada
- **GIVEN** fixdeps está pending
- **THEN** el botón de fixcode está deshabilitado y dice «Requiere fixdeps»

#### Scenario: Encadenamiento
- **WHEN** se hace click en «Ejecutar las 3 fases en secuencia»
- **THEN** fixdeps corre hasta 100%, y 500 ms después arranca fixcode, luego fixsecrets, sin solaparse

#### Scenario: Snapshot al arrancar
- **GIVEN** fixdeps está corriendo
- **WHEN** el usuario deselecciona updates
- **THEN** las stats de fixdeps no cambian y las de fixcode/fixsecrets pendientes sí se recalculan

#### Scenario: Fase sin unidades
- **GIVEN** un repo sin secretos activos
- **THEN** la tarjeta de fixsecrets muestra «no aplica» y el botón «Sin trabajo pendiente», deshabilitado

### Requirement: Franja de cierre
La vista SHALL terminar con una franja de fondo `--bg2` y 4 valores de 24px/700: Estado después de la
remediación, Vulnerabilidades abiertas, Fix ejecutado (estimado) y Costo ejecutado (estimado).

#### Scenario: Después de ejecutar todo
- **WHEN** las 3 fases quedan hechas
- **THEN** «Fix ejecutado» y «Costo ejecutado» suman los snapshots de las 3 fases

### Requirement: Marcadores de la guía en Proyecto
La vista SHALL exponer los `data-tour`: `repo-header`, `repo-facts`, `hero`, `hero-tipo`,
`plan-levels`, `bulk`, `grid`, `grupo-n{nivel}`, `grupo-res`, `estimacion` y `fases`.

#### Scenario: Target de grupo de nivel
- **WHEN** se renderiza el tab Dependencias con un nivel 3
- **THEN** su grupo tiene `data-tour="grupo-n3"`
