import type { Life, Snapshot } from './types'
import { settleOffline } from './simulation'
import { initialConsciousness } from './consciousness'

export const STORAGE_KEY='electronic-life.snapshot.v1'
export class SnapshotError extends Error { constructor(message:string, public readonly raw:string){super(message)} }

export function saveLife(life: Life, storage: Storage=localStorage) {
  const now=Date.now(), snapshot:Snapshot={version:22,savedAt:now,life:{...life,lastSavedAt:now}}
  storage.setItem(STORAGE_KEY,JSON.stringify(snapshot)); return snapshot.life
}
export function loadLife(storage: Storage=localStorage):Life|null {
  const raw=storage.getItem(STORAGE_KEY); if(!raw)return null
  try {
    const data=JSON.parse(raw) as Snapshot
    if(![1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].includes(data.version)||!data.life?.id||typeof data.savedAt!=='number') throw new Error('存档版本不兼容')
    hydrateConsciousness(data.life)
    return settleOffline(data.life,Date.now()-data.savedAt)
  } catch(error) { throw new SnapshotError(error instanceof Error?error.message:'存档损坏',raw) }
}
export function exportSnapshot(life:Life){return JSON.stringify({version:22,savedAt:Date.now(),life} satisfies Snapshot,null,2)}
export function importSnapshot(raw:string):Life {
  const data=JSON.parse(raw) as Snapshot
  if(![1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].includes(data.version)||!data.life?.id||!data.life.state||!data.life.environment) throw new Error('不是有效的生命存档')
  hydrateConsciousness(data.life)
  return data.life
}
function hydrateConsciousness(life:Life){
  life.environment.other??={id:'OTHER-01',x:22,y:28,heading:0,observableAction:'idle',hidden:{energy:.64,uncertainty:.55,preference:.5,glyphModels:{},lastPulseTick:-1,lastObservedMainTick:-1,lastEchoTick:-1}}
  life.environment.other.hidden.glyphModels??={}
  life.environment.other.hidden.lastPulseTick??=-1
  life.environment.other.hidden.lastObservedMainTick??=-1
  life.environment.other.hidden.lastEchoTick??=-1
  Object.values(life.environment.other.hidden.glyphModels).forEach(m=>{m.contradictions??=0;m.confirmations??=0})
  if(life.environment.socialPulse&&!life.environment.socialPulse.phase)life.environment.socialPulse.phase='statement'
  if(!life.consciousness)life.consciousness=initialConsciousness({energy:life.state.energy,integrity:life.state.integrity,arousal:life.state.arousal,uncertainty:life.state.uncertainty})
  const defaults=initialConsciousness()
  life.consciousness.imagination??=[]
  life.consciousness.temporalField??={continuity:0,temporalDepth:0}
  life.consciousness.causalModels??=defaults.causalModels
  if(!life.consciousness.architectureVersion||life.consciousness.architectureVersion<3){
    life.consciousness.preferredSetpoints=defaults.preferredSetpoints
    life.consciousness.goals=[]
    life.consciousness.architectureVersion=21
  }else{
    life.consciousness.preferredSetpoints??=defaults.preferredSetpoints
    life.consciousness.goals??=[]
  }
  life.consciousness.epistemic??={history:[]}
  life.consciousness.narrative??=defaults.narrative
  life.consciousness.recursiveSelf??=defaults.recursiveSelf
  life.consciousness.social??=defaults.social
  life.consciousness.social.attributedResources??=[]
  life.consciousness.social.jointAttention??=0
  life.consciousness.social.beliefDivergence??=0
  life.consciousness.social.falseBeliefActive??=false
  life.consciousness.attentionSchema??=defaults.attentionSchema
  life.consciousness.attentionSchema.effort??=.25
  life.consciousness.attentionSchema.cumulativeCost??=0
  life.consciousness.phenomenalField??=defaults.phenomenalField
  life.consciousness.dream??=defaults.dream
  life.consciousness.affect??=defaults.affect
  life.consciousness.introspection??=defaults.introspection
  life.consciousness.introspection.clusters.forEach(c=>{c.forecast??=[...c.centroid];c.forecastSamples??=0;c.forecastError??=.5;c.predictiveConfidence??=0})
  life.consciousness.efference??=defaults.efference
  life.consciousness.spatial??={...defaults.spatial,x:life.position.x,y:life.position.y,heading:life.heading}
  life.consciousness.communication??=defaults.communication
  life.consciousness.communication.mutualGrounding??=0
  Object.values(life.consciousness.communication.associations).forEach(a=>{a.expectedAction??='inspect';a.misunderstandings??=0;a.repairs??=0;a.confirmations??=0;a.conventionStability??=0;a.suppressedUntil??=0})
  if(life.consciousness.communication.pending&&!life.consciousness.communication.pending.expectedAction){life.consciousness.communication.pending.expectedAction='inspect';life.consciousness.communication.pending.phase='statement'}
  life.consciousness.organismic??=defaults.organismic
  life.consciousness.manifold??=defaults.manifold
  life.consciousness.architectureVersion=21
}
