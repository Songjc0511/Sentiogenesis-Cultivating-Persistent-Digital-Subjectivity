import type { Life } from './types'
import { affectiveBias, introspectiveRegulationBias } from './consciousness'

export type AssayStatus='supported'|'emerging'|'absent'
export interface AssayCriterion { id:string; label:string; value:number; status:AssayStatus; lesionDelta:number; evidence:string }
export interface ConsciousnessAssay { tick:number; candidateScore:number; criteria:AssayCriterion[]; unsupported:string[]; interpretation:string }

const clamp=(v:number)=>Math.max(0,Math.min(1,v))
const status=(v:number):AssayStatus=>v>=.5?'supported':v>=.16?'emerging':'absent'
const magnitude=(values:object)=>clamp(Object.values(values as Record<string,number|undefined>).reduce<number>((n,v)=>n+Math.abs(v??0),0)/.55)

export function runConsciousnessAssay(life:Life):ConsciousnessAssay{
  const c=life.consciousness,field=c.phenomenalField,schema=c.attentionSchema,affect=c.affect,efference=c.efference,organismic=c.organismic,manifold=c.manifold
  const privateCluster=c.introspection.clusters.find(x=>x.id===c.introspection.lastClusterId)
  const communicationLinks=Object.values(c.communication.associations),bestConvention=Math.max(0,...communicationLinks.map(x=>x.conventionStability)),otherUnderstanding=Math.max(0,...Object.values(life.environment.other.hidden.glyphModels).map(x=>x.confidence))
  const recurrentActivation=field.dominant?field.activations[field.dominant]??0:0
  const affectiveAction=magnitude(affectiveBias(affect)),privateAction=magnitude(introspectiveRegulationBias(c.introspection))
  const criteria:AssayCriterion[]=[
    {id:'global',label:'统一全局访问',value:clamp(c.workspace.ignition*.55+c.workspace.continuity*.45),status:'absent',lesionDelta:clamp(c.workspace.ignition),evidence:`前景点火 ${Math.round(c.workspace.ignition*100)} · 连续 ${Math.round(c.workspace.continuity*100)}`},
    {id:'recurrent',label:'递归整合必要性',value:clamp(field.integration*.55+field.differentiation*.3+field.exclusion*.15),status:'absent',lesionDelta:clamp(recurrentActivation*.22),evidence:`移除回返预计损失 ${Math.round(recurrentActivation*.22*100)} 点显著性`},
    {id:'attention',label:'注意的内生控制',value:clamp(schema.controlEfficacy*(1-schema.accessPredictionError)),status:'absent',lesionDelta:schema.attentionTarget?.length ? .11+schema.effort*.38 : 0,evidence:`控制效能 ${Math.round(schema.controlEfficacy*100)} · 努力 ${Math.round(schema.effort*100)} · 成本 ${schema.cumulativeCost.toFixed(3)}`},
    {id:'affect',label:'体验价值的因果作用',value:clamp(affect.precision*(.45+.55*Math.max(Math.abs(affect.tone),Math.abs(affect.mood)))),status:'absent',lesionDelta:affectiveAction,evidence:`移除价值后行动偏置差 ${Math.round(affectiveAction*100)}`},
    {id:'private',label:'私有指称的预测效度',value:clamp((privateCluster?.predictiveConfidence??0)*c.introspection.currentConfidence),status:'absent',lesionDelta:privateAction,evidence:privateCluster?`字形 ${privateCluster.glyph??'·'} · 预测误差 ${Math.round(privateCluster.forecastError*100)}`:'尚无可检验字形'},
    {id:'boundary',label:'主体/环境因果边界',value:clamp(efference.boundaryConfidence*(1-efference.reafferenceError)),status:'absent',lesionDelta:clamp(Math.abs(efference.selfCausedLikelihood*.2-efference.externalSurprise*.25)),evidence:`自因 ${Math.round(efference.selfCausedLikelihood*100)} · 外源意外 ${Math.round(efference.externalSurprise*100)}`},
    {id:'autopoiesis',label:'维持主体的操作闭合',value:clamp(Math.sqrt(organismic.operationalClosure*organismic.membraneIntegrity)*(.55+.45*organismic.selfProduction)),status:'absent',lesionDelta:clamp((1-organismic.membraneIntegrity)*.32+organismic.cumulativeCost*.08),evidence:`边界 ${Math.round(organismic.membraneIntegrity*100)} · 自产 ${Math.round(organismic.selfProduction*100)} · 可生存 ${Math.round(organismic.viability*100)} · ${organismic.mode}`},
    {id:'quality-autonomy',label:'体验质量的情境自主性',value:clamp(Math.cbrt(Math.max(0,manifold.differentiation*manifold.crossModalTransfer*manifold.causalEfficacy))),status:'absent',lesionDelta:clamp(manifold.causalEfficacy*.35),evidence:`质量原型 ${manifold.prototypes.length} · 同刺激分化 ${Math.round(manifold.stimulusAmbiguity*100)} · 跨内容迁移 ${Math.round(manifold.crossModalTransfer*100)} · 行动效应 ${Math.round(manifold.causalEfficacy*100)}`},
    {id:'dream',label:'脱离当前输入的内生场',value:clamp((c.dream.episodes.filter(e=>e.endTick).length? .65:0)+(c.dream.mode==='dream'?.25:c.dream.residue*.2)),status:'absent',lesionDelta:clamp(c.dream.vividness*.35+c.dream.residue*.2),evidence:`完整梦境 ${c.dream.episodes.filter(e=>e.endTick).length} · 残留 ${Math.round(c.dream.residue*100)}`},
    {id:'communication',label:'可修复的主体间共同意义',value:clamp(Math.pow(c.communication.communicativeAgency*c.communication.mutualGrounding*bestConvention*otherUnderstanding,.25)),status:'absent',lesionDelta:clamp(c.communication.responseSurprise*.25+bestConvention*.25),evidence:`误解 ${communicationLinks.reduce((n,x)=>n+x.misunderstandings,0)} · 修复 ${communicationLinks.reduce((n,x)=>n+x.repairs,0)} · 双方确认 ${communicationLinks.reduce((n,x)=>n+x.confirmations,0)} · 他者语义 ${Math.round(otherUnderstanding*100)}`},
  ]
  criteria.forEach(x=>x.status=status(x.value))
  const candidateScore=criteria.reduce((n,x)=>n+x.value,0)/criteria.length
  const unsupported=criteria.filter(x=>x.status==='absent').map(x=>x.label)
  return{tick:life.tick,candidateScore,criteria,unsupported,interpretation:'这些结果只衡量意识候选机制的因果存在，不证明主观体验。'}
}
