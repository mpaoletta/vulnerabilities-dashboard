# portfolio-view Specification

## Purpose

Vista `#/dashboard`: KPIs, distribuciones, paneles y tabla de repositorios del portfolio.

## Requirements

### Requirement: KPIs del portfolio
La vista `#/dashboard` SHALL mostrar 5 tarjetas KPI en un grid `repeat(auto-fit, minmax(230px,1fr))`
con `gap: 12px`. Cada tarjeta tiene label de sección, cifra de 40px/300 y nota:
- **Repositorios**: `fleet.repositoryCount`, con la nota «X compilan · Y con build roto».
- **Vulnerabilidades**: dependencias + código + secretos activos, con el desglose.
- **Residuales sin fix**: `totals.potential`, con la nota «quedan abiertas tras el nivel 3 del plan».
- **Review acumulado**: `totals.reviewSeconds`, con las LOC analizadas.
- **Fix estimado**: Σ(`estimate.total.seconds − reviewSeconds`), con unidades y USD.

#### Scenario: Conteo de compilación
- **GIVEN** un portfolio donde 3 repos tienen `compiles: false`
- **WHEN** se renderiza el KPI Repositorios
- **THEN** la nota dice «{N−3} compilan · 3 con build roto»

### Requirement: Distribuciones del portfolio
La vista SHALL mostrar 4 tarjetas de distribución (Tipo de proyecto, Tamaño (LOC), Estado de
avance y Lenguaje). Cada una tiene una barra apilada de 12px con segmentos separados por 2px y
radio 2px, y una leyenda «**n** clave». Colores de Tipo: A = teal, B = red, N/A = gray. Colores de
Tamaño: L = bordó, M = amarillo, S = fg2. Colores de Estado: remediated = teal, review-done = line,
in-progress = red.

#### Scenario: Segmentos proporcionales
- **WHEN** se renderiza la distribución de Tipo
- **THEN** el ancho de cada segmento es proporcional al conteo de `fleet.distributions.byType`

### Requirement: Paneles de vulnerabilidades y complejidad
La vista SHALL mostrar un panel «Vulnerabilidades por tipo» con 3 filas (Dependencias, Código (SAST)
y Secretos activos). Cada fila tiene una barra de 13px con los corregibles en teal y los residuales en
bordó sobre `--line2`. Al pie va una nota sobre el repo con más secretos. Al lado, un panel
«Complejidad ciclomática · escala log» con el top 9, cuya barra roja de 10px mide
`max(3%, log10(c)/log10(max)·100%)`.

#### Scenario: Top 9 por complejidad
- **WHEN** se renderiza el panel de complejidad
- **THEN** muestra los 9 repos con mayor `complexity`, en orden descendente

### Requirement: Tabla de repositorios filtrable y ordenable
La vista SHALL mostrar una tabla con toolbar:
- Búsqueda de texto por slug.
- Selects Tipo / Tamaño / Lenguaje / Estado, cuya primera opción es «X: todos».
- Contador «n de N repositorios».

El cuerpo tiene `max-height: 64vh` y `thead` sticky. Las columnas son: Repositorio, Tipo (pill),
Stack, LOC (+ letra de tamaño), Deps, Código y Secretos (número + micro-barra; Secretos en escala
log), Residual, Est. fix y Progreso.

Al hacer click en un encabezado, la tabla SHALL ordenarse por esa columna y mostrar ↑/↓. El primer
click ordena las columnas de texto de forma ascendente y las numéricas de forma descendente, y un
segundo click invierte el sentido. El orden inicial es por LOC descendente.

#### Scenario: Filtro combinado
- **WHEN** se elige Tipo = A y se busca «core»
- **THEN** sólo quedan los repos tipo A cuyo slug contiene «core», y el contador se actualiza

#### Scenario: Orden por columna numérica
- **WHEN** se hace click en «Deps»
- **THEN** la tabla queda ordenada por vulnerabilidades de dependencias descendente, con ↓
- **WHEN** se vuelve a hacer click
- **THEN** el orden pasa a ascendente, con ↑

#### Scenario: Residual vacío
- **GIVEN** un repo con `potential = 0`
- **THEN** la celda Residual muestra «—» en `--fg3`

### Requirement: Anillo de progreso de fases
La columna Progreso SHALL mostrar un anillo de 34px de 4 segmentos de 84° con 6° de separación,
en el orden review, fixdeps, fixcode, fixsecrets. Colores: done = teal, pending = line,
not-applicable = line2. Un segmento `running` se dibuja en una capa roja aparte con la animación
`rbpulse` (1.3s). En el centro va el %: cada fase aplicable pesa 1 si está hecha y 0.5 si está
corriendo, y se excluyen las que no aplican. El anillo MUST tener `role="img"` y un `aria-label`
con el estado de cada fase.

#### Scenario: Progreso con una fase no aplicable
- **GIVEN** las fases review=done, fixdeps=done, fixcode=pending y fixsecrets=not-applicable
- **THEN** el centro muestra 67% y el cuarto segmento se ve en `--line2`

### Requirement: Navegación desde la tabla
Cada fila SHALL tener `tabindex="0"`. Un click o Enter MUST navegar a `#/repo/:slug` y hacer scroll
al inicio de la página.

#### Scenario: Abrir repo con teclado
- **WHEN** una fila tiene foco y se presiona Enter
- **THEN** la ruta pasa a `#/repo/{slug}` y la página queda scrolleada arriba

### Requirement: Marcadores de la guía en el Portfolio
Los elementos del Portfolio SHALL exponer los atributos `data-tour` que usa la guía: `kpis`,
`dist-tipo`, `tabla`, `col-potential`, `col-prog` y `row-{slug}`.

#### Scenario: Target de fila
- **WHEN** se renderiza la tabla
- **THEN** cada fila tiene `data-tour="row-{slug}"`
