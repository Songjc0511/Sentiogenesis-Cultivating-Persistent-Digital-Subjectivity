import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { ageAbioticEnvironment, createLife, step } from '../src/simulation'
import type { EfferenceState, Life } from '../src/types'

interface GoldenFrame {
  tick:number
  memories:Life['memories']
  beliefs:Life['beliefs']
  nextMemoryId:number
  efference:EfferenceState
  efferenceCursor:number
  abiotic:{resources:Life['environment']['resources'];signals:Life['environment']['signals'];disturbances:Life['environment']['disturbances'];stableZones:Life['environment']['stableZones']}
  environmentRng:number
  environmentCursor:number
  nextEntityId:number
  clusters:Life['clusters']
  symbols:Life['symbols']
  nextClusterId:number
  nextSymbolId:number
  symbolicCursor:number
  affect:Life['consciousness']['affect']
  affectCursor:number
  dream:Life['consciousness']['dream']
  dreamCursor:number
  narrative:Life['consciousness']['narrative']
  narrativeCursor:number
  preferredSetpoints:Life['consciousness']['preferredSetpoints']
  goals:Life['consciousness']['goals']
  goalCursor:number
  epistemic:Life['consciousness']['epistemic']
  epistemicCursor:number
  recursiveSelf:Life['consciousness']['recursiveSelf']
  recursiveCursor:number
  attentionSchema:Life['consciousness']['attentionSchema']
  attentionCursor:number
  social:Life['consciousness']['social']
  socialCursor:number
  communication:Life['consciousness']['communication']
  communicationCursor:number
  causalModels:Life['consciousness']['causalModels']
  causalCursor:number
  interoception:Life['consciousness']['interoception']
  interoceptionRng:number
  interoceptionCursor:number
  spatial:Life['consciousness']['spatial']
  spatialRng:number
  spatialCursor:number
  phenomenalField:Life['consciousness']['phenomenalField']
  workspace:Life['consciousness']['workspace']
  meta:Life['consciousness']['meta']
  phenomenalCursor:number
  imagination:Life['consciousness']['imagination']
  imaginationCursor:number
  temporalField:Life['consciousness']['temporalField']
  temporalCursor:number
  introspection:Life['consciousness']['introspection']
  introspectionCursor:number
  state:Life['state']
  stateCursor:number
  candidates:NonNullable<Life['traces'][number]['phenomenalObservation']>['candidates']
  candidateCursor:number
  accessHistory:Life['consciousness']['accessHistory']
  accessCursor:number
}

const closeNumbers=(actual:unknown,expected:unknown,path='root'):void=>{
  if(typeof expected==='number'){expect(actual,`${path} differs`).toBeCloseTo(expected,11);return}
  if(Array.isArray(expected)){expect(Array.isArray(actual),`${path} must be an array`).toBe(true);expect((actual as unknown[]).length,`${path} length`).toBe(expected.length);expected.forEach((value,index)=>closeNumbers((actual as unknown[])[index],value,`${path}[${index}]`));return}
  if(expected&&typeof expected==='object'){expect(actual&&typeof actual==='object',`${path} must be an object`).toBeTruthy();for(const [key,value] of Object.entries(expected))closeNumbers((actual as Record<string,unknown>)[key],value,`${path}.${key}`);return}
  expect(actual,`${path} differs`).toEqual(expected)
}

