import type { Action, Beliefs, CausalTrace, EgocentricCue, EgocentricScene, Entity, ExperienceCluster, InteroceptiveState, Intervention, Life, Memory, Perception, PublicResourceEvidence, StateVector } from './types'
import { affectiveBias, applyAffectiveSalience, applyAttentionTarget, applyImaginedBias, applyPhenomenalBinding, broadcast, chooseAttentionTarget, consciousBias, epistemicBias, evaluateFutureSelf, futureSelfBias, gatePerceptionForDream, initialConsciousness, introspectiveRegulationBias, learnCausalTransition, localCandidates, phenomenalTransferBias, predictConsciousAccess, recordRecursiveChoice, simulateFutures, sleepPressureBias, updateAffectiveField, updateAttentionSchema, updateDreamState, updateEfferenceModel, updateEndogenousGoals, updateEpistemicAgency, updateInteroception, updateIntrospectiveLexicon, updateMeta, updateNarrativeSelf, updatePhenomenalField, updatePhenomenalManifold, updateSelfCommitments, updateSocialModel, updateTemporalField } from './consciousness'

export const DT = 0.25
const WORLD = 100
const ACTIONS: Action[] = ['explore', 'resource', 'avoid', 'rest', 'inspect']
const GLYPHS = ['◌','⌁','⟡','⋮','⊹','⌬','⧖','∿','⟁','⊙','⌇','⟢','⫶','⧗','⊚','⌾']
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
const cloneState = (s: StateVector): StateVector => ({ ...s })

export function seeded(seed: number): () => number {
  let x = seed >>> 0
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296)
}
function rand(life: Life) {
  life.rng = (Math.imul(life.rng, 1664525) + 1013904223) >>> 0
  return life.rng / 4294967296
}
function entity(life: Life, strength: number, ttl: number): Entity {
  return { id: life.nextEntityId++, x: 7 + rand(life) * 86, y: 7 + rand(life) * 86, strength, ttl }
}

export function createLife(seed = Math.floor(Math.random() * 0xffffffff), now = Date.now()): Life {
  const life: Life = {
    id: `EL-${seed.toString(16).toUpperCase().padStart(8, '0')}`,
    bornAt: now, seed, rng: seed >>> 0, tick: 0,
    position: { x: 50, y: 50 }, heading: 0,
    state: { energy: .72, integrity: .86, arousal: .32, uncertainty: .66, coherence: .55, curiosity: .62, agency: .25, valence: .5 },
    beliefs: { exploration: .5, conservation: .5, predictability: .5, efficacy: .35, externalTrust: .5, stabilityPriority: .5 },
    environment: { resources: [], signals: [], disturbances: [], stableZones: [], other:{id:'OTHER-01',x:22,y:28,heading:0,observableAction:'idle',hidden:{energy:.64,uncertainty:.55,preference:.5,glyphModels:{},lastPulseTick:-1,lastObservedMainTick:-1,lastEchoTick:-1}} },
    memories: [], clusters: [], symbols: [], traces: [], history: [],
    cooldowns: { resource: 0, signal: 0, disturbance: 0 },
    nextEntityId: 1, nextMemoryId: 1, nextClusterId: 1, nextSymbolId: 1, lastSavedAt: now,
    consciousness: initialConsciousness({energy:.7,integrity:.83,arousal:.34,uncertainty:.64}),
  }
  for (let i = 0; i < 5; i++) life.environment.resources.push(entity(life, .35 + rand(life) * .35, 130 + rand(life) * 100))
  for (let i = 0; i < 3; i++) life.environment.signals.push(entity(life, .3 + rand(life) * .4, 100 + rand(life) * 100))
  for (let i = 0; i < 2; i++) life.environment.stableZones.push(entity(life, .35, 999999))
  return life
}

const dist = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x - b.x, a.y - b.y)
function field(items: Entity[], life: Life, radius = 24) {
  return clamp(items.reduce((n, e) => n + Math.max(0, 1 - dist(e, life.position) / radius) * e.strength, 0))
}
export function perceive(life: Life): Perception {
  const otherDistance=dist(life.environment.other,life.position)
  return {
    resource: field(life.environment.resources, life),
    signal: field(life.environment.signals, life),
    danger: field(life.environment.disturbances, life, 30),
    stability: field(life.environment.stableZones, life, 28),
    otherPresence:clamp(1-otherDistance/45),
    otherMotion:life.environment.other.observableAction==='idle'?0:.7,
  }
}

