# remediated-view Specification

## Purpose

Vista `#/remediados`: resultado por repo y checklist de QA persistido.

## Requirements

### Requirement: Resumen de repos remediados
La vista `#/remediados` SHALL mostrar un h1 de 28px/700 con el resumen «N repos · X corregidas · tiempo
y USD estimados», y una tarjeta por cada repo con `demoState.stage === 'remediated'`.

#### Scenario: Sólo remediados
- **WHEN** se abre `#/remediados`
- **THEN** aparece una tarjeta por cada repo en stage `remediated` y ninguno de los demás

### Requirement: Tarjeta de resultado por repo
Cada tarjeta SHALL tener:
- Un header con el slug como link a `#/repo/:slug`, la pill de tipo, el stack y la pill de QA:
  «pendiente de QA» (line), «verificación parcial» (amarillo) o «verificado» (teal/blanco).
- Un grid de 4 columnas:
  - **Dependencias**: corregidas «de N», barra teal y residuales en bordó.
  - **Código y secretos**: hallazgos SAST, secretos activos y unidades.
  - **Estimado por fase**: tiempo y costo de cada fase, más el total.
  - **Pull request (simulado)**: «PR #n», commits, archivos y la rama `remediation/{slug}`.

#### Scenario: Estado de QA
- **GIVEN** un repo con 7 flujos de los que 3 están verificados
- **THEN** la pill dice «verificación parcial»

### Requirement: Flujos impactados derivados de los datos
La lista de flujos de QA SHALL derivarse del detalle del repo, en este orden:
1. Los 4 updates de niveles aplicados que más corrigen (`fixesCount`), como «Regresión por {paquete}».
   El detalle es «actual → targetPackage | targetVersion | cambio de fuente».
2. Los 3 primeros archivos SAST.
3. «Configuración y credenciales», si el repo tiene secretos activos.
4. Siempre, «Smoke test de toda la app».

Cada flujo MUST tener un id estable `{slug}:{índice}` y una pill de tipo: dependencia, código,
secretos o transversal.

#### Scenario: Repo sin secretos
- **GIVEN** un repo remediado con `secrets.active = 0`
- **THEN** la lista no incluye «Configuración y credenciales» y termina con «Smoke test de toda la app»

### Requirement: Checklist de QA persistido
Cada flujo SHALL ser un `label` con checkbox, nombre, pill de tipo, detalle mono y un sello
«{responsable} · dd/mm hh:mm» o «sin verificar». Al tildarlo se MUST registrar `{by, at}` y, al
destildarlo, se MUST eliminar. El mapa `fid → {by, at}` MUST persistirse en `localStorage` bajo
`rb-qa-v2`. Arriba va el contador «n de N flujos verificados» con una barra roja de 6px. El
responsable por defecto es «QA · m.rodriguez».

#### Scenario: Persistencia del check
- **WHEN** QA tilda un flujo y recarga la página
- **THEN** el flujo sigue tildado con el mismo sello

### Requirement: Marcadores de la guía en Remediados
Cada bloque de flujos SHALL exponer `data-tour="flows-{slug}"`.

#### Scenario: Target de flujos
- **WHEN** se renderiza la vista
- **THEN** cada bloque de flujos tiene `data-tour="flows-{slug}"`
