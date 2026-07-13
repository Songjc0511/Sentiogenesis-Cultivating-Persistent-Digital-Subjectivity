export type Action = 'explore' | 'resource' | 'avoid' | 'rest' | 'inspect'
export type Intervention = 'resource' | 'signal' | 'disturbance'
export type ModuleId = 'exteroception' | 'interoception' | 'threat' | 'novelty' | 'memory' | 'self' | 'value' | 'symbol' | 'imagination' | 'goal' | 'epistemic' | 'social' | 'attention'
export type ContentKind = 'resource' | 'signal' | 'danger' | 'stability' | 'body-low' | 'body-high' | 'memory' | 'self-state' | 'conflict' | 'symbol' | 'anticipated-future' | 'goal-pressure' | 'open-question' | 'autobiographical-self' | 'future-self-judgment' | 'other-mind' | 'perspective-gap' | 'access-surprise' | 'dream-replay' | 'felt-valence' | 'introspective-symbol' | 'boundary-surprise' | 'spatial-disorientation' | 'shared-signal' | 'autopoietic-crisis' | 'phenomenal-familiarity'

export interface Vec2 { x: number; y: number }
export interface StateVector {
  energy: number
  integrity: number
  arousal: number
  uncertainty: number
  coherence: number
  curiosity: number
  agency: number
  valence: number
}
export interface Entity extends Vec2 { id: number; strength: number; ttl: number }
export interface Environment {
  resources: Entity[]
  signals: Entity[]
  disturbances: Entity[]
  stableZones: Entity[]
  other: OtherProcess
  socialPulse?: { glyph:string; x:number; y:number; ttl:number; bornTick:number; phase:'statement'|'repair' }
  otherPulse?: { glyph:string; x:number; y:number; ttl:number; bornTick:number }
}
export type OtherAction = 'seek' | 'avoid' | 'sample' | 'idle'
export interface OtherGlyphModel { samples:number; actionLikelihood:Record<Action,number>; predictedAction:Action; confidence:number; contradictions:number; confirmations:number }
export interface OtherProcess extends Vec2 { id: string; heading: number; observableAction: OtherAction; hidden: { energy: number; uncertainty: number; preference: number; glyphModels:Record<string,OtherGlyphModel>; pendingGlyph?:string; lastPulseTick:number; lastObservedMainTick:number; lastEchoTick:number } }
export interface OtherObservation { tick: number; x: number; y: number; heading: number; action: OtherAction; proximity: number }
export interface PublicResourceEvidence extends Vec2 { id: number; present: boolean }
export interface AttributedResourceBelief extends Vec2 { entityId: number; confidence: number; lastAttributedSightTick: number }
export interface Perception {
  resource: number
  signal: number
  danger: number
  stability: number
  otherPresence: number
  otherMotion: number
}
export interface EgocentricCue { id: number; bearing: number; distance: number; strength: number; source: 'sensed' | 'remembered'; confidence: number }
export interface EgocentricScene { resource?: EgocentricCue; signal?: EgocentricCue; danger?: EgocentricCue }
export type LandmarkKind='resource'|'signal'|'danger'
export interface SubjectiveLandmark { id:number; kind:LandmarkKind; x:number; y:number; confidence:number; lastSeenTick:number }
export interface SpatialSelfModel { x:number; y:number; heading:number; uncertainty:number; mapSurprise:number; coherence:number; landmarks:SubjectiveLandmark[] }
export interface Beliefs {
  exploration: number
  conservation: number
  predictability: number
  efficacy: number
  externalTrust: number
  stabilityPriority: number
}
export interface Memory {
  id: number
  tick: number
  perception: Perception
  action: Action
  prediction: number
  outcome: number
  surprise: number
  impact: number
  attribution: number
  repetitions: number
  strength: number
  clusterId?: number
}
export interface ExperienceCluster {
  id: number
  centroid: number[]
  count: number
  variance: number
  importance: number
  lastTick: number
  symbolId?: number
}
export interface SymbolNode {
  id: number
  glyph: string
  clusterId: number
  bornTick: number
  stability: number
  drift: number
  status: 'forming' | 'stable' | 'drifting' | 'forgotten'
}
export interface CausalTrace {
  id: number
  tick: number
  perception: Perception
  prediction: number
  drives: Record<Action, number>
  action: Action
  outcome: number
  surprise: number
  attribution: number
  stateDelta: Partial<StateVector>
  workspaceContent?: ConsciousCandidate
  subjectiveBody?: InteroceptiveState
  positionBefore?: Vec2
  positionAfter?: Vec2
  headingBefore?: number
  headingAfter?: number
}
export interface InteroceptiveState {
  energy: number
  integrity: number
  arousal: number
  uncertainty: number
  precision: number
}
export interface ConsciousCandidate {
  id: string
  source: ModuleId
  kind: ContentKind
  value: number
  salience: number
  uncertainty: number
  selfRelevance: number
  persistence: number
  symbolId?: number
}
export interface WorkspaceFrame {
  tick: number
  foreground?: ConsciousCandidate
  background: ConsciousCandidate[]
  unconscious: ConsciousCandidate[]
  ignition: number
  continuity: number
}
export interface MetaState {
  confidence: number
  sourceEstimate: 'external' | 'internal' | 'memory' | 'imagined' | 'unknown'
  ownedBySelf: number
  calibration: number
  lastError: number
}
export interface ImaginedOutcome {
  action: Action
  expectedEnergy: number
  expectedIntegrity: number
  expectedUncertainty: number
  expectedValence: number
  desirability: number
  confidence: number
}
export type SubjectiveDimension = 'energy' | 'integrity' | 'arousal' | 'uncertainty'
export interface LearnedTransition {
  action: Action
  samples: number
  delta: Record<SubjectiveDimension | 'valence', number>
  predictionError: number
  confidence: number
}
export interface EndogenousGoal {
  id: string
  dimension: SubjectiveDimension
  target: number
  urgency: number
  persistence: number
  evidence: number
  bornTick: number
}
export interface EpistemicQuestion {
  id: string
  targetAction: Action
  bornTick: number
  expectedInformationGain: number
  urgency: number
  attempts: number
  initialConfidence: number
  currentConfidence: number
  status: 'active' | 'suspended' | 'resolved'
  resolution?: number
}
export interface NarrativeChapterDraft {
  startTick: number
  startBody: InteroceptiveState
  lastBody: InteroceptiveState
  foregroundCounts: Partial<Record<ContentKind, number>>
  actionCounts: Record<Action, number>
  attributionSum: number
  surpriseSum: number
  steps: number
  goalSignature: string
  lastForeground?: string
}
export interface NarrativeChapter {
  id: string
  startTick: number
  endTick: number
  dominantContent?: ContentKind
  dominantAction: Action
  stateShift: Record<SubjectiveDimension, number>
  causalOwner: 'self' | 'external' | 'mixed'
  identityImpact: number
  goalContinuity: number
}
export interface NarrativeSelf {
  current?: NarrativeChapterDraft
  chapters: NarrativeChapter[]
  actionProfile: Record<Action, number>
  selfContinuity: number
  lastProcessedTick: number
}
export interface FutureSelfAppraisal {
  action: Action
  identityFit: number
  futureApproval: number
  anticipatedRegret: number
  goalAlignment: number
}
export interface SelfCommitment {
  id: string
  dimension: SubjectiveDimension
  target: number
  bornTick: number
  strength: number
  kept: number
  broken: number
  integrity: number
}
export interface RecursiveSelf {
  appraisals: FutureSelfAppraisal[]
  commitments: SelfCommitment[]
  lastRegret: number
  lastEndorsement: number
  counterfactualResponsibility: number
}
export interface SocialCognition {
  estimatedNeed: number
  estimatedUncertainty: number
  intent: Record<OtherAction, number>
  predictedAction: OtherAction
  confidence: number
  predictionError: number
  perspectiveSeparation: number
  samples: number
  observations: OtherObservation[]
  attributedResources: AttributedResourceBelief[]
  inferredTargetId?: number
  jointAttention: number
  beliefDivergence: number
  falseBeliefActive: boolean
}
export interface TemporalField {
  justPast?: ConsciousCandidate
  now?: ConsciousCandidate
  anticipatedNext?: ImaginedOutcome
  continuity: number
  temporalDepth: number
}
export interface AccessPrediction { tick: number; predicted?: ContentKind; actual?: ContentKind; error: number; target?: ContentKind }
export interface AttentionSchema {
  predictedNext?: ContentKind
  attentionTarget?: ContentKind
  accessPredictionError: number
  accessConfidence: number
  controlEfficacy: number
  bottleneck: number
  samples: number
  reliability: Partial<Record<ContentKind, number>>
  history: AccessPrediction[]
  effort: number
  cumulativeCost: number
}
export interface PhenomenalField {
  activations: Partial<Record<ContentKind, number>>
  dominant?: ContentKind
  dwell: number
  integration: number
  differentiation: number
  exclusion: number
  quality: { external: number; internal: number; temporal: number; social: number; epistemic: number }
}
export interface DreamEpisode { startTick: number; endTick?: number; sourceMemoryId: number; vividness: number; novelty: number }
export interface DreamState {
  mode: 'wake' | 'dream'
  restStreak: number
  sleepPressure: number
  vividness: number
  residue: number
  sourceMemoryId?: number
  episodes: DreamEpisode[]
}
export interface AffectiveField {
  experientialValues: Partial<Record<ContentKind, number>>
  evidence: Partial<Record<ContentKind, number>>
  tone: number
  mood: number
  precision: number
  qualityMismatch: number
  preferredQuality: { external: number; internal: number; temporal: number; social: number; epistemic: number }
  lastContent?: ContentKind
  history: Array<{ tick: number; kind: ContentKind; tone: number }>
}
export interface IntrospectiveCluster { id: number; centroid: number[]; count: number; variance: number; stability: number; lastTick: number; glyph?: string; forecast: number[]; forecastSamples: number; forecastError: number; predictiveConfidence: number }
export interface IntrospectiveExpression { tick: number; glyph: string; confidence: number; mode: 'wake' | 'dream' }
export interface IntrospectiveLexicon {
  clusters: IntrospectiveCluster[]
  expressions: IntrospectiveExpression[]
  currentGlyph?: string
  currentConfidence: number
  nextClusterId: number
  lastClusterId?: number
}
export interface EfferenceModel {
  action: Action
  samples: number
  dx: number
  dy: number
  perceptionDelta: Record<keyof Perception, number>
  predictionError: number
  confidence: number
}
export interface EfferenceState {
  models: Record<Action, EfferenceModel>
  predictedAction?: Action
  reafferenceError: number
  selfCausedLikelihood: number
  externalSurprise: number
  boundaryConfidence: number
}
export interface GlyphCommunication { attempts:number; responses:number; efficacy:number; expectedAction:Action; misunderstandings:number; repairs:number; confirmations:number; conventionStability:number; suppressedUntil:number }
export interface SocialCommunication {
  lastExpressionTick:number
  pending?: { glyph:string; tick:number; expectedAction:Action; phase:'statement'|'repair' }
  repair?: { glyph:string; expectedAction:Action; dueTick:number; attempts:number }
  associations:Record<string,GlyphCommunication>
  communicativeAgency:number
  mutualGrounding:number
  responseSurprise:number
  lastResponse:'confirmed'|'misunderstood'|'response'|'silence'|'none'
  totalCost:number
}
export interface OrganismicClosure {
  membraneIntegrity:number
  permeability:number
  selfProduction:number
  operationalClosure:number
  viability:number
  mode:'active'|'conserve'|'arrest'
  arrestTicks:number
  repairs:number
  cumulativeCost:number
}
export interface PhenomenalPrototype {
  id:number
  centroid:number[]
  count:number
  variance:number
  sourceKinds:Partial<Record<ContentKind,number>>
  actionValues:Record<Action,number>
  actionSamples:Record<Action,number>
  stability:number
  lastTick:number
}
export interface PhenomenalManifold {
  prototypes:PhenomenalPrototype[]
  currentId?:number
  nextId:number
  differentiation:number
  stimulusAmbiguity:number
  crossModalTransfer:number
  causalEfficacy:number
}
export interface ConsciousArchitecture {
  architectureVersion: 21
  interoception: InteroceptiveState
  workspace: WorkspaceFrame
  meta: MetaState
  accessHistory: WorkspaceFrame[]
  dangerBroadcastBlocked: boolean
  imagination: ImaginedOutcome[]
  temporalField: TemporalField
  causalModels: Record<Action, LearnedTransition>
  preferredSetpoints: Record<SubjectiveDimension, number>
  goals: EndogenousGoal[]
  epistemic: { active?: EpistemicQuestion; history: EpistemicQuestion[] }
  narrative: NarrativeSelf
  recursiveSelf: RecursiveSelf
  social: SocialCognition
  attentionSchema: AttentionSchema
  phenomenalField: PhenomenalField
  dream: DreamState
  affect: AffectiveField
  introspection: IntrospectiveLexicon
  efference: EfferenceState
  spatial: SpatialSelfModel
  communication: SocialCommunication
  organismic: OrganismicClosure
  manifold: PhenomenalManifold
}
export interface Life {
  id: string
  bornAt: number
  seed: number
  rng: number
  tick: number
  position: Vec2
  heading: number
  state: StateVector
  beliefs: Beliefs
  environment: Environment
  memories: Memory[]
  clusters: ExperienceCluster[]
  symbols: SymbolNode[]
  traces: CausalTrace[]
  history: Array<{ tick: number; state: StateVector }>
  cooldowns: Record<Intervention, number>
  nextEntityId: number
  nextMemoryId: number
  nextClusterId: number
  nextSymbolId: number
  lastSavedAt: number
  consciousness: ConsciousArchitecture
}
export interface Snapshot { version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22; savedAt: number; life: Life }
