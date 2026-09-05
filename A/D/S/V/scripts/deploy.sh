#!/bin/bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Colors ──────────────────────────────────────────
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
info() { echo -e "  ${GREEN}✓${NC} $*"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $*"; }
err()  { echo -e "  ${RED}✗${NC} $*"; }

# ── Config ───────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
DOCKER_REGISTRY="ghcr.io/ninor-app"
BACKEND_IMAGE="${DOCKER_REGISTRY}/backend"
FRONTEND_IMAGE="${DOCKER_REGISTRY}/frontend"
TAG="${2:-$(git rev-parse --short HEAD)}"

# ── Pre-flight checks ──────────────────────────────
check_prerequisites() {
    log "Checking prerequisites..."

    command -v docker       >/dev/null 2>&1 || { err "Docker is required"; exit 1; }
    command -v kubectl      >/dev/null 2>&1 || { err "kubectl is required"; exit 1; }
    command -v helm         >/dev/null 2>&1 || warn "Helm not found (optional)"
    command -v aws          >/dev/null 2>&1 && info "AWS CLI found"
    command -v gh           >/dev/null 2>&1 && info "GitHub CLI found"

    if [ ! -f "$ROOT_DIR/k8s/namespace.yaml" ]; then
        err "K8s manifests not found. Run from project root."
        exit 1
    fi

    info "All prerequisites met"
}

# ── Build & Push Docker images ─────────────────────
build_and_push() {
    log "Building Docker images..."

    docker build \
        -t "${BACKEND_IMAGE}:${TAG}" \
        -t "${BACKEND_IMAGE}:latest" \
        -f "$ROOT_DIR/backend/Dockerfile" \
        "$ROOT_DIR/backend"

    docker build \
        -t "${FRONTEND_IMAGE}:${TAG}" \
        -t "${FRONTEND_IMAGE}:latest" \
        -f "$ROOT_DIR/frontend/Dockerfile" \
        "$ROOT_DIR/frontend"

    info "Built backend: ${BACKEND_IMAGE}:${TAG}"
    info "Built frontend: ${FRONTEND_IMAGE}:${TAG}"

    log "Pushing images to registry..."
    docker push "${BACKEND_IMAGE}:${TAG}"
    docker push "${BACKEND_IMAGE}:latest"
    docker push "${FRONTEND_IMAGE}:${TAG}"
    docker push "${FRONTEND_IMAGE}:latest"
    info "Images pushed to ${DOCKER_REGISTRY}"
}

# ── Deploy to Kubernetes ───────────────────────────
deploy_k8s() {
    log "Deploying to Kubernetes (${ENVIRONMENT})..."

    # Apply namespace first
    kubectl apply -f "$ROOT_DIR/k8s/namespace.yaml"

    # Apply ConfigMap and Secrets
    kubectl apply -f "$ROOT_DIR/k8s/configmap.yaml"

    if [ -f "$ROOT_DIR/k8s/secrets-${ENVIRONMENT}.yaml" ]; then
        kubectl apply -f "$ROOT_DIR/k8s/secrets-${ENVIRONMENT}.yaml"
    else
        warn "Secrets file not found: k8s/secrets-${ENVIRONMENT}.yaml"
        warn "Apply secrets manually or use External Secrets operator"
    fi

    # Update deployment images
    sed "s|image:.*backend.*|image: ${BACKEND_IMAGE}:${TAG}|" "$ROOT_DIR/k8s/backend.yaml" | kubectl apply -f -
    sed "s|image:.*frontend.*|image: ${FRONTEND_IMAGE}:${TAG}|" "$ROOT_DIR/k8s/frontend.yaml" | kubectl apply -f -

    # Apply networking policies and PDB
    kubectl apply -f "$ROOT_DIR/k8s/network-policy.yaml"
    kubectl apply -f "$ROOT_DIR/k8s/pdb.yaml"

    # Apply HPA
    kubectl apply -f "$ROOT_DIR/k8s/backend.yaml" --server-side
    kubectl apply -f "$ROOT_DIR/k8s/frontend.yaml" --server-side

    info "Kubernetes manifests applied"
}

# ── Wait for rollout ───────────────────────────────
wait_for_rollout() {
    log "Waiting for rollout to complete..."
    kubectl rollout status deployment/ninor-backend -n ninor --timeout=5m
    kubectl rollout status deployment/ninor-frontend -n ninor --timeout=5m
    info "Rollout completed successfully"
}

# ── Smoke test ──────────────────────────────────────
smoke_test() {
    log "Running smoke tests..."

    local endpoint
    if [ "$ENVIRONMENT" = "production" ]; then
        endpoint="https://api.ninor.app/health"
    else
        endpoint="https://api.staging.ninor.app/health"
    fi

    for i in $(seq 1 10); do
        if curl -sf "$endpoint" >/dev/null 2>&1; then
            info "Health check passed (attempt $i)"
            break
        fi
        if [ "$i" -eq 10 ]; then
            err "Health check failed after 10 attempts"
            exit 1
        fi
        sleep 3
    done

    info "Smoke tests passed"
}

# ── Rollback ────────────────────────────────────────
rollback() {
    log "Rolling back to previous deployment..."

    kubectl rollout undo deployment/ninor-backend -n ninor
    kubectl rollout undo deployment/ninor-frontend -n ninor

    kubectl rollout status deployment/ninor-backend -n ninor --timeout=5m
    kubectl rollout status deployment/ninor-frontend -n ninor --timeout=5m

    info "Rollback completed"
}

# ── Status ──────────────────────────────────────────
status() {
    echo ""
    log "Deployment status for ${ENVIRONMENT}:"
    echo ""
    kubectl get all -n ninor -o wide
    echo ""
    kubectl get hpa -n ninor
    echo ""
    kubectl get ingress -n ninor
}

# ── Main ────────────────────────────────────────────
main() {
    echo ""
    echo -e "${CYAN}══════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Ninor Deployer — ${ENVIRONMENT}${NC}"
    echo -e "${CYAN}  Tag: ${TAG}${NC}"
    echo -e "${CYAN}══════════════════════════════════════════${NC}"
    echo ""

    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            build_and_push
            deploy_k8s
            wait_for_rollout
            smoke_test
            status
            echo ""
            info "Deployment to ${ENVIRONMENT} complete!"
            ;;
        rollback)
            check_prerequisites
            rollback
            status
            info "Rollback complete!"
            ;;
        status)
            status
            ;;
        *)
            echo "Usage: $0 [staging|production] [tag] {deploy|rollback|status}"
            exit 1
            ;;
    esac
}

main "$@"