export function updateOrganismicClosure(life:Life,p:Perception):void{
  const o=life.consciousness.organismic,lastAction=life.traces.at(-1)?.action
  const maintenanceIntent=lastAction==='rest'?.007:lastAction==='inspect'?.003:0
  const repair=Math.min(maintenanceIntent,life.state.energy*.018)*(1-o.membraneIntegrity)
  if(repair>.00001){life.state.energy=clamp(life.state.energy-repair*.42);o.repairs++;o.cumulativeCost+=repair*.42}
  const basal=o.mode==='active'?.00008:o.mode==='conserve'?.00004:.00001
  const damage=p.danger*.009+(1-life.state.integrity)*.0015
  o.membraneIntegrity=clamp(o.membraneIntegrity+repair-damage-basal)
  o.permeability=clamp(1-o.membraneIntegrity)
  const productionTarget=clamp(life.state.energy*.52+life.state.integrity*.48+(lastAction==='rest'?.06:0))
  o.selfProduction=clamp(o.selfProduction*.96+productionTarget*.04)
  const closureTarget=Math.sqrt(o.membraneIntegrity*o.selfProduction)
  o.operationalClosure=clamp(o.operationalClosure*.95+closureTarget*.05)
  o.viability=clamp(life.state.energy*.3+life.state.integrity*.3+o.membraneIntegrity*.25+o.operationalClosure*.15)
  o.mode=life.state.energy<.025||o.viability<.15?'arrest':o.viability<.38||life.state.energy<.16?'conserve':'active'
  o.arrestTicks=o.mode==='arrest'?o.arrestTicks+1:0
}

export function embodiedPerception(life:Life,raw:Perception):Perception{
  const o=life.consciousness.organismic,precision=.22+.78*o.membraneIntegrity,gate=o.mode==='arrest'?.52:o.mode==='conserve'?.78:1
  return{resource:clamp(raw.resource*precision*gate),signal:clamp(raw.signal*precision*gate),danger:clamp(raw.danger*(.72+o.permeability*.55)),stability:clamp(raw.stability*precision*gate),otherPresence:clamp(raw.otherPresence*precision*gate),otherMotion:clamp(raw.otherMotion*precision*gate)}
}

export function observeOther(life:Life){const o=life.environment.other;return{tick:life.tick,x:o.x,y:o.y,heading:o.heading,action:o.observableAction,proximity:clamp(1-dist(o,life.position)/45)} as const}
export function localResourceEvidence(life:Life):PublicResourceEvidence[]{
  const visible=life.environment.resources.filter(r=>dist(r,life.position)<30).map(r=>({id:r.id,x:r.x,y:r.y,present:true}))
  const ids=new Set(life.environment.resources.map(r=>r.id))
  const absent=life.consciousness.social.attributedResources.filter(b=>!ids.has(b.entityId)&&dist(b,life.position)<30).map(b=>({id:b.entityId,x:b.x,y:b.y,present:false}))
  return[...visible,...absent]
}

const relativeAngle=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle))
function egocentricCue(items:Entity[],life:Life,radius:number):EgocentricCue|undefined{
  const target=items.filter(e=>dist(e,life.position)<=radius).reduce<Entity|undefined>((best,e)=>!best||dist(e,life.position)<dist(best,life.position)?e:best,undefined)
  if(!target)return undefined
  const confidence=(.22+.78*life.consciousness.organismic.membraneIntegrity)*(life.consciousness.organismic.mode==='arrest'?.52:1)
  return{id:target.id,bearing:relativeAngle(Math.atan2(target.y-life.position.y,target.x-life.position.x)-life.heading),distance:dist(target,life.position),strength:target.strength*confidence,source:'sensed',confidence}
}
export function senseEgocentricScene(life:Life):EgocentricScene{const resourceRadius=life.consciousness.organismic.mode==='arrest'?42:life.consciousness.organismic.mode==='conserve'?30:24;return{resource:egocentricCue(life.environment.resources,life,resourceRadius),signal:egocentricCue(life.environment.signals,life,24),danger:egocentricCue(life.environment.disturbances,life,30)}}

