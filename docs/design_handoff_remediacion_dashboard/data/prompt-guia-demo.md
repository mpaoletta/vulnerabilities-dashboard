# Agregar una guía interactiva a la demo, con modo loop para stand de conferencia

Agregá a la demo una **guía guiada paso a paso**: en cada paso se ilumina una parte
concreta de la interfaz y aparece una **burbuja de diálogo** que la explica. Tiene que
funcionar en dos modos: **manual** (alguien la recorre con el mouse) y **loop de kiosco**
(avanza sola en un monitor del stand, sin nadie tocándola).

Mantené el design system y todo el texto en español. Esto se suma a la demo actual: no
rediseñes nada de lo que ya existe.

---

## 1. Mecánica

### El spotlight

Un overlay oscurece toda la página menos el elemento del paso actual, que queda recortado
y con un halo de acento. Implementalo con un `<div>` fijo cuyo `box-shadow` gigante genera
el recorte (`box-shadow: 0 0 0 9999px rgba(...)`) posicionado sobre el `getBoundingClientRect()`
del objetivo, o con una máscara SVG — lo que te salga más limpio. Requisitos:

- El recorte sigue al elemento: recalculalo en `resize`, en `scroll` y cuando cambia de paso.
- Antes de iluminar, hacé `scrollIntoView({block: "center"})` del objetivo y esperá a que
  termine el scroll.
- Transición suave de un recorte al siguiente (~400 ms). Con `prefers-reduced-motion`,
  corte seco.
- El overlay **no** bloquea la lectura: si el objetivo es una tabla larga, iluminá sólo las
  primeras filas o el encabezado, no 800 px de alto.

### La burbuja

Un panel con punta triangular apuntando al elemento. Se ubica sola en el lado con más
espacio (arriba / abajo / izquierda / derecha) y nunca se sale de la pantalla. Contiene:

- Un **eyebrow** con el acto y la posición: `Acto 2 · paso 8 de 21`
- Un **título** corto
- Un **cuerpo** de una o dos frases
- Controles: `‹ Anterior`, `Pausar / Reanudar`, `Siguiente ›`, `Salir`
- Un **anillo de progreso** en el botón Siguiente que se va llenando con el tiempo del paso
  (es el reloj del avance automático; en modo manual queda vacío)

### El recorrido dirige la interfaz

Cada paso declara el estado que necesita y la guía lo aplica **antes** de iluminar: navegar
a una vista, abrir un repo, cambiar de pestaña, expandir un nivel del plan, marcar o
desmarcar una selección. Un paso que explica el recálculo de la estimación tiene que
ejecutar realmente esa selección para que el número se mueva a la vista del espectador.

Modelá cada paso así:

```js
{
  id: "plan-niveles",
  act: 2,
  route: "#/repo/vega-web",
  setup: { tab: "dependencias", expandLevels: [2], select: null, scrollTo: null },
  target: '[data-tour="plan-levels"]',
  title: "Un plan en cuatro niveles",
  body: "…",
  seconds: 11
}
```

Marcá los objetivos con atributos `data-tour="…"` en el HTML existente en vez de depender
de selectores frágiles de clase.

### Modo loop (kiosco)

Se activa con `#/tour` o con un botón **“Modo demo”** en la esquina del dashboard.

- Avanza solo con el tiempo de cada paso y **vuelve al principio al terminar**, indefinidamente.
- Entre el último paso y el primero, una placa de cierre de 6 segundos con el nombre del
  producto y una línea de valor.
- **Tipografía más grande**: en kiosco la burbuja escala ~1,35× y el ancho máximo sube, para
  que se lea a dos metros. Hacelo con un atributo `data-kiosk` en el root y tokens de tamaño,
  no duplicando estilos.
- **El cursor se oculta** tras 5 segundos sin movimiento.
- **Si alguien interactúa** (click, tecla, scroll), la guía pasa a pausa y muestra los
  controles; si pasan **45 segundos sin actividad**, reanuda sola desde donde está.
- Barra de progreso general del recorrido en el borde inferior de la pantalla.
- Nada de sonido, nada que requiera confirmación, nada que pueda quedar trabado en un
  estado de error: si un objetivo no existe, saltá al paso siguiente en vez de romper.

### Modo manual

