## ADDED Requirements

### Requirement: Fidelidad al handoff de diseño
La UI SHALL reproducir con alta fidelidad el handoff `docs/design_handoff_remediacion_dashboard`:
colores, tipografía, espaciados, radios, estados e interacciones. Ante cualquier ambigüedad del
README, el comportamiento de `prototype/Dashboard Remediacion.dc.html` (`renderVals()` y los
métodos de `class Component`) MUST tomarse como especificación ejecutable.

#### Scenario: Comparación visual con el prototipo
- **GIVEN** el prototipo `Dashboard Remediacion (offline).html` y la app abiertos con el mismo viewport, tema y ruta
- **WHEN** se comparan las vistas Portfolio, Proyecto y Remediados
- **THEN** los tamaños de fuente, pesos, colores, espaciados y textos coinciden con los del prototipo

### Requirement: Tokens y reglas del brand redbee
Los estilos SHALL basarse en `tokens/colors_and_type.css` y exponer los alias `--red`, `--bordo`,
`--teal`, `--amber`, `--bg`, `--bg2`, `--card`, `--line`, `--line2`, `--fg`, `--fg2`, `--fg3`,
`--gray` y `--mono` con los valores del handoff. La UI MUST NOT usar sombras (salvo la burbuja
de la guía) ni gradientes decorativos (los conic-gradient de datos sí se permiten), y MUST NOT
usar teal como fondo de superficies grandes. La marca MUST escribirse «redbee», en minúscula.

#### Scenario: Tarjetas sin sombra
- **WHEN** se renderiza cualquier tarjeta
- **THEN** tiene `border: 1px solid var(--line)`, `border-radius: 4px`, fondo `var(--card)` y no tiene `box-shadow`

### Requirement: Tipografía DM Sans con cifras tabulares
El documento SHALL usar DM Sans variable (pesos 100–1000) con `font-variant-numeric: tabular-nums`
en todo el árbol, con la fuente servida desde la propia aplicación (sin depender de la red en
tiempo de ejecución).

#### Scenario: Fuente disponible offline
- **GIVEN** la app construida y servida sin acceso a internet
- **WHEN** se carga cualquier vista
- **THEN** el texto se renderiza en DM Sans

### Requirement: Header sticky global
Toda vista SHALL mostrar un header `position: sticky; top: 0; z-index: 40` con: el isotipo
`abeja-roja.png` de 26px de alto; el título «remediación automatizada de vulnerabilidades»; la
bajada «portfolio · {N} repositorios · nombres anonimizados», con N = `fleet.repositoryCount`;
la nav «Portfolio» (`#/dashboard`) y «Remediados» (`#/remediados`); la leyenda de estados
(hecha = teal, corriendo = red, pendiente = line, no aplica = line2 con borde); y los botones
«Ver guía», «Modo demo» y «Tema oscuro»/«Tema claro».

#### Scenario: Bajada con la cantidad de repos
- **GIVEN** un dataset con `fleet.repositoryCount = 70`
- **WHEN** se renderiza el header
- **THEN** la bajada dice «portfolio · 70 repositorios · nombres anonimizados»

#### Scenario: Estados hover de los botones
- **WHEN** el puntero pasa sobre «Ver guía»
- **THEN** el borde y el texto pasan a `var(--red)`
- **WHEN** el puntero pasa sobre «Modo demo»
- **THEN** el fondo pasa a `var(--bordo)`

### Requirement: Routing por hash
La app SHALL resolver las rutas `#/dashboard`, `#/repo/:slug`, `#/remediados` y `#/tour`,
y reaccionar a `hashchange`. Una ruta vacía o desconocida, o un slug inexistente en el dataset,
MUST mostrar el Portfolio. `#/tour` MUST redirigir a `#/dashboard` y arrancar el Modo demo.

#### Scenario: Slug inexistente
- **WHEN** se navega a `#/repo/no-existe`
- **THEN** se muestra la vista Portfolio

#### Scenario: Deep link al tour
- **WHEN** la app se abre con `#/tour`
- **THEN** el hash pasa a `#/dashboard` y la guía arranca en modo kiosco

### Requirement: Tema claro y oscuro persistido
El botón de tema SHALL alternar el atributo `data-theme` de `<html>` entre `light` y `dark`, y
persistir la elección en `localStorage` bajo la clave `rb-theme`. En `dark`, los tokens MUST
redefinirse a `--bg #020202`, `--bg2 #0E0E0E`, `--card #0B0B0B`, `--line #2A2A28`,
`--line2 #171716`, `--fg #FFF`, `--fg2 #E4E4E0`, `--fg3 #9A9A94` y `--gray #4A4A47`. Si
`localStorage` falla o está vacío, la app MUST arrancar en tema claro sin errores.

#### Scenario: Tema persistido entre recargas
- **GIVEN** el usuario activó el tema oscuro
- **WHEN** recarga la página
- **THEN** la app arranca con `data-theme="dark"` y el botón dice «Tema claro»

#### Scenario: Storage no disponible
- **GIVEN** `localStorage` lanza una excepción al accederlo
- **WHEN** la app arranca
- **THEN** se renderiza en tema claro y no hay errores sin capturar

### Requirement: Accesibilidad transversal
Los elementos focuseables SHALL mostrar un foco visible de 2px teal con 2px de offset. Los
anillos y donuts MUST tener `role="img"` y un `aria-label` descriptivo, y todos los checkboxes
MUST tener `aria-label`.

#### Scenario: Foco con teclado
- **WHEN** el usuario navega con Tab hasta un botón
- **THEN** se ve un outline teal de 2px con offset de 2px

### Requirement: Layout responsive
Los grids SHALL usar `auto-fit/minmax` según el handoff, y la toolbar y los headers MUST hacer
wrap. En viewports menores a 1100px, el layout `1fr + 350px` de la vista Proyecto MUST apilar el
panel de estimación debajo de la grilla. No MUST haber scroll horizontal de página.

#### Scenario: Viewport angosto
- **GIVEN** un viewport de 900px de ancho
- **WHEN** se abre un repo
- **THEN** el panel «Estimación en vivo» aparece debajo de la grilla y la página no tiene scroll horizontal
