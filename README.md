# 🛡️ eBPF Zero-Trust Policies

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A modern, automated DevSecOps pipeline that dynamically generates **least-privilege Kubernetes NetworkPolicies** by profiling container socket connections at the Linux kernel level using **eBPF**.

---

## 🤯 The Challenge & The eBPF Solution

Writing Kubernetes `NetworkPolicies` manually is tedious and error-prone. To avoid breaking applications in production, developers often resort to overly permissive "allow-all" rules. 

This project **shifts security left** by observing what your application *actually does* during testing, and automatically generating a strict Zero-Trust policy.

### Before (Manual & Insecure)
Developers guess what network access is needed, or give up and allow everything:
```yaml
ingress: [] # Allows ALL incoming traffic - DANGEROUS!
```

### After (Auto-Generated & Secure)
Our eBPF tracer observes the exact API and database calls your app makes, and synthesizes a strict, custom-tailored policy:
```yaml
ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend-api # Only allows traffic from the exact pods that need it
```

---

## 🚀 Quickstart: Run the Demo

Want to see the magic in action? You can run the entire pipeline locally to see how eBPF traces our example Node.js app.

**Prerequisites:** `docker`, `kubectl`, `minikube`

Just run our 1-click setup script:
```bash
./run-demo.sh
```

*(This will start a Minikube cluster with Calico, install Inspektor Gadget, deploy the example app, trace the traffic, and generate your Zero-Trust policy in the `policies/` directory!)*

---

## 🛠️ How to Use This For Your Own Projects

This repository is designed to be a template for your own applications. Instead of profiling our dummy app, you can profile your production services!

1. **Use this template:** Click the green **"Use this template"** button at the top of the GitHub repository.
2. **Bring your code:** Replace the contents of the `app/` folder with your own Dockerized application (or microservices).
3. **Update Manifests:** Modify the YAML files in `kubernetes/` to match your application's deployment needs.
4. **Update the Traffic Generator:** Open `scripts/synthesize.sh`. In **Step 3**, modify the `curl` commands to trigger your application's actual internal and external endpoints. *(Alternatively, trigger your automated integration test suite here).*
5. **Push and Automate:** When you open a Pull Request, the included GitHub Action (`.github/workflows/policy-synthesis.yml`) will automatically spin up a test cluster, profile your app, and commit the generated `NetworkPolicy` back to your branch!

---

## 🧠 How It Works Under the Hood

```mermaid
graph TD
    Developer[Developer opens Pull Request] --> GHA[GitHub Actions]
    subgraph CI Pipeline
        GHA --> CreateCluster[1. Create KinD Cluster]
        CreateCluster --> InstallCalico[2. Install Calico CNI]
        InstallCalico --> DeployGadget[3. Deploy Inspektor Gadget]
        DeployGadget --> BuildImage[4. Build App Container]
        BuildImage --> DeployApp[5. Deploy App & DB]
    end
    DeployApp --> Tracing[eBPF Advisor Captures socket calls]
    Tracing --> RunTests[Run in-cluster Integration Tests]
    RunTests --> StopTrace[Synthesize Network Policies]
    StopTrace --> CommitBack[Auto-commit YAML back to PR]
    CommitBack --> GitOps[ArgoCD Deploys secure App + NetworkPolicy to Prod]
```

---

## 📂 Project Structure

```text
.
├── .github/workflows/
│   └── policy-synthesis.yml   # CI Pipeline orchestrator
├── app/                       # 👈 REPLACE THIS with your application code
├── kubernetes/                # 👈 REPLACE THIS with your deployment YAMLs
├── scripts/
│   └── synthesize.sh          # eBPF automation & traffic generation
├── policies/                  
│   └── synthesized-policies.yaml  # Where your generated policies will appear!
└── run-demo.sh                # Local 1-click execution script
```

---

## 🤝 Contributing
We welcome community contributions! If you want to add support for a new CNI (like Cilium) or improve the automation scripts, please open a Pull Request. For major changes, please open an Issue first to discuss what you would like to change.

## 📄 License
This project is licensed under the MIT License. See the `LICENSE` file for details.
