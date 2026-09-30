# guided-tour Specification

## Purpose

Guía interactiva manual y modo demo kiosco.

## Requirements

### Requirement: Guion de 21 pasos generado con los datos
La guía SHALL implementar los pasos de `tourSteps()` del prototipo: actos 0–4, 21 pasos visibles
más un paso de cierre que sólo aparece en kiosco. Los títulos y cuerpos MUST calcularse del dataset
(totales, cantidad de lenguajes, repo con más secretos, repo principal elegido con el puntaje de
`pickDemoRepos()`, paquete del swap de nivel 3, paquete bloqueante, builds rotos y peor baseline).

#### Scenario: Repo principal por puntaje
- **WHEN** se arma el guion
- **THEN** el repo principal es el de mayor puntaje según `pickDemoRepos()`: +4 por tipo B, +3 por residual, +2 por código, +2 por secretos, +3 por swap y +2 por bloqueante

### Requirement: Modo manual (Ver guía)
«Ver guía» SHALL arrancar la guía pausada. Se navega con ← / → y con los controles, y se sale con
Escape o «Salir». En este modo, el paso de cierre MUST omitirse: avanzar desde el último paso
visible cierra la guía.

#### Scenario: Navegación con teclado
- **GIVEN** la guía manual en el paso 3
- **WHEN** se presiona →
- **THEN** la guía pasa al paso 4
- **WHEN** se presiona Escape
- **THEN** la guía se cierra y se restauran los listeners

### Requirement: Modo demo kiosco
«Modo demo» (o el hash `#/tour`) SHALL arrancar la guía en autoplay con loop. Cada paso dura
`step.seconds / 2`. En este modo:
- La tipografía de la guía se agranda (~1,35×): burbuja de 560px, títulos de placa de 64px, cuerpo de 26px.
- El cursor se oculta tras 5 s sin movimiento.
- Un click o tecla fuera del diálogo pausa la guía, que se reanuda sola a los 45 s. Las interacciones
  de los primeros 1,5 s después de arrancar se ignoran.

#### Scenario: Pausa por interacción
- **GIVEN** el kiosco corriendo desde hace más de 1,5 s
- **WHEN** se hace click fuera de la burbuja
- **THEN** la guía se pausa
- **WHEN** pasan 45 s sin interacción
- **THEN** la guía se reanuda sola

#### Scenario: Loop
- **WHEN** el kiosco termina el paso de cierre
- **THEN** vuelve al primer paso

### Requirement: Capas de spotlight, placa, burbuja y barra
La guía SHALL renderizar capas `position: fixed`:
- **Spotlight** (z 900): `box-shadow: 0 0 0 9999px rgba(2,2,2,.72)`, outline rojo de 2px con offset de
  2px, radio 6px y transición de .4s, que se desactiva con `prefers-reduced-motion`. Padding por
  defecto de 8px; su alto se recorta con `clip` y nunca sale del viewport.
- **Placa** (z 940) para los pasos conceptuales: overlay `rgba(2,2,2,.9)`, eyebrow rojo, título,
  red rule de 96×3px, cuerpo y un diagrama opcional de nodos unidos por →.
- **Burbuja** (z 950): `border-top: 3px solid red`, `box-shadow: 0 18px 50px rgba(2,2,2,.45)` y
  `role="dialog"` con `aria-live="polite"`. Muestra eyebrow «Acto n · … · paso x de N», título, cuerpo
  y controles ‹ Anterior · Pausar/Reanudar · Siguiente › (con anillo de progreso del paso) · Salir.
- **Barra de progreso** inferior (z 960): 4px, o 6px en kiosco.

La burbuja MUST ubicarse debajo, arriba, a la derecha o a la izquierda del foco, en ese orden de
preferencia, siguiendo el algoritmo de `tourMeasure()`. Si no entra en ningún lado, se recorta el foco
para no taparlo.

#### Scenario: Sin espacio abajo
- **GIVEN** un target en el borde inferior del viewport
- **THEN** la burbuja se ubica arriba del spotlight sin superponerse

### Requirement: Los pasos operan la UI real
Cada paso SHALL poder navegar a su ruta, cambiar de tab, expandir grupos (`expand`) y aplicar «Solo
Critical + High» (`selectCritical`) sobre el estado real de la app. El spotlight MUST volver a medirse
con resize, scroll y en cada tick de 200 ms. Si el target (`[data-tour="…"]`) no aparece después de 10
intentos cada 150 ms, el paso se saltea.

#### Scenario: Paso del grupo residual
- **WHEN** la guía llega al paso «Lo que no tiene arreglo»
- **THEN** la app está en `#/repo/{principal}`, tab Dependencias, con el grupo Residual expandido y el spotlight sobre él

#### Scenario: Target ausente
- **GIVEN** un paso cuyo target no existe en el DOM
- **WHEN** pasan 10 reintentos
- **THEN** la guía avanza al paso siguiente
