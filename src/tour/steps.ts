// Guion de la guía: port de `pickDemoRepos()` y `tourSteps()` del prototipo.
import { READONLY } from '../app/edition'
import type { Dataset, FleetRepository } from '../data/types'
import { n, t } from '../domain/format'
import type { Tab } from '../domain/selection'

export interface TourStep {
  idx: number
  act: 0 | 1 | 2 | 3 | 4
  seconds: number
  title: string
  body: string
  plate?: boolean
  closing?: boolean
  diagram?: Array<[label: string, color: string]>
  route?: string
  target?: string
  clip?: number
  pad?: number
  tab?: Tab
  /** Claves de grupo a expandir (`n3`, `res`), relativas al repo de la ruta. */
  expand?: string[]
  selectCritical?: boolean
  /** Paso sobre la ejecución de la remediación: se omite en la edición review. */
  execution?: true
}

export const ACTS = ['Acto 0 · el problema', 'Acto 1 · el portfolio', 'Acto 2 · el proyecto', 'Acto 3 · el proceso', 'Acto 4 · el resultado']

export interface DemoRepos {
  main: FleetRepository
  topSecret: FleetRepository
  remediated: FleetRepository
}

export function demoScore(D: Dataset, r: FleetRepository): number {
  const d = D.repositories[r.slug]
  if (!d) return -1
  const swap = (d.dependencies.plan.levels || []).some((l) => (l.updates || []).some((u) => u.targetPackage))
  return (
    (r.type === 'B' ? 4 : 0) +
    (r.potential > 0 ? 3 : 0) +
    (r.vulnerabilities.code > 0 ? 2 : 0) +
    (r.vulnerabilities.secretsActive > 0 ? 2 : 0) +
    (swap ? 3 : 0) +
    ((d.classification.blocking || []).length ? 2 : 0)
  )
}

export function pickDemoRepos(D: Dataset): DemoRepos {
  const R = D.fleet.repositories
  const main = [...R].sort((a, b) => demoScore(D, b) - demoScore(D, a))[0]
  const topSecret = [...R].sort((a, b) => b.vulnerabilities.secretsActive - a.vulnerabilities.secretsActive)[0]
  const remediated = R.find((r) => r.demoState.stage === 'remediated') || R[0]
  return { main, topSecret, remediated }
}

const caches = { full: new WeakMap<Dataset, TourStep[]>(), review: new WeakMap<Dataset, TourStep[]>() }

