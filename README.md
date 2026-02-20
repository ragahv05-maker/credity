# 🌐 CredVerse Ecosystem

**The Ultimate Blockchain-Powered Credentialing Infrastructure**

Welcome to the **CredVerse** monorepo (formerly Credity). This repository houses a suite of cutting-edge, interconnected applications designed to revolutionize how digital credentials are issued, stored, and verified. 

Built with scalability, security, and user experience at its core, CredVerse bridges the gap between traditional institutions and the decentralized web.

---

## 🏗️ Project Architecture

🌟 **[Read the Master Strategic Plan (Raghav Badhwar)](./Raghav_Badhwar.md)** — The definitive vision, tech stack, business strategy, 90-day execution plan, and investor pitch deck.

📘 **[Read the Product Requirements Document (PRD)](./PRD.md)**

🔍 **[Read the Strategic Analysis & Changes Document](./CHANGES.md)** — Competitive analysis, user workflows, and strategic recommendations

This monorepo is organized into four distinct, powerful pillars:

### 1. 🏛️ [CredVerse Issuer](./CredVerseIssuer%203)
*The Institutional Command Center*
- **Role**: Enabling Universities and Institutions to issue tamper-proof Verifiable Credentials (VCs).
- **Core Technology**: 
  - **DIDs & VCs**: Standards-compliant credential issuance.
  - **Blockchain Anchoring**: Immutable proof of issuance on-chain.
- **Key Features**: 
  - Student implementation & management.
  - Custom credential schema designer.
  - Analytics dashboard for issuance metrics.

### 2. 💼 [CredVerse Recruiter](./CredVerseRecruiter)
*The Verification Intelligence Hub*
- **Role**: Empowering employers to instantly verify candidate credentials with zero trust.
- **Core Technology**:
  - **Zero-Knowledge Proofs (ZKP)**: Verify attributes without revealing sensitive data.
  - **Instant Link Verification**: One-click validation of shared credentials.
- **Key Features**:
  - Bulk verification processing.
  - Smart fraud detection algorithms.
  - "Verified Talent" candidate sourcing.

### 3. 📱 [BlockWallet Digi](./BlockWalletDigi)
*The User Sovereignty Engine*
- **Role**: A next-gen digital wallet for users to own, manage, and share their achievements.
- **Core Technology**:
  - **Biometic Security**: Face detection and liveness checks for secure access.
  - **AI Integration**: intelligent claims analysis and management.
- **Key Features**:
  - Encrypted local storage.
  - Instant sharing via QR or secure links.
  - Seamless integration with external identity providers.

### 4. 🌐 [CredVerse Gateway](./credverse-gateway)
*The Public Portal*
- **Role**: The unified entry point for the entire ecosystem.
- **Key Features**:
  - Centralized landing page.
  - Ecosystem navigation.
  - Public registry access.

---

## 🚀 Key Innovations & Updates

- **🔐 Biometric & AI Security**: The Wallet now features advanced biometric modules (`use-biometrics`, `liveness-service`) and AI-driven analysis (`llm-service`, `evidence-analysis`) to ensure that the holder is always the authorized user.
- **☁️ Cloud-Native Deployment**: Fully configured for deployment on Railway with health checks and production-ready server configurations see (`DEPLOYMENT.md`).
- **🛡️ Shared Authentication**: A unified security module ensures consistent, bank-grade authentication across all services.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18+ 
- **npm** or **pnpm**
- **Git**

### Installation

Clone the repository and install dependencies for the ecosystem:

```bash
git clone https://github.com/raghavbadhwar/credity.git
cd credity
npm install
```

### Running Locally

Each service runs on a dedicated port. Please refer to individual service READMEs for detailed startup guides, or use the root scripts if available.

### CI Quality Lane (local, reproducible)

Before opening PRs, run:

```bash
npm run ci:lane:quality:quick
```

For strict release-ready checks:

```bash
npm run ci:lane:quality
npm run ci:oss:readiness
```

See `docs/devex/ci-quality-devex-lane.md` for lane details and developer workflow.

| Service | Port |
|---------|------|
| **Issuer** | `3000` / `5001` |
| **Wallet** | `5173` / `5002` |
| **Recruiter** | `5174` / `5003` |

---

## 📄 License & Proprietary Notice

**© 2025 Raghav Badhwar. All Rights Reserved.**

This software is **proprietary and confidential**. Unauthorized copying, distribution, modification, or use of this source code or any portion of it, via any medium, is strictly prohibited without the express written permission of the copyright holder.

---
*Architected with ❤️ for the future of Identity.*
