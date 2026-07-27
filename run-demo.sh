#!/usr/bin/env bash
# run-demo.sh: A 1-click script to run the local eBPF profiling demo.
set -e

echo "=== 1. Checking Minikube Status ==="
if ! minikube status >/dev/null 2>&1; then
    echo "Minikube is stopped. Starting Minikube with Calico CNI..."
    minikube start --driver=docker --cni=calico
else
    echo "✅ Minikube is already running."
fi

echo "=== 2. Configuring Docker Environment ==="
eval $(minikube -p minikube docker-env)

echo "=== 3. Checking Inspektor Gadget CLI & Agent ==="
if ! command -v kubectl-gadget &> /dev/null; then
    echo "Downloading Inspektor Gadget CLI..."
    IG_VERSION=$(curl -s https://api.github.com/repos/inspektor-gadget/inspektor-gadget/releases/latest | jq -r .tag_name)
    curl -sL "https://github.com/inspektor-gadget/inspektor-gadget/releases/download/${IG_VERSION}/kubectl-gadget-linux-amd64-${IG_VERSION}.tar.gz" | tar -C /tmp -xz
    sudo mv /tmp/kubectl-gadget /usr/local/bin/kubectl-gadget
else
    echo "✅ Inspektor Gadget CLI is already installed."
fi

echo "Deploying Inspektor Gadget Agent to cluster..."
kubectl gadget deploy

echo "=== 4. Building App Container Image inside Minikube ==="
docker build -t ebpf-target-app:latest ./app

echo "=== 5. Applying Kubernetes Manifests ==="
# Clean up leftover Redis resources from the old demo
kubectl delete deployment/redis service/redis --ignore-not-found=true

kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/app.yaml
kubectl rollout status deployment target-app --timeout=90s

echo "=== 6. Running eBPF Policy Synthesis ==="
chmod +x scripts/synthesize.sh
./scripts/synthesize.sh

echo "🎉 Demo Completed Successfully!"
echo "Check your auto-generated NetworkPolicies in: policies/synthesized-policies.yaml"
