// Modelo del dataset de la demo (`data/demo-data.json` del handoff).
// Cuando exista `vulnerabilities-api`, este archivo es el contrato a acordar.

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type SeverityCounts = Partial<Record<Severity, number>>

export type ProjectType = 'A' | 'B' | 'N/A'
export type SizeClass = 'S' | 'M' | 'L'
export type Stage = 'remediated' | 'review-done' | 'in-progress'

export type PhaseKey = 'review' | 'fixdeps' | 'fixcode' | 'fixsecrets'
export type FixPhaseKey = Exclude<PhaseKey, 'review'>
export type PhaseStatus = 'done' | 'running' | 'pending' | 'not-applicable'

export interface EstimationModel {
  phaseOverheadSeconds: number
  fixdeps: {
    bumpSeconds: number
    bumpCompileFactor: number
    bumpUsd: number
    codeChangeSeconds: number
    codeChangeCompileFactor: number
    codeChangeUsd: number
  }
  fixcode: { secondsPerFile: number; compileFactor: number; usdPerFile: number }
  fixsecrets: {
    triageSecondsPerType: number
    triageUsdPerType: number
    secondsPerFile: number
    compileFactor: number
    usdPerFile: number
  }
  reviewUsd: number
}

export interface Meta {
  generatedAt: string
  purpose?: string
  rules?: Record<string, string>
  demoOnly?: string[]
  estimationModel: EstimationModel
  caps?: Record<string, unknown>
  reconciliation?: Array<Record<string, unknown>>
  anonymized?: boolean
  anonymizationNote?: string
  /** `database` con los datos reales de un portfolio; ausente en la demo. */
  source?: 'database'
  tenant?: string
  /** Campos proyectados (estimaciones), a diferencia de los medidos. */
  estimated?: string[]
}

export interface PhaseEstimate {
  units: number
  seconds: number
  usd: number
}

export interface Estimate {
  fixdeps: PhaseEstimate
  fixcode: PhaseEstimate
  fixsecrets: PhaseEstimate
  total: { seconds: number; usd: number }
}

export interface UnitDetail {
  depsSimple: number
  depsCodeChange: number
  sastFiles: number
  secretTypes: number
  secretFiles: number
}

export interface DemoPhase {
  phase: PhaseKey
  status: PhaseStatus
}

export interface DemoState {
  stage: Stage
  phases: DemoPhase[]
}

export interface FleetRepository {
  slug: string
  type: ProjectType
  stack: string
  language: string
  buildSystem: string
  framework: string
  linesOfCode: number
  size: SizeClass
  complexity: number
  cognitiveComplexity: number
  duplicatedLinesDensity: number
  vulnerabilities: {
    dependencies: number
    code: number
    secrets: number
    secretsActive: number
  }
  severityCounts: { dependencies?: SeverityCounts; code?: SeverityCounts }
  potential: number
  compiles: boolean
  compileTimeSeconds: number
  testCases: number
  testBaselineFailing: number
  reviewSeconds: number
  units: { fixdeps: number; fixcode: number; fixsecrets: number }
  unitDetail: UnitDetail
  estimate: Estimate
  /** Con `meta.source = 'database'` es el estado real (stage y estado por fase), no de demo. */
  demoState: DemoState
  hasDetail: boolean
  /** Tiempo y costo medidos de la última ejecución terminal de cada fase de fix. */
  actual?: Partial<Record<FixPhaseKey, { seconds: number; usd?: number | null } | null>>
  /** Resultado de la última ejecución terminal de cada fase de fix, según sus propios veredictos. */
  lastRun?: Partial<Record<FixPhaseKey, PhaseLastRun | null>>
}

export interface PhaseLastRun {
  status: string
  completedAt?: string | null
  exitCode?: number | null
  stoppedReason?: string | null
  fixed: number
  notFixed: number
}

