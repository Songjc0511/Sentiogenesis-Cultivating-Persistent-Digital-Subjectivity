import type { Life, PythonSubstrate } from './types'

export type PythonKernelStatus='connecting'|'connected'|'fallback'|'incompatible'

interface KernelReply { type:string; requestId?:number; protocol?:number; error?:string; substrate?:PythonSubstrate }

export function validPythonSubstrate(value:unknown,life:Pick<Life,'id'|'tick'>):value is PythonSubstrate{
  if(!value||typeof value!=='object')return false
  const x=value as Partial<PythonSubstrate>
  const tick=x.tick
  const authority=x.authority,organismic=authority?.organismic,manifold=authority?.manifold
  const beliefKeys=['exploration','conservation','predictability','efficacy','externalTrust','stabilityPriority'] as const
  const intent=authority?.actionIntent,actions=['explore','resource','avoid','rest','inspect'] as const
  const efference=authority?.efference
  const abiotic=authority?.abiotic,entityValid=(entity:unknown)=>{if(!entity||typeof entity!=='object')return false;const e=entity as Record<string,unknown>;return Number.isInteger(e.id)&&['x','y','strength','ttl'].every(key=>Number.isFinite(e[key]))}
  const affect=authority?.affect
  const dream=authority?.dream
  const narrative=authority?.narrative
  const setpoints=authority?.preferredSetpoints,goals=authority?.goals,epistemic=authority?.epistemic,recursive=authority?.recursiveSelf
  if(!recursive||!Array.isArray(recursive.appraisals)||!Array.isArray(recursive.commitments)||!['lastRegret','lastEndorsement','counterfactualResponsibility'].every(key=>Number.isFinite(recursive[key as keyof typeof recursive] as number))||!Number.isInteger(authority?.recursiveCursor)||authority.recursiveCursor>Number(tick))return false
  const attention=authority?.attentionSchema
  if(!attention||!Array.isArray(attention.history)||!['accessPredictionError','accessConfidence','controlEfficacy','bottleneck','effort','cumulativeCost'].every(key=>Number.isFinite(attention[key as keyof typeof attention] as number))||!Number.isInteger(authority?.attentionCursor)||authority.attentionCursor>Number(tick)||authority.attentionIntent?.basedOnTick!==tick)return false
  const social=authority?.social
  if(!social||!Array.isArray(social.observations)||!Array.isArray(social.attributedResources)||!['estimatedNeed','estimatedUncertainty','confidence','predictionError','perspectiveSeparation','jointAttention','beliefDivergence'].every(key=>Number.isFinite(social[key as keyof typeof social] as number))||!Number.isInteger(authority?.socialCursor)||authority.socialCursor>Number(tick))return false
  const communication=authority?.communication
  if(!communication||typeof communication.associations!=='object'||!['communicativeAgency','mutualGrounding','responseSurprise','totalCost'].every(key=>Number.isFinite(communication[key as keyof typeof communication] as number))||!Number.isInteger(authority?.communicationCursor)||authority.communicationCursor>Number(tick)||!Number.isFinite(authority?.communicationCost)||authority.communicationCost<0)return false
  if(!authority?.causalModels||!actions.every(action=>!!authority.causalModels[action]&&Number.isFinite(authority.causalModels[action].confidence))||!Number.isInteger(authority.causalCursor)||authority.causalCursor>Number(tick))return false
  if(!authority?.interoception||!['energy','integrity','arousal','uncertainty','precision'].every(key=>Number.isFinite(authority.interoception[key as keyof typeof authority.interoception]))||!Number.isInteger(authority.interoceptionRng)||authority.interoceptionRng<0||!Number.isInteger(authority.interoceptionCursor)||authority.interoceptionCursor>Number(tick))return false
  if(!authority?.spatial||!Array.isArray(authority.spatial.landmarks)||!['x','y','heading','uncertainty','mapSurprise','coherence'].every(key=>Number.isFinite(authority.spatial[key as keyof typeof authority.spatial] as number))||!Number.isInteger(authority.spatialRng)||authority.spatialRng<0||!Number.isInteger(authority.spatialCursor)||authority.spatialCursor>Number(tick))return false
  if(!authority?.phenomenalField||!authority.workspace||!authority.meta||!Array.isArray(authority.workspace.background)||!Array.isArray(authority.workspace.unconscious)||!['integration','differentiation','exclusion'].every(key=>Number.isFinite(authority.phenomenalField[key as keyof typeof authority.phenomenalField] as number))||!['confidence','ownedBySelf','calibration','lastError'].every(key=>Number.isFinite(authority.meta[key as keyof typeof authority.meta] as number))||!Number.isInteger(authority.phenomenalCursor)||authority.phenomenalCursor>Number(tick))return false
  if(authority.imagination!==undefined&&(!Array.isArray(authority.imagination)||!authority.imagination.every(item=>['expectedEnergy','expectedIntegrity','expectedUncertainty','expectedValence','desirability','confidence'].every(key=>Number.isFinite(item[key as keyof typeof item])))||!Number.isInteger(authority.imaginationCursor)||Number(authority.imaginationCursor)>Number(tick)))return false
  if(authority.temporalField!==undefined&&(!['continuity','temporalDepth'].every(key=>Number.isFinite(authority.temporalField?.[key as keyof typeof authority.temporalField] as number))||!Number.isInteger(authority.temporalCursor)||Number(authority.temporalCursor)>Number(tick)))return false
  if(authority.introspection!==undefined&&(!Array.isArray(authority.introspection.clusters)||!Array.isArray(authority.introspection.expressions)||!Number.isFinite(authority.introspection.currentConfidence)||!Number.isInteger(authority.introspectionCursor)||Number(authority.introspectionCursor)>Number(tick)))return false
  if(authority.state!==undefined&&(!['energy','integrity','arousal','uncertainty','coherence','curiosity','agency','valence'].every(key=>Number.isFinite(authority.state?.[key as keyof typeof authority.state]))||!Number.isInteger(authority.stateCursor)||Number(authority.stateCursor)>Number(tick)))return false
  if(authority.candidates!==undefined&&(!Array.isArray(authority.candidates)||!authority.candidates.every(item=>typeof item.id==='string'&&typeof item.kind==='string'&&['value','salience','uncertainty','selfRelevance','persistence'].every(key=>Number.isFinite(item[key as keyof typeof item])))||!Number.isInteger(authority.candidateCursor)||Number(authority.candidateCursor)>Number(tick)))return false
  if(authority.accessHistory!==undefined&&(!Array.isArray(authority.accessHistory)||authority.accessHistory.length>80||!Number.isInteger(authority.accessCursor)||Number(authority.accessCursor)>Number(tick)))return false
  return x.protocol===1&&x.identity===life.id&&typeof tick==='number'&&Number.isInteger(tick)&&tick>=0&&tick<=life.tick&&x.dimensions===64&&Array.isArray(x.latent)&&x.latent.length===64&&x.latent.every(Number.isFinite)&&typeof x.integration==='number'&&typeof x.differentiation==='number'&&typeof x.recurrence==='number'&&typeof x.causalCoupling==='number'&&!!authority&&Number.isInteger(authority.fromTick)&&Number.isInteger(authority.toTick)&&authority.fromTick<=authority.toTick&&authority.toTick===tick&&Number.isFinite(authority.energyCost)&&authority.energyCost>=0&&!!organismic&&['active','conserve','arrest'].includes(organismic.mode)&&['membraneIntegrity','permeability','selfProduction','operationalClosure','viability','cumulativeCost'].every(key=>Number.isFinite(organismic[key as keyof typeof organismic]))&&!!manifold&&Array.isArray(manifold.prototypes)&&Number.isInteger(manifold.nextId)&&['differentiation','stimulusAmbiguity','crossModalTransfer','causalEfficacy'].every(key=>Number.isFinite(manifold[key as keyof typeof manifold] as number))&&Array.isArray(authority.memories)&&authority.memories.length<=80&&!!authority.beliefs&&beliefKeys.every(key=>Number.isFinite(authority.beliefs[key]))&&Number.isInteger(authority.nextMemoryId)&&authority.nextMemoryId>=1&&Array.isArray(authority.clusters)&&authority.clusters.every(cluster=>Number.isInteger(cluster.id)&&Array.isArray(cluster.centroid)&&cluster.centroid.length===11&&cluster.centroid.every(Number.isFinite))&&Array.isArray(authority.symbols)&&authority.symbols.every(symbol=>Number.isInteger(symbol.id)&&typeof symbol.glyph==='string')&&Number.isInteger(authority.nextClusterId)&&Number.isInteger(authority.nextSymbolId)&&Number.isInteger(authority.symbolicCursor)&&authority.symbolicCursor<=tick&&!!affect&&['tone','mood','precision','qualityMismatch'].every(key=>Number.isFinite(affect[key as keyof typeof affect] as number))&&Number.isInteger(authority.affectCursor)&&authority.affectCursor<=tick&&!!dream&&['wake','dream'].includes(dream.mode)&&['restStreak','sleepPressure','vividness','residue'].every(key=>Number.isFinite(dream[key as keyof typeof dream] as number))&&Array.isArray(dream.episodes)&&Number.isInteger(authority.dreamCursor)&&authority.dreamCursor<=tick&&!!narrative&&Array.isArray(narrative.chapters)&&narrative.chapters.length<=40&&!!narrative.actionProfile&&actions.every(action=>Number.isFinite(narrative.actionProfile[action]))&&Number.isFinite(narrative.selfContinuity)&&Number.isInteger(narrative.lastProcessedTick)&&Number.isInteger(authority.narrativeCursor)&&authority.narrativeCursor<=tick&&!!setpoints&&['energy','integrity','arousal','uncertainty'].every(key=>Number.isFinite(setpoints[key as keyof typeof setpoints]))&&Array.isArray(goals)&&goals.length<=3&&goals.every(goal=>Number.isFinite(goal.urgency)&&Number.isFinite(goal.persistence))&&Number.isInteger(authority.goalCursor)&&authority.goalCursor<=tick&&!!epistemic&&Array.isArray(epistemic.history)&&epistemic.history.length<=12&&Number.isInteger(authority.epistemicCursor)&&authority.epistemicCursor<=tick&&!!intent&&intent.basedOnTick===tick&&actions.includes(intent.action)&&actions.every(action=>Number.isFinite(intent.scores[action]))&&!!efference&&actions.every(action=>!!efference.models?.[action])&&['reafferenceError','selfCausedLikelihood','externalSurprise','boundaryConfidence'].every(key=>Number.isFinite(efference[key as keyof typeof efference] as number))&&Number.isInteger(authority.efferenceCursor)&&authority.efferenceCursor<=tick&&!!abiotic&&['resources','signals','disturbances','stableZones'].every(key=>Array.isArray(abiotic[key as keyof typeof abiotic])&&abiotic[key as keyof typeof abiotic].every(entityValid))&&Number.isInteger(authority.environmentRng)&&authority.environmentRng>=0&&Number.isInteger(authority.environmentCursor)&&authority.environmentCursor<=tick&&Number.isInteger(authority.nextEntityId)&&authority.nextEntityId>=1
}

