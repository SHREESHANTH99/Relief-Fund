# reliefFund

A Policy-Driven, Transparent Disaster Relief Fund Platform

## Project Structure

```
reliefFund/
├── contracts/     # Solidity smart contracts + Hardhat
├── backend/       # Express API + Oracles
└── frontend/      # Next.js web application
```

## Phase-1: Setup Phase (Foundation)

### ✅ Deliverables

- Local Hardhat blockchain node (Chain ID: 31337)
- Core smart contract with role management
- Express backend connected to blockchain
- Next.js frontend with wallet connection

### Quick Start

1. **Start Hardhat Node**

   ```bash
   cd contracts
   npm install
   npm run node
   ```

2. **Deploy Contracts**

   ```bash
   cd contracts
   npm run deploy
   ```

3. **Start Backend**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Features

- **Role Management**: Admin, Donor, Beneficiary, Merchant
- **Event Logging**: Donations, Aid Allocation, Spending
- **Security**: Emergency pause mechanism
- **Transparency**: Blockchain-based auditability

## Environment

- Hardhat Local Node (31337)
- Test accounts pre-funded with ETH
- Deterministic deployment for demo resets