export function buildTourSteps(D: Dataset, readonly = READONLY): TourStep[] {
  const cache = readonly ? caches.review : caches.full
  const hit = cache.get(D)
  if (hit) return hit
  const F = D.fleet
  const { main, topSecret, remediated } = pickDemoRepos(D)
  const md = D.repositories[main.slug]
  const totalV = F.totals.dependencies + F.totals.code + F.totals.secretsActive
  const langs = Object.keys(F.distributions.byLanguage).length
  const swapLevel = (md.dependencies.plan.levels || []).filter((l) => (l.updates || []).some((u) => u.targetPackage))[0]
  const swap = swapLevel ? swapLevel.updates!.filter((u) => u.targetPackage)[0] : null
  const b0 = (md.classification.blocking || [])[0]
  const blockName = b0 ? (typeof b0 === 'string' ? b0 : b0.packageName || b0.package || b0.name) : null
  const brokenBuilds = F.repositories.filter((r) => !r.compiles).length
  const worstBaseline = [...F.repositories].sort((a, b) => b.testBaselineFailing - a.testBaselineFailing)[0]
  const repo = '#/repo/' + main.slug

  const st: Omit<TourStep, 'idx'>[] = [
    {
      act: 0,
      plate: true,
      seconds: 8,
      title: 'Remediación de vulnerabilidades, de punta a punta',
      body: 'Detectar es la parte fácil. Esta herramienta corrige, verifica que no rompió nada, y le dice a QA exactamente qué volver a probar.',
    },
    {
      act: 0,
      seconds: 10,
      route: '#/dashboard',
      target: '[data-tour="kpis"]',
      title: F.repositoryCount + ' repositorios, ' + n(totalV) + ' hallazgos',
      body:
        langs +
        ' lenguajes y frameworks distintos: Angular, NestJS, Spring, FastAPI, ASP.NET Core, Swift, Kotlin, Go. Ningún equipo puede con esto a mano.',
    },
    {
      act: 0,
      plate: true,
      seconds: 12,
      title: 'Review → fixdeps → fixcode → fixsecrets',
      diagram: [
        ['review', 'var(--teal)'],
        ['fixdeps', 'var(--red)'],
        ['fixcode', 'var(--red)'],
        ['fixsecrets', 'var(--red)'],
      ],
      body: 'Review escanea y arma el plan. Las tres fases siguientes lo ejecutan en secuencia: dependencias, código y secretos. Ninguna vuelve a escanear — todas consumen lo que dejó review.',
    },
    {
      act: 0,
      plate: true,
      seconds: 12,
      title: 'Se commitea sólo si queda en verde',
      diagram: [
        ['aplicar', 'var(--fg3)'],
        ['compilar', 'var(--amber)'],
        ['tests', 'var(--teal)'],
        ['commit', 'var(--teal)'],
      ],
      body: 'Cada unidad de trabajo se aplica, compila y corre los tests. Si el build se rompe, la IA lo arregla. Si aparece una regresión, la IA la arregla. Si igual queda en rojo, esa unidad se descarta y el proceso sigue con la siguiente.',
    },

    {
      act: 1,
      seconds: 9,
      route: '#/dashboard',
      target: '[data-tour="kpis"]',
      title: 'Todo el portfolio en una pantalla',
      body: 'Cuántos repositorios hay, de qué tipo, qué tan grandes y cuánta deuda de seguridad arrastra cada uno.',
    },
    {
      act: 1,
      seconds: 11,
      route: '#/dashboard',
      target: '[data-tour="dist-tipo"]',
      title: 'La clasificación que decide el alcance',
      body:
        'Un proyecto tipo A se puede remediar sin tocar la arquitectura. Uno tipo B está bloqueado por un framework que exige migración. De los ' +
        F.repositoryCount +
        ', hay ' +
        (F.distributions.byType.A || 0) +
        ' tipo A y ' +
        (F.distributions.byType.B || 0) +
        ' tipo B.',
    },
    {
      act: 1,
      seconds: 10,
      route: '#/dashboard',
      target: '[data-tour="tabla"]',
      clip: 260,
      title: 'Una fila por repositorio',
      body: 'Tipo, stack, tamaño, y las vulnerabilidades separadas en tres familias: dependencias, código y secretos. Se ordena y se filtra por cualquiera de ellas.',
    },
    {
      act: 1,
      seconds: 13,
      route: '#/dashboard',
      target: '[data-tour="col-potential"]',
      pad: 14,
      title: 'Lo que va a quedar sin corregir',
      body:
        'Es el número honesto: ' +
        n(F.totals.potential) +
        ' de las ' +
        n(F.totals.dependencies) +
        ' vulnerabilidades de dependencias no tienen arreglo disponible hoy. Siempre son de dependencias — el código y los secretos se corrigen completos.',
    },
    {
      act: 1,
      seconds: 11,
      route: '#/dashboard',
      target: '[data-tour="col-prog"]',
      pad: 14,
      title: 'Cuatro segmentos, una fase cada uno',
      body: 'Turquesa lo terminado, rojo animado lo que está corriendo, gris lo pendiente. Si un repositorio no tiene secretos, esa fase queda neutra: no hay nada que hacer.',
    },
    {
      act: 1,
      seconds: 11,
      route: '#/dashboard',
      target: '[data-tour="row-' + topSecret.slug + '"]',
      title: 'El repositorio con más secretos expuestos',
      body:
        topSecret.slug +
        ' concentra ' +
        n(topSecret.vulnerabilities.secretsActive) +
        ' de los ' +
        n(F.totals.secretsActive) +
        ' secretos del portfolio. Casi seguro es entropía de bundles vendorizados — exactamente el caso donde el triage automático vale más que la corrección.',
    },

    {
      act: 2,
      seconds: 9,
      route: repo,
      target: '[data-tour="repo-header"]',
      title: main.slug + ', tipo ' + main.type,
      body:
        main.stack +
        ': ' +
        n(main.linesOfCode) +
        ' líneas, ' +
        n(main.testCases) +
        ' tests, ' +
        n(main.vulnerabilities.dependencies) +
        ' vulnerabilidades de dependencias, ' +
        n(main.vulnerabilities.code) +
        ' de código y ' +
        n(main.vulnerabilities.secretsActive) +
        ' secretos activos.',
    },
    {
      act: 2,
      seconds: 11,
      route: repo,
      target: '[data-tour="hero-tipo"]',
      title: blockName ? 'Un solo paquete lo bloquea' : 'Remediable sin tocar la arquitectura',
      body: blockName
        ? blockName +
          ' es un componente arquitectural: actualizarlo obliga a migrar toda su cadena de forma coordinada. Eso saca al proyecto del alcance automático.'
        : 'No hay dependencias arquitecturales: todo el plan se puede aplicar con el flujo automático.',
    },
    {
      act: 2,
      seconds: 10,
      route: repo,
      target: '[data-tour="hero"]',
      clip: 280,
      title: 'Cada familia se corrige distinto',
      body: 'Las dependencias se actualizan, el código se reescribe, los secretos se trían y se sacan. Son tres motores diferentes con el mismo gate de verificación.',
    },
    {
      act: 2,
      seconds: 14,
      route: repo,
      target: '[data-tour="plan-levels"]',
      title: 'De menor a mayor riesgo',
      body: 'Nivel 1, upgrades menores. Nivel 2, actualizaciones sin impacto arquitectural. Nivel 3, cambio de librería. Nivel 4, migración de framework. Se aplican en ese orden, y el nivel 4 no se aplica solo: es la frontera.',
    },
    {
      act: 2,
      seconds: 13,
      route: repo,
      tab: 'deps',
      expand: swapLevel ? ['n' + swapLevel.level] : [],
      target: swapLevel ? '[data-tour="grupo-n' + swapLevel.level + '"]' : '[data-tour="grid"]',
      clip: 220,
      title: 'Cambiar de librería, no sólo de versión',
      body: swap
        ? swap.package +
          ' no tiene versión que la arregle. El plan la sustituye por ' +
          swap.targetPackage +
          ' y la IA reescribe los puntos de uso. Ningún bot de actualización hace esto.'
        : 'Cuando no hay versión con fix, el plan reemplaza la librería y la IA reescribe los puntos de uso.',
    },
    {
      act: 2,
      seconds: 12,
      route: repo,
      tab: 'deps',
      expand: ['res'],
      target: '[data-tour="grupo-res"]',
      clip: 220,
      title: 'Lo que no tiene arreglo',
      body:
        (md.dependencies.plan.residualByPackage || []).length +
        ' paquetes, ' +
        n(md.dependencies.plan.residualTotal || 0) +
        ' vulnerabilidades sin fix. No se seleccionan porque no hay nada que aplicar. Esta sección es la que explica la columna Residual de la vista anterior.',
    },
    {
      act: 2,
      seconds: 12,
      route: repo,
      tab: 'deps',
      selectCritical: true,
      target: '[data-tour="bulk"]',
      title: 'Por criticidad, por nivel, por archivo',
      body: 'Se elige de a uno o en bloque. Acá dejamos sólo las críticas y altas, y todo lo demás se recalcula al instante.',
    },
    {
      act: 2,
      seconds: 13,
      route: repo,
      target: '[data-tour="estimacion"]',
      clip: 340,
      title: 'La estimación se mueve con la selección',
      body:
        'Tiempo y costo por fase, calculados sobre las unidades de trabajo reales y el tiempo de compilación de este repositorio. Compilar acá tarda ' +
        t(main.compileTimeSeconds) +
        ': por eso cada paso verificado se paga caro.',
    },

    {
      act: 3,
      seconds: 13,
      route: repo,
      target: '[data-tour="fases"]',
      clip: 320,
      execution: true,
      title: 'Las tres fases, una después de la otra',
      body: 'fixdeps, fixcode y fixsecrets no corren en paralelo: cada una espera el gate verde de la anterior. Así una regresión siempre tiene un único culpable.',
    },
    {
      act: 3,
      seconds: 13,
      route: repo,
      target: '[data-tour="repo-facts"]',
      title: 'Paridad, no verde absoluto',
      body:
        'Review guarda el resultado de cada test antes de tocar nada. El gate exige que siga pasando lo que ya pasaba. En este portfolio hay ' +
        brokenBuilds +
        ' repositorios que ni compilan y uno con ' +
        worstBaseline.testBaselineFailing +
        ' tests en rojo: sin baseline, no habría forma de distinguir una regresión de la deuda que ya estaba.',
    },

    {
      act: 4,
      seconds: 14,
      route: '#/remediados',
      target: '[data-tour="flows-' + remediated.slug + '"]',
      clip: 300,
      execution: true,
      title: 'Un PR y un plan de regresión',
      body: 'Al final del proceso sale un pull request con todos los cambios verificados, y un informe que traduce cada cambio a las pantallas y endpoints que toca. QA no tiene que adivinar qué probar: lo tacha de una lista.',
    },
    { act: 4, plate: true, seconds: 6, closing: true, title: 'Detectar, corregir, verificar, entregar', body: 'Y volver a empezar.' },
  ]
  const steps = st.filter((x) => !(readonly && x.execution)).map((x, i) => ({ idx: i, ...x }))
  cache.set(D, steps)
  return steps
}

/** Slug del repo al que apunta la ruta de un paso (`#/repo/x` → `x`). */
export function stepSlug(step: TourStep): string {
  return (step.route || '').replace('#/repo/', '')
}