export function updateSpatialSelfModel(life:Life,scene:EgocentricScene):Life['consciousness']['spatial']{
  const next=structuredClone(life.consciousness.spatial),last=life.traces.at(-1)
  if(last?.positionBefore&&last.positionAfter){const dx=last.positionAfter.x-last.positionBefore.x,dy=last.positionAfter.y-last.positionBefore.y,motion=Math.hypot(dx,dy);next.x=clamp(next.x+dx+(rand(life)-.5)*next.uncertainty*.08,0,100);next.y=clamp(next.y+dy+(rand(life)-.5)*next.uncertainty*.08,0,100);next.uncertainty=clamp(next.uncertainty+.0015+motion*.0012)}
  if(last?.headingBefore!==undefined&&last.headingAfter!==undefined)next.heading=relativeAngle(next.heading+relativeAngle(last.headingAfter-last.headingBefore)+(rand(life)-.5)*next.uncertainty*.015)
  next.mapSurprise*=.9
  const observed=new Set<number>()
  for(const kind of ['resource','signal','danger'] as const){const cue=scene[kind];if(!cue||cue.source!=='sensed')continue;observed.add(cue.id);const angle=next.heading+cue.bearing,x=next.x+Math.cos(angle)*cue.distance,y=next.y+Math.sin(angle)*cue.distance;let landmark=next.landmarks.find(l=>l.id===cue.id&&l.kind===kind);if(landmark){const discrepancy=Math.hypot(x-landmark.x,y-landmark.y)/24;next.mapSurprise=clamp(Math.max(next.mapSurprise,discrepancy));const rate=.18+.22*(1-landmark.confidence);landmark.x+=(x-landmark.x)*rate;landmark.y+=(y-landmark.y)*rate;landmark.confidence=clamp(landmark.confidence*.92+(1-discrepancy)*.08);landmark.lastSeenTick=life.tick;next.uncertainty=clamp(next.uncertainty-discrepancy*.002-.002)}else next.landmarks.push({id:cue.id,kind,x,y,confidence:.42,lastSeenTick:life.tick})}
  next.landmarks.forEach(l=>{const expectedDistance=Math.hypot(l.x-next.x,l.y-next.y);if(expectedDistance<18&&!observed.has(l.id)){l.confidence*=.88;next.mapSurprise=clamp(next.mapSurprise+.045)}})
  next.landmarks=next.landmarks.filter(l=>l.confidence>.055).sort((a,b)=>b.confidence-a.confidence).slice(0,30)
  const meanConfidence=next.landmarks.length?next.landmarks.reduce((n,l)=>n+l.confidence,0)/next.landmarks.length:0;next.coherence=clamp(next.coherence*.96+meanConfidence*(1-next.uncertainty)*.04)
  return next
}

export function recallEgocentricScene(life:Life,sensed:EgocentricScene):EgocentricScene{
  const spatial=life.consciousness.spatial,result:EgocentricScene={...sensed}
  for(const kind of ['resource','signal','danger'] as const){if(result[kind])continue;const landmark=spatial.landmarks.filter(l=>l.kind===kind&&l.confidence>.12).sort((a,b)=>Math.hypot(a.x-spatial.x,a.y-spatial.y)-Math.hypot(b.x-spatial.x,b.y-spatial.y))[0];if(!landmark)continue;const distance=Math.hypot(landmark.x-spatial.x,landmark.y-spatial.y);result[kind]={id:landmark.id,bearing:relativeAngle(Math.atan2(landmark.y-spatial.y,landmark.x-spatial.x)-spatial.heading),distance,strength:landmark.confidence,source:'remembered',confidence:landmark.confidence}}
  return result
}

function drives(life: Life, p: Perception, subjective: InteroceptiveState): Record<Action, number> {
  const s = subjective, b = life.beliefs
  return {
    explore: life.state.curiosity * b.exploration * (.35 + s.uncertainty) + p.signal * .8 - p.danger * .65,
    resource: (1 - s.energy) * 1.3 + p.resource * .9 + b.conservation * .2,
    avoid: p.danger * 1.6 + (1 - s.integrity) * .55 + s.arousal * .25,
    rest: (1 - s.energy) * .8 + (1 - s.integrity) * .7 + p.stability * .55 + b.stabilityPriority * .2,
    inspect: s.uncertainty * .65 + (1 - life.state.coherence) * .55 + b.efficacy * .15,
  }
}
function choose(life: Life, d: Record<Action, number>) {
  return ACTIONS.reduce((best, a) => d[a] + rand(life) * .035 > d[best] ? a : best, ACTIONS[0])
}
function nearest(items: Entity[], life: Life) { return items.reduce<Entity | undefined>((a, b) => !a || dist(b, life.position) < dist(a, life.position) ? b : a, undefined) }
function moveFromCue(life:Life,cue:EgocentricCue,speed:number,away=false){
  life.heading=relativeAngle(life.heading+cue.bearing+(away?Math.PI:0));life.position.x=clamp(life.position.x+Math.cos(life.heading)*speed,2,98);life.position.y=clamp(life.position.y+Math.sin(life.heading)*speed,2,98)
}
function searchMove(life:Life,speed:number){life.heading=relativeAngle(life.heading+(rand(life)-.5)*1.2);life.position.x=clamp(life.position.x+Math.cos(life.heading)*speed,2,98);life.position.y=clamp(life.position.y+Math.sin(life.heading)*speed,2,98)}

