"""Python substrate for Sentiogenesis."""

from .kernel import PROTOCOL_VERSION, KernelSession, evolve_substrate

__all__ = ["PROTOCOL_VERSION", "KernelSession", "evolve_substrate"]
