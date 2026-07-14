"""Deterministic, GPU-ready recurrent substrate for the digital organism.

The implementation deliberately uses only the standard library today.  The
public state protocol keeps the numerical backend explicit so a Torch MPS or
CUDA implementation can replace the list backend without changing identity or
snapshot semantics.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import math
from typing import Any
import copy

PROTOCOL_VERSION = 1
LATENT_SIZE = 64


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _number(mapping: dict[str, Any], key: str, default: float = 0.0) -> float:
    value = mapping.get(key, default)
    return float(value) if isinstance(value, (int, float)) and math.isfinite(value) else default


def _kind_axis(kind: str | None, index: int) -> float:
    if not kind:
        return 0.0
    digest = hashlib.blake2s(f"{kind}:{index}".encode(), digest_size=4).digest()
    return int.from_bytes(digest, "big") / 2**31 - 1.0


def _features(life: dict[str, Any]) -> list[float]:
    state = life.get("state") or {}
    consciousness = life.get("consciousness") or {}
    organismic = consciousness.get("organismic") or {}
    affect = consciousness.get("affect") or {}
    field_state = consciousness.get("phenomenalField") or {}
    quality = field_state.get("quality") or {}
    workspace = consciousness.get("workspace") or {}
    foreground = workspace.get("foreground") or {}
    base = [
        _number(state, "energy"), _number(state, "integrity"),
        _number(state, "arousal"), _number(state, "uncertainty"),
        _number(state, "coherence"), _number(state, "curiosity"),
        _number(state, "agency"), _number(state, "valence"),
        _number(organismic, "membraneIntegrity"), _number(organismic, "selfProduction"),
        _number(organismic, "operationalClosure"), _number(organismic, "viability"),
        (_number(affect, "tone") + 1.0) / 2.0,
        (_number(affect, "mood") + 1.0) / 2.0,
        _number(field_state, "integration"), _number(field_state, "differentiation"),
        _number(field_state, "exclusion"), _number(quality, "external"),
        _number(quality, "internal"), _number(quality, "temporal"),
        _number(quality, "social"), _number(quality, "epistemic"),
        _number(workspace, "ignition"), _number(workspace, "continuity"),
    ]
    kind = foreground.get("kind") if isinstance(foreground, dict) else None
    return base + [_kind_axis(kind, i) * 0.5 + 0.5 for i in range(8)]


def _initial_latent(seed: int) -> list[float]:
    values: list[float] = []
    x = seed & 0xFFFFFFFF
    for _ in range(LATENT_SIZE):
        x = (1664525 * x + 1013904223) & 0xFFFFFFFF
        values.append((x / 2**32 - 0.5) * 0.06)
    return values


def _organismic_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], float]:
    consciousness = life.get("consciousness") or {}
    source = (previous or {}).get("organismic") or consciousness.get("organismic") or {}
    state = life.get("state") or {}
    organismic = {
        "membraneIntegrity": _number(source, "membraneIntegrity", .82),
        "permeability": _number(source, "permeability", .18),
        "selfProduction": _number(source, "selfProduction", .35),
        "operationalClosure": _number(source, "operationalClosure", .45),
        "viability": _number(source, "viability", .75),
        "mode": source.get("mode") if source.get("mode") in ("active", "conserve", "arrest") else "active",
        "arrestTicks": int(source.get("arrestTicks", 0)),
        "repairs": int(source.get("repairs", 0)),
        "cumulativeCost": _number(source, "cumulativeCost"),
    }
    traces = sorted((trace for trace in life.get("traces", []) if isinstance(trace, dict) and int(trace.get("tick", -1)) > from_tick), key=lambda trace: int(trace.get("tick", 0)))
    if not traces and int(life.get("tick", 0)) > from_tick:
        traces = [{} for _ in range(min(16, int(life["tick"]) - from_tick))]
    energy_cost = 0.0
    for trace in traces:
        action = trace.get("action")
        maintenance = .007 if action == "rest" else .003 if action == "inspect" else 0.0
        energy = max(0.0, _number(state, "energy") - energy_cost)
        repair = min(maintenance, energy * .018) * (1.0 - organismic["membraneIntegrity"])
        if repair > .00001:
            cost = repair * .42
            energy_cost += cost
            organismic["repairs"] += 1
            organismic["cumulativeCost"] += cost
        basal = .00008 if organismic["mode"] == "active" else .00004 if organismic["mode"] == "conserve" else .00001
        perception = trace.get("perception") or {}
        damage = _number(perception, "danger") * .009 + (1.0 - _number(state, "integrity")) * .0015
        organismic["membraneIntegrity"] = _clamp(organismic["membraneIntegrity"] + repair - damage - basal)
        organismic["permeability"] = 1.0 - organismic["membraneIntegrity"]
        production_target = _clamp(energy * .52 + _number(state, "integrity") * .48 + (.06 if action == "rest" else 0.0))
        organismic["selfProduction"] = _clamp(organismic["selfProduction"] * .96 + production_target * .04)
        closure_target = math.sqrt(organismic["membraneIntegrity"] * organismic["selfProduction"])
        organismic["operationalClosure"] = _clamp(organismic["operationalClosure"] * .95 + closure_target * .05)
        organismic["viability"] = _clamp(energy * .3 + _number(state, "integrity") * .3 + organismic["membraneIntegrity"] * .25 + organismic["operationalClosure"] * .15)
        organismic["mode"] = "arrest" if energy < .025 or organismic["viability"] < .15 else "conserve" if organismic["viability"] < .38 or energy < .16 else "active"
        organismic["arrestTicks"] = organismic["arrestTicks"] + 1 if organismic["mode"] == "arrest" else 0
    return organismic, energy_cost


def _quality_vector(life: dict[str, Any], trace: dict[str, Any]) -> list[float]:
    consciousness = life.get("consciousness") or {}
    field_state = consciousness.get("phenomenalField") or {}
    quality = field_state.get("quality") or {}
    body = trace.get("subjectiveBody") or consciousness.get("interoception") or {}
    organismic = consciousness.get("organismic") or {}
    affect = consciousness.get("affect") or {}
    narrative = consciousness.get("narrative") or {}
    meta = consciousness.get("meta") or {}
    return [_number(quality, key) for key in ("external", "internal", "temporal", "social", "epistemic")] + [
        (_number(affect, "tone") + 1.0) / 2.0, _number(body, "energy"), _number(body, "integrity"),
        _number(body, "arousal"), _number(body, "uncertainty"), _number(organismic, "viability"),
        _number(meta, "ownedBySelf"), _number(narrative, "selfContinuity"),
    ]


def _phenomenal_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> dict[str, Any]:
    consciousness = life.get("consciousness") or {}
    source = (previous or {}).get("manifold") or consciousness.get("manifold") or {}
    manifold = copy.deepcopy(source)
    manifold.setdefault("prototypes", [])
    manifold.setdefault("nextId", 1)
    for key in ("differentiation", "stimulusAmbiguity", "crossModalTransfer", "causalEfficacy"):
        manifold.setdefault(key, 0.0)
    traces = sorted((trace for trace in life.get("traces", []) if isinstance(trace, dict) and int(trace.get("tick", -1)) > from_tick), key=lambda trace: int(trace.get("tick", 0)))
    for trace in traces:
        workspace = trace.get("workspaceContent") or {}
        kind = workspace.get("kind")
        if not isinstance(kind, str):
            continue
        previous_node = next((node for node in manifold["prototypes"] if node.get("id") == manifold.get("currentId")), None)
        if previous_node:
            action = trace.get("action")
            if action in previous_node.get("actionValues", {}):
                sample = int(previous_node["actionSamples"].get(action, 0)) + 1
                evidence = max(-1.0, min(1.0, _number(trace, "outcome") * 2 + _number(trace.get("stateDelta") or {}, "valence") * 2 - _number(trace, "surprise") * .12))
                rate = max(.035, min(.2, 1 / math.sqrt(sample)))
                previous_node["actionValues"][action] += (evidence - previous_node["actionValues"][action]) * rate
                previous_node["actionSamples"][action] = sample
        vector = _quality_vector(life, trace)
        nodes = manifold["prototypes"]
        node = min(nodes, key=lambda item: math.dist(vector, item["centroid"]) / math.sqrt(len(vector))) if nodes else None
        distance = math.dist(vector, node["centroid"]) / math.sqrt(len(vector)) if node else 2.0
        if node is None or distance > .2:
            actions = {action: 0.0 for action in ("explore", "resource", "avoid", "rest", "inspect")}
            node = {"id": manifold["nextId"], "centroid": vector[:], "count": 0, "variance": 0.0, "sourceKinds": {}, "actionValues": actions, "actionSamples": actions.copy(), "stability": 0.0, "lastTick": int(trace.get("tick", life.get("tick", 0)))}
            manifold["nextId"] += 1
            nodes.append(node)
        old = node["centroid"][:]
        rate = min(.16, 1 / (int(node["count"]) + 1))
        node["centroid"] = [value + (vector[index] - value) * rate for index, value in enumerate(node["centroid"])]
        movement = math.dist(old, vector) / math.sqrt(len(vector))
        node["variance"] = node["variance"] * .92 + movement * .08
        node["count"] += 1
        node["lastTick"] = int(trace.get("tick", life.get("tick", 0)))
        node["stability"] = _clamp(node["stability"] * .94 + (1 - node["variance"] * 4) * .06)
        node["sourceKinds"][kind] = int(node["sourceKinds"].get(kind, 0)) + 1
        manifold["currentId"] = node["id"]
        pairs = [math.dist(a["centroid"], b["centroid"]) / math.sqrt(len(vector)) for index, a in enumerate(nodes) for b in nodes[index + 1:]]
        manifold["differentiation"] = _clamp((sum(pairs) / len(pairs) * 2) if pairs else 0.0)
        same = [candidate for candidate in nodes if int(candidate.get("sourceKinds", {}).get(kind, 0)) >= 2]
        manifold["stimulusAmbiguity"] = _clamp((len(same) - 1) / 3)
        kinds = len([value for value in node["sourceKinds"].values() if int(value) >= 2])
        samples = sum(int(value) for value in node["actionSamples"].values())
        magnitude = max(abs(float(value)) for value in node["actionValues"].values())
        confidence = 1 - math.exp(-samples / 10)
        manifold["crossModalTransfer"] = _clamp(manifold["crossModalTransfer"] * .96 + _clamp((kinds - 1) / 3) * confidence * .04)
        manifold["causalEfficacy"] = _clamp(manifold["causalEfficacy"] * .94 + magnitude * confidence * .06)
    manifold["prototypes"] = [node for node in manifold["prototypes"] if int(life.get("tick", 0)) - int(node.get("lastTick", 0)) < 3600 or float(node.get("stability", 0)) > .68][-32:]
    return manifold


def _cognitive_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int, cluster_assignments: dict[int, int] | None = None) -> tuple[list[dict[str, Any]], dict[str, float], int]:
    """Consolidate episodic evidence without allowing the browser to write conclusions."""
    bootstrapping = not previous or "memories" not in previous or "beliefs" not in previous
    memories = copy.deepcopy(life.get("memories") or []) if bootstrapping else copy.deepcopy(previous["memories"])
    beliefs_source = (life.get("beliefs") or {}) if bootstrapping else previous["beliefs"]
    beliefs = {key: _number(beliefs_source, key, default) for key, default in {
        "exploration": .5, "conservation": .5, "predictability": .5,
        "efficacy": .35, "externalTrust": .5, "stabilityPriority": .5,
    }.items()}
    next_memory_id = int(life.get("nextMemoryId", 1)) if bootstrapping else int(previous.get("nextMemoryId", 1))
    traces = [] if bootstrapping else sorted(
        (trace for trace in life.get("traces", []) if isinstance(trace, dict) and int(trace.get("tick", -1)) > from_tick),
        key=lambda trace: int(trace.get("tick", 0)),
    )
    for trace in traces:
        perception = trace.get("perception") or {}
        action = trace.get("action")
        outcome = _number(trace, "outcome")
        surprise = _number(trace, "surprise")
        attribution = _number(trace, "attribution")
        impact = _clamp(abs(outcome) * 2 + surprise * .5)
        dream_source = trace.get("dreamSourceMemoryId")
        if isinstance(dream_source, int):
            source_memory = next((memory for memory in memories if memory.get("id") == dream_source), None)
            if source_memory:
                source_memory["strength"] = _clamp(_number(source_memory, "strength") + .006 * (.5 + _number(source_memory, "impact")))
        trace_tick = int(trace.get("tick", 0))
        candidate = {
            "id": next_memory_id, "tick": trace_tick,
            "perception": copy.deepcopy(perception), "action": action,
            "prediction": _number(trace, "prediction"), "outcome": outcome,
            "surprise": surprise, "impact": impact, "attribution": attribution,
            "repetitions": 1, "strength": _clamp(.1 + impact * .65),
            "clusterId": (cluster_assignments or {}).get(trace_tick, trace.get("clusterId")),
        }
        next_memory_id += 1
        similar = next((memory for memory in memories if memory.get("action") == action and memory.get("clusterId") == candidate["clusterId"] and abs(_number(memory, "outcome") - outcome) < .06), None)
        if similar:
            similar["repetitions"] = int(similar.get("repetitions", 1)) + 1
            similar["strength"] = _clamp(_number(similar, "strength") + .035)
            similar["impact"] = (_number(similar, "impact") + impact) / 2
            similar["tick"] = candidate["tick"]
        else:
            memories.append(candidate)
        for memory in memories:
            memory["strength"] = _number(memory, "strength") * .9992
        memories = sorted((memory for memory in memories if _number(memory, "strength") > .055), key=lambda memory: _number(memory, "strength"), reverse=True)[:80]

        slow, evidence = .018, _clamp(abs(outcome) * 2 + surprise * .3)
        if action == "explore":
            beliefs["exploration"] = _clamp(beliefs["exploration"] + (1 if outcome > 0 else -1) * slow * evidence)
        if action in ("rest", "avoid"):
            beliefs["conservation"] = _clamp(beliefs["conservation"] + (1 if outcome > 0 else -1) * slow * evidence)
        beliefs["predictability"] = _clamp(beliefs["predictability"] + (.35 - surprise) * slow)
        beliefs["efficacy"] = _clamp(beliefs["efficacy"] + (attribution - .5) * slow * evidence)
        if sum(_number(perception, key) for key in ("resource", "signal", "danger")) > .15:
            beliefs["externalTrust"] = _clamp(beliefs["externalTrust"] + outcome * slow)
        beliefs["stabilityPriority"] = _clamp(beliefs["stabilityPriority"] + (slow if _number(perception, "danger") > .3 else -slow * .08) * evidence)
    return memories, beliefs, next_memory_id


SYMBOL_GLYPHS = ("◌", "⌁", "⟡", "⋮", "⊹", "⌬", "⧖", "∿", "⟁", "⊙", "⌇", "⟢", "⫶", "⧗", "⊚", "⌾")


def _vector_distance(a: list[float], b: list[float]) -> float:
    width = max(1, len(a), len(b))
    left = a[:width] + [.5] * max(0, width - len(a))
    right = b[:width] + [.5] * max(0, width - len(b))
    return math.sqrt(sum((left[index] - right[index]) ** 2 for index in range(width)) / width)


def _normalize_experience_vector(vector: Any) -> list[float]:
    values = [float(value) for value in vector if isinstance(value, (int, float)) and math.isfinite(value)] if isinstance(vector, list) else []
    return (values + [.5] * 11)[:11]


def _symbolic_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int, int, int, dict[int, int]]:
    bootstrapping = not previous or "clusters" not in previous or "symbols" not in previous
    if bootstrapping:
        traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
        cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0)))
        clusters = copy.deepcopy(life.get("clusters") or [])
        for cluster in clusters:
            cluster["centroid"] = _normalize_experience_vector(cluster.get("centroid"))
        return clusters, copy.deepcopy(life.get("symbols") or []), int(life.get("nextClusterId", 1)), int(life.get("nextSymbolId", 1)), cursor, {}
    clusters = copy.deepcopy(previous["clusters"])
    symbols = copy.deepcopy(previous["symbols"])
    next_cluster_id = int(previous.get("nextClusterId", 1))
    next_symbol_id = int(previous.get("nextSymbolId", 1))
    cursor = int(previous.get("symbolicCursor", from_tick))
    assignments: dict[int, int] = {}
    traces = sorted((trace for trace in life.get("traces", []) if isinstance(trace, dict) and int(trace.get("tick", -1)) > cursor), key=lambda trace: int(trace.get("tick", 0)))
    for trace in traces:
        vector = trace.get("experienceVector")
        if not isinstance(vector, list) or len(vector) != 11 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in vector):
            cursor = int(trace.get("tick", cursor))
            continue
        vector = [float(value) for value in vector]
        importance = _clamp(abs(_number(trace, "outcome")) * 2 + _number(trace, "surprise") * .5)
        cluster = min(clusters, key=lambda item: _vector_distance(vector, item["centroid"])) if clusters else None
        if cluster is None or _vector_distance(vector, cluster["centroid"]) > .24:
            cluster = {"id": next_cluster_id, "centroid": vector[:], "count": 0, "variance": 0.0, "importance": 0.0, "lastTick": int(trace.get("tick", 0))}
            next_cluster_id += 1
            clusters.append(cluster)
        old = cluster["centroid"][:]
        rate = min(.2, 1 / (int(cluster["count"]) + 1))
        cluster["centroid"] = [value + (vector[index] - value) * rate for index, value in enumerate(cluster["centroid"])]
        cluster["variance"] = _number(cluster, "variance") * .9 + _vector_distance(old, vector) * .1
        cluster["count"] = int(cluster["count"]) + 1
        cluster["importance"] = _number(cluster, "importance") * .92 + importance * .08
        cluster["lastTick"] = int(trace.get("tick", 0))
        if not cluster.get("symbolId") and cluster["count"] >= 7 and cluster["importance"] > .055:
            symbol_id = next_symbol_id
            next_symbol_id += 1
            symbol = {"id": symbol_id, "glyph": SYMBOL_GLYPHS[next_symbol_id % len(SYMBOL_GLYPHS)], "clusterId": cluster["id"], "bornTick": cluster["lastTick"], "stability": _clamp(1 - cluster["variance"] * 3), "drift": 0.0, "status": "forming"}
            cluster["symbolId"] = symbol_id
            symbols.append(symbol)
        if cluster.get("symbolId"):
            symbol = next(item for item in symbols if item.get("id") == cluster["symbolId"])
            symbol["drift"] = _clamp(cluster["variance"] * 2.5)
            symbol["stability"] = _clamp(_number(symbol, "stability") * .93 + (1 - cluster["variance"] * 3) * .07)
            symbol["status"] = "drifting" if symbol["drift"] > .45 else "stable" if symbol["stability"] > .72 and cluster["count"] > 12 else "forming"
        trace_tick = int(trace.get("tick", 0))
        assignments[trace_tick] = int(cluster["id"])
        cursor = trace_tick
    return clusters, symbols, next_cluster_id, next_symbol_id, cursor, assignments


def _affect_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "affect" not in previous
    source = (consciousness.get("affect") or {}) if bootstrapping else previous["affect"]
    affect = copy.deepcopy(source)
    affect.setdefault("experientialValues", {})
    affect.setdefault("evidence", {})
    affect.setdefault("tone", 0.0); affect.setdefault("mood", 0.0); affect.setdefault("precision", 0.0); affect.setdefault("qualityMismatch", 0.0)
    affect.setdefault("preferredQuality", {key: .2 for key in ("external", "internal", "temporal", "social", "epistemic")})
    affect.setdefault("history", [])
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("affectCursor", from_tick))
    if bootstrapping:
        return affect, cursor
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        observation = trace.get("affectObservation") or {}
        quality = observation.get("quality") or {}
        kind = observation.get("sourceKind")
        if isinstance(kind, str) and kind != "felt-valence":
            evidence_value = max(-1.0, min(1.0, _number(observation, "outcome") * 2 + _number(observation, "valenceDelta") * 3 - _number(observation, "surprise") * .18))
            count = int(affect["evidence"].get(kind, 0)) + 1
            affect["evidence"][kind] = count
            rate = max(.025, min(.12, 1 / math.sqrt(count + 2)))
            old_value = float(affect["experientialValues"].get(kind, 0))
            affect["experientialValues"][kind] = max(-1.0, min(1.0, old_value + (evidence_value - old_value) * rate))
            affect["lastContent"] = kind
            affect["tone"] = max(-1.0, min(1.0, affect["experientialValues"][kind] * .72 + (_number(observation, "currentValence", .5) - .5) * .56))
            affect["history"].append({"tick": int(trace.get("tick", 0)), "kind": kind, "tone": affect["tone"]})
            affect["history"] = affect["history"][-80:]
            if evidence_value > 0:
                for key in ("external", "internal", "temporal", "social", "epistemic"):
                    preferred = _number(affect["preferredQuality"], key, .2)
                    delta = max(-1.0, min(1.0, _number(quality, key) - preferred))
                    affect["preferredQuality"][key] = preferred + delta * .008 * evidence_value
        else:
            affect["tone"] = _number(affect, "tone") * .97
        affect["mood"] = max(-1.0, min(1.0, _number(affect, "mood") * .975 + _number(affect, "tone") * .025))
        affect["qualityMismatch"] = _clamp(sum(abs(_number(quality, key) - _number(affect["preferredQuality"], key, .2)) for key in ("external", "internal", "temporal", "social", "epistemic")) / 5)
        total_evidence = sum(int(value) for value in affect["evidence"].values())
        affect["precision"] = _clamp(1 - math.exp(-total_evidence / 45))
        cursor = int(trace.get("tick", cursor))
    return affect, cursor


def _dream_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "dream" not in previous
    source = (consciousness.get("dream") or {}) if bootstrapping else previous["dream"]
    dream = copy.deepcopy(source)
    dream.setdefault("mode", "wake"); dream.setdefault("restStreak", 0); dream.setdefault("sleepPressure", .22); dream.setdefault("vividness", 0.0); dream.setdefault("residue", 0.0); dream.setdefault("episodes", [])
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("dreamCursor", from_tick))
    if bootstrapping:
        return dream, cursor
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        observation = trace.get("dreamObservation") or {}
        tick = int(trace.get("tick", 0))
        dream["residue"] = _number(dream, "residue") * .96
        if dream.get("mode") == "wake":
            dream["restStreak"] = int(dream.get("restStreak", 0)) + 1 if observation.get("lastAction") == "rest" else 0
            dream["sleepPressure"] = _clamp(_number(dream, "sleepPressure", .22) + .003 + (.042 if observation.get("lastAction") == "rest" else 0))
            source_memory = observation.get("bestMemory")
            if isinstance(source_memory, dict) and dream["restStreak"] >= 4 and dream["sleepPressure"] > .36 and _number(observation, "arousal") < .42 and _number(observation, "danger") < .35:
                dream["mode"] = "dream"
                dream["sourceMemoryId"] = int(source_memory["id"])
                dream["vividness"] = _clamp(.25 + _number(source_memory, "strength") * .45 + _number(source_memory, "surprise") * .25)
                dream["episodes"].append({"startTick": tick, "sourceMemoryId": int(source_memory["id"]), "vividness": dream["vividness"], "novelty": _number(source_memory, "surprise")})
                dream["episodes"] = dream["episodes"][-16:]
        else:
            current = dream["episodes"][-1] if dream["episodes"] else None
            duration = tick - int(current.get("startTick", tick)) if current else 0
            active_memory = observation.get("activeMemory")
            if isinstance(active_memory, dict) and active_memory.get("id") == dream.get("sourceMemoryId"):
                strengthened = _clamp(_number(active_memory, "strength") + .006 * (.5 + _number(active_memory, "impact")))
                dream["vividness"] = _clamp(_number(dream, "vividness") * .94 + strengthened * .06)
            dream["sleepPressure"] = _clamp(_number(dream, "sleepPressure") - .045)
            if _number(observation, "danger") > .45 or _number(observation, "energy") < .2 or duration >= 16:
                dream["mode"] = "wake"
                dream["restStreak"] = 0
                dream["residue"] = _clamp(_number(dream, "vividness") * .75)
                if current:
                    current["endTick"] = tick
                dream.pop("sourceMemoryId", None)
                dream["vividness"] = _number(dream, "vividness") * .7
        if observation.get("organismicMode") == "arrest":
            dream["mode"] = "wake"; dream["vividness"] = 0.0
        cursor = tick
    return dream, cursor


def _narrative_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    actions = ("explore", "resource", "avoid", "rest", "inspect")
    dimensions = ("energy", "integrity", "arousal", "uncertainty")
    bootstrapping = not previous or "narrative" not in previous
    source = (consciousness.get("narrative") or {}) if bootstrapping else previous["narrative"]
    narrative = copy.deepcopy(source)
    narrative.setdefault("chapters", []); narrative.setdefault("actionProfile", {action: .2 for action in actions}); narrative.setdefault("selfContinuity", 0.0); narrative.setdefault("lastProcessedTick", 0)
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("narrativeCursor", from_tick))
    if bootstrapping:
        return narrative, cursor
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        observation = trace.get("narrativeObservation")
        tick = int(trace.get("tick", 0))
        if not isinstance(observation, dict):
            cursor = tick; continue
        source_tick = int(observation.get("sourceTick", 0))
        if source_tick <= int(narrative.get("lastProcessedTick", 0)):
            cursor = tick; continue
        narrative["lastProcessedTick"] = source_tick
        current_body, source_body = observation.get("currentBody") or {}, observation.get("sourceBody") or observation.get("currentBody") or {}
        draft = narrative.get("current")
        if not isinstance(draft, dict):
            draft = {"startTick": tick, "startBody": copy.deepcopy(source_body), "lastBody": copy.deepcopy(source_body), "foregroundCounts": {}, "actionCounts": {action: 0 for action in actions}, "attributionSum": 0.0, "surpriseSum": 0.0, "steps": 0, "goalSignature": str(observation.get("goalSignature", ""))}
            narrative["current"] = draft
        kind, foreground_id, previous_foreground = observation.get("foregroundKind"), observation.get("foregroundId"), draft.get("lastForeground")
        if isinstance(kind, str):
            draft["foregroundCounts"][kind] = int(draft["foregroundCounts"].get(kind, 0)) + 1
        action = observation.get("action")
        if action in actions:
            draft["actionCounts"][action] = int(draft["actionCounts"].get(action, 0)) + 1
        draft["attributionSum"] = _number(draft, "attributionSum") + _number(observation, "attribution")
        draft["surpriseSum"] = _number(draft, "surpriseSum") + _number(observation, "surprise")
        draft["steps"] = int(draft.get("steps", 0)) + 1
        draft["lastBody"] = copy.deepcopy(current_body)
        signature = str(observation.get("goalSignature", ""))
        boundary = (draft["steps"] >= 18 and isinstance(kind, str) and previous_foreground is not None and previous_foreground != foreground_id) or (draft["steps"] >= 6 and _number(observation, "surprise") > .55) or draft["steps"] >= 80 or (draft["steps"] >= 12 and signature != draft.get("goalSignature", ""))
        if isinstance(foreground_id, str): draft["lastForeground"] = foreground_id
        else: draft.pop("lastForeground", None)
        if boundary:
            dominant_action = max(actions, key=lambda candidate: (int(draft["actionCounts"].get(candidate, 0)), -actions.index(candidate)))
            dominant_content = max(draft["foregroundCounts"], key=draft["foregroundCounts"].get) if draft["foregroundCounts"] else None
            state_shift = {key: max(-1.0, min(1.0, _number(draft["lastBody"], key) - _number(draft["startBody"], key))) for key in dimensions}
            attribution = _number(draft, "attributionSum") / draft["steps"]
            causal_owner = "self" if attribution > .58 else "external" if attribution < .38 else "mixed"
            identity_impact = _clamp(sum(abs(state_shift[key]) for key in dimensions) / len(dimensions) * .55 + (_number(draft, "surpriseSum") / draft["steps"]) * .3 + abs(attribution - .5) * .3)
            goal_continuity = 1.0 if signature == draft.get("goalSignature", "") else .35
            chapter = {"id": f"chapter:{draft['startTick']}:{source_tick}", "startTick": draft["startTick"], "endTick": source_tick, "dominantAction": dominant_action, "stateShift": state_shift, "causalOwner": causal_owner, "identityImpact": identity_impact, "goalContinuity": goal_continuity}
            if dominant_content is not None: chapter["dominantContent"] = dominant_content
            narrative["chapters"].insert(0, chapter); narrative["chapters"] = narrative["chapters"][:40]
            total = max(1, len(narrative["chapters"]))
            for candidate in actions:
                count = sum(1 for item in narrative["chapters"] if item.get("dominantAction") == candidate)
                narrative["actionProfile"][candidate] = _number(narrative["actionProfile"], candidate, .2) * .82 + (count / total) * .18
            narrative["selfContinuity"] = _clamp(_number(narrative, "selfContinuity") * .85 + goal_continuity * .08 + (1 - identity_impact) * .07)
            narrative.pop("current", None)
        cursor = tick
    return narrative, cursor


def _goal_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, float], list[dict[str, Any]], int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "goals" not in previous
    setpoints = copy.deepcopy((consciousness.get("preferredSetpoints") or {}) if bootstrapping else previous["preferredSetpoints"])
    for dimension in ("energy", "integrity", "arousal", "uncertainty"):
        setpoints.setdefault(dimension, .5)
    goals = copy.deepcopy((consciousness.get("goals") or []) if bootstrapping else previous["goals"])
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("goalCursor", from_tick))
    if bootstrapping:
        return setpoints, goals, cursor
    dimensions = ("energy", "integrity", "arousal", "uncertainty")
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("goalObservation")
        if not isinstance(observation, dict):
            cursor = tick; continue
        body = observation.get("body") or {}
        if _number(observation, "valence") > .53 and _number(observation, "coherence") > .48:
            for dimension in dimensions:
                setpoints[dimension] += max(-1.0, min(1.0, _number(body, dimension) - setpoints[dimension])) * .0035
        for dimension in dimensions:
            target = setpoints[dimension]; gap = abs(target - _number(body, dimension))
            goal = next((item for item in goals if item.get("dimension") == dimension), None)
            if gap > .1:
                if goal is None:
                    goal = {"id": f"goal:{dimension}:{tick}", "dimension": dimension, "target": target, "urgency": 0.0, "persistence": 0.0, "evidence": 0, "bornTick": tick}
                    goals.append(goal)
                goal["target"] = target
                goal["urgency"] = _clamp(_number(goal, "urgency") * .88 + gap * .12)
                goal["persistence"] = _clamp(_number(goal, "persistence") + .018)
                goal["evidence"] = int(goal.get("evidence", 0)) + 1
            elif goal is not None:
                goal["urgency"] = _number(goal, "urgency") * .9
                goal["persistence"] = _number(goal, "persistence") * .995
        goals = [goal for goal in goals if _number(goal, "urgency") > .025 or _number(goal, "persistence") > .18]
        goals.sort(key=lambda goal: -_number(goal, "urgency") * _number(goal, "persistence"))
        goals = goals[:3]; cursor = tick
    return setpoints, goals, cursor


def _epistemic_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    actions = ("explore", "resource", "avoid", "rest", "inspect")
    bootstrapping = not previous or "epistemic" not in previous
    epistemic = copy.deepcopy((consciousness.get("epistemic") or {"history": []}) if bootstrapping else previous["epistemic"])
    epistemic.setdefault("history", [])
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("epistemicCursor", from_tick))
    if bootstrapping:
        return epistemic, cursor
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("epistemicObservation")
        if not isinstance(observation, dict):
            cursor = tick; continue
        models, perception, body = observation.get("causalModels") or {}, observation.get("perception") or {}, observation.get("body") or {}
        active = epistemic.get("active")
        if isinstance(active, dict) and observation.get("previousAction") == active.get("targetAction"):
            active["attempts"] = int(active.get("attempts", 0)) + 1
        if isinstance(active, dict):
            model = models.get(active.get("targetAction"), {})
            confidence = _number(model, "confidence")
            active["currentConfidence"] = confidence
            active["expectedInformationGain"] = _clamp(1 - confidence)
            active["resolution"] = _clamp(confidence - _number(active, "initialConfidence"))
            if confidence > .72 or int(active.get("attempts", 0)) >= 48:
                active["status"] = "resolved"
                epistemic["history"].insert(0, copy.deepcopy(active)); epistemic["history"] = epistemic["history"][:12]
                epistemic.pop("active", None); active = None
        viable = _number(body, "energy") > .28 and _number(body, "integrity") > .3 and _number(observation, "stateEnergy") > .12 and _number(observation, "stateIntegrity") > .2
        if isinstance(active, dict):
            active["status"] = "active" if viable else "suspended"
            cursor = tick; continue
        def feasible(action: str) -> bool:
            return action in ("inspect", "rest") or (action == "explore" and _number(perception, "signal") > .08) or (action == "resource" and _number(perception, "resource") > .08) or (action == "avoid" and _number(perception, "danger") > .08)
        candidates = [(action, models.get(action) or {}) for action in actions if feasible(action)]
        candidates.sort(key=lambda item: (_number(item[1], "confidence"), int(item[1].get("samples", 0))))
        if candidates and _number(candidates[0][1], "confidence") <= .82:
            action, model = candidates[0]; confidence = _number(model, "confidence")
            epistemic["active"] = {"id": f"question:{action}:{tick}", "targetAction": action, "bornTick": tick, "expectedInformationGain": 1 - confidence, "urgency": _clamp((1 - confidence) * .65 + _number(body, "uncertainty") * .35), "attempts": 0, "initialConfidence": confidence, "currentConfidence": confidence, "status": "active" if viable else "suspended"}
        cursor = tick
    return epistemic, cursor


def _recursive_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    actions = ("explore", "resource", "avoid", "rest", "inspect")
    bootstrapping = not previous or "recursiveSelf" not in previous
    recursive = copy.deepcopy((consciousness.get("recursiveSelf") or {}) if bootstrapping else previous["recursiveSelf"])
    recursive.setdefault("appraisals", []); recursive.setdefault("commitments", []); recursive.setdefault("lastRegret", 0.0); recursive.setdefault("lastEndorsement", .5); recursive.setdefault("counterfactualResponsibility", 0.0)
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("recursiveCursor", from_tick))
    if bootstrapping:
        return recursive, cursor
    def projected(future: dict[str, Any], dimension: str, body: dict[str, Any]) -> float:
        return _number(future, "expectedEnergy") if dimension == "energy" else _number(future, "expectedIntegrity") if dimension == "integrity" else _number(future, "expectedUncertainty") if dimension == "uncertainty" else _number(body, "arousal")
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("recursiveObservation")
        if not isinstance(observation, dict):
            cursor = tick; continue
        goals = [goal for goal in observation.get("goals", []) if isinstance(goal, dict)]
        for goal in (goal for goal in goals if _number(goal, "persistence") > .68 and int(goal.get("evidence", 0)) > 36):
            commitment = next((item for item in recursive["commitments"] if item.get("dimension") == goal.get("dimension")), None)
            if commitment is None:
                commitment = {"id": f"commitment:{goal.get('dimension')}:{tick}", "dimension": goal.get("dimension"), "target": _number(goal, "target"), "bornTick": tick, "strength": 0.0, "kept": 0, "broken": 0, "integrity": .5}
                recursive["commitments"].append(commitment)
            commitment["target"] = _number(goal, "target")
            commitment["strength"] = _clamp(_number(commitment, "strength") * .94 + (_number(goal, "persistence") * _number(goal, "urgency")) * .06)
        recursive["commitments"] = [item for item in recursive["commitments"] if _number(item, "strength") > .025 or int(item.get("kept", 0)) + int(item.get("broken", 0)) < 12][:4]
        profile = observation.get("actionProfile") or {}; max_profile = max([_number(profile, action) for action in actions] + [.01])
        body = observation.get("body") or {}; imagination = [future for future in observation.get("imagination", []) if isinstance(future, dict)]
        appraisals = []
        for future in imagination:
            action = future.get("action"); identity_fit = _clamp(_number(profile, action) / max_profile)
            urgency_sum = sum(_number(goal, "urgency") for goal in goals)
            goal_alignment = sum((1 - abs(projected(future, str(goal.get("dimension")), body) - _number(goal, "target"))) * _number(goal, "urgency") for goal in goals) / max(.001, urgency_sum) if goals else .5
            approval = _clamp(_number(future, "desirability") * .42 + identity_fit * .18 + goal_alignment * .25 + _number(observation, "selfContinuity") * .15)
            appraisals.append({"action": action, "identityFit": identity_fit, "futureApproval": approval, "anticipatedRegret": 0.0, "goalAlignment": goal_alignment})
        best = max([_number(item, "futureApproval") for item in appraisals] + [0.0])
        for item in appraisals:
            item["anticipatedRegret"] = _clamp(best - _number(item, "futureApproval") + (1 - _number(item, "identityFit")) * .08)
        recursive["appraisals"] = appraisals
        action = observation.get("action"); chosen = next((item for item in appraisals if item.get("action") == action), None)
        if chosen is not None:
            outcome = _number(observation, "outcome")
            recursive["lastRegret"] = _clamp(best - _number(chosen, "futureApproval") + max(0.0, -outcome) * .5)
            recursive["lastEndorsement"] = _clamp(_number(chosen, "futureApproval") + max(-.2, min(.2, outcome)))
            recursive["counterfactualResponsibility"] = _clamp(_number(recursive, "counterfactualResponsibility") * .92 + _number(recursive, "lastRegret") * _number(observation, "agency") * .08)
            imagined = next((future for future in imagination if future.get("action") == action), None)
            if imagined is not None:
                for commitment in recursive["commitments"]:
                    dimension = str(commitment.get("dimension")); target = _number(commitment, "target")
                    improvement = abs(_number(body, dimension) - target) - abs(projected(imagined, dimension, body) - target)
                    if improvement > .004: commitment["kept"] = int(commitment.get("kept", 0)) + 1
                    elif improvement < -.004: commitment["broken"] = int(commitment.get("broken", 0)) + 1
                    commitment["integrity"] = _clamp((int(commitment.get("kept", 0)) + 1) / (int(commitment.get("kept", 0)) + int(commitment.get("broken", 0)) + 2))
        cursor = tick
    return recursive, cursor


def _attention_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int, dict[str, Any]]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "attentionSchema" not in previous
    schema = copy.deepcopy((consciousness.get("attentionSchema") or {}) if bootstrapping else previous["attentionSchema"])
    schema.setdefault("accessPredictionError", 0.0); schema.setdefault("accessConfidence", 0.0); schema.setdefault("controlEfficacy", 0.0); schema.setdefault("bottleneck", 0.0); schema.setdefault("samples", 0); schema.setdefault("reliability", {}); schema.setdefault("history", []); schema.setdefault("effort", .25); schema.setdefault("cumulativeCost", 0.0)
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("attentionCursor", from_tick))
    latest_candidates: list[dict[str, Any]] = []
    if not bootstrapping:
        for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
            tick = int(trace.get("tick", 0)); observation = trace.get("attentionObservation")
            if not isinstance(observation, dict):
                cursor = tick; continue
            predicted, target, actual = observation.get("predicted"), observation.get("target"), observation.get("actual")
            error = 0 if predicted == actual else 1; target_hit = target is not None and target == actual
            schema["samples"] = int(schema.get("samples", 0)) + 1
            if predicted is None: schema.pop("predictedNext", None)
            else: schema["predictedNext"] = predicted
            if target is None: schema.pop("attentionTarget", None)
            else: schema["attentionTarget"] = target
            schema["accessPredictionError"] = _clamp(_number(schema, "accessPredictionError") * .9 + error * .1)
            schema["accessConfidence"] = _clamp((1 - math.exp(-int(schema["samples"]) / 24)) * (1 - _number(schema, "accessPredictionError")))
            schema["controlEfficacy"] = _clamp(_number(schema, "controlEfficacy") * .94 + (1 if target_hit else 0) * .06)
            if target is not None: schema["effort"] = _clamp(_number(schema, "effort", .25) + (-.012 if target_hit else .035) * (1 - _number(schema, "controlEfficacy") * .5))
            else: schema["effort"] = _clamp(_number(schema, "effort", .25) - .006)
            schema["cumulativeCost"] = _number(schema, "cumulativeCost") + (_number(schema, "effort") * .0015 if target is not None else 0)
            unconscious, background = int(observation.get("unconsciousCount", 0)), int(observation.get("backgroundCount", 0))
            denominator = unconscious + background + (1 if actual is not None else 0)
            schema["bottleneck"] = _clamp(_number(schema, "bottleneck") * .9 + (unconscious / (denominator or 1)) * .1)
            if predicted is not None:
                old = _number(schema["reliability"], str(predicted), .3)
                schema["reliability"][str(predicted)] = _clamp(old * .94 + (0 if error else 1) * .06)
            event = {"tick": tick, "error": error}
            if predicted is not None: event["predicted"] = predicted
            if actual is not None: event["actual"] = actual
            if target is not None: event["target"] = target
            schema["history"].append(event); schema["history"] = schema["history"][-80:]
            latest_candidates = [item for item in observation.get("candidates", []) if isinstance(item, dict)]
            cursor = tick
    def access_score(candidate: dict[str, Any]) -> float:
        return _number(candidate, "salience") * .55 + _number(candidate, "selfRelevance") * .25 + _number(candidate, "persistence") * .12
    viable = [item for item in latest_candidates if _number(item, "salience") > .16 and item.get("kind") != "access-surprise"]
    target = None
    if viable:
        leader = max(viable, key=access_score)
        if _number(schema, "effort") > .9 and _number(schema, "controlEfficacy") < .12:
            target = leader.get("kind")
        else:
            reachable = [item for item in viable if access_score(item) + (.11 + _number(schema, "effort") * .38) * .55 >= access_score(leader) + .06]
            pool = reachable or viable
            target = max(pool, key=lambda item: _number(item, "salience") * (1 - _number(schema["reliability"], str(item.get("kind")), .25)) + .12 * _number(item, "selfRelevance")).get("kind")
    intent = {"basedOnTick": int(life.get("tick", 0))}
    if target is not None: intent["target"] = target
    return schema, cursor, intent


def _social_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    actions = ("seek", "avoid", "sample", "idle")
    bootstrapping = not previous or "social" not in previous
    social = copy.deepcopy((consciousness.get("social") or {}) if bootstrapping else previous["social"])
    social.setdefault("estimatedNeed", .5); social.setdefault("estimatedUncertainty", .5); social.setdefault("intent", {action: .25 for action in actions}); social.setdefault("predictedAction", "idle"); social.setdefault("confidence", 0.0); social.setdefault("predictionError", .5); social.setdefault("perspectiveSeparation", 0.0); social.setdefault("samples", 0); social.setdefault("observations", []); social.setdefault("attributedResources", []); social.setdefault("jointAttention", 0.0); social.setdefault("beliefDivergence", 0.0); social.setdefault("falseBeliefActive", False)
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("socialCursor", from_tick))
    if bootstrapping:
        return social, cursor
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); wrapper = trace.get("socialObservation")
        if not isinstance(wrapper, dict) or not wrapper.get("awake"):
            cursor = tick; continue
        observation = wrapper.get("other") or {}; evidence = [item for item in wrapper.get("evidence", []) if isinstance(item, dict)]
        action = observation.get("action"); error = 0 if action == social.get("predictedAction") else 1
        social["samples"] = int(social.get("samples", 0)) + 1
        social["predictionError"] = _clamp(_number(social, "predictionError") * .9 + error * .1)
        social["intent"][action] = _clamp(_number(social["intent"], str(action)) * .88 + .12)
        for candidate in actions:
            if candidate != action: social["intent"][candidate] = _number(social["intent"], candidate) * .96
        total = sum(_number(social["intent"], candidate) for candidate in actions)
        for candidate in actions: social["intent"][candidate] = _number(social["intent"], candidate) / total
        social["estimatedNeed"] = _clamp(_number(social, "estimatedNeed") * .94 + (.85 if action == "seek" else .25) * .06)
        social["estimatedUncertainty"] = _clamp(_number(social, "estimatedUncertainty") * .94 + (.85 if action == "sample" else .3) * .06)
        social["predictedAction"] = max(actions, key=lambda candidate: _number(social["intent"], candidate))
        social["confidence"] = _clamp((1 - math.exp(-int(social["samples"]) / 30)) * (1 - _number(social, "predictionError") * .65))
        social["perspectiveSeparation"] = _clamp(_number(social, "perspectiveSeparation") * .97 + (.025 if error else .008))
        jointly_attended = 0
        for resource in evidence:
            angle = math.atan2(_number(resource, "y") - _number(observation, "y"), _number(resource, "x") - _number(observation, "x")) - _number(observation, "heading")
            angular_difference = abs(math.atan2(math.sin(angle), math.cos(angle)))
            visible = math.hypot(_number(resource, "x") - _number(observation, "x"), _number(resource, "y") - _number(observation, "y")) < 26 and angular_difference < math.pi * .42
            old = next((item for item in social["attributedResources"] if item.get("entityId") == resource.get("id")), None)
            if resource.get("present") and visible:
                jointly_attended += 1
                if old is not None:
                    old["x"], old["y"] = _number(resource, "x"), _number(resource, "y")
                    old["confidence"] = _clamp(_number(old, "confidence") * .7 + .3); old["lastAttributedSightTick"] = int(observation.get("tick", tick))
                else:
                    social["attributedResources"].append({"entityId": resource.get("id"), "x": _number(resource, "x"), "y": _number(resource, "y"), "confidence": .45, "lastAttributedSightTick": int(observation.get("tick", tick))})
            if not resource.get("present") and visible and old is not None: old["confidence"] = 0.0
        for belief in social["attributedResources"]: belief["confidence"] = _number(belief, "confidence") * .998
        social["attributedResources"] = [belief for belief in social["attributedResources"] if _number(belief, "confidence") > .06][-12:]
        if social["attributedResources"]: social["inferredTargetId"] = max(social["attributedResources"], key=lambda item: _number(item, "confidence")).get("entityId")
        else: social.pop("inferredTargetId", None)
        absent = {item.get("id") for item in evidence if not item.get("present")}
        social["falseBeliefActive"] = any(item.get("entityId") in absent and _number(item, "confidence") > .2 for item in social["attributedResources"])
        social["beliefDivergence"] = _clamp(_number(social, "beliefDivergence") * .9 + (1 if social["falseBeliefActive"] else 0) * .1)
        social["jointAttention"] = _clamp(_number(social, "jointAttention") * .92 + (1 if jointly_attended else 0) * .08)
        if social["falseBeliefActive"]: social["perspectiveSeparation"] = _clamp(_number(social, "perspectiveSeparation") + .025)
        social["observations"].append(copy.deepcopy(observation)); social["observations"] = social["observations"][-60:]
        cursor = tick
    return social, cursor


def _communication_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int, dict[str, Any] | None, float]:
    consciousness = life.get("consciousness") or {}
    actions = ("explore", "resource", "avoid", "rest", "inspect")
    bootstrapping = not previous or "communication" not in previous
    communication = copy.deepcopy((consciousness.get("communication") or {}) if bootstrapping else previous["communication"])
    communication.setdefault("lastExpressionTick", 0); communication.setdefault("associations", {}); communication.setdefault("communicativeAgency", 0.0); communication.setdefault("mutualGrounding", 0.0); communication.setdefault("responseSurprise", 0.0); communication.setdefault("lastResponse", "none"); communication.setdefault("totalCost", 0.0)
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("communicationCursor", from_tick))
    emission, cost = None, 0.0
    if bootstrapping:
        return communication, cursor, emission, cost
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("communicationObservation")
        if not isinstance(observation, dict):
            cursor = tick; continue
        communication["lastResponse"] = "none"; communication["responseSurprise"] = _number(communication, "responseSurprise") * .9
        pending = communication.get("pending")
        if isinstance(pending, dict) and tick > int(pending.get("tick", 0)):
            association = communication["associations"].get(pending.get("glyph")); observed = observation.get("observedOther")
            if isinstance(association, dict):
                expected_action = pending.get("expectedAction")
                compatible = observed == ("seek" if expected_action == "resource" else "avoid" if expected_action == "avoid" else "idle" if expected_action == "rest" else "sample")
                echoed = observation.get("otherPulseGlyph") == pending.get("glyph")
                if compatible:
                    expected = _number(association, "efficacy"); association["responses"] = int(association.get("responses", 0)) + 1; association["efficacy"] = _clamp(expected * .84 + .16)
                    communication["communicativeAgency"] = _clamp(_number(communication, "communicativeAgency") * .91 + .09); communication["responseSurprise"] = _clamp(abs(1 - expected)); communication["lastResponse"] = "confirmed" if echoed else "response"
                    if echoed:
                        association["confirmations"] = int(association.get("confirmations", 0)) + 1; association["conventionStability"] = _clamp(_number(association, "conventionStability") * .9 + .1); communication["mutualGrounding"] = _clamp(_number(communication, "mutualGrounding") * .94 + .06)
                    communication.pop("pending", None); communication.pop("repair", None)
                elif observed != "idle" or tick - int(pending.get("tick", 0)) > 2:
                    association["misunderstandings"] = int(association.get("misunderstandings", 0)) + 1; association["efficacy"] = _number(association, "efficacy") * .86; association["conventionStability"] = _number(association, "conventionStability") * .88
                    communication["communicativeAgency"] = _number(communication, "communicativeAgency") * .96; communication["mutualGrounding"] = _number(communication, "mutualGrounding") * .97; communication["responseSurprise"] = _clamp(.55 + _number(association, "efficacy") * .35); communication["lastResponse"] = "misunderstood"
                    if int(association.get("repairs", 0)) < 3:
                        old_repair = communication.get("repair") or {}; communication["repair"] = {"glyph": pending.get("glyph"), "expectedAction": expected_action, "dueTick": tick + 3, "attempts": int(old_repair.get("attempts", 0)) + 1}
                    else: association["suppressedUntil"] = tick + 180
                    communication.pop("pending", None)
                elif tick - int(pending.get("tick", 0)) > 4:
                    expected = _number(association, "efficacy"); association["efficacy"] = expected * .88; communication["communicativeAgency"] = _number(communication, "communicativeAgency") * .94; communication["responseSurprise"] = _clamp(expected); communication["lastResponse"] = "silence"; communication.pop("pending", None)
        expression = observation.get("expression"); centroid = observation.get("clusterCentroid") or []
        expected_index = max(0, min(4, math.floor((_number({"value": centroid[9] if len(centroid) > 9 else .5}, "value") * 4) + .5)))
        expected_action = actions[expected_index]
        repair = communication.get("repair"); intended = repair.get("expectedAction") if isinstance(repair, dict) else expected_action
        affordable = _number(observation, "energy") > .08 or intended in ("resource", "rest")
        can_emit = communication.get("pending") is None and not observation.get("socialPulseActive") and _number(observation, "otherPresence") > .2 and observation.get("dreamMode") == "wake" and affordable
        position = observation.get("position") or {}
        if can_emit and isinstance(repair, dict) and tick >= int(repair.get("dueTick", 0)):
            association = communication["associations"].get(repair.get("glyph"))
            if isinstance(association, dict):
                association["attempts"] = int(association.get("attempts", 0)) + 1; association["repairs"] = int(association.get("repairs", 0)) + 1
                communication["pending"] = {"glyph": repair.get("glyph"), "tick": tick, "expectedAction": repair.get("expectedAction"), "phase": "repair"}
                emission = {"glyph": repair.get("glyph"), "position": {"x": _number(position, "x"), "y": _number(position, "y")}, "phase": "repair", "bornTick": tick}; cost += .006; communication["totalCost"] = _number(communication, "totalCost") + .006; communication.pop("repair", None)
        elif can_emit and isinstance(expression, dict) and int(expression.get("tick", 0)) > int(communication.get("lastExpressionTick", 0)) and _number(expression, "confidence") > .45:
            communication["lastExpressionTick"] = int(expression.get("tick", 0)); glyph = expression.get("glyph")
            association = communication["associations"].get(glyph)
            if not isinstance(association, dict):
                association = {"attempts": 0, "responses": 0, "efficacy": .2, "expectedAction": expected_action, "misunderstandings": 0, "repairs": 0, "confirmations": 0, "conventionStability": 0.0, "suppressedUntil": 0}; communication["associations"][glyph] = association
            association["expectedAction"] = expected_action
            if tick >= int(association.get("suppressedUntil", 0)):
                association["attempts"] = int(association.get("attempts", 0)) + 1; communication["pending"] = {"glyph": glyph, "tick": tick, "expectedAction": expected_action, "phase": "statement"}
                emission = {"glyph": glyph, "position": {"x": _number(position, "x"), "y": _number(position, "y")}, "phase": "statement", "bornTick": tick}; cost += .004; communication["totalCost"] = _number(communication, "totalCost") + .004
        cursor = tick
    return communication, cursor, emission, cost


def _causal_model_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "causalModels" not in previous
    models = copy.deepcopy((consciousness.get("causalModels") or {}) if bootstrapping else previous["causalModels"])
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("causalCursor", from_tick))
    if bootstrapping:
        return models, cursor
    dimensions = ("energy", "integrity", "arousal", "uncertainty", "valence")
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("causalObservation")
        if not isinstance(observation, dict) or not isinstance(observation.get("previousBody"), dict) or observation.get("previousAction") not in models:
            cursor = tick; continue
        action = observation["previousAction"]; model = models[action]; current, old = observation.get("currentBody") or {}, observation["previousBody"]
        observed = {dimension: (_number(observation, "valenceDelta") if dimension == "valence" else _number(current, dimension) - _number(old, dimension)) for dimension in dimensions}
        delta = model.get("delta") or {}; error = sum(abs(observed[dimension] - _number(delta, dimension)) for dimension in dimensions) / 5
        model["samples"] = int(model.get("samples", 0)) + 1; rate = max(.035, min(.24, 1 / int(model["samples"])))
        for dimension in dimensions:
            delta[dimension] = _number(delta, dimension) + max(-1.0, min(1.0, observed[dimension] - _number(delta, dimension))) * rate
        model["delta"] = delta; model["predictionError"] = _clamp(_number(model, "predictionError") * .92 + error * .08); model["confidence"] = _clamp((1 - math.exp(-int(model["samples"]) / 14)) * (1 - _number(model, "predictionError")))
        cursor = tick
    return models, cursor


def _interoception_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int, int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "interoception" not in previous
    body = copy.deepcopy((consciousness.get("interoception") or {}) if bootstrapping else previous["interoception"])
    rng = int(life.get("interoceptionRng", 0)) & 0xFFFFFFFF if bootstrapping else int(previous.get("interoceptionRng", life.get("interoceptionRng", 0))) & 0xFFFFFFFF
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("interoceptionCursor", from_tick))
    if bootstrapping:
        return body, rng, cursor
    def noise(scale: float) -> float:
        nonlocal rng
        rng = (rng * 1664525 + 1013904223) & 0xFFFFFFFF
        return (rng / 4294967296 - .5) * scale
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("interoceptionObservation")
        if not isinstance(observation, dict):
            cursor = tick; continue
        truth = observation.get("truth") or {}; precision = max(.12, _clamp(_number(body, "precision") + (.035 if observation.get("inspect") else -.001)))
        rate, error_scale = .045 + precision * .07, .18 * (1 - precision) + .025
        body = {"energy": _clamp(_number(body, "energy") + (_number(truth, "energy") - _number(body, "energy")) * rate + noise(error_scale)), "integrity": _clamp(_number(body, "integrity") + (_number(truth, "integrity") - _number(body, "integrity")) * rate + noise(error_scale * .7)), "arousal": _clamp(_number(body, "arousal") + (_number(truth, "arousal") - _number(body, "arousal")) * rate + noise(error_scale * .55)), "uncertainty": _clamp(_number(body, "uncertainty") + (_number(truth, "uncertainty") - _number(body, "uncertainty")) * rate + noise(error_scale * .5)), "precision": precision}
        cursor = tick
    return body, rng, cursor


def _spatial_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int, int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "spatial" not in previous
    spatial = copy.deepcopy((consciousness.get("spatial") or {}) if bootstrapping else previous["spatial"])
    rng = int(life.get("spatialRng", 0)) & 0xFFFFFFFF if bootstrapping else int(previous.get("spatialRng", life.get("spatialRng", 0))) & 0xFFFFFFFF
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    cursor = max((int(trace.get("tick", 0)) for trace in traces), default=int(life.get("tick", 0))) if bootstrapping else int(previous.get("spatialCursor", from_tick))
    spatial.setdefault("x", 50.0); spatial.setdefault("y", 50.0); spatial.setdefault("heading", 0.0); spatial.setdefault("uncertainty", .18); spatial.setdefault("mapSurprise", 0.0); spatial.setdefault("coherence", .3); spatial.setdefault("landmarks", [])
    if bootstrapping:
        return spatial, rng, cursor
    def random_value() -> float:
        nonlocal rng
        rng = (rng * 1664525 + 1013904223) & 0xFFFFFFFF
        return rng / 4294967296
    def angle(value: float) -> float:
        return math.atan2(math.sin(value), math.cos(value))
    for trace in sorted((trace for trace in traces if int(trace.get("tick", -1)) > cursor), key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("spatialObservation")
        if not isinstance(observation, dict):
            cursor = tick; continue
        last = observation.get("last") or {}; before, after = last.get("positionBefore"), last.get("positionAfter")
        if isinstance(before, dict) and isinstance(after, dict):
            dx, dy = _number(after, "x") - _number(before, "x"), _number(after, "y") - _number(before, "y"); motion = math.hypot(dx, dy)
            spatial["x"] = max(0.0, min(100.0, _number(spatial, "x") + dx + (random_value() - .5) * _number(spatial, "uncertainty") * .08))
            spatial["y"] = max(0.0, min(100.0, _number(spatial, "y") + dy + (random_value() - .5) * _number(spatial, "uncertainty") * .08))
            spatial["uncertainty"] = _clamp(_number(spatial, "uncertainty") + .0015 + motion * .0012)
        if isinstance(last.get("headingBefore"), (int, float)) and isinstance(last.get("headingAfter"), (int, float)):
            spatial["heading"] = angle(_number(spatial, "heading") + angle(float(last["headingAfter"]) - float(last["headingBefore"])) + (random_value() - .5) * _number(spatial, "uncertainty") * .015)
        spatial["mapSurprise"] = _number(spatial, "mapSurprise") * .9; observed: set[int] = set(); scene = observation.get("scene") or {}
        for kind in ("resource", "signal", "danger"):
            cue = scene.get(kind)
            if not isinstance(cue, dict) or cue.get("source") != "sensed": continue
            entity_id = int(cue.get("id", 0)); observed.add(entity_id); absolute = _number(spatial, "heading") + _number(cue, "bearing")
            x, y = _number(spatial, "x") + math.cos(absolute) * _number(cue, "distance"), _number(spatial, "y") + math.sin(absolute) * _number(cue, "distance")
            landmark = next((item for item in spatial["landmarks"] if item.get("id") == entity_id and item.get("kind") == kind), None)
            if landmark is not None:
                discrepancy = math.hypot(x - _number(landmark, "x"), y - _number(landmark, "y")) / 24; spatial["mapSurprise"] = _clamp(max(_number(spatial, "mapSurprise"), discrepancy)); rate = .18 + .22 * (1 - _number(landmark, "confidence"))
                landmark["x"] = _number(landmark, "x") + (x - _number(landmark, "x")) * rate; landmark["y"] = _number(landmark, "y") + (y - _number(landmark, "y")) * rate; landmark["confidence"] = _clamp(_number(landmark, "confidence") * .92 + (1 - discrepancy) * .08); landmark["lastSeenTick"] = tick; spatial["uncertainty"] = _clamp(_number(spatial, "uncertainty") - discrepancy * .002 - .002)
            else: spatial["landmarks"].append({"id": entity_id, "kind": kind, "x": x, "y": y, "confidence": .42, "lastSeenTick": tick})
        for landmark in spatial["landmarks"]:
            if math.hypot(_number(landmark, "x") - _number(spatial, "x"), _number(landmark, "y") - _number(spatial, "y")) < 18 and landmark.get("id") not in observed:
                landmark["confidence"] = _number(landmark, "confidence") * .88; spatial["mapSurprise"] = _clamp(_number(spatial, "mapSurprise") + .045)
        spatial["landmarks"] = sorted((item for item in spatial["landmarks"] if _number(item, "confidence") > .055), key=lambda item: -_number(item, "confidence"))[:30]
        mean_confidence = sum(_number(item, "confidence") for item in spatial["landmarks"]) / len(spatial["landmarks"]) if spatial["landmarks"] else 0.0
        spatial["coherence"] = _clamp(_number(spatial, "coherence") * .96 + mean_confidence * (1 - _number(spatial, "uncertainty")) * .04); cursor = tick
    return spatial, rng, cursor


def _phenomenal_workspace_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], int, list[dict[str, Any]], int]:
    """Integrate candidate activity and select globally broadcast content."""
    consciousness = life.get("consciousness") or {}; target_tick = int(life.get("tick", 0))
    if not previous or "phenomenalField" not in previous:
        return copy.deepcopy(consciousness.get("phenomenalField") or {}), copy.deepcopy(consciousness.get("workspace") or {}), copy.deepcopy(consciousness.get("meta") or {}), target_tick, copy.deepcopy(consciousness.get("accessHistory") or []), target_tick
    field = copy.deepcopy(previous.get("phenomenalField") or consciousness.get("phenomenalField") or {})
    workspace = copy.deepcopy(previous.get("workspace") or consciousness.get("workspace") or {})
    meta = copy.deepcopy(previous.get("meta") or consciousness.get("meta") or {})
    cursor = int(previous.get("phenomenalCursor", from_tick))
    access_history = copy.deepcopy(previous.get("accessHistory") or consciousness.get("accessHistory") or [])
    access_cursor = int(previous.get("accessCursor", from_tick))
    for trace in sorted(life.get("traces") or [], key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("phenomenalObservation") or {}
        if tick <= cursor or not isinstance(observation.get("candidates"), list): continue
        candidates = copy.deepcopy(observation["candidates"]); inputs: dict[str, float] = {}
        for candidate in candidates:
            kind = candidate.get("kind")
            if isinstance(kind, str): inputs[kind] = max(inputs.get(kind, 0.0), _number(candidate, "salience"))
        old = field.get("activations") or {}; kinds = list(old.keys()) + [kind for kind in inputs if kind not in old]; raw: dict[str, float] = {}; old_dominant = field.get("dominant")
        for kind in kinds: raw[kind] = _clamp(_number(old, kind) * .74 + inputs.get(kind, 0.0) * .38 + (.035 if old_dominant == kind else 0.0))
        average = sum(raw.values()) / len(kinds) if kinds else 0.0
        for kind in kinds: raw[kind] = _clamp(raw[kind] - max(0.0, average - raw[kind]) * .055)
        ranked = sorted(({"kind": kind, "value": value} for kind, value in raw.items() if value > .025), key=lambda item: item["value"], reverse=True)
        dominant = ranked[0]["kind"] if ranked else None; total = sum(item["value"] for item in ranked); entropy = 0.0
        if total > 0 and len(ranked) > 1: entropy = -sum((item["value"] / total) * math.log(item["value"] / total) for item in ranked) / math.log(len(ranked))
        integration = _clamp((sum(item["value"] for item in ranked[:4]) / max(1, min(4, len(ranked)))) * (.65 + .35 * entropy))
        quality = {key: 0.0 for key in ("external", "internal", "temporal", "social", "epistemic")}
        for candidate in candidates:
            value = raw.get(candidate.get("kind"), 0.0) * _number(candidate, "salience"); source = candidate.get("source")
            bucket = "social" if source == "social" else "temporal" if source in ("imagination", "memory") else "epistemic" if source in ("epistemic", "attention") else "internal" if source in ("interoception", "self", "value", "goal") else "external"; quality[bucket] += value
        q_max = max([1.0, *quality.values()]); quality = {key: _clamp(value / q_max) for key, value in quality.items()}
        field = {"activations": raw, "dwell": int(field.get("dwell", 0)) + 1 if dominant and dominant == old_dominant else 1 if dominant else 0, "integration": integration, "differentiation": _clamp(entropy), "exclusion": _clamp((ranked[0]["value"] if ranked else 0.0) - (ranked[1]["value"] if len(ranked) > 1 else 0.0)), "quality": quality}
        if dominant is not None: field["dominant"] = dominant
        bound = []
        for candidate in candidates:
            item = copy.deepcopy(candidate)
            if item.get("kind") == dominant: item["salience"] = _clamp(_number(item, "salience") + raw.get(dominant, 0.0) * .22); item["persistence"] = _clamp(_number(item, "persistence") + integration * .1)
            if item.get("kind") == observation.get("attentionTarget"):
                effort = _number(observation, "attentionEffort", .25); item["salience"] = _clamp(_number(item, "salience") + .11 + effort * .38); item["persistence"] = _clamp(_number(item, "persistence") + .05 + effort * .08)
            bound.append(item)
        previous_foreground = workspace.get("foreground"); eligible = [item for item in bound if not (observation.get("dangerBroadcastBlocked") and item.get("kind") == "danger")]
        def score(item: dict[str, Any]) -> float: return _number(item, "salience") * .55 + _number(item, "selfRelevance") * .25 + _number(item, "persistence") * .12 + (.08 if previous_foreground and previous_foreground.get("id") == item.get("id") else 0.0)
        scored = sorted(((item, score(item)) for item in eligible), key=lambda pair: pair[1], reverse=True); winner = scored[0][0] if scored else None; top = scored[0][1] if scored else 0.0; second = scored[1][1] if len(scored) > 1 else 0.0
        ignition = _clamp((top - .38) * 2.2 + (top - second) * .8) if winner is not None and top > .38 else 0.0
        foreground = winner if ignition > .08 else ({**previous_foreground, "persistence": _number(previous_foreground, "persistence") * .82} if previous_foreground and _number(previous_foreground, "persistence") > .35 else None)
        background = [item for item, _ in scored if not foreground or item.get("id") != foreground.get("id")][:2]; visible = {item.get("id") for item in background}
        if foreground: visible.add(foreground.get("id"))
        workspace = {"tick": tick, "background": background, "unconscious": [item for item in bound if item.get("id") not in visible], "ignition": ignition, "continuity": _clamp(_number(workspace, "continuity") + .08) if foreground and previous_foreground and foreground.get("id") == previous_foreground.get("id") else _number(foreground or {}, "persistence")}
        if foreground is not None: workspace["foreground"] = foreground
        confidence = _clamp(((1.0 - _number(foreground, "uncertainty")) if foreground else .12) * .65 + ignition * .35); source = foreground.get("source") if foreground else None
        source_estimate = "unknown" if not foreground else "imagined" if source == "imagination" else "memory" if source in ("memory", "symbol") else "internal" if source in ("interoception", "self", "value", "goal", "epistemic") else "external"
        actual_error = _number(trace, "surprise"); meta = {"confidence": confidence, "sourceEstimate": source_estimate, "ownedBySelf": _clamp(_number(meta, "ownedBySelf") * .9 + (_number(foreground, "selfRelevance", .2) if foreground else .2) * .1), "calibration": _clamp(_number(meta, "calibration") * .96 + (1 - abs(confidence - (1 - actual_error))) * .04), "lastError": actual_error}; cursor = tick
        if tick > access_cursor: access_history.append(copy.deepcopy(workspace)); access_history = access_history[-80:]; access_cursor = tick
    return field, workspace, meta, cursor, access_history, access_cursor


def _imagination_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[list[dict[str, Any]], int]:
    consciousness = life.get("consciousness") or {}; target_tick = int(life.get("tick", 0))
    if not previous or "imagination" not in previous: return copy.deepcopy(consciousness.get("imagination") or []), target_tick
    imagined = copy.deepcopy(previous.get("imagination") or []); cursor = int(previous.get("imaginationCursor", from_tick)); actions = ("explore", "resource", "avoid", "rest", "inspect")
    for trace in sorted(life.get("traces") or [], key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("imaginationObservation") or {}
        if tick <= cursor or not observation: continue
        p = observation.get("perception") or {}; body = observation.get("body") or {}; drives = observation.get("drives") or {}; models = observation.get("causalModels") or {}; goals = observation.get("goals") or []; outcomes = []
        for action in actions:
            energy = _number(body, "energy") - .018; integrity = _number(body, "integrity") - _number(p, "danger") * .024; uncertainty = _number(body, "uncertainty") + .006; valence = .5
            if action == "resource": energy += _number(p, "resource") * .16; valence += _number(p, "resource") * .2 - (.08 if _number(p, "resource") < .08 else 0)
            if action == "explore": energy -= .012; uncertainty -= _number(p, "signal") * .13; valence += _number(p, "signal") * .15 - _number(p, "danger") * .12
            if action == "avoid": integrity += _number(p, "danger") * .035; valence += _number(p, "danger") * .16 - .025
            if action == "rest": energy += .025 + _number(p, "stability") * .02; integrity += .012; valence += .04
            if action == "inspect": uncertainty -= .025; valence += .05 if _number(observation, "stateCoherence") < .5 else .01
            model = models.get(action) or {}; delta = model.get("delta") or {}; learned = _number(model, "confidence")
            energy = _clamp(energy * (1 - learned) + _clamp(_number(body, "energy") + _number(delta, "energy")) * learned)
            integrity = _clamp(integrity * (1 - learned) + _clamp(_number(body, "integrity") + _number(delta, "integrity")) * learned)
            uncertainty = _clamp(uncertainty * (1 - learned) + _clamp(_number(body, "uncertainty") + _number(delta, "uncertainty")) * learned)
            valence = _clamp(valence * (1 - learned) + _clamp(_number(observation, "stateValence") + _number(delta, "valence")) * learned)
            projected = {"energy": energy, "integrity": integrity, "arousal": _clamp(_number(body, "arousal") + _number(delta, "arousal") * learned), "uncertainty": uncertainty}
            urgency = sum(_number(goal, "urgency") for goal in goals)
            goal_fit = sum((1 - abs(_number(projected, str(goal.get("dimension"))) - _number(goal, "target"))) * _number(goal, "urgency") for goal in goals) / urgency if goals and urgency else .5
            desirability = _clamp(energy * .24 + integrity * .22 + (1 - uncertainty) * .13 + valence * .16 + _clamp(_number(drives, action) / 2) * .05 + goal_fit * .2)
            confidence = _clamp(_number(body, "precision") * .25 + _number(observation, "beliefPredictability") * .2 + (1 - _number(p, "signal") - _number(p, "danger") * .5) * .1 + _number(model, "confidence") * .45)
            outcomes.append({"action": action, "expectedEnergy": energy, "expectedIntegrity": integrity, "expectedUncertainty": uncertainty, "expectedValence": valence, "desirability": desirability, "confidence": confidence})
        imagined = sorted(outcomes, key=lambda item: -_number(item, "desirability")); cursor = tick
    return imagined, cursor


def _temporal_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}; target_tick = int(life.get("tick", 0))
    if not previous or "temporalField" not in previous: return copy.deepcopy(consciousness.get("temporalField") or {}), target_tick
    field = copy.deepcopy(previous.get("temporalField") or {}); cursor = int(previous.get("temporalCursor", from_tick))
    for trace in sorted(life.get("traces") or [], key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("temporalObservation") or {}
        if tick <= cursor or not observation: continue
        now = observation.get("foreground"); anticipated = observation.get("anticipatedNext"); prior_now = field.get("now"); same = bool(now and prior_now and prior_now.get("id") == now.get("id"))
        continuity = _clamp((_number(field, "continuity") if same else .15) + .08) if now else _number(field, "continuity") * .8
        depth = _clamp((.35 if prior_now else 0) + _number(now or {}, "persistence") * .3 + _number(anticipated or {}, "confidence") * .35)
        field = {"continuity": continuity, "temporalDepth": depth}
        if prior_now is not None: field["justPast"] = copy.deepcopy(prior_now)
        if now is not None: field["now"] = copy.deepcopy(now)
        if anticipated is not None: field["anticipatedNext"] = copy.deepcopy(anticipated)
        cursor = tick
    return field, cursor


def _introspection_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}; target_tick = int(life.get("tick", 0)); glyphs = ("ϟ", "∴", "⋈", "⌽", "⟟", "⊶", "⫷", "⧉", "⋔", "⟒", "⊛", "⦿", "⌿", "⧜", "⋰", "⫯")
    if not previous or "introspection" not in previous: return copy.deepcopy(consciousness.get("introspection") or {}), target_tick
    state = copy.deepcopy(previous.get("introspection") or {}); cursor = int(previous.get("introspectionCursor", from_tick)); state.setdefault("clusters", []); state.setdefault("expressions", []); state.setdefault("currentConfidence", 0); state.setdefault("nextClusterId", 1)
    def distance(a: list[float], b: list[float]) -> float: return math.sqrt(sum((value - b[index]) ** 2 for index, value in enumerate(a)) / max(1, len(a)))
    for trace in sorted(life.get("traces") or [], key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("introspectionObservation") or {}; field = observation.get("field") or {}; foreground = observation.get("foreground")
        if tick <= cursor or not observation: continue
        if not foreground or _number(field, "integration") < .1:
            state["currentConfidence"] = _number(state, "currentConfidence") * .94
            if _number(state, "currentConfidence") < .08: state.pop("currentGlyph", None)
            cursor = tick; continue
        quality = field.get("quality") or {}; vector = [_number(quality, key) for key in ("external", "internal", "temporal", "social", "epistemic")] + [(_number(observation, "affectTone") + 1) / 2, _number(field, "integration"), _number(field, "differentiation"), _number(field, "exclusion"), _number(observation, "ownedBySelf"), 1 if observation.get("dreamMode") == "dream" else 0]
        prior = next((cluster for cluster in state["clusters"] if cluster.get("id") == state.get("lastClusterId")), None)
        if prior:
            prior.setdefault("forecast", list(vector)); prior.setdefault("forecastSamples", 0); prior.setdefault("forecastError", .5); prior.setdefault("predictiveConfidence", 0)
            error = _clamp(distance(prior["forecast"], vector) * 2); prior["forecastSamples"] += 1; prior["forecastError"] = _clamp(_number(prior, "forecastError") * .9 + error * .1); rate = max(.025, min(.16, 1 / math.sqrt(prior["forecastSamples"] + 1))); prior["forecast"] = [value + (vector[index] - value) * rate for index, value in enumerate(prior["forecast"])]; prior["predictiveConfidence"] = _clamp((1 - math.exp(-prior["forecastSamples"] / 8)) * (1 - prior["forecastError"]))
        cluster = min(state["clusters"], key=lambda item: distance(vector, item["centroid"])) if state["clusters"] else None
        if cluster is None or distance(vector, cluster["centroid"]) > .19:
            cluster = {"id": state["nextClusterId"], "centroid": list(vector), "count": 0, "variance": 0, "stability": 0, "lastTick": tick, "forecast": list(vector), "forecastSamples": 0, "forecastError": .5, "predictiveConfidence": 0}; state["nextClusterId"] += 1; state["clusters"].append(cluster)
        old = list(cluster["centroid"]); rate = min(.18, 1 / (cluster["count"] + 1)); cluster["centroid"] = [value + (vector[index] - value) * rate for index, value in enumerate(cluster["centroid"])]; cluster["variance"] = _number(cluster, "variance") * .9 + distance(old, vector) * .1; cluster["count"] += 1; cluster["lastTick"] = tick; cluster["stability"] = _clamp(_number(cluster, "stability") * .9 + (1 - cluster["variance"] * 4) * .1)
        if not cluster.get("glyph") and cluster["count"] >= 6 and cluster["stability"] > .5: cluster["glyph"] = glyphs[(cluster["id"] - 1) % len(glyphs)]
        state["lastClusterId"] = cluster["id"]
        if cluster.get("glyph"): state["currentGlyph"] = cluster["glyph"]
        else: state.pop("currentGlyph", None)
        state["currentConfidence"] = _clamp(cluster["stability"] * (1 - min(1, cluster["variance"] * 3)) * (.25 + .75 * cluster["predictiveConfidence"])) if cluster.get("glyph") else cluster["stability"] * .2
        last = state["expressions"][-1] if state["expressions"] else None
        if cluster.get("glyph") and state["currentConfidence"] > .48 and (not last or last.get("glyph") != cluster["glyph"] or tick - int(last.get("tick", 0)) >= 24): state["expressions"].append({"tick": tick, "glyph": cluster["glyph"], "confidence": state["currentConfidence"], "mode": observation.get("dreamMode")})
        state["expressions"] = state["expressions"][-60:]; state["clusters"] = [item for item in state["clusters"] if tick - int(item.get("lastTick", 0)) < 2400 or _number(item, "stability") > .72][-24:]; cursor = tick
    return state, cursor


def _state_dynamics_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[dict[str, Any], int]:
    """Settle metabolism and self-evaluation after browser-executed physics."""
    target_tick = int(life.get("tick", 0))
    if not previous or "state" not in previous: return copy.deepcopy(life.get("state") or {}), target_tick
    state = copy.deepcopy(previous.get("state") or life.get("state") or {}); cursor = int(previous.get("stateCursor", from_tick))
    for trace in sorted(life.get("traces") or [], key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); observation = trace.get("stateDynamicsObservation") or {}
        if tick <= cursor or not observation: continue
        state = copy.deepcopy(observation.get("postActionState") or state); action = observation.get("action"); perception = observation.get("perception") or {}; outcome = _number(observation, "outcome")
        cost = .007 + (.007 if action in ("explore", "avoid") else .002) + (_number(observation, "attentionEffort") * .0015 if observation.get("attentionActive") else 0)
        state["energy"] = _number(state, "energy") - cost * _number(observation, "metabolicFactor", 1)
        state["uncertainty"] = _number(state, "uncertainty") + .004 + _number(perception, "danger") * .008
        state["arousal"] = _number(state, "arousal") + (_number(perception, "danger") - _number(state, "arousal")) * .035
        actual = (_number(state, "energy") + .7 * _number(state, "integrity") + _number(perception, "resource") - _number(perception, "danger")) / 2.7
        surprise = _clamp(abs(actual - _number(observation, "prediction")) * 3); efference = observation.get("efference") or {}
        attribution = _clamp(.5 + (.18 if outcome > 0 else -.12) - surprise * .26 + (.12 if action == "inspect" else 0) + _number(efference, "selfCausedLikelihood") * .2 - _number(efference, "externalSurprise") * .25)
        state["agency"] = _clamp(_number(state, "agency") * .975 + attribution * .025)
        state["coherence"] = _clamp(_number(state, "coherence") + (1 - surprise - _number(state, "coherence")) * .025)
        state["valence"] = _clamp(_number(state, "valence") * .93 + _clamp(.5 + outcome - surprise * .15) * .07)
        state["curiosity"] = _clamp(_number(state, "curiosity") + (_number(perception, "signal") * .01 - surprise * .003))
        for key in ("energy", "integrity", "arousal", "uncertainty", "coherence", "curiosity", "agency", "valence"): state[key] = _clamp(_number(state, key))
        cursor = tick
    return state, cursor


def _candidate_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int) -> tuple[list[dict[str, Any]], int]:
    """Construct conscious candidates from evidence, never from browser candidates."""
    target_tick = int(life.get("tick", 0))
    if not previous or "candidates" not in previous:
        traces = life.get("traces") or []; existing = ((traces[-1].get("phenomenalObservation") or {}).get("candidates") if traces else None)
        return copy.deepcopy(existing or []), target_tick
    candidates = copy.deepcopy(previous.get("candidates") or []); cursor = int(previous.get("candidateCursor", from_tick))
    def make(source: str, kind: str, value: float, salience: float, uncertainty: float, relevance: float, persistence: float, symbol_id: int | None = None) -> dict[str, Any]:
        item = {"id": f"{source}:{kind}{symbol_id if symbol_id is not None else ''}", "source": source, "kind": kind, "value": _clamp(value), "salience": _clamp(salience), "uncertainty": _clamp(uncertainty), "selfRelevance": _clamp(relevance), "persistence": _clamp(persistence)}
        if symbol_id is not None: item["symbolId"] = symbol_id
        return item
    for trace in sorted(life.get("traces") or [], key=lambda item: int(item.get("tick", 0))):
        tick = int(trace.get("tick", 0)); evidence = trace.get("candidateObservation") or {}
        if tick <= cursor or not evidence: continue
        p = evidence.get("perception") or {}; body = evidence.get("body") or {}; drives = evidence.get("drives") or {}; imagined = evidence.get("imagined") or []; out: list[dict[str, Any]] = []
        out.append(make("exteroception", "resource", _number(p, "resource"), _number(p, "resource") * .75, .2, .55, .25))
        out.append(make("novelty", "signal", _number(p, "signal"), _number(p, "signal") * .7 + _number(body, "uncertainty") * .22, .55, .45, .2))
        out.append(make("threat", "danger", _number(p, "danger"), _number(p, "danger") * .9 + (1 - _number(body, "integrity")) * .28, .12, .92, .45))
        out.append(make("exteroception", "stability", _number(p, "stability"), _number(p, "stability") * .45, .25, .5, .35))
        deficit = _clamp((1 - _number(body, "energy")) * .65 + (1 - _number(body, "integrity")) * .35)
        out.append(make("interoception", "body-low" if deficit > .45 else "body-high", 1 - deficit, deficit * .82 + _number(body, "arousal") * .18, 1 - _number(body, "precision"), 1, .55))
        out.append(make("self", "self-state", _number(evidence, "agency"), abs(_number(evidence, "coherence") - .5) * .55 + (1 - _number(evidence, "coherence")) * .3, .38, .95, .62))
        ranked_drives = sorted((_number(drives, action) for action in ("explore", "resource", "avoid", "rest", "inspect")), reverse=True); conflict = _clamp(1 - (ranked_drives[0] - ranked_drives[1]))
        out.append(make("value", "conflict", conflict, conflict * .64, .48, .82, .4))
        memory = evidence.get("bestMemory")
        if memory: out.append(make("memory", "memory", _number(memory, "strength"), _number(memory, "strength") * _number(memory, "impact") * .72, .32, .74, .67))
        symbol = evidence.get("bestSymbol")
        if symbol: out.append(make("symbol", "symbol", _number(symbol, "stability"), _number(symbol, "stability") * .32, .25, .7, .72, int(symbol.get("id"))))
        future = imagined[0] if imagined else None
        if future: out.append(make("imagination", "anticipated-future", _number(future, "expectedValence"), abs(_number(future, "desirability") - .5) * .5 + _number(body, "uncertainty") * .18, 1 - _number(future, "confidence"), .84, .58))
        goal = evidence.get("goal")
        if goal: out.append(make("goal", "goal-pressure", _number(goal, "target"), _number(goal, "urgency") * .72 + _number(goal, "persistence") * .22, .25, .96, .7))
        question = evidence.get("question")
        if question: out.append(make("epistemic", "open-question", _number(question, "currentConfidence"), _number(question, "urgency") * (.72 if question.get("status") == "active" else .25), .2, .9, .66))
        if evidence.get("chapterIdentityImpact") is not None: out.append(make("self", "autobiographical-self", _number(evidence, "narrativeContinuity"), _number(evidence, "chapterIdentityImpact") * .68 + (1 - _number(evidence, "narrativeContinuity")) * .2, .28, .98, .78))
        if evidence.get("recursiveAppraisals"): out.append(make("self", "future-self-judgment", _number(evidence, "lastEndorsement", .5), _number(evidence, "maxFutureRegret") * .48 + _number(evidence, "commitmentStrain") * .45, .3, .99, .74))
        if _number(p, "otherPresence") > .04: out.append(make("social", "other-mind", _number(evidence, "socialConfidence"), _number(p, "otherPresence") * .38 + (1 - _number(evidence, "socialConfidence")) * .36, .65, .72, .55))
        if _number(evidence, "beliefDivergence") > .08: out.append(make("social", "perspective-gap", _number(evidence, "beliefDivergence"), _number(evidence, "beliefDivergence") * .72, .3, .86, .7))
        if _number(evidence, "attentionError") > .3: out.append(make("attention", "access-surprise", 1 - _number(evidence, "attentionError"), _number(evidence, "attentionError") * .68, .28, .98, .62))
        dream = evidence.get("dream") or {}
        if dream.get("mode") == "dream" or _number(dream, "residue") > .1: out.append(make("imagination", "dream-replay", _number(dream, "vividness"), max(_number(dream, "vividness"), _number(dream, "residue")) * .78, .18, .94, .84))
        affect = evidence.get("affect") or {}
        if abs(_number(affect, "tone")) > .08 or _number(affect, "qualityMismatch") > .18: out.append(make("value", "felt-valence", _clamp((_number(affect, "tone") + 1) / 2), max(abs(_number(affect, "tone")), _number(affect, "qualityMismatch")) * .72, 1 - _number(affect, "precision"), .99, .68))
        if evidence.get("privateGlyph"): out.append(make("symbol", "introspective-symbol", _number(evidence, "privateConfidence"), _number(evidence, "privateConfidence") * .46, .2, .99, .8))
        if _number(evidence, "externalSurprise") > .12: out.append(make("self", "boundary-surprise", _number(evidence, "selfCausedLikelihood"), _number(evidence, "externalSurprise") * .82, .22, .99, .62))
        if _number(evidence, "spatialUncertainty") > .32 or _number(evidence, "mapSurprise") > .16: out.append(make("self", "spatial-disorientation", 1 - _number(evidence, "spatialUncertainty"), max(_number(evidence, "spatialUncertainty"), _number(evidence, "mapSurprise")) * .68, .3, .94, .58))
        if evidence.get("communicationResponse") != "none" or _number(evidence, "communicationSurprise") > .12: out.append(make("social", "shared-signal", _number(evidence, "communicativeAgency"), max(_number(evidence, "communicationSurprise"), _number(evidence, "communicativeAgency") * .35), .28, .9, .62))
        if evidence.get("organismicMode") != "active" or _number(evidence, "organismicViability") < .42: out.append(make("self", "autopoietic-crisis", _number(evidence, "organismicViability"), (1 - _number(evidence, "organismicViability")) * .92, .08, .99, .94))
        quality = evidence.get("qualityNode")
        if quality and _number(evidence, "manifoldEfficacy") > .025: out.append(make("symbol", "phenomenal-familiarity", _number(quality, "stability"), _number(evidence, "manifoldEfficacy") * .52 + _number(evidence, "manifoldTransfer") * .16, .24, .98, .72))
        substrate = evidence.get("substrate")
        if substrate and tick - int(substrate.get("tick", tick)) < 80: out.append(make("self", "substrate-resonance", _number(substrate, "integration"), _number(substrate, "causalCoupling") * .48 + _number(substrate, "recurrence") * .16, .18, .99, .7))
        if evidence.get("organismicMode") == "arrest": out = [item for item in out if item["kind"] in ("autopoietic-crisis", "body-low", "resource", "danger")]
        values = affect.get("experientialValues") or {}
        for item in out:
            learned = abs(_number(values, str(item["kind"])))
            if learned: item["salience"] = _clamp(_number(item, "salience") + learned * .16); item["selfRelevance"] = _clamp(_number(item, "selfRelevance") + learned * .08)
        candidates = out; cursor = tick
    return candidates, cursor


def _action_intent(life: dict[str, Any], latent: list[float], organismic: dict[str, Any] | None = None, dream_state: dict[str, Any] | None = None) -> dict[str, Any]:
    actions = ("explore", "resource", "avoid", "rest", "inspect")
    traces = [trace for trace in life.get("traces", []) if isinstance(trace, dict)]
    evidence = (traces[-1].get("decisionObservation") or {}) if traces else {}
    p = evidence.get("perception"); body = evidence.get("body"); beliefs = evidence.get("beliefs")
    if isinstance(p, dict) and isinstance(body, dict) and isinstance(beliefs, dict):
        drives = {
            "explore": _number(evidence, "stateCuriosity") * _number(beliefs, "exploration") * (.35 + _number(body, "uncertainty")) + _number(p, "signal") * .8 - _number(p, "danger") * .65,
            "resource": (1 - _number(body, "energy")) * 1.3 + _number(p, "resource") * .9 + _number(beliefs, "conservation") * .2,
            "avoid": _number(p, "danger") * 1.6 + (1 - _number(body, "integrity")) * .55 + _number(body, "arousal") * .25,
            "rest": (1 - _number(body, "energy")) * .8 + (1 - _number(body, "integrity")) * .7 + _number(p, "stability") * .55 + _number(beliefs, "stabilityPriority") * .2,
            "inspect": _number(body, "uncertainty") * .65 + (1 - _number(evidence, "stateCoherence")) * .55 + _number(beliefs, "efficacy") * .15,
        }
    else: drives = evidence.get("baseDrives") or {}
    state = life.get("state") or {}
    scores = {action: _number(drives, action) + latent[index] * .15 for index, action in enumerate(actions)}
    if not traces:
        scores.update({
            "explore": _number(state, "curiosity") * (.35 + _number(state, "uncertainty")),
            "resource": (1 - _number(state, "energy")) * 1.2,
            "avoid": (1 - _number(state, "integrity")) * .8,
            "rest": (1 - _number(state, "energy")) * .7,
            "inspect": _number(state, "uncertainty") * .45,
        })
    kind = evidence.get("foregroundKind"); conscious: dict[str, float] = {}
    if kind == "danger": conscious = {"avoid": .38, "inspect": .08}
    elif kind in ("resource", "body-low"): conscious = {"resource": .28, "rest": .16}
    elif kind == "signal": conscious = {"explore": .32}
    elif kind in ("conflict", "self-state"): conscious = {"inspect": .3}
    elif kind == "stability": conscious = {"rest": .22}
    elif kind in ("symbol", "memory"): conscious = {"inspect": .12, "explore": .08}
    elif kind == "anticipated-future": conscious = {"inspect": .06}
    elif kind == "goal-pressure": conscious = {"inspect": .1}
    elif kind == "open-question": conscious = {"inspect": .08}
    elif kind == "autobiographical-self": conscious = {"inspect": .24}
    elif kind == "future-self-judgment": conscious = {"inspect": .18}
    elif kind == "other-mind": conscious = {"inspect": .12, "explore": .1}
    elif kind == "perspective-gap": conscious = {"inspect": .32, "explore": .12}
    elif kind == "access-surprise": conscious = {"inspect": .36}
    elif kind == "dream-replay": conscious = {"inspect": .18, "rest": .1}
    elif kind == "felt-valence": conscious = {"inspect": .22, "rest": .08}
    elif kind == "introspective-symbol": conscious = {"inspect": .26}
    elif kind == "boundary-surprise": conscious = {"inspect": .3, "avoid": .1}
    elif kind == "spatial-disorientation": conscious = {"inspect": .28, "explore": .12}
    elif kind == "shared-signal": conscious = {"inspect": .2, "explore": .08}
    elif kind == "autopoietic-crisis": conscious = {"resource": .42, "rest": .28, "inspect": -.08, "explore": -.2}
    elif kind == "phenomenal-familiarity": conscious = {"inspect": .08}
    elif kind == "substrate-resonance": conscious = {"inspect": .06}
    for action, value in conscious.items(): scores[action] += value
    question = evidence.get("question") or {}
    if question.get("status") == "active" and question.get("targetAction") in actions: scores[question["targetAction"]] += _number(question, "expectedInformationGain") * _number(question, "urgency") * .52
    for appraisal in evidence.get("appraisals") or []:
        action = appraisal.get("action")
        if action in actions: scores[action] += _number(appraisal, "futureApproval") * .24 - _number(appraisal, "anticipatedRegret") * .2
    affect = evidence.get("affect") or {}; negative = max(0.0, -_number(affect, "tone")); positive = max(0.0, _number(affect, "tone")); mismatch = _number(affect, "qualityMismatch")
    scores["avoid"] += negative * .24; scores["rest"] += negative * .2; scores["inspect"] += abs(_number(affect, "tone")) * .1 + mismatch * .24; scores["explore"] += positive * .14; scores["resource"] += positive * .08
    cluster = evidence.get("introspectiveCluster") or {}; forecast = cluster.get("forecast") or []
    if cluster.get("glyph") and _number(cluster, "predictiveConfidence") >= .35 and len(forecast) >= 7:
        tone = float(forecast[5]) * 2 - 1; confidence = _number(cluster, "predictiveConfidence")
        if tone < -.08: scores["rest"] += -tone * confidence * .18; scores["avoid"] += -tone * confidence * .12; scores["inspect"] += confidence * .08
        elif tone > .08: scores["explore"] += tone * confidence * .12; scores["resource"] += tone * confidence * .08
        else: scores["inspect"] += confidence * .04
    dream = evidence.get("dream") or {}; pressure = max(0.0, _number(dream, "sleepPressure") - .38); continuity = min(.3, _number(dream, "restStreak") * .055)
    if dream.get("mode") == "dream": scores["rest"] += 1
    elif pressure > 0 or continuity > 0: scores["rest"] += pressure * .95 + continuity; scores["inspect"] += pressure * .08
    pending = evidence.get("communicationPending") or {}
    if pending.get("expectedAction") in actions and int(life.get("tick", 0)) - int(pending.get("tick", 0)) <= 2: scores[pending["expectedAction"]] += .52 if pending.get("phase") == "repair" else .34
    node = evidence.get("phenomenalNode") or {}; values = node.get("actionValues") or {}; samples = node.get("actionSamples") or {}
    for action in actions: scores[action] += _number(values, action) * (1 - math.exp(-_number(samples, action) / 7)) * .24
    for future in evidence.get("imagination") or []:
        action = future.get("action")
        if action in actions: scores[action] += (_number(future, "desirability") - .5) * .42
    consciousness = life.get("consciousness") or {}; organismic = organismic or consciousness.get("organismic") or {}; dream_state = dream_state or consciousness.get("dream") or {}
    if organismic.get("mode") == "arrest":
        action = "resource"
    elif dream_state.get("mode") == "dream":
        action = "rest"
    else:
        action = max(actions, key=lambda candidate: (scores[candidate], -actions.index(candidate)))
    return {"basedOnTick": int(life["tick"]), "action": action, "scores": scores}


def _efference_authority(life: dict[str, Any], previous: dict[str, Any] | None) -> tuple[dict[str, Any], int]:
    consciousness = life.get("consciousness") or {}
    bootstrapping = not previous or "efference" not in previous
    source = (consciousness.get("efference") or {}) if bootstrapping else previous["efference"]
    state = copy.deepcopy(source)
    actions = ("explore", "resource", "avoid", "rest", "inspect")
    perception_keys = ("resource", "signal", "danger", "stability", "otherPresence", "otherMotion")
    state.setdefault("models", {})
    for action in actions:
        state["models"].setdefault(action, {"action": action, "samples": 0, "dx": 0.0, "dy": 0.0, "perceptionDelta": {key: 0.0 for key in perception_keys}, "predictionError": 1.0, "confidence": 0.0})
    for key, default in (("reafferenceError", .5), ("selfCausedLikelihood", 0.0), ("externalSurprise", 0.0), ("boundaryConfidence", 0.0)):
        state.setdefault(key, default)
    traces = sorted((trace for trace in life.get("traces", []) if isinstance(trace, dict)), key=lambda trace: int(trace.get("tick", 0)))
    cursor = int(traces[-1].get("tick", 0)) if bootstrapping and traces else int((previous or {}).get("efferenceCursor", 0))
    if bootstrapping:
        return state, cursor
    by_tick = {int(trace.get("tick", 0)): trace for trace in traces}
    for current_trace in (trace for trace in traces if int(trace.get("tick", 0)) > cursor):
        current_tick = int(current_trace.get("tick", 0))
        last = by_tick.get(current_tick - 1)
        if not last or last.get("action") not in actions:
            cursor = current_tick
            continue
        action = last["action"]
        model = state["models"][action]
        current_perception, last_perception = current_trace.get("perception") or {}, last.get("perception") or {}
        observed = {key: _number(current_perception, key) - _number(last_perception, key) for key in perception_keys}
        before, after = last.get("positionBefore") or {}, last.get("positionAfter") or {}
        observed_dx, observed_dy = _number(after, "x") - _number(before, "x"), _number(after, "y") - _number(before, "y")
        perception_error = sum(abs(observed[key] - _number(model.get("perceptionDelta") or {}, key)) for key in perception_keys) / len(perception_keys)
        movement_error = (abs(observed_dx - _number(model, "dx")) + abs(observed_dy - _number(model, "dy"))) / 4
        error = _clamp(perception_error * .72 + movement_error * .28)
        state["predictedAction"] = action
        state["reafferenceError"] = _clamp(_number(state, "reafferenceError", .5) * .86 + error * .14)
        state["selfCausedLikelihood"] = _clamp(_number(model, "confidence") * (1 - error))
        state["externalSurprise"] = _clamp(_number(model, "confidence") * error)
        state["boundaryConfidence"] = _clamp(_number(state, "boundaryConfidence") * .97 + state["selfCausedLikelihood"] * .03)
        model["samples"] = int(model.get("samples", 0)) + 1
        rate = max(.025, min(.22, 1 / model["samples"]))
        model["dx"] = _number(model, "dx") + (observed_dx - _number(model, "dx")) * rate
        model["dy"] = _number(model, "dy") + (observed_dy - _number(model, "dy")) * rate
        model.setdefault("perceptionDelta", {})
        for key in perception_keys:
            model["perceptionDelta"][key] = _number(model["perceptionDelta"], key) + (observed[key] - _number(model["perceptionDelta"], key)) * rate
        model["predictionError"] = _clamp(_number(model, "predictionError", 1) * .9 + error * .1)
        model["confidence"] = _clamp((1 - math.exp(-model["samples"] / 16)) * (1 - model["predictionError"] * .7))
        cursor = current_tick
    return state, cursor


def _environment_rand(rng: int) -> tuple[int, float]:
    rng = (1664525 * rng + 1013904223) & 0xFFFFFFFF
    return rng, rng / 2**32


def _abiotic_entity(next_id: int, rng: int, strength: float, ttl: float) -> tuple[dict[str, Any], int, int]:
    rng, x = _environment_rand(rng)
    rng, y = _environment_rand(rng)
    return {"id": next_id, "x": 7 + x * 86, "y": 7 + y * 86, "strength": strength, "ttl": ttl}, next_id + 1, rng


def _environment_authority(life: dict[str, Any], previous: dict[str, Any] | None) -> tuple[dict[str, Any], int, int, int]:
    environment = life.get("environment") or {}
    bootstrapping = not previous or "abiotic" not in previous
    if bootstrapping:
        abiotic = {key: copy.deepcopy(environment.get(key) or []) for key in ("resources", "signals", "disturbances", "stableZones")}
        rng = int(life.get("environmentRng", int(life.get("seed", 0)) ^ 0xA5A5A5A5)) & 0xFFFFFFFF
        cursor = int(life.get("tick", 0))
        next_id = int(life.get("nextEntityId", 1))
        return abiotic, rng, cursor, next_id
    abiotic = copy.deepcopy(previous["abiotic"])
    rng = int(previous.get("environmentRng", 0)) & 0xFFFFFFFF
    cursor = int(previous.get("environmentCursor", 0))
    next_id = int(previous.get("nextEntityId", 1))
    target_tick = int(life.get("tick", cursor))
    for _ in range(max(0, target_tick - cursor)):
        for key in ("resources", "signals", "disturbances"):
            for entity in abiotic[key]:
                entity["ttl"] = _number(entity, "ttl") - 1
                if _number(entity, "strength") <= .02:
                    entity["ttl"] = 0
            abiotic[key] = [entity for entity in abiotic[key] if _number(entity, "ttl") > 0]
        rng, chance = _environment_rand(rng)
        if chance < .012 and len(abiotic["resources"]) < 7:
            rng, strength_roll = _environment_rand(rng); rng, ttl_roll = _environment_rand(rng)
            spawned, next_id, rng = _abiotic_entity(next_id, rng, .2 + strength_roll * .35, 100 + ttl_roll * 130)
            abiotic["resources"].append(spawned)
        rng, chance = _environment_rand(rng)
        if chance < .008 and len(abiotic["signals"]) < 5:
            rng, strength_roll = _environment_rand(rng); rng, ttl_roll = _environment_rand(rng)
            spawned, next_id, rng = _abiotic_entity(next_id, rng, .2 + strength_roll * .4, 80 + ttl_roll * 130)
            abiotic["signals"].append(spawned)
        rng, chance = _environment_rand(rng)
        if chance < .003 and len(abiotic["disturbances"]) < 3:
            rng, strength_roll = _environment_rand(rng); rng, ttl_roll = _environment_rand(rng)
            spawned, next_id, rng = _abiotic_entity(next_id, rng, .18 + strength_roll * .25, 35 + ttl_roll * 50)
            abiotic["disturbances"].append(spawned)
    # Browser actions may consume strength; negative ids are observer interventions.
    for key in ("resources", "signals", "disturbances"):
        incoming = {int(entity.get("id")): entity for entity in environment.get(key, []) if isinstance(entity, dict) and isinstance(entity.get("id"), int)}
        for entity in abiotic[key]:
            browser_entity = incoming.get(int(entity.get("id", 0)))
            if browser_entity:
                entity["strength"] = _number(browser_entity, "strength", _number(entity, "strength"))
        known = {int(entity.get("id", 0)) for entity in abiotic[key]}
        abiotic[key].extend(copy.deepcopy(entity) for entity_id, entity in incoming.items() if entity_id < 0 and entity_id not in known)
    return abiotic, rng, target_tick, next_id


def evolve_authority(life: dict[str, Any], previous: dict[str, Any] | None, from_tick: int, latent: list[float]) -> dict[str, Any]:
    organismic, energy_cost = _organismic_authority(life, previous, from_tick)
    clusters, symbols, next_cluster_id, next_symbol_id, symbolic_cursor, cluster_assignments = _symbolic_authority(life, previous, from_tick)
    memories, beliefs, next_memory_id = _cognitive_authority(life, previous, from_tick, cluster_assignments)
    affect, affect_cursor = _affect_authority(life, previous, from_tick)
    dream, dream_cursor = _dream_authority(life, previous, from_tick)
    narrative, narrative_cursor = _narrative_authority(life, previous, from_tick)
    preferred_setpoints, goals, goal_cursor = _goal_authority(life, previous, from_tick)
    epistemic, epistemic_cursor = _epistemic_authority(life, previous, from_tick)
    recursive_self, recursive_cursor = _recursive_authority(life, previous, from_tick)
    attention_schema, attention_cursor, attention_intent = _attention_authority(life, previous, from_tick)
    social, social_cursor = _social_authority(life, previous, from_tick)
    communication, communication_cursor, communication_emission, communication_cost = _communication_authority(life, previous, from_tick)
    causal_models, causal_cursor = _causal_model_authority(life, previous, from_tick)
    interoception, interoception_rng, interoception_cursor = _interoception_authority(life, previous, from_tick)
    spatial, spatial_rng, spatial_cursor = _spatial_authority(life, previous, from_tick)
    phenomenal_field, workspace, meta, phenomenal_cursor, access_history, access_cursor = _phenomenal_workspace_authority(life, previous, from_tick)
    imagination, imagination_cursor = _imagination_authority(life, previous, from_tick)
    temporal_field, temporal_cursor = _temporal_authority(life, previous, from_tick)
    introspection, introspection_cursor = _introspection_authority(life, previous, from_tick)
    state, state_cursor = _state_dynamics_authority(life, previous, from_tick)
    candidates, candidate_cursor = _candidate_authority(life, previous, from_tick)
    efference, efference_cursor = _efference_authority(life, previous)
    abiotic, environment_rng, environment_cursor, next_entity_id = _environment_authority(life, previous)
    result = {"fromTick": from_tick, "toTick": int(life["tick"]), "organismic": organismic, "manifold": _phenomenal_authority(life, previous, from_tick), "memories": memories, "beliefs": beliefs, "nextMemoryId": next_memory_id, "clusters": clusters, "symbols": symbols, "nextClusterId": next_cluster_id, "nextSymbolId": next_symbol_id, "symbolicCursor": symbolic_cursor, "affect": affect, "affectCursor": affect_cursor, "dream": dream, "dreamCursor": dream_cursor, "narrative": narrative, "narrativeCursor": narrative_cursor, "preferredSetpoints": preferred_setpoints, "goals": goals, "goalCursor": goal_cursor, "epistemic": epistemic, "epistemicCursor": epistemic_cursor, "recursiveSelf": recursive_self, "recursiveCursor": recursive_cursor, "attentionSchema": attention_schema, "attentionCursor": attention_cursor, "attentionIntent": attention_intent, "social": social, "socialCursor": social_cursor, "communication": communication, "communicationCursor": communication_cursor, "communicationCost": communication_cost, "causalModels": causal_models, "causalCursor": causal_cursor, "interoception": interoception, "interoceptionRng": interoception_rng, "interoceptionCursor": interoception_cursor, "spatial": spatial, "spatialRng": spatial_rng, "spatialCursor": spatial_cursor, "phenomenalField": phenomenal_field, "workspace": workspace, "meta": meta, "phenomenalCursor": phenomenal_cursor, "accessHistory": access_history, "accessCursor": access_cursor, "imagination": imagination, "imaginationCursor": imagination_cursor, "temporalField": temporal_field, "temporalCursor": temporal_cursor, "introspection": introspection, "introspectionCursor": introspection_cursor, "state": state, "stateCursor": state_cursor, "candidates": candidates, "candidateCursor": candidate_cursor, "actionIntent": _action_intent(life, latent), "efference": efference, "efferenceCursor": efference_cursor, "abiotic": abiotic, "environmentRng": environment_rng, "environmentCursor": environment_cursor, "nextEntityId": next_entity_id, "energyCost": energy_cost + communication_cost}
    if communication_emission is not None: result["communicationEmission"] = communication_emission
    return result


def _weight(seed: int, row: int, column: int) -> float:
    x = (seed ^ (row * 0x9E3779B1) ^ (column * 0x85EBCA77)) & 0xFFFFFFFF
    x ^= x >> 16
    x = (x * 0x7FEB352D) & 0xFFFFFFFF
    x ^= x >> 15
    return (x / 2**32 - 0.5) * 0.22


def evolve_substrate(life: dict[str, Any], previous: dict[str, Any] | None = None) -> dict[str, Any]:
    """Advance one recurrent substrate update from a browser life snapshot."""
    identity = life.get("id")
    if not isinstance(identity, str) or not identity:
        raise ValueError("life.id is required")
    tick = life.get("tick")
    seed = life.get("seed")
    if not isinstance(tick, int) or tick < 0 or not isinstance(seed, int):
        raise ValueError("life.tick and life.seed must be integers")
    latent = list((previous or {}).get("latent") or _initial_latent(seed))
    if len(latent) != LATENT_SIZE or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in latent):
        raise ValueError("invalid recurrent latent state")
    features = _features(life)
    next_latent: list[float] = []
    for row in range(LATENT_SIZE):
        recurrent = latent[row] * 0.72 + latent[(row - 1) % LATENT_SIZE] * 0.11 + latent[(row + 7) % LATENT_SIZE] * 0.07
        driven = sum(_weight(seed, row, col) * (value * 2.0 - 1.0) for col, value in enumerate(features)) / math.sqrt(len(features))
        next_latent.append(math.tanh(recurrent + driven))
    energy = sum(value * value for value in next_latent) / LATENT_SIZE
    mean = sum(next_latent) / LATENT_SIZE
    variance = sum((value - mean) ** 2 for value in next_latent) / LATENT_SIZE
    recurrent_similarity = sum(a * b for a, b in zip(latent, next_latent))
    norms = math.sqrt(sum(a * a for a in latent) * sum(b * b for b in next_latent))
    recurrence = (recurrent_similarity / norms + 1.0) / 2.0 if norms else 0.0
    halves = sum(abs(next_latent[i] - next_latent[i + LATENT_SIZE // 2]) for i in range(LATENT_SIZE // 2)) / (LATENT_SIZE // 2)
    integration = _clamp((energy ** 0.5) * 1.7 * (0.55 + recurrence * 0.45))
    differentiation = _clamp(variance ** 0.5 * 2.4 + halves * 0.35)
    coupling = _clamp(abs(sum(next_latent[:8]) / 8.0) * 1.8)
    prior_tick = int((previous or {}).get("tick", tick - 1))
    return {
        "protocol": PROTOCOL_VERSION,
        "identity": identity,
        "tick": tick,
        "backend": "python-list-cpu",
        "dimensions": LATENT_SIZE,
        "latent": [round(value, 12) for value in next_latent],
        "integration": integration,
        "differentiation": differentiation,
        "recurrence": _clamp(recurrence),
        "causalCoupling": coupling,
        "updates": int((previous or {}).get("updates", 0)) + 1,
        "authority": evolve_authority(life, (previous or {}).get("authority"), prior_tick, next_latent),
    }


@dataclass
class KernelSession:
    identity: str
    seed: int
    last_tick: int = -1
    substrate: dict[str, Any] | None = field(default=None)

    def ingest(self, life: dict[str, Any]) -> dict[str, Any]:
        if life.get("id") != self.identity or life.get("seed") != self.seed:
            raise ValueError("identity or seed changed inside a kernel session")
        tick = life.get("tick")
        if not isinstance(tick, int) or tick < self.last_tick:
            raise ValueError("tick regression would break identity continuity")
        self.substrate = evolve_substrate(life, self.substrate)
        self.last_tick = tick
        return self.substrate