Botón **“Ver guía”** junto a “Modo demo”. Mismo recorrido, sin avance automático: el anillo
del botón Siguiente no corre y el usuario avanza a su ritmo. `Escape` sale, `←` y `→`
navegan. Al salir, la interfaz queda en el estado en que estaba, usable.

### Accesibilidad

La burbuja es `role="dialog"` con `aria-live="polite"`, el foco entra en ella al cambiar de
paso, y los controles son alcanzables por teclado. El overlay lleva `aria-hidden="true"`.

---

## 2. El guion completo

21 pasos en cinco actos. Los textos son los definitivos: usalos tal cual.

### Acto 0 — El problema y el proceso (sin spotlight, placa centrada)

**1. Portada** · 8 s · placa a pantalla completa
> **Remediación de vulnerabilidades, de punta a punta**
> Detectar es la parte fácil. Esta herramienta corrige, verifica que no rompió nada, y le
> dice a QA exactamente qué volver a probar.

**2. La escala del problema** · 10 s · iluminar la fila de KPIs
> **57 repositorios, 124.482 hallazgos**
> Siete lenguajes y dieciséis frameworks: Angular, NestJS, Spring, Swift, Kotlin, Go,
> Express. Ningún equipo puede con esto a mano.

**3. Las cuatro fases** · 12 s · placa con el diagrama de las fases
> **Review → fixdeps → fixcode → fixsecrets**
> Review escanea y arma el plan. Las tres fases siguientes lo ejecutan: dependencias,
> código y secretos. Ninguna vuelve a escanear — todas consumen lo que dejó review.

**4. Qué es un paso verificado** · 12 s · placa con el diagrama del gate
> **Se commitea sólo si queda en verde**
> Cada unidad de trabajo se aplica, compila, y corre los tests. Si el build se rompe, la IA
> lo arregla. Si aparece una regresión, la IA la arregla. Si igual queda en rojo, esa unidad
> se descarta y el proceso sigue con la siguiente.

### Acto 1 — El dashboard de la flota

**5. La vista general** · 9 s · iluminar el dashboard completo
> **Todo el portafolio en una pantalla**
> Cuántos repositorios hay, de qué tipo, qué tan grandes y cuánta deuda de seguridad
> arrastra cada uno.

**6. Tipo A y tipo B** · 11 s · iluminar el gráfico de distribución por tipo
> **La clasificación que decide el alcance**
> Un proyecto tipo A se puede remediar sin tocar la arquitectura. Uno tipo B está bloqueado
> por un framework que exige migración. De los 57, hay 36 tipo A y 20 tipo B.

**7. La tabla de repositorios** · 10 s · iluminar el encabezado y las primeras filas
> **Una fila por repositorio**
> Tipo, stack, tamaño, y las vulnerabilidades separadas en tres familias: dependencias,
> código y secretos. Se ordena y se filtra por cualquiera de ellas.

**8. La columna Potential** · 13 s · iluminar la columna `potential`
> **Lo que va a quedar sin corregir**
> Es el número honesto: 1.031 de las 3.169 vulnerabilidades de dependencias no tienen
> arreglo disponible hoy. Siempre son de dependencias — el código y los secretos se corrigen
> completos.

**9. El reloj de avance** · 11 s · iluminar la columna de progreso de una fila
> **Cuatro segmentos, una fase cada uno**
> Verde lo terminado, animado lo que está corriendo, gris lo pendiente. Si un repositorio no
> tiene secretos, esa fase queda neutra: no hay nada que hacer.

**10. Los outliers** · 11 s · iluminar la fila de `altair-core`
> **Un repositorio con 111.235 secretos**
> Concentra el 93 % de los secretos de toda la flota. Casi seguro es entropía de bundles
> vendorizados — exactamente el caso donde el triage automático vale más que la corrección.

### Acto 2 — La vista de proyecto

**11. Entrar a un repositorio** · 9 s · abrir `vega-web`, iluminar la cabecera
> **vega-web, tipo B**
> Un monorepo Angular y NestJS: 1,1 millones de líneas, 1.397 tests, 112 vulnerabilidades de
> dependencias, 10 de código, 17 secretos activos.

**12. Por qué es tipo B** · 11 s · iluminar el motivo de clasificación
> **Un solo paquete lo bloquea**
> `@babel/core` es un componente arquitectural: actualizarlo obliga a migrar toda la cadena
> de Babel de forma coordinada. Eso saca al proyecto del alcance automático.

