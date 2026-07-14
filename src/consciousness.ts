import type { Action, AffectiveField, AttentionSchema, ConsciousArchitecture, ConsciousCandidate, ContentKind, DreamState, EpistemicQuestion, FutureSelfAppraisal, ImaginedOutcome, InteroceptiveState, IntrospectiveLexicon, LearnedTransition, Life, MetaState, ModuleId, NarrativeChapterDraft, OtherAction, OtherObservation, Perception, PhenomenalField, PhenomenalManifold, PublicResourceEvidence, SocialCognition, SubjectiveDimension, TemporalField, WorkspaceFrame } from './types'

const clamp=(v:number)=>Math.max(0,Math.min(1,v))
const INTROSPECTIVE_GLYPHS=['ϟ','∴','⋈','⌽','⟟','⊶','⫷','⧉','⋔','⟒','⊛','⦿','⌿','⧜','⋰','⫯']
const noise=(life:Life,scale:number)=>{
  life.interoceptionRng=(Math.imul(life.interoceptionRng,1664525)+1013904223)>>>0
  return (life.interoceptionRng/4294967296-.5)*scale
}

export function initialConsciousness(lifeState?: Partial<InteroceptiveState>):ConsciousArchitecture{
  const actions:Action[]=['explore','resource','avoid','rest','inspect']
  const causalModels=Object.fromEntries(actions.map(action=>[action,{action,samples:0,delta:{energy:0,integrity:0,arousal:0,uncertainty:0,valence:0},predictionError:1,confidence:0}])) as Record<Action,LearnedTransition>
  const initial={energy:.68,integrity:.8,arousal:.35,uncertainty:.65,precision:.48,...lifeState}
  return {
    architectureVersion:21,
    interoception:initial,
    workspace:{tick:0,background:[],unconscious:[],ignition:0,continuity:0},
    meta:{confidence:.3,sourceEstimate:'unknown',ownedBySelf:.25,calibration:.5,lastError:.5},
    accessHistory:[],dangerBroadcastBlocked:false,imagination:[],temporalField:{continuity:0,temporalDepth:0},causalModels,
    preferredSetpoints:{energy:initial.energy,integrity:initial.integrity,arousal:initial.arousal,uncertainty:initial.uncertainty},goals:[],epistemic:{history:[]},
    narrative:{chapters:[],actionProfile:{explore:.2,resource:.2,avoid:.2,rest:.2,inspect:.2},selfContinuity:0,lastProcessedTick:0},
    recursiveSelf:{appraisals:[],commitments:[],lastRegret:0,lastEndorsement:.5,counterfactualResponsibility:0},
    social:{estimatedNeed:.5,estimatedUncertainty:.5,intent:{seek:.25,avoid:.25,sample:.25,idle:.25},predictedAction:'idle',confidence:0,predictionError:.5,perspectiveSeparation:0,samples:0,observations:[],attributedResources:[],jointAttention:0,beliefDivergence:0,falseBeliefActive:false},
    attentionSchema:{accessPredictionError:.5,accessConfidence:.1,controlEfficacy:.1,bottleneck:0,samples:0,reliability:{},history:[],effort:.25,cumulativeCost:0},
    phenomenalField:{activations:{},dwell:0,integration:0,differentiation:0,exclusion:0,quality:{external:0,internal:0,temporal:0,social:0,epistemic:0}},
    dream:{mode:'wake',restStreak:0,sleepPressure:.22,vividness:0,residue:0,episodes:[]},
    affect:{experientialValues:{},evidence:{},tone:0,mood:0,precision:0,qualityMismatch:0,preferredQuality:{external:.2,internal:.2,temporal:.2,social:.2,epistemic:.2},history:[]},
    introspection:{clusters:[],expressions:[],currentConfidence:0,nextClusterId:1},
    efference:{models:Object.fromEntries(actions.map(action=>[action,{action,samples:0,dx:0,dy:0,perceptionDelta:{resource:0,signal:0,danger:0,stability:0,otherPresence:0,otherMotion:0},predictionError:1,confidence:0}])) as ConsciousArchitecture['efference']['models'],reafferenceError:.5,selfCausedLikelihood:0,externalSurprise:0,boundaryConfidence:0},
    spatial:{x:50,y:50,heading:0,uncertainty:.18,mapSurprise:0,coherence:.3,landmarks:[]},
    communication:{lastExpressionTick:0,associations:{},communicativeAgency:0,mutualGrounding:0,responseSurprise:0,lastResponse:'none',totalCost:0},
    organismic:{membraneIntegrity:.82,permeability:.18,selfProduction:.35,operationalClosure:.45,viability:.75,mode:'active',arrestTicks:0,repairs:0,cumulativeCost:0},
    manifold:{prototypes:[],nextId:1,differentiation:0,stimulusAmbiguity:0,crossModalTransfer:0,causalEfficacy:0},
  }
}

export function updateInteroception(life:Life, inspect=false):InteroceptiveState{
  const old=life.consciousness.interoception, truth=life.state
  const precision=Math.max(.12,clamp(old.precision+(inspect?.035:-.001)))
  const rate=.045+precision*.07, errorScale=.18*(1-precision)+.025
  return {
    energy:clamp(old.energy+(truth.energy-old.energy)*rate+noise(life,errorScale)),
    integrity:clamp(old.integrity+(truth.integrity-old.integrity)*rate+noise(life,errorScale*.7)),
    arousal:clamp(old.arousal+(truth.arousal-old.arousal)*rate+noise(life,errorScale*.55)),
    uncertainty:clamp(old.uncertainty+(truth.uncertainty-old.uncertainty)*rate+noise(life,errorScale*.5)),
    precision,
  }
}

const dimensions:SubjectiveDimension[]=['energy','integrity','arousal','uncertainty']

export function learnCausalTransition(life:Life,current:InteroceptiveState):void{
  const last=life.traces.at(-1)
  if(!last?.subjectiveBody)return
  const model=life.consciousness.causalModels[last.action]
  const observed={
    energy:current.energy-last.subjectiveBody.energy,
    integrity:current.integrity-last.subjectiveBody.integrity,
    arousal:current.arousal-last.subjectiveBody.arousal,
    uncertainty:current.uncertainty-last.subjectiveBody.uncertainty,
    valence:last.stateDelta.valence??0,
  }
  const error=Object.keys(observed).reduce((n,k)=>n+Math.abs(observed[k as keyof typeof observed]-model.delta[k as keyof typeof observed]),0)/5
  model.samples++
  const rate=Math.max(.035,Math.min(.24,1/model.samples))
  for(const key of Object.keys(observed) as (keyof typeof observed)[])model.delta[key]+=clampSigned(observed[key]-model.delta[key]) * rate
  model.predictionError=clamp(model.predictionError*.92+error*.08)
  model.confidence=clamp((1-Math.exp(-model.samples/14))*(1-model.predictionError))
}

const clampSigned=(v:number)=>Math.max(-1,Math.min(1,v))