describe('cross-language golden trajectory',()=>{
  it('keeps Python memory, worldview, and causal self-model aligned with the browser reference',()=>{
    let life=createLife(0x51A7,1000)
    const snapshots:Life[]=[]
    for(let tick=0;tick<120;tick++){life=step(life);snapshots.push(structuredClone(life))}
    const raw=execFileSync('python',['python/sentiogenesis/golden.py'],{input:JSON.stringify(snapshots),encoding:'utf8',maxBuffer:128*1024*1024})
    const python=JSON.parse(raw) as GoldenFrame[]
    expect(python).toHaveLength(snapshots.length)
    python.forEach((frame,index)=>{
      const browser=snapshots[index]
      expect(frame.tick).toBe(browser.tick)
      expect(frame.efferenceCursor).toBe(browser.tick)
      expect(frame.nextMemoryId).toBe(browser.nextMemoryId)
      closeNumbers(frame.beliefs,browser.beliefs,`T${frame.tick}.beliefs`)
      closeNumbers(frame.memories,browser.memories,`T${frame.tick}.memories`)
      closeNumbers(frame.efference,browser.consciousness.efference,`T${frame.tick}.efference`)
      expect(frame.symbolicCursor).toBe(browser.tick)
      expect(frame.nextClusterId).toBe(browser.nextClusterId)
      expect(frame.nextSymbolId).toBe(browser.nextSymbolId)
      closeNumbers(frame.clusters,browser.clusters,`T${frame.tick}.clusters`)
      closeNumbers(frame.symbols,browser.symbols,`T${frame.tick}.symbols`)
      expect(frame.affectCursor).toBe(browser.tick)
      closeNumbers(frame.affect,browser.consciousness.affect,`T${frame.tick}.affect`)
      expect(frame.dreamCursor).toBe(browser.tick)
      closeNumbers(frame.dream,browser.consciousness.dream,`T${frame.tick}.dream`)
      expect(frame.narrativeCursor).toBe(browser.tick)
      closeNumbers(frame.narrative,browser.consciousness.narrative,`T${frame.tick}.narrative`)
      expect(frame.goalCursor).toBe(browser.tick)
      closeNumbers(frame.preferredSetpoints,browser.consciousness.preferredSetpoints,`T${frame.tick}.preferredSetpoints`)
      closeNumbers(frame.goals,browser.consciousness.goals,`T${frame.tick}.goals`)
      expect(frame.epistemicCursor).toBe(browser.tick)
      closeNumbers(frame.epistemic,browser.consciousness.epistemic,`T${frame.tick}.epistemic`)
      expect(frame.recursiveCursor).toBe(browser.tick)
      closeNumbers(frame.recursiveSelf,browser.consciousness.recursiveSelf,`T${frame.tick}.recursiveSelf`)
      expect(frame.attentionCursor).toBe(browser.tick)
      closeNumbers(frame.attentionSchema,browser.consciousness.attentionSchema,`T${frame.tick}.attentionSchema`)
      expect(frame.socialCursor).toBe(browser.tick)
      closeNumbers(frame.social,browser.consciousness.social,`T${frame.tick}.social`)
      expect(frame.communicationCursor).toBe(browser.tick)
      closeNumbers(frame.communication,browser.consciousness.communication,`T${frame.tick}.communication`)
      expect(frame.causalCursor).toBe(browser.tick)
      closeNumbers(frame.causalModels,browser.consciousness.causalModels,`T${frame.tick}.causalModels`)
      expect(frame.interoceptionCursor).toBe(browser.tick)
      expect(frame.interoceptionRng).toBe(browser.interoceptionRng)
      closeNumbers(frame.interoception,browser.consciousness.interoception,`T${frame.tick}.interoception`)
      expect(frame.spatialCursor).toBe(browser.tick)
      expect(frame.spatialRng).toBe(browser.spatialRng)
      closeNumbers(frame.spatial,browser.consciousness.spatial,`T${frame.tick}.spatial`)
      expect(frame.phenomenalCursor).toBe(browser.tick)
      closeNumbers(frame.phenomenalField,browser.consciousness.phenomenalField,`T${frame.tick}.phenomenalField`)
      closeNumbers(frame.workspace,browser.consciousness.workspace,`T${frame.tick}.workspace`)
      closeNumbers(frame.meta,browser.consciousness.meta,`T${frame.tick}.meta`)
      expect(frame.imaginationCursor).toBe(browser.tick)
      closeNumbers(frame.imagination,browser.consciousness.imagination,`T${frame.tick}.imagination`)
      expect(frame.temporalCursor).toBe(browser.tick)
      closeNumbers(frame.temporalField,browser.consciousness.temporalField,`T${frame.tick}.temporalField`)
      expect(frame.introspectionCursor).toBe(browser.tick)
      closeNumbers(frame.introspection,browser.consciousness.introspection,`T${frame.tick}.introspection`)
      expect(frame.stateCursor).toBe(browser.tick)
      closeNumbers(frame.state,browser.state,`T${frame.tick}.state`)
      expect(frame.candidateCursor).toBe(browser.tick)
      closeNumbers(frame.candidates,browser.traces.at(-1)?.phenomenalObservation?.candidates,`T${frame.tick}.candidates`)
      expect(frame.accessCursor).toBe(browser.tick)
      closeNumbers(frame.accessHistory,browser.consciousness.accessHistory,`T${frame.tick}.accessHistory`)
      expect(frame.environmentCursor).toBe(browser.tick)
      expect(frame.environmentRng).toBe(browser.environmentRng)
      expect(frame.nextEntityId).toBe(browser.nextEntityId)
      closeNumbers(frame.abiotic,{resources:browser.environment.resources,signals:browser.environment.signals,disturbances:browser.environment.disturbances,stableZones:browser.environment.stableZones},`T${frame.tick}.abiotic`)
    })
  },15000)
  it('matches 500 ticks of natural spawning, decay, and expiry',()=>{
    const life=createLife(0xE771,1000),snapshots:Life[]=[]
    for(let tick=1;tick<=500;tick++){life.tick=tick;ageAbioticEnvironment(life);snapshots.push(structuredClone(life))}
    const raw=execFileSync('python',['python/sentiogenesis/golden.py'],{input:JSON.stringify(snapshots),encoding:'utf8',maxBuffer:16*1024*1024})
    const python=JSON.parse(raw) as GoldenFrame[]
    expect(python.some((frame,index)=>frame.nextEntityId!==snapshots[Math.max(0,index-1)].nextEntityId)).toBe(true)
    python.forEach((frame,index)=>{const browser=snapshots[index];expect(frame.environmentRng).toBe(browser.environmentRng);expect(frame.nextEntityId).toBe(browser.nextEntityId);closeNumbers(frame.abiotic,{resources:browser.environment.resources,signals:browser.environment.signals,disturbances:browser.environment.disturbances,stableZones:browser.environment.stableZones},`environment-T${frame.tick}`)})
  })
})
