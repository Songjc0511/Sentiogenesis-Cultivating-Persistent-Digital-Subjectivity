export type Action = 'explore' | 'resource' | 'avoid' | 'rest' | 'inspect'
export type Intervention = 'resource' | 'signal' | 'disturbance'
export type ModuleId = 'exteroception' | 'interoception' | 'threat' | 'novelty' | 'memory' | 'self' | 'value' | 'symbol' | 'imagination' | 'goal' | 'epistemic' | 'social' | 'attention'
export type ContentKind = 'resource' | 'signal' | 'danger' | 'stability' | 'body-low' | 'body-high' | 'memory' | 'self-state' | 'conflict' | 'symbol' | 'anticipated-future' | 'goal-pressure' | 'open-question' | 'autobiographical-self' | 'future-self-judgment' | 'other-mind' | 'perspective-gap' | 'access-surprise' | 'dream-replay' | 'felt-valence' | 'introspective-symbol' | 'boundary-surprise' | 'spatial-disorientation' | 'shared-signal' | 'autopoietic-crisis' | 'phenomenal-familiarity' | 'substrate-resonance'

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
export interface CandidateEvidence {
  perception:Perception
  body:InteroceptiveState
  drives:Record<Action,number>
  imagined:ImaginedOutcome[]
  agency:number
  coherence:number
  bestMemory?:Pick<Memory,'strength'|'impact'>
  bestSymbol?:Pick<SymbolNode,'id'|'stability'>
  goal?:Pick<EndogenousGoal,'target'|'urgency'|'persistence'>
  question?:Pick<EpistemicQuestion,'currentConfidence'|'urgency'|'status'>
  chapterIdentityImpact?:number
  narrativeContinuity:number
  maxFutureRegret:number
  lastEndorsement?:number
  commitmentStrain:number
  recursiveAppraisals:boolean
  socialConfidence:number
  beliefDivergence:number
  attentionError:number
  dream:Pick<DreamState,'mode'|'vividness'|'residue'>
  affect:Pick<AffectiveField,'tone'|'qualityMismatch'|'precision'|'experientialValues'>
  privateGlyph?:string
  privateConfidence:number
  externalSurprise:number
  selfCausedLikelihood:number
  spatialUncertainty:number
  mapSurprise:number
  communicationResponse:SocialCommunication['lastResponse']
  communicationSurprise:number
  communicativeAgency:number
  organismicMode:OrganismicClosure['mode']
  organismicViability:number
  qualityNode?:Pick<PhenomenalPrototype,'id'|'stability'>
  manifoldEfficacy:number
  manifoldTransfer:number
  substrate?:Pick<PythonSubstrate,'tick'|'integration'|'causalCoupling'|'recurrence'>
}
export interface DecisionEvidence {
  baseDrives:Record<Action,number>
  perception?:Perception
  body?:InteroceptiveState
  stateCuriosity?:number
  stateCoherence?:number
  beliefs?:Beliefs
  foregroundKind?:ContentKind
  question?:Pick<EpistemicQuestion,'targetAction'|'expectedInformationGain'|'urgency'|'status'>
  appraisals:Array<Pick<FutureSelfAppraisal,'action'|'futureApproval'|'anticipatedRegret'>>
  affect:Pick<AffectiveField,'tone'|'qualityMismatch'>
  introspectiveCluster?:Pick<IntrospectiveCluster,'glyph'|'predictiveConfidence'|'forecast'>
  dream:Pick<DreamState,'mode'|'sleepPressure'|'restStreak'>
  communicationPending?:Pick<NonNullable<SocialCommunication['pending']>,'expectedAction'|'phase'|'tick'>
  phenomenalNode?:Pick<PhenomenalPrototype,'actionValues'|'actionSamples'>
  imagination:ImaginedOutcome[]
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
  clusterId?:number
  decisionSource?:'python'|'browser'
  intentBasedOnTick?:number
  dreamSourceMemoryId?:number
  experienceVector?:number[]
  affectObservation?:{sourceKind?:ContentKind;outcome:number;valenceDelta:number;surprise:number;currentValence:number;quality:PhenomenalField['quality']}
  dreamObservation?:{lastAction?:Action;danger:number;arousal:number;energy:number;organismicMode:OrganismicClosure['mode'];bestMemory?:{id:number;strength:number;surprise:number;impact:number};activeMemory?:{id:number;strength:number;surprise:number;impact:number}}
  narrativeObservation?:{sourceTick:number;action:Action;foregroundId?:string;foregroundKind?:ContentKind;attribution:number;surprise:number;sourceBody:InteroceptiveState;currentBody:InteroceptiveState;goalSignature:string}
  goalObservation?:{body:InteroceptiveState;valence:number;coherence:number}
  epistemicObservation?:{previousAction?:Action;body:InteroceptiveState;perception:Perception;stateEnergy:number;stateIntegrity:number;causalModels:Record<Action,LearnedTransition>}
  recursiveObservation?:{body:InteroceptiveState;goals:EndogenousGoal[];actionProfile:Record<Action,number>;selfContinuity:number;imagination:ImaginedOutcome[];action:Action;outcome:number;agency:number}
  attentionObservation?:{predicted?:ContentKind;target?:ContentKind;actual?:ContentKind;unconsciousCount:number;backgroundCount:number;candidates:Array<{kind:ContentKind;salience:number;selfRelevance:number;persistence:number}>}
  socialObservation?:{awake:boolean;other:OtherObservation;evidence:PublicResourceEvidence[]}
  communicationObservation?:{observedOther:OtherAction;otherPulseGlyph?:string;otherPresence:number;dreamMode:'wake'|'dream';energy:number;position:Vec2;socialPulseActive:boolean;expression?:IntrospectiveExpression;clusterCentroid?:number[]}
  causalObservation?:{currentBody:InteroceptiveState;previousAction?:Action;previousBody?:InteroceptiveState;valenceDelta:number}
  interoceptionObservation?:{truth:Pick<StateVector,'energy'|'integrity'|'arousal'|'uncertainty'>;inspect:boolean}
  spatialObservation?:{last?:Pick<CausalTrace,'positionBefore'|'positionAfter'|'headingBefore'|'headingAfter'>;scene:EgocentricScene}
  phenomenalObservation?:{candidates:ConsciousCandidate[];attentionTarget?:ContentKind;attentionEffort:number;dangerBroadcastBlocked:boolean}
  introspectionObservation?:{field:PhenomenalField;foreground?:ConsciousCandidate;affectTone:number;ownedBySelf:number;dreamMode:'wake'|'dream'}
  imaginationObservation?:{perception:Perception;body:InteroceptiveState;drives:Record<Action,number>;stateValence:number;stateCoherence:number;beliefPredictability:number;causalModels:Record<Action,LearnedTransition>;goals:EndogenousGoal[]}
  temporalObservation?:{foreground?:ConsciousCandidate;anticipatedNext?:ImaginedOutcome}
  stateDynamicsObservation?:{postActionState:StateVector;action:Action;perception:Perception;prediction:number;outcome:number;metabolicFactor:number;attentionActive:boolean;attentionEffort:number;efference:Pick<EfferenceState,'selfCausedLikelihood'|'externalSurprise'>}
  candidateObservation?:CandidateEvidence
  decisionObservation?:DecisionEvidence
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
export interface PythonAuthorityPatch {
  fromTick:number
  toTick:number
  organismic:OrganismicClosure
  manifold:PhenomenalManifold
  memories:Memory[]
  beliefs:Beliefs
  nextMemoryId:number
  actionIntent:{basedOnTick:number;action:Action;scores:Record<Action,number>}
  efference:EfferenceState
  efferenceCursor:number
  abiotic:{resources:Entity[];signals:Entity[];disturbances:Entity[];stableZones:Entity[]}
  environmentRng:number
  environmentCursor:number
  nextEntityId:number
  clusters:ExperienceCluster[]
  symbols:SymbolNode[]
  nextClusterId:number
  nextSymbolId:number
  symbolicCursor:number
  affect:AffectiveField
  affectCursor:number
  dream:DreamState
  dreamCursor:number
  narrative:NarrativeSelf
  narrativeCursor:number
  preferredSetpoints:Record<SubjectiveDimension,number>
  goals:EndogenousGoal[]
  goalCursor:number
  epistemic:{active?:EpistemicQuestion;history:EpistemicQuestion[]}
  epistemicCursor:number
  recursiveSelf:RecursiveSelf
  recursiveCursor:number
  attentionSchema:AttentionSchema
  attentionCursor:number
  attentionIntent:{basedOnTick:number;target?:ContentKind}
  social:SocialCognition
  socialCursor:number
  communication:SocialCommunication
  communicationCursor:number
  communicationEmission?:{glyph:string;position:Vec2;phase:'statement'|'repair';bornTick:number}
  communicationCost:number
  causalModels:Record<Action,LearnedTransition>
  causalCursor:number
  interoception:InteroceptiveState
  interoceptionRng:number
  interoceptionCursor:number
  spatial:SpatialSelfModel
  spatialRng:number
  spatialCursor:number
  phenomenalField:PhenomenalField
  workspace:WorkspaceFrame
  meta:MetaState
  phenomenalCursor:number
  imagination?:ImaginedOutcome[]
  imaginationCursor?:number
  temporalField?:TemporalField
  temporalCursor?:number
  introspection?:IntrospectiveLexicon
  introspectionCursor?:number
  state?:StateVector
  stateCursor?:number
  candidates?:ConsciousCandidate[]
  candidateCursor?:number
  accessHistory?:WorkspaceFrame[]
  accessCursor?:number
  energyCost:number
}
export interface PythonSubstrate {
  protocol:1
  identity:string
  tick:number
  backend:string
  dimensions:number
  latent:number[]
  integration:number
  differentiation:number
  recurrence:number
  causalCoupling:number
  updates:number
  authority:PythonAuthorityPatch
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
  pythonSubstrate?:PythonSubstrate
}
export interface Life {
  id: string
  bornAt: number
  seed: number
  rng: number
  environmentRng:number
  interoceptionRng:number
  spatialRng:number
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
  nextInterventionId:number
  nextMemoryId: number
  nextClusterId: number
  nextSymbolId: number
  lastSavedAt: number
  consciousness: ConsciousArchitecture
}
export interface Snapshot { version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25; savedAt: number; life: Life }