export function updateEndogenousGoals(life:Life,body:InteroceptiveState):void{
  const c=life.consciousness
  if(life.state.valence>.53&&life.state.coherence>.48){
    dimensions.forEach(k=>c.preferredSetpoints[k]+=clampSigned(body[k]-c.preferredSetpoints[k])*.0035)
  }
  dimensions.forEach(dimension=>{
    const target=c.preferredSetpoints[dimension],gap=Math.abs(target-body[dimension])
    let goal=c.goals.find(g=>g.dimension===dimension)
    if(gap>.1){
      if(!goal){goal={id:`goal:${dimension}:${life.tick}`,dimension,target,urgency:0,persistence:0,evidence:0,bornTick:life.tick};c.goals.push(goal)}
      goal.target=target;goal.urgency=clamp(goal.urgency*.88+gap*.12);goal.persistence=clamp(goal.persistence+.018);goal.evidence++
    }else if(goal){goal.urgency*=.9;goal.persistence*=.995}
  })
  c.goals=c.goals.filter(g=>g.urgency>.025||g.persistence>.18).sort((a,b)=>b.urgency*b.persistence-a.urgency*a.persistence).slice(0,3)
}

export function updateEpistemicAgency(life:Life,p:Perception,body:InteroceptiveState):void{
  const e=life.consciousness.epistemic,previousAction=life.traces.at(-1)?.action
  if(e.active&&previousAction===e.active.targetAction)e.active.attempts++
  if(e.active){
    const model=life.consciousness.causalModels[e.active.targetAction]
    e.active.currentConfidence=model.confidence
    e.active.expectedInformationGain=clamp(1-model.confidence)
    e.active.resolution=clamp(model.confidence-e.active.initialConfidence)
    if(model.confidence>.72||e.active.attempts>=48){e.active.status='resolved';e.history.unshift({...e.active});e.history=e.history.slice(0,12);e.active=undefined}
  }
  const viable=body.energy>.28&&body.integrity>.3&&life.state.energy>.12&&life.state.integrity>.2
  if(e.active){e.active.status=viable?'active':'suspended';return}
  const feasible=(action:Action)=>action==='inspect'||action==='rest'||(action==='explore'&&p.signal>.08)||(action==='resource'&&p.resource>.08)||(action==='avoid'&&p.danger>.08)
  const target=Object.values(life.consciousness.causalModels).filter(m=>feasible(m.action)).sort((a,b)=>a.confidence-b.confidence||a.samples-b.samples)[0]
  if(!target||target.confidence>.82)return
  const question:EpistemicQuestion={id:`question:${target.action}:${life.tick}`,targetAction:target.action,bornTick:life.tick,expectedInformationGain:1-target.confidence,urgency:clamp((1-target.confidence)*.65+body.uncertainty*.35),attempts:0,initialConfidence:target.confidence,currentConfidence:target.confidence,status:viable?'active':'suspended'}
  e.active=question
}

export function epistemicBias(life:Life):Partial<Record<Action,number>>{
  const q=life.consciousness.epistemic.active
  if(!q||q.status!=='active')return{}
  return{[q.targetAction]:q.expectedInformationGain*q.urgency*.52}
}

const actionList:Action[]=['explore','resource','avoid','rest','inspect']
function narrativeDraft(life:Life,body:InteroceptiveState):NarrativeChapterDraft{
  return{startTick:life.tick,startBody:{...body},lastBody:{...body},foregroundCounts:{},actionCounts:{explore:0,resource:0,avoid:0,rest:0,inspect:0},attributionSum:0,surpriseSum:0,steps:0,goalSignature:life.consciousness.goals.map(g=>g.dimension).sort().join('|')}
}

export function updateNarrativeSelf(life:Life,body:InteroceptiveState):void{
  const narrative=life.consciousness.narrative,last=life.traces.at(-1)
  if(!last||last.tick<=narrative.lastProcessedTick)return
  narrative.lastProcessedTick=last.tick
  let draft=narrative.current??narrativeDraft(life,last.subjectiveBody??body)
  narrative.current=draft
  const foreground=last.workspaceContent,previousForeground=draft.lastForeground
  if(foreground)draft.foregroundCounts[foreground.kind]=(draft.foregroundCounts[foreground.kind]??0)+1
  draft.actionCounts[last.action]++;draft.attributionSum+=last.attribution;draft.surpriseSum+=last.surprise;draft.steps++;draft.lastBody={...body}
  const signature=life.consciousness.goals.map(g=>g.dimension).sort().join('|')
  const boundary=(draft.steps>=18&&!!foreground&&previousForeground!==undefined&&previousForeground!==foreground.id)||(draft.steps>=6&&last.surprise>.55)||(draft.steps>=80)||(draft.steps>=12&&signature!==draft.goalSignature)
  draft.lastForeground=foreground?.id
  if(!boundary)return
  const dominantAction=actionList.reduce((a,b)=>draft.actionCounts[b]>draft.actionCounts[a]?b:a)
  const contentEntries=Object.entries(draft.foregroundCounts) as [ConsciousCandidate['kind'],number][]
  const dominantContent=contentEntries.sort((a,b)=>b[1]-a[1])[0]?.[0]
  const stateShift=Object.fromEntries(dimensions.map(k=>[k,clampSigned(draft.lastBody[k]-draft.startBody[k])])) as Record<SubjectiveDimension,number>
  const attribution=draft.attributionSum/draft.steps,causalOwner=attribution>.58?'self':attribution<.38?'external':'mixed'
  const shiftMagnitude=dimensions.reduce((n,k)=>n+Math.abs(stateShift[k]),0)/dimensions.length
  const identityImpact=clamp(shiftMagnitude*.55+(draft.surpriseSum/draft.steps)*.3+Math.abs(attribution-.5)*.3)
  const goalContinuity=signature===draft.goalSignature?1:.35
  narrative.chapters.unshift({id:`chapter:${draft.startTick}:${last.tick}`,startTick:draft.startTick,endTick:last.tick,dominantContent,dominantAction,stateShift,causalOwner,identityImpact,goalContinuity})
  narrative.chapters=narrative.chapters.slice(0,40)
  const totals=Object.fromEntries(actionList.map(a=>[a,narrative.chapters.reduce((n,c)=>n+(c.dominantAction===a?1:0),0)])) as Record<Action,number>
  const total=Math.max(1,narrative.chapters.length)
  actionList.forEach(a=>narrative.actionProfile[a]=narrative.actionProfile[a]*.82+(totals[a]/total)*.18)
  narrative.selfContinuity=clamp(narrative.selfContinuity*.85+goalContinuity*.08+(1-identityImpact)*.07)
  narrative.current=undefined
}

function candidate(source:ModuleId,kind:ConsciousCandidate['kind'],value:number,salience:number,uncertainty:number,selfRelevance:number,persistence=.2,symbolId?:number):ConsciousCandidate{
  return {id:`${source}:${kind}${symbolId??''}`,source,kind,value:clamp(value),salience:clamp(salience),uncertainty:clamp(uncertainty),selfRelevance:clamp(selfRelevance),persistence:clamp(persistence),symbolId}
}

