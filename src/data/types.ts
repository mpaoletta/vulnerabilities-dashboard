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
  demoState: DemoState
  hasDetail: boolean
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