export interface Fleet {
  repositoryCount: number
  totals: {
    dependencies: number
    code: number
    secrets: number
    secretsActive: number
    potential: number
    linesOfCode: number
    reviewSeconds: number
  }
  distributions: {
    byType: Record<string, number>
    bySize: Record<string, number>
    byLanguage: Record<string, number>
    byStage: Record<string, number>
  }
  repositories: FleetRepository[]
}

export interface BlockingPackage {
  packageName?: string
  package?: string
  name?: string
  ecosystem?: string
  installedVersion?: string
  currentVersion?: string
  type?: string
  architectural?: boolean
  updateToVersion?: string
  updateToPackage?: string
  reason?: string
  strategy?: string
  source?: string
  catalogRef?: string
  vulnerabilityIds?: string[]
}

export interface DependencyUpdate {
  package: string
  ecosystem?: string
  dependencyType?: 'direct' | 'transitive' | string
  currentVersion?: string | null
  targetVersion?: string | null
  targetPackage?: string | null
  targetSource?: string
  requiresCodeChange?: boolean
  catalogRef?: string | null
  severity?: Severity
  severityCounts?: SeverityCounts
  fixedVulnerabilityIds?: string[]
  fixesCount?: number
  fixedVulnerabilityIdsTruncated?: boolean
}

export interface PlanLevel {
  level: number
  key?: string
  title: string
  applied?: boolean
  vulnerabilitiesFixed: number
  vulnerabilitiesRemaining?: number
  dependenciesUpdated?: number
  severityCounts?: SeverityCounts
  updates?: DependencyUpdate[]
}

export interface ResidualPackage {
  package: string
  ecosystem?: string
  installedVersion?: string
  dependencyType?: string
  severity?: Severity
  severityCounts?: SeverityCounts
  vulnerabilityIds?: string[]
  count: number
  vulnerabilityIdsTruncated?: boolean
}

export interface SastFinding {
  id?: string
  rule: string
  severity: Severity
  line: number
  kind?: string
  message: string
  inferred?: boolean
}

export interface SastFile {
  file: string
  total: number
  severityCounts?: SeverityCounts
  findings?: SastFinding[]
  truncated?: boolean
  inferred?: boolean
}

export interface SecretFinding {
  type: string
  line: number
  verified?: boolean
  falsePositive?: boolean
  inferred?: boolean
}

export interface SecretFile {
  file: string
  total: number
  active?: number
  findings?: SecretFinding[]
  truncated?: boolean
  inferred?: boolean
}

export interface RepositoryDetail {
  slug: string
  classification: {
    type: ProjectType
    /** Tipo original del orchestrator (A | B | AB | C) cuando `type` se mapeó. */
    sourceType?: string
    rationale?: string
    blocking?: Array<BlockingPackage | string>
  }
  stack?: { language?: string; buildSystem?: string; framework?: string }
  runtime?: Record<string, string>
  sbom?: { componentCount: number; byEcosystem?: Record<string, number> }
  codeMetrics?: Record<string, number>
  compile?: { status?: string; seconds?: number; requiredEnvVars?: string[] }
  tests?: { hasTests?: boolean; testFiles?: number; testCases?: number | null; frameworks?: string[] }
  testBaseline?: { status?: string | null; compile?: boolean | null; command?: string | null }
  timing?: { phases?: Array<Record<string, unknown>>; totalSeconds?: number }
  dependencies: {
    total: number
    severityCounts?: SeverityCounts
    byType?: Record<string, number>
    plan: {
      levels: PlanLevel[]
      residualByPackage?: ResidualPackage[]
      residualTotal?: number
      potentialAfterLevel3?: number
    }
  }
  sast: {
    total: number
    qualityGate?: string | null
    severityCounts?: SeverityCounts
    byRule?: Record<string, number>
    files?: SastFile[]
    truncated?: boolean
  }
  secrets: {
    total: number
    active: number
    byType?: Record<string, number>
    filesTotal?: number
    activeFiles?: number
    files?: SecretFile[]
    truncated?: boolean
  }
  units?: { fixdeps: number; fixcode: number; fixsecrets: number }
  unitDetail?: UnitDetail
  estimate?: Estimate
}