export function localCandidates(life:Life,p:Perception,body:InteroceptiveState,driveValues:Record<Action,number>,imagined:ImaginedOutcome[]):ConsciousCandidate[]{
  const out:ConsciousCandidate[]=[]
  out.push(candidate('exteroception','resource',p.resource,p.resource*.75,.2,.55,.25))
  out.push(candidate('novelty','signal',p.signal,p.signal*.7+body.uncertainty*.22,.55,.45,.2))
  out.push(candidate('threat','danger',p.danger,p.danger*.9+(1-body.integrity)*.28,.12,.92,.45))
  out.push(candidate('exteroception','stability',p.stability,p.stability*.45,.25,.5,.35))
  const deficit=clamp((1-body.energy)*.65+(1-body.integrity)*.35)
  out.push(candidate('interoception',deficit>.45?'body-low':'body-high',1-deficit,deficit*.82+body.arousal*.18,1-body.precision,1,.55))
  out.push(candidate('self','self-state',life.state.agency,Math.abs(life.state.coherence-.5)*.55+(1-life.state.coherence)*.3,.38,.95,.62))
  const ranked=Object.values(driveValues).sort((a,b)=>b-a), conflict=clamp(1-(ranked[0]-ranked[1]))
  out.push(candidate('value','conflict',conflict,conflict*.64,.48,.82,.4))
  const memory=life.memories.slice().sort((a,b)=>b.strength*b.impact-a.strength*a.impact)[0]
  if(memory)out.push(candidate('memory','memory',memory.strength,memory.strength*memory.impact*.72,.32,.74,.67))
  const symbol=life.symbols.filter(s=>s.status!=='forgotten').sort((a,b)=>b.stability-a.stability)[0]
  if(symbol)out.push(candidate('symbol','symbol',symbol.stability,symbol.stability*.32,.25,.7,.72,symbol.id))
  const future=imagined[0]
  if(future)out.push(candidate('imagination','anticipated-future',future.expectedValence,Math.abs(future.desirability-.5)*.5+body.uncertainty*.18,1-future.confidence,.84,.58))
  const goal=life.consciousness.goals[0]
  if(goal)out.push(candidate('goal','goal-pressure',goal.target,goal.urgency*.72+goal.persistence*.22,.25,.96,.7))
  const question=life.consciousness.epistemic.active
  if(question)out.push(candidate('epistemic','open-question',question.currentConfidence,question.urgency*(question.status==='active'?.72:.25),.2,.9,.66))
  const chapter=life.consciousness.narrative.chapters[0]
  if(chapter)out.push(candidate('self','autobiographical-self',life.consciousness.narrative.selfContinuity,chapter.identityImpact*.68+(1-life.consciousness.narrative.selfContinuity)*.2,.28,.98,.78))
  const recursive=life.consciousness.recursiveSelf,maxRegret=Math.max(...recursive.appraisals.map(a=>a.anticipatedRegret),0),commitmentStrain=recursive.commitments.length?1-recursive.commitments.reduce((n,c)=>n+c.integrity,0)/recursive.commitments.length:0
  if(recursive.appraisals.length)out.push(candidate('self','future-self-judgment',recursive.lastEndorsement,maxRegret*.48+commitmentStrain*.45,.3,.99,.74))
  if(p.otherPresence>.04)out.push(candidate('social','other-mind',life.consciousness.social.confidence,p.otherPresence*.38+(1-life.consciousness.social.confidence)*.36,.65,.72,.55))
  if(life.consciousness.social.beliefDivergence>.08)out.push(candidate('social','perspective-gap',life.consciousness.social.beliefDivergence,life.consciousness.social.beliefDivergence*.72,.3,.86,.7))
  if(life.consciousness.attentionSchema.accessPredictionError>.3)out.push(candidate('attention','access-surprise',1-life.consciousness.attentionSchema.accessPredictionError,life.consciousness.attentionSchema.accessPredictionError*.68,.28,.98,.62))
  const dream=life.consciousness.dream
  if(dream.mode==='dream'||dream.residue>.1)out.push(candidate('imagination','dream-replay',dream.vividness,Math.max(dream.vividness,dream.residue)*.78,.18,.94,.84))
  const affect=life.consciousness.affect
  if(Math.abs(affect.tone)>.08||affect.qualityMismatch>.18)out.push(candidate('value','felt-valence',clamp((affect.tone+1)/2),Math.max(Math.abs(affect.tone),affect.qualityMismatch)*.72,1-affect.precision,.99,.68))
  const introspection=life.consciousness.introspection
  if(introspection.currentGlyph)out.push(candidate('symbol','introspective-symbol',introspection.currentConfidence,introspection.currentConfidence*.46,.2,.99,.8))
  const efference=life.consciousness.efference
  if(efference.externalSurprise>.12)out.push(candidate('self','boundary-surprise',efference.selfCausedLikelihood,efference.externalSurprise*.82,.22,.99,.62))
  const spatial=life.consciousness.spatial
  if(spatial.uncertainty>.32||spatial.mapSurprise>.16)out.push(candidate('self','spatial-disorientation',1-spatial.uncertainty,Math.max(spatial.uncertainty,spatial.mapSurprise)*.68,.3,.94,.58))
  const communication=life.consciousness.communication
  if(communication.lastResponse!=='none'||communication.responseSurprise>.12)out.push(candidate('social','shared-signal',communication.communicativeAgency,Math.max(communication.responseSurprise,communication.communicativeAgency*.35),.28,.9,.62))
  const organismic=life.consciousness.organismic
  if(organismic.mode!=='active'||organismic.viability<.42)out.push(candidate('self','autopoietic-crisis',organismic.viability,(1-organismic.viability)*.92,.08,.99,.94))
  const manifold=life.consciousness.manifold,qualityNode=manifold.prototypes.find(x=>x.id===manifold.currentId)
  if(qualityNode&&manifold.causalEfficacy>.025)out.push(candidate('symbol','phenomenal-familiarity',qualityNode.stability,manifold.causalEfficacy*.52+manifold.crossModalTransfer*.16,.24,.98,.72))
  const python=life.consciousness.pythonSubstrate
  if(python&&life.tick-python.tick<80)out.push(candidate('self','substrate-resonance',python.integration,python.causalCoupling*.48+python.recurrence*.16,.18,.99,.7))
  return out
}