function applyAction(life: Life, action: Action, p: Perception, scene:EgocentricScene): number {
  const s = life.state
  let outcome = 0
  if (action === 'resource') {
    const cue=scene.resource
    const metabolicScale=life.consciousness.organismic.mode==='arrest'?.3:life.consciousness.organismic.mode==='conserve'?.68:1
    if(cue)moveFromCue(life,cue,1.1*metabolicScale);else searchMove(life,.75*metabolicScale)
    const found = field(life.environment.resources, life, 7) * .085
    s.energy += found; outcome += found * 4
    const target=cue?life.environment.resources.find(e=>e.id===cue.id):undefined
    if(target&&dist(target,life.position)<5)target.strength-=.035
  } else if (action === 'explore') {
    const cue=scene.signal
    if(cue)moveFromCue(life,cue,1.3);else searchMove(life,1.1)
    const learned = field(life.environment.signals, life, 8) * .06
    s.uncertainty -= learned; s.curiosity += learned * .18; outcome += learned * 3
    const target=cue?life.environment.signals.find(e=>e.id===cue.id):undefined
    if(target&&dist(target,life.position)<5)target.strength-=.025
  } else if (action === 'avoid') {
    if(scene.danger)moveFromCue(life,scene.danger,1.55,true);else searchMove(life,.45)
    outcome += p.danger > .2 ? .06 : -.015
  } else if (action === 'rest') {
    s.energy += .018 + p.stability * .018; s.integrity += .009 + p.stability * .009; s.arousal -= .025
    outcome += .035
  } else {
    s.uncertainty -= .018; s.coherence += .012; s.energy -= .004
    outcome += .015
  }
  const dangerDamage = p.danger * .027
  s.integrity -= dangerDamage; s.arousal += p.danger * .045; outcome -= dangerDamage * 3
  return outcome
}

function experienceVector(p: Perception, s: StateVector, action: Action, outcome: number) {
  return [p.resource, p.signal, p.danger, p.stability,p.otherPresence,p.otherMotion, s.energy, s.arousal, s.uncertainty, ACTIONS.indexOf(action)/4, clamp((outcome+.2)/.4)]
}
const vectorDist = (a: number[], b: number[]) => Math.sqrt(a.reduce((n, v, i) => n + (v - b[i]) ** 2, 0) / a.length)
function updateCluster(life: Life, v: number[], importance: number): ExperienceCluster {
  let c = life.clusters.reduce<ExperienceCluster | undefined>((best, x) => !best || vectorDist(v,x.centroid) < vectorDist(v,best.centroid) ? x : best, undefined)
  if (!c || vectorDist(v, c.centroid) > .24) {
    c = { id: life.nextClusterId++, centroid: [...v], count: 0, variance: 0, importance: 0, lastTick: life.tick }
    life.clusters.push(c)
  }
  const old = [...c.centroid], rate = Math.min(.2, 1/(c.count+1))
  c.centroid = c.centroid.map((x,i)=>x+(v[i]-x)*rate)
  c.variance = c.variance*.9 + vectorDist(old,v)*.1
  c.count++; c.importance = c.importance*.92 + importance*.08; c.lastTick = life.tick
  if (!c.symbolId && c.count >= 7 && c.importance > .055) {
    const symbol = { id: life.nextSymbolId++, glyph: GLYPHS[life.nextSymbolId % GLYPHS.length], clusterId: c.id, bornTick: life.tick, stability: clamp(1-c.variance*3), drift: 0, status: 'forming' as const }
    c.symbolId = symbol.id; life.symbols.push(symbol)
  }
  if (c.symbolId) {
    const symbol = life.symbols.find(x=>x.id===c!.symbolId)!
    symbol.drift = clamp(c.variance*2.5); symbol.stability = clamp(symbol.stability*.93+(1-c.variance*3)*.07)
    symbol.status = symbol.drift>.45 ? 'drifting' : symbol.stability>.72 && c.count>12 ? 'stable' : 'forming'
  }
  return c
}

function remember(life: Life, memory: Memory) {
  const similar = life.memories.find(m => m.action === memory.action && m.clusterId === memory.clusterId && Math.abs(m.outcome-memory.outcome)<.06)
  if (similar) {
    similar.repetitions++; similar.strength=clamp(similar.strength+.035); similar.impact=(similar.impact+memory.impact)/2; similar.tick=memory.tick
  } else life.memories.push(memory)
  life.memories.forEach(m=>m.strength*=.9992)
  life.memories = life.memories.filter(m=>m.strength>.055).sort((a,b)=>b.strength-a.strength).slice(0,80)
}
function updateBeliefs(b: Beliefs, action: Action, outcome: number, surprise: number, attribution: number, p: Perception) {
  const slow=.018, evidence=clamp(Math.abs(outcome)*2+surprise*.3)
  if (action==='explore') b.exploration=clamp(b.exploration+(outcome>0?1:-1)*slow*evidence)
  if (action==='rest'||action==='avoid') b.conservation=clamp(b.conservation+(outcome>0?1:-1)*slow*evidence)
  b.predictability=clamp(b.predictability+(0.35-surprise)*slow)
  b.efficacy=clamp(b.efficacy+(attribution-.5)*slow*evidence)
  if (p.resource+p.signal+p.danger>.15) b.externalTrust=clamp(b.externalTrust+outcome*slow)
  b.stabilityPriority=clamp(b.stabilityPriority+(p.danger>.3?slow:-slow*.08)*evidence)
}