export function applyPythonAuthority(life:Life,substrate:PythonSubstrate):boolean{
  const current=life.consciousness.pythonSubstrate
  if(substrate.identity!==life.id||substrate.tick>life.tick||(current&&substrate.tick<=current.tick))return false
  life.consciousness.organismic=structuredClone(substrate.authority.organismic)
  life.consciousness.manifold=structuredClone(substrate.authority.manifold)
  life.memories=structuredClone(substrate.authority.memories)
  life.beliefs=structuredClone(substrate.authority.beliefs)
  life.nextMemoryId=substrate.authority.nextMemoryId
  life.clusters=structuredClone(substrate.authority.clusters)
  life.symbols=structuredClone(substrate.authority.symbols)
  life.nextClusterId=substrate.authority.nextClusterId
  life.nextSymbolId=substrate.authority.nextSymbolId
  life.consciousness.affect=structuredClone(substrate.authority.affect)
  life.consciousness.dream=structuredClone(substrate.authority.dream)
  life.consciousness.narrative=structuredClone(substrate.authority.narrative)
  life.consciousness.preferredSetpoints=structuredClone(substrate.authority.preferredSetpoints)
  life.consciousness.goals=structuredClone(substrate.authority.goals)
  life.consciousness.epistemic=structuredClone(substrate.authority.epistemic)
  life.consciousness.recursiveSelf=structuredClone(substrate.authority.recursiveSelf)
  life.consciousness.attentionSchema=structuredClone(substrate.authority.attentionSchema)
  life.consciousness.social=structuredClone(substrate.authority.social)
  life.consciousness.communication=structuredClone(substrate.authority.communication)
  life.consciousness.causalModels=structuredClone(substrate.authority.causalModels)
  life.consciousness.interoception=structuredClone(substrate.authority.interoception)
  life.interoceptionRng=substrate.authority.interoceptionRng
  life.consciousness.spatial=structuredClone(substrate.authority.spatial)
  life.spatialRng=substrate.authority.spatialRng
  life.consciousness.phenomenalField=structuredClone(substrate.authority.phenomenalField)
  life.consciousness.workspace=structuredClone(substrate.authority.workspace)
  life.consciousness.meta=structuredClone(substrate.authority.meta)
  if(substrate.authority.accessHistory)life.consciousness.accessHistory=structuredClone(substrate.authority.accessHistory)
  if(substrate.authority.imagination)life.consciousness.imagination=structuredClone(substrate.authority.imagination)
  if(substrate.authority.temporalField)life.consciousness.temporalField=structuredClone(substrate.authority.temporalField)
  if(substrate.authority.introspection)life.consciousness.introspection=structuredClone(substrate.authority.introspection)
  if(substrate.authority.state)life.state=structuredClone(substrate.authority.state)
  const emission=substrate.authority.communicationEmission
  if(emission&&!life.environment.socialPulse)life.environment.socialPulse={glyph:emission.glyph,x:emission.position.x,y:emission.position.y,ttl:5,bornTick:emission.bornTick,phase:emission.phase}
  life.consciousness.efference=structuredClone(substrate.authority.efference)
  for(const key of ['resources','signals','disturbances'] as const){const returned=substrate.authority.abiotic[key],ids=new Set(returned.map(entity=>entity.id)),current=new Map(life.environment[key].map(entity=>[entity.id,entity])),merged=returned.map(entity=>({...structuredClone(entity),strength:Math.min(entity.strength,current.get(entity.id)?.strength??entity.strength)})),concurrent=life.environment[key].filter(entity=>entity.id<0&&!ids.has(entity.id));life.environment[key]=[...merged,...structuredClone(concurrent)]}
  life.environment.stableZones=structuredClone(substrate.authority.abiotic.stableZones)
  life.environmentRng=substrate.authority.environmentRng
  life.nextEntityId=substrate.authority.nextEntityId
  life.state.energy=Math.max(0,Math.min(1,life.state.energy-substrate.authority.energyCost))
  life.consciousness.pythonSubstrate=structuredClone(substrate)
  return true
}