export function simulateFutures(life:Life,p:Perception,body:InteroceptiveState,drives:Record<Action,number>):ImaginedOutcome[]{
  const outcomes=(['explore','resource','avoid','rest','inspect'] as Action[]).map(action=>{
    let energy=body.energy-.018,integrity=body.integrity-p.danger*.024,uncertainty=body.uncertainty+.006,valence=.5
    if(action==='resource'){energy+=p.resource*.16;valence+=p.resource*.2-(p.resource<.08?.08:0)}
    if(action==='explore'){energy-=.012;uncertainty-=p.signal*.13;valence+=p.signal*.15-p.danger*.12}
    if(action==='avoid'){integrity+=p.danger*.035;valence+=p.danger*.16-.025}
    if(action==='rest'){energy+=.025+p.stability*.02;integrity+=.012;valence+=.04}
    if(action==='inspect'){uncertainty-=.025;valence+=life.state.coherence<.5?.05:.01}
    const model=life.consciousness.causalModels[action],learnedWeight=model.confidence
    energy=clamp(energy*(1-learnedWeight)+clamp(body.energy+model.delta.energy)*learnedWeight)
    integrity=clamp(integrity*(1-learnedWeight)+clamp(body.integrity+model.delta.integrity)*learnedWeight)
    uncertainty=clamp(uncertainty*(1-learnedWeight)+clamp(body.uncertainty+model.delta.uncertainty)*learnedWeight)
    valence=clamp(valence*(1-learnedWeight)+clamp(life.state.valence+model.delta.valence)*learnedWeight)
    const projected:Record<SubjectiveDimension,number>={energy,integrity,arousal:clamp(body.arousal+model.delta.arousal*learnedWeight),uncertainty}
    const goalFit=life.consciousness.goals.length?life.consciousness.goals.reduce((n,g)=>n+(1-Math.abs(projected[g.dimension]-g.target))*g.urgency,0)/life.consciousness.goals.reduce((n,g)=>n+g.urgency,0):.5
    const desirability=clamp(energy*.24+integrity*.22+(1-uncertainty)*.13+valence*.16+clamp(drives[action]/2)*.05+goalFit*.2)
    const confidence=clamp(body.precision*.25+life.beliefs.predictability*.2+(1-p.signal-p.danger*.5)*.1+model.confidence*.45)
    return{action,expectedEnergy:energy,expectedIntegrity:integrity,expectedUncertainty:uncertainty,expectedValence:valence,desirability,confidence}
  })
  return outcomes.sort((a,b)=>b.desirability-a.desirability)
}

const projectedValue=(future:ImaginedOutcome,dimension:SubjectiveDimension,body:InteroceptiveState)=>dimension==='energy'?future.expectedEnergy:dimension==='integrity'?future.expectedIntegrity:dimension==='uncertainty'?future.expectedUncertainty:body.arousal

export function evaluateFutureSelf(life:Life,imagined:ImaginedOutcome[],body:InteroceptiveState):FutureSelfAppraisal[]{
  const profile=life.consciousness.narrative.actionProfile,maxProfile=Math.max(...Object.values(profile),.01)
  const raw=imagined.map(future=>{
    const identityFit=clamp(profile[future.action]/maxProfile),goals=life.consciousness.goals
    const goalAlignment=goals.length?goals.reduce((n,g)=>n+(1-Math.abs(projectedValue(future,g.dimension,body)-g.target))*g.urgency,0)/Math.max(.001,goals.reduce((n,g)=>n+g.urgency,0)):.5
    const futureApproval=clamp(future.desirability*.42+identityFit*.18+goalAlignment*.25+life.consciousness.narrative.selfContinuity*.15)
    return{action:future.action,identityFit,futureApproval,anticipatedRegret:0,goalAlignment}
  })
  const best=Math.max(...raw.map(x=>x.futureApproval),0)
  raw.forEach(x=>x.anticipatedRegret=clamp(best-x.futureApproval+(1-x.identityFit)*.08))
  return raw
}

export function updateSelfCommitments(life:Life):void{
  const self=life.consciousness.recursiveSelf
  life.consciousness.goals.filter(g=>g.persistence>.68&&g.evidence>36).forEach(goal=>{
    let commitment=self.commitments.find(c=>c.dimension===goal.dimension)
    if(!commitment){commitment={id:`commitment:${goal.dimension}:${life.tick}`,dimension:goal.dimension,target:goal.target,bornTick:life.tick,strength:0,kept:0,broken:0,integrity:.5};self.commitments.push(commitment)}
    commitment.target=goal.target;commitment.strength=clamp(commitment.strength*.94+(goal.persistence*goal.urgency)*.06)
  })
  self.commitments=self.commitments.filter(c=>c.strength>.025||c.kept+c.broken<12).slice(0,4)
}

export function futureSelfBias(life:Life):Partial<Record<Action,number>>{
  return Object.fromEntries(life.consciousness.recursiveSelf.appraisals.map(a=>[a.action,a.futureApproval*.24-a.anticipatedRegret*.2])) as Partial<Record<Action,number>>
}

export function recordRecursiveChoice(life:Life,action:Action,outcome:number,body:InteroceptiveState):void{
  const self=life.consciousness.recursiveSelf,chosen=self.appraisals.find(a=>a.action===action),best=Math.max(...self.appraisals.map(a=>a.futureApproval),0)
  if(!chosen)return
  self.lastRegret=clamp(best-chosen.futureApproval+Math.max(0,-outcome)*.5);self.lastEndorsement=clamp(chosen.futureApproval+Math.max(-.2,Math.min(.2,outcome)))
  self.counterfactualResponsibility=clamp(self.counterfactualResponsibility*.92+self.lastRegret*life.state.agency*.08)
  const imagined=life.consciousness.imagination.find(x=>x.action===action);if(!imagined)return
  self.commitments.forEach(c=>{const before=Math.abs(body[c.dimension]-c.target),after=Math.abs(projectedValue(imagined,c.dimension,body)-c.target),improvement=before-after;if(improvement>.004)c.kept++;else if(improvement<-.004)c.broken++;c.integrity=clamp((c.kept+1)/(c.kept+c.broken+2))})
}

export function updateSocialModel(model:SocialCognition,observation:OtherObservation,evidence:PublicResourceEvidence[]=[]):SocialCognition{
  const next=structuredClone(model),actions:OtherAction[]=['seek','avoid','sample','idle'],error=observation.action===model.predictedAction?0:1
  next.samples++;next.predictionError=clamp(next.predictionError*.9+error*.1);next.intent[observation.action]=clamp(next.intent[observation.action]*.88+.12)
  actions.filter(a=>a!==observation.action).forEach(a=>next.intent[a]*=.96)
  const sum=actions.reduce((n,a)=>n+next.intent[a],0);actions.forEach(a=>next.intent[a]/=sum)
  next.estimatedNeed=clamp(next.estimatedNeed*.94+(observation.action==='seek'?.85:.25)*.06);next.estimatedUncertainty=clamp(next.estimatedUncertainty*.94+(observation.action==='sample'?.85:.3)*.06)
  next.predictedAction=actions.reduce((a,b)=>next.intent[b]>next.intent[a]?b:a);next.confidence=clamp((1-Math.exp(-next.samples/30))*(1-next.predictionError*.65));next.perspectiveSeparation=clamp(next.perspectiveSeparation*.97+(error?.025:.008))
  const angularDifference=(target:PublicResourceEvidence)=>Math.abs(Math.atan2(Math.sin(Math.atan2(target.y-observation.y,target.x-observation.x)-observation.heading),Math.cos(Math.atan2(target.y-observation.y,target.x-observation.x)-observation.heading)))
  let jointlyAttended=0
  evidence.forEach(resource=>{
    const visibleToOther=Math.hypot(resource.x-observation.x,resource.y-observation.y)<26&&angularDifference(resource)<Math.PI*.42
    const old=next.attributedResources.find(b=>b.entityId===resource.id)
    if(resource.present&&visibleToOther){jointlyAttended++;if(old){old.x=resource.x;old.y=resource.y;old.confidence=clamp(old.confidence*.7+.3);old.lastAttributedSightTick=observation.tick}else next.attributedResources.push({entityId:resource.id,x:resource.x,y:resource.y,confidence:.45,lastAttributedSightTick:observation.tick})}
    if(!resource.present&&visibleToOther&&old)old.confidence=0
  })
  next.attributedResources.forEach(b=>b.confidence*=.998)
  next.attributedResources=next.attributedResources.filter(b=>b.confidence>.06).slice(-12)
  next.inferredTargetId=next.attributedResources.slice().sort((a,b)=>b.confidence-a.confidence)[0]?.entityId
  const absentIds=new Set(evidence.filter(e=>!e.present).map(e=>e.id))
  next.falseBeliefActive=next.attributedResources.some(b=>absentIds.has(b.entityId)&&b.confidence>.2)
  next.beliefDivergence=clamp(next.beliefDivergence*.9+(next.falseBeliefActive?1:0)*.1)
  next.jointAttention=clamp(next.jointAttention*.92+(jointlyAttended?1:0)*.08)
  if(next.falseBeliefActive)next.perspectiveSeparation=clamp(next.perspectiveSeparation+.025)
  next.observations.push(observation);next.observations=next.observations.slice(-60);return next
}