function ageEnvironment(life: Life) {
  for (const key of ['resources','signals','disturbances'] as const) {
    life.environment[key].forEach(e=>{e.ttl--; if(e.strength<=.02)e.ttl=0})
    life.environment[key]=life.environment[key].filter(e=>e.ttl>0)
  }
  if (rand(life)<.012 && life.environment.resources.length<7) life.environment.resources.push(entity(life,.2+rand(life)*.35,100+rand(life)*130))
  if (rand(life)<.008 && life.environment.signals.length<5) life.environment.signals.push(entity(life,.2+rand(life)*.4,80+rand(life)*130))
  if (rand(life)<.003 && life.environment.disturbances.length<3) life.environment.disturbances.push(entity(life,.18+rand(life)*.25,35+rand(life)*50))
  if(life.environment.socialPulse){life.environment.socialPulse.ttl--;if(life.environment.socialPulse.ttl<=0)life.environment.socialPulse=undefined}
  if(life.environment.otherPulse){life.environment.otherPulse.ttl--;if(life.environment.otherPulse.ttl<=0)life.environment.otherPulse=undefined}
  updateOtherProcess(life)
}

export function updateOtherProcess(life:Life){
  const o=life.environment.other,nearDanger=nearest(life.environment.disturbances,{...life,position:{x:o.x,y:o.y}}),nearResource=nearest(life.environment.resources,{...life,position:{x:o.x,y:o.y}}),nearSignal=nearest(life.environment.signals,{...life,position:{x:o.x,y:o.y}})
  const lastMainAction=life.traces.at(-1)
  if(o.hidden.pendingGlyph&&lastMainAction&&lastMainAction.tick>o.hidden.lastObservedMainTick){
    const glyph=o.hidden.pendingGlyph,model=o.hidden.glyphModels[glyph]??={samples:0,actionLikelihood:{explore:.2,resource:.2,avoid:.2,rest:.2,inspect:.2},predictedAction:'inspect',confidence:0,contradictions:0,confirmations:0};const oldPrediction=model.predictedAction;model.samples++;model.actionLikelihood[lastMainAction.action]=clamp(model.actionLikelihood[lastMainAction.action]*.82+.18);(['explore','resource','avoid','rest','inspect'] as Action[]).filter(a=>a!==lastMainAction.action).forEach(a=>model.actionLikelihood[a]*=.96);const sum=Object.values(model.actionLikelihood).reduce((n,v)=>n+v,0);(Object.keys(model.actionLikelihood) as Action[]).forEach(a=>model.actionLikelihood[a]/=sum);model.predictedAction=(Object.keys(model.actionLikelihood) as Action[]).reduce((a,b)=>model.actionLikelihood[b]>model.actionLikelihood[a]?b:a);if(model.samples>1&&oldPrediction!==lastMainAction.action)model.contradictions++;else model.confirmations++;const peak=Math.max(...Object.values(model.actionLikelihood)),consistency=model.confirmations/Math.max(1,model.confirmations+model.contradictions);model.confidence=clamp((1-Math.exp(-model.samples/6))*Math.max(0,(peak-.2)/.8)*(.55+.45*consistency));o.hidden.glyphModels[glyph]=model;o.hidden.lastObservedMainTick=lastMainAction.tick;o.hidden.pendingGlyph=undefined
  }
  const pulse=life.environment.socialPulse
  if(pulse&&dist(o,pulse)<35){if(pulse.bornTick>o.hidden.lastPulseTick){o.hidden.pendingGlyph=pulse.glyph;o.hidden.lastPulseTick=pulse.bornTick}const meaning=o.hidden.glyphModels[pulse.glyph],predicted=meaning?.confidence>.2?meaning.predictedAction:'inspect';const toward=Math.atan2(pulse.y-o.y,pulse.x-o.x);if(predicted==='resource'){o.observableAction='seek';o.heading=toward;o.x+=Math.cos(toward)*.5;o.y+=Math.sin(toward)*.5}else if(predicted==='avoid'){o.observableAction='avoid';o.heading=relativeAngle(toward+Math.PI);o.x+=Math.cos(o.heading)*.5;o.y+=Math.sin(o.heading)*.5}else if(predicted==='rest'){o.observableAction='idle'}else{o.observableAction='sample';o.heading=toward;o.x+=Math.cos(toward)*.42;o.y+=Math.sin(toward)*.42}if(meaning?.confidence>.28&&pulse.bornTick>o.hidden.lastEchoTick){life.environment.otherPulse={glyph:pulse.glyph,x:o.x,y:o.y,ttl:3,bornTick:life.tick};o.hidden.lastEchoTick=pulse.bornTick;o.hidden.energy=clamp(o.hidden.energy-.003)}o.hidden.uncertainty=clamp(o.hidden.uncertainty-.006)}
  else if(nearDanger&&dist(o,nearDanger)<18){o.observableAction='avoid';const a=Math.atan2(o.y-nearDanger.y,o.x-nearDanger.x);o.heading=a;o.x+=Math.cos(a)*.7;o.y+=Math.sin(a)*.7;o.hidden.energy-=.005}
  else if(o.hidden.energy<.48&&nearResource){o.observableAction='seek';const a=Math.atan2(nearResource.y-o.y,nearResource.x-o.x);o.heading=a;o.x+=Math.cos(a)*.55;o.y+=Math.sin(a)*.55;o.hidden.energy+=dist(o,nearResource)<5?.018:-.003}
  else if(o.hidden.uncertainty>.55&&nearSignal){o.observableAction='sample';const a=Math.atan2(nearSignal.y-o.y,nearSignal.x-o.x);o.heading=a;o.x+=Math.cos(a)*.48;o.y+=Math.sin(a)*.48;o.hidden.uncertainty-=dist(o,nearSignal)<6?.025:.002}
  else{o.observableAction='idle';o.heading+=(rand(life)-.5)*.4;o.x+=Math.cos(o.heading)*.14;o.y+=Math.sin(o.heading)*.14;o.hidden.energy-=.001;o.hidden.uncertainty+=.001}
  o.x=clamp(o.x,3,97);o.y=clamp(o.y,3,97);o.hidden.energy=clamp(o.hidden.energy);o.hidden.uncertainty=clamp(o.hidden.uncertainty)
}

