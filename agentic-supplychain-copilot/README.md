# Agentic Supply Chain Copilot — Starter Repo

This scaffold contains a minimal, deployable demo for the GKE Turns 10 Hackathon:
- Multi-agent demo (Orchestrator + Forecast + Inventory)
- MCP tool stubs
- k8s manifests (kustomize overlays)
- Simple UI placeholder and synthetic data generator

## Quick start (local / dev)
1. Install docker, kubectl, kind or minikube.
2. Build images (example): `./scripts/build-all.sh`
3. Apply k8s overlay: `kubectl apply -k k8s/overlays/dev`
4. Port-forward the UI: `kubectl port-forward svc/ui 3000:80 -n demo`
5. Open http://localhost:3000 and use the demo buttons.

See `/docs` for architecture and demo script.
