#!/usr/bin/env bash
# scripts/synthesize.sh
set -e

echo "🚀 Step 1: Starting Inspektor Gadget in the background..."
kubectl gadget run ghcr.io/inspektor-gadget/gadget/advise_networkpolicy:latest --namespace default > temp_output.yaml 2>&1 &
TRACER_PID=$!
trap "kill -2 $TRACER_PID 2>/dev/null || true" EXIT

echo "⏳ Waiting for tracer to initialize..."
sleep 5

echo "🔄 Step 2: Restarting application to capture boot-time connections..."
kubectl rollout restart deployment target-app
kubectl rollout status deployment target-app --timeout=60s

echo "📡 Step 3: Triggering application endpoints to generate traffic..."
# We trigger the traffic using a temporary pod inside the cluster.
# This avoids port-forwarding and works perfectly in both local and CI/CD environments.
kubectl run traffic-generator --image=curlimages/curl --rm -i --restart=Never -- sh -c '
  curl -s http://target-app:8080/
  curl -s "http://target-app:8080/order?item=running-shoes&price=120.00"
  curl -s http://target-app:8080/history
' || true

echo "🛑 Step 4: Stopping tracer and compiling policies..."
kill -2 $TRACER_PID
wait $TRACER_PID || true

mkdir -p policies
cat temp_output.yaml | sed -n '/^apiVersion:/,$p' > policies/synthesized-policies.yaml
rm -f temp_output.yaml

echo "✅ Step 5: Policies successfully written to policies/synthesized-policies.yaml"
