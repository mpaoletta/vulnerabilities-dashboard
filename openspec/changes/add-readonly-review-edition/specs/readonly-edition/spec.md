# Spec Delta

## Purpose

Edición «review» sólo lectura del dashboard, pensada para distribuir a clientes: muestra el resultado del
review de sus repositorios, el backlog a remediar y la estimación de costo, sin las partes de ejecución de
la remediación. Los demás specs describen la edición full; este define las diferencias de la edición review.

## ADDED Requirements

### Requirement: Selección de la edición en build time
La app SHALL soportar dos ediciones: `full` (por defecto) y `review`. La edición MUST determinarse al
construir la app, a partir de la variable de entorno `VITE_EDITION`; cualquier valor distinto de `review`
(o su ausencia) MUST producir la edición `full`. La edición MUST NOT poder cambiarse en tiempo de ejecución
(ni por URL, ni por `localStorage`, ni por la UI). El proyecto MUST ofrecer un comando de build dedicado
que genere la edición review en un directorio de salida distinto del de la edición full.

#### Scenario: Build por defecto
- **GIVEN** que `VITE_EDITION` no está definida
- **WHEN** se construye la app
- **THEN** el resultado es la edición full, idéntica a la actual

#### Scenario: Build review
- **GIVEN** `VITE_EDITION=review`
- **WHEN** se ejecuta el build de la edición review
- **THEN** se genera un bundle en un directorio de salida propio con la edición review

#### Scenario: Sin override en runtime
- **GIVEN** la edición review construida
- **WHEN** se abre con un hash, query string o valor de `localStorage` que intente activar la edición full
- **THEN** la app sigue en edición review

### Requirement: Paridad con la edición full
Fuera de los elementos que este spec manda ocultar, la edición review SHALL renderizar exactamente lo mismo
que la edición full para el mismo dataset, ruta, tema y selección: textos, cifras, estilos, layout,
interacciones y atributos `data-tour`. En particular MUST conservar el Portfolio completo (KPIs,
distribuciones, paneles, tabla con su columna Progreso), el perfil y el hero del repo, el scatter, el plan por
nivel, la grilla de selección con sus acciones masivas y el panel «Estimación en vivo» con sus cálculos.

#### Scenario: Portfolio idéntico
- **GIVEN** el mismo dataset en ambas ediciones
- **WHEN** se abre `#/dashboard`
- **THEN** el contenido de `<main>` es igual en las dos ediciones

#### Scenario: Estimación idéntica
- **GIVEN** un repo con la misma selección en ambas ediciones
- **WHEN** se lee el panel «Estimación en vivo»
- **THEN** las filas por fase, «Tiempo de fix», «Costo de fix», el bloque «Nivel 4 · aparte», «Se corrigen» y «Quedan abiertas» muestran los mismos valores

#### Scenario: La selección sigue siendo editable
- **GIVEN** la edición review en `#/repo/{slug}`
- **WHEN** el usuario elige «Solo Critical + High»
- **THEN** la selección cambia y la estimación se recalcula como en la edición full

### Requirement: Sin ejecución de fases en la vista Proyecto
En la edición review, la vista `#/repo/:slug` MUST NOT mostrar la sección «Fases de remediación» (las
tarjetas de fixdeps, fixcode y fixsecrets, incluido el target `data-tour="fases"`) ni la franja de cierre
(«Estado después de la remediación», «Vulnerabilidades abiertas», «Fix ejecutado», «Costo ejecutado»). El
panel «Estimación en vivo» MUST NOT mostrar el botón «Ejecutar las 3 fases en secuencia», y MUST conservar
el disclaimer de proyección. No MUST existir ningún control que inicie, simule o encadene la ejecución de una
fase.

#### Scenario: Vista Proyecto sin fases
- **GIVEN** la edición review
- **WHEN** se abre `#/repo/{slug}` de cualquier repo del dataset
- **THEN** no hay ningún botón «Ejecutar…», ni tarjetas de fases, ni franja de cierre, ni elemento con `data-tour="fases"`

#### Scenario: Panel de estimación sin botón
- **GIVEN** la edición review
- **WHEN** se renderiza «Estimación en vivo»
- **THEN** el panel termina con el disclaimer «Tiempo y costo son proyecciones del modelo de estimación…» y no tiene botón de ejecución

### Requirement: Sin vista Remediados
En la edición review, el header MUST NOT mostrar el link «Remediados» en la nav, y la ruta `#/remediados`
MUST resolverse como una ruta desconocida, mostrando el Portfolio. El resto del header (isotipo, título,
bajada, link «Portfolio», leyenda de estados, «Ver guía», «Modo demo» y botón de tema) MUST mantenerse.

#### Scenario: Nav sin Remediados
- **GIVEN** la edición review
- **WHEN** se renderiza el header
- **THEN** la nav tiene sólo el link «Portfolio»

#### Scenario: Deep link a Remediados
- **GIVEN** la edición review
- **WHEN** se navega a `#/remediados`
- **THEN** se muestra la vista Portfolio y no se renderiza el checklist de QA

### Requirement: Guía sin pasos de ejecución
En la edición review, la guía (manual y kiosco) SHALL omitir los pasos cuyo target pertenece a la ejecución
de la remediación: el de «Fases de remediación» (`data-tour="fases"`) y el de los flujos de QA
(`data-tour="flows-{slug}"`). Los demás pasos, incluidas las placas conceptuales y el paso de cierre del
kiosco, MUST mantenerse con el mismo contenido y orden, y el contador «paso x de N» MUST reflejar la cantidad
de pasos visibles de la edición. Ningún paso MUST navegar a `#/remediados`.

#### Scenario: Guía manual en review
- **GIVEN** la edición review
- **WHEN** se recorre la guía manual de principio a fin
- **THEN** ningún paso apunta a `fases` ni a `flows-{slug}`, y N en «paso x de N» es 2 menos que en la edición full

#### Scenario: Kiosco en loop
- **GIVEN** la edición review en Modo demo
- **WHEN** el kiosco completa una vuelta
- **THEN** nunca se muestra `#/remediados` y el loop vuelve al primer paso