**13. Los tres tipos de hallazgo** · 10 s · iluminar los tres paneles de métricas
> **Cada familia se corrige distinto**
> Las dependencias se actualizan, el código se reescribe, los secretos se trían y se sacan.
> Son tres motores diferentes con el mismo gate de verificación.

**14. El plan en cuatro niveles** · 14 s · pestaña dependencias, iluminar los niveles
> **De menor a mayor riesgo**
> Nivel 1, upgrades menores. Nivel 2, actualizaciones sin impacto arquitectural. Nivel 3,
> cambio de librería. Nivel 4, migración de framework. Se aplican en ese orden, y el nivel 4
> no se aplica solo: es la frontera.

**15. Cambiar de librería, no sólo de versión** · 13 s · expandir nivel 3, iluminar `ip → ipaddr.js`
> **Nivel 3: el paquete se reemplaza**
> `ip` está deprecada y no hay versión que la arregle. El plan la sustituye por `ipaddr.js` y
> la IA reescribe los puntos de uso. Ningún bot de actualización hace esto.

**16. Lo que no tiene arreglo** · 12 s · iluminar la sección residual
> **25 paquetes, 93 vulnerabilidades sin fix**
> Angular, axios, webpack, vite. No se seleccionan porque no hay nada que aplicar. Esta
> sección es la que explica la columna Potential de la vista anterior.

**17. Elegir qué corregir** · 12 s · iluminar los selectores masivos y ejecutar una selección
> **Por criticidad, por nivel, por archivo**
> Se elige de a uno o en bloque. Acá dejamos sólo las críticas y altas, y todo lo demás se
> recalcula al instante.

**18. Cuánto cuesta y cuánto tarda** · 13 s · iluminar el panel de estimación
> **La estimación se mueve con la selección**
> Tiempo y costo por fase, calculados sobre las unidades de trabajo reales y el tiempo de
> compilación de este repositorio. Compilar acá tarda doce minutos: por eso cada paso
> verificado se paga caro.

### Acto 3 — El proceso corriendo

**19. El registro de ejecución** · 13 s · iluminar el log
> **Paso por paso, con evidencia**
> Qué se aplicó, qué archivos cambió, cómo salió la compilación y cómo salieron los tests.
> Dos de los siete pasos necesitaron que la IA reparara algo antes de poder commitear.

**20. Los tests se comparan contra un baseline** · 13 s · iluminar el resultado de los tests
> **Paridad, no verde absoluto**
> Review guarda el resultado de cada test antes de tocar nada. El gate exige que siga pasando
> lo que ya pasaba. En esta flota hay 12 repositorios que ni compilan y uno con 973 tests en
> rojo: sin baseline, no habría forma de distinguir una regresión de la deuda que ya estaba.

### Acto 4 — El resultado

**21. Lo que recibe el equipo** · 14 s · vista de remediados, iluminar el informe de flujos
> **Un PR y un plan de regresión**
> Al final del proceso sale un pull request con todos los cambios verificados, y un informe
> que traduce cada cambio a las pantallas y endpoints que toca. QA no tiene que adivinar qué
> probar: lo tacha de una lista.

### Placa de cierre (sólo en loop) · 6 s
> **Detectar, corregir, verificar, entregar**
> Y volver a empezar. — *[dejá lugar para el logo]*

---

## 3. Detalles que hacen la diferencia en un stand

- **Arranca sola.** Si la URL trae `#/tour`, el loop empieza sin que nadie toque nada.
- **Nunca termina en una pantalla muerta.** Al final del recorrido vuelve al dashboard y
  reinicia.
- **Legible de lejos.** En kiosco, el cuerpo de la burbuja no baja de ~19 px y el título
  ronda los ~30 px. Contraste alto contra el overlay.
- **Los números se leen.** Cuando un paso menciona una cifra que está en pantalla —los
  111.235 secretos, los 1.031 sin corregir— que el spotlight la incluya. La burbuja y la
  interfaz tienen que decir lo mismo al mismo tiempo.
- **Sin dependencias externas.** El recorrido es JS propio; no cargues una librería de tours.
- **Un solo archivo HTML**, como la demo actual.
