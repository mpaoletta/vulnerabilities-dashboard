// Verifica que el bundle de la edición review (`dist-review/`) no incluya la UI de
// ejecución de la remediación. Correr después de `npm run build:review`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'dist-review/assets'
// Strings exclusivos de PhaseCards, RunAllButton, phaseRunner y RemediatedView.
const FORBIDDEN = ['Ejecutar las 3 fases en secuencia', 'Fases de remediación', 'Fix ejecutado (estimado)', 'flujos verificados', 'Pull request (simulado)', "'step '", '"step "', '`step `']

let files
try {
  files = readdirSync(DIR).filter((f) => f.endsWith('.js'))
} catch {
  console.error(`No existe ${DIR}: corré primero npm run build:review`)
  process.exit(1)
}
const hits = files.flatMap((f) => {
  const src = readFileSync(join(DIR, f), 'utf8')
  return FORBIDDEN.filter((s) => src.includes(s)).map((s) => `${f}: ${s}`)
})
if (hits.length) {
  console.error('El bundle review incluye código de ejecución:\n  ' + hits.join('\n  '))
  process.exit(1)
}
console.log(`OK: ${files.length} archivo(s) en ${DIR} sin UI de ejecución`)