export class PythonKernelBridge{
  status:PythonKernelStatus='connecting'
  private socket?:WebSocket
  private sequence=1
  private pending=new Map<number,(reply:KernelReply)=>void>()
  private inFlight=false
  private reconnectTimer?:number
  private restarting=false
  constructor(private readonly onStatus:(status:PythonKernelStatus)=>void=()=>{},private readonly url='ws://127.0.0.1:8765'){this.connect()}
  private setStatus(status:PythonKernelStatus){if(this.status===status)return;this.status=status;this.onStatus(status)}
  private connect(){
    if(typeof WebSocket==='undefined'){this.setStatus('fallback');return}
    this.setStatus('connecting')
    try{const socket=new WebSocket(this.url);this.socket=socket
      socket.onopen=()=>{this.setStatus('connected');this.request({type:'hello'}).then(reply=>{if(reply.protocol!==1)this.setStatus('incompatible')}).catch(()=>this.setStatus('fallback'))}
      socket.onmessage=event=>{try{const reply=JSON.parse(String(event.data)) as KernelReply;if(reply.requestId!==undefined){this.pending.get(reply.requestId)?.(reply);this.pending.delete(reply.requestId)}}catch{this.setStatus('incompatible')}}
      socket.onerror=()=>this.setStatus('fallback')
      socket.onclose=()=>{this.socket=undefined;this.inFlight=false;this.pending.clear();this.setStatus('fallback');if(this.restarting){this.restarting=false;this.connect()}else this.reconnectTimer=window.setTimeout(()=>this.connect(),4000)}
    }catch{this.setStatus('fallback')}
  }
  private request(message:Record<string,unknown>):Promise<KernelReply>{return new Promise((resolve,reject)=>{const socket=this.socket;if(!socket||socket.readyState!==WebSocket.OPEN){reject(new Error('Python kernel unavailable'));return}const requestId=this.sequence++;const timer=window.setTimeout(()=>{this.pending.delete(requestId);reject(new Error('Python kernel timeout'))},2500);this.pending.set(requestId,reply=>{window.clearTimeout(timer);reply.type==='error'?reject(new Error(reply.error??'Python kernel error')):resolve(reply)});socket.send(JSON.stringify({...message,requestId}))})}
  async submit(life:Life):Promise<PythonSubstrate|undefined>{
    if(this.status!=='connected'||this.inFlight)return undefined
    this.inFlight=true
    try{const reply=await this.request({type:'ingest',life,substrate:life.consciousness.pythonSubstrate});if(reply.protocol!==1){this.setStatus('incompatible');return undefined}return validPythonSubstrate(reply.substrate,life)?reply.substrate:undefined}
    catch{this.setStatus('fallback');return undefined}
    finally{this.inFlight=false}
  }
  restart(){if(this.reconnectTimer)window.clearTimeout(this.reconnectTimer);this.restarting=true;if(this.socket)this.socket.close();else{this.restarting=false;this.connect()}}
  dispose(){if(this.reconnectTimer)window.clearTimeout(this.reconnectTimer);this.socket?.close()}
}
