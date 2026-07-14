"""Run browser-produced snapshots through the Python authority for parity tests."""

from __future__ import annotations

import json
import sys

from kernel import evolve_substrate


def main() -> None:
    snapshots = json.load(sys.stdin)
    if not isinstance(snapshots, list) or not snapshots:
        raise ValueError("a non-empty snapshot list is required")
    substrate = None
    trajectory = []
    for life in snapshots:
        substrate = evolve_substrate(life, substrate)
        authority = substrate["authority"]
        trajectory.append({
            "tick": substrate["tick"],
            "memories": authority["memories"],
            "beliefs": authority["beliefs"],
            "nextMemoryId": authority["nextMemoryId"],
            "efference": authority["efference"],
            "efferenceCursor": authority["efferenceCursor"],
            "abiotic": authority["abiotic"],
            "environmentRng": authority["environmentRng"],
            "environmentCursor": authority["environmentCursor"],
            "nextEntityId": authority["nextEntityId"],
            "clusters": authority["clusters"],
            "symbols": authority["symbols"],
            "nextClusterId": authority["nextClusterId"],
            "nextSymbolId": authority["nextSymbolId"],
            "symbolicCursor": authority["symbolicCursor"],
            "affect": authority["affect"],
            "affectCursor": authority["affectCursor"],
            "dream": authority["dream"],
            "dreamCursor": authority["dreamCursor"],
            "narrative": authority["narrative"],
            "narrativeCursor": authority["narrativeCursor"],
            "preferredSetpoints": authority["preferredSetpoints"],
            "goals": authority["goals"],
            "goalCursor": authority["goalCursor"],
            "epistemic": authority["epistemic"],
            "epistemicCursor": authority["epistemicCursor"],
            "recursiveSelf": authority["recursiveSelf"],
            "recursiveCursor": authority["recursiveCursor"],
            "attentionSchema": authority["attentionSchema"],
            "attentionCursor": authority["attentionCursor"],
            "social": authority["social"],
            "socialCursor": authority["socialCursor"],
            "communication": authority["communication"],
            "communicationCursor": authority["communicationCursor"],
            "causalModels": authority["causalModels"],
            "causalCursor": authority["causalCursor"],
            "interoception": authority["interoception"],
            "interoceptionRng": authority["interoceptionRng"],
            "interoceptionCursor": authority["interoceptionCursor"],
            "spatial": authority["spatial"],
            "spatialRng": authority["spatialRng"],
            "spatialCursor": authority["spatialCursor"],
            "phenomenalField": authority["phenomenalField"],
            "workspace": authority["workspace"],
            "meta": authority["meta"],
            "phenomenalCursor": authority["phenomenalCursor"],
            "imagination": authority["imagination"],
            "imaginationCursor": authority["imaginationCursor"],
            "temporalField": authority["temporalField"],
            "temporalCursor": authority["temporalCursor"],
            "introspection": authority["introspection"],
            "introspectionCursor": authority["introspectionCursor"],
            "state": authority["state"],
            "stateCursor": authority["stateCursor"],
            "candidates": authority["candidates"],
            "candidateCursor": authority["candidateCursor"],
            "accessHistory": authority["accessHistory"],
            "accessCursor": authority["accessCursor"],
        })
    json.dump(trajectory, sys.stdout, separators=(",", ":"), allow_nan=False)


if __name__ == "__main__":
    main()