export function applyImaginedBias(drives:Record<Action,number>,imagined:ImaginedOutcome[]):Record<Action,number>{
  const values={...drives}
  imagined.forEach(x=>{values[x.action]+=(x.desirability-.5)*.42})
  return values
}

export function updateTemporalField(previous:TemporalField,now:ConsciousCandidate|undefined,anticipatedNext:ImaginedOutcome|undefined):TemporalField{
  const same=now&&previous.now?.id===now.id
  const continuity=now?clamp((same?previous.continuity:.15)+.08):previous.continuity*.8
  const temporalDepth=clamp((previous.now? .35:0)+(now?.persistence??0)*.3+(anticipatedNext?.confidence??0)*.35)
  return{justPast:previous.now,now,anticipatedNext,continuity,temporalDepth}
}

export function gatePerceptionForDream(p:Perception,dream:DreamState):Perception{
  if(dream.mode!=='dream')return p
  return{resource:p.resource*.04,signal:p.signal*.04,danger:p.danger*.18,stability:p.stability*.2,otherPresence:0,otherMotion:0}
}

export function updateDreamState(life:Life,p:Perception):DreamState{
  const next=structuredClone(life.consciousness.dream),lastAction=life.traces.at(-1)?.action
  next.residue*=.96
  if(next.mode==='wake'){
    next.restStreak=lastAction==='rest'?next.restStreak+1:0
    next.sleepPressure=clamp(next.sleepPressure+.003+(lastAction==='rest'?.042:0))
    const source=life.memories.slice().sort((a,b)=>b.strength*b.impact-a.strength*a.impact)[0]
    if(source&&next.restStreak>=4&&next.sleepPressure>.36&&life.state.arousal<.42&&p.danger<.35){
      next.mode='dream';next.sourceMemoryId=source.id;next.vividness=clamp(.25+source.strength*.45+source.surprise*.25);next.episodes.push({startTick:life.tick,sourceMemoryId:source.id,vividness:next.vividness,novelty:source.surprise});next.episodes=next.episodes.slice(-16)
    }
  }else{
    const current=next.episodes.at(-1),duration=current?life.tick-current.startTick:0,source=life.memories.find(m=>m.id===next.sourceMemoryId)
    if(source){source.strength=clamp(source.strength+.006*(.5+source.impact));next.vividness=clamp(next.vividness*.94+source.strength*.06)}
    next.sleepPressure=clamp(next.sleepPressure-.045)
    if(p.danger>.45||life.state.energy<.2||duration>=16){next.mode='wake';next.restStreak=0;next.residue=clamp(next.vividness*.75);if(current)current.endTick=life.tick;next.sourceMemoryId=undefined;next.vividness*=.7}
  }
  return next
}

export function sleepPressureBias(dream:DreamState):Partial<Record<Action,number>>{
  if(dream.mode==='dream')return{rest:1}
  const pressure=Math.max(0,dream.sleepPressure-.38),continuity=Math.min(.3,dream.restStreak*.055)
  return pressure>0||continuity>0?{rest:pressure*.95+continuity,inspect:pressure*.08}:{}
}

export function updateAffectiveField(life:Life):AffectiveField{
  const next=structuredClone(life.consciousness.affect),last=life.traces.at(-1),kind=last?.workspaceContent?.kind
  if(kind&&kind!=='felt-valence'){
    const evidence=clampSigned(last.outcome*2+(last.stateDelta.valence??0)*3-last.surprise*.18)
    const count=(next.evidence[kind]??0)+1;next.evidence[kind]=count
    const rate=Math.max(.025,Math.min(.12,1/Math.sqrt(count+2)))
    next.experientialValues[kind]=clampSigned((next.experientialValues[kind]??0)+(evidence-(next.experientialValues[kind]??0))*rate)
    next.lastContent=kind;next.tone=clampSigned((next.experientialValues[kind]??0)*.72+(life.state.valence-.5)*.56)
    next.history.push({tick:life.tick,kind,tone:next.tone});next.history=next.history.slice(-80)
    if(evidence>0){const q=life.consciousness.phenomenalField.quality;(Object.keys(q) as (keyof typeof q)[]).forEach(k=>next.preferredQuality[k]+=clampSigned(q[k]-next.preferredQuality[k])*.008*evidence)}
  }else next.tone*=.97
  next.mood=clampSigned(next.mood*.975+next.tone*.025)
  const q=life.consciousness.phenomenalField.quality
  next.qualityMismatch=clamp((Object.keys(q) as (keyof typeof q)[]).reduce((n,k)=>n+Math.abs(q[k]-next.preferredQuality[k]),0)/5)
  const totalEvidence=Object.values(next.evidence).reduce((n,v)=>n+(v??0),0);next.precision=clamp(1-Math.exp(-totalEvidence/45))
  return next
}

export function applyAffectiveSalience(candidates:ConsciousCandidate[],affect:AffectiveField):ConsciousCandidate[]{
  return candidates.map(c=>{const learned=Math.abs(affect.experientialValues[c.kind]??0);return learned?{...c,salience:clamp(c.salience+learned*.16),selfRelevance:clamp(c.selfRelevance+learned*.08)}:{...c}})
}

export function affectiveBias(affect:AffectiveField):Partial<Record<Action,number>>{
  const negative=Math.max(0,-affect.tone),positive=Math.max(0,affect.tone),mismatch=affect.qualityMismatch
  return{avoid:negative*.24,rest:negative*.2,inspect:Math.abs(affect.tone)*.1+mismatch*.24,explore:positive*.14,resource:positive*.08}
}