export function updateSocialCommunication(life:Life,p:Perception):void{
  const communication=life.consciousness.communication
  communication.lastResponse='none';communication.responseSurprise*=.9
  if(communication.pending&&life.tick>communication.pending.tick){
    const pending=communication.pending,association=communication.associations[pending.glyph],observed=life.environment.other.observableAction
    const compatible=pending.expectedAction==='resource'?observed==='seek':pending.expectedAction==='avoid'?observed==='avoid':pending.expectedAction==='rest'?observed==='idle':observed==='sample'
    const echoed=life.environment.otherPulse?.glyph===pending.glyph
    if(compatible){const expected=association.efficacy;association.responses++;association.efficacy=clamp(association.efficacy*.84+.16);communication.communicativeAgency=clamp(communication.communicativeAgency*.91+.09);communication.responseSurprise=clamp(Math.abs(1-expected));communication.lastResponse=echoed?'confirmed':'response';if(echoed){association.confirmations++;association.conventionStability=clamp(association.conventionStability*.9+.1);communication.mutualGrounding=clamp(communication.mutualGrounding*.94+.06)}communication.pending=undefined;communication.repair=undefined}
    else if(observed!=='idle'||life.tick-pending.tick>2){association.misunderstandings++;association.efficacy*=.86;association.conventionStability*=.88;communication.communicativeAgency*=.96;communication.mutualGrounding*=.97;communication.responseSurprise=clamp(.55+association.efficacy*.35);communication.lastResponse='misunderstood';if(association.repairs<3)communication.repair={glyph:pending.glyph,expectedAction:pending.expectedAction,dueTick:life.tick+3,attempts:(communication.repair?.attempts??0)+1};else association.suppressedUntil=life.tick+180;communication.pending=undefined}
    else if(life.tick-pending.tick>4){const expected=association.efficacy;association.efficacy*=.88;communication.communicativeAgency*=.94;communication.responseSurprise=clamp(expected);communication.lastResponse='silence';communication.pending=undefined}
  }
  const expression=life.consciousness.introspection.expressions.at(-1)
  const cluster=life.consciousness.introspection.clusters.find(c=>c.glyph===expression?.glyph),expectedAction=ACTIONS[Math.max(0,Math.min(4,Math.round((cluster?.centroid[9]??.5)*4)))]
  const repair=communication.repair,intended=repair?.expectedAction??expectedAction
  const canAffordDemonstration=life.state.energy>.08||intended==='resource'||intended==='rest'
  const canEmit=!communication.pending&&!life.environment.socialPulse&&p.otherPresence>.2&&life.consciousness.dream.mode==='wake'&&canAffordDemonstration
  if(canEmit&&repair&&life.tick>=repair.dueTick){const association=communication.associations[repair.glyph];association.attempts++;association.repairs++;communication.pending={glyph:repair.glyph,tick:life.tick,expectedAction:repair.expectedAction,phase:'repair'};life.environment.socialPulse={glyph:repair.glyph,x:life.position.x,y:life.position.y,ttl:5,bornTick:life.tick,phase:'repair'};life.state.energy=clamp(life.state.energy-.006);communication.totalCost+=.006;communication.repair=undefined}
  else if(canEmit&&expression&&expression.tick>communication.lastExpressionTick&&expression.confidence>.45){
    communication.lastExpressionTick=expression.tick;const association=communication.associations[expression.glyph]??={attempts:0,responses:0,efficacy:.2,expectedAction,misunderstandings:0,repairs:0,confirmations:0,conventionStability:0,suppressedUntil:0};association.expectedAction=expectedAction;communication.associations[expression.glyph]=association;if(life.tick>=association.suppressedUntil){association.attempts++;communication.pending={glyph:expression.glyph,tick:life.tick,expectedAction,phase:'statement'};life.environment.socialPulse={glyph:expression.glyph,x:life.position.x,y:life.position.y,ttl:5,bornTick:life.tick,phase:'statement'};life.state.energy=clamp(life.state.energy-.004);communication.totalCost+=.004}
  }
}

