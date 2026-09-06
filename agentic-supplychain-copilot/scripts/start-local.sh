#!/bin/bash
set -e
echo "Build images and load into Kind (if using kind). Then:"
echo "kubectl apply -k k8s/overlays/dev"