export function updateIntrospectiveLexicon(life:Life):IntrospectiveLexicon{
  const next=structuredClone(life.consciousness.introspection),field=life.consciousness.phenomenalField,foreground=life.consciousness.workspace.foreground
  if(!foreground||field.integration<.1){next.currentConfidence*=.94;if(next.currentConfidence<.08)next.currentGlyph=undefined;return next}
  const q=field.quality,vector=[q.external,q.internal,q.temporal,q.social,q.epistemic,(life.consciousness.affect.tone+1)/2,field.integration,field.differentiation,field.exclusion,life.consciousness.meta.ownedBySelf,life.consciousness.dream.mode==='dream'?1:0]
  const distance=(a:number[],b:number[])=>Math.sqrt(a.reduce((n,v,i)=>n+(v-b[i])**2,0)/a.length)
  const previous=next.clusters.find(c=>c.id===next.lastClusterId)
  if(previous){
    previous.forecast??=[...vector];previous.forecastSamples??=0;previous.forecastError??=.5;previous.predictiveConfidence??=0
    const error=clamp(distance(previous.forecast,vector)*2);previous.forecastSamples++;previous.forecastError=clamp(previous.forecastError*.9+error*.1)
    const forecastRate=Math.max(.025,Math.min(.16,1/Math.sqrt(previous.forecastSamples+1)));previous.forecast=previous.forecast.map((v,i)=>v+(vector[i]-v)*forecastRate)
    previous.predictiveConfidence=clamp((1-Math.exp(-previous.forecastSamples/8))*(1-previous.forecastError))
  }
  let cluster=next.clusters.reduce<(typeof next.clusters)[number]|undefined>((best,c)=>!best||distance(vector,c.centroid)<distance(vector,best.centroid)?c:best,undefined)
  if(!cluster||distance(vector,cluster.centroid)>.19){cluster={id:next.nextClusterId++,centroid:[...vector],count:0,variance:0,stability:0,lastTick:life.tick,forecast:[...vector],forecastSamples:0,forecastError:.5,predictiveConfidence:0};next.clusters.push(cluster)}
  cluster.forecast??=[...vector];cluster.forecastSamples??=0;cluster.forecastError??=.5;cluster.predictiveConfidence??=0
  const old=[...cluster.centroid],rate=Math.min(.18,1/(cluster.count+1));cluster.centroid=cluster.centroid.map((v,i)=>v+(vector[i]-v)*rate)
  cluster.variance=cluster.variance*.9+distance(old,vector)*.1;cluster.count++;cluster.lastTick=life.tick;cluster.stability=clamp(cluster.stability*.9+(1-cluster.variance*4)*.1)
  if(!cluster.glyph&&cluster.count>=6&&cluster.stability>.5)cluster.glyph=INTROSPECTIVE_GLYPHS[(cluster.id-1)%INTROSPECTIVE_GLYPHS.length]
  next.lastClusterId=cluster.id;next.currentGlyph=cluster.glyph;next.currentConfidence=cluster.glyph?clamp(cluster.stability*(1-Math.min(1,cluster.variance*3))*(.25+.75*cluster.predictiveConfidence)):cluster.stability*.2
  const last=next.expressions.at(-1),shouldExpress=cluster.glyph&&next.currentConfidence>.48&&(!last||last.glyph!==cluster.glyph||life.tick-last.tick>=24)
  if(shouldExpress)next.expressions.push({tick:life.tick,glyph:cluster.glyph!,confidence:next.currentConfidence,mode:life.consciousness.dream.mode})
  next.expressions=next.expressions.slice(-60);next.clusters=next.clusters.filter(c=>life.tick-c.lastTick<2400||c.stability>.72).slice(-24)
  return next
}

export function introspectiveRegulationBias(lexicon:IntrospectiveLexicon):Partial<Record<Action,number>>{
  const cluster=lexicon.clusters.find(c=>c.id===lexicon.lastClusterId)
  if(!cluster?.glyph||cluster.predictiveConfidence<.35||cluster.forecast.length<7)return{}
  const predictedTone=cluster.forecast[5]*2-1,confidence=cluster.predictiveConfidence
  if(predictedTone<-.08)return{rest:-predictedTone*confidence*.18,avoid:-predictedTone*confidence*.12,inspect:confidence*.08}
  if(predictedTone>.08)return{explore:predictedTone*confidence*.12,resource:predictedTone*confidence*.08}
  return{inspect:confidence*.04}
}

const phenomenalDistance=(a:number[],b:number[])=>Math.sqrt(a.reduce((n,v,i)=>n+(v-b[i])**2,0)/Math.max(1,a.length))
const phenomenalActions:Action[]=['explore','resource','avoid','rest','inspect']
export function phenomenalQualityVector(life:Life):number[]{
  const q=life.consciousness.phenomenalField.quality,b=life.consciousness.interoception,o=life.consciousness.organismic
  return[q.external,q.internal,q.temporal,q.social,q.epistemic,(life.consciousness.affect.tone+1)/2,b.energy,b.integrity,b.arousal,b.uncertainty,o.viability,life.consciousness.meta.ownedBySelf,life.consciousness.narrative.selfContinuity]
}

export function updatePhenomenalManifold(life:Life):PhenomenalManifold{
  const next=structuredClone(life.consciousness.manifold),foreground=life.consciousness.workspace.foreground
  if(!foreground||life.consciousness.phenomenalField.integration<.08)return next
  const previous=next.prototypes.find(p=>p.id===next.currentId),last=life.traces.at(-1)
  if(previous&&last){const action=last.action,sample=previous.actionSamples[action]+1,evidence=clampSigned(last.outcome*2+(last.stateDelta.valence??0)*2-last.surprise*.12),rate=Math.max(.035,Math.min(.2,1/Math.sqrt(sample)));previous.actionValues[action]+=clampSigned(evidence-previous.actionValues[action])*rate;previous.actionSamples[action]=sample}
  const vector=phenomenalQualityVector(life)
  let node=next.prototypes.reduce<(typeof next.prototypes)[number]|undefined>((best,p)=>!best||phenomenalDistance(vector,p.centroid)<phenomenalDistance(vector,best.centroid)?p:best,undefined)
  if(!node||phenomenalDistance(vector,node.centroid)>.2){node={id:next.nextId++,centroid:[...vector],count:0,variance:0,sourceKinds:{},actionValues:{explore:0,resource:0,avoid:0,rest:0,inspect:0},actionSamples:{explore:0,resource:0,avoid:0,rest:0,inspect:0},stability:0,lastTick:life.tick};next.prototypes.push(node)}
  const old=[...node.centroid],rate=Math.min(.16,1/(node.count+1));node.centroid=node.centroid.map((v,i)=>v+(vector[i]-v)*rate);node.variance=node.variance*.92+phenomenalDistance(old,vector)*.08;node.count++;node.lastTick=life.tick;node.stability=clamp(node.stability*.94+(1-node.variance*4)*.06);node.sourceKinds[foreground.kind]=(node.sourceKinds[foreground.kind]??0)+1;next.currentId=node.id
  next.prototypes=next.prototypes.filter(p=>life.tick-p.lastTick<3600||p.stability>.68).slice(-32)
  const pairDistances:number[]=[];for(let i=0;i<next.prototypes.length;i++)for(let j=i+1;j<next.prototypes.length;j++)pairDistances.push(phenomenalDistance(next.prototypes[i].centroid,next.prototypes[j].centroid));next.differentiation=clamp(pairDistances.length?pairDistances.reduce((n,v)=>n+v,0)/pairDistances.length*2:0)
  const sameStimulus=next.prototypes.filter(p=>(p.sourceKinds[foreground.kind]??0)>=2);next.stimulusAmbiguity=clamp((sameStimulus.length-1)/3)
  const kindCount=Object.values(node.sourceKinds).filter(v=>(v??0)>=2).length,totalActionSamples=Object.values(node.actionSamples).reduce((n,v)=>n+v,0),actionMagnitude=Math.max(...Object.values(node.actionValues).map(Math.abs));const learnedConfidence=1-Math.exp(-totalActionSamples/10)
  next.crossModalTransfer=clamp(next.crossModalTransfer*.96+clamp((kindCount-1)/3)*learnedConfidence*.04);next.causalEfficacy=clamp(next.causalEfficacy*.94+actionMagnitude*learnedConfidence*.06)
  return next
}