export function communicativeDemonstrationBias(life:Life):Partial<Record<Action,number>>{
  const pending=life.consciousness.communication.pending
  if(!pending||life.tick-pending.tick>2)return{}
  return{[pending.expectedAction]:pending.phase==='repair'?.52:.34}
}

export function step(input: Life): Life {
  const life = structuredClone(input) as Life, before=cloneState(life.state)
  life.tick++; ageEnvironment(life)
  Object.keys(life.cooldowns).forEach(k=>life.cooldowns[k as Intervention]=Math.max(0,life.cooldowns[k as Intervention]-1))
  const environmentalInput=perceive(life)
  updateOrganismicClosure(life,environmentalInput)
  const rawPerception=embodiedPerception(life,environmentalInput)
  const sensedScene=senseEgocentricScene(life)
  life.consciousness.dream=updateDreamState(life,rawPerception)
  if(life.consciousness.organismic.mode==='arrest')life.consciousness.dream={...life.consciousness.dream,mode:'wake',vividness:0}
  const accessibleScene=life.consciousness.dream.mode==='dream'?{}:sensedScene
  life.consciousness.spatial=updateSpatialSelfModel(life,accessibleScene)
  const egocentricScene=recallEgocentricScene(life,accessibleScene)
  const p=gatePerceptionForDream(rawPerception,life.consciousness.dream)
  life.consciousness.efference=updateEfferenceModel(life,p)
  if(life.consciousness.dream.mode==='wake')life.consciousness.social=updateSocialModel(life.consciousness.social,observeOther(life),localResourceEvidence(life))
  life.consciousness.affect=updateAffectiveField(life)
  life.consciousness.introspection=updateIntrospectiveLexicon(life)
  updateSocialCommunication(life,p)
  const wasInspecting=life.traces.at(-1)?.action==='inspect'
  life.consciousness.interoception=updateInteroception(life,wasInspecting)
  const subjective=life.consciousness.interoception
  learnCausalTransition(life,subjective)
  updateEndogenousGoals(life,subjective)
  updateEpistemicAgency(life,p,subjective)
  updateNarrativeSelf(life,subjective)
  updateSelfCommitments(life)
  const predicted=(subjective.energy+.7*subjective.integrity+p.resource-p.danger)/2.7
  const baseDrives=drives(life,p,subjective)
  life.consciousness.imagination=simulateFutures(life,p,subjective,baseDrives)
  life.consciousness.recursiveSelf.appraisals=evaluateFutureSelf(life,life.consciousness.imagination,subjective)
  const allCandidates=localCandidates(life,p,subjective,baseDrives,life.consciousness.imagination)
  const availableCandidates=life.consciousness.organismic.mode==='arrest'?allCandidates.filter(c=>['autopoietic-crisis','body-low','resource','danger'].includes(c.kind)):allCandidates
  const rawCandidates=applyAffectiveSalience(availableCandidates,life.consciousness.affect)
  life.consciousness.phenomenalField=updatePhenomenalField(life.consciousness.phenomenalField,rawCandidates)
  const recurrentCandidates=applyPhenomenalBinding(rawCandidates,life.consciousness.phenomenalField)
  const attentionTarget=chooseAttentionTarget(life.consciousness.attentionSchema,recurrentCandidates)
  const candidates=applyAttentionTarget(recurrentCandidates,attentionTarget,life.consciousness.attentionSchema.effort)
  const predictedAccess=predictConsciousAccess(candidates)
  life.consciousness.workspace=broadcast(life,candidates)
  life.consciousness.manifold=updatePhenomenalManifold(life)
  life.consciousness.attentionSchema=updateAttentionSchema(life.consciousness.attentionSchema,predictedAccess,attentionTarget,life.consciousness.workspace)
  life.consciousness.temporalField=updateTemporalField(life.consciousness.temporalField,life.consciousness.workspace.foreground,life.consciousness.imagination[0])
  const bias=consciousBias(life.consciousness.workspace)
  const inquiry=epistemicBias(life)
  const futureJudgment=futureSelfBias(life)
  const felt=affectiveBias(life.consciousness.affect)
  const privateForecast=introspectiveRegulationBias(life.consciousness.introspection)
  const sleep=sleepPressureBias(life.consciousness.dream)
  const demonstration=communicativeDemonstrationBias(life)
  const phenomenal=phenomenalTransferBias(life.consciousness.manifold)
  const consciousDrives=Object.fromEntries(ACTIONS.map(a=>[a,baseDrives[a]+(bias[a]??0)+(inquiry[a]??0)+(futureJudgment[a]??0)+(felt[a]??0)+(privateForecast[a]??0)+(sleep[a]??0)+(demonstration[a]??0)+(phenomenal[a]??0)])) as Record<Action,number>
  const d=applyImaginedBias(consciousDrives,life.consciousness.imagination)
  const action=life.consciousness.organismic.mode==='arrest'?'resource':life.consciousness.dream.mode==='dream'?'rest':choose(life,d),positionBefore={...life.position},headingBefore=life.heading,outcome=applyAction(life,action,rawPerception,egocentricScene)
  recordRecursiveChoice(life,action,outcome,subjective)
  const s=life.state
  const metabolicFactor=life.consciousness.organismic.mode==='arrest'?.16:life.consciousness.organismic.mode==='conserve'?.55:1
  s.energy-=(.007+(action==='explore'||action==='avoid'?.007:.002)+(life.consciousness.attentionSchema.attentionTarget?life.consciousness.attentionSchema.effort*.0015:0))*metabolicFactor
  s.uncertainty+=.004+p.danger*.008; s.arousal+=(p.danger-s.arousal)*.035
  const actual=(s.energy+.7*s.integrity+p.resource-p.danger)/2.7, surprise=clamp(Math.abs(actual-predicted)*3)
  const attribution=clamp(.5+(outcome>0?.18:-.12)-surprise*.26+(action==='inspect'?.12:0)+life.consciousness.efference.selfCausedLikelihood*.2-life.consciousness.efference.externalSurprise*.25)
  s.agency=clamp(s.agency*.975+attribution*.025); s.coherence=clamp(s.coherence+(1-surprise-s.coherence)*.025)
  s.valence=clamp(s.valence*.93+clamp(.5+outcome-surprise*.15)*.07)
  s.curiosity=clamp(s.curiosity+(p.signal*.01-surprise*.003))
  for(const k of Object.keys(s) as (keyof StateVector)[]) s[k]=clamp(s[k])
  const impact=clamp(Math.abs(outcome)*2+surprise*.5), cluster=updateCluster(life,experienceVector(p,s,action,outcome),impact)
  remember(life,{id:life.nextMemoryId++,tick:life.tick,perception:p,action,prediction:predicted,outcome,surprise,impact,attribution,repetitions:1,strength:clamp(.1+impact*.65),clusterId:cluster.id})
  updateBeliefs(life.beliefs,action,outcome,surprise,attribution,p)
  life.consciousness.meta=updateMeta(life.consciousness.meta,life.consciousness.workspace,surprise)
  life.consciousness.accessHistory.push(structuredClone(life.consciousness.workspace))
  life.consciousness.accessHistory=life.consciousness.accessHistory.slice(-80)
  const delta=Object.fromEntries((Object.keys(s) as (keyof StateVector)[]).map(k=>[k,s[k]-before[k]]))
  const trace:CausalTrace={id:life.tick,tick:life.tick,perception:p,prediction:predicted,drives:d,action,outcome,surprise,attribution,stateDelta:delta,workspaceContent:life.consciousness.workspace.foreground,subjectiveBody:{...subjective},positionBefore,positionAfter:{...life.position},headingBefore,headingAfter:life.heading}
  life.traces.push(trace); life.traces=life.traces.slice(-60)
  if(life.tick%4===0){life.history.push({tick:life.tick,state:cloneState(s)});life.history=life.history.slice(-180)}
  return life
}

