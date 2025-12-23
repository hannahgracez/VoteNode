# Encrypted Personality Survey (FHEVM)

A privacy-first personality survey where five multiple-choice questions are answered client-side, encrypted with Zama FHE,
submitted on-chain, and tallied on-chain in encrypted form. Only the respondent can decrypt their own answers and generate
their personality profile locally in the browser.

This repository contains the full stack: Solidity contracts, Hardhat deployment and tasks, tests, and a React + Vite
frontend that connects through RainbowKit, uses viem for reads, and ethers for writes.

## Contents

- Project overview
- Problem statement
- Advantages
- Technology stack
- Features
- Architecture and data flow
- Security and privacy model
- Project structure
- Setup and usage
- Deployment flow
- Frontend integration
- Limitations
- Future plans
- License

## Project Overview

Encrypted Personality Survey is a decentralized questionnaire built to prove that useful analytics can be derived from
user responses without exposing sensitive raw data. The survey is fixed at five questions, each with two to four choices,
which keeps the computation bounded while still enabling meaningful profiling. The application encrypts every answer with
FHE before it touches the chain, and all aggregations remain encrypted on-chain.

## Problem Statement

Traditional surveys require respondents to trust an operator with raw answers. That trust model breaks down when the data
is sensitive or valuable. Centralized storage increases the risk of leaks, misuse, or retroactive deanonymization, while
auditing and transparency are limited. This project solves that by eliminating plaintext storage of survey answers and by
moving aggregation logic on-chain under cryptographic protection.

## Advantages

- End-to-end confidentiality for individual answers without sacrificing on-chain verifiability.
- Encrypted aggregation, so analytics are produced without exposing raw responses.
- User-controlled decryption: only the respondent can reveal their own answers.
- Transparent, deterministic rules enforced by a smart contract.
- Minimal, fixed survey scope for predictable cost and performance.

## Technology Stack

- Smart contracts: Solidity with the Zama FHEVM stack
- Framework: Hardhat
- Deployment: Hardhat deploy scripts and tasks
- Frontend: React + Vite
- Wallet UX: RainbowKit
- Read RPC: viem
- Write RPC: ethers
- Package manager: npm

## Features

- Five-question personality survey with 2-4 options per question
- Client-side encryption of all answers using Zama FHE
- On-chain storage of encrypted answers
- On-chain aggregation of encrypted counts per option
- Client-side decryption of a user's own answers
- Local generation of a personality result based on decrypted answers
- Clean separation between contract logic, deployment, tasks, tests, and frontend

## Architecture and Data Flow

1. The user connects a wallet in the frontend.
2. The frontend encrypts the user's answers with Zama FHE tools.
3. Encrypted answers are submitted to the contract using ethers write calls.
4. The contract updates encrypted option counts on-chain.
5. The user requests decryption for their own answers.
6. The frontend decrypts client-side and renders a personality report locally.

No plaintext answers are stored or emitted on-chain, and all aggregations remain encrypted at rest and in transit.

## Security and Privacy Model

- Confidentiality: answers are never stored in plaintext on-chain.
- Access control: only the respondent is granted permission to decrypt their own answers.
- Integrity: contract logic enforces deterministic updates to encrypted counts.
- Transparency: survey rules are publicly verifiable while data remains private.
- Minimal data exposure: the frontend does not use local storage and does not rely on environment variables.

## Project Structure

```
VoteNode/
|-- contracts/           # Smart contract source files
|-- deploy/              # Deployment scripts
|-- tasks/               # Hardhat custom tasks
|-- test/                # Test files
|-- scripts/             # Helper scripts (ABI sync, tooling)
|-- deployments/         # Network deployments (ABI + addresses)
`-- frontend/            # React + Vite dApp
```

## Setup and Usage

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
npm ci
cd frontend && npm ci
```

### Configure environment (contracts only)

Create a `.env` file in the repository root for deployments:

```
PRIVATE_KEY=0x...
INFURA_API_KEY=...
ETHERSCAN_API_KEY=...   # Optional, for verification
```

The deployment flow uses a private key directly. Do not use a mnemonic.

### Compile and test

```bash
npm run compile
npm run test
```

### Local node deployment (validation step)

Run a local Hardhat node and deploy to validate the deployment flow and tasks before pushing to Sepolia.

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Sepolia deployment

After tasks and tests pass, deploy to Sepolia:

```bash
npx hardhat deploy --network sepolia
```

## Frontend Integration

The frontend reads the contract address and ABI from the deployments output. The ABI used in the frontend must be copied
from `deployments/sepolia` and must match the deployed contract exactly.

```bash
node scripts/sync-frontend-contract.cjs
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Notes:
- The frontend does not use environment variables.
- The frontend reads on-chain state with viem and sends write transactions with ethers.
- Use Sepolia in the wallet; do not connect the frontend to localhost.

## Limitations

- Encrypted computation is more expensive than plaintext computation.
- The survey is intentionally fixed at five questions for predictable costs.
- Aggregated results are encrypted, so public analytics require controlled decryption.

## Future Plans

- Expand question sets while preserving fixed-cost guarantees.
- Add optional, privacy-preserving public statistics via permissioned decryption.
- Improve UX for multi-session users without using local storage.
- Add on-chain versioning for survey schemas.
- Expand test coverage for encrypted edge cases.
- Provide richer personality result templates and localization support.

## License

See `LICENSE`.