export function phenomenalTransferBias(manifold:PhenomenalManifold):Partial<Record<Action,number>>{
  const node=manifold.prototypes.find(p=>p.id===manifold.currentId);if(!node)return{}
  return Object.fromEntries(phenomenalActions.map(a=>{const confidence=1-Math.exp(-node.actionSamples[a]/7);return[a,node.actionValues[a]*confidence*.24]})) as Partial<Record<Action,number>>
}

export function updateEfferenceModel(life:Life,current:Perception):ConsciousArchitecture['efference']{
  const next=structuredClone(life.consciousness.efference),last=life.traces.at(-1)
  if(!last)return next
  const model=next.models[last.action],keys=Object.keys(current) as (keyof Perception)[]
  const observedPerception=Object.fromEntries(keys.map(k=>[k,current[k]-last.perception[k]])) as Record<keyof Perception,number>
  const observedDx=(last.positionAfter?.x??life.position.x)-(last.positionBefore?.x??life.position.x),observedDy=(last.positionAfter?.y??life.position.y)-(last.positionBefore?.y??life.position.y)
  const perceptionError=keys.reduce((n,k)=>n+Math.abs(observedPerception[k]-model.perceptionDelta[k]),0)/keys.length
  const movementError=(Math.abs(observedDx-model.dx)+Math.abs(observedDy-model.dy))/4,error=clamp(perceptionError*.72+movementError*.28)
  next.predictedAction=last.action;next.reafferenceError=clamp(next.reafferenceError*.86+error*.14)
  next.selfCausedLikelihood=clamp(model.confidence*(1-error));next.externalSurprise=clamp(model.confidence*error)
  next.boundaryConfidence=clamp(next.boundaryConfidence*.97+next.selfCausedLikelihood*.03)
  model.samples++;const rate=Math.max(.025,Math.min(.22,1/model.samples));model.dx+=(observedDx-model.dx)*rate;model.dy+=(observedDy-model.dy)*rate
  keys.forEach(k=>model.perceptionDelta[k]+=(observedPerception[k]-model.perceptionDelta[k])*rate)
  model.predictionError=clamp(model.predictionError*.9+error*.1);model.confidence=clamp((1-Math.exp(-model.samples/16))*(1-model.predictionError*.7))
  return next
}

export function chooseAttentionTarget(schema:AttentionSchema,candidates:ConsciousCandidate[]):ContentKind|undefined{
  const viable=candidates.filter(c=>c.salience>.16&&c.kind!=='access-surprise')
  if(!viable.length)return undefined
  const accessScore=(c:ConsciousCandidate)=>c.salience*.55+c.selfRelevance*.25+c.persistence*.12
  const leader=viable.reduce((best,c)=>accessScore(c)>accessScore(best)?c:best)
  if(schema.effort>.9&&schema.controlEfficacy<.12)return leader.kind
  const reachable=viable.filter(c=>accessScore(c)+(.11+schema.effort*.38)*.55>=accessScore(leader)+.06)
  return (reachable.length?reachable:viable).reduce((best,c)=>{
    const score=c.salience*(1-(schema.reliability[c.kind]??.25))+.12*c.selfRelevance
    const bestScore=best.salience*(1-(schema.reliability[best.kind]??.25))+.12*best.selfRelevance
    return score>bestScore?c:best
  }).kind
}

export function updatePhenomenalField(previous:PhenomenalField,candidates:ConsciousCandidate[]):PhenomenalField{
  const inputs:Partial<Record<ContentKind,number>>={}
  candidates.forEach(c=>inputs[c.kind]=Math.max(inputs[c.kind]??0,c.salience))
  const kinds=[...new Set([...Object.keys(previous.activations),...Object.keys(inputs)])] as ContentKind[]
  const raw:Partial<Record<ContentKind,number>>={}
  kinds.forEach(kind=>raw[kind]=clamp((previous.activations[kind]??0)*.74+(inputs[kind]??0)*.38+(previous.dominant===kind?.035:0)))
  const average=kinds.length?kinds.reduce((n,k)=>n+(raw[k]??0),0)/kinds.length:0
  kinds.forEach(kind=>raw[kind]=clamp((raw[kind]??0)-Math.max(0,average-(raw[kind]??0))*.055))
  const ranked=kinds.map(kind=>({kind,value:raw[kind]??0})).filter(x=>x.value>.025).sort((a,b)=>b.value-a.value)
  const dominant=ranked[0]?.kind,total=ranked.reduce((n,x)=>n+x.value,0)
  const entropy=total>0&&ranked.length>1?-ranked.reduce((n,x)=>{const p=x.value/total;return n+p*Math.log(p)},0)/Math.log(ranked.length):0
  const integration=clamp((ranked.slice(0,4).reduce((n,x)=>n+x.value,0)/Math.max(1,Math.min(4,ranked.length)))*(.65+.35*entropy))
  const quality={external:0,internal:0,temporal:0,social:0,epistemic:0}
  candidates.forEach(c=>{const value=(raw[c.kind]??0)*c.salience;if(c.source==='social')quality.social+=value;else if(c.source==='imagination'||c.source==='memory')quality.temporal+=value;else if(c.source==='epistemic'||c.source==='attention')quality.epistemic+=value;else if(c.source==='interoception'||c.source==='self'||c.source==='value'||c.source==='goal')quality.internal+=value;else quality.external+=value})
  const qMax=Math.max(1,...Object.values(quality));(Object.keys(quality) as (keyof typeof quality)[]).forEach(k=>quality[k]=clamp(quality[k]/qMax))
  return{activations:raw,dominant,dwell:dominant&&dominant===previous.dominant?previous.dwell+1:dominant?1:0,integration,differentiation:clamp(entropy),exclusion:clamp((ranked[0]?.value??0)-(ranked[1]?.value??0)),quality}
}

export function applyPhenomenalBinding(candidates:ConsciousCandidate[],field:PhenomenalField):ConsciousCandidate[]{
  return candidates.map(c=>c.kind===field.dominant?{...c,salience:clamp(c.salience+(field.activations[c.kind]??0)*.22),persistence:clamp(c.persistence+field.integration*.1)}:{...c})
}