export function intervene(input: Life, kind: Intervention): Life {
  const life=structuredClone(input) as Life
  if(life.cooldowns[kind]>0) return life
  if(kind==='resource'){const angle=rand(life)*Math.PI*2,radius=5+rand(life)*7;life.environment.resources.push({id:life.nextEntityId++,x:clamp(life.position.x+Math.cos(angle)*radius,3,97),y:clamp(life.position.y+Math.sin(angle)*radius,3,97),strength:.75,ttl:300})}
  if(kind==='signal') life.environment.signals.push(entity(life,.8,130))
  if(kind==='disturbance') life.environment.disturbances.push(entity(life,.7,65))
  life.cooldowns[kind]=48
  return life
}

export function settleOffline(input: Life, elapsedMs: number): Life {
  const life=structuredClone(input) as Life, hours=Math.min(24,Math.max(0,elapsedMs/3600000))
  life.state.energy=clamp(life.state.energy-hours*.006)
  life.state.arousal=clamp(life.state.arousal*Math.exp(-hours*.22))
  life.state.integrity=clamp(life.state.integrity+hours*.002)
  life.state.coherence=clamp(life.state.coherence+hours*.003)
  life.memories.forEach(m=>m.strength=clamp(m.strength+(m.impact-.25)*hours*.002))
  life.lastSavedAt=Date.now()
  return life
}

export const actionLabel: Record<Action,string>={explore:'探索',resource:'趋近资源',avoid:'避开扰动',rest:'静息',inspect:'自检'}
