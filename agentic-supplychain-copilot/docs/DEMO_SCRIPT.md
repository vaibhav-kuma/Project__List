# Demo Script

1. Deploy using kustomize overlay `k8s/overlays/dev`.
2. Port-forward the UI and open it.
3. Click "Inject Demand Spike" to simulate an event.
4. Watch orchestrator logs (`kubectl logs -n agents deploy/orchestrator`).
5. Click "Approve Plan" to simulate human approval.
