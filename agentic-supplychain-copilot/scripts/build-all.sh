#!/bin/bash
set -e
ROOT=$(dirname "$0")/..
echo "Building orchestrator image..."
docker build -t agentic/orchestrator:dev -f agents/orchestrator/Dockerfile agents/orchestrator
echo "Building forecast-server image..."
docker build -t agentic/forecast-server:dev -f mcp-tools/forecast-server/Dockerfile mcp-tools/forecast-server
echo "Building inventory-server image..."
docker build -t agentic/inventory-server:dev -f mcp-tools/inventory-server/Dockerfile mcp-tools/inventory-server
echo "Done. Tag & push to your registry if deploying to GKE."