export function applyAttentionTarget(candidates:ConsciousCandidate[],target:ContentKind|undefined,effort=.25):ConsciousCandidate[]{
  const gain=.11+clamp(effort)*.38
  return candidates.map(c=>c.kind===target?{...c,salience:clamp(c.salience+gain),persistence:clamp(c.persistence+.05+effort*.08)}:{...c})
}

export function predictConsciousAccess(candidates:ConsciousCandidate[]):ContentKind|undefined{
  const scored=candidates.map(c=>({kind:c.kind,score:c.salience*.55+c.selfRelevance*.25+c.persistence*.12})).sort((a,b)=>b.score-a.score)
  return scored[0]?.score>.38?scored[0].kind:undefined
}

export function updateAttentionSchema(schema:AttentionSchema,predicted:ContentKind|undefined,target:ContentKind|undefined,frame:WorkspaceFrame):AttentionSchema{
  const next=structuredClone(schema),actual=frame.foreground?.kind,error=predicted===actual?0:1,targetHit=target!==undefined&&target===actual
  next.samples++;next.predictedNext=predicted;next.attentionTarget=target
  next.accessPredictionError=clamp(next.accessPredictionError*.9+error*.1)
  next.accessConfidence=clamp((1-Math.exp(-next.samples/24))*(1-next.accessPredictionError))
  next.controlEfficacy=clamp(next.controlEfficacy*.94+(targetHit?1:0)*.06)
  next.effort??=.25;next.cumulativeCost??=0
  if(target)next.effort=clamp(next.effort+(targetHit?-.012:.035)*(1-next.controlEfficacy*.5));else next.effort=clamp(next.effort-.006)
  next.cumulativeCost+=target?next.effort*.0015:0
  next.bottleneck=clamp(next.bottleneck*.9+(frame.unconscious.length/(frame.unconscious.length+frame.background.length+(actual?1:0)||1))*.1)
  if(predicted){const old=next.reliability[predicted]??.3;next.reliability[predicted]=clamp(old*.94+(error?0:1)*.06)}
  next.history.push({tick:frame.tick,predicted,actual,error,target});next.history=next.history.slice(-80)
  return next
}

export function broadcast(life:Life,candidates:ConsciousCandidate[]):WorkspaceFrame{
  const previous=life.consciousness.workspace.foreground
  const eligible=candidates.filter(c=>!(life.consciousness.dangerBroadcastBlocked&&c.kind==='danger'))
  const scored=eligible.map(c=>({c,score:c.salience*.55+c.selfRelevance*.25+c.persistence*.12+(previous?.id===c.id ? .08 : 0)})).sort((a,b)=>b.score-a.score)
  const winner=scored[0]?.c,second=scored[1]?.score??0,top=scored[0]?.score??0
  const ignition=winner&&top>.38?clamp((top-.38)*2.2+(top-second)*.8):0
  const foreground=ignition>.08?winner:previous&&previous.persistence>.35?{...previous,persistence:previous.persistence*.82}:undefined
  const background=scored.filter(x=>x.c.id!==foreground?.id).slice(0,2).map(x=>x.c)
  const visible=new Set([foreground?.id,...background.map(x=>x.id)])
  const frame:WorkspaceFrame={tick:life.tick,foreground,background,unconscious:candidates.filter(c=>!visible.has(c.id)),ignition,continuity:foreground&&previous?.id===foreground.id?clamp(life.consciousness.workspace.continuity+.08):foreground?.persistence??0}
  return frame
}

export function updateMeta(previous:MetaState,frame:WorkspaceFrame,actualError:number):MetaState{
  const f=frame.foreground
  const confidence=clamp((f?1-f.uncertainty:.12)*.65+frame.ignition*.35)
  const sourceEstimate=!f?'unknown':f.source==='imagination'?'imagined':f.source==='memory'||f.source==='symbol'?'memory':f.source==='interoception'||f.source==='self'||f.source==='value'||f.source==='goal'||f.source==='epistemic'?'internal':'external'
  const ownedBySelf=clamp(previous.ownedBySelf*.9+(f?.selfRelevance??.2)*.1)
  const calibration=clamp(previous.calibration*.96+(1-Math.abs(confidence-(1-actualError)))*.04)
  return{confidence,sourceEstimate,ownedBySelf,calibration,lastError:actualError}
}

export function consciousBias(frame:WorkspaceFrame):Partial<Record<Action,number>>{
  const kind=frame.foreground?.kind
  if(kind==='danger')return{avoid:.38,inspect:.08}
  if(kind==='resource'||kind==='body-low')return{resource:.28,rest:.16}
  if(kind==='signal')return{explore:.32}
  if(kind==='conflict'||kind==='self-state')return{inspect:.3}
  if(kind==='stability')return{rest:.22}
  if(kind==='symbol'||kind==='memory')return{inspect:.12,explore:.08}
  if(kind==='anticipated-future')return{inspect:.06}
  if(kind==='goal-pressure')return{inspect:.1}
  if(kind==='open-question')return{inspect:.08}
  if(kind==='autobiographical-self')return{inspect:.24}
  if(kind==='future-self-judgment')return{inspect:.18}
  if(kind==='other-mind')return{inspect:.12,explore:.1}
  if(kind==='perspective-gap')return{inspect:.32,explore:.12}
  if(kind==='access-surprise')return{inspect:.36}
  if(kind==='dream-replay')return{inspect:.18,rest:.1}
  if(kind==='felt-valence')return{inspect:.22,rest:.08}
  if(kind==='introspective-symbol')return{inspect:.26}
  if(kind==='boundary-surprise')return{inspect:.3,avoid:.1}
  if(kind==='spatial-disorientation')return{inspect:.28,explore:.12}
  if(kind==='shared-signal')return{inspect:.2,explore:.08}
  if(kind==='autopoietic-crisis')return{resource:.42,rest:.28,inspect:-.08,explore:-.2}
  if(kind==='phenomenal-familiarity')return{inspect:.08}
  if(kind==='substrate-resonance')return{inspect:.06}
  return{}
}

export const contentLabels:Record<ConsciousCandidate['kind'],string>={resource:'资源临近',signal:'未知显现',danger:'扰动临近',stability:'稳定区域', 'body-low':'内部匮乏','body-high':'内部平衡',memory:'记忆回返','self-state':'自身状态','conflict':'行动冲突',symbol:'符号复现','anticipated-future':'预演未来','goal-pressure':'目标压力','open-question':'未决问题','autobiographical-self':'自传中的我','future-self-judgment':'未来自我评判','other-mind':'不可见的他者内部','perspective-gap':'我所见 ≠ 他者所信','access-surprise':'意识访问偏离预期','dream-replay':'内生梦境回放','felt-valence':'体验对我有何意味','introspective-symbol':'私有体验字形','boundary-surprise':'这不像是我造成的','spatial-disorientation':'我不确定自己身在何处','shared-signal':'我的表达改变了他者','autopoietic-crisis':'维持我的边界正在失稳','phenomenal-familiarity':'这种体验对我而言似曾相识','substrate-resonance':'高维主体基质正在回返'}