export interface Dataset {
  meta: Meta
  fleet: Fleet
  repositories: Record<string, RepositoryDetail>
}

// --- Jobs de remediación (`/api/v1/tenants/{t}/…/jobs`, change add-dashboard-remediation-trigger) ---

export type KeyScope = 'read' | 'operate' | 'write'

export interface KeyInfo {
  name: string
  prefix: string
  scope: KeyScope
  /** Puede aprobar un gate de PR bloqueado (add-github-pr-gate). */
  approveGates?: boolean
}

// --- Gates de PR (add-github-pr-gate) ---

export type GateResult = 'pass' | 'fail' | 'error'
export type PrGateState = 'pass' | 'blocked' | 'approved' | 'error'

export interface GateRun {
  runKey: string
  pr: number | null
  headSha: string | null
  branch: string | null
  baseRef: string | null
  result: GateResult
  policyPassed: boolean | null
  fingerprint: string | null
  /** Claves bloqueantes: `dep:<eco>:<paquete>:<vuln>`, `secret:<detector>:<archivo>`, `sonar:quality-gate`. */
  blocking: string[]
  exitCode: number | null
  startedAt: string
}

export interface GateOverride {
  id: string
  pr: number
  fingerprint: string
  findings: string[]
  source: 'environment' | 'comment' | 'dashboard'
  approvedBy: string
  reason: string
  createdAt: string
  revokedAt?: string | null
  revokedBy?: string | null
}

export interface PrGate {
  pr: number
  prUrl?: string | null
  branch: string | null
  state: PrGateState
  latest: GateRun
  override?: GateOverride | null
}

export interface OverrideCreated {
  override: GateOverride
  /** Si la API ya puso `sbom/gate = success` en GitHub. */
  statusPublished: boolean
}

export interface WorkerInfo {
  workerId: string
  hostname: string
  version?: string | null
  lastSeenAt: string
  online: boolean
  repositories: string[]
}

export type JobPhaseSelection =
  | { mode: 'all' }
  | { mode: 'subset'; packages: Array<{ ecosystem?: string; package: string }> }
  | { mode: 'subset'; files: Array<{ file: string; severity?: Severity }> }

export type JobSelection = Partial<Record<FixPhaseKey, JobPhaseSelection>>

export interface JobCreate {
  phases: FixPhaseKey[]
  selection: JobSelection
}

export type JobStatus = 'queued' | 'claimed' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled'

export interface JobProgress {
  total: number
  doing: number
  done: number
  skipped: number
}

export interface RemediationJob {
  id: string
  repository: string
  status: JobStatus
  /** Fases de corrección, o `['review']` solo (add-worker-triggered-review). */
  phases: PhaseKey[]
  currentPhase: PhaseKey | null
  selection: JobSelection
  units?: Partial<Record<FixPhaseKey, string[]>>
  progress?: Partial<Record<FixPhaseKey, JobProgress>>
  phaseResults?: Partial<Record<FixPhaseKey, { exitCode: number | null; exitName?: string | null }>>
  runKeys?: string[]
  workerId?: string | null
  hostname?: string | null
  exitCode?: number | null
  exitName?: string | null
  reason?: string | null
  message?: string | null
  eligibleWorkers?: number
  createdAt?: string
  claimedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
}

// --- Repos sin review (add-worker-triggered-review) ---

/** Un clone que anuncia un worker en línea sin review vigente, o un repo registrado sin review. */
export interface UnreviewedRepository {
  slug: string
  /** Existe en la API (p. ej. un review disparado que falló, o un reset). */
  registered: boolean
  /** Workers en línea que lo tienen clonado. */
  workers: Array<{ workerId: string; hostname?: string | null }>
  activeJob: { id: string; status: JobStatus; phases: PhaseKey[]; hostname?: string | null } | null
}
