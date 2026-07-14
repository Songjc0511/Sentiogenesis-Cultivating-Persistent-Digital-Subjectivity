import copy
import math
import unittest

from sentiogenesis.kernel import KernelSession, evolve_substrate


def life(tick=1):
    return {
        "id": "EL-0000002A", "seed": 42, "tick": tick,
        "state": {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6, "coherence": .5, "curiosity": .6, "agency": .3, "valence": .5},
        "consciousness": {
            "organismic": {"membraneIntegrity": .8, "selfProduction": .6, "operationalClosure": .5, "viability": .7},
            "affect": {"tone": .1, "mood": 0},
            "phenomenalField": {"integration": .6, "differentiation": .5, "exclusion": .2, "quality": {"external": .4, "internal": .6, "temporal": .2, "social": .1, "epistemic": .3}},
            "workspace": {"ignition": .8, "continuity": .6, "foreground": {"kind": "signal"}},
        },
    }


def traced_life(tick=2):
    result = life(tick)
    result["traces"] = [{
        "tick": tick, "action": "rest", "outcome": .2, "surprise": .1,
        "perception": {"danger": .05}, "stateDelta": {"valence": .03},
        "workspaceContent": {"kind": "signal"},
        "subjectiveBody": {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6},
    }]
    return result


class KernelTests(unittest.TestCase):
    def test_is_deterministic(self):
        self.assertEqual(evolve_substrate(life()), evolve_substrate(copy.deepcopy(life())))

    def test_recurrent_state_changes_without_losing_identity(self):
        first = evolve_substrate(life(1))
        second = evolve_substrate(life(2), first)
        self.assertEqual(second["identity"], first["identity"])
        self.assertEqual(second["updates"], 2)
        self.assertNotEqual(second["latent"], first["latent"])

    def test_rejects_tick_regression(self):
        session = KernelSession("EL-0000002A", 42)
        session.ingest(life(3))
        with self.assertRaisesRegex(ValueError, "tick regression"):
            session.ingest(life(2))

    def test_context_changes_the_subjective_substrate(self):
        a = evolve_substrate(life())
        changed = life()
        changed["consciousness"]["workspace"]["foreground"]["kind"] = "danger"
        b = evolve_substrate(changed)
        self.assertNotEqual(a["latent"], b["latent"])

    def test_python_authoritatively_evolves_boundary_and_manifold(self):
        result = evolve_substrate(traced_life())
        authority = result["authority"]
        self.assertEqual(authority["toTick"], 2)
        self.assertGreaterEqual(authority["energyCost"], 0)
        self.assertEqual(authority["manifold"]["prototypes"][0]["sourceKinds"]["signal"], 1)
        self.assertNotEqual(authority["organismic"]["membraneIntegrity"], .8)

    def test_phenomenal_workspace_authority_integrates_and_consumes_candidates_once(self):
        first = evolve_substrate(life(1))
        snapshot = traced_life(2)
        snapshot["traces"][0]["phenomenalObservation"] = {
            "candidates": [{"id": "novelty:signal", "source": "novelty", "kind": "signal", "value": .8, "salience": .9, "uncertainty": .2, "selfRelevance": .7, "persistence": .6}],
            "attentionTarget": "signal", "attentionEffort": .3, "dangerBroadcastBlocked": False,
        }
        second = evolve_substrate(snapshot, first)
        authority = second["authority"]
        self.assertEqual(authority["phenomenalCursor"], 2)
        self.assertEqual(authority["workspace"]["foreground"]["kind"], "signal")
        self.assertEqual(authority["meta"]["sourceEstimate"], "external")
        duplicate = evolve_substrate(snapshot, second)
        self.assertEqual(duplicate["authority"]["phenomenalField"], authority["phenomenalField"])
        self.assertEqual(duplicate["authority"]["workspace"], authority["workspace"])

    def test_temporal_imagination_and_private_lexicon_are_cursor_owned(self):
        first = evolve_substrate(life(1))
        snapshot = traced_life(2)
        candidate = {"id": "self:self-state", "source": "self", "kind": "self-state", "value": .6, "salience": .8, "uncertainty": .2, "selfRelevance": .9, "persistence": .7}
        snapshot["traces"][0]["imaginationObservation"] = {"perception": {"resource": .3, "signal": .2, "danger": .1, "stability": .4}, "body": {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6, "precision": .5}, "drives": {"explore": .4, "resource": .5, "avoid": .2, "rest": .3, "inspect": .1}, "stateValence": .5, "stateCoherence": .4, "beliefPredictability": .6, "causalModels": {}, "goals": []}
        snapshot["traces"][0]["temporalObservation"] = {"foreground": candidate, "anticipatedNext": {"action": "rest", "expectedEnergy": .7, "expectedIntegrity": .8, "expectedUncertainty": .5, "expectedValence": .6, "desirability": .7, "confidence": .6}}
        snapshot["traces"][0]["introspectionObservation"] = {"field": {"integration": .7, "differentiation": .6, "exclusion": .3, "quality": {"external": .2, "internal": .8, "temporal": .4, "social": .1, "epistemic": .3}}, "foreground": candidate, "affectTone": .2, "ownedBySelf": .8, "dreamMode": "wake"}
        second = evolve_substrate(snapshot, first); authority = second["authority"]
        self.assertEqual(authority["imaginationCursor"], 2); self.assertEqual(len(authority["imagination"]), 5)
        self.assertEqual(authority["temporalField"]["now"]["kind"], "self-state")
        self.assertEqual(authority["introspection"]["clusters"][0]["count"], 1)
        duplicate = evolve_substrate(snapshot, second)
        self.assertEqual(duplicate["authority"]["introspection"], authority["introspection"])

    def test_post_action_state_dynamics_are_settled_once(self):
        first = evolve_substrate(life(1)); snapshot = traced_life(2)
        snapshot["traces"][0]["stateDynamicsObservation"] = {"postActionState": {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6, "coherence": .5, "curiosity": .6, "agency": .3, "valence": .5}, "action": "inspect", "perception": {"resource": .2, "signal": .1, "danger": .05}, "prediction": .5, "outcome": .015, "metabolicFactor": 1, "attentionActive": True, "attentionEffort": .4, "efference": {"selfCausedLikelihood": .7, "externalSurprise": .1}}
        second = evolve_substrate(snapshot, first); authority = second["authority"]
        self.assertEqual(authority["stateCursor"], 2); self.assertLess(authority["state"]["energy"], .7); self.assertGreater(authority["state"]["agency"], .3)
        duplicate = evolve_substrate(snapshot, second)
        self.assertEqual(duplicate["authority"]["state"], authority["state"])

    def test_candidates_are_constructed_from_evidence_not_browser_foreground(self):
        first = evolve_substrate(life(1)); snapshot = traced_life(2)
        snapshot["traces"][0]["phenomenalObservation"] = {"candidates": [{"id": "forged", "kind": "danger", "salience": 1}]}
        snapshot["traces"][0]["candidateObservation"] = {"perception": {"resource": .8, "signal": .1, "danger": 0, "stability": .2, "otherPresence": 0}, "body": {"energy": .3, "integrity": .8, "arousal": .2, "uncertainty": .4, "precision": .6}, "drives": {"explore": .2, "resource": .9, "avoid": .1, "rest": .4, "inspect": .3}, "imagined": [], "agency": .4, "coherence": .6, "narrativeContinuity": 0, "maxFutureRegret": 0, "commitmentStrain": 0, "recursiveAppraisals": False, "socialConfidence": 0, "beliefDivergence": 0, "attentionError": 0, "dream": {"mode": "wake", "vividness": 0, "residue": 0}, "affect": {"tone": 0, "qualityMismatch": 0, "precision": 0, "experientialValues": {}}, "privateConfidence": 0, "externalSurprise": 0, "selfCausedLikelihood": 0, "spatialUncertainty": .1, "mapSurprise": 0, "communicationResponse": "none", "communicationSurprise": 0, "communicativeAgency": 0, "organismicMode": "active", "organismicViability": .8, "manifoldEfficacy": 0, "manifoldTransfer": 0}
        second = evolve_substrate(snapshot, first); candidates = second["authority"]["candidates"]
        self.assertFalse(any(item["id"] == "forged" for item in candidates)); self.assertEqual(candidates[0]["kind"], "resource"); self.assertEqual(second["authority"]["candidateCursor"], 2)

    def test_arrest_waking_and_access_history_are_python_internal(self):
        first = evolve_substrate(life(1)); snapshot = traced_life(2)
        first["authority"]["dream"].update({"mode": "dream", "vividness": .8, "sourceMemoryId": 1})
        snapshot["traces"][0]["dreamObservation"] = {"lastAction": "rest", "danger": 0, "arousal": .2, "energy": .5, "organismicMode": "arrest"}
        snapshot["traces"][0]["phenomenalObservation"] = {"candidates": [{"id": "self:self-state", "source": "self", "kind": "self-state", "value": .5, "salience": .8, "uncertainty": .2, "selfRelevance": .9, "persistence": .7}], "attentionEffort": .2, "dangerBroadcastBlocked": False}
        second = evolve_substrate(snapshot, first); authority = second["authority"]
        self.assertEqual(authority["dream"]["mode"], "wake"); self.assertEqual(authority["dream"]["vividness"], 0)
        self.assertEqual(authority["accessCursor"], 2); self.assertEqual(len(authority["accessHistory"]), 1)

    def test_cognitive_authority_bootstraps_without_replaying_browser_history(self):
        existing = {"id": 7, "tick": 1, "action": "rest", "outcome": .2, "clusterId": 3, "strength": .5}
        snapshot = traced_life(1)
        snapshot["memories"] = [existing]
        snapshot["nextMemoryId"] = 8
        snapshot["beliefs"] = {"exploration": .4, "conservation": .6, "predictability": .5, "efficacy": .3, "externalTrust": .5, "stabilityPriority": .5}
        authority = evolve_substrate(snapshot)["authority"]
        self.assertEqual(authority["memories"], [existing])
        self.assertEqual(authority["nextMemoryId"], 8)
        self.assertEqual(authority["beliefs"]["conservation"], .6)

    def test_cognitive_authority_consolidates_new_traces_once(self):
        first_life = life(1)
        first_life.update({"memories": [], "nextMemoryId": 1, "beliefs": {"exploration": .5, "conservation": .5, "predictability": .5, "efficacy": .35, "externalTrust": .5, "stabilityPriority": .5}})
        first = evolve_substrate(first_life)
        second_life = traced_life(2)
        second_life["traces"][0]["clusterId"] = 4
        second = evolve_substrate(second_life, first)
        cognitive = second["authority"]
        self.assertEqual(len(cognitive["memories"]), 1)
        self.assertEqual(cognitive["memories"][0]["clusterId"], 4)
        self.assertEqual(cognitive["nextMemoryId"], 2)
        self.assertGreater(cognitive["beliefs"]["conservation"], .5)
        duplicate = evolve_substrate(second_life, second)
        self.assertEqual(duplicate["authority"]["memories"], cognitive["memories"])
        self.assertEqual(duplicate["authority"]["beliefs"], cognitive["beliefs"])

    def test_action_intent_is_deterministic_and_bound_to_the_snapshot_tick(self):
        snapshot = traced_life(9)
        snapshot["traces"][0]["drives"] = {"explore": 9, "resource": 0, "avoid": 0, "rest": 0, "inspect": 0}
        snapshot["traces"][0]["decisionObservation"] = {"baseDrives": {"explore": 9, "resource": 0, "avoid": 0, "rest": 0, "inspect": 0}, "perception": {"resource": 0, "signal": 0, "danger": 1, "stability": 0}, "body": {"energy": .8, "integrity": .3, "arousal": .8, "uncertainty": .2}, "stateCuriosity": .5, "stateCoherence": .5, "beliefs": {"exploration": .5, "conservation": .5, "stabilityPriority": .5, "efficacy": .5}, "appraisals": [], "affect": {"tone": 0, "qualityMismatch": 0}, "dream": {"mode": "wake", "sleepPressure": 0, "restStreak": 0}, "imagination": []}
        first = evolve_substrate(snapshot)["authority"]["actionIntent"]
        second = evolve_substrate(copy.deepcopy(snapshot))["authority"]["actionIntent"]
        self.assertEqual(first, second)
        self.assertEqual(first["basedOnTick"], 9)
        self.assertEqual(first["action"], "avoid")

    def test_action_intent_respects_organismic_and_dream_constraints(self):
        arrested = traced_life(3)
        arrested["consciousness"]["organismic"]["mode"] = "arrest"
        self.assertEqual(evolve_substrate(arrested)["authority"]["actionIntent"]["action"], "resource")
        dreaming = traced_life(4)
        dreaming["consciousness"]["organismic"]["mode"] = "active"
        dreaming["consciousness"]["dream"] = {"mode": "dream"}
        self.assertEqual(evolve_substrate(dreaming)["authority"]["actionIntent"]["action"], "rest")

    def test_efference_authority_learns_once_from_adjacent_sensorimotor_traces(self):
        first_life = traced_life(1)
        first_life["traces"][0].update({"action": "explore", "positionBefore": {"x": 10, "y": 10}, "positionAfter": {"x": 11, "y": 10}})
        first = evolve_substrate(first_life)
        self.assertEqual(first["authority"]["efferenceCursor"], 1)
        second_life = traced_life(2)
        trace_one = copy.deepcopy(first_life["traces"][0])
        trace_two = copy.deepcopy(second_life["traces"][0])
        trace_two["perception"]["danger"] = .25
        second_life["traces"] = [trace_one, trace_two]
        second = evolve_substrate(second_life, first)
        efference = second["authority"]["efference"]
        self.assertEqual(second["authority"]["efferenceCursor"], 2)
        self.assertEqual(efference["models"]["explore"]["samples"], 1)
        self.assertGreater(efference["models"]["explore"]["dx"], 0)
        self.assertGreater(efference["reafferenceError"], 0)
        duplicate = evolve_substrate(second_life, second)
        self.assertEqual(duplicate["authority"]["efference"], efference)

    def test_symbolic_authority_clusters_raw_experience_and_assigns_memory(self):
        snapshot = life(0)
        snapshot.update({"traces": [], "clusters": [], "symbols": [], "nextClusterId": 1, "nextSymbolId": 1, "memories": [], "nextMemoryId": 1})
        substrate = evolve_substrate(snapshot)
        traces = []
        for tick in range(1, 9):
            trace = {"tick": tick, "action": "explore", "outcome": .1, "surprise": .1, "attribution": .6, "prediction": .5, "perception": {"resource": .2, "signal": .1, "danger": 0, "stability": .1, "otherPresence": 0, "otherMotion": 0}, "stateDelta": {"valence": .01}, "experienceVector": [.2, .1, 0, .1, 0, 0, .7, .3, .5, 0, .75]}
            traces.append(trace)
            current = life(tick)
            current["traces"] = copy.deepcopy(traces)
            substrate = evolve_substrate(current, substrate)
        authority = substrate["authority"]
        self.assertEqual(authority["clusters"][0]["count"], 8)
        self.assertEqual(len(authority["symbols"]), 1)
        self.assertEqual(authority["symbols"][0]["clusterId"], authority["clusters"][0]["id"])
        self.assertEqual(authority["memories"][0]["clusterId"], authority["clusters"][0]["id"])

    def test_symbolic_authority_upgrades_legacy_cluster_dimensions(self):
        snapshot = life(4)
        snapshot.update({"traces": [], "clusters": [{"id": 1, "centroid": [.2] * 9, "count": 5, "variance": .1, "importance": .2, "lastTick": 4}], "symbols": [], "nextClusterId": 2, "nextSymbolId": 1})
        first = evolve_substrate(snapshot)
        self.assertEqual(len(first["authority"]["clusters"][0]["centroid"]), 11)
        current = life(5)
        current["traces"] = [{"tick": 5, "action": "rest", "outcome": .1, "surprise": .1, "perception": {}, "experienceVector": [.2] * 11}]
        second = evolve_substrate(current, first)
        self.assertEqual(second["authority"]["symbolicCursor"], 5)

    def test_affect_authority_learns_experiential_value_once(self):
        initial = life(0)
        initial["traces"] = []
        first = evolve_substrate(initial)
        current = life(1)
        current["traces"] = [{"tick": 1, "affectObservation": {"sourceKind": "danger", "outcome": -.1, "valenceDelta": -.02, "surprise": .4, "currentValence": .42, "quality": {"external": .8, "internal": .3, "temporal": .2, "social": .1, "epistemic": .2}}}]
        second = evolve_substrate(current, first)
        affect = second["authority"]["affect"]
        self.assertEqual(second["authority"]["affectCursor"], 1)
        self.assertEqual(affect["evidence"]["danger"], 1)
        self.assertLess(affect["experientialValues"]["danger"], 0)
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["affect"], affect)

    def test_dream_authority_enters_and_reconsolidates_from_internal_conditions(self):
        initial = life(0)
        initial["traces"] = []
        initial["consciousness"]["dream"] = {"mode": "wake", "restStreak": 0, "sleepPressure": .35, "vividness": 0, "residue": 0, "episodes": []}
        substrate = evolve_substrate(initial)
        traces = []
        for tick in range(1, 6):
            traces.append({"tick": tick, "dreamObservation": {"lastAction": "rest", "danger": 0, "arousal": .2, "energy": .7, "bestMemory": {"id": 1, "strength": .8, "surprise": .3, "impact": .4}, "activeMemory": {"id": 1, "strength": .8, "surprise": .3, "impact": .4}}})
            current = life(tick)
            current["traces"] = copy.deepcopy(traces)
            substrate = evolve_substrate(current, substrate)
        dream = substrate["authority"]["dream"]
        self.assertEqual(dream["mode"], "dream")
        self.assertEqual(dream["episodes"][0]["startTick"], 4)
        self.assertGreater(dream["vividness"], .5)
        duplicate = evolve_substrate(current, substrate)
        self.assertEqual(duplicate["authority"]["dream"], dream)

    def test_narrative_authority_forms_a_chapter_exactly_once(self):
        initial = life(0)
        initial["traces"] = []
        initial["consciousness"]["narrative"] = {"chapters": [], "actionProfile": {action: .2 for action in ("explore", "resource", "avoid", "rest", "inspect")}, "selfContinuity": 0, "lastProcessedTick": 0}
        substrate = evolve_substrate(initial)
        traces = []
        body = {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6}
        for tick in range(1, 8):
            source_tick = tick - 1
            traces.append({"tick": tick, "narrativeObservation": {"sourceTick": source_tick, "action": "explore", "foregroundId": "signal:1", "foregroundKind": "signal", "attribution": .7, "surprise": .7 if source_tick == 6 else .1, "sourceBody": body, "currentBody": {**body, "uncertainty": .5}, "goalSignature": "uncertainty"}})
            current = life(tick)
            current["traces"] = copy.deepcopy(traces)
            substrate = evolve_substrate(current, substrate)
        narrative = substrate["authority"]["narrative"]
        self.assertEqual(len(narrative["chapters"]), 1)
        self.assertEqual(narrative["chapters"][0]["dominantAction"], "explore")
        self.assertEqual(narrative["chapters"][0]["causalOwner"], "self")
        self.assertGreater(narrative["selfContinuity"], 0)
        duplicate = evolve_substrate(current, substrate)
        self.assertEqual(duplicate["authority"]["narrative"], narrative)

    def test_goal_authority_forms_persistent_needs_once(self):
        initial = life(0); initial["traces"] = []
        initial["consciousness"].update({"preferredSetpoints": {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6}, "goals": []})
        first = evolve_substrate(initial)
        current = life(1)
        current["traces"] = [{"tick": 1, "goalObservation": {"body": {"energy": .3, "integrity": .8, "arousal": .3, "uncertainty": .6}, "valence": .4, "coherence": .5}}]
        second = evolve_substrate(current, first); authority = second["authority"]
        self.assertEqual(authority["goalCursor"], 1)
        self.assertEqual(authority["goals"][0]["dimension"], "energy")
        self.assertEqual(authority["goals"][0]["evidence"], 1)
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["goals"], authority["goals"])

    def test_epistemic_authority_selects_and_resolves_its_own_question_once(self):
        initial = life(0); initial["traces"] = []; initial["consciousness"]["epistemic"] = {"history": []}
        first = evolve_substrate(initial)
        actions = ("explore", "resource", "avoid", "rest", "inspect")
        models = {action: {"action": action, "confidence": .5 if action != "inspect" else .1, "samples": 2, "delta": {}, "predictionError": .2} for action in actions}
        current = life(1)
        current["traces"] = [{"tick": 1, "epistemicObservation": {"body": {"energy": .7, "integrity": .8, "arousal": .3, "uncertainty": .6}, "perception": {}, "stateEnergy": .7, "stateIntegrity": .8, "causalModels": models}}]
        second = evolve_substrate(current, first); epistemic = second["authority"]["epistemic"]
        self.assertEqual(epistemic["active"]["targetAction"], "inspect")
        self.assertEqual(second["authority"]["epistemicCursor"], 1)
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["epistemic"], epistemic)

    def test_recursive_authority_forms_commitment_and_evaluates_choice_once(self):
        initial = life(0); initial["traces"] = []
        initial["consciousness"]["recursiveSelf"] = {"appraisals": [], "commitments": [], "lastRegret": 0, "lastEndorsement": .5, "counterfactualResponsibility": 0}
        first = evolve_substrate(initial)
        imagination = [{"action": action, "expectedEnergy": .75 if action == "rest" else .55, "expectedIntegrity": .8, "expectedUncertainty": .4, "expectedValence": .6, "desirability": .8 if action == "rest" else .5, "confidence": .7} for action in ("rest", "explore", "resource", "avoid", "inspect")]
        observation = {"body": {"energy": .5, "integrity": .8, "arousal": .3, "uncertainty": .5}, "goals": [{"id": "g", "dimension": "energy", "target": .8, "urgency": .8, "persistence": .9, "evidence": 50, "bornTick": 0}], "actionProfile": {action: .2 for action in ("explore", "resource", "avoid", "rest", "inspect")}, "selfContinuity": .7, "imagination": imagination, "action": "rest", "outcome": .1, "agency": .6}
        current = life(1); current["traces"] = [{"tick": 1, "recursiveObservation": observation}]
        second = evolve_substrate(current, first); recursive = second["authority"]["recursiveSelf"]
        self.assertEqual(len(recursive["appraisals"]), 5)
        self.assertEqual(recursive["commitments"][0]["kept"], 1)
        self.assertGreater(recursive["lastEndorsement"], .5)
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["recursiveSelf"], recursive)

    def test_attention_authority_learns_access_and_selects_next_target_once(self):
        initial = life(0); initial["traces"] = []
        initial["consciousness"]["attentionSchema"] = {"accessPredictionError": 0, "accessConfidence": 0, "controlEfficacy": 0, "bottleneck": 0, "samples": 0, "reliability": {}, "history": [], "effort": .25, "cumulativeCost": 0}
        first = evolve_substrate(initial)
        observation = {"predicted": "signal", "target": "signal", "actual": "signal", "unconsciousCount": 3, "backgroundCount": 2, "candidates": [{"kind": "resource", "salience": .5, "selfRelevance": .5, "persistence": .3}, {"kind": "signal", "salience": .75, "selfRelevance": .7, "persistence": .4}]}
        current = life(1); current["traces"] = [{"tick": 1, "attentionObservation": observation}]
        second = evolve_substrate(current, first); authority = second["authority"]
        self.assertEqual(authority["attentionSchema"]["samples"], 1)
        self.assertGreater(authority["attentionSchema"]["controlEfficacy"], 0)
        self.assertEqual(authority["attentionIntent"]["target"], "signal")
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["attentionSchema"], authority["attentionSchema"])

    def test_social_authority_learns_only_from_public_evidence_and_tracks_false_belief(self):
        initial = life(0); initial["traces"] = []
        initial["consciousness"]["social"] = {"estimatedNeed": .5, "estimatedUncertainty": .5, "intent": {"seek": .25, "avoid": .25, "sample": .25, "idle": .25}, "predictedAction": "idle", "confidence": 0, "predictionError": .5, "perspectiveSeparation": 0, "samples": 0, "observations": [], "attributedResources": [], "jointAttention": 0, "beliefDivergence": 0, "falseBeliefActive": False}
        substrate = evolve_substrate(initial)
        seen = {"awake": True, "other": {"tick": 1, "x": 0, "y": 0, "heading": 0, "action": "seek", "proximity": .5}, "evidence": [{"id": 7, "x": 10, "y": 0, "present": True}]}
        current = life(1); current["traces"] = [{"tick": 1, "socialObservation": seen}]; substrate = evolve_substrate(current, substrate)
        absent = {"awake": True, "other": {"tick": 2, "x": 0, "y": 0, "heading": math.pi, "action": "idle", "proximity": .5}, "evidence": [{"id": 7, "x": 10, "y": 0, "present": False}]}
        current = life(2); current["traces"] = [{"tick": 1, "socialObservation": seen}, {"tick": 2, "socialObservation": absent}]; second = evolve_substrate(current, substrate)
        social = second["authority"]["social"]
        self.assertEqual(social["samples"], 2)
        self.assertTrue(social["falseBeliefActive"])
        self.assertGreater(social["perspectiveSeparation"], 0)
        self.assertNotIn("hidden", str(current["traces"]))
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["social"], social)

    def test_communication_authority_emits_private_glyph_and_prepares_repair(self):
        initial = life(0); initial["traces"] = []
        initial["consciousness"]["communication"] = {"lastExpressionTick": 0, "associations": {}, "communicativeAgency": 0, "mutualGrounding": 0, "responseSurprise": 0, "lastResponse": "none", "totalCost": 0}
        substrate = evolve_substrate(initial)
        statement = {"observedOther": "idle", "otherPresence": .8, "dreamMode": "wake", "energy": .7, "position": {"x": 5, "y": 6}, "socialPulseActive": False, "expression": {"tick": 1, "glyph": "⌁", "confidence": .8, "mode": "wake"}, "clusterCentroid": [0] * 9 + [.25]}
        current = life(1); current["traces"] = [{"tick": 1, "communicationObservation": statement}]; first = evolve_substrate(current, substrate)
        self.assertEqual(first["authority"]["communicationEmission"]["glyph"], "⌁")
        self.assertEqual(first["authority"]["communication"]["pending"]["expectedAction"], "resource")
        response = {**statement, "observedOther": "avoid", "expression": None, "socialPulseActive": True}
        current = life(2); current["traces"] = [{"tick": 1, "communicationObservation": statement}, {"tick": 2, "communicationObservation": response}]; second = evolve_substrate(current, first)
        communication = second["authority"]["communication"]
        self.assertEqual(communication["lastResponse"], "misunderstood")
        self.assertEqual(communication["repair"]["glyph"], "⌁")
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["communication"], communication)

    def test_personal_causal_models_learn_subjective_transition_once(self):
        initial = life(0); initial["traces"] = []
        actions = ("explore", "resource", "avoid", "rest", "inspect")
        initial["consciousness"]["causalModels"] = {action: {"action": action, "samples": 0, "delta": {"energy": 0, "integrity": 0, "arousal": 0, "uncertainty": 0, "valence": 0}, "predictionError": 1, "confidence": 0} for action in actions}
        first = evolve_substrate(initial)
        observation = {"currentBody": {"energy": .6, "integrity": .8, "arousal": .3, "uncertainty": .5}, "previousAction": "rest", "previousBody": {"energy": .5, "integrity": .8, "arousal": .3, "uncertainty": .6}, "valenceDelta": .03}
        current = life(1); current["traces"] = [{"tick": 1, "causalObservation": observation}]; second = evolve_substrate(current, first)
        model = second["authority"]["causalModels"]["rest"]
        self.assertEqual(model["samples"], 1)
        self.assertGreater(model["delta"]["energy"], 0)
        self.assertLess(model["delta"]["uncertainty"], 0)
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["causalModels"], second["authority"]["causalModels"])

    def test_interoception_and_spatial_rng_are_deterministic_and_consumed_once(self):
        initial = life(0); initial["traces"] = []; initial["interoceptionRng"] = 123; initial["spatialRng"] = 456
        initial["consciousness"]["interoception"] = {"energy": .5, "integrity": .7, "arousal": .3, "uncertainty": .6, "precision": .4}
        initial["consciousness"]["spatial"] = {"x": 50, "y": 50, "heading": 0, "uncertainty": .18, "mapSurprise": 0, "coherence": .3, "landmarks": []}
        first = evolve_substrate(initial)
        trace = {"tick": 1, "interoceptionObservation": {"truth": {"energy": .8, "integrity": .9, "arousal": .2, "uncertainty": .4}, "inspect": True}, "spatialObservation": {"last": {"positionBefore": {"x": 50, "y": 50}, "positionAfter": {"x": 51, "y": 50}, "headingBefore": 0, "headingAfter": .1}, "scene": {"resource": {"id": 7, "bearing": 0, "distance": 10, "strength": .5, "source": "sensed", "confidence": .8}}}}
        current = life(1); current["traces"] = [trace]; second = evolve_substrate(current, first); authority = second["authority"]
        self.assertNotEqual(authority["interoceptionRng"], 123)
        self.assertNotEqual(authority["spatialRng"], 456)
        self.assertEqual(authority["spatial"]["landmarks"][0]["id"], 7)
        duplicate = evolve_substrate(current, second)
        self.assertEqual(duplicate["authority"]["interoception"], authority["interoception"])
        self.assertEqual(duplicate["authority"]["spatial"], authority["spatial"])


if __name__ == "__main__":
    unittest.main()
